/**
 * layout-engine.js — text layout pipeline + sticky/callout/margin-label painters
 * (upgrade plan M2 pass: extracted from index.js, zero behavior change).
 *
 * Owns the text→render-queue layout (layoutText / layoutTextTemplated), the
 * markdown multi-pen segment helpers it consumes, the (currently uncalled)
 * sticky-note / callout painters, and the precomputed margin Q/Ans label
 * painter shared by render-pipeline.js's renderText lazy page renderer,
 * startAnimation and redrawPageCanvas.
 *
 * No top-level side effects: templateManager / PaperRenderer are read off
 * window at call time (their modules are imported by index.js before any
 * render runs), and `pages` is the shared live array from state.js. Text
 * helpers (text-layout.js) and margin-label predicates (margin-labels.js) are
 * static imports since the M2 pass.
 */
import { S, PAGE_W, PAGE_H, pages, markdownParser, fontSwitcher } from './state.js';
import { CharacterVariationContext, createPRNG, getCharVariationWithContext, hashString } from './contextual-jitter-engine.js';
import { ScriptDetector } from './script-detector.js';
import { getDiagramImage, positionDiagramNodes, calculateDiagramEdges } from './diagram-engine.js';
import { sanitizeText, parseBlocks, getGraphemes } from './text-layout.js';
import { isAnswerLine, isQuestionLine } from './margin-labels.js';

// Precomputed margin Q/Ans labels for the current render — render-pipeline.js's
// renderText() publishes a fresh Map here via setMarginLabelsCache() before the
// lazy per-page draws read it back in drawMarginQuestionLabels(). (Was the
// window.marginLabelsCache render global.)
let marginLabelsCache = new Map();

export function setMarginLabelsCache(cache) {
  marginLabelsCache = cache instanceof Map ? cache : new Map();
}

function getStyledLineSegments(lineText) {
  if (!lineText) return [];
  if (!S.markdownMultiPen || !markdownParser) {
    return [{ text: lineText, type: 'body', emphasisType: null, level: null }];
  }

  const parsed = markdownParser.parse(lineText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return [{ text: lineText, type: 'body', emphasisType: null, level: null }];
  }

  return parsed.map((seg) => ({
    text: seg.text || '',
    type: seg.type || 'body',
    emphasisType: seg.emphasisType || null,
    level: seg.level || null,
  }));
}

function getPenProfileForSegment(segment) {
  const type = segment?.type || 'body';
  const map = S.markdownPenProfiles || {};
  const profile = map[type] || map.body || {};
  return {
    inkColor: profile.inkColor || null,
    pressure: typeof profile.pressure === 'number' ? profile.pressure : null,
    rotationScale: typeof profile.rotationScale === 'number' ? profile.rotationScale : 1,
    key: `${type}:${segment?.emphasisType || 'none'}:${segment?.level || 0}`,
  };
}

function tokenizeWithSpaces(text) {
  if (!text) return [];
  const tokens = [];
  let word = '';

  for (const ch of text) {
    if (ch === ' ') {
      if (word.length > 0) {
        tokens.push({ type: 'word', text: word });
        word = '';
      }
      tokens.push({ type: 'space', text: ' ' });
    } else {
      word += ch;
    }
  }

  if (word.length > 0) {
    tokens.push({ type: 'word', text: word });
  }

  return tokens;
}

const STICKY_COLORS = { yellow: '#fff9c4', cyan: '#e0f7fa', pink: '#fce4ec', mint: '#e8f5e9' };
const CALLOUT_STYLES = { warning: { bg: '#fff3e0', border: '#e65100', icon: '⚠' }, info: { bg: '#e3f2fd', border: '#1565c0', icon: 'ℹ' }, formula: { bg: '#f3e5f5', border: '#7b1fa2', icon: '∑' } };

