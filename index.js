/**
 * A3 ES-module conversion (docs/upgrade-plan.md Phase A): index.js is now the
 * single module entry. Imports are listed in the app's classic script load order;
 * library modules keep their window.* namespaces, and shared state is exported
 * here as live bindings for the modules that read it at call time.
 */
import * as DiagramEngine from './diagram-engine.js';

import { S, pages, PAGE_W, PAGE_H, cursiveConnector, draftedGlyphs, fontSwitcher, currentPrediction, setCurrentPrediction } from './state.js';
import { CursiveConnector } from './cursive-connector.js';
import './audio-recorder.js';
import { ScriptDetector } from './script-detector.js';
import { CollaborativeEngine } from './collaborative-engine.js';
import { StrokePredictionEngine } from './stroke-prediction-engine.js';
import { initLayerCompositor } from './layer-compositor.js';
import './template-manager.js';
import './font-compilation.js';
import { initHandFontedStudio, ALL_TEMPLATE_CHARS } from './handfonted-studio.js';
import './paper-renderer.js';
import './text-layout.js';
import './ai-postprocess.js';
import './ai-assistant.js';
import './notebooks.js';
import './margin-labels.js';
import './flashcards.js';
import './voice-notes.js';
// App-owned modules last (B1/B2 extractions). persistence.js has no top-level
// side effects, so evaluation order is unchanged; its restoreState() only runs
// from initApp() below, after the WINDOW BRIDGE has published its lazy reads.
import { autosave, restoreState } from './persistence.js';
// Layout engine + shape painters (M2 pass): pure function modules with no
// top-level side effects, so evaluating them after the library imports above
// keeps the classic load order intact.
import { layoutText, drawMarginQuestionLabels } from './layout-engine.js';
// Render pipeline + page DOM management (M2 completion): the canvas pipeline,
// page creation, and page navigation live here now.
import {
  renderText, debounceRender, triggerRender, startAnimation, stopAnimation,
  createPage, updateEditorStyles, clearPages, navigatePage, getGlobalTextFromEditors,
} from './render-pipeline.js';
// Sidebar control sync (M2 completion): persistence.js imports these directly.
import { updateInkPresetActive, syncMarkdownPenControls, syncHinglishControls } from './settings-sync.js';
// UI binders last (Phase B4): ui-bindings.js imports handler functions from
// this module, so its evaluation (and the modules it pulls in) must happen
// after the library imports above — keeps the classic load order intact.
import { updateLayerUI, maybeUpdateLayerUI, bindLayerPanel } from './layer-panel.js';
import { bindAllUI } from './ui-bindings.js';
import { showExportToast } from './export-manager.js';
import { initI18n } from './i18n.js';

// Shared state lives in state.js now; this module imports the same live bindings.

// Sibling modules (ai-assistant.js, notebooks.js, flashcards.js, voice-notes.js)
// read shared state through window.S — a top-level `const` alone does not expose it.

let predictionEngine = null;
if (typeof StrokePredictionEngine !== 'undefined') {
  predictionEngine = new StrokePredictionEngine();
  predictionEngine.initialize();
}

/* Initialize Mermaid for diagrams */
if (typeof mermaid !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      primaryColor: '#ffffff',
      primaryTextColor: '#1c2340',
      primaryBorderColor: '#1c2340',
      lineColor: '#1c2340',
      secondaryColor: '#f8f4ea',
      tertiaryColor: '#f8f4ea',
    },
  });
}

// HandFonted Studio state (TEMPLATE_SHEETS, aligner images, grid config) and
// draftedGlyphs moved to handfonted-studio.js / state.js (upgrade plan Phase B1).


// Task 16: Initialize Layer Compositor
if (typeof initLayerCompositor === 'function') {
  initLayerCompositor(PAGE_W, PAGE_H);
}

/* ───────────────────────────────────────────
   PHASE 1.4/2.6 dark-mode toggle, PHASE 2.7 hamburger/sidebar collapse and
   PHASE 2.3 sidebar section toggle moved to ui-bindings.js (bindToolbar /
   bindAppShell / bindSectionHeaders — Phase B4).
─────────────────────────────────────────── */

/* ───────────────────────────────────────────
   PHASE 3.1/3.2 — FONT SELECTOR + PREVIEW bindings, Phase 3.3 font upload,
   layout/pdf-size selects → ui-bindings.js binders (Phase B4).
─────────────────────────────────────────── */

