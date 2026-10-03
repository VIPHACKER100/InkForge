/**
 * render-pipeline.js — canvas render pipeline + page DOM management (M2 pass:
 * extracted from index.js, zero behavior change).
 *
 * Owns everything that turns S.text into drawn canvas pages:
 * - renderText(): sanitize → layoutText → rebuild page DOM → lazy per-page
 *   rendering via IntersectionObserver
 * - renderSpecificPage(): the single-page draw entry (background, smudges,
 *   cursive joins, shapes/edges, mermaid diagrams, drafted glyphs, margin
 *   labels, note-layout decorations, layer compositing)
 * - debounceRender()/triggerRender(): render scheduling
 * - startAnimation()/stopAnimation(): pen animation
 * - redrawPageCanvas(): single-page redraw helper (currently uncalled, kept)
 * - page DOM management: createPage/clearPages/updateEditorStyles/
 *   getGlobalTextFromEditors/getResponsiveCanvasWidth + updatePageNav/navigatePage
 * - the decoded drafted-glyph image cache (getCachedGlyphImage/glyphImageCache,
 *   moved out of state.js — a draw-time concern; the draftedGlyphs data itself
 *   stays in state.js as shared state)
 *
 * Module state (was index.js lets / window.* render globals):
 * animFrameId/isAnimating (animation), renderTimeout (debounce), pageObserver
 * (lazy page rendering), currentRenderQueue (exported — export-manager.js
 * reads it for transparent-PNG export), currentRcCache (rough.js canvas cache).
 *
 * Imports: state.js (S, pages, PAGE_W/PAGE_H, cursiveConnector, draftedGlyphs,
 * currentPrediction), layout-engine.js (layoutText, drawMarginQuestionLabels,
 * setMarginLabelsCache), text-layout.js (sanitizeText), shape-drawing.js,
 * diagram-engine.js, export-renderers.js (renderQueueItems,
 * renderCursiveConnectionsOn), margin-labels.js (computeMarginLabels),
 * persistence.js (autosave — page-editor input and the pipeline's DOM helpers
 * save through it), layer-panel.js (updateLayerUI, maybeUpdateLayerUI).
 *
 * Sanctioned cycle (call-time reads only): layer-panel.js imports
 * renderSpecificPage back from here for requestPageRender(); this module
 * imports updateLayerUI/maybeUpdateLayerUI from layer-panel. Neither side
 * calls the other during module evaluation.
 *
 * window.* reads kept intentionally: window.PaperRenderer and
 * window.layerCompositor — self-published namespaces of paper-renderer.js /
 * layer-compositor.js (no ES export surface yet).
 */
import { S, pages, PAGE_W, PAGE_H, cursiveConnector, draftedGlyphs, currentPrediction, fontSwitcher } from './state.js';
import { layoutText, drawMarginQuestionLabels, setMarginLabelsCache } from './layout-engine.js';
import { sanitizeText } from './text-layout.js';
import { ScriptDetector } from './script-detector.js';
import { drawShapeOrEdge } from './shape-drawing.js';
import { getDiagramImage } from './diagram-engine.js';
import { renderQueueItems, renderCursiveConnectionsOn } from './export-renderers.js';
import { computeMarginLabels } from './margin-labels.js';
import { autosave } from './persistence.js';
import { updateLayerUI, maybeUpdateLayerUI } from './layer-panel.js';

let animFrameId = null;
let isAnimating = false;
let renderTimeout = null;
let pageObserver = null;
let currentRenderQueue = null; // exported — export-manager.js reads it at call time
let currentRcCache = null;

/* ───────────────────────────────────────────
   DRAFTED GLYPH IMAGE CACHE (moved from state.js — M2 pass)
   Cache of decoded <img> elements for drafted glyphs, keyed by character.
   Only draws an entry once it's fully decoded (img.complete-equivalent ready
   flag), so the drawImage() call always happens synchronously inside the
   correct save()/translate()/restore() block for that character instead of
   racing an async onload against ctx.restore().
   ponytail: LRU cache — evicts oldest entry when exceeding 500
─────────────────────────────────────────── */
const glyphImageCache = new Map();
const GLYPH_CACHE_MAX = 500;

