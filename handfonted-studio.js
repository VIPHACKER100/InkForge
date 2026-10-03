/**
 * handfonted-studio.js — HandFonted Studio custom font builder
 * (upgrade plan Phase B1: extracted from index.js).
 *
 * Owns the studio modal: live sketchpad mechanics, character grid, save/advance
 * flow, JSON project import/export, printable template sheets, the upload-
 * template aligner grid, and the opentype.js TTF compiler pipeline
 * (buildCustomFont + the exportCustomFontTTF wrapper).
 *
 * Dependencies:
 * - state.js: S, draftedGlyphs, saveGlyphDB, pruneBlankGlyphs (draftedGlyphs is
 *   shared live state — mutate in place, never reassign).
 * - export-manager.js: showExportToast (index.js's `showToast` alias).
 * - font-compilation.js: FontCompilation (named ES export since the M2 pass;
 *   window.FontCompilation remains for console/debug).
 * - persistence.js (autosave) and render-pipeline.js (debounceRender): static
 *   imports since the M2 pass — no cycles, because neither module imports this
 *   one (renderText draws draftedGlyphs via state.js, not through the studio).
 * - ALL_TEMPLATE_CHARS is self-published to window.* at the bottom of this
 *   module: persistence.js's restoreState() reads it lazily because importing
 *   it there would evaluate this module's top-level window.* side effects in
 *   persistence.test.js's node environment.
 *
 * The studio's index.html buttons are bound by ui-bindings.js
 * bindHandFontedStudio() (Phase B4), which imports the exported entry points
 * below. undoSketchStroke, updateBrushSize and the clearSketchCanvas
 * stroke-history reset are bound inside initHandFontedStudio — they need the
 * sketchpad closure state. The window bridge at the end of this file remains
 * for e2e specs (window.closeHandFontedModal) and the ALL_TEMPLATE_CHARS lazy
 * read in persistence.js.
 */
import { S, draftedGlyphs, saveGlyphDB, pruneBlankGlyphs } from './state.js';
import { getCharVariationWithContext } from './contextual-jitter-engine.js';
import { wrapInkfont, parseInkfont } from './inkfont-format.js';
import { showExportToast as showToast } from './export-manager.js';
import { autosave } from './persistence.js';
import { debounceRender } from './render-pipeline.js';
import { FontCompilation } from './font-compilation.js';

const TEMPLATE_SHEETS = {
  letters: [
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ],
  symbols: [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    ',',
    '.',
    '?',
    '!',
    '@',
    '#',
    '$',
    '%',
    '^',
    '&',
    '*',
    '(',
    ')',
    '-',
    '_',
    '+',
    '=',
    '/',
    ':',
    ';',
    "'",
    '"',
  ],
};
// Exported for index.js's restoreState() (re-highlights drafted characters in
// the char grid after the glyph store is restored from IndexedDB).
export const ALL_TEMPLATE_CHARS = [...TEMPLATE_SHEETS.letters, ...TEMPLATE_SHEETS.symbols];
let activeChar = 'A';
let activeSheet = 'letters';
let activeUploadSheet = 'letters';
const alignerImages = { letters: null, symbols: null };
const gridConfigs = {
  letters: { gridX: 22, gridY: 36, gridW: 315, gridH: 315 },
  symbols: { gridX: 22, gridY: 36, gridW: 315, gridH: 315 },
};
let gridX = 22;
let gridY = 36;
let gridW = 315;
let gridH = 315;

/* ───────────────────────────────────────────
   HANDFONTED STUDIO CUSTOM FONT BUILDER
─────────────────────────────────────────── */

// Modal Toggles

// Modal Toggles
function openHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) {
    modal.classList.remove('hidden');
    modal._previousFocus = document.activeElement;
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }
  switchSheet('letters');
}

export function closeHandFontedModal() {
  const modal = document.getElementById('handfonted-modal');
  if (modal) {
    modal.classList.add('hidden');
    if (modal._previousFocus) modal._previousFocus.focus();
  }
}

export function switchSheet(sheet) {
  activeSheet = sheet;
  document.querySelectorAll('.sheet-tab').forEach((b) => b.classList.remove('active'));
  const btn = document.getElementById(`sheet-tab-${sheet}`);
  if (btn) btn.classList.add('active');

  renderSketchCharGrid();
  const firstChar = TEMPLATE_SHEETS[sheet][0];
  selectSketchCharacter(firstChar);
}