// Initialize notebooks sidebar on load
if (window.NotebooksUI) {
  setTimeout(() => window.NotebooksUI.renderNotebooksSidebar(), 500);
}

if (document.fonts) {
  document.fonts.ready.then(() => {
    debounceRender();
  });
}

// Phase 3.3 font-upload binding moved to ui-bindings.js bindFontStylePanel.

/* ───────────────────────────────────────────
   PHASE 3.5 — AUTO-FIT FONT SIZE
─────────────────────────────────────────── */
export function autoFitFontSize() {
  const text = S.text.trim();
  if (!text) return;

  const originalFontSize = S.fontSize;
  let min = 14;
  let max = 52;
  let bestSize = min;

  try {
    for (let i = 0; i < 6; i++) {
      const mid = Math.floor((min + max) / 2);
      S.fontSize = mid;
      const { pageCount } = layoutText(text, currentPrediction);

      if (pageCount > 1) {
        max = mid;
      } else {
        bestSize = mid;
        min = mid;
      }
    }
  } catch (e) {
    S.fontSize = originalFontSize;
    return;
  }

  S.fontSize = bestSize;

  // Sync UI
  const slider = document.getElementById('font-size-slider');
  if (slider) slider.value = S.fontSize;
  const disp = document.getElementById('fs-val');
  if (disp) disp.textContent = S.fontSize;

  debounceRender();
  autosave();
}

/* ───────────────────────────────────────────
   PHASE 5.1–5.6 — SLIDER CONTROLS bindings moved to ui-bindings.js
   (bindFontStylePanel / bindEffectsPanel / bindAnimationPanel — Phase B4).
─────────────────────────────────────────── */

// Upstream v1.6.25: centralises preset button active-state management —
// highlights the button whose data-ink matches the live S.inkColor.

export function setInkPreset(hex, name) {
  S.inkColor = hex;
  document.getElementById('ink-color').value = hex.toLowerCase();
  document.getElementById('ink-color-label').textContent = hex + ' — ' + name;
  updateInkPresetActive();
  syncMarkdownPenControls();
  debounceRender();
}



// markdown-pen / hinglish / margin-labels / rare-imperfections control
// bindings moved to ui-bindings.js (bindEffectsPanel / bindLayoutPanel — B4).

/* ───────────────────────────────────────────
   PHASE 2.2 — SMUDGE EFFECTS TOGGLE binding → ui-bindings.js bindEffectsPanel.
   PHASE 3.1 — CURSIVE MODE TOGGLE binding → ui-bindings.js bindFontStylePanel.
─────────────────────────────────────────── */

/* ───────────────────────────────────────────
   PHASE 5.7 — PAPER STYLE BUTTONS
─────────────────────────────────────────── */
// Fonts permitted in the crisp 'clean' paper style (upstream v1.4.0):
// clean/non-handwriting + Devanagari set. Other fonts auto-switch to Kalam.
const CLEAN_FONTS = [
  'Kalam',
  'Roboto',
  'Arial',
  'Delius',
  'Noto Sans Devanagari',
  'Noto Serif Devanagari',
  'Hind',
  'Tiro Devanagari Hindi',
  'Baloo 2',
  'Martel',
];

export function setPaper(btn) {
  document.querySelectorAll('.paper-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  S.paperStyle = btn.dataset.style;
  if (S.paperStyle === 'clean' && !CLEAN_FONTS.includes(S.font)) {
    S.font = 'Kalam';
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) fontSelect.value = S.font;
  }
  autosave();
  debounceRender();
}