export function getCachedGlyphImage(char, src) {
  let entry = glyphImageCache.get(char);
  if (entry && entry.src === src) {
    return entry.ready ? entry.img : null;
  }
  // New character, or its drafted artwork changed — (re)decode it.
  if (glyphImageCache.size >= GLYPH_CACHE_MAX) {
    const oldest = glyphImageCache.keys().next().value;
    glyphImageCache.delete(oldest);
  }
  const img = new Image();
  entry = { img, src, ready: false };
  glyphImageCache.set(char, entry);
  img.onload = () => {
    entry.ready = true;
    // The glyph artwork finished decoding after the render that started it —
    // schedule a re-render so it appears. debounceRender is local to this
    // module now (it used to be a lazy window.* read in state.js); the onload
    // only ever fires after app init.
    debounceRender();
  };
  img.src = src;
  return null;
}

/* ───────────────────────────────────────────
   PHASE 4.1 — CREATE CANVAS PAGE
─────────────────────────────────────────── */
// Responsive CSS display width so the canvas never overflows narrow phones
// (the JS coordinate system stays PAGE_W×PAGE_H; only the CSS display scales).
function getResponsiveCanvasWidth() {
  const vw = window.innerWidth || document.documentElement.clientWidth || PAGE_W;
  if (vw <= 480) return Math.min(PAGE_W, vw - 24);
  if (vw <= 768) return Math.min(PAGE_W, vw - 32);
  return Math.min(PAGE_W, 720);
}

export function createPage(pageNum) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper';

  const label = document.createElement('div');
  label.className = 'page-label';
  label.textContent = 'Page ' + pageNum;

  const container = document.createElement('div');
  container.className = 'canvas-container';

  const canvas = document.createElement('canvas');
  canvas.className = 'canvas-page';
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  canvas.id = 'page-' + pageNum;
  // D3 canvas a11y bridge: the rendered handwriting is pixels — expose each page
  // to assistive tech as an image with a label. The editable per-page overlay
  // (editor-<n>, contentEditable) carries the actual text for screen readers.
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Handwritten notes, page ' + pageNum + ' — editable text in the page editor below');
  const displayWidth = getResponsiveCanvasWidth();
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = (displayWidth * PAGE_H) / PAGE_W + 'px';

  const editor = document.createElement('div');
  editor.className = 'page-editor';
  editor.id = 'editor-' + pageNum;
  editor.contentEditable = 'true';
  editor.setAttribute('role', 'textbox');
  editor.setAttribute('aria-multiline', 'true');
  editor.setAttribute('aria-label', 'Edit Page ' + pageNum);

  // Focus: clear canvas text (draw only background) and show overlay text
  editor.addEventListener('focus', () => {
    const ctx = canvas.getContext('2d');
    window.PaperRenderer.drawPaperBackground(ctx, S.paperStyle);
    editor.style.color = S.inkColor;
  });

  // Blur: hide overlay text and redraw handwriting to canvas
  editor.addEventListener('blur', () => {
    editor.style.color = 'transparent';
    renderText(S.text);
  });

  // Input: concatenate all editor contents, sync to sidebar, and autosave
  editor.addEventListener('input', () => {
    const globalText = getGlobalTextFromEditors();
    S.text = globalText;
    document.getElementById('text-input').value = globalText;
    autosave();
    // Re-evaluate font family stack dynamically in case Indic characters were typed
    editor.style.fontFamily =
      fontSwitcher?.getFontStack(ScriptDetector.isIndicScript(editor.innerText), S.font) ?? S.font;
  });

  // Create margin text overlay for left side notes
  const marginText = document.createElement('div');
  marginText.className = 'margin-text-overlay';
  marginText.id = 'margin-' + pageNum;
  marginText.contentEditable = 'true';
  // contentEditable divs map to role=generic, which forbids aria-label — give
  // them an explicit textbox role so the label is valid (axe: aria-prohibited-attr)
  marginText.setAttribute('role', 'textbox');
  marginText.setAttribute('aria-multiline', 'true');
  marginText.setAttribute('aria-label', 'Margin notes for Page ' + pageNum);
  marginText.setAttribute('placeholder', '📝');
  marginText.style.fontFamily = S.font;

  // Update font when typing
  marginText.addEventListener('input', () => {
    marginText.style.fontFamily =
      fontSwitcher?.getFontStack(ScriptDetector.isIndicScript(marginText.innerText), S.font) ?? S.font;
  });

  container.appendChild(canvas);
  container.appendChild(editor);
  container.appendChild(marginText);
  wrapper.appendChild(label);
  wrapper.appendChild(container);

  document.getElementById('page-container').appendChild(wrapper);
  pages.push(canvas);
  updatePageNav();

  updateEditorStyles(editor, canvas);

  return canvas;
}