export function switchFontTab(tab) {
  const btnSketch = document.getElementById('tab-btn-sketchpad');
  const btnTemp = document.getElementById('tab-btn-template');
  const panelSketch = document.getElementById('panel-sketchpad');
  const panelTemp = document.getElementById('panel-template');

  if (tab === 'sketchpad') {
    btnSketch.classList.add('active');
    btnTemp.classList.remove('active');
    panelSketch.classList.remove('hidden');
    panelTemp.classList.add('hidden');
  } else {
    btnSketch.classList.remove('active');
    btnTemp.classList.add('active');
    panelSketch.classList.add('hidden');
    panelTemp.classList.remove('hidden');

    // Trigger grid render if aligner already has an image
    if (alignerImages[activeUploadSheet]) {
      setTimeout(updateAlignerGrid, 50);
    }
  }
}

// Live Sketchpad Mechanics
export function initHandFontedStudio() {
  const btn = document.getElementById('btn-handfonted-studio');
  if (btn) btn.addEventListener('click', openHandFontedModal);

  // Initialize progress bar
  updateCharProgress();

  // Adjust canvas size based on device
  adjustCanvasSizeForDevice();

  // Listen for orientation changes
  window.addEventListener('resize', adjustCanvasSizeForDevice);
  window.addEventListener('orientationchange', () => {
    setTimeout(adjustCanvasSizeForDevice, 300);
  });

  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Stroke history for undo functionality
  let strokes = [];
  let currentStroke = [];
  let brushSize = 3;

  // High quality stroke aesthetics
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    currentStroke = [];
    const pos = getPos(e);
    currentStroke.push({ x: pos.x, y: pos.y });
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    currentStroke.push({ x: pos.x, y: pos.y });
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    if (drawing && currentStroke.length > 0) {
      strokes.push({
        points: [...currentStroke],
        size: brushSize,
        color: ctx.strokeStyle,
      });
      currentStroke = [];
    }
    drawing = false;
  }

  // Undo functionality (bound to #btn-undo-stroke — needs this closure state)
  function undoSketchStroke() {
    if (strokes.length === 0) return;
    strokes.pop();
    redrawCanvas();
  }
  document.getElementById('btn-undo-stroke')?.addEventListener('click', undoSketchStroke);

  // Brush size update (bound to #brush-size-slider — needs this closure state)
  function updateBrushSize() {
    const slider = document.getElementById('brush-size-slider');
    brushSize = parseFloat(slider.value);
    document.getElementById('brush-size-val').textContent = brushSize.toFixed(1);
    ctx.lineWidth = brushSize;
  }
  document.getElementById('brush-size-slider')?.addEventListener('input', updateBrushSize);

  // Redraw all strokes
  function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      if (stroke.points.length > 0) {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
    // Restore current settings
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = brushSize;
  }

  // Clear canvas button - also clear stroke history (needs this closure state;
  // the imported clearSketchCanvas only wipes the pixels)
  document.getElementById('btn-clear-sketch')?.addEventListener('click', () => {
    strokes = [];
    currentStroke = [];
    clearSketchCanvas();
  });

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  renderSketchCharGrid();
  setupTemplateUploader();
}

export function clearSketchCanvas() {
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function renderSketchCharGrid() {
  const container = document.getElementById('sketch-char-grid');
  if (!container) return;
  container.innerHTML = '';

  const chars = TEMPLATE_SHEETS[activeSheet];
  chars.forEach((char) => {
    const btn = document.createElement('div');
    btn.className = 'char-btn';
    btn.id = `char-btn-${char}`;
    btn.textContent = char;
    btn.addEventListener('click', () => selectSketchCharacter(char));
    if (draftedGlyphs[char]) btn.classList.add('drafted');
    container.appendChild(btn);
  });
}

function selectSketchCharacter(char) {
  activeChar = char;

  document.querySelectorAll('.char-btn').forEach((btn) => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`char-btn-${char}`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('current-char-display').textContent = char;
  document.getElementById('canvas-guide-letter').textContent = char;

  if (typeof window.clearSketchCanvas === 'function') window.clearSketchCanvas();
  else clearSketchCanvas();

  if (draftedGlyphs[char]) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById('sketch-canvas');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
    };
    img.src = draftedGlyphs[char];
  }
}