/* ───────────────────────────────────────────
   TEXT VERTICAL ALIGNMENT CONTROL
─────────────────────────────────────────── */
export function setTextAlignment(alignment) {
  S.textAlignment = alignment;

  // Update UI
  document.querySelectorAll('.align-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  document.querySelector(`.align-btn[data-align="${alignment}"]`).classList.add('active');

  // Update label
  const labels = { top: 'Upper', middle: 'Middle', bottom: 'Lower' };
  document.getElementById('align-val').textContent = labels[alignment] || 'Middle';

  // Re-render with new alignment
  debounceRender();
}

/* ───────────────────────────────────────────
   PHASE 4.1 — CREATE CANVAS PAGE
─────────────────────────────────────────── */
// Responsive CSS display width so the canvas never overflows narrow phones
// (the JS coordinate system stays PAGE_W×PAGE_H; only the CSS display scales).







export function clearText() {
  document.getElementById('text-input').value = '';
  S.text = '';
  clearPages();
  const canvas = createPage(1);
  window.PaperRenderer.drawPaperBackground(canvas.getContext('2d'), S.paperStyle);
  const editor = document.getElementById('editor-1');
  if (editor) {
    editor.innerText = '';
    updateEditorStyles(editor, canvas);
  }
  autosave();
}


// ponytail: alias for extracted text-layout.js module (layout-engine.js owns the rest)
const sanitizeText = (str) => window.TextLayout.sanitizeText(str);

// Glyph image cache (glyphImageCache / getCachedGlyphImage) moved to state.js
// (Phase B1) — drafted glyphs are shared live state with handfonted-studio.js.



function onTextInputChange() {
  if (!predictionEngine) return;
  const textarea = document.getElementById('text-input');
  if (!textarea) return;

  const text = textarea.value;
  const cursor = textarea.selectionStart;

  // Only predict if the cursor is at the very end of the text
  if (cursor === text.length) {
    const preds = predictionEngine.predict(text, 1);
    setCurrentPrediction(preds[0] || '');
  } else {
    setCurrentPrediction('');
  }
}

const textInputEl = document.getElementById('text-input');
if (textInputEl) {
  textInputEl.addEventListener('input', function () {
    S.text = this.value;
    onTextInputChange();
    debounceRender();
    autosave();
  });

  textInputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' && typeof currentPrediction !== 'undefined' && currentPrediction) {
      e.preventDefault();

      const start = this.selectionStart;
      const end = this.selectionEnd;
      const originalValue = this.value;

      // Accept prediction
      this.value = originalValue.slice(0, start) + currentPrediction + originalValue.slice(end);
      this.selectionStart = this.selectionEnd = start + currentPrediction.length;

      S.text = this.value;
      setCurrentPrediction('');

      onTextInputChange();

      // Notify collaboration server if connected
      if (collabEngine && collabEngine.isConnected()) {
        const event = new Event('input', { bubbles: true });
        this.dispatchEvent(event);
      } else {
        debounceRender();
        autosave();
      }
    }
  });

  textInputEl.addEventListener('keyup', function (e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      onTextInputChange();
      debounceRender();
    }
  });

  textInputEl.addEventListener('click', function () {
    onTextInputChange();
    debounceRender();
  });
}



/* ───────────────────────────────────────────
   TASK 13 — COLLABORATIVE WRITING ENGINE
─────────────────────────────────────────── */
let collabEngine = null;
const COLLAB_SERVER_URL = 'ws://localhost:8080';

// Assign a short friendly name per session (random adjective + noun)
function _collabGenerateName() {
  const adj = ['Swift', 'Calm', 'Bold', 'Keen', 'Warm', 'Wise', 'Bright', 'Sharp'];
  const noun = ['Pen', 'Ink', 'Page', 'Quill', 'Note', 'Leaf', 'Scroll', 'Draft'];
  return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)];
}

const _collabLocalName = _collabGenerateName();

export function toggleCollaboration() {
  const btn = document.getElementById('btn-collab-connect');

  if (collabEngine && collabEngine.isConnected()) {
    // Disconnect
    collabEngine.disconnect();
    collabEngine = null;
    btn.textContent = 'Connect to Session';
    document.getElementById('collab-users-container').classList.add('hidden');
    return;
  }

  // Create and initialize engine
  const textarea = document.getElementById('text-input');

  collabEngine = new CollaborativeEngine({
    textarea,
    onTextChange(newText) {
      textarea.value = newText;
      S.text = newText;
      if (typeof onTextInputChange === 'function') {
        onTextInputChange();
      }
      debounceRender();
    },
    onUsersChange(users) {
      const list = document.getElementById('collab-users-list');
      const container = document.getElementById('collab-users-container');
      list.innerHTML = '';

      // Add self
      const selfItem = document.createElement('li');
      selfItem.className = 'user-item';
      selfItem.innerHTML = `<span class="user-color-dot" style="background:${collabEngine.color || '#aaa'}"></span> ${_collabLocalName} (you)`;
      list.appendChild(selfItem);

      // Add remote users
      for (const u of users) {
        const li = document.createElement('li');
        li.className = 'user-item';
        li.dataset.userId = u.userId;
        li.innerHTML = `<span class="user-color-dot" style="background:${u.color}"></span> ${u.userId.slice(0, 12)}`;
        list.appendChild(li);
      }

      if (users.length > 0) {
        container.classList.remove('hidden');
      }
    },
    onStatusChange(text, isOnline) {
      const indicator = document.getElementById('collab-status-indicator');
      const statusText = document.getElementById('collab-status-text');
      const btn = document.getElementById('btn-collab-connect');

      statusText.textContent = text;
      indicator.className =
        'status-indicator ' + (isOnline ? 'online' : text === 'Connection error' ? 'error' : 'offline');

      if (isOnline) {
        btn.textContent = 'Disconnect';
        document.getElementById('collab-users-container').classList.remove('hidden');
      } else if (text !== 'Connecting…') {
        btn.textContent = 'Connect to Session';
      }
    },
  });

  collabEngine.initialize();
  collabEngine.connect(COLLAB_SERVER_URL);
  btn.textContent = 'Connecting…';
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
  }, 2000);
}