export function updateEditorStyles(editor, canvas) {
  if (!editor || !canvas) return;
  const actualWidth = canvas.offsetWidth || parseFloat(canvas.style.width) || PAGE_W;
  const scale = actualWidth / PAGE_W;
  editor.style.fontFamily =
    fontSwitcher?.getFontStack(ScriptDetector.isIndicScript(editor.innerText), S.font) ?? S.font;
  editor.style.fontSize = S.fontSize * scale + 'px';
  editor.style.lineHeight = S.lineHeight;
  editor.style.paddingTop = S.margin * scale + 'px';
  editor.style.paddingLeft = S.margin * scale + 'px';
  editor.style.paddingRight = S.margin * scale + 'px';
  editor.style.paddingBottom = S.margin * scale + 'px';

  if (document.activeElement === editor) {
    editor.style.color = S.inkColor;
  } else {
    editor.style.color = 'transparent';
  }
  editor.style.caretColor = S.inkColor;
}

export function getGlobalTextFromEditors() {
  const editors = document.querySelectorAll('.page-editor');
  let text = '';
  editors.forEach((editor, i) => {
    let t = editor.innerText;
    if (t.endsWith('\n')) {
      t = t.slice(0, -1);
    }
    text += t;
    if (i < editors.length - 1) text += '\n';
  });
  return text;
}

export function clearPages() {
  pages.length = 0;
  S.currentPage = 0;
  document.getElementById('page-container').innerHTML = '';
  updatePageNav();
}

/* ───────────────────────────────────────────
   PHASE 8.8 — PAGE NAVIGATION (moved with the page DOM it mirrors)
─────────────────────────────────────────── */
function updatePageNav() {
  const total = pages.length || 1;
  const cur = Math.min(S.currentPage + 1, total);
  const text = `Page ${cur} of ${total}`;
  document.getElementById('page-indicator').textContent = text;
  document.getElementById('page-indicator-toolbar').textContent = text;
  document.getElementById('nav-prev').disabled = S.currentPage <= 0;
  document.getElementById('nav-next').disabled = S.currentPage >= pages.length - 1;
  updateLayerUI(S.currentPage);
}

export function navigatePage(dir) {
  const newIdx = S.currentPage + dir;
  if (newIdx < 0 || newIdx >= pages.length) return;
  S.currentPage = newIdx;
  const canvas = pages[newIdx];
  canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
  updatePageNav();
}

function redrawPageCanvas(pageNum) {
  const canvas = pages[pageNum - 1];
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  window.PaperRenderer.drawPaperBackground(ctx, S.paperStyle);
  window.PaperRenderer.renderSmudgeEffects(ctx, pageNum - 1);
  const queue = currentRenderQueue;
  if (queue) {
    const items = queue.filter((item) => item.pageIdx === pageNum - 1);
    renderQueueItems(ctx, canvas, items);
  }
  drawMarginQuestionLabels(ctx, pageNum - 1);
}

export function renderText(text) {
  text = sanitizeText(text);
  clearPages();

  // Drop decoded-glyph cache entries whose character no longer exists in
  // draftedGlyphs (pruneBlankGlyphs in state.js can't reach the cache from
  // there — this sweep is the draw-side hygiene replacing its cache eviction).
  for (const key of glyphImageCache.keys()) {
    if (!draftedGlyphs[key]) glyphImageCache.delete(key);
  }

  if (!text.trim()) {
    const canvas = createPage(1);
    window.PaperRenderer.drawPaperBackground(canvas.getContext('2d'), S.paperStyle);
    const ctx = canvas.getContext('2d');
    window.PaperRenderer.renderSmudgeEffects(ctx, 0);
    const editor = document.getElementById('editor-1');
    if (editor) {
      editor.innerText = '';
      updateEditorStyles(editor, canvas);
    }
    return;
  }

  const { queue, pageTexts, pageCount } = layoutText(text, currentPrediction);

  for (let i = 0; i < pageCount; i++) {
    createPage(i + 1);
    // We let renderSpecificPage handle the background and smudges
  }

  // Disconnect old observer before re-observing new pages
  if (pageObserver) {
    pageObserver.disconnect();
  }
  pageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const wrapper = entry.target;
        if (entry.isIntersecting) {
          const pageIdx = parseInt(wrapper.dataset.pageIdx, 10);
          if (!isNaN(pageIdx)) {
            renderSpecificPage(pageIdx);
          }
        }
      });
    },
    { rootMargin: '600px 0px' }
  );

  // Group queue by page and save for lazy rendering
  currentRenderQueue = queue;
  setMarginLabelsCache(
    S.showMarginLabels && S.noteLayout === 'standard'
      ? computeMarginLabels(queue, { fontSize: S.fontSize, lineHeight: S.lineHeight })
      : new Map()
  );
  currentRcCache = new Map();

  pages.forEach((c, idx) => {
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      if (document.activeElement !== editor) {
        editor.innerText = pageTexts[idx] || '';
      }
      c.dataset.text = pageTexts[idx] || '';
      updateEditorStyles(editor, c);
    }

    c.dataset.rendered = 'false';
    const wrapper = c.parentElement;
    wrapper.dataset.pageIdx = idx;
    pageObserver.observe(wrapper);
  });
}