function paintStickyNotes(queue, targetPageIdx) {
  if (typeof window._parsedStickies === 'undefined' || !window._parsedStickies.length) return;
  window._parsedStickies.forEach((sticky) => {
    const items = queue.filter((item) => item.pageIdx === (targetPageIdx != null ? targetPageIdx : item.pageIdx));
    if (!items.length) return;
    const canvas = pages[items[0].pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bg = STICKY_COLORS[sticky.color] || STICKY_COLORS.yellow;
    const margin = S.margin;
    const stickyW = 120;
    const stickyH = 80;
    const sx = PAGE_W - margin - stickyW;
    const sy = margin + 20;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = bg;
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.fillRect(sx, sy, stickyW, stickyH);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.font = `${Math.max(9, S.fontSize * 0.5)}px ${S.font}`;
    ctx.fillStyle = '#333';
    window.PaperRenderer.drawWrappedText(ctx, sticky.text, sx + 6, sy + 16, stickyW - 12, S.fontSize * 0.55, 5);
    ctx.restore();
  });
}

function paintCallouts(queue, targetPageIdx) {
  if (typeof window._parsedCallouts === 'undefined' || !window._parsedCallouts.length) return;
  window._parsedCallouts.forEach((callout) => {
    const items = queue.filter((item) => item.pageIdx === (targetPageIdx != null ? targetPageIdx : item.pageIdx));
    if (!items.length) return;
    const canvas = pages[items[0].pageIdx];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const style = CALLOUT_STYLES[callout.type] || CALLOUT_STYLES.info;
    const margin = S.margin;
    const boxW = margin - 20;
    const boxH = 70;
    const bx = 10;
    const by = margin + 20;
    ctx.save();
    ctx.fillStyle = style.bg;
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = style.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, boxW, boxH);
    ctx.font = `bold ${Math.max(10, S.fontSize * 0.5)}px ${S.font}`;
    ctx.fillStyle = style.border;
    ctx.fillText(style.icon, bx + 6, by + 16);
    ctx.font = `${Math.max(8, S.fontSize * 0.4)}px ${S.font}`;
    ctx.fillStyle = '#333';
    window.PaperRenderer.drawWrappedText(ctx, callout.text, bx + 22, by + 16, boxW - 28, S.fontSize * 0.45, 4);
    ctx.restore();
  });
}

// Draw precomputed Q/Ans margin labels for one page (upstream v1.6.8–1.6.17
// geometry: 0.78× font (min 13px), right-aligned 24px clear of the margin rule,
// baseline raised 0.15× above the line's handwriting).
function drawMarginQuestionLabels(ctx, pageIdx) {
  if (!S.showMarginLabels || S.noteLayout !== 'standard') return;
  const labels = marginLabelsCache.get(pageIdx);
  if (!labels || labels.length === 0) return;
  ctx.save();
  ctx.fillStyle = S.inkColor;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 ' + Math.max(13, S.fontSize * 0.78) + 'px ' + (S.font || 'Caveat');
  for (const entry of labels) {
    ctx.fillText(entry.label, S.margin - 24, entry.y - S.fontSize * 0.15);
  }
  ctx.restore();
}

function layoutText(text, currentPrediction = '') {
  const originalLength = text ? text.length : 0;
  if (currentPrediction) {
    text = (text || '') + currentPrediction;
  }

  text = sanitizeText(text);
  if (!text.trim()) {
    return { queue: [], pageTexts: [], pageCount: 1 };
  }

  const result = layoutTextTemplated(text);

  // Tag prediction characters in the queue and strip them from pageTexts
  if (currentPrediction && result) {
    const numPredictionChars = getGraphemes(currentPrediction).length;
    let taggedCount = 0;
    for (let i = result.queue.length - 1; i >= 0; i--) {
      const item = result.queue[i];
      if (item.type !== 'shape' && item.type !== 'edge' && item.type !== 'mermaid') {
        item.isPrediction = true;
        taggedCount++;
        if (taggedCount >= numPredictionChars) {
          break;
        }
      }
    }

    // Strip prediction from pageTexts
    let remainingPredictionLen = currentPrediction.length;
    for (let i = result.pageTexts.length - 1; i >= 0; i--) {
      if (remainingPredictionLen <= 0) break;
      const pageText = result.pageTexts[i];
      if (pageText.length >= remainingPredictionLen) {
        result.pageTexts[i] = pageText.slice(0, pageText.length - remainingPredictionLen);
        remainingPredictionLen = 0;
      } else {
        remainingPredictionLen -= pageText.length;
        result.pageTexts[i] = '';
      }
    }
  }

  return result;
}

function layoutTextTemplated(text) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = PAGE_W;
  tmpCanvas.height = PAGE_H;
  const ctx = tmpCanvas.getContext('2d');

  const queue = [];
  const pageTexts = [];
  let currentPageText = '';

  const variationContext = new CharacterVariationContext();

  // Seeded realism (upstream v1.6.22): same text → same PRNG seed, so layout is
  // pixel-identical across re-renders, page switches, and PDF exports.
  const prng = createPRNG(hashString(text));
  let lineDrift = 0;
  const realismK = S.fontSize / 22;
  // Clean style (upstream v1.4.0): crisp typographic mode — no variation at all.
  const cleanNeutral = S.paperStyle === 'clean';
  const cleanStandard = cleanNeutral && S.noteLayout === 'standard' && S.showMarginLabels;
  const NEUTRAL_V = { tiltDeg: 0, scaleX: 1, scaleY: 1, shearX: 0, baselineOff: 0, spacingExtra: 0, pressureMod: 1, opacity: 1 };

  const margin = S.margin;
  const template = window.templateManager
    ? window.templateManager.resolveTemplate(S.noteLayout, PAGE_W, PAGE_H, margin)
    : null;
  const zones =
    template && template.zones && template.zones.length > 0
      ? template.zones
      : [{ id: 'main', x: margin, y: margin, width: PAGE_W - margin * 2, height: PAGE_H - margin * 2, nextZone: null }];

  let activeZone = zones[0];
  let x = activeZone.x;
  const lineH = S.fontSize * S.lineHeight;
  let y = activeZone.y + S.fontSize + lineH;

  let pageIdx = 0;
  let charIndex = 0;
  let lineCharIndex = 0;
  // Upstream v1.6.16 (clean standard): was the last consumed ruled row empty?
  // Document start / fresh page count as "blank" so a question at the very top
  // of a page never gets an extra empty row above it.
  let prevRowBlank = true;

  function advanceLineOrZone() {
    x = activeZone.x;
    y += lineH;
    lineCharIndex = 0;
    lineDrift = 0;
    variationContext.resetAtLineBreak();
    if (y + lineH > activeZone.y + activeZone.height) {
      if (activeZone.nextZone) {
        activeZone = zones.find((z) => z.id === activeZone.nextZone) || zones[0];
      } else {
        pageTexts.push(currentPageText);
        currentPageText = '';
        pageIdx++;
        activeZone = zones[0];
        prevRowBlank = true; // new page: no previous row yet
      }
      x = activeZone.x;
      y = activeZone.y + S.fontSize + lineH;
    }
  }

  const blocks = parseBlocks(text);

  for (const block of blocks) {
    if (block.type === 'mermaid') {
      const diag = getDiagramImage(block.content);

      const maxWidth = activeZone.width;
      let dWidth = diag.width || 400;
      let dHeight = diag.height || 200;

      if (dWidth > maxWidth) {
        const scale = maxWidth / dWidth;
        dWidth = maxWidth;
        dHeight *= scale;
      }

      if (y + dHeight > activeZone.y + activeZone.height) {
        advanceLineOrZone();
      }

      queue.push({
        type: 'mermaid',
        content: block.content,
        x: activeZone.x + (activeZone.width - dWidth) / 2,
        y: y,
        w: dWidth,
        h: dHeight,
        pageIdx,
      });

      currentPageText += block.raw + '\n';
      y += dHeight + lineH;
      x = activeZone.x;
      lineCharIndex = 0;
      prevRowBlank = false; // diagram rows carry ink
      continue;
    }

    if (block.type === 'diagram') {
      let data;
      try {
        data = JSON.parse(block.content);
        if (!data || !data.nodes) throw new Error('Missing nodes');
      } catch (e) {
        console.error('Failed to parse diagram JSON', e);
        continue;
      }

      const dWidth = activeZone.width;
      const dHeight = data.nodes.length > 5 ? 420 : (data.type === 'cycle' ? 360 : 320);

      if (y + dHeight > activeZone.y + activeZone.height) {
        advanceLineOrZone();
      }

      let positionedNodes = [];

      // Layout based on diagram type (using imported functions from diagram-engine.js)
      positionedNodes = positionDiagramNodes(data, activeZone.x, y, dWidth, dHeight);

      // Push individual shape items
      positionedNodes.forEach((n) => {
        const shape = n.shape || (data.type === 'cycle' ? 'circle' : 'box');
        queue.push({
          type: 'shape',
          shape,
          label: n.label || '',
          x: n.x,
          y: n.y,
          w: n.w || 100,
          h: n.h || (data.type === 'cycle' ? (n.w || 100) : 40),
          pageIdx,
        });
      });

      // Calculate perimeter-clipped, curved hand-drawn edges that never intersect shapes or text
      // (diagram-engine.js is a static import, so the old
      // `typeof DiagramEngine !== 'undefined'` guard was always true.)
      const calculatedEdges = calculateDiagramEdges(data, positionedNodes, activeZone.x, y, dWidth, dHeight);

      calculatedEdges.forEach((e) => {
        queue.push({
          type: 'edge',
          from: e.from,
          to: e.to,
          control: e.control,
          isCurved: e.isCurved,
          label: e.label || '',
          pageIdx,
        });
      });

      positionedNodes.forEach((n) => {
        if (!n.label) return;
        const nodeW = n.w || (data.type === 'cycle' ? 100 : 100);

        // Intelligent font sizing for diagram labels so long text stays beautifully inside node
        const maxCharInWord = Math.max(...n.label.split(/\s+/).map((w) => w.length), 1);
        const availableW = (n.shape === 'circle' ? nodeW * 0.76 : nodeW - 20);
        const autoFontSize = Math.min(S.fontSize, Math.max(14, Math.floor(availableW / (maxCharInWord * 0.58))));
        ctx.font = `${autoFontSize}px ${S.font}`;

        // Wrap label into multiple lines if needed
        const rawWords = n.label.split(/\s+/);
        const lines = [];
        let curLine = '';
        rawWords.forEach((word) => {
          const testLine = curLine ? curLine + ' ' + word : word;
          if (curLine && ctx.measureText(testLine).width > availableW) {
            lines.push(curLine);
            curLine = word;
          } else {
            curLine = testLine;
          }
        });
        if (curLine) lines.push(curLine);

        const labelLineHeight = autoFontSize * 1.15;
        const totalBlockH = (lines.length - 1) * labelLineHeight;
        let ly = n.y - totalBlockH / 2 + autoFontSize * 0.32;

        lines.forEach((line) => {
          let lx = n.x - ctx.measureText(line).width / 2;
          const chars = getGraphemes(line);
          chars.forEach((ch) => {
            const v = cleanNeutral
              ? NEUTRAL_V
              : getCharVariationWithContext(S.rotationMax * 0.5, S.pressure, autoFontSize, null, {
                  prng: prng,
                  realism: S.realism,
                });
            const cw = ctx.measureText(ch).width + v.spacingExtra;
            queue.push({
              ch,
              x: lx,
              y: ly + v.baselineOff,
              v,
              pageIdx,
              isIndic: false,
              type: 'diagram-label',
              fontStack: fontSwitcher?.getFontStack(false, S.font) ?? S.font,
              inkColor: S.inkColor,
              penKey: 'body',
              charWidth: cw,
              customSize: autoFontSize,
            });
            lx += cw;
          });
          ly += labelLineHeight;
        });
      });

      y += dHeight + lineH;
      currentPageText += block.raw + '\n';
      x = activeZone.x;
      lineCharIndex = 0;
      prevRowBlank = false; // diagram rows carry ink
      continue;
    }

    const lines = block.content.split('\n');

    const applySpaceAdvance = (fontStack) => {
      ctx.font = `${S.fontSize}px ${fontStack}`;
      const spaceW = ctx.measureText(' ').width + S.wordSpacing;
      if (x + spaceW < activeZone.x + activeZone.width) {
        x += spaceW;
        currentPageText += ' ';
      }
    };

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      if (lineIdx > 0) {
        advanceLineOrZone();
        currentPageText += '\n';
      }

      const lineText = lines[lineIdx];
      if (!lineText) {
        // Blank source line: the advance above already consumed one empty ruled
        // row, so the question-spacing tracker just records the row as blank.
        prevRowBlank = true;
        continue;
      }
      // Clean mode (upstream v1.6.11/1.6.13): bare "Answer:" lines are hidden on
      // canvas — items still emit (with hidden:true) so the margin Ans label and
      // the page-editor overlays stay aligned.
      const lineHidden = cleanStandard && isAnswerLine(lineText);
      const lineBold = cleanStandard && isQuestionLine(lineText);
      // Clean mode (upstream v1.6.16): one empty ruled row before each question
      // block — skipped at page tops and when the previous row is already blank
      // (source blank line, hidden Answer row, or a previously inserted row).
      // The row advances y AND appends '\n' to the page text so the editor
      // overlays stay 1:1 aligned and the blank row round-trips as an ordinary
      // blank source line (which then suppresses re-insertion).
      if (lineBold && !prevRowBlank) {
        advanceLineOrZone();
        currentPageText += '\n';
        prevRowBlank = true;
      }
      let lineDrewInk = false; // any visible char landed on this row?

      const segments = getStyledLineSegments(lineText);
      for (let si = 0; si < segments.length; si++) {
        const segment = segments[si];
        if (!segment.text) continue;

        const penProfile = getPenProfileForSegment(segment);
        const penPressure = penProfile.pressure !== null ? penProfile.pressure : S.pressure;
        const penRotation = S.rotationMax * penProfile.rotationScale;
        const inkColor = penProfile.inkColor || S.inkColor;
        const tokens = tokenizeWithSpaces(segment.text);

        for (let ti = 0; ti < tokens.length; ti++) {
          const token = tokens[ti];
          if (token.type === 'space') {
            const previewIsIndic = ScriptDetector.isIndicScript(segment.text);
            applySpaceAdvance(fontSwitcher?.getFontStack(previewIsIndic, S.font) ?? S.font);
            continue;
          }

          const lineWord = token.text;
          if (!lineWord) continue;

          const scriptRuns = fontSwitcher?.getTokenScriptRuns(lineWord, S.hinglishAutoSwitch, getGraphemes) || [];
          let wordWidth = S.wordSpacing;
          scriptRuns.forEach((run) => {
            const runFontStack = fontSwitcher?.getFontStack(run.isIndic, S.font) ?? S.font;
            ctx.font = `${S.fontSize}px ${runFontStack}`;
            wordWidth += ctx.measureText(run.text).width;
          });

          if (x + wordWidth > activeZone.x + activeZone.width && x > activeZone.x) {
            advanceLineOrZone();
          }

          scriptRuns.forEach((run) => {
            const fontStack = fontSwitcher?.getFontStack(run.isIndic, S.font) ?? S.font;
            if (run.isIndic) {
              const lineLength = Math.max(1, lineText.length);
              variationContext.updateForCharacter(
                lineCharIndex,
                lineLength,
                lineCharIndex === 0,
                lineCharIndex === lineLength - 1
              );
              const v = cleanNeutral
                ? NEUTRAL_V
                : getCharVariationWithContext(
                    penRotation,
                    penPressure,
                    S.fontSize,
                    variationContext,
                    { prng: prng, realism: S.realism, isIndic: true }
                  );
              const wobble = cleanNeutral ? 0 : Math.sin(lineCharIndex * 0.04) * 0.4 * (S.fontSize / 22);
              const alignOffset = window.PaperRenderer.getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
              let clampedDrift = 0;
              if (!cleanNeutral) {
                lineDrift += (prng() - 0.48) * 0.45 * S.realism * realismK;
                clampedDrift = Math.max(-3.5 * S.realism * realismK, Math.min(3.5 * S.realism * realismK, lineDrift));
              }
              const cy = y + v.baselineOff * 0.4 + wobble + alignOffset + clampedDrift;

              queue.push({
                ch: run.text,
                x,
                y: cy,
                v,
                pageIdx,
                isIndic: true,
                hidden: lineHidden,
                bold: lineBold,
                fontStack,
                inkColor,
                penKey: penProfile.key,
                charWidth: ctx.measureText(run.text).width + v.spacingExtra,
              });
              if (!lineHidden) lineDrewInk = true;

              ctx.font = `${S.fontSize}px ${fontStack}`;
              x += ctx.measureText(run.text).width + v.spacingExtra;
              charIndex += run.text.length;
              lineCharIndex += run.text.length;
              currentPageText += run.text;
              return;
            }

            const graphemes = getGraphemes(run.text);
            for (let ci = 0; ci < graphemes.length; ci++) {
              const ch = graphemes[ci];
              const isWordStart = ci === 0;
              const isWordEnd = ci === graphemes.length - 1;
              const lineLength = Math.max(1, lineText.length);
              variationContext.updateForCharacter(lineCharIndex, lineLength, isWordStart, isWordEnd);

              const v = cleanNeutral
                ? NEUTRAL_V
                : getCharVariationWithContext(
                    penRotation,
                    penPressure,
                    S.fontSize,
                    variationContext,
                    { prng: prng, realism: S.realism, isIndic: false }
                  );
              ctx.font = `${S.fontSize}px ${fontStack}`;
              const charWidth = ctx.measureText(ch).width + v.spacingExtra;

              if (x + charWidth > activeZone.x + activeZone.width && x > activeZone.x) {
                advanceLineOrZone();
              }

              const wobble = cleanNeutral ? 0 : Math.sin(lineCharIndex * 0.04) * 0.8 * (S.fontSize / 22);
              const alignOffset = window.PaperRenderer.getAlignmentOffset(S.textAlignment, S.fontSize, S.lineHeight);
              let clampedDrift = 0;
              if (!cleanNeutral) {
                lineDrift += (prng() - 0.48) * 0.45 * S.realism * realismK;
                clampedDrift = Math.max(-3.5 * S.realism * realismK, Math.min(3.5 * S.realism * realismK, lineDrift));
              }
              const cy = y + v.baselineOff + wobble + alignOffset + clampedDrift;

              queue.push({
                ch,
                x,
                y: cy,
                v,
                pageIdx,
                isIndic: false,
                isRetrace: !cleanNeutral && S.rareImperfections && prng() < 0.018,
                hidden: lineHidden,
                bold: lineBold,
                fontStack,
                inkColor,
                penKey: penProfile.key,
                charWidth: ctx.measureText(ch).width + v.spacingExtra,
              });
              if (!lineHidden) lineDrewInk = true;

              x += ctx.measureText(ch).width + v.spacingExtra;
              charIndex++;
              lineCharIndex++;
              currentPageText += ch;
            }
          });
        }
      }
      prevRowBlank = !lineDrewInk; // whitespace-only / hidden rows count as blank
    }
  }

  pageTexts.push(currentPageText);
  return { queue, pageTexts, pageCount: pageIdx + 1 };
}

export { layoutText, drawMarginQuestionLabels, paintStickyNotes, paintCallouts };
