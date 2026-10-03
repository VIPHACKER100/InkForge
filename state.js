/**
 * state.js — shared application state (upgrade plan Phase B2, first slice).
 * Owns the state that library modules read at call time (text-layout,
 * paper-renderer, export-manager, export-renderers, render-pipeline). index.js
 * imports these same live bindings — this removes the index.js ⇄ module import
 * cycles.
 */
import { CursiveConnector } from './cursive-connector.js';
import { MarkdownParser } from './markdown-parser.js';
import { FontSwitcher } from './script-detector.js';
import { FontCompilation } from './font-compilation.js';

export const S = {
  text: 'This is a sample note starting from the second line of the page. The first line has been skipped automatically as per your request.\n\n```diagram\n{\n  "type": "cycle",\n  "title": "Water Cycle",\n  "nodes": [\n    { "id": "n1", "label": "Evaporation" },\n    { "id": "n2", "label": "Condensation" },\n    { "id": "n3", "label": "Precipitation" },\n    { "id": "n4", "label": "Collection" }\n  ],\n  "edges": [\n    { "from": "n1", "to": "n2" },\n    { "from": "n2", "to": "n3" },\n    { "from": "n3", "to": "n4" },\n    { "from": "n4", "to": "n1" }\n  ]\n}\n```\n\nYou can continue writing your notes here, and the engine will handle the line spacing and page breaks while always skipping the top line of every new page.',
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
  animSpeed: 8,
  currentPage: 0,
  noteLayout: 'standard',
  showMarginLabels: true, // Q/Ans numbers in the left margin (upstream 1.6.8)
  realism: 0.5, // Organic handwriting jitter intensity 0–1 (upstream 1.6.22)
  rareImperfections: false, // Rare retrace strokes + margin-space compression
  textAlignment: 'middle', // 'top', 'middle', 'bottom'
  smudgeEffects: false, // Smudge effects toggle
  cursiveMode: false, // Cursive mode toggle (Req 3.1)
  hinglishAutoSwitch: true,
  markdownMultiPen: true,
  markdownPenProfiles: {
    heading: { inkColor: '#0a3d62', pressure: 0.14, rotationScale: 1.12 },
    body: { inkColor: null },
    bullet: { inkColor: '#2d6a4f', pressure: 0.13 },
    emphasis: { inkColor: '#8b0000', pressure: 0.15, rotationScale: 1.08 },
  },
};

export const PAGE_W = 794;   // A4 @ 96dpi portrait width in px
export const PAGE_H = 1123;  // A4 @ 96dpi portrait height in px

/* Canvas pages array — mutated in place (never reassigned) so every importer
   sees the same live array. Resets use pages.length = 0. */
export const pages = [];

/* Cursive connector instance — constructed once here (the classic script's
   load-order `typeof` guard is unnecessary with static imports). */
export const cursiveConnector = new CursiveConnector();

/* Markdown parser + script/font switcher — leaf classes with no DOM or window
   access, constructed once here (M2 pass: index.js's layout engine and page
   editors both read them; the old `let x = null; if (typeof X !== 'undefined')`
   load-order guards are unnecessary with static imports). */
export const markdownParser = new MarkdownParser();
export const fontSwitcher = new FontSwitcher();

/* Stroke-prediction ghost text (index.js's Tab-completion predictor). The
   predictor engine lives in index.js and writes it through setCurrentPrediction();
   render-pipeline.js reads the live binding when it lays out text. A primitive
   cannot be reassigned through an import, so the setter owns the write. */
export let currentPrediction = '';

export function setCurrentPrediction(value) {
  currentPrediction = value;
}

/* ───────────────────────────────────────────
   DRAFTED GLYPHS — HandFonted Studio shared state (upgrade plan Phase B1).
   handfonted-studio.js writes drafted glyphs; render-pipeline.js draws them.
   them. Both import these live bindings and mutate in place (never reassign).
─────────────────────────────────────────── */
export const draftedGlyphs = {};