/**
 * PHASE 6.0 — DIAGRAM TEMPLATES
 */

/* Diagram template dropdown menu open state — the click-toggle, outside-click
   and Escape wiring lives in ui-bindings.js bindTextPanel (Phase B4); the
   menu-state helper stays here because insertDiagramTemplate() closes the menu
   after inserting, and the binder imports it. */
export function setDiagramMenuOpen(open) {
  const diagramDropdown = document.querySelector('.action-buttons-row .dropdown');
  if (!diagramDropdown) return;
  diagramDropdown.classList.toggle('open', open);
  diagramDropdown.closest('.sb-section')?.classList.toggle('dropdown-open', open);
  diagramDropdown.querySelector('button')?.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function insertDiagramTemplate(type) {
  setDiagramMenuOpen(false);
  const textarea = document.getElementById('text-input');
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = textarea.value;

  const templates = {
    cycle:
      '\n```diagram\n{\n  "type": "cycle",\n  "nodes": [\n    { "id": "n1", "label": "Start" },\n    { "id": "n2", "label": "Develop" },\n    { "id": "n3", "label": "Review" },\n    { "id": "n4", "label": "Ship" }\n  ],\n  "edges": [\n    { "from": "n1", "to": "n2" },\n    { "from": "n2", "to": "n3" },\n    { "from": "n3", "to": "n4" },\n    { "from": "n4", "to": "n1" }\n  ]\n}\n```\n',
    flowchart:
      '\n```diagram\n{\n  "type": "flowchart",\n  "nodes": [\n    { "id": "s1", "label": "Input", "shape": "box" },\n    { "id": "s2", "label": "Verify?", "shape": "diamond" },\n    { "id": "s3", "label": "Success", "shape": "box" },\n    { "id": "s4", "label": "Retry", "shape": "box" }\n  ],\n  "edges": [\n    { "from": "s1", "to": "s2" },\n    { "from": "s2", "to": "s3", "label": "Yes" },\n    { "from": "s2", "to": "s4", "label": "No" }\n  ]\n}\n```\n',
    hierarchy:
      '\n```diagram\n{\n  "type": "hierarchy",\n  "nodes": [\n    { "id": "ceo", "label": "CEO", "shape": "rounded" },\n    { "id": "eng", "label": "Engineering", "shape": "box" },\n    { "id": "design", "label": "Design", "shape": "box" },\n    { "id": "mkt", "label": "Marketing", "shape": "box" },\n    { "id": "fe", "label": "Frontend", "shape": "pill" },\n    { "id": "be", "label": "Backend", "shape": "pill" }\n  ],\n  "edges": [\n    { "from": "ceo", "to": "eng" },\n    { "from": "ceo", "to": "design" },\n    { "from": "ceo", "to": "mkt" },\n    { "from": "eng", "to": "fe" },\n    { "from": "eng", "to": "be" }\n  ]\n}\n```\n',
    pyramid:
      '\n```diagram\n{\n  "type": "pyramid",\n  "nodes": [\n    { "id": "t", "label": "Vision", "shape": "diamond" },\n    { "id": "m", "label": "Strategy", "shape": "box" },\n    { "id": "b", "label": "Execution", "shape": "hexagon" }\n  ],\n  "edges": [\n    { "from": "t", "to": "m" },\n    { "from": "m", "to": "b" }\n  ]\n}\n```\n',
    pipeline:
      '\n```diagram\n{\n  "type": "flowchart",\n  "nodes": [\n    { "id": "p1", "label": "Plan", "shape": "rounded" },\n    { "id": "p2", "label": "Build", "shape": "box" },\n    { "id": "p3", "label": "Test", "shape": "hexagon" },\n    { "id": "p4", "label": "Deploy", "shape": "pill" }\n  ],\n  "edges": [\n    { "from": "p1", "to": "p2" },\n    { "from": "p2", "to": "p3" },\n    { "from": "p3", "to": "p4" }\n  ]\n}\n```\n',
    mermaid:
      '\n```mermaid\ngraph TD\n  A[Idea] --> B(Writing)\n  B --> C{Good?}\n  C -->|Yes| D[Publish]\n  C -->|No| B\n```\n',
  };

  const template = templates[type] || templates.flowchart;
  textarea.value = current.substring(0, start) + template + current.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + template.length;

  S.text = textarea.value;
  debounceRender();
}



/* ───────────────────────────────────────────
   PHASE 7.2 — MULTI-PROVIDER AI ENGINE
   Supports: OpenRouter (100+ models) & Anthropic Direct
─────────────────────────────────────────── */

const AI_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', name: '⚡ Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', name: '⚡ Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.5-pro', name: '🔥 Gemini 2.5 Pro' },
    { id: 'gemini-2.0-flash', name: '⚡ Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: '⚡ Gemini 2.0 Flash Lite' },
  ],
  openrouter: [
    // ── Google ──
    { id: 'google/gemini-2.5-flash-preview', name: '⚡ Gemini 2.5 Flash (Free)' },
    { id: 'google/gemini-2.5-pro-preview', name: '🔥 Gemini 2.5 Pro' },
    { id: 'google/gemini-2.0-flash-001', name: '⚡ Gemini 2.0 Flash (Free)' },
    // ── Anthropic ──
    { id: 'anthropic/claude-sonnet-4', name: '🟣 Claude Sonnet 4' },
    { id: 'anthropic/claude-3.5-sonnet', name: '🟣 Claude 3.5 Sonnet' },
    { id: 'anthropic/claude-3-haiku', name: '🟣 Claude 3 Haiku (Fast)' },
    // ── OpenAI ──
    { id: 'openai/gpt-4.1', name: '🟢 GPT-4.1' },
    { id: 'openai/gpt-4.1-mini', name: '🟢 GPT-4.1 Mini' },
    { id: 'openai/gpt-4.1-nano', name: '🟢 GPT-4.1 Nano' },
    { id: 'openai/gpt-4o', name: '🟢 GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: '🟢 GPT-4o Mini' },
    { id: 'openai/o3-mini', name: '🟢 o3-Mini (Reasoning)' },
    // ── Meta ──
    { id: 'meta-llama/llama-4-maverick', name: '🦙 Llama 4 Maverick' },
    { id: 'meta-llama/llama-4-scout', name: '🦙 Llama 4 Scout' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: '🦙 Llama 3.3 70B (Free)' },
    // ── DeepSeek ──
    { id: 'deepseek/deepseek-chat-v3-0324', name: '🌊 DeepSeek V3' },
    { id: 'deepseek/deepseek-r1', name: '🌊 DeepSeek R1 (Reasoning)' },
    // ── Mistral ──
    { id: 'mistralai/mistral-large-2411', name: '🔷 Mistral Large' },
    { id: 'mistralai/mistral-small-2503', name: '🔷 Mistral Small' },
    { id: 'mistralai/codestral-mamba', name: '🔷 Codestral Mamba' },
    // ── Qwen ──
    { id: 'qwen/qwen-2.5-72b-instruct', name: '🟠 Qwen 2.5 72B' },
    { id: 'qwen/qwen3-235b-a22b', name: '🟠 Qwen 3 235B' },
    // ── xAI ──
    { id: 'x-ai/grok-3-mini-beta', name: '✖ Grok 3 Mini' },
    // ── Others ──
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: '🟩 Nemotron 70B (Free)' },
    { id: 'microsoft/phi-4', name: '🪟 Phi-4 (Free)' },
    { id: 'cohere/command-a', name: '🔴 Command A' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (Latest)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Budget)' },
  ],
  ollama: [
    { id: 'llama3.2', name: '🦙 Llama 3.2' },
    { id: 'mistral', name: '🔷 Mistral' },
    { id: 'phi4', name: '🪟 Phi-4' },
    { id: 'gemma2', name: '💎 Gemma 2' },
    { id: 'qwen2.5', name: '🟠 Qwen 2.5' },
    { id: 'deepseek-r1', name: '🌊 DeepSeek R1' },
    { id: 'codellama', name: '🦙 CodeLlama' },
  ],
};