export function saveActiveCharacter() {
  const canvas = document.getElementById('sketch-canvas');
  if (!canvas) return;

  // Phase 9.8 — Check if canvas has any significant ink before saving
  if (FontCompilation.isCellBlank(canvas)) {
    alert('Nothing drawn — sketch the character before saving with dark ink.');
    return;
  }

  // Save canvas as image data URL
  const dataUrl = canvas.toDataURL();
  draftedGlyphs[activeChar] = dataUrl;

  // Update sidebar grids
  const btn = document.getElementById(`char-btn-${activeChar}`);
  if (btn) btn.classList.add('drafted');

  // Update progress indicator
  updateCharProgress();

  // Show preview
  showCharPreview(dataUrl, activeChar);

  // Persist to IndexedDB
  saveGlyphDB(activeChar, dataUrl).catch((err) => console.error('Error saving glyph to IndexedDB:', err));

  // Micro-interaction: visual confirmation
  const wrapper = canvas.parentElement;
  wrapper.style.borderColor = 'var(--accent)';
  setTimeout(() => {
    wrapper.style.borderColor = '';
  }, 300);
}

// Update progress bar
function updateCharProgress() {
  const totalChars = ALL_TEMPLATE_CHARS.length;
  const completedChars = Object.keys(draftedGlyphs).length;
  const percent = Math.round((completedChars / totalChars) * 100);

  const countEl = document.getElementById('char-progress-count');
  const percentEl = document.getElementById('char-progress-percent');
  const fillEl = document.getElementById('char-progress-fill');

  if (countEl) countEl.textContent = `${completedChars}/${totalChars}`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (fillEl) fillEl.style.width = `${percent}%`;
}

// Show preview of saved character + a live-jitter strip (Phase F5): the glyph
// drawn five times through the real variation engine at the current realism —
// exactly how it will look inside actual notes.
function showCharPreview(dataUrl, char = '') {
  const container = document.getElementById('char-preview-container');
  const previewCanvas = document.getElementById('char-preview-canvas');
  if (!container || !previewCanvas) return;

  container.classList.remove('d-none');
  const ctx = previewCanvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, 0, 0, 48, 48);
    showJitterPreview(dataUrl, char);
  };
  img.src = dataUrl;
}

// Phase F5: draw the glyph through the handwriting pipeline (seeded tilt/scale/
// micro-shear + ink bleed at the live S.realism), five repetitions on a ruled strip.
function showJitterPreview(dataUrl, char = '') {
  const strip = document.getElementById('char-jitter-canvas');
  if (!strip) return;
  const ctx = strip.getContext('2d');
  const img = new Image();

  img.onload = () => {
    const w = strip.width;
    const h = strip.height;
    ctx.clearRect(0, 0, w, h);
    // ruled baseline like the real paper
    ctx.save();
    ctx.strokeStyle = 'rgba(80, 130, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 14);
    ctx.lineTo(w, h - 14);
    ctx.stroke();
    ctx.restore();

    const drawSize = Math.min(44, h - 20);
    const prng = () => Math.random();
    const realism = S.realism !== undefined ? S.realism : 0.5;
    for (let i = 0; i < 5; i++) {
      const v = getCharVariationWithContext(S.rotationMax, S.pressure, drawSize, null, {
        prng,
        realism,
      });
      const x = 22 + i * ((w - 44) / 4);
      ctx.save();
      ctx.translate(x, h - 20);
      ctx.rotate((v.tiltDeg * Math.PI) / 180);
      if (v.shearX) ctx.transform(1, 0, v.shearX, 1, 0, 0);
      ctx.scale(v.scaleX, v.scaleY);
      ctx.globalAlpha = v.opacity;
      if (S.bleed > 0.05) {
        ctx.shadowColor = S.inkColor;
        ctx.shadowBlur = Math.max(0, S.bleed * 1.4 * (1 + (v.pressureMod - 1) * 0.4 * realism));
      }
      ctx.drawImage(img, -drawSize / 2, -drawSize, drawSize, drawSize);
      ctx.restore();
    }
  };
  img.src = dataUrl;
}

// Export font project as .inkfont (format helpers in inkfont-format.js)
export function exportFontProject() {
  const projectData = {
    version: '1.0',
    appName: 'InkForge HandFonted Studio',
    exportDate: new Date().toISOString(),
    glyphs: draftedGlyphs,
    fontName: document.getElementById('custom-font-name')?.value || 'MyHandwriting',
    totalGlyphs: Object.keys(draftedGlyphs).length,
  };

  const dataStr = JSON.stringify(wrapInkfont(projectData), null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `${projectData.fontName}.inkfont`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`✅ Project saved: ${projectData.totalGlyphs} characters`, 'success');
}

