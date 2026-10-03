/**
 * i18n Unit Tests — Phase F6
 * Language-table parity, fallback behavior, and default-language selection.
 */
import { describe, it, expect } from 'vitest';
import { STRINGS, LANGUAGES, getLanguage, setLanguage, t } from './i18n.js';

describe('string tables', () => {
  it('have identical key sets for every language', () => {
    const keys = Object.keys(STRINGS.en).sort();
    for (const lang of Object.keys(STRINGS)) {
      expect(Object.keys(STRINGS[lang]).sort()).toEqual(keys);
    }
  });

  it('have no empty strings', () => {
    for (const lang of Object.keys(STRINGS)) {
      for (const [key, value] of Object.entries(STRINGS[lang])) {
        expect(String(value).length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('declare their toggle labels consistently', () => {
    for (const l of LANGUAGES) {
      expect(typeof l.label).toBe('string');
      expect(typeof l.switchLabel).toBe('string');
      // the switch shows the OTHER language's label
      const other = LANGUAGES.find((x) => x.id !== l.id);
      expect(l.switchLabel).toBe(other.label);
    }
  });
});

describe('t()', () => {
  it('falls back to English when the active language lacks a key', () => {
    const saved = STRINGS.hi['toolbar.animate'];
    delete STRINGS.hi['toolbar.animate'];
    setLanguage('hi');
    expect(t('toolbar.animate')).toBe(STRINGS.en['toolbar.animate']);
    setLanguage('en');
    STRINGS.hi['toolbar.animate'] = saved;
    expect(STRINGS.hi['toolbar.animate']).toBe(saved); // table restored
  });

  it('returns the key itself when missing everywhere (last-resort fallback)', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });
});

describe('getLanguage', () => {
  it('defaults to en in node (no localStorage)', () => {
    expect(getLanguage()).toBe('en');
  });
});