export function renderSpecificPage(pageIdx, forceRedraw) {
  const canvas = pages[pageIdx];
  if (!canvas) return;
  if (canvas.dataset.rendered === 'true' && !forceRedraw) return;
  canvas.dataset.rendered = 'true';

  const ctx = canvas.getContext('2d');
  const comp = window.layerCompositor;

  let drawCtx = ctx;
  let drawCanvas = canvas;
  let isLayerCompositing = false;

  if (comp) {
    try {
      const stack = comp.getStack(pageIdx);
      const bgLayer = stack.layers.find((l) => l.name === 'Background');
      const contentLayer = stack.layers.find((l) => l.name === 'Content');

      if (bgLayer && contentLayer) {
        // Draw background onto the Background layer
        const bgCtx = bgLayer.canvas.getContext('2d');
        bgCtx.clearRect(0, 0, comp.width, comp.height);
        window.PaperRenderer.drawPaperBackground(bgCtx, S.paperStyle);
        window.PaperRenderer.renderSmudgeEffects(bgCtx, pageIdx);

        // Draw note contents onto the Content layer
        const contentCtx = contentLayer.canvas.getContext('2d');
        contentCtx.clearRect(0, 0, comp.width, comp.height);

        drawCtx = contentCtx;
        drawCanvas = contentLayer.canvas;
        isLayerCompositing = true;
      }
    } catch (e) {
      console.warn('Layer setup failed, falling back to direct canvas render', e);
      drawCtx = ctx;
      drawCanvas = canvas;
      isLayerCompositing = false;
    }
  }

  if (!isLayerCompositing) {
    window.PaperRenderer.drawPaperBackground(ctx, S.paperStyle);
    window.PaperRenderer.renderSmudgeEffects(ctx, pageIdx);
  }

  const pageItems = (currentRenderQueue || []).filter((item) => item.pageIdx === pageIdx);

  if (S.cursiveMode && cursiveConnector) {
    renderCursiveConnectionsOn(drawCtx, drawCanvas, pageItems);
  }

  pageItems.forEach((item) => {
    if (item.hidden) return; // clean mode: bare "Answer:" row (margin Ans label only)
    if (item.type === 'mermaid') {
      const diag = getDiagramImage(item.content);
      if (diag.ready && diag.img && !diag.error) {
        drawCtx.save();
        drawCtx.translate(item.x, item.y);
        // ponytail: seeded rotation so diagrams don't jitter on re-render
        let hash = 0;
        for (let ci = 0; ci < item.content.length; ci++) {
          hash = ((hash << 5) - hash + item.content.charCodeAt(ci)) | 0;
        }
        drawCtx.rotate(((((hash % 40) - 20) / 100) * Math.PI) / 180);
        drawCtx.globalAlpha = 0.9;
        drawCtx.drawImage(diag.img, 0, 0, item.w, item.h);
        drawCtx.restore();
      } else if (diag.error) {
        drawCtx.fillStyle = '#ff0000';
        drawCtx.font = '12px Courier New';
        drawCtx.fillText('[Mermaid Error]', item.x, item.y + 20);
      } else {
        drawCtx.save();
        drawCtx.strokeStyle = S.inkColor;
        drawCtx.globalAlpha = 0.3;
        drawCtx.setLineDash([5, 5]);
        drawCtx.strokeRect(item.x, item.y, item.w, item.h);
        drawCtx.font = 'italic 12px sans-serif';
        drawCtx.fillStyle = S.inkColor;
        drawCtx.fillText('Rendering Mermaid...', item.x + 10, item.y + 20);
        drawCtx.restore();
      }
      return;
    }

    if (item.type === 'shape' || item.type === 'edge') {
      drawShapeOrEdge(drawCtx, drawCanvas, item, {
        roughness: 1.4 + (S.realism || 0.5) * 0.5,
        stroke: S.inkColor,
        strokeWidth: 1.5,
        bowing: 1.2 + (S.rotationMax || 1) * 0.2,
      }, currentRcCache);
      return;
    }

    const v = item.v;
    const itemInkColor = item.inkColor || S.inkColor;
    const baseFontSize = item.customSize || S.fontSize;

    drawCtx.save();
    drawCtx.translate(item.x, item.y);
    drawCtx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
    // Upstream v1.6.25 micro-shear: per-glyph pen-nib angle drag
    if (v.shearX) {
      drawCtx.transform(1, 0, v.shearX, 1, 0, 0);
    }
    drawCtx.scale(v.scaleX, v.scaleY);

    if (draftedGlyphs[item.ch] && S.paperStyle !== 'clean') {
      const glyphImg = getCachedGlyphImage(item.ch, draftedGlyphs[item.ch]);
      if (glyphImg) {
        drawCtx.globalAlpha = item.isPrediction ? 0.3 : v.opacity;
        const drawSz = baseFontSize * 1.35;
        drawCtx.drawImage(glyphImg, -drawSz / 2, -drawSz / 2, drawSz, drawSz);
      } else {
        const pxSize = baseFontSize * v.pressureMod;
        drawCtx.font = `${item.bold ? '600 ' : ''}${Math.max(10, pxSize)}px ${item.fontStack}`;
        drawCtx.globalAlpha = item.isPrediction ? 0.3 : v.opacity;
        drawCtx.fillStyle = itemInkColor;
        drawCtx.fillText(item.ch, 0, 0);
      }
    } else {
      const pxSize = baseFontSize * v.pressureMod;
      drawCtx.font = `${item.bold ? '600 ' : ''}${Math.max(10, pxSize)}px ${item.fontStack}`;
      drawCtx.globalAlpha = item.isPrediction ? 0.3 : v.opacity;
      if (S.bleed > 0.05 && S.paperStyle !== 'clean') {
        drawCtx.shadowColor = itemInkColor;
        // Upstream v1.6.25 pressure-correlated bleed: heavier-pressure glyphs
        // bleed slightly more, matching fluid ink on paper fibers.
        const r = S.realism !== undefined ? S.realism : 0.5;
        const bleedFactor = 1.0 + (v.pressureMod - 1.0) * 0.4 * r;
        drawCtx.shadowBlur = Math.max(0, S.bleed * 1.4 * bleedFactor);
      } else {
        drawCtx.shadowBlur = 0;
      }
      drawCtx.fillStyle = itemInkColor;
      drawCtx.fillText(item.ch, 0, 0);
      if (item.isRetrace) {
        // Rare imperfection (upstream v1.6.22): faint 1px-offset retrace stroke
        drawCtx.shadowBlur = 0;
        drawCtx.globalAlpha = v.opacity * 0.35;
        drawCtx.fillText(item.ch, 1, 1);
      }
    }
    drawCtx.restore();
  });

  // Margin Q/Ans labels first, then template decorations on top of content
  drawMarginQuestionLabels(drawCtx, pageIdx);
  window.PaperRenderer.drawLayoutDecorations(drawCtx, S.noteLayout);

  // If using layer compositor, composite all layers (Background, Content, and any custom layers) onto visible canvas!
  if (isLayerCompositing && comp) {
    comp.composite(pageIdx, ctx);
  }

  // Update layer UI if needed
  maybeUpdateLayerUI(pageIdx);
}