// Import font project from JSON
export function importFontProject(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const projectData = parseInkfont(e.target.result);

      if (!projectData.glyphs || typeof projectData.glyphs !== 'object') {
        throw new Error('Invalid project file format');
      }

      // Load glyphs
      Object.assign(draftedGlyphs, projectData.glyphs);

      // Strip any blank entries that may have come from an older export
      // (saved before the ink-check guard existed).
      await pruneBlankGlyphs();

      // Update font name if available
      if (projectData.fontName) {
        const nameInput = document.getElementById('custom-font-name');
        if (nameInput) nameInput.value = projectData.fontName;
      }

      // Refresh UI
      renderSketchCharGrid();
      updateCharProgress();

      // Select first character
      if (ALL_TEMPLATE_CHARS.length > 0) {
        selectSketchCharacter(ALL_TEMPLATE_CHARS[0]);
      }

      showToast(`✅ Loaded ${Object.keys(projectData.glyphs).length} characters`, 'success');
    } catch (error) {
      console.error('Error loading project:', error);
      showToast('❌ Failed to load project file', 'error');
    }
  };
  reader.readAsText(file);

  // Reset input so same file can be loaded again
  event.target.value = '';
}

/* ───────────────────────────────────────────
   DEVICE & RESOLUTION DETECTION
─────────────────────────────────────────── */

function getDeviceType() {
  const width = window.innerWidth;
  const _height = window.innerHeight;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (width <= 480) {
    return { type: 'mobile', canvasSize: Math.min(280, width - 60), isTouchDevice };
  } else if (width <= 767) {
    return { type: 'tablet-portrait', canvasSize: 240, isTouchDevice };
  } else if (width <= 1023) {
    return { type: 'tablet-landscape', canvasSize: 280, isTouchDevice };
  } else if (width <= 1919) {
    return { type: 'desktop', canvasSize: 256, isTouchDevice };
  } else {
    return { type: 'large-desktop', canvasSize: 320, isTouchDevice };
  }
}

function adjustCanvasSizeForDevice() {
  const device = getDeviceType();
  const canvas = document.getElementById('sketch-canvas');
  const wrapper = document.querySelector('.canvas-wrapper');

  if (!canvas || !wrapper) return;

  // Set canvas internal resolution (for drawing quality)
  const dpr = window.devicePixelRatio || 1;
  const baseSize = 256;

  // High DPI devices get higher resolution canvas
  if (dpr > 1) {
    canvas.width = baseSize * Math.min(dpr, 2);
    canvas.height = baseSize * Math.min(dpr, 2);
  } else {
    canvas.width = baseSize;
    canvas.height = baseSize;
  }

  // Visual size is set by CSS (already responsive)
  // But we can add device-specific optimizations

  if (device.isTouchDevice) {
    // Increase touch target sizes
    canvas.style.touchAction = 'none';
    wrapper.style.cursor = 'crosshair';

    // Prevent zoom on double-tap
    wrapper.style.touchAction = 'pan-x pan-y';
  }
}

// Detect high refresh rate displays
function getOptimalAnimationSettings() {
  const refreshRate = screen.refreshRate || 60;

  return {
    useRAF: refreshRate >= 90, // Use requestAnimationFrame for smooth drawing on high refresh displays
    smoothing: refreshRate >= 120,
  };
}

export function advanceActiveCharacter() {
  saveActiveCharacter();

  const chars = TEMPLATE_SHEETS[activeSheet];
  const curIdx = chars.indexOf(activeChar);
  if (curIdx < chars.length - 1) {
    selectSketchCharacter(chars[curIdx + 1]);
  } else {
    if (activeSheet === 'letters') {
      if (confirm('🎉 Finished Letters template! Would you like to switch to Numbers & Symbols?')) {
        switchSheet('symbols');
      }
    } else {
      alert(
        '🎉 You have drafted all characters in this set! Click "Generate & Apply Font" below to compile your TrueType handwriting font.'
      );
    }
  }
}

