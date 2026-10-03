/**
 * settings-sync.js — sidebar control sync helpers (M2 pass: extracted from
 * index.js so persistence.js can import them instead of reading them lazily
 * off window.* — the last step of the WINDOW BRIDGE retirement).
 *
 * Pure DOM sync: each function reflects the live S values into its controls.
 * No top-level side effects, so persistence.test.js's node import graph
 * (persistence.js → settings-sync.js → state.js) stays safe — the DOM is only
 * touched when a function actually runs.
 *
 * Importers: index.js (initApp/resetToDefaults/setInkPreset), ui-bindings.js
 * (ink + markdown-pen bindings), persistence.js (restoreState hydration).
 */
import { S } from './state.js';

// Upstream v1.6.25: centralises preset button active-state management —
// highlights the button whose data-ink matches the live S.inkColor.
export function updateInkPresetActive() {
  const current = (S.inkColor || '').toLowerCase();
  document.querySelectorAll('button[data-ink]').forEach((btn) => {
    btn.classList.toggle('active-ink', (btn.dataset.ink || '').toLowerCase() === current);
  });
}

export function syncMarkdownPenControls() {
  const multiPenToggle = document.getElementById('markdown-multipen-toggle');
  const penGrid = document.getElementById('markdown-pen-grid');
  const headingInput = document.getElementById('pen-color-heading');
  const bodyInput = document.getElementById('pen-color-body');
  const bulletInput = document.getElementById('pen-color-bullet');
  const emphasisInput = document.getElementById('pen-color-emphasis');

  if (multiPenToggle) {
    multiPenToggle.checked = !!S.markdownMultiPen;
  }
  if (penGrid) {
    penGrid.setAttribute('aria-disabled', S.markdownMultiPen ? 'false' : 'true');
  }

  const profiles = S.markdownPenProfiles || {};
  if (headingInput) headingInput.value = (profiles.heading && profiles.heading.inkColor) || '#0a3d62';
  if (bodyInput) bodyInput.value = (profiles.body && profiles.body.inkColor) || S.inkColor;
  if (bulletInput) bulletInput.value = (profiles.bullet && profiles.bullet.inkColor) || '#2d6a4f';
  if (emphasisInput) emphasisInput.value = (profiles.emphasis && profiles.emphasis.inkColor) || '#8b0000';
}

export function syncHinglishControls() {
  const val = !!S.hinglishAutoSwitch;
  const toggle1 = document.getElementById('auto-switch-devanagari');
  const toggle2 = document.getElementById('hinglish-toggle');
  if (toggle1) toggle1.checked = val;
  if (toggle2) toggle2.checked = val;
}
