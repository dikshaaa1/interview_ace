const Voice = (() => {
  'use strict';

  let recognition = null;
  let _isListening = false;

  function speak(text, onEnd) {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = 0.95;
    utt.pitch  = 1;
    utt.volume = 1;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
    return utt;
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
  }

  function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function startListening(onInterim, onFinal, onError) {
    if (!isSupported()) {
      if (onError) onError('Speech recognition is not supported in this browser');
      return false;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SR();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';

    recognition.onresult = e => {
      let interim = '';
      let final   = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final   += t;
        else                      interim += t;
      }
      if (interim && onInterim) onInterim(interim);
      if (final   && onFinal)   onFinal(final);
    };

    recognition.onerror = e => {
      if (e.error !== 'aborted' && onError) onError(e.error);
      _isListening = false;
    };

    recognition.onend = () => { _isListening = false; };

    recognition.start();
    _isListening = true;
    return true;
  }

  function stopListening() {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
    _isListening = false;
  }

  function getIsListening() { return _isListening; }

  return { speak, stopSpeaking, startListening, stopListening, isSupported, getIsListening };
})();