// Handwriting PDF/PNG Sheet Template Builder
export function generateDownloadTemplate() {
  // Create a container for multiple sheets
  const sheets = [];

  // ========================================
  // SHEET 1: FRONT COVER / INSTRUCTIONS
  // ========================================
  const frontCanvas = document.createElement('canvas');
  frontCanvas.width = 1600;
  frontCanvas.height = 1600;
  const frontCtx = frontCanvas.getContext('2d');

  // Background
  frontCtx.fillStyle = '#f7f3ea';
  frontCtx.fillRect(0, 0, 1600, 1600);

  // Decorative border
  frontCtx.strokeStyle = '#c0622a';
  frontCtx.lineWidth = 8;
  frontCtx.strokeRect(40, 40, 1520, 1520);

  // Title
  frontCtx.fillStyle = '#c0622a';
  frontCtx.font = 'bold 72px serif';
  frontCtx.textAlign = 'center';
  frontCtx.fillText('✨ HandFonted Studio', 800, 200);

  frontCtx.fillStyle = '#1c2340';
  frontCtx.font = '42px serif';
  frontCtx.fillText('Custom Handwriting Font Creator', 800, 270);

  // Subtitle
  frontCtx.fillStyle = '#6b6148';
  frontCtx.font = 'italic 28px serif';
  frontCtx.fillText('Transform your handwriting into a digital font', 800, 340);

  // Instructions box
  frontCtx.fillStyle = 'rgba(192, 98, 42, 0.08)';
  frontCtx.fillRect(150, 420, 1300, 900);
  frontCtx.strokeStyle = '#c0622a';
  frontCtx.lineWidth = 3;
  frontCtx.strokeRect(150, 420, 1300, 900);

  // Instructions title
  frontCtx.fillStyle = '#c0622a';
  frontCtx.font = 'bold 36px sans-serif';
  frontCtx.textAlign = 'left';
  frontCtx.fillText('📋 Instructions:', 200, 490);

  // Instructions text
  frontCtx.fillStyle = '#1c2340';
  frontCtx.font = '24px sans-serif';
  const instructions = [
    '1. Print the following template sheets (Letters & Symbols)',
    '',
    '2. Use a dark pen or marker to write each character clearly',
    '   inside its designated box',
    '',
    '3. Write naturally - your unique style will be captured!',
    '',
    '4. For best results:',
    '   • Keep characters centered in each box',
    '   • Use consistent size and slant',
    '   • Write on a flat surface with good lighting',
    '   • Avoid touching the box edges',
    '',
    '5. Scan or photograph the completed sheets',
    '   • Use high contrast (300 DPI recommended)',
    '   • Ensure the image is well-lit and in focus',
    '',
    "6. Upload your sheets in InkForge's HandFonted Studio",
    '',
    '7. Align the grid overlay to match your written template',
    '',
    '8. Click "Generate & Apply Font" to create your custom font!',
  ];

  let yPos = 550;
  instructions.forEach((line) => {
    if (line === '') {
      yPos += 15;
    } else {
      frontCtx.fillText(line, 220, yPos);
      yPos += 35;
    }
  });

  // Footer
  frontCtx.fillStyle = '#9e9078';
  frontCtx.font = 'italic 20px serif';
  frontCtx.textAlign = 'center';
  frontCtx.fillText('Powered by InkForge — AI Handwritten Notes Generator', 800, 1500);
  frontCtx.fillText('inkforge.app', 800, 1535);

  sheets.push({
    canvas: frontCanvas,
    name: 'cover',
  });

  // ========================================
  // SHEET 2 & 3: CHARACTER TEMPLATES
  // ========================================
  const sheetTypes = [
    { key: 'letters', title: 'Letters (A-Z, a-z)' },
    { key: 'symbols', title: 'Numbers & Symbols' },
  ];

  sheetTypes.forEach((sheetType) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1600, 1600);

    // Sheet Headers
    ctx.fillStyle = '#1c2340';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`HandFonted Studio — ${sheetType.title}`, 800, 70);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText('Write each character clearly inside its designated box', 800, 110);

    const startX = 100;
    const startY = 160;
    const size = 175; // 8 * 175 = 1400px wide

    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;

    const chars = TEMPLATE_SHEETS[sheetType.key];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = startX + c * size;
        const y = startY + r * size;
        const char = chars[r * 8 + c] || '';

        // Outer square
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        // Center baseline helper
        ctx.strokeStyle = '#e2e2e2';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(x, y + size * 0.7);
        ctx.lineTo(x + size, y + size * 0.7);
        ctx.stroke();
        ctx.setLineDash([]);

        // Guide label tags
        if (char) {
          ctx.fillStyle = '#888888';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(char, x + 8, y + 8);
        }
      }
    }

    sheets.push({
      canvas: canvas,
      name: sheetType.key,
    });
  });

  // ========================================
  // DOWNLOAD ALL SHEETS AS ZIP OR INDIVIDUAL
  // ========================================
  if (sheets.length === 1) {
    // Single sheet download
    const link = document.createElement('a');
    link.download = `handfonted-template-${activeSheet}.png`;
    link.href = sheets[0].canvas.toDataURL();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    // Multiple sheets - download each individually
    sheets.forEach((sheet, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `handfonted-${index === 0 ? 'instructions' : `template-${sheet.name}`}.png`;
        link.href = sheet.canvas.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300); // Stagger downloads to avoid browser blocking
    });

    // Show toast notification
    showToast('Downloading 3 sheets: Instructions + 2 templates', 'info');
  }
}

