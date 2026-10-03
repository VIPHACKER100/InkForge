/**
 * ui-bindings.js — per-panel DOM event bindings (upgrade plan Phase B4).
 *
 * Every inline onclick/onchange/oninput handler that index.html used to carry
 * is migrated here into one binder per sidebar section / toolbar area, plus
 * small binders for the app shell, modals and page nav. index.js calls
 * bindAllUI() at the point where the old scattered top-level bindings ran;
 * the Layer Manager section binds itself via layer-panel.js bindLayerPanel().
 *
 * Import graph note: this module imports handler functions from index.js (the
 * task-sanctioned entry cycle). The cycle is safe because ui-bindings only
 * defines functions at eval time — the binders run later, called from
 * index.js's body, when every index.js binding is initialized.
 *
 * Modules that keep their own window namespaces (flashcards.js, voice-notes.js,
 * audio-recorder.js, notebooks.js, ai-assistant.js) are reached through those
 * namespaces at call time — they convert to imports in a later pass.
 */
import { S } from './state.js';
import { autosave } from './persistence.js';
import { exportImage, exportTransparentPNG, exportPDF, exportSVG, copyToClipboard } from './export-manager.js';
import {
  closeHandFontedModal,
  switchFontTab,
  switchSheet,
  saveActiveCharacter,
  advanceActiveCharacter,
  exportFontProject,
  importFontProject,
  generateDownloadTemplate,
  buildCustomFont,
  updateAlignerGrid,
  exportCustomFontTTF,
} from './handfonted-studio.js';
// Render pipeline + page navigation (M2 completion — the window bridge is retired)
import {
  renderText,
  debounceRender,
  triggerRender,
  startAnimation,
  stopAnimation,
  navigatePage,
} from './render-pipeline.js';
// Sidebar control sync (settings-sync.js — also imported by persistence.js)
import { updateInkPresetActive, syncMarkdownPenControls } from './settings-sync.js';
import {
  clearText,
  insertDiagramTemplate,
  setDiagramMenuOpen,
  setInkPreset,
  setPaper,
  setTextAlignment,
  resetToDefaults,
  autoFitFontSize,
  applyThemePack,
  onProviderChange,
  toggleCollaboration,
} from './index.js';

function qs(id) {
  return document.getElementById(id);
}

/* ───────────────────────────────────────────
   SHARED BINDING HELPERS
─────────────────────────────────────────── */

/* PHASE 2.3 — SIDEBAR SECTION TOGGLE (moved from index.js) */
export function toggleSection(id) {
  const section = document.getElementById(id);
  section.classList.toggle('collapsed');
  const btn = section.querySelector('.sb-section-header');
  if (btn) btn.setAttribute('aria-expanded', !section.classList.contains('collapsed'));
}

/* All 11 section headers fold/collapse their section via aria-controls. */
function bindSectionHeaders() {
  document.querySelectorAll('.sb-section-header').forEach((btn) => {
    btn.addEventListener('click', () => toggleSection(btn.getAttribute('aria-controls')));
  });
}

/* PHASE 5.1–5.6 — SLIDER CONTROLS (moved from index.js) */
function bindSlider(id, valId, key, parse = parseFloat, suffix = '') {
  const el = qs(id);
  const disp = qs(valId);
  el?.addEventListener('input', () => {
    S[key] = parse(el.value);
    if (disp) disp.textContent = parse(el.value) + suffix;
    debounceRender();
  });
}

/* ───────────────────────────────────────────
   MOVED CONTROL CALLBACKS (were index.js functions)
─────────────────────────────────────────── */

function onHinglishToggle(e) {
  const toggle = e && e.target ? e.target : qs('auto-switch-devanagari');
  if (!toggle) return;
  S.hinglishAutoSwitch = !!toggle.checked;
  // Sync the other checkbox
  const otherId = toggle.id === 'hinglish-toggle' ? 'auto-switch-devanagari' : 'hinglish-toggle';
  const other = qs(otherId);
  if (other) other.checked = S.hinglishAutoSwitch;
  autosave();
  debounceRender();
}

