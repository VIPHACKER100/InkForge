/**
 * persistence.js — app-state persistence (upgrade plan Phase B2, main slice).
 *
 * Owns the localStorage-backed session save/restore: the debounced autosave(),
 * the boot-time restoreState(), and the serialization whitelist they share
 * (AUTOSAVE_KEYS + the pure buildAutosavePayload/parseAutosaveState helpers,
 * which are unit-tested in persistence.test.js).
 *
 * Dependencies:
 * - state.js: S (mutated in place by restoreState), draftedGlyphs, and the
 *   drafted-glyph IndexedDB helpers (getGlyphsDB/saveGlyphDB/pruneBlankGlyphs,
 *   moved to state.js in Phase B1).
 * - settings-sync.js: the index.js UI-sync helpers (updateInkPresetActive,
 *   syncMarkdownPenControls, syncHinglishControls) — moved out of index.js in
 *   the M2 pass so restoreState() imports them directly instead of reading
 *   them lazily off window.* (the WINDOW BRIDGE is retired). settings-sync.js
 *   has no top-level side effects, so this module's node import graph
 *   (persistence.test.js) stays safe.
 *
 * Keys owned here: 'inkflow-state'. (The 'inkflow-dark' / 'inkflow-pdf-size'
 * UI-preference keys stay next to their control wiring in index.js.)
 */
import { S, draftedGlyphs, getGlyphsDB, saveGlyphDB, pruneBlankGlyphs } from './state.js';
import { updateInkPresetActive, syncMarkdownPenControls, syncHinglishControls } from './settings-sync.js';

/* ───────────────────────────────────────────
   SERIALIZATION WHITELIST — the only keys autosave() persists and
   restoreState() hydrates. Order matters: buildAutosavePayload() emits keys in
   this order, keeping the stored JSON byte-stable across saves. Runtime-only
   state (currentPage, pages, draftedGlyphs, …) is deliberately excluded —
   draftedGlyphs live in IndexedDB (state.js) and are only MIGRATED out of old
   localStorage payloads by restoreState().
─────────────────────────────────────────── */
export const AUTOSAVE_KEYS = [
  'text',
  'font',
  'fontSize',
  'lineHeight',
  'wordSpacing',
  'margin',
  'rotationMax',
  'inkColor',
  'bleed',
  'pressure',
  'paperStyle',
  'noteLayout',
  'showMarginLabels',
  'realism',
  'rareImperfections',
  'smudgeEffects',
  'cursiveMode',
  'hinglishAutoSwitch',
  'markdownMultiPen',
  'markdownPenProfiles',
  'textAlignment',
  'animSpeed',
];

/**
 * Build the autosave payload from a state-like object. `text` is passed
 * separately (autosave() reads it from the #text-input textarea, which is
 * authoritative over S.text at save time — same as the pre-extraction code).
 * Everything else is copied verbatim from `state` in AUTOSAVE_KEYS order.
 */
export function buildAutosavePayload(state, text) {
  const payload = {};
  for (const key of AUTOSAVE_KEYS) {
    payload[key] = key === 'text' ? text : state[key];
  }
  return payload;
}

/**
 * Parse a stored 'inkflow-state' payload. Returns null for absent, empty or
 * corrupt JSON (restoreState() treats null exactly like the old in-function
 * JSON.parse throw: skip the whole hydration block, then keep going).
 */
