import { showExportToast } from './export-manager.js';

/**
 * Voice to Notes Module — Web Speech API speech-to-text into the note editor.
 * Functions: startVoiceRecording
 * Depends on: state.js (S), render-pipeline.js (renderText), persistence.js
 * (autosave). window.showExportToast remains a namespace read (self-published
 * by export-manager.js).
 * Extracted from index.js (docs/roadmap.md Phase 1).
 */
import { S } from './state.js';
import { renderText } from './render-pipeline.js';
import { autosave } from './persistence.js';

(function () {
  'use strict';

  let voiceRecognition = null;
  let voiceRecording = false;

  function startVoiceRecording() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser. Try Chrome.');
      return;
    }
    if (voiceRecording && voiceRecognition) {
      voiceRecognition.stop();
      voiceRecording = false;
      document.getElementById('voice-toast').classList.add('hidden');
      document.getElementById('btn-voice').classList.remove('active');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceRecognition = new SpeechRecognition();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = 'en-US';
    voiceRecognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        const textarea = document.getElementById('text-input');
        if (textarea) {
          const current = textarea.value;
          const newText = current ? current + '\n' + finalTranscript : finalTranscript;
          textarea.value = newText;
          S.text = newText;
          renderText(S.text);
          autosave();
        }
      }
    };
    voiceRecognition.onerror = (event) => {
      voiceRecording = false;
      document.getElementById('voice-toast').classList.add('hidden');
      document.getElementById('btn-voice').classList.remove('active');
      const messages = {
        'not-allowed': 'Microphone permission denied — allow mic access in the browser to use Voice to Notes.',
        'service-not-allowed': 'Speech recognition is blocked by browser or OS settings.',
        'audio-capture': 'No microphone found. Connect one and try again.',
        'network': 'Speech recognition needs a network connection.',
        'no-speech': 'No speech detected — try speaking a bit closer to the microphone.',
      };
      const msg = messages[event && event.error];
      if (msg) {
        showExportToast(msg, 'error');
      }
    };
    voiceRecognition.onend = () => {
      voiceRecording = false;
      document.getElementById('voice-toast').classList.add('hidden');
      document.getElementById('btn-voice').classList.remove('active');
    };
    voiceRecognition.start();
    voiceRecording = true;
    document.getElementById('voice-toast').classList.remove('hidden');
    document.getElementById('btn-voice').classList.add('active');
  }

  window.VoiceNotes = { startVoiceRecording, isRecording: () => voiceRecording };
  // Inline onclick handler in index.html resolves this as a global
  window.startVoiceRecording = startVoiceRecording;
})();
