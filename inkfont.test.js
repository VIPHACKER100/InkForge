/**
 * .inkfont Share Format Tests — Phase F5
 * Round-trip, format marker, and legacy-project acceptance for the
 * HandFonted community-share format (inkfont-format.js).
 */
import { describe, it, expect } from 'vitest';
import { wrapInkfont, parseInkfont } from './inkfont-format.js';

const PROJECT = {
  version: '1.0',
  appName: 'InkForge HandFonted Studio',
  glyphs: { a: 'data:image/png;base64,AAA', b: 'data:image/png;base64,BBB' },
  fontName: 'MyHandwriting',
  totalGlyphs: 2,
};

describe('wrapInkfont', () => {
  it('wraps the project with the format marker and version', () => {
    const wrapped = wrapInkfont(PROJECT);
    expect(wrapped.format).toBe('inkfont');
    expect(wrapped.formatVersion).toBe(1);
    expect(wrapped.fontName).toBe('MyHandwriting');
    expect(wrapped.glyphs).toEqual(PROJECT.glyphs);
  });
});

describe('parseInkfont', () => {
  it('round-trips a wrapped project, stripping the marker', () => {
    const parsed = parseInkfont(JSON.stringify(wrapInkfont(PROJECT)));
    expect(parsed.format).toBeUndefined();
    expect(parsed).toEqual(PROJECT);
  });

  it('accepts legacy bare project JSON unchanged', () => {
    const parsed = parseInkfont(JSON.stringify(PROJECT));
    expect(parsed).toEqual(PROJECT);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseInkfont('not json')).toThrow();
  });
});
