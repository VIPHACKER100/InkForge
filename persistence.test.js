import { describe, it, expect } from 'vitest';
import { AUTOSAVE_KEYS, buildAutosavePayload, parseAutosaveState } from './persistence.js';

// State-like object shaped like state.js's S (subset the whitelist copies from).
function makeStateLike() {
  return {
    text: 'IGNORED — autosave() passes the textarea value separately',
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
    noteLayout: 'standard',
    showMarginLabels: true,
    realism: 0.5,
    rareImperfections: false,
    smudgeEffects: false,
    cursiveMode: false,
    hinglishAutoSwitch: true,
    markdownMultiPen: true,
    markdownPenProfiles: {
      heading: { inkColor: '#0a3d62', pressure: 0.14, rotationScale: 1.12 },
      body: { inkColor: null },
    },
    textAlignment: 'middle',
    animSpeed: 8,
    // Runtime-only state that must never leak into the saved payload:
    currentPage: 2,
    draftedGlyphs: { A: 'data:image/png;base64,xxx' },
    someFutureKey: 'not-persisted',
  };
}

describe('AUTOSAVE_KEYS whitelist', () => {
  it('contains exactly the persisted keys — no runtime-only state', () => {
    expect(AUTOSAVE_KEYS).toEqual([
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
    ]);
  });

  it('excludes currentPage and draftedGlyphs (IndexedDB owns glyphs)', () => {
    expect(AUTOSAVE_KEYS).not.toContain('currentPage');
    expect(AUTOSAVE_KEYS).not.toContain('draftedGlyphs');
  });
});

describe('buildAutosavePayload', () => {
  it('copies every whitelisted key in stable order (byte-stable JSON)', () => {
    const state = makeStateLike();
    const payload = buildAutosavePayload(state, 'hello');
    expect(Object.keys(payload)).toEqual(AUTOSAVE_KEYS);
    expect(payload.font).toBe('Caveat');
    expect(payload.fontSize).toBe(22);
    expect(payload.markdownPenProfiles).toEqual(state.markdownPenProfiles);
  });

  it('never serializes runtime-only keys', () => {
    const payload = buildAutosavePayload(makeStateLike(), 'hello');
    expect(payload).not.toHaveProperty('currentPage');
    expect(payload).not.toHaveProperty('draftedGlyphs');
    expect(payload).not.toHaveProperty('someFutureKey');
  });

  it('uses the text argument over state.text (textarea is authoritative)', () => {
    const state = makeStateLike();
    const payload = buildAutosavePayload(state, 'typed in the panel');
    expect(payload.text).toBe('typed in the panel');
  });
});

describe('parseAutosaveState', () => {
  it('returns null for absent or empty payloads', () => {
    expect(parseAutosaveState(null)).toBeNull();
    expect(parseAutosaveState(undefined)).toBeNull();
    expect(parseAutosaveState('')).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', () => {
    expect(parseAutosaveState('{oops')).toBeNull();
    expect(parseAutosaveState('{"fontSize": 22,')).toBeNull();
  });

  it('parses valid stored JSON back into the state object', () => {
    expect(parseAutosaveState('{"fontSize":22}')).toEqual({ fontSize: 22 });
  });
});

describe('autosave serialization round-trip', () => {
  it('survives JSON.stringify → parse with every whitelisted value intact', () => {
    const state = makeStateLike();
    // autosave(): localStorage.setItem('inkforge-state', JSON.stringify(payload))
    const stored = JSON.stringify(buildAutosavePayload(state, 'My note text'));
    // restoreState(): parseAutosaveState(localStorage.getItem('inkforge-state'))
    const restored = parseAutosaveState(stored);

    expect(restored.text).toBe('My note text');
    for (const key of AUTOSAVE_KEYS) {
      if (key === 'text') continue;
      expect(restored[key]).toEqual(state[key]);
    }
  });

  it('preserves the nested markdownPenProfiles object through the round-trip', () => {
    const state = makeStateLike();
    const restored = parseAutosaveState(JSON.stringify(buildAutosavePayload(state, '')));
    expect(restored.markdownPenProfiles.heading).toEqual({
      inkColor: '#0a3d62',
      pressure: 0.14,
      rotationScale: 1.12,
    });
    expect(restored.markdownPenProfiles.body).toEqual({ inkColor: null });
  });

  it('hydrating a fresh state-like object from the restored payload matches the original values', () => {
    const state = makeStateLike();
    const restored = parseAutosaveState(JSON.stringify(buildAutosavePayload(state, 'note')));
    // Simulate restoreState()'s S-hydration semantics (assignments + !! coercions).
    const S2 = {};
    S2.fontSize = restored.fontSize;
    S2.showMarginLabels = !!restored.showMarginLabels;
    S2.hinglishAutoSwitch = !!restored.hinglishAutoSwitch;
    S2.markdownPenProfiles = restored.markdownPenProfiles;
    expect(S2.fontSize).toBe(22);
    expect(S2.showMarginLabels).toBe(true);
    expect(S2.hinglishAutoSwitch).toBe(true);
    expect(S2.markdownPenProfiles).toEqual(state.markdownPenProfiles);
  });
});
