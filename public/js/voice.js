/**
 * Zana AI — Voice Module
 * Web Speech API: Speech-to-Text (STT) + Text-to-Speech (TTS)
 */

'use strict';

const VoiceModule = (() => {
  let recognition = null;
  let isListening = false;
  let synthesis   = window.speechSynthesis;
  let currentUtterance = null;

  // ─── Speech Recognition (STT) ─────────────────────────────────────────────
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSTTSupported = !!SpeechRecognition;
  const isTTSSupported = !!synthesis;

  function getLangCode(lang) {
    const map = { ku: 'ar-IQ', ar: 'ar-SA', en: 'en-US' };
    return map[lang] || 'en-US';
  }

  function startListening(lang) {
    if (!isSTTSupported) {
      Toast.show('Voice input is not supported in this browser. Try Chrome.', 'warning');
      return;
    }
    if (isListening) { stopListening(); return; }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getLangCode(lang || ZanaApp.lang);
    recognition.maxAlternatives = 1;

    const btnVoice = document.getElementById('btn-voice');
    const textarea = document.getElementById('chat-textarea');

    recognition.onstart = () => {
      isListening = true;
      btnVoice?.classList.add('active');
      Toast.show(t('voiceStart'), 'info', 2000);
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (textarea) {
        textarea.value = transcript;
        textarea.dispatchEvent(new Event('input'));
      }
    };

    recognition.onerror = (event) => {
      console.warn('Voice recognition error:', event.error);
      if (event.error !== 'aborted') {
        Toast.show('Voice input error. Please try again.', 'warning');
      }
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
      // Auto-send if we got content
      const textarea = document.getElementById('chat-textarea');
      if (textarea?.value.trim() && document.getElementById('btn-send')) {
        // Focus so user can review before sending
        textarea.focus();
      }
    };

    recognition.start();
  }

  function stopListening() {
    isListening = false;
    const btnVoice = document.getElementById('btn-voice');
    btnVoice?.classList.remove('active');
    try { recognition?.stop(); } catch (_) {}
    recognition = null;
  }

  // ─── Text-to-Speech (TTS) ─────────────────────────────────────────────────
  function speak(text, lang) {
    if (!isTTSSupported) return;

    // Stop any current speech
    synthesis.cancel();

    // Clean text (remove markdown syntax)
    const cleaned = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`[^`]+`/g, '')
      .replace(/[#*_\[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 3000);

    if (!cleaned) return;

    currentUtterance = new SpeechSynthesisUtterance(cleaned);
    currentUtterance.lang = getLangCode(lang || ZanaApp.lang);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;

    // Try to use a good voice
    const voices = synthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(currentUtterance.lang.split('-')[0]));
    if (preferred) currentUtterance.voice = preferred;

    synthesis.speak(currentUtterance);
  }

  function stopSpeaking() {
    synthesis?.cancel();
    currentUtterance = null;
  }

  // ─── Bind voice button ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-voice');
    if (btn) {
      if (!isSTTSupported) {
        btn.style.opacity = '0.4';
        btn.title = 'Voice input not supported in this browser';
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          startListening(ZanaApp.lang);
        });
      }
    }

    // Voice output toggle button
    const voiceOutputBtn = document.getElementById('btn-voice-output');
    voiceOutputBtn?.addEventListener('click', () => {
      const isActive = voiceOutputBtn.classList.toggle('active');
      voiceOutputBtn.setAttribute('aria-pressed', String(isActive));
      const toggle = document.getElementById('setting-voice-output');
      if (toggle) toggle.checked = isActive;
    });
  });

  return { startListening, stopListening, speak, stopSpeaking, isSTTSupported, isTTSSupported };
})();

window.VoiceModule = VoiceModule;
