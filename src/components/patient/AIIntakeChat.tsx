import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Send, Volume2, VolumeX, Sparkles, AlertTriangle,
  CheckCircle2, FileText, ArrowRight, RefreshCw, ShieldAlert, Sparkle
} from 'lucide-react';
import { ConversationMessage, LanguageCode, TriagePriority, ClinicalSession } from '../../types';
import { AIIntakeEngine } from '../../services/aiIntakeEngine';
import { SpeechService } from '../../services/speechService';
import { db } from '../../services/mockDatabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { WaveformVisualizer } from '../common/WaveformVisualizer';

interface AIIntakeChatProps {
  onIntakeCompleted: (session: ClinicalSession) => void;
  onEmergencyTriggered: (alertId: string) => void;
}

export const AIIntakeChat: React.FC<AIIntakeChatProps> = ({
  onIntakeCompleted,
  onEmergencyTriggered
}) => {
  const { currentUser, patientProfile } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { showToast, triggerEmergencyAlertAudio } = useNotification();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentPriority, setCurrentPriority] = useState<TriagePriority>('GREEN');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(`ses-${Date.now()}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIntakeDone, setIsIntakeDone] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize intake session with personalized welcome message across all 8 languages
  useEffect(() => {
    const welcomeMessages: Record<LanguageCode, string> = {
      en: `Hello ${currentUser?.fullName || 'there'}, I'm your MediBridge AI Clinical Intake Assistant. Tell me in your own words: **What main symptoms or health concerns are you experiencing today?**`,
      hi: `नमस्ते ${currentUser?.fullName || ''}, मैं आपका मेडिब्रिज एआई क्लिनिकल असिस्टेंट हूँ। कृपया बताएं: **आज आपको क्या मुख्य शारीरिक समस्या या लक्षण महसूस हो रहे हैं?**`,
      mr: `नमस्कार ${currentUser?.fullName || ''}, मी तुमचा मेडिब्रिज एआय क्लिनिकल सहाय्यक आहे. कृपया सांगा: **आज तुम्हाला नेमका काय त्रास किंवा लक्षणे जाणवत आहेत?**`,
      ur: `ہیلو ${currentUser?.fullName || ''}، میں آپ کا میڈی برج اے آئی کلینیکل انٹیک اسسٹنٹ ہوں۔ براہ کرم بتائیں: **آج آپ کو کون سی اہم علامات یا تکلیف محسوس ہو رہی ہے؟**`,
      kn: `ನಮಸ್ಕಾರ ${currentUser?.fullName || ''}, ನಾನು ನಿಮ್ಮ ಮೆಡಿಬ್ರಿಡ್ಜ್ ಎಐ ಕ್ಲಿನಿಕಲ್ ಸಹಾಯಕ. ದಯವಿಟ್ಟು ತಿಳಿಸಿ: **ಇಂದು ನಿಮಗೆ ಯಾವ ಮುಖ್ಯ ಲಕ್ಷಣಗಳು ಅಥವಾ ಆರೋಗ್ಯ ತೊಂದರೆಗಳು ಕಾಣಿಸಿಕೊಂಡಿವೆ?**`,
      gu: `નમસ્તે ${currentUser?.fullName || ''}, હું તમારો મેડિબ્રિજ એઆઈ ક્લિનિકલ આસિસ્ટન્ટ છું. કૃપા કરીને જણાવો: **આજે તમને કયા મુખ્ય લક્ષણો અથવા સ્વાસ્થ્ય સમસ્યાઓ અનુભવાઈ રહી છે?**`,
      ta: `வணக்கம் ${currentUser?.fullName || ''}, நான் உங்கள் மெடிபிரிட்ஜ் ஏஐ மருத்துவ உதவியாளர். தயவுசெய்து கூறவும்: **இன்று உங்களுக்கு என்ன முக்கிய அறிகுறிகள் அல்லது உடல்நலப் பிரச்சனைகள் உள்ளன?**`,
      bn: `নমস্কার ${currentUser?.fullName || ''}, আমি আপনার মেডিব্রিজ এআই ক্লিনিকাল অ্যাসিস্ট্যান্ট। অনুগ্রহ করে বলুন: **আজ আপনার কী কী প্রধান লক্ষণ বা স্বাস্থ্য সমস্যা দেখা দিচ্ছে?**`
    };

    const initialQuickReplies: Record<LanguageCode, string[]> = {
      en: [
        'I have a bad cough and fever for 3 days',
        'Acute chest pain with sweating and breathlessness',
        'Severe abdominal pain with nausea',
        'Persistent headache and fever spikes'
      ],
      hi: [
        '3 दिन से खांसी और हल्का बुखार है',
        'सीने में बहुत तेज़ दर्द और पसीना आ रहा है',
        'पेट में तेज दर्द और उल्टी',
        'सर दर्द और चक्कर आ रहे हैं'
      ],
      mr: [
        '३ दिवसांपासून खोकला व ताप आहे',
        'छातीत तीव्र वेदना आणि घाम येत आहे',
        'पोटात खूप दुखणे व मळमळ',
        'डोकेदुखी आणि चक्कर'
      ],
      ur: [
        '۳ دن سے کھانسی اور ہلکا بخار ہے',
        'سینے میں شدید درد اور پسینہ آ رہا ہے',
        'پیٹ میں شدید درد اور الٹی',
        'سر درد اور چکر آنا'
      ],
      kn: [
        '೩ ದಿನಗಳಿಂದ ಕೆಮ್ಮು ಮತ್ತು ಜ್ವರ ಇದೆ',
        'ಎದೆಯಲ್ಲಿ ತೀವ್ರ ನೋವು ಮತ್ತು ಬೆವರು ಬರುತ್ತಿದೆ',
        'ಹೊಟ್ಟೆಯಲ್ಲಿ ತೀವ್ರ ನೋವು ಮತ್ತು ವಾಂತಿ',
        'ತಲೆನೋವು ಮತ್ತು ತಲೆತಿರುಗುವಿಕೆ'
      ],
      gu: [
        '૩ દિવસથી ઉધરસ અને તાવ છે',
        'છાતીમાં ખૂબ જ તીવ્ર દુખાવો અને પરસેવો છે',
        'પેટમાં તીવ્ર દુખાવો અને ઉલ્ટી',
        'માથાનો દુખાવો અને ચક્કર'
      ],
      ta: [
        '3 நாட்களாக இருமல் மற்றும் காய்ச்சல் உள்ளது',
        'நெஞ்சில் கடுமையான வலி மற்றும் வியர்வை',
        'வயிற்றில் கடுமையான வலி மற்றும் வாந்தி',
        'தலைவலி மற்றும் மயக்கம்'
      ],
      bn: [
        '৩ দিন ধরে কাশি ও জ্বর আছে',
        'বুকে তীব্র ব্যথা ও ঘাম হচ্ছে',
        'পেটে তীব্র ব্যথা ও বমি',
        'মাথাব্যথা ও মাথা ঘোরা'
      ]
    };

    const initialMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      sessionId: activeSessionId,
      sender: 'AI_CLINICAL_INTAKE',
      text: welcomeMessages[language] || welcomeMessages.en,
      language: language,
      timestamp: new Date().toISOString(),
      suggestedQuickReplies: initialQuickReplies[language] || initialQuickReplies.en
    };

    setMessages([initialMsg]);
    // Speak welcome message
    SpeechService.speak(initialMsg.text, language, () => setIsSpeaking(false));
    setIsSpeaking(true);
  }, [language, activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSendMessage = (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isProcessing) return;

    // Stop speaking if playing
    SpeechService.stopSpeaking();
    setIsSpeaking(false);

    // Patient message
    const userMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      sessionId: activeSessionId,
      sender: 'PATIENT',
      text: messageContent,
      language: language,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputText('');
    setIsProcessing(true);

    // Analyze through AI Clinical Engine
    setTimeout(() => {
      const result = AIIntakeEngine.analyzeInput(messageContent, updatedHistory, language);

      const aiMsg: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        sessionId: activeSessionId,
        sender: 'AI_CLINICAL_INTAKE',
        text: result.nextBotMessage,
        language: language,
        timestamp: new Date().toISOString(),
        suggestedQuickReplies: result.suggestedReplies
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsProcessing(false);

      // Play Speech Audio
      SpeechService.speak(result.nextBotMessage, language, () => setIsSpeaking(false));
      setIsSpeaking(true);

      if (result.isRedFlagTriggered) {
        setCurrentPriority('RED');
        setRedFlags(result.redFlagsDetected);
        triggerEmergencyAlertAudio();

        const pId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : 'pat-001');
        const existingAlerts = db.getEmergencyAlerts();
        const activeEmergency = existingAlerts.find(a =>
          (a.patientId === pId || a.patientName === currentUser?.fullName) &&
          a.status !== 'RESOLVED' && a.status !== 'HANDOVER_COMPLETED'
        );

        if (activeEmergency) {
          // Duplicate Prevention: Update existing active alert with newly detected red flags & patient statements
          const updatedAlert = {
            ...activeEmergency,
            redFlags: Array.from(new Set([...(activeEmergency.redFlags || []), ...result.redFlagsDetected])),
            triggerReason: `${activeEmergency.triggerReason} + ${result.redFlagsDetected.join(' + ')}`,
            originalMessage: messageContent,
            detectedLanguage: language,
            detectedEmergencyConcern: result.translatedConcern || result.redFlagsDetected.join(' + ')
          };
          db.saveEmergencyAlert(updatedAlert);
          onEmergencyTriggered(updatedAlert.id);
        } else {
          // Create new Emergency Alert with patient's statement and live metadata
          const pName = currentUser?.fullName || patientProfile?.fullName || 'Registered Patient';
          const trustedHospitals = db.getTrustedHospitals(pId).filter(t => t.status === 'ACTIVE');
          const registeredHospitals = db.getHospitals();
          const targetHospitalId = trustedHospitals[0]?.hospitalId || (registeredHospitals.length > 0 ? registeredHospitals[0].id : 'HOSP-2026-00101');
          const targetHospitalName = trustedHospitals[0]?.hospitalName || (registeredHospitals.length > 0 ? registeredHospitals[0].name : 'Talegaon General & Emergency Hospital');

          const alertId = `emg-${Date.now()}`;
          const newEmergencyAlert = {
            id: alertId,
            sessionId: activeSessionId,
            patientId: pId,
            patientName: pName,
            patientAge: patientProfile?.age || 35,
            patientGender: patientProfile?.gender || 'Male',
            patientPhone: currentUser?.phone || '+91 98000 00000',
            hospitalId: targetHospitalId,
            hospitalName: targetHospitalName,
            priority: 'RED' as const,
            triggerReason: result.redFlagsDetected.join(' + '),
            redFlags: result.redFlagsDetected,
            originalMessage: messageContent,
            detectedLanguage: language,
            translatedSummary: result.translatedConcern || result.redFlagsDetected.join(' + '),
            detectedEmergencyConcern: result.translatedConcern || result.redFlagsDetected.join(' + '),
            status: 'DISPATCHED' as const,
            timestamp: new Date().toISOString(),
            ambulanceAssigned: {
              vehicleNumber: 'MH-43-AM-2026',
              driverName: 'Sanjay Jadhav (Paramedic unit)',
              driverPhone: '+91 98765 43210',
              etaMinutes: 5,
              currentVitals: {
                bp: '162/98 mmHg',
                pulse: 108,
                spo2: 93,
                temp: '98.6°F',
                respiratoryRate: 26
              },
              liveCoordinates: { lat: 18.7303, lng: 73.6766 }
            }
          };

          db.saveEmergencyAlert(newEmergencyAlert);
          db.addNotification({
            id: `notif-${Date.now()}`,
            recipientRole: 'TRIAGE',
            title: '🚨 AUTOMATIC EMERGENCY RED ALERT',
            message: `${pName} triggered red flag symptoms (${result.redFlagsDetected.join(', ')}). Language: ${language.toUpperCase()}. Original statement: "${messageContent.substring(0, 60)}"`,
            type: 'EMERGENCY',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/triage'
          });

          onEmergencyTriggered(alertId);
        }
      }

      if (result.isComplete) {
        setIsIntakeDone(true);
        setCurrentPriority(result.suggestedTriagePriority);

        // Synthesize structured clinical summary with language metadata
        const summary = AIIntakeEngine.generateStructuredSummary(
          activeSessionId,
          patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : 'pat-001'),
          userMsg.text,
          updatedHistory.map(m => `${m.sender}: ${m.text}`).join('\n'),
          [],
          [],
          language
        );

        const newSession: ClinicalSession = {
          id: activeSessionId,
          patientId: patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : 'pat-001'),
          patientName: currentUser?.fullName || 'Registered Patient',
          patientAge: patientProfile?.age || 35,
          patientGender: patientProfile?.gender || 'Male',
          patientPhone: currentUser?.phone || '+91 98000 00000',
          startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          completedAt: new Date().toISOString(),
          status: result.isRedFlagTriggered ? 'EMERGENCY_TRIGGERED' : 'COMPLETED',
          triagePriority: result.suggestedTriagePriority,
          triageRationale: result.isRedFlagTriggered
            ? 'CRITICAL RED FLAG: Immediate emergency department resuscitation priority.'
            : 'Pre-arrival intake completed from home with clinical history synthesis.',
          chiefComplaint: userMsg.text,
          originalLanguage: language,
          originalPatientStatement: userMsg.text,
          translatedSummary: result.translatedConcern || userMsg.text,
          selectedHospitalId: 'hosp-001',
          selectedDepartmentId: 'dept-002',
          targetDoctorId: 'doc-001',
          redFlagsDetected: result.redFlagsDetected,
          isRedFlagTriggered: result.isRedFlagTriggered,
          aiSummary: summary
        };

        db.saveClinicalSession(newSession);
        db.logAction(
          currentUser?.id || 'usr-pat',
          currentUser?.fullName || 'Registered Patient',
          'PATIENT',
          'INTAKE_COMPLETED',
          'ClinicalSession',
          activeSessionId,
          `Completed AI intake (${language.toUpperCase()}). Priority: ${result.suggestedTriagePriority}`
        );

        onIntakeCompleted(newSession);
      }
    }, 900);
  };

  const toggleVoiceListen = () => {
    if (isListening) {
      setIsListening(false);
      SpeechService.stopSpeaking();
    } else {
      setIsListening(true);
      SpeechService.stopSpeaking();
      setIsSpeaking(false);

      SpeechService.startListening(
        language,
        transcript => {
          setInputText(transcript);
        },
        err => {
          setIsListening(false);
          showToast('Voice Input', t('speech_error'), 'INFO');
        },
        () => {
          setIsListening(false);
        }
      );
    }
  };

  const handleRestartChat = () => {
    SpeechService.stopSpeaking();
    setIsSpeaking(false);
    setIsListening(false);
    setIsIntakeDone(false);
    setRedFlags([]);
    setCurrentPriority('GREEN');
    setActiveSessionId(`ses-${Date.now()}`);
  };

  return (
    <div className="flex flex-col h-[600px] sm:h-[680px] bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">{t('talk_to_ai')}</h3>
              <span className="text-[10px] uppercase font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                {language.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('talk_to_ai_sub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase flex items-center gap-1.5 ${
            currentPriority === 'RED'
              ? 'bg-red-50 text-red-700 border border-red-300 animate-pulse'
              : currentPriority === 'ORANGE'
              ? 'bg-amber-50 text-amber-800 border border-amber-300'
              : currentPriority === 'YELLOW'
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-300'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              currentPriority === 'RED' ? 'bg-red-600 animate-ping' : 'bg-emerald-500'
            }`} />
            <span>{currentPriority} STAT</span>
          </div>

          <button
            onClick={handleRestartChat}
            className="p-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 shadow-sm transition"
            title="Restart Intake"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Red Flag Banner (Emergency indicator remains red) */}
      {redFlags.length > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex items-center justify-between text-red-800 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider">{t('emergency_callout')}</span>
              <p className="text-[11px] text-red-700 line-clamp-1">
                {redFlags.join(' • ')}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-red-600 text-white px-2 py-0.5 rounded font-bold uppercase shadow-sm">
            ER NOTIFIED
          </span>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'PATIENT';
          const isMsgUrdu = language === 'ur' || /[\u0600-\u06FF]/.test(msg.text);
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-teal-600 text-white rounded-br-none shadow-md shadow-teal-600/10'
                    : msg.text.includes('🚨')
                    ? 'bg-red-50 border border-red-200 text-red-950 rounded-bl-none font-medium'
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                }`}
              >
                <p
                  dir={isMsgUrdu ? 'rtl' : 'ltr'}
                  className={`whitespace-pre-line ${isMsgUrdu ? 'text-right font-urdu leading-loose' : 'text-left'}`}
                >
                  {msg.text}
                </p>
                <div className={`mt-2 flex items-center gap-2 text-[10px] ${
                  isUser ? 'text-teal-100 justify-end' : 'text-slate-400 justify-start'
                }`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {!isUser && isSpeaking && msg.id === messages[messages.length - 1]?.id && (
                    <span className="flex items-center gap-1 text-teal-600 animate-pulse font-mono font-semibold">
                      <Volume2 className="w-3 h-3" />
                      <span>Speaking</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Reply Suggestions */}
              {!isUser && msg.suggestedQuickReplies && msg.suggestedQuickReplies.length > 0 && !isIntakeDone && (
                <div className="mt-3 flex flex-wrap gap-2 max-w-[90%] sm:max-w-[85%]">
                  {msg.suggestedQuickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(reply)}
                      disabled={isProcessing}
                      dir={language === 'ur' ? 'rtl' : 'ltr'}
                      className="text-xs bg-white hover:bg-teal-50 text-teal-800 hover:text-teal-900 border border-slate-200 hover:border-teal-400 px-3.5 py-1.5 rounded-full transition transform active:scale-95 text-left shadow-sm font-medium"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-slate-500 text-xs p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
            <span className="ml-1 text-[11px] font-mono">Analyzing symptoms in {language.toUpperCase()}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Waveform Overlay when listening */}
      {isListening && (
        <div className="p-3 bg-red-50 border-t border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            <span className="text-xs text-red-700 font-bold uppercase tracking-wider">
              {t('voice_input_stop')} ({language.toUpperCase()})
            </span>
          </div>
          <WaveformVisualizer isActive={isListening} color="#dc2626" />
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Microphone Toggle */}
          <button
            type="button"
            onClick={toggleVoiceListen}
            className={`p-3 rounded-xl transition shadow-sm ${
              isListening
                ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
            }`}
            title={isListening ? 'Stop Listening' : t('voice_input_start')}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            dir={language === 'ur' ? 'rtl' : 'ltr'}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={t('chat_placeholder')}
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition shadow-sm"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-md shadow-teal-600/20 transition transform active:scale-95"
            title={t('send_btn')}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
          <span className="flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
            <span>{t('requires_verification')}</span>
          </span>
          <span className="font-mono text-slate-400">v2.4 Multilingual AI</span>
        </div>
      </div>
    </div>
  );
};