export function debounceRender() {
  clearTimeout(renderTimeout);
  renderTimeout = setTimeout(() => renderText(S.text), 280);
}

export function triggerRender() {
  const input = document.getElementById('text-input');
  if (input) S.text = input.value;
  renderText(S.text);
}

export function stopAnimation() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = null;
  isAnimating = false;
  const cursor = document.getElementById('pen-cursor');
  if (cursor) cursor.style.display = 'none';
}

export function startAnimation() {
  stopAnimation();
  const text = document.getElementById('text-input').value;
  if (!text.trim()) return;
  isAnimating = true;

  // Clear and recreate pages with backgrounds
  clearPages();
  const { queue, pageCount } = layoutText(text, currentPrediction);
  for (let i = 0; i < pageCount; i++) {
    const c = createPage(i + 1);
    window.PaperRenderer.drawPaperBackground(c.getContext('2d'), S.paperStyle);
  }

  let idx = 0;
  const penEl = document.getElementById('pen-cursor');
  penEl.style.display = 'block';
  const animLabeledPages = new Set(); // draw each page's margin labels once, when the pen reaches it

  function step() {
    if (!isAnimating || idx >= queue.length) {
      penEl.style.display = 'none';
      isAnimating = false;
      renderText(S.text);
      return;
    }
    const charsPerFrame = S.animSpeed;
    for (let i = 0; i < charsPerFrame && idx < queue.length; i++, idx++) {
      const item = queue[idx];
      const canvas = pages[item.pageIdx] || pages[pages.length - 1];
      if (!canvas) continue;
      const ctx = canvas.getContext('2d');

      if (!animLabeledPages.has(item.pageIdx)) {
        animLabeledPages.add(item.pageIdx);
        drawMarginQuestionLabels(ctx, item.pageIdx);
      }
      if (item.hidden) continue;

      if (item.type === 'mermaid') {
        const diag = getDiagramImage(item.content);
        if (diag.ready && diag.img && !diag.error) {
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.rotate(((Math.random() * 0.4 - 0.2) * Math.PI) / 180);
          ctx.globalAlpha = 0.9;
          ctx.drawImage(diag.img, 0, 0, item.w, item.h);
          ctx.restore();
        }
        continue;
      }

      if (item.type === 'shape' || item.type === 'edge') {
        drawShapeOrEdge(ctx, canvas, item, {
          roughness: 1.4 + (S.realism || 0.5) * 0.5,
          stroke: S.inkColor,
          strokeWidth: 1.5,
          bowing: 1.2 + (S.rotationMax || 1) * 0.2,
        }, null);
        continue;
      }

      const v = item.v;
      const baseFontSize = item.customSize || S.fontSize;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((v.tiltDeg * (item.isIndic ? 0.3 : 1) * Math.PI) / 180);
      // Upstream v1.6.25 micro-shear: per-glyph pen-nib angle drag
      if (v.shearX) {
        ctx.transform(1, 0, v.shearX, 1, 0, 0);
      }
      ctx.scale(v.scaleX, v.scaleY);
      const pxSize = baseFontSize * v.pressureMod;
      ctx.font = `${item.bold ? '600 ' : ''}${Math.max(10, pxSize)}px ${item.fontStack}`;
      ctx.globalAlpha = v.opacity;
      if (S.bleed > 0.05 && S.paperStyle !== 'clean') {
        ctx.shadowColor = S.inkColor;
        // Upstream v1.6.25 pressure-correlated bleed
        const r = S.realism !== undefined ? S.realism : 0.5;
        const bleedFactor = 1.0 + (v.pressureMod - 1.0) * 0.4 * r;
        ctx.shadowBlur = Math.max(0, S.bleed * 1.4 * bleedFactor);
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = S.inkColor;
      ctx.fillText(item.ch, 0, 0);
      if (item.isRetrace) {
        ctx.globalAlpha = v.opacity * 0.35;
        ctx.fillText(item.ch, 1, 1);
      }
      ctx.restore();

      // Move pen cursor to current char screen position
      if (i === charsPerFrame - 1 || idx === queue.length - 1) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / PAGE_W;
        const scaleY = rect.height / PAGE_H;
        const penLeft = rect.left + item.x * scaleX;
        const penTop = rect.top + item.y * scaleY + window.scrollY;
        penEl.style.left = penLeft + 'px';
        penEl.style.top = penTop + 'px';

        // Auto-scroll viewport if the pen is near the edges of screen
        const targetScroll = rect.top + item.y * scaleY + window.scrollY - window.innerHeight / 2;
        if (rect.top + item.y * scaleY < 120 || rect.top + item.y * scaleY > window.innerHeight - 120) {
          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth',
          });
        }
      }
    }
    animFrameId = requestAnimationFrame(step);
  }
  animFrameId = requestAnimationFrame(step);
}

/* ── Viewport resize: reflow every page canvas's CSS display size, then
   refresh the editor overlays (moved from index.js, M2 completion). ── */
window.addEventListener('resize', () => {
  pages.forEach((c, idx) => {
    // Reflow canvas display size first, then recompute editor overlays against it
    const displayWidth = getResponsiveCanvasWidth();
    c.style.width = displayWidth + 'px';
    c.style.height = (displayWidth * PAGE_H) / PAGE_W + 'px';
    const editor = document.getElementById('editor-' + (idx + 1));
    if (editor) {
      updateEditorStyles(editor, c);
    }
  });
});

