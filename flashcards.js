/**
 * Flashcards & Study Mode Module
 * Functions: extractFlashcards, toggleStudyMode, loadFlashcardsFromText,
 *            openFlashcardsModal, closeFlashcardsModal, renderFlashcard,
 *            flipFlashcard, nextFlashcard, prevFlashcard
 * Depends on: state.js (S), text-layout.js (parseRichSyntax).
 * Extracted from index.js (docs/roadmap.md Phase 1).
 *
 * M2 pass: unwrapped from the IIFE into a plain ES module; S and TextLayout
 * are static imports now. The window.Flashcards namespace (and the inline-
 * handler globals) stay self-published for ui-bindings.js and e2e specs, and
 * extractFlashcards is a named export for flashcards.test.js.
 */
import { S } from './state.js';
import { parseRichSyntax } from './text-layout.js';

let studyModeActive = false;
let flashcards = [];
let currentFlashcardIdx = 0;
let flashcardFlipped = false;

// Pure: pull Q:/A: pairs out of raw text (fallback when parseRichSyntax finds none)
export function extractFlashcards(text) {
  const cards = [];
  const lines = String(text || '').split('\n');
  let currentQ = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^Q[:.]\s/.test(trimmed)) {
      currentQ = trimmed.replace(/^Q[:.]\s*/, '');
    } else if (/^A[:.]\s/.test(trimmed) && currentQ) {
      cards.push({ question: currentQ, answer: trimmed.replace(/^A[:.]\s*/, '') });
      currentQ = null;
    }
  }
  return cards;
}

/* ───────────────────────────────────────────
   SPACED REPETITION — SM-2 lite (Phase F1)
   Card identity is an FNV-1a hash of the question text, so schedules survive
   answer edits and card reordering. Grades follow a 4-button Anki-style flow:
   again (lapse), hard, good, easy. The store lives in localStorage under
   'inkflow-srs'; node tests get an in-memory fallback.
─────────────────────────────────────────── */
const SRS_KEY = 'inkflow-srs';
const SRS_MEMORY_STORE = {};

// FNV-1a 32-bit over the question text → stable per-card id
export function cardId(question) {
  let h = 0x811c9dc5;
  const s = String(question || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'c' + h.toString(36);
}

export function loadSrsState() {
  if (typeof localStorage === 'undefined') return SRS_MEMORY_STORE;
  try {
    return JSON.parse(localStorage.getItem(SRS_KEY)) || SRS_MEMORY_STORE;
  } catch (_e) {
    return SRS_MEMORY_STORE;
  }
}

export function saveSrsState(state) {
  if (typeof localStorage === 'undefined') {
    Object.keys(SRS_MEMORY_STORE).forEach((k) => delete SRS_MEMORY_STORE[k]);
    Object.assign(SRS_MEMORY_STORE, state);
    return;
  }
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(state));
  } catch (_e) {
    // quota — review history is non-critical, drop silently
  }
}

// grade: 'again' | 'hard' | 'good' | 'easy' → new state with the card rescheduled
export function gradeCard(state, id, grade, now = Date.now()) {
  const DAY = 86400000;
  const card = state[id] || { ease: 2.5, interval: 0, due: 0, reps: 0 };
  let { ease, interval } = card;
  switch (grade) {
    case 'again':
      ease = Math.max(1.3, ease - 0.2);
      interval = 0;
      break;
    case 'hard':
      ease = Math.max(1.3, ease - 0.15);
      interval = interval === 0 ? 1 : Math.max(1, interval * 1.2);
      break;
    case 'good':
      interval = interval === 0 ? 1 : interval * ease;
      break;
    case 'easy':
      ease = Math.min(3, ease + 0.15);
      interval = interval === 0 ? 3 : interval * ease * 1.3;
      break;
    default:
      break;
  }
  const next = {
    ease: Math.round(ease * 100) / 100,
    interval: Math.round(interval * 100) / 100,
    reps: (card.reps || 0) + 1,
    due: interval === 0 ? now : now + interval * DAY,
  };
  return { ...state, [id]: next };
}

export function isDue(card, now = Date.now()) {
  return !card || !card.due || card.due <= now;
}

export function countDue(cards, state, now = Date.now()) {
  return cards.filter((c) => isDue(state[cardId(c.question)], now)).length;
}

function loadFlashcardsFromText() {
  flashcards = [];
  currentFlashcardIdx = 0;
  flashcardFlipped = false;
  const text = S.text || '';
  const { flashcards: parsed } = parseRichSyntax(text);
  if (parsed && parsed.length > 0) {
    flashcards = parsed;
  }
  // Also extract from Q:/A: patterns if parseRichSyntax didn't catch them
  if (flashcards.length === 0) {
    flashcards = extractFlashcards(text);
  }
}