let openRouterModelsLoaded = false;
let isFetchingOpenRouterModels = false;

async function fetchOpenRouterModels() {
  if (openRouterModelsLoaded || isFetchingOpenRouterModels) return;
  isFetchingOpenRouterModels = true;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    if (!res.ok) throw new Error('HTTP status ' + res.status);
    const data = await res.json();
    if (data && Array.isArray(data.data)) {
      const fetched = data.data.map((item) => {
        let emoji = '🤖 ';
        const id = item.id.toLowerCase();

        if (id.startsWith('google/')) emoji = '⚡ ';
        else if (id.startsWith('anthropic/')) emoji = '🟣 ';
        else if (id.startsWith('openai/')) emoji = '🟢 ';
        else if (id.startsWith('meta-llama/')) emoji = '🦙 ';
        else if (id.startsWith('deepseek/')) emoji = '🌊 ';
        else if (id.startsWith('mistralai/')) emoji = '🔷 ';
        else if (id.startsWith('qwen/')) emoji = '🟠 ';
        else if (id.startsWith('x-ai/')) emoji = '✖ ';
        else if (id.startsWith('cohere/')) emoji = '🔴 ';
        else if (id.startsWith('nvidia/')) emoji = '🟩 ';
        else if (id.startsWith('microsoft/')) emoji = '🪟 ';

        const isFree =
          item.pricing && parseFloat(item.pricing.prompt) === 0 && parseFloat(item.pricing.completion) === 0;
        let displayName = item.name || item.id;

        // Strip out redundant provider prefixes to keep UI compact
        displayName = displayName.replace(
          /^(google|anthropic|openai|meta|deepseek|mistral|qwen|x-ai|cohere|nvidia|microsoft|llama):\s*/i,
          ''
        );

        let name = `${emoji}${displayName}`;
        if (isFree) {
          name += ' (Free)';
        }

        return {
          id: item.id,
          name: name,
          isFree: isFree,
        };
      });

      // Sort free models first, then alphabetically
      fetched.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.name.localeCompare(b.name);
      });

      if (fetched.length > 0) {
        AI_MODELS.openrouter = fetched;
        openRouterModelsLoaded = true;

        // Refresh UI if currently viewing OpenRouter
        const provider = document.getElementById('ai-provider').value;
        if (provider === 'openrouter') {
          onProviderChange();
        }
      }
    }
  } catch (e) {
    console.warn('Could not auto-fetch OpenRouter models, using fallback list:', e);
  } finally {
    isFetchingOpenRouterModels = false;
  }
}

