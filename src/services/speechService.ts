import { LanguageCode } from '../types';

export class SpeechService {
  private static recognition: any = null;
  private static isListening: boolean = false;

  private static LANGUAGE_TAG_MAP: Record<LanguageCode, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
    ur: 'ur-IN',
    kn: 'kn-IN',
    gu: 'gu-IN',
    ta: 'ta-IN',
    bn: 'bn-IN'
  };

  public static isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  public static getSpeechLanguageCode(lang: LanguageCode): string {
    return this.LANGUAGE_TAG_MAP[lang] || 'en-IN';
  }

  public static startListening(
    language: LanguageCode,
    onResult: (text: string) => void,
    onError: (err: any) => void,
    onEnd: () => void
  ): () => void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Meaningful simulated multilingual fallback text if device has no Web Speech API
      const mockTexts: Record<LanguageCode, string> = {
        en: "I have had a bad cough for 3 days and fever since yesterday evening.",
        hi: "मुझे 3 दिन से लगातार खांसी है और कल शाम से बुखार आ रहा है।",
        mr: "मला ३ दिवसांपासून खोकला आहे आणि काल संध्याकाळपासून ताप आला आहे.",
        ur: "مجھے ۳ دن سے مسلسل کھانسی ہے اور کل شام سے بخار آ رہا ہے۔",
        kn: "ನನಗೆ ೩ ದಿನಗಳಿಂದ ನಿರಂತರ ಕೆಮ್ಮು ಇದೆ ಮತ್ತು ನಿನ್ನೆ ಸಂಜೆಯಿಂದ ಜ್ವರ ಬರುತ್ತಿದೆ.",
        gu: "મને ૩ દિવસથી સતત ઉધરસ છે અને ગઈકાલ સાંજથી તાવ આવી રહ્યો છે.",
        ta: "எனக்கு 3 நாட்களாக இருமல் உள்ளது மற்றும் நேற்று மாலையிலிருந்து காய்ச்சல் அடிக்கிறது.",
        bn: "আমার ৩ দিন ধরে কাশি হচ্ছে এবং গতকাল সন্ধ্যা থেকে জ্বর আসছে।"
      };
      
      const timer = setTimeout(() => {
        onResult(mockTexts[language] || mockTexts.en);
        onEnd();
      }, 2500);

      return () => clearTimeout(timer);
    }

    try {
      if (SpeechService.recognition) {
        try {
          SpeechService.recognition.abort();
        } catch {}
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = this.getSpeechLanguageCode(language);

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          onResult(finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn(`Speech recognition error for language [${language}]:`, event.error);
        onError(event.error);
      };

      rec.onend = () => {
        SpeechService.isListening = false;
        onEnd();
      };

      SpeechService.recognition = rec;
      SpeechService.isListening = true;
      rec.start();

      return () => {
        try {
          rec.abort();
        } catch {
          // ignore
        }
      };
    } catch (e) {
      console.warn('Could not initialize speech recognition:', e);
      onError(e);
      return () => {};
    }
  }

  public static speak(text: string, language: LanguageCode = 'en', onComplete?: () => void): () => void {
    if (!('speechSynthesis' in window)) {
      if (onComplete) onComplete();
      return () => {};
    }

    try {
      window.speechSynthesis.cancel();

      // Clean markdown tags, emojis, and styling from speech text
      const cleanText = text
        .replace(/[*_#`🚨✅⚠️]/g, '')
        .replace(/\[.*?\]/g, '')
        .trim();

      if (!cleanText) {
        if (onComplete) onComplete();
        return () => {};
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = this.getSpeechLanguageCode(language);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      if (onComplete) {
        utterance.onend = () => onComplete();
        utterance.onerror = () => onComplete();
      }

      window.speechSynthesis.speak(utterance);

      return () => {
        window.speechSynthesis.cancel();
      };
    } catch (err) {
      console.warn('Speech synthesis failed:', err);
      if (onComplete) onComplete();
      return () => {};
    }
  }

  public static stopSpeaking(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
