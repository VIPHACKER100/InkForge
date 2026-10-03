/**
 * Spaced-Repetition (SM-2 lite) Unit Tests — Phase F1
 * Covers the pure SRS engine exported from flashcards.js:
 * cardId stability, gradeCard transitions, ease clamps, due counting.
 */
import { describe, it, expect } from 'vitest';
import { cardId, gradeCard, isDue, countDue, loadSrsState } from './flashcards.js';

const NOW = 1700000000000;
const DAY = 86400000;

describe('cardId', () => {
  it('is stable for the same question', () => {
    expect(cardId('What is photosynthesis?')).toBe(cardId('What is photosynthesis?'));
  });

  it('differs per question and tolerates empty input', () => {
    expect(cardId('A')).not.toBe(cardId('B'));
    expect(typeof cardId('')).toBe('string');
  });

  it('is independent of the answer text (schedules survive answer edits)', () => {
    expect(cardId('Q')).toBe(cardId('Q'));
  });
});

describe('gradeCard — new card', () => {
  it('again lapses: due immediately, ease drops but never below 1.3', () => {
    let s = {};
    s = gradeCard(s, 'k', 'again', NOW);
    s = gradeCard(s, 'k', 'again', NOW);
    expect(s.k.interval).toBe(0);
    expect(s.k.due).toBe(NOW);
    expect(s.k.ease).toBe(2.1); // 2.5 − 0.2 − 0.2
    s = gradeCard(s, 'k', 'again', NOW);
    s = gradeCard(s, 'k', 'again', NOW);
    s = gradeCard(s, 'k', 'again', NOW);
    s = gradeCard(s, 'k', 'again', NOW);
    expect(s.k.ease).toBe(1.3); // clamped
  });

  it('good on a new card schedules 1 day', () => {
    const s = gradeCard({}, 'k', 'good', NOW);
    expect(s.k.interval).toBe(1);
    expect(s.k.due).toBe(NOW + DAY);
    expect(s.k.ease).toBe(2.5);
  });

  it('easy on a new card schedules 3 days and raises ease', () => {
    const s = gradeCard({}, 'k', 'easy', NOW);
    expect(s.k.interval).toBe(3);
    expect(s.k.due).toBe(NOW + 3 * DAY);
    expect(s.k.ease).toBe(2.65);
  });

  it('hard on a new card schedules 1 day and lowers ease', () => {
    const s = gradeCard({}, 'k', 'hard', NOW);
    expect(s.k.interval).toBe(1);
    expect(s.k.ease).toBe(2.35);
  });
});

describe('gradeCard — scheduled card growth and clamps', () => {
  it('good multiplies the interval by ease', () => {
    let s = gradeCard({}, 'k', 'good', NOW);
    s = gradeCard(s, 'k', 'good', NOW);
    expect(s.k.interval).toBe(2.5); // 1 × 2.5
    s = gradeCard(s, 'k', 'good', NOW);
    expect(s.k.interval).toBe(6.25); // 2.5 × 2.5
  });

  it('easy multiplies and boosts ease, clamped at 3', () => {
    let s = gradeCard({}, 'k', 'easy', NOW);
    for (let i = 0; i < 10; i++) s = gradeCard(s, 'k', 'easy', NOW);
    expect(s.k.ease).toBe(3); // clamped
    expect(s.k.interval).toBeGreaterThan(3);
  });

  it('hard never drops below a 1-day interval and ease clamps at 1.3', () => {
    let s = gradeCard({}, 'k', 'good', NOW);
    for (let i = 0; i < 12; i++) s = gradeCard(s, 'k', 'hard', NOW);
    expect(s.k.interval).toBeGreaterThanOrEqual(1);
    expect(s.k.ease).toBe(1.3); // clamped
  });

  it('again resets the interval to 0 (due now) regardless of history', () => {
    let s = gradeCard({}, 'k', 'good', NOW);
    s = gradeCard(s, 'k', 'good', NOW);
    s = gradeCard(s, 'k', 'again', NOW);
    expect(s.k.interval).toBe(0);
    expect(s.k.due).toBe(NOW);
  });

  it('counts reps', () => {
    let s = {};
    s = gradeCard(s, 'k', 'good', NOW);
    s = gradeCard(s, 'k', 'again', NOW);
    expect(s.k.reps).toBe(2);
  });
});

describe('isDue / countDue', () => {
  it('unseen cards are due; future-scheduled cards are not', () => {
    const state = gradeCard({}, cardId('Q1'), 'good', NOW);
    const cards = [{ question: 'Q1' }, { question: 'Q2' }];
    expect(isDue(state[cardId('Q1')], NOW)).toBe(false);
    expect(isDue(state[cardId('Q2')], NOW)).toBe(true);
    expect(countDue(cards, state, NOW)).toBe(1);
  });

  it('cards become due again after their interval passes', () => {
    const state = gradeCard({}, cardId('Q1'), 'good', NOW);
    const cards = [{ question: 'Q1' }];
    expect(countDue(cards, state, NOW)).toBe(0);
    expect(countDue(cards, state, NOW + DAY + 1)).toBe(1);
  });
});

describe('loadSrsState', () => {
  it('returns a usable store object in node (no localStorage)', () => {
    const store = loadSrsState();
    expect(typeof store).toBe('object');
    expect(store).not.toBeNull();
  });
});