function toggleStudyMode() {
  studyModeActive = !studyModeActive;
  document.body.classList.toggle('study-mode', studyModeActive);
  if (studyModeActive) {
    loadFlashcardsFromText();
    if (flashcards.length > 0) {
      openFlashcardsModal();
    } else {
      alert('No flashcards found. Use Q: and A: format in your text:\n\nQ: What is photosynthesis?\nA: The process by which plants convert light to energy.');
    }
  } else {
    closeFlashcardsModal();
  }
}

function openFlashcardsModal() {
  if (flashcards.length === 0) return;
  document.getElementById('flashcards-modal').classList.remove('hidden');
  currentFlashcardIdx = 0;
  updateDueBadge();
  renderFlashcard();
}

function updateDueBadge() {
  const badge = document.getElementById('flashcard-due-badge');
  if (!badge) return;
  const due = countDue(flashcards, loadSrsState());
  badge.textContent = due > 0 ? `📅 ${due} due` : '✓ all reviewed';
  badge.classList.toggle('flashcard-due-zero', due === 0);
  badge.classList.remove('hidden');
}

function closeFlashcardsModal() {
  document.getElementById('flashcards-modal').classList.add('hidden');
}

function renderFlashcard() {
  if (flashcards.length === 0) return;
  const fc = flashcards[currentFlashcardIdx];
  document.getElementById('flashcard-counter').textContent = `${currentFlashcardIdx + 1} / ${flashcards.length}`;
  document.getElementById('flashcard-front').textContent = fc.question;
  document.getElementById('flashcard-back').textContent = fc.answer;
  const inner = document.getElementById('flashcard-inner');
  inner.style.transform = flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';
  document.getElementById('flashcard-hint').textContent = flashcardFlipped ? 'Click to see question' : 'Click to flip';
  // Grade buttons only make sense once the answer is showing
  document.getElementById('flashcard-grade-row')?.classList.toggle('hidden', !flashcardFlipped);
}

function gradeCurrent(grade) {
  if (flashcards.length === 0) return;
  const fc = flashcards[currentFlashcardIdx];
  const state = gradeCard(loadSrsState(), cardId(fc.question), grade);
  saveSrsState(state);
  updateDueBadge();
  nextFlashcard();
}

function flipFlashcard() {
  flashcardFlipped = !flashcardFlipped;
  renderFlashcard();
}

function nextFlashcard() {
  if (flashcards.length === 0) return;
  flashcardFlipped = false;
  currentFlashcardIdx = (currentFlashcardIdx + 1) % flashcards.length;
  renderFlashcard();
}

function prevFlashcard() {
  if (flashcards.length === 0) return;
  flashcardFlipped = false;
  currentFlashcardIdx = (currentFlashcardIdx - 1 + flashcards.length) % flashcards.length;
  renderFlashcard();
}

// Keyboard navigation inside Flashcards modal + Study Mode escape hatch.
// Guarded like script-detector.js: flashcards.test.js imports this module in
// vitest's node environment (no document/window).
if (typeof window !== 'undefined') {
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('flashcards-modal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextFlashcard();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      prevFlashcard();
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON' && document.activeElement.id !== 'flashcard-card') {
        return;
      }
      e.preventDefault();
      flipFlashcard();
    } else if (flashcardFlipped && ['1', '2', '3', '4'].includes(e.key)) {
      // SM-2 lite grades on the flipped card: 1=again, 2=hard, 3=good, 4=easy
      e.preventDefault();
      gradeCurrent(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]);
    }
  });

  // Escape exits Study Mode when no modal is open (the app-wide Escape handler
  // in ui-bindings.js closes open modals first — defer to it while this modal shows).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !studyModeActive) return;
    const modal = document.getElementById('flashcards-modal');
    if (modal && !modal.classList.contains('hidden')) return;
    toggleStudyMode();
  });

  window.Flashcards = {
    extractFlashcards,
    toggleStudyMode,
    loadFlashcardsFromText,
    openFlashcardsModal,
    closeFlashcardsModal,
    renderFlashcard,
    flipFlashcard,
    nextFlashcard,
    prevFlashcard,
    gradeCurrent,
    updateDueBadge,
    countDue,
    cardId,
  };
  // Inline onclick handlers in index.html resolve these as globals
  window.toggleStudyMode = toggleStudyMode;
  window.closeFlashcardsModal = closeFlashcardsModal;
  window.flipFlashcard = flipFlashcard;
  window.nextFlashcard = nextFlashcard;
  window.prevFlashcard = prevFlashcard;

  // SM-2 lite grade buttons (Phase F1) — owned by this module
  const gradeRow = document.getElementById('flashcard-grade-row');
  gradeRow?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-grade]');
    if (btn) gradeCurrent(btn.dataset.grade);
  });
}
