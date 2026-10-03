/**
 * i18n.js — UI localization (Phase F6, first slice)
 *
 * String-table engine + a Hindi (हिंदी) translation of the most visible chrome:
 * toolbar buttons, sidebar section headers, primary actions, and page navigation.
 * Coverage note: sliders, comboboxes, and AI/AI-panel body strings remain English
 * in this slice — extend the tables + add data-i18n attributes to grow coverage.
 *
 * Usage: elements declare `data-i18n="key"`; the engine sets textContent for the
 * active language on load and on language switch. The language is persisted in
 * localStorage ('inkforge-lang') and toggled via #lang-toggle in the toolbar.
 */

export const LANGUAGES = [
  { id: 'en', label: 'EN', switchLabel: 'हिं', name: 'English' },
  { id: 'hi', label: 'हिं', switchLabel: 'EN', name: 'हिंदी' },
];

const STRINGS = {
  en: {
    'toolbar.animate': 'Animate',
    'toolbar.clear': 'Clear',
    'toolbar.study': 'Study',
    'toolbar.voice': 'Voice',
    'toolbar.about': 'About',
    'section.textInput': 'Text Input',
    'section.fontStyle': 'Font & Style',
    'section.collab': 'Collaboration',
    'section.paper': 'Paper Style',
    'section.layout': 'Page Layout',
    'section.layers': 'Layer Manager',
    'section.effects': 'Ink Effects',
    'section.ai': 'AI Features',
    'section.export': 'Export',
    'section.notebooks': 'Notebooks',
    'section.animation': 'Animation',
    'action.render': 'Render',
    'action.clearText': 'Clear Text',
    'action.start': 'Start',
    'action.stop': 'Stop',
    'action.connect': 'Connect to Session',
    'action.resetDefaults': 'Reset Defaults',
    'flashcards.title': 'Flashcards Review',
    'paper.ruled': 'Ruled',
    'paper.clean': 'Clean',
    'paper.plain': 'Plain',
    'paper.grid': 'Grid',
    'paper.legal': 'Legal Pad',
    'paper.vintage': 'Vintage',
    'paper.dark': 'Dark',
    'paper.dotgrid': 'Dot Grid',
    'paper.engineering': 'Engineering',
    'paper.music': 'Music Staff',
    'paper.dated': 'Dated',
    'export.copy': 'Copy',
    'export.print': 'Print',
  },
  hi: {
    'toolbar.animate': 'एनिमेट',
    'toolbar.clear': 'साफ़ करें',
    'toolbar.study': 'अध्ययन',
    'toolbar.voice': 'आवाज़',
    'toolbar.about': 'परिचय',
    'section.textInput': 'टेक्स्ट इनपुट',
    'section.fontStyle': 'फ़ॉन्ट और स्टाइल',
    'section.collab': 'सहयोग',
    'section.paper': 'पेपर स्टाइल',
    'section.layout': 'पेज लेआउट',
    'section.layers': 'लेयर मैनेजर',
    'section.effects': 'स्याही प्रभाव',
    'section.ai': 'AI सुविधाएँ',
    'section.export': 'निर्यात',
    'section.notebooks': 'नोटबुक्स',
    'section.animation': 'एनीमेशन',
    'action.render': 'रेंडर',
    'action.clearText': 'साफ़ करें',
    'action.start': 'शुरू',
    'action.stop': 'रोकें',
    'action.connect': 'सेशन से जुड़ें',
    'action.resetDefaults': 'डिफ़ॉल्ट पर लौटें',
    'flashcards.title': 'फ़्लैशकार्ड समीक्षा',
    'paper.ruled': 'रूल्ड',
    'paper.clean': 'साफ़',
    'paper.plain': 'सादा',
    'paper.grid': 'ग्रिड',
    'paper.legal': 'कानूनी पैड',
    'paper.vintage': 'विंटेज',
    'paper.dark': 'डार्क',
    'paper.dotgrid': 'डॉट ग्रिड',
    'paper.engineering': 'इंजीनियरिंग',
    'paper.music': 'म्यूज़िक स्टाफ',
    'paper.dated': 'डेटेड',
    'export.copy': 'कॉपी',
    'export.print': 'प्रिंट',
  },
};

const LANG_KEY = 'inkforge-lang';

export function getLanguage() {
  if (typeof localStorage === 'undefined') return 'en';
  const saved = localStorage.getItem(LANG_KEY);
  return saved && STRINGS[saved] ? saved : 'en';
}

export function setLanguage(lang) {
  if (!STRINGS[lang]) return;
  if (typeof localStorage !== 'undefined') localStorage.setItem(LANG_KEY, lang);
  applyTranslations();
}

// t(key): the active language's string, falling back to English, then the key
export function t(key) {
  const lang = getLanguage();
  return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS.en && STRINGS.en[key]) || key;
}

function applyTranslations() {
  // node environments (tests) have no DOM — the tables are still usable via t()
  if (typeof document === 'undefined') return;
  document.documentElement.lang = getLanguage() === 'hi' ? 'hi' : 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  // switch label shows the OTHER language
  const toggle = document.getElementById('lang-toggle');
  if (toggle) toggle.textContent = getLanguage() === 'hi' ? 'EN' : 'हिं';
}

export function initI18n() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = getLanguage() === 'hi' ? 'hi' : 'en';
  applyTranslations();
  const toggle = document.getElementById('lang-toggle');
  toggle?.addEventListener('click', () => {
    setLanguage(getLanguage() === 'hi' ? 'en' : 'hi');
  });
}

// Export for node tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LANGUAGES, STRINGS, getLanguage, setLanguage, t, initI18n };
}