export function parseAutosaveState(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ───────────────────────────────────────────
   PHASE 8.6–8.7 — AUTOSAVE & STATE RESTORE
   (drafted-glyph IndexedDB persistence lives in state.js — Phase B1;
   this module extracted from index.js — Phase B2)
─────────────────────────────────────────── */
let autosaveTimeout;

/* Phase D (D2) — localStorage quota guard. A very large note can push the
   'inkflow-state' payload past the per-origin quota, making setItem() throw
   QuotaExceededError. Surface that as an error toast (the copy tells the user
   the way out: export, then trim), throttled to once per minute with a
   module-level timestamp — same pattern as index.js's global error hook — so
   a full storage device can't spam the UI on every debounced autosave. */
const QUOTA_TOAST_INTERVAL_MS = 60 * 1000;
let lastQuotaToastAt = 0;

function isQuotaExceededError(err) {
  return !!err && (err.name === 'QuotaExceededError' || err.code === 22);
}

function reportStorageQuotaExceeded(err) {
  console.error('[Inkflow] autosave failed — localStorage quota exceeded:', err);
  const now = Date.now();
  if (now - lastQuotaToastAt < QUOTA_TOAST_INTERVAL_MS) return;
  lastQuotaToastAt = now;
  window.showExportToast?.(
    'Storage full — your note is too large to auto-save. Export your notes, then clear old text.',
    'error'
  );
}

export function autosave() {
  clearTimeout(autosaveTimeout);
  autosaveTimeout = setTimeout(() => {
    try {
      const state = buildAutosavePayload(S, document.getElementById('text-input').value);
      localStorage.setItem('inkflow-state', JSON.stringify(state));
    } catch (err) {
      if (isQuotaExceededError(err)) {
        reportStorageQuotaExceeded(err);
      } else {
        // Not a quota problem — re-throw so the failure still surfaces through
        // index.js's global error hook instead of being swallowed here.
        throw err;
      }
    }
  }, 1000);
}

export async function restoreState() {
  const raw = localStorage.getItem('inkflow-state');

  // 1. Try to load from IndexedDB
  try {
    const dbGlyphs = await getGlyphsDB();
    Object.assign(draftedGlyphs, dbGlyphs);
  } catch (err) {
    console.error('Error loading glyphs from IndexedDB:', err);
  }

  if (!raw) return;

  const state = parseAutosaveState(raw);
  try {
    if (state) {
      if (state.text) {
        document.getElementById('text-input').value = state.text;
        S.text = state.text;
      }
      // Restore sliders
      const sliderMap = [
        ['font-size-slider', 'fs-val', 'fontSize'],
        ['line-spacing', 'ls-val', 'lineHeight'],
        ['word-spacing', 'ws-val', 'wordSpacing'],
        ['margin-slider', 'mg-val', 'margin'],
        ['rotation-slider', 'rot-val', 'rotationMax'],
        ['bleed-slider', 'bleed-val', 'bleed'],
        ['pressure-slider', 'pressure-val', 'pressure'],
      ];
      sliderMap.forEach(([id, valId, key]) => {
        if (state[key] !== undefined) {
          S[key] = state[key];
          const el = document.getElementById(id);
          if (el) {
            el.value = state[key];
            document.getElementById(valId).textContent = state[key];
          }
        }
      });
      if (state.inkColor) {
        S.inkColor = state.inkColor;
        document.getElementById('ink-color').value = state.inkColor;
        // index.js UI sync — imported from settings-sync.js (M2 pass; was a
        // lazy window.* read off index.js's WINDOW BRIDGE).
        updateInkPresetActive();
      }
      if (state.font) {
        S.font = state.font;
        const opt = document.querySelector(`#font-select option[value="${state.font}"]`);
        if (opt) {
          // Same element index.js caches as its `fontSelect` const — queried at
          // call time here (restoreState only runs after the DOM is parsed).
          const fontSelect = document.getElementById('font-select');
          fontSelect.value = state.font;
          fontSelect.style.fontFamily = state.font;
        }
      }
      if (state.paperStyle) {
        S.paperStyle = state.paperStyle;
        document.querySelectorAll('.paper-btn').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.style === state.paperStyle);
        });
      }
      if (state.noteLayout) {
        S.noteLayout = state.noteLayout;
        const select = document.getElementById('layout-select');
        if (select) select.value = state.noteLayout;
      }
      if (state.smudgeEffects !== undefined) {
        S.smudgeEffects = state.smudgeEffects;
        const toggle = document.getElementById('smudge-effects-toggle');
        if (toggle) toggle.checked = state.smudgeEffects;
      }
      if (state.cursiveMode !== undefined) {
        S.cursiveMode = state.cursiveMode;
        const toggle = document.getElementById('cursive-mode-toggle');
        if (toggle) toggle.checked = state.cursiveMode;
      }
      if (state.hinglishAutoSwitch !== undefined) {
        S.hinglishAutoSwitch = !!state.hinglishAutoSwitch;
      }
      if (state.markdownMultiPen !== undefined) {
        S.markdownMultiPen = !!state.markdownMultiPen;
      }
      if (state.markdownPenProfiles && typeof state.markdownPenProfiles === 'object') {
        S.markdownPenProfiles = {
          ...S.markdownPenProfiles,
          ...state.markdownPenProfiles,
        };
      }
      if (state.showMarginLabels !== undefined) {
        S.showMarginLabels = !!state.showMarginLabels;
        const marginLabelsToggle = document.getElementById('margin-labels-toggle');
        if (marginLabelsToggle) marginLabelsToggle.checked = S.showMarginLabels;
      }
      if (state.realism !== undefined) {
        S.realism = state.realism;
        const realismSlider = document.getElementById('realism-slider');
        if (realismSlider) realismSlider.value = S.realism;
        const realismVal = document.getElementById('realism-val');
        if (realismVal) realismVal.textContent = S.realism;
      }
      if (state.rareImperfections !== undefined) {
        S.rareImperfections = !!state.rareImperfections;
        const rareImperfectionsToggle = document.getElementById('rare-imperfections-toggle');
        if (rareImperfectionsToggle) rareImperfectionsToggle.checked = S.rareImperfections;
      }
      syncMarkdownPenControls();
      syncHinglishControls();
      if (state.textAlignment) {
        S.textAlignment = state.textAlignment;
        document.querySelectorAll('.align-btn').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.align === state.textAlignment);
        });
        const labels = { top: 'Upper', middle: 'Middle', bottom: 'Lower' };
        const alignVal = document.getElementById('align-val');
        if (alignVal) alignVal.textContent = labels[state.textAlignment] || 'Middle';
      }
      if (state.animSpeed !== undefined) {
        S.animSpeed = state.animSpeed;
        const slider = document.getElementById('speed-slider');
        if (slider) {
          slider.value = state.animSpeed;
          const label = document.getElementById('spd-val');
          if (label) label.textContent = state.animSpeed;
        }
      }

      // 2. Migrate draftedGlyphs if they exist in localStorage state
      if (state.draftedGlyphs && Object.keys(state.draftedGlyphs).length > 0) {
        Object.assign(draftedGlyphs, state.draftedGlyphs);

        // Save all of them to IndexedDB
        for (const char of Object.keys(state.draftedGlyphs)) {
          const val = state.draftedGlyphs[char];
          if (val && val.length > 0) {
            try {
              await saveGlyphDB(char, val);
            } catch (err) {
              console.error(`Error migrating character "${char}" to IndexedDB:`, err);
            }
          }
        }

        // Remove draftedGlyphs from localStorage and save back
        delete state.draftedGlyphs;
        localStorage.setItem('inkflow-state', JSON.stringify(state));
      }
    }
  } catch {
    /* ignore corrupt state */
  }

  // 2.5. Remove any stale blank glyphs (e.g. saved before the ink-check guard
  // existed, or pulled in via the localStorage migration above) so they
  // don't get drawn as invisible characters.
  await pruneBlankGlyphs();

  // 3. Highlight drafted characters in UI
  // ALL_TEMPLATE_CHARS is exported by handfonted-studio.js (and self-published
  // to window.* there), but importing it here would evaluate that module's
  // top-level window side effects during node-env test imports — so this
  // stays the one deliberate lazy window.* read.
  window.ALL_TEMPLATE_CHARS?.forEach((char) => {
    if (draftedGlyphs[char] && draftedGlyphs[char].length > 0) {
      const btn = Array.from(document.querySelectorAll('.char-btn')).find((b) => b.textContent === char);
      if (btn) btn.classList.add('drafted');
    }
  });
}