// Aligner Cropping Mechanics
function setupTemplateUploader() {
  const dropzone = document.getElementById('template-dropzone');
  const input = document.getElementById('template-image-input');
  if (!dropzone || !input) return;

  dropzone.addEventListener('click', () => input.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--accent)';
    dropzone.style.background = 'rgba(230, 100, 50, 0.04)';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '';
    dropzone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file) handleTemplateImage(file);
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleTemplateImage(file);
  });

  const sheetSelect = document.getElementById('upload-template-sheet-select');
  if (sheetSelect) {
    sheetSelect.addEventListener('change', () => {
      activeUploadSheet = sheetSelect.value;

      // Load config to sliders
      const config = gridConfigs[activeUploadSheet];
      document.getElementById('slider-grid-x').value = config.gridX;
      document.getElementById('slider-grid-y').value = config.gridY;
      document.getElementById('slider-grid-w').value = config.gridW;
      document.getElementById('slider-grid-h').value = config.gridH;

      // Show/hide aligner container
      const img = alignerImages[activeUploadSheet];
      const container = document.getElementById('template-aligner-container');
      if (img) {
        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }

      updateAlignerGrid();
    });
  }
}

function handleTemplateImage(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      alignerImages[activeUploadSheet] = img;
      document.getElementById('template-aligner-container').classList.remove('hidden');

      gridX = 22;
      gridY = 36;
      gridW = 315;
      gridH = 315;

      gridConfigs[activeUploadSheet] = { gridX, gridY, gridW, gridH };

      document.getElementById('slider-grid-x').value = gridX;
      document.getElementById('slider-grid-y').value = gridY;
      document.getElementById('slider-grid-w').value = gridW;
      document.getElementById('slider-grid-h').value = gridH;

      updateAlignerGrid();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function updateAlignerGrid() {
  const img = alignerImages[activeUploadSheet];
  const canvas = document.getElementById('aligner-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (!img) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Read dynamic slider parameters
  gridX = parseInt(document.getElementById('slider-grid-x').value);
  gridY = parseInt(document.getElementById('slider-grid-y').value);
  gridW = parseInt(document.getElementById('slider-grid-w').value);
  gridH = parseInt(document.getElementById('slider-grid-h').value);

  // Sync to config
  gridConfigs[activeUploadSheet].gridX = gridX;
  gridConfigs[activeUploadSheet].gridY = gridY;
  gridConfigs[activeUploadSheet].gridW = gridW;
  gridConfigs[activeUploadSheet].gridH = gridH;

  // Display numbers in UI
  document.getElementById('val-grid-x').textContent = gridX;
  document.getElementById('val-grid-y').textContent = gridY;
  document.getElementById('val-grid-w').textContent = gridW;
  document.getElementById('val-grid-h').textContent = gridH;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw base image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Semi-transparent shading of outer bounding box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, gridY);
  ctx.fillRect(0, gridY + gridH, canvas.width, canvas.height - (gridY + gridH));
  ctx.fillRect(0, gridY, gridX, gridH);
  ctx.fillRect(gridX + gridW, gridY, canvas.width - (gridX + gridW), gridH);

  // Red/Orange alignment grids
  ctx.strokeStyle = 'rgba(230, 100, 50, 0.85)';
  ctx.lineWidth = 1.5;
  const cellW = gridW / 8;
  const cellH = gridH / 8;

  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    ctx.moveTo(gridX + i * cellW, gridY);
    ctx.lineTo(gridX + i * cellW, gridY + gridH);
    ctx.moveTo(gridX, gridY + i * cellH);
    ctx.lineTo(gridX + gridW, gridY + i * cellH);
  }
  ctx.stroke();
}

function cropTemplateCell(index, sheetName) {
  const img = alignerImages[sheetName];
  if (!img) return null;
  const config = gridConfigs[sheetName];

  const col = index % 8;
  const row = Math.floor(index / 8);

  const cellCanvas = document.createElement('canvas');
  cellCanvas.width = 128;
  cellCanvas.height = 128;
  const cellCtx = cellCanvas.getContext('2d');

  const scaleX = img.naturalWidth / 360;
  const scaleY = img.naturalHeight / 360;

  const cellW_preview = config.gridW / 8;
  const cellH_preview = config.gridH / 8;

  const srcX = (config.gridX + col * cellW_preview) * scaleX;
  const srcY = (config.gridY + row * cellH_preview) * scaleY;
  const srcW = cellW_preview * scaleX;
  const srcH = cellH_preview * scaleY;

  cellCtx.fillStyle = '#ffffff';
  cellCtx.fillRect(0, 0, 128, 128);

  cellCtx.drawImage(img, srcX, srcY, srcW, srcH, 12, 12, 104, 104);

  // Clear the guide label at the top-left of the cell to prevent it from being traced as ink
  cellCtx.fillStyle = '#ffffff';
  cellCtx.fillRect(12, 12, 32, 24);

  return cellCanvas;
}

// Opentype.js dynamically lazy-loaded CDN script
async function ensureOpentypeLoaded() {
  if (window.opentype) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// TTF Compiler Pipeline
export async function buildCustomFont() {
  const fontNameInput = document.getElementById('custom-font-name');
  const fontName = fontNameInput.value.replace(/[^a-zA-Z0-9]/g, '') || 'MyHandwriting';

  const progressDiv = document.getElementById('font-build-progress');
  const statusText = document.getElementById('font-build-status-text');

  progressDiv.classList.remove('hidden');
  statusText.textContent = 'Initializing Opentype.js...';

  try {
    await ensureOpentypeLoaded();

    const glyphsList = [];

    // standard blank .notdef glyph
    const notdefGlyph = new window.opentype.Glyph({
      name: '.notdef',
      unicode: 0,
      advanceWidth: 650,
      path: new window.opentype.Path(),
    });
    glyphsList.push(notdefGlyph);

    // standard space glyph
    const spaceGlyph = new window.opentype.Glyph({
      name: 'space',
      unicode: 32,
      advanceWidth: 400, // Reasonable space width for handwriting fonts
      path: new window.opentype.Path(),
    });
    glyphsList.push(spaceGlyph);

    statusText.textContent = 'Analyzing raster paths and extracting contours...';

    const isTemplateTab = !document.getElementById('panel-template').classList.contains('hidden');

    for (let i = 0; i < ALL_TEMPLATE_CHARS.length; i++) {
      const char = ALL_TEMPLATE_CHARS[i];
      let cellCanvas = null;

      let sheetName = 'letters';
      let charIdx = TEMPLATE_SHEETS.letters.indexOf(char);
      if (charIdx === -1) {
        sheetName = 'symbols';
        charIdx = TEMPLATE_SHEETS.symbols.indexOf(char);
      }

      if (isTemplateTab) {
        const img = alignerImages[sheetName];
        if (img) {
          cellCanvas = cropTemplateCell(charIdx, sheetName);
        } else if (draftedGlyphs[char]) {
          cellCanvas = await FontCompilation.loadImageToCanvas(draftedGlyphs[char]);
        } else {
          continue; // Skip if neither is present
        }
      } else {
        if (draftedGlyphs[char]) {
          cellCanvas = await FontCompilation.loadImageToCanvas(draftedGlyphs[char]);
        } else {
          const img = alignerImages[sheetName];
          if (img) {
            cellCanvas = cropTemplateCell(charIdx, sheetName);
          } else {
            continue; // Skip if neither is present
          }
        }
      }

      // Phase 9.8 — Check if cell is blank before processing
      if (FontCompilation.isCellBlank(cellCanvas)) {
        continue;
      }

      const path = FontCompilation.canvasToOpentypePath(cellCanvas);

      // Skip cells with no ink — let the browser fall back to a system font
      // for these instead of baking in an invisible glyph.
      if (!path.commands || path.commands.length === 0) {
        continue;
      }

      // Calculate advance width based on glyph's visual width
      // Find bounding box of glyph pixels in the canvas
      const ctx = cellCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, cellCanvas.width, cellCanvas.height);
      const pixels = imageData.data;

      let minX = cellCanvas.width,
        maxX = 0;
      for (let y = 0; y < cellCanvas.height; y++) {
        for (let x = 0; x < cellCanvas.width; x++) {
          const idx = (y * cellCanvas.width + x) * 4;
          const alpha = pixels[idx + 3];
          const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;

          if (alpha > 50 && brightness < 160) {
            // Standard ink threshold
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }

      // Scale the width to match the 1000 UPM coordinate system
      const scale = 800 / Math.max(cellCanvas.width, cellCanvas.height);
      const glyphWidth = (maxX - minX) * scale;
      const advanceWidth = Math.max(Math.round(glyphWidth + 100), 250); // Add padding

      const glyph = new window.opentype.Glyph({
        name: char,
        unicode: char.charCodeAt(0),
        advanceWidth: advanceWidth,
        path: path,
      });
      glyphsList.push(glyph);
    }

    if (glyphsList.length <= 2) {
      alert('Please draft at least one character in sketchpad or upload a filled template grid before creating.');
      progressDiv.classList.add('hidden');
      return;
    }

    statusText.textContent = 'Generating TrueType Font binary...';

    const font = new window.opentype.Font({
      familyName: fontName,
      styleName: 'Regular',
      unitsPerEm: 1000,
      ascender: 800,
      descender: -200,
      glyphs: glyphsList,
    });

    const fontBuffer = font.toArrayBuffer();
    const blob = new Blob([fontBuffer], { type: 'font/ttf' });
    const fontUrl = URL.createObjectURL(blob);

    statusText.textContent = 'Registering dynamic font-face inside DOM...';

    const fontFace = new FontFace(fontName, `url(${fontUrl})`);
    await fontFace.load();
    document.fonts.add(fontFace);

    // Append option to selector
    const fontSelect = document.getElementById('font-select');
    const opt = document.createElement('option');
    opt.value = fontName;
    opt.textContent = `${fontName} (created)`;
    opt.style.fontFamily = fontName;
    fontSelect.appendChild(opt);

    // Set active
    fontSelect.value = fontName;
    fontSelect.style.fontFamily = fontName;
    S.font = fontName;

    // Lazy window.* reads replaced by static imports (M2 pass) — autosave is
    // debounced in persistence.js and debounceRender debounces in
    // render-pipeline.js, so calling both here stays cheap.
    autosave();
    debounceRender();

    statusText.textContent = 'Success!';
    setTimeout(() => {
      progressDiv.classList.add('hidden');
      closeHandFontedModal();
      alert(`🎉 Congratulation! "${fontName}" has been successfully created and applied to your handwritten notes!`);
    }, 1000);
  } catch (err) {
    console.error(err);
    alert('An error occurred during font building: ' + err.message);
    progressDiv.classList.add('hidden');
  }
}

export async function exportCustomFontTTF() {
  const fontNameInput = document.getElementById('custom-font-name');
  const fontName = fontNameInput?.value?.replace(/[^a-zA-Z0-9]/g, '') || 'MyHandwriting';
  try {
    await ensureOpentypeLoaded();
    await FontCompilation.exportCustomFontTTF(draftedGlyphs, fontName);
  } catch (e) {
    alert('TTF export failed: ' + e.message);
  }
}

// The studio's entry points are exported ES bindings bound by ui-bindings.js
// (Phase B4). This bridge remains for the e2e specs (window.closeHandFontedModal)
// and for persistence.js's restoreState(), which reads ALL_TEMPLATE_CHARS
// lazily — importing it there would evaluate this module's top-level window.*
// side effects in persistence.test.js's node environment.
Object.assign(window, {
  switchFontTab,
  switchSheet,
  buildCustomFont,
  generateDownloadTemplate,
  exportFontProject,
  importFontProject,
  saveActiveCharacter,
  advanceActiveCharacter,
  closeHandFontedModal,
  clearSketchCanvas,
  updateAlignerGrid,
  exportCustomFontTTF,
  ALL_TEMPLATE_CHARS,
});