// The decoded <img> cache for drafted glyphs (glyphImageCache /
// getCachedGlyphImage) moved to render-pipeline.js (M2 pass) — a draw-time
// concern, not shared data. draftedGlyphs above stays the shared source of
// truth; renderText() sweeps stale cache entries on every render.

/* IndexedDB persistence for drafted glyphs (InkForgeDB / 'draftedGlyphs' store).
   The studio saves on every character; index.js's restoreState() loads them
   back and migrates any legacy localStorage copies. */
const DB_NAME = 'InkForgeDB';
const DB_VERSION = 1;
const STORE_NAME = 'draftedGlyphs';
let dbInstance = null;

// InkForge rename (v1.21.0): copy records from the legacy InkflowDB into the
// renamed database on first open, then delete the old one. Failures are
// non-fatal — the app simply starts with empty glyph storage.
async function migrateLegacyInkflowDB(db) {
  if (typeof indexedDB === 'undefined' || !indexedDB.databases) return;
  try {
    const databases = await indexedDB.databases();
    if (!databases.some((d) => d.name === 'InkflowDB')) return;
    const legacyDb = await new Promise((resolve, reject) => {
      const request = indexedDB.open('InkflowDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    for (const storeName of Array.from(legacyDb.objectStoreNames)) {
      if (!Array.from(db.objectStoreNames).includes(storeName)) continue;
      const records = await new Promise((resolve, reject) => {
        const request = legacyDb.transaction(storeName).objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (records.length > 0) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          records.forEach((record) => tx.objectStore(storeName).put(record));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    }
    legacyDb.close();
    indexedDB.deleteDatabase('InkflowDB');
    console.log('[InkForge] Migrated legacy InkflowDB storage');
  } catch (err) {
    console.error('[InkForge] Legacy InkflowDB migration skipped:', err);
  }
}

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = async (e) => {
      const db = e.target.result;
      try {
        await migrateLegacyInkflowDB(db);
      } catch (err) {
        console.error('[InkForge] Legacy DB migration error:', err);
      }
      dbInstance = db;
      resolve(dbInstance);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

export function saveGlyphDB(char, dataUrl) {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(dataUrl, char);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export function getGlyphsDB() {
  return getDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const results = {};
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          results[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => reject(req.error);
    });
  });
}

// Returns true if a drafted-glyph data URL contains at least one visible
// (non-transparent) pixel. Used to catch stale "blank" entries that were
// saved before the ink-check guard existed in saveActiveCharacter().
function glyphHasInk(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width || 1;
      c.height = img.naturalHeight || img.height || 1;
      const cctx = c.getContext('2d');
      cctx.drawImage(img, 0, 0);
      try {
        // Phase 9.8 — stricter isCellBlank check, imported from
        // font-compilation.js (was a lazy window.FontCompilation read).
        resolve(!FontCompilation.isCellBlank(c));
      } catch {
        // Can't inspect it (e.g. tainted canvas) — don't destroy data we can't verify.
        resolve(true);
      }
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

// Strips blank/corrupt entries out of draftedGlyphs (memory + IndexedDB).
// These can linger from before saveActiveCharacter() rejected empty
// sketches (or from an old imported project), and they make renderText()
// draw an invisible image instead of falling back to the system font for
// that character — which is exactly what causes "missing" letters.
export async function pruneBlankGlyphs() {
  const chars = Object.keys(draftedGlyphs);
  let pruned = 0;
  for (const char of chars) {
    const inked = await glyphHasInk(draftedGlyphs[char]);
    if (!inked) {
      delete draftedGlyphs[char];
      pruned++;
      try {
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(char);
      } catch (err) {
        console.error('Could not remove blank glyph from IndexedDB:', char, err);
      }
      const btn = document.getElementById(`char-btn-${char}`);
      if (btn) btn.classList.remove('drafted');
      // (The decoded-glyph image cache now lives in render-pipeline.js, which
      // sweeps entries for deleted characters at the top of renderText().)
    }
  }
  if (pruned > 0) {
    console.warn(`InkForge: removed ${pruned} blank drafted glyph(s) that were rendering as invisible characters.`);
  }
  return pruned;
}