export function onProviderChange() {
  const provider = document.getElementById('ai-provider').value;
  const modelSelect = document.getElementById('ai-model');
  const keyLabel = document.getElementById('api-key-label');
  const keyInput = document.getElementById('api-key');

  // Update model dropdown
  modelSelect.innerHTML = '';
  AI_MODELS[provider].forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
  });

  // Update key label and placeholder
  if (provider === 'ollama') {
    keyLabel.textContent = 'No API key needed (local)';
    keyInput.placeholder = 'Ollama runs locally — no key required';
    keyInput.disabled = true;
    keyInput.value = '';
    keyLabel.style.display = 'none';
    keyInput.style.display = 'none';
    document.getElementById('remember-api-key')?.closest('label')?.style.setProperty('display', 'none');
  } else {
    keyLabel.style.display = '';
    keyInput.style.display = '';
    keyInput.disabled = false;
    document.getElementById('remember-api-key')?.closest('label')?.style.setProperty('display', '');
    if (provider === 'openrouter') {
      keyLabel.textContent = 'OpenRouter API Key';
      keyInput.placeholder = 'sk-or-v1-…';
      // Async fetch up-to-date models automatically from openrouter
      fetchOpenRouterModels();
    } else if (provider === 'gemini') {
      keyLabel.textContent = 'Google AI Studio API Key';
      keyInput.placeholder = 'AIza…';
    } else {
      keyLabel.textContent = 'Anthropic API Key';
      keyInput.placeholder = 'sk-ant-api…';
    }
  }
}

// Initialize model dropdown and start auto-fetching on load
onProviderChange();
fetchOpenRouterModels();
window.AIAssistant.initApiKeyPersistence();