function onCursiveModeToggle() {
  const cursiveModeToggle = qs('cursive-mode-toggle');
  if (cursiveModeToggle) {
    S.cursiveMode = cursiveModeToggle.checked;
    autosave();
    debounceRender();
  }
}

function onSmudgeEffectsToggle() {
  const smudgeToggle = qs('smudge-effects-toggle');
  if (smudgeToggle) {
    S.smudgeEffects = smudgeToggle.checked;
    autosave();
    debounceRender();
  }
}

function onMarkdownMultiPenToggle() {
  const toggle = qs('markdown-multipen-toggle');
  if (!toggle) return;
  S.markdownMultiPen = toggle.checked;
  syncMarkdownPenControls();
  autosave();
  debounceRender();
}

function onMarkdownPenColorChange(type, value) {
  if (!S.markdownPenProfiles[type]) {
    S.markdownPenProfiles[type] = {};
  }
  S.markdownPenProfiles[type].inkColor = value;
  autosave();
  debounceRender();
}

function closeGrammarModal() {
  qs('grammar-modal')?.classList.add('hidden');
}

/* ───────────────────────────────────────────
   TOOLBAR (study / voice / dark mode / animate / clear)
─────────────────────────────────────────── */
function bindToolbar() {
  // Study Mode — flashcards.js owns the implementation (window.Flashcards).
  qs('btn-study')?.addEventListener('click', () => window.Flashcards?.toggleStudyMode());
  qs('exit-study-btn')?.addEventListener('click', () => window.Flashcards?.toggleStudyMode());
  // Voice to Notes — voice-notes.js owns the implementation (window.VoiceNotes).
  qs('btn-voice')?.addEventListener('click', () => window.VoiceNotes?.startVoiceRecording());

  /* PHASE 1.4 / 2.6 — DARK MODE TOGGLE (moved from index.js) */
  const darkToggle = qs('dark-toggle');
  const darkIcon = qs('dark-icon');
  let isDark = localStorage.getItem('inkflow-dark') === '1';

  function applyDark() {
    document.documentElement.classList.toggle('dark', isDark);
    if (darkIcon) {
      darkIcon.textContent = isDark ? '🌙' : '☀️';
    }
    if (darkToggle) {
      darkToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }
  applyDark();

  darkToggle?.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem('inkflow-dark', isDark ? '1' : '0');
    applyDark();
  });

  /* Animate / Clear (were bound at index.js top level) */
  qs('btn-animate')?.addEventListener('click', startAnimation);
  qs('btn-clear')?.addEventListener('click', clearText);
}

/* ───────────────────────────────────────────
   APP SHELL — sidebar drawer/collapse, drawer Escape, modal Escape + focus trap
─────────────────────────────────────────── */
function bindAppShell() {
  /* PHASE 2.7 — HAMBURGER & SIDEBAR COLLAPSE (moved from index.js)
     Desktop: toggles sidebar-collapsed body class + --sidebar-w CSS var.
     Mobile:  toggles sidebar drawer open/close (unchanged behaviour). */
  const SIDEBAR_W = 300; // must match CSS grid-template-columns 300px

  /** Update --sidebar-w on :root so dot-bg, page-nav, toast all follow */
  function updateSidebarWidthVar() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    const w = (isMobile || isCollapsed) ? 0 : SIDEBAR_W;
    document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
  }

  /** Mobile drawer open/close */
  function setSidebarOpen(open) {
    const sidebar = qs('sidebar');
    const hamburger = qs('hamburger');
    document.body.classList.toggle('sidebar-open', open);
    if (sidebar) sidebar.classList.toggle('open', open);
    if (hamburger) hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    updateSidebarWidthVar();
  }

  function isSidebarOpen() {
    return qs('sidebar')?.classList.contains('open') || false;
  }

  /** Desktop sidebar collapse */
  function toggleSidebarCollapse() {
    document.body.classList.toggle('sidebar-collapsed');
    const isCollapsed = document.body.classList.contains('sidebar-collapsed');
    const hamburger = qs('hamburger');
    if (hamburger) hamburger.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    updateSidebarWidthVar();
  }

  qs('hamburger')?.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      // Mobile: open/close drawer
      setSidebarOpen(!isSidebarOpen());
    } else {
      // Desktop: collapse/expand sidebar
      toggleSidebarCollapse();
    }
  });

  // Scrim tap closes the drawer (mobile only)
  qs('sidebar-backdrop')?.addEventListener('click', () => setSidebarOpen(false));

  // A tap on the canvas closes the drawer on mobile (capture phase)
  qs('canvas-area')?.addEventListener(
    'pointerdown',
    () => {
      if (isSidebarOpen()) setSidebarOpen(false);
    },
    true
  );

  // Escape closes the drawer when no modal is open
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.modal-overlay:not(.hidden)')) return;
    if (isSidebarOpen()) setSidebarOpen(false);
  });

  // Keep CSS var in sync when viewport changes between mobile/desktop breakpoints
  window.matchMedia('(max-width: 768px)').addEventListener('change', updateSidebarWidthVar);
  // Set correct value on load (sidebar starts expanded on desktop)
  updateSidebarWidthVar();

  // Generic modal helpers — serve every .modal-overlay in the app (HandFonted
  // Studio, grammar, flashcards, …). ESC key closes active modal, focus trap
  // keeps Tab inside. (Moved from index.js.)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
    modals.forEach((m) => {
      m.classList.add('hidden');
      if (m._previousFocus) m._previousFocus.focus();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const modal = document.querySelector('.modal-overlay:not(.hidden)');
    if (!modal) return;
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

/* ───────────────────────────────────────────
   TEXT PANEL (render / clear / diagram templates / file upload)
─────────────────────────────────────────── */
function bindTextPanel() {
  qs('btn-render')?.addEventListener('click', triggerRender);
  qs('btn-clear-text')?.addEventListener('click', clearText);

  // Diagram template links (inline `return false` → e.preventDefault()).
  ['flowchart', 'cycle', 'hierarchy', 'pipeline', 'pyramid', 'mermaid'].forEach((type) => {
    qs(`diagram-${type}`)?.addEventListener('click', (e) => {
      e.preventDefault();
      insertDiagramTemplate(type);
    });
  });

  /* Diagram template dropdown — click toggles the menu (hover still opens it on
     desktop, tap works on touch); outside click and Escape close it. The
     .dropdown-open class on the owning .sb-section releases that section's
     overflow clipping while the menu is open (CSS :has() covers modern browsers;
     this is the fallback for older ones). (Moved unchanged from index.js.) */
  const diagramDropdown = document.querySelector('.action-buttons-row .dropdown');

  diagramDropdown?.querySelector('button')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setDiagramMenuOpen(!diagramDropdown.classList.contains('open'));
  });
  document.addEventListener('click', (e) => {
    if (diagramDropdown && !diagramDropdown.contains(e.target)) setDiagramMenuOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && diagramDropdown?.classList.contains('open')) setDiagramMenuOpen(false);
  });

  setupFileUpload();
}

/* PREMIUM FILE UPLOAD MODULE (moved verbatim from index.js) */
function setupFileUpload() {
  const fileUpload = qs('file-upload');
  const dropZone = qs('drop-zone');
  const uploadStatus = qs('upload-status');
  const statusText = qs('status-text');

  if (!fileUpload || !dropZone) return;

  // Click drop zone to browse files
  dropZone.addEventListener('click', () => fileUpload.click());

  // Drag & drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleUploadedFile(file);
  });

  fileUpload.addEventListener('change', () => {
    const file = fileUpload.files[0];
    if (file) handleUploadedFile(file);
  });

  async function handleUploadedFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();

    // Show status
    uploadStatus.style.display = 'flex';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    statusText.replaceChildren(spinner, document.createTextNode(` Processing "${file.name}"...`));

    try {
      let text = '';
      if (ext === 'txt' || ext === 'md') {
        text = await readTextFile(file);
      } else if (ext === 'pdf') {
        const progContainer = qs('progress-container');
        const progBar = qs('progress-bar');
        if (progContainer) progContainer.style.display = 'block';
        if (progBar) progBar.style.width = '0%';

        text = await extractTextFromPDF(file, (percent) => {
          if (progBar) progBar.style.width = `${percent}%`;
        });

        if (progContainer) {
          setTimeout(() => {
            progContainer.style.display = 'none';
          }, 500);
        }
      } else if (ext === 'docx') {
        if (typeof mammoth === 'undefined') {
          throw new Error('Mammoth.js is required for DOCX support but failed to load.');
        }
        text = await extractTextFromDOCX(file);
      } else {
        throw new Error('Unsupported file format. Please upload PDF, TXT, MD, or DOCX.');
      }

      if (!text.trim()) {
        throw new Error('File appears to be empty or contains no extractable text.');
      }

      // Populate text-input
      const textarea = qs('text-input');
      textarea.value = text;
      S.text = text;

      // Render handwriting & save state
      renderText(text);
      autosave();

      statusText.textContent = '✓ File loaded successfully!';
      statusText.style.color = '#2d6a4f';
      statusText.style.fontWeight = '600';
      setTimeout(() => {
        uploadStatus.style.display = 'none';
      }, 3500);
    } catch (e) {
      statusText.textContent = `✕ Error: ${e.message}`;
      statusText.style.color = '#8b0000';
      statusText.style.fontWeight = '600';
      console.error(e);
    }
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  async function extractTextFromDOCX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        mammoth
          .extractRawText({ arrayBuffer: arrayBuffer })
          .then(function (result) {
            resolve(result.value);
          })
          .catch(function (err) {
            reject(err);
          });
      };
      reader.onerror = function (err) {
        reject(err);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  async function extractTextFromPDF(file, onProgress) {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // ponytail: respect hasEOL to preserve paragraph structure
      const pageText = content.items.map((item) => item.str + (item.hasEOL ? '\n' : '')).join('');
      fullText += pageText + '\n\n';
      if (onProgress) onProgress((i / pdf.numPages) * 100);
    }

    return fullText.trim();
  }
}

/* ───────────────────────────────────────────
   FONT & STYLE PANEL
─────────────────────────────────────────── */
function bindFontStylePanel() {
  /* PHASE 3.1/3.2 — FONT SELECTOR + PREVIEW */
  const fontSelect = qs('font-select');
  fontSelect?.addEventListener('change', () => {
    S.font = fontSelect.value;
    fontSelect.style.fontFamily = S.font;
    if (document.fonts) {
      document.fonts
        .load(`${S.fontSize}px "${S.font}"`)
        .then(() => {
          debounceRender();
        })
        .catch(() => {
          debounceRender();
        });
    } else {
      debounceRender();
    }
  });
  if (fontSelect) fontSelect.style.fontFamily = S.font;
  if (fontSelect) fontSelect.addEventListener('change', autosave);

  // A/अ auto-switch checkbox (pairs with #hinglish-toggle in the effects panel)
  qs('auto-switch-devanagari')?.addEventListener('change', onHinglishToggle);

  /* Phase 3.3 — Custom font upload */
  qs('font-upload')?.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, ' ');
    const buf = await file.arrayBuffer();
    try {
      const face = new FontFace(name, buf);
      await face.load();
      document.fonts.add(face);
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name + ' (uploaded)';
      opt.style.fontFamily = name;
      fontSelect.appendChild(opt);
      fontSelect.value = name;
      fontSelect.style.fontFamily = name;
      S.font = name;
      /* Phase 3.4 — Store font name in localStorage */
      const stored = JSON.parse(localStorage.getItem('inkflow-fonts') || '[]');
      if (!stored.includes(name)) stored.push(name);
      localStorage.setItem('inkflow-fonts', JSON.stringify(stored));
      debounceRender();
    } catch (e) {
      alert('Could not load font: ' + e.message);
    }
  });

  // Auto-fit + font sliders
  qs('btn-auto-fit')?.addEventListener('click', autoFitFontSize);
  bindSlider('font-size-slider', 'fs-val', 'fontSize', parseInt);
  bindSlider('line-spacing', 'ls-val', 'lineHeight', parseFloat);
  bindSlider('word-spacing', 'ws-val', 'wordSpacing', parseInt);
  bindSlider('margin-slider', 'mg-val', 'margin', parseInt);
  bindSlider('rotation-slider', 'rot-val', 'rotationMax', parseFloat);
  ['font-size-slider', 'line-spacing', 'word-spacing', 'margin-slider', 'rotation-slider'].forEach((id) => {
    qs(id)?.addEventListener('change', autosave);
  });

  // Text vertical alignment buttons
  document.querySelectorAll('.align-btn').forEach((btn) => {
    btn.addEventListener('click', () => setTextAlignment(btn.dataset.align));
  });

  // Cursive mode toggle
  qs('cursive-mode-toggle')?.addEventListener('change', onCursiveModeToggle);

  // Reset defaults
  qs('btn-reset-defaults')?.addEventListener('click', resetToDefaults);
}

/* ───────────────────────────────────────────
   COLLABORATION PANEL
─────────────────────────────────────────── */
function bindCollabPanel() {
  qs('btn-collab-connect')?.addEventListener('click', toggleCollaboration);
}

/* ───────────────────────────────────────────
   PAPER PANEL (paper styles + theme packs)
─────────────────────────────────────────── */
function bindPaperPanel() {
  /* PHASE 5.7 — PAPER STYLE BUTTONS */
  document.querySelectorAll('.paper-btn').forEach((btn) => {
    btn.addEventListener('click', () => setPaper(btn));
  });

  // Theme packs
  [
    ['theme-default', 'default'],
    ['theme-forest', 'forest'],
    ['theme-sunset', 'sunset'],
    ['theme-ocean', 'ocean'],
    ['theme-lavender', 'lavender'],
    ['theme-charcoal', 'charcoal'],
  ].forEach(([id, packId]) => {
    qs(id)?.addEventListener('click', () => applyThemePack(packId));
  });
}

/* ───────────────────────────────────────────
   PAGE LAYOUT PANEL
─────────────────────────────────────────── */
function bindLayoutPanel() {
  const layoutSelect = qs('layout-select');
  layoutSelect?.addEventListener('change', () => {
    S.noteLayout = layoutSelect.value;
    autosave();
    debounceRender();
  });

  const marginLabelsToggle = qs('margin-labels-toggle');
  marginLabelsToggle?.addEventListener('change', () => {
    S.showMarginLabels = marginLabelsToggle.checked;
    autosave();
    debounceRender();
  });
}

/* ───────────────────────────────────────────
   EFFECTS PANEL (ink, sliders, toggles, markdown pens)
─────────────────────────────────────────── */
function bindEffectsPanel() {
  /* Phase 5.6 — Ink color picker */
  const inkColorInput = qs('ink-color');
  inkColorInput?.addEventListener('input', () => {
    S.inkColor = inkColorInput.value;
    // Upstream v1.6.25: label names the matching preset (if any) and the
    // accent-ring active state follows the live ink color.
    const matchedBtn = Array.from(document.querySelectorAll('button[data-ink]')).find(
      (btn) => (btn.dataset.ink || '').toLowerCase() === inkColorInput.value.toLowerCase()
    );
    qs('ink-color-label').textContent =
      S.inkColor + (matchedBtn ? ' — ' + matchedBtn.dataset.inkName : '');
    updateInkPresetActive();
    debounceRender();
  });
  inkColorInput?.addEventListener('change', autosave);
  inkColorInput?.addEventListener('change', syncMarkdownPenControls);

  // Ink preset buttons (data-ink / data-ink-name carry the handler args)
  document.querySelectorAll('button[data-ink]').forEach((btn) => {
    btn.addEventListener('click', () => setInkPreset(btn.dataset.ink, btn.dataset.inkName));
  });

  bindSlider('bleed-slider', 'bleed-val', 'bleed', parseFloat);
  bindSlider('pressure-slider', 'pressure-val', 'pressure', parseFloat);
  bindSlider('realism-slider', 'realism-val', 'realism', parseFloat);
  ['bleed-slider', 'pressure-slider'].forEach((id) => {
    qs(id)?.addEventListener('change', autosave);
  });

  const rareImperfectionsToggle = qs('rare-imperfections-toggle');
  rareImperfectionsToggle?.addEventListener('change', () => {
    S.rareImperfections = rareImperfectionsToggle.checked;
    autosave();
    debounceRender();
  });

  qs('markdown-multipen-toggle')?.addEventListener('change', onMarkdownMultiPenToggle);

  const markdownPenInputMap = {
    heading: 'pen-color-heading',
    body: 'pen-color-body',
    bullet: 'pen-color-bullet',
    emphasis: 'pen-color-emphasis',
  };
  Object.keys(markdownPenInputMap).forEach((type) => {
    const el = qs(markdownPenInputMap[type]);
    if (!el) return;
    el.addEventListener('input', () => onMarkdownPenColorChange(type, el.value));
    el.addEventListener('change', autosave);
  });

  qs('hinglish-toggle')?.addEventListener('change', onHinglishToggle);

  qs('smudge-effects-toggle')?.addEventListener('change', onSmudgeEffectsToggle);
}

/* ───────────────────────────────────────────
   AI PANEL
─────────────────────────────────────────── */
function bindAIPanel() {
  qs('ai-provider')?.addEventListener('change', onProviderChange);

  // Record Lecture — audio-recorder.js owns the implementation.
  qs('btn-record-lecture')?.addEventListener('click', () => window.toggleAudioRecording?.());

  // AI actions — ai-assistant.js owns the implementation (window.AIAssistant).
  [
    ['btn-ai-doubt', 'doubt'],
    ['btn-ai-diagram', 'diagram'],
    ['btn-ai-arrange', 'arrange'],
    ['btn-ai-summarize', 'summarize'],
    ['btn-ai-grammar', 'grammar'],
    ['btn-ai-lecture', 'lecture'],
    ['btn-ai-assignment', 'assignment'],
  ].forEach(([id, action]) => {
    qs(id)?.addEventListener('click', () => window.AIAssistant?.aiAction(action));
  });
}

/* ───────────────────────────────────────────
   EXPORT PANEL
─────────────────────────────────────────── */
function bindExportPanel() {
  const pdfSizeSelect = qs('pdf-size-select');
  if (pdfSizeSelect) {
    pdfSizeSelect.value = localStorage.getItem('inkflow-pdf-size') || 'standard';
    pdfSizeSelect.addEventListener('change', () => {
      localStorage.setItem('inkflow-pdf-size', pdfSizeSelect.value);
      const preset = window.ExportRenderers?.PDF_SIZE_PRESETS?.[pdfSizeSelect.value];
      if (preset && typeof window.showExportToast === 'function') {
        window.showExportToast('PDF output size: ' + preset.label, 'info');
      }
    });
  }

  qs('btn-export-png')?.addEventListener('click', () => exportImage('png'));
  qs('btn-export-transparent')?.addEventListener('click', exportTransparentPNG);
  qs('btn-export-jpg')?.addEventListener('click', () => exportImage('jpg'));
  qs('btn-export-pdf')?.addEventListener('click', exportPDF);
  qs('btn-export-svg')?.addEventListener('click', exportSVG);
  qs('btn-export-copy')?.addEventListener('click', copyToClipboard);
  qs('btn-export-print')?.addEventListener('click', () => window.print());
}

/* ───────────────────────────────────────────
   NOTEBOOKS PANEL
─────────────────────────────────────────── */
function bindNotebooksPanel() {
  // notebooks.js owns the implementation (window.NotebooksUI; its sidebar
  // markup is rendered at runtime with its own inline handlers).
  qs('btn-save-notebook')?.addEventListener('click', () => window.NotebooksUI?.saveCurrentNotebook());
}

/* ───────────────────────────────────────────
   ANIMATION PANEL
─────────────────────────────────────────── */
function bindAnimationPanel() {
  bindSlider('speed-slider', 'spd-val', 'animSpeed', parseInt);
  qs('speed-slider')?.addEventListener('change', autosave);
  qs('btn-anim-start')?.addEventListener('click', startAnimation);
  qs('btn-anim-stop')?.addEventListener('click', stopAnimation);
}

/* ───────────────────────────────────────────
   PAGE NAVIGATION BAR
─────────────────────────────────────────── */
function bindPageNav() {
  qs('nav-prev')?.addEventListener('click', () => navigatePage(-1));
  qs('nav-next')?.addEventListener('click', () => navigatePage(1));
}

/* ───────────────────────────────────────────
   MODALS (grammar + flashcards; app-wide ESC/trap live in bindAppShell)
─────────────────────────────────────────── */
function bindModals() {
  qs('btn-close-grammar')?.addEventListener('click', closeGrammarModal);
  qs('btn-grammar-cancel')?.addEventListener('click', closeGrammarModal);
  qs('btn-grammar-accept')?.addEventListener('click', () => window.AIAssistant?.acceptGrammarCorrection());

  // Flashcards — flashcards.js owns the implementation (window.Flashcards).
  qs('btn-close-flashcards')?.addEventListener('click', () => window.Flashcards?.closeFlashcardsModal());
  qs('flashcard-card')?.addEventListener('click', () => window.Flashcards?.flipFlashcard());
  qs('btn-flashcard-prev')?.addEventListener('click', () => window.Flashcards?.prevFlashcard());
  qs('btn-flashcard-next')?.addEventListener('click', () => window.Flashcards?.nextFlashcard());
}

/* ───────────────────────────────────────────
   HANDFONTED STUDIO MODAL
   (btn-handfonted-studio open, sketch undo/brush/clear are bound inside
   initHandFontedStudio() — they need the sketchpad closure state.)
─────────────────────────────────────────── */
function bindHandFontedStudio() {
  qs('btn-close-handfonted')?.addEventListener('click', closeHandFontedModal);
  qs('tab-btn-sketchpad')?.addEventListener('click', () => switchFontTab('sketchpad'));
  qs('tab-btn-template')?.addEventListener('click', () => switchFontTab('template'));
  qs('sheet-tab-letters')?.addEventListener('click', () => switchSheet('letters'));
  qs('sheet-tab-symbols')?.addEventListener('click', () => switchSheet('symbols'));
  qs('btn-save-char')?.addEventListener('click', saveActiveCharacter);
  qs('btn-next-char')?.addEventListener('click', advanceActiveCharacter);
  qs('btn-export-font-project')?.addEventListener('click', exportFontProject);
  qs('btn-load-font-project')?.addEventListener('click', () => qs('import-font-project')?.click());
  qs('import-font-project')?.addEventListener('change', (e) => importFontProject(e));
  qs('btn-download-template')?.addEventListener('click', generateDownloadTemplate);
  ['slider-grid-x', 'slider-grid-y', 'slider-grid-w', 'slider-grid-h'].forEach((id) => {
    qs(id)?.addEventListener('input', updateAlignerGrid);
  });
  qs('btn-build-font')?.addEventListener('click', buildCustomFont);
  qs('btn-export-ttf')?.addEventListener('click', exportCustomFontTTF);
}

/* ───────────────────────────────────────────
   ENTRY — called by index.js where the old scattered bindings ran.
   (The Layer Manager section binds itself via layer-panel.js bindLayerPanel(),
   which index.js calls alongside this.)
─────────────────────────────────────────── */
export function bindAllUI() {
  bindSectionHeaders();
  bindToolbar();
  bindAppShell();
  bindTextPanel();
  bindFontStylePanel();
  bindCollabPanel();
  bindPaperPanel();
  bindLayoutPanel();
  bindEffectsPanel();
  bindAIPanel();
  bindExportPanel();
  bindNotebooksPanel();
  bindAnimationPanel();
  bindPageNav();
  bindModals();
  bindHandFontedStudio();
}