/* -- AI ASSISTANT — delegated to ai-assistant.js --------------------------
   The AI panel buttons in ui-bindings.js call window.AIAssistant directly;
   the old index.js wrapper constants (callClaude/setAiStatus/aiAction/
   GrammarCorrector/acceptGrammarCorrection) are gone. */

// Export pipelines moved to export-manager.js (loaded before index.js);
// its top-level functions (exportImage, exportPDF, showExportToast, …) are globals.

/* ───────────────────────────────────────────
   PHASE 8.6–8.7 — AUTOSAVE & STATE RESTORE
   (moved to persistence.js — Phase B2. index.js imports autosave/restoreState
   from there and every call site below keeps working through that import;
   the WINDOW BRIDGE at the end of this file still publishes autosave for the
   lazy window.* readers in ai-assistant/notebooks/voice-notes/handfonted-studio,
   plus updateInkPresetActive/syncMarkdownPenControls/syncHinglishControls/
   ALL_TEMPLATE_CHARS which persistence.js's restoreState reads back lazily.
   resetToDefaults() below stays here — it is UI wiring that happens to call
   the imported autosave() before re-rendering.)
─────────────────────────────────────────── */

/* ───────────────────────────────────────────
   PHASE 8.8 — PAGE NAVIGATION
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


/* ───────────────────────────────────────────
   PHASE 8.7 + INIT — APP BOOT
─────────────────────────────────────────── */
async function initApp() {
  await restoreState();
  updateInkPresetActive(); // upstream v1.6.25: ring reflects the restored/default ink color on load
  initHandFontedStudio();

  // Initialize smudge effects toggle
  const smudgeToggle = document.getElementById('smudge-effects-toggle');
  if (smudgeToggle) {
    smudgeToggle.checked = S.smudgeEffects;
  }
  syncMarkdownPenControls();
  syncHinglishControls();

  // Render initial state or blank page
  if (S.text) {
    renderText(S.text);
  } else {
    // Show a blank ruled page with placeholder watermark
    const canvas = createPage(1);
    // If layer compositor is active, draw on background layer; else draw on canvas directly
    let bgCtx;
    if (window.layerCompositor) {
      const bgStack = window.layerCompositor.getStack(0);
      const bgLayer = bgStack.layers.find((l) => l.name === 'Background');
      bgCtx = bgLayer ? bgLayer.canvas.getContext('2d') : canvas.getContext('2d');
    } else {
      bgCtx = canvas.getContext('2d');
    }
    window.PaperRenderer.drawPaperBackground(bgCtx, S.paperStyle);
    window.PaperRenderer.renderSmudgeEffects(bgCtx, 0);
    // Subtle placeholder text
    bgCtx.save();
    const lineH = S.fontSize * S.lineHeight;
    bgCtx.font = `italic 18px "${S.font}"`;
    bgCtx.fillStyle = S.inkColor;
    bgCtx.globalAlpha = 0.18;
    bgCtx.fillText('Start typing in the panel to the left…', S.margin, S.margin + S.fontSize + lineH);
    bgCtx.restore();
    // If we used a layer canvas, composite now; otherwise content is already on the main canvas
    if (window.layerCompositor && bgCtx !== canvas.getContext('2d')) {
      window.layerCompositor.composite(0, canvas.getContext('2d'));
    }
  }
}

// Boot — bind every panel first (where the old scattered top-level bindings
// and bindUIActions ran), then restore state and render.
bindAllUI();
bindLayerPanel();
initI18n(); // Phase F6: apply the persisted UI language before first render

/* Global error surface (upgrade plan C4): users had no way to know a failure
   happened — uncaught errors and rejected promises now surface as an error
   toast. Rate-limited so a repeating error can't spam the UI. */
let lastErrorToastAt = 0;
function reportGlobalError(message) {
  const now = Date.now();
  if (now - lastErrorToastAt < 3000) return;
  lastErrorToastAt = now;
  showExportToast('Something went wrong: ' + message, 'error');
  console.error('[Inkflow]', message);
}
window.addEventListener('error', (e) => {
  if (e.message) reportGlobalError(e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason?.message || String(e.reason || 'Unknown promise rejection');
  reportGlobalError(reason);
});

initApp();

/* ───────────────────────────────────────────
   RESET PARAMETERS TO DEFAULTS
─────────────────────────────────────────── */
export function resetToDefaults() {
  const defaults = {
    font: 'Caveat',
    fontSize: 22,
    lineHeight: 1.5,
    wordSpacing: 1,
    margin: 80,
    rotationMax: 1,
    inkColor: '#1c2340',
    bleed: 0.5,
    pressure: 0.12,
    paperStyle: 'ruled',
    textAlignment: 'middle',
    showMarginLabels: true,
    realism: 0.5,
    rareImperfections: false,
  };

  // Apply state
  Object.keys(defaults).forEach((key) => {
    S[key] = defaults[key];
  });

  // Update DOM sliders & labels
  const sliderMap = [
    ['font-size-slider', 'fs-val', 'fontSize'],
    ['line-spacing', 'ls-val', 'lineHeight'],
    ['word-spacing', 'ws-val', 'wordSpacing'],
    ['margin-slider', 'mg-val', 'margin'],
    ['rotation-slider', 'rot-val', 'rotationMax'],
    ['bleed-slider', 'bleed-val', 'bleed'],
    ['pressure-slider', 'pressure-val', 'pressure'],
    ['realism-slider', 'realism-val', 'realism'],
  ];

  sliderMap.forEach(([id, valId, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = defaults[key];
    const disp = document.getElementById(valId);
    if (disp) disp.textContent = defaults[key];
  });

  // Update Font Selector
  const fontSelect = document.getElementById('font-select');
  if (fontSelect) {
    fontSelect.value = defaults.font;
    fontSelect.style.fontFamily = defaults.font;
  }

  // Update Ink Color Picker
  const inkColorInput = document.getElementById('ink-color');
  if (inkColorInput) {
    inkColorInput.value = defaults.inkColor;
    document.getElementById('ink-color-label').textContent = defaults.inkColor + ' — Navy';
    updateInkPresetActive();
  }

  // Update Text Alignment
  document.querySelectorAll('.align-btn').forEach((btn) => {
    btn.classList.remove('active');
  });
  const alignBtn = document.querySelector(`.align-btn[data-align="${defaults.textAlignment}"]`);
  if (alignBtn) alignBtn.classList.add('active');
  const alignVal = document.getElementById('align-val');
  if (alignVal) alignVal.textContent = 'Middle';

  // Update Paper styles active classes
  document.querySelectorAll('.paper-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.style === defaults.paperStyle);
  });

  // Sync the margin labels checkbox
  const marginLabelsToggle = document.getElementById('margin-labels-toggle');
  if (marginLabelsToggle) marginLabelsToggle.checked = defaults.showMarginLabels;

  // Sync the rare imperfections checkbox
  const rareToggle = document.getElementById('rare-imperfections-toggle');
  if (rareToggle) rareToggle.checked = defaults.rareImperfections;

  // Save & Render
  autosave();
  debounceRender();
}

// Generic modal helpers (ESC closes active modal, focus trap keeps Tab inside)
// moved to ui-bindings.js bindAppShell (Phase B4).

// PHASE 16 Layer Manager UI extracted to layer-panel.js (Phase B3).

/* ── Theme Packs ────────────────────────────────────────────────────────── */

const THEME_PACKS = {
  default: { name: 'Default', accent: '#6C63FF', paper: '#f7f3ea', ink: '#1c2340' },
  forest: { name: 'Forest', accent: '#2e7d32', paper: '#f1f8e9', ink: '#1b5e20' },
  sunset: { name: 'Sunset', accent: '#e65100', paper: '#fff3e0', ink: '#bf360c' },
  ocean: { name: 'Ocean', accent: '#0277bd', paper: '#e1f5fe', ink: '#01579b' },
  lavender: { name: 'Lavender', accent: '#7b1fa2', paper: '#f3e5f5', ink: '#4a148c' },
  charcoal: { name: 'Charcoal', accent: '#546e7a', paper: '#eceff1', ink: '#263238' },
};

export function applyThemePack(packId) {
  const pack = THEME_PACKS[packId];
  if (!pack) return;
  document.documentElement.style.setProperty('--accent', pack.accent);
  document.documentElement.style.setProperty('--paper-color', pack.paper);
  document.documentElement.style.setProperty('--ink-color', pack.ink);
  S.paperColor = pack.paper;
  S.inkColor = pack.ink;
  S.accentColor = pack.accent;
  autosave();
  debounceRender();
}

/* The window bridge is fully retired (M2 completion): every module imports
   what it needs. window.S is no longer published — use the module graph. */
/* Service worker: production only. In dev, Vite serves CSS as HMR modules which
   the SW's cache-first handler would precache verbatim (unstyled dev sessions) —
   import.meta.env.DEV is statically replaced at build time. */
if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}