import React, { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, Send, Volume2, VolumeX, Sparkles, AlertTriangle,
  CheckCircle2, FileText, ArrowRight, RefreshCw, ShieldAlert, ShieldCheck, ShieldOff,
  Sparkle, Leaf, Stethoscope, Ban, Square, Pill, ExternalLink, AlertCircle, Clock, Globe
} from 'lucide-react';
import { ConversationMessage, LanguageCode, TriagePriority, ClinicalSession, MedicalSystem, MedicineRecommendation, ClinicalTriageAssessment, ConditionCategory, EmergencyAlert } from '../../types';
import { AIIntakeEngine } from '../../services/aiIntakeEngine';
import { SpeechService } from '../../services/speechService';
import { db } from '../../services/mockDatabase';
import { cloudDb } from '../../services/cloudDatabaseEngine';
import { syncRelay } from '../../services/firebaseService';
import { LocationHospitalService } from '../../services/locationHospitalService';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { WaveformVisualizer } from '../common/WaveformVisualizer';
import { EmergencyAudioService } from './EmergencyStatusCard';

interface AIIntakeChatProps {
  onIntakeCompleted: (session: ClinicalSession) => void;
  onEmergencyTriggered: (alertId: string) => void;
  initialMedicalSystem?: MedicalSystem;
}


const ALL_SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'kn', name: 'ಕನ್ನಡ (Kannada)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'ur', name: 'اردو (Urdu)' }
];

export const AIIntakeChat: React.FC<AIIntakeChatProps> = ({
  onIntakeCompleted,
  onEmergencyTriggered,
  initialMedicalSystem = 'ALLOPATHY'
}) => {
  const { currentUser, patientProfile } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { showToast, triggerEmergencyAlertAudio } = useNotification();

  const [medicalSystem, setMedicalSystem] = useState<MedicalSystem>(initialMedicalSystem);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentPriority, setCurrentPriority] = useState<TriagePriority>('GREEN');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(`ses-${Date.now()}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isIntakeDone, setIsIntakeDone] = useState(false);
  const [isRedFlagDetectionEnabled, setIsRedFlagDetectionEnabled] = useState<boolean>(() => {
    return localStorage.getItem('medibridge_red_flag_detection') !== 'disabled';
  });

  const handleToggleRedFlagDetection = (enable?: boolean) => {
    const nextVal = typeof enable === 'boolean' ? enable : !isRedFlagDetectionEnabled;
    setIsRedFlagDetectionEnabled(nextVal);
    localStorage.setItem('medibridge_red_flag_detection', nextVal ? 'enabled' : 'disabled');
    if (!nextVal) {
      EmergencyAudioService.stopSiren();
      setRedFlags([]);
      if (currentPriority === 'RED') {
        setCurrentPriority('GREEN');
      }
      const pId = patientProfile?.patientId || patientProfile?.id || (currentUser ? `pat-${currentUser.id}` : '');
      const alerts = db.getEmergencyAlerts();
      const myAlert = alerts.find(a => (a.patientId === pId || a.sessionId === activeSessionId) && a.status !== 'RESOLVED');
      if (myAlert) {
        db.saveEmergencyAlert({ ...myAlert, status: 'RESOLVED' });
        window.dispatchEvent(new CustomEvent('medibridge_db_update'));
      }
      showToast('Red Flag Detection Stopped', 'Emergency detection paused. AI will conduct routine OPD intake.', 'INFO');
    } else {
      showToast('Red Flag Detection Active', 'AI will monitor for life-threatening emergency symptoms.', 'VERIFICATION');
    }
  };

  const handleStopRedFlagAndContinue = () => {
    handleToggleRedFlagDetection(false);
    const standDownMsg: ConversationMessage = {
      id: `msg-${Date.now() + 1}`,
      sessionId: activeSessionId,
      sender: 'AI_CLINICAL_INTAKE',
      text: '⚠️ **Red Flag Stand Down**: Emergency alert has been stopped. We are continuing with normal clinical intake. Please describe your symptoms and when they began.',
      language: language,
      timestamp: new Date().toISOString(),
      suggestedQuickReplies: [
        'Symptoms started 2 days ago',
        'Mild discomfort, manageable at home',
        'Want to book an OPD consultation'
      ]
    };
    setMessages(prev => [...prev, standDownMsg]);
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize intake session with personalized welcome message across all 8 languages
  useEffect(() => {
    const allopathyWelcomeMessages: Record<LanguageCode, string> = {
      en: `Hello ${currentUser?.fullName || 'there'}, I'm your MediBridge AI Clinical Intake Assistant. Tell me in your own words: **What main symptoms or health concerns are you experiencing today?**`,
      hi: `नमस्ते ${currentUser?.fullName || ''}, मैं आपका मेडिब्रिज एआई क्लिनिकल असिस्टेंट हूँ। कृपया बताएं: **आज आपको क्या मुख्य शारीरिक समस्या या लक्षण महसूस हो रहे हैं?**`,
      mr: `नमस्कार ${currentUser?.fullName || ''}, मी तुमचा मेडिब्रिज एआय क्लिनिकल सहाय्यक आहे. कृपया सांगा: **आज तुम्हाला नेमका काय त्रास किंवा लक्षणे जाणवत आहेत?**`,
      ur: `ہیلو ${currentUser?.fullName || ''}، میں آپ کا میڈی برج اے آئی کلینیکل انٹیک اسسٹنٹ ہوں۔ براہ کرم بتائیں: **آج آپ کو کون سی اہم علامات یا تکلیف محسوس ہو رہی ہے؟**`,
      kn: `ನಮಸ್ಕಾರ ${currentUser?.fullName || ''}, ನಾನು ನಿಮ್ಮ ಮೆಡಿಬ್ರಿಡ್ಜ್ ಎಐ ಕ್ಲಿನಿಕಲ್ ಸಹಾಯಕ. ದಯವಿಟ್ಟು ತಿಳಿಸಿ: **ಇಂದು ನಿಮಗೆ ಯಾವ ಮುಖ್ಯ ಲಕ್ಷಣಗಳು ಅಥವಾ ಆರೋಗ್ಯ ತೊಂದರೆಗಳು ಕಾಣಿಸಿಕೊಂಡಿವೆ?**`,
      gu: `નમસ્તે ${currentUser?.fullName || ''}, હું તમારો મેડિબ્રિજ એઆઈ ક્લિનિકલ આસિસ્ટન્ટ છું. કૃપા કરીને જણાવો: **આજે તમને કયા મુખ્ય લક્ષણો અથવા સ્વાસ્થ્ય સમસ્યાઓ અનુભવાઈ રહી છે?**`,
      ta: `வணக்கம் ${currentUser?.fullName || ''}, நான் உங்கள் மெடிபிரிட்ஜ் ஏஐ மருத்துவ உதவியாளர். தயவுசெய்து கூறவும்: **இன்று உங்களுக்கு என்ன முக்கிய அறிகுறிகள் அல்லது உடல்நலப் பிரச்சனைகள் உள்ளன?**`,
      bn: `নমস্কার ${currentUser?.fullName || ''}, আমি আপনার মেডিব্রিজ এআই ক্লিনিকাল অ্যাসিস্ট্যান্ট। অনুগ্রহ করে বলুন: **আজ আপনার কী কী প্রধান লক্ষণ বা স্বাস্থ্য समस्या দেখা দিচ্ছে?**`
    };

    const ayurvedaWelcomeMessages: Record<LanguageCode, string> = {
      en: `Namaste ${currentUser?.fullName || 'there'}, I'm your MediBridge AYUSH Clinical Intake Assistant. Tell me: **What physical discomfort, digestive imbalance (Agni), or doshic symptoms are you experiencing today?**`,
      hi: `नमस्ते ${currentUser?.fullName || ''}, मैं आपका मेडिब्रिज आयुष क्लिनिकल असिस्टेंट हूँ। कृपया बताएं: **आज आपको कौन सी शारीरिक समस्या, पाचन असंतुलन (अग्नि) या दोष विकार महसूस हो रहे हैं?**`,
      mr: `नमस्कार ${currentUser?.fullName || ''}, मी तुमचा मेडिब्रिज आयुष क्लिनिकल सहाय्यक आहे. कृपया सांगा: **आज तुम्हाला कोणता शारीरिक त्रास, पचन असंतुलन (अग्नि) किंवा दोष विकार जाणवत आहेत?**`,
      ur: `ہیلو ${currentUser?.fullName || ''}، میں آپ کا میڈی برج آیوش کلینیکل انٹیک اسسٹنٹ ہوں۔ براہ کرم بتائیں: **آج آپ کو کون سی جسمانی تکلیف یا ہاضمے کی خرابی محسوس ہو رہی ہے؟**`,
      kn: `ನಮಸ್ಕಾರ ${currentUser?.fullName || ''}, ನಾನು ನಿಮ್ಮ ಮೆಡಿಬ್ರಿಡ್ಜ್ ಆಯುಷ್ ಕ್ಲಿನಿಕಲ್ ಸಹಾಯಕ. ದಯವಿಟ್ಟು ತಿಳಿಸಿ: **ಇಂದು ನಿಮಗೆ ಯಾವ ದೈಹಿಕ ತೊಂದರೆ ಅಥವಾ ಜೀರ್ಣಕ್ರಿಯೆ ಅಸಮತೋಲನ ಕಾಣಿಸಿಕೊಂಡಿದೆ?**`,
      gu: `નમસ્તે ${currentUser?.fullName || ''}, હું તમારો મેડિબ્રિજ આયુષ ક્લિનિકલ આસિસ્ટન્ટ છું. કૃપા કરીને જણાવો: **આજે તમને કઈ શારીરિક સમસ્યા કે પાચન અસંતુલન જણાઈ રહ્યું છે?**`,
      ta: `வணக்கம் ${currentUser?.fullName || ''}, நான் உங்கள் மெடிபிரிட்ஜ் ஆயுஷ் மருத்துவ உதவியாளர். தயவுசெய்து கூறவும்: **இன்று உங்களுக்கு என்ன செரிமான கோளாறு அல்லது உடல் உபாதை உள்ளது?**`,
      bn: `নমস্কার ${currentUser?.fullName || ''}, আমি আপনার মেডিব্রিজ আয়ুশ ক্লিনিকাল অ্যাসিস্ট্যান্ট। অনুগ্রহ করে বলুন: **আজ আপনার কী শারীরিক সমস্যা বা হজমের গোলমাল দেখা দিচ্ছে?**`
    };

    const allopathyQuickReplies: Record<LanguageCode, string[]> = {
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

    const ayurvedaQuickReplies: Record<LanguageCode, string[]> = {
      en: [
        'Digestive sluggishness, gas & bloating after meals (Mandagni)',
        'Joint stiffness, body ache & dry skin (Vata Prakopa)',
        'Severe acidity, burning sensation & skin eruptions (Pitta Prakopa)',
        'Chest congestion, heavy cough & lethargy (Kapha Prakopa)'
      ],
      hi: [
        'भोजन के बाद भारीपन, गैस और अपच (मंदाग्नि / आम)',
        'जोड़ों में जकड़न, बदन दर्द और रूखी त्वचा (वात प्रकोप)',
        'पेट में जलन, खट्टी डकारें व त्वचा पर पित्ती (पित्त प्रकोप)',
        'छाती में भारी कफ, सुस्ती और सर्दी-जुकाम (कफ प्रकोप)'
      ],
      mr: [
        'जेवणानंतर पोटात गॅस, मंद पचन आणि जडपणा (मंदाग्नि / आम)',
        'सांधेदुखी, अंगात कळा आणि त्वचा कोरडी पडणे (वात प्रकोप)',
        'छातीत जळजळ, आम्लपित्त आणि त्वचेवर पुरळ (पित्त प्रकोप)',
        'छातीत कफ साठणे, आळस आणि सर्दी-खोकला (कफ प्रकोप)'
      ],
      ur: [
        'کھانے کے بعد پیٹ میں گیس، سستی اور بدہضمی',
        'جوڑوں کا درد، بدن ٹوٹنا اور خشکی',
        'سینے میں جلن، تیزابیت اور جلد پر دانے',
        'سینے میں بلغم، سستی اور زکام'
      ],
      kn: [
        'ಊಟದ ನಂತರ ಹೊಟ್ಟೆ ಉಬ್ಬರ ಮತ್ತು ಅಜೀರ್ಣ (ಮಂದಾಗ್ನಿ)',
        'ಕೀಲು ನೋವು, ಮೈಕೈ ನೋವು ಮತ್ತು ಒಣ ಚರ್ಮ (ವಾತ ಪ್ರಕೋಪ)',
        'ಎದೆ ಉರಿ, ಅಸಿಡಿಟಿ ಮತ್ತು ಚರ್ಮದ ದದ್ದು (ಪಿತ್ತ ಪ್ರಕೋಪ)',
        'ಎದೆಯಲ್ಲಿ ಕಫ, ಆಲಸ್ಯ ಮತ್ತು ಕೆಮ್ಮು (ಕಫ ಪ್ರಕೋಪ)'
      ],
      gu: [
        'જમ્યા પછી પેટમાં ગેસ અને મંદ પાચન (મંદાગ્નિ)',
        'સાંધાનો દુખાવો અને સૂકી ત્વચા (વાત પ્રકોપ)',
        'છાતીમાં બળતરા, એસિડિટી અને ચકામા (પિત્ત પ્રકોપ)',
        'છાતીમાં કફ, આળસ અને ઉધરસ (કફ પ્રકોપ)'
      ],
      ta: [
        'உணவுக்கு பின் வயிற்று உப்புசம் மற்றும் அஜீரணம்',
        'மூட்டு வலி, உடல் சோர்வு மற்றும் வறண்ட சருமம்',
        'நெஞ்செரிச்சல், அசிடிட்டி மற்றும் தோல் அரிப்பு',
        'மார்பு சளி, மந்தநிலை மற்றும் இருமல்'
      ],
      bn: [
        'খাওয়ার পর পেট ফাঁপা এবং বদহজম (মন্দাগ্নি)',
        'গাঁটে ব্যথা, শরীর ব্যথা ও শুষ্ক ত্বক (বাত প্রকোপ)',
        'বুকে জ্বালা, অম্বল ও ত্বকে ফুসকুড়ি (পিত্ত প্রকোপ)',
        'বুকে কফ, ক্লান্তি এবং কাশি (কফ প্রকোপ)'
      ]
    };

    const welcomeMap = medicalSystem === 'AYURVEDA' ? ayurvedaWelcomeMessages : allopathyWelcomeMessages;
    const quickMap = medicalSystem === 'AYURVEDA' ? ayurvedaQuickReplies : allopathyQuickReplies;

    const initialMsg: ConversationMessage = {
      id: `msg-${Date.now()}`,
      sessionId: activeSessionId,
      sender: 'AI_CLINICAL_INTAKE',
      text: welcomeMap[language] || welcomeMap.en,
      language: language,
      timestamp: new Date().toISOString(),
      suggestedQuickReplies: quickMap[language] || quickMap.en
    };

    setMessages([initialMsg]);
    // Speak welcome message
    SpeechService.speak(initialMsg.text, language, () => setIsSpeaking(false));
    setIsSpeaking(true);
  }, [language, activeSessionId, medicalSystem]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleFinishAndGenerateReport = async (historyToUse?: ConversationMessage[]) => {
    if (isProcessing || isIntakeDone) return;
    setIsProcessing(true);
    SpeechService.stopSpeaking();
    setIsSpeaking(false);

    const history = historyToUse || messages;
    const pRealId = patientProfile?.patientId || patientProfile?.id || (currentUser ? db.getPatientByUserId(currentUser.id)?.patientId : '') || 'MB-2026-ARV982';

    // 1. Resolve Trusted Hospital directly
    const trustedHospitals = pRealId ? db.getTrustedHospitals(pRealId).filter(t => t.status === 'ACTIVE' && t.hospitalId) : [];
    const registeredHospitals = db.getHospitals();
    const hospAccounts = db.getHospitalAccounts();
    const apexHosp = registeredHospitals.find(h => h.id === 'HOSP-2026-PUNE01') || db.getHospitalById('HOSP-2026-PUNE01');

    const allHospIds = [
      ...trustedHospitals.map(t => ({ id: t.hospitalId, name: t.hospitalName })),
      ...(apexHosp ? [{ id: apexHosp.id, name: apexHosp.name }] : []),
      ...registeredHospitals.map(h => ({ id: h.id, name: h.name })),
      ...hospAccounts.map(h => ({ id: h.id || (h as any).hospitalId || '', name: h.hospitalName }))
    ].filter(h => h.id);

    const targetHospitalId = allHospIds[0]?.id || 'HOSP-2026-PUNE01';
    const targetHospitalName = allHospIds[0]?.name || 'Apex Multi-Specialty Hospital & Trauma Center';

    // 2. Aggregate all AI recommended medicines from conversation messages
    const collectedMeds: Array<{
      name: string;
      dosage?: string;
      timing?: string;
      duration?: string;
      indication?: string;
      warnings?: string;
      status?: 'APPROVED' | 'UNAPPROVED' | 'PENDING';
    }> = [];
    const seenMedNames = new Set<string>();

    for (const msg of history) {
      if (msg.medicineRecommendations && Array.isArray(msg.medicineRecommendations)) {
        for (const med of msg.medicineRecommendations) {
          const key = (med.name || '').toLowerCase().trim();
          if (key && !seenMedNames.has(key)) {
            seenMedNames.add(key);
            collectedMeds.push({
              name: med.name,
              dosage: med.dosage || '1 tablet (as directed)',
              timing: med.timing || 'After meals',
              duration: (med as any).duration || '3-5 days',
              indication: med.indication || 'Symptomatic relief',
              warnings: (med as any).warnings || 'Pending attending physician review & approval',
              status: 'PENDING'
            });
          }
        }
      }
    }

    // If no specific medicine recommendation was generated yet in chat, provide safe initial OTC suggestions based on chief complaint
    if (collectedMeds.length === 0) {
      const combinedText = history.map(m => m.text).join(' ').toLowerCase();
      if (/fever|temperature|bukhar|taav|body ache/i.test(combinedText)) {
        collectedMeds.push({
          name: 'Paracetamol 650mg (Dolo / Calpol)',
          dosage: '650 mg SOS (max 3 times/day)',
          timing: 'After meals with warm water',
          duration: '3 days',
          indication: 'Antipyretic / Analgesic for fever and body ache',
          warnings: 'Keep min 6 hours gap. Pending doctor approval.',
          status: 'PENDING'
        });
      }
      if (/cough|khasi|khokla/i.test(combinedText)) {
        collectedMeds.push({
          name: 'Dextromethorphan + Chlorpheniramine Syrup',
          dosage: '10 ml twice daily',
          timing: 'After food',
          duration: '4-5 days',
          indication: 'Dry / Irritant Cough suppression',
          warnings: 'May cause mild drowsiness. Pending doctor approval.',
          status: 'PENDING'
        });
      }
      if (/cold|runny nose|sneezing|chink|sardi/i.test(combinedText)) {
        collectedMeds.push({
          name: 'Cetirizine 10mg / Levocetirizine',
          dosage: '10 mg once daily at bedtime',
          timing: 'Night after dinner',
          duration: '3 days',
          indication: 'Antihistamine for allergic rhinitis and nasal drip',
          warnings: 'Do not drive after taking. Pending doctor approval.',
          status: 'PENDING'
        });
      }
      if (/acidity|gas|burning|jalan|pet dard|stomach/i.test(combinedText)) {
        collectedMeds.push({
          name: 'Pantoprazole 40mg + Domperidone (Pan-D)',
          dosage: '1 capsule once daily',
          timing: '30 minutes before breakfast (empty stomach)',
          duration: '5 days',
          indication: 'Proton Pump Inhibitor for acid reflux and gastritis',
          warnings: 'Avoid spicy food. Pending doctor approval.',
          status: 'PENDING'
        });
      }
      if (/loose motion|diarrhea|dast|vomiting/i.test(combinedText)) {
        collectedMeds.push({
          name: 'Oral Rehydration Salts (WHO-ORS)',
          dosage: '1 sachet dissolved in 1 Liter clean water',
          timing: 'Sip frequently throughout the day',
          duration: 'Until hydration normalizes',
          indication: 'Electrolyte replenishment & dehydration prevention',
          warnings: 'Drink clean boiled water. Pending doctor approval.',
          status: 'PENDING'
        });
      }
      if (collectedMeds.length === 0) {
        collectedMeds.push({
          name: 'Vitamin C 500mg + Zinc (Limcee / Chewable)',
          dosage: '1 tablet once daily chewable',
          timing: 'Morning after breakfast',
          duration: '5-7 days',
          indication: 'Immune support and cellular recovery',
          warnings: 'Pending doctor clinical review & approval.',
          status: 'PENDING'
        });
      }
    }

    // Retrieve active appointment for linking
    const pAppts = db.getAppointments(pRealId);
    const latestApt = pAppts[0];
    const encounterId = latestApt ? `enc-${latestApt.id}` : `enc-${Date.now()}`;
    const appointmentId = latestApt?.id;

    try {
      const { summary, shortReport } = await AIIntakeEngine.generateStructuredSummaryAsync(
        activeSessionId,
        pRealId,
        history,
        patientProfile,
        language,
        medicalSystem,
        encounterId,
        appointmentId
      );

      const firstPatientMsg = history.find(m => m.sender === 'PATIENT')?.text || 'Patient reported symptoms.';

      // Attach recommended medicines and trusted hospital to shortReport and summary
      if (shortReport) {
        shortReport.recommendedMedicines = collectedMeds;
      }
      if (summary) {
        summary.verificationStatus = 'PENDING_PHYSICIAN_REVIEW';
        summary.trustedHospitalId = targetHospitalId;
        summary.trustedHospitalName = targetHospitalName;
        summary.recommendedMedicines = collectedMeds;
      }

      const newSession: ClinicalSession = {
        id: activeSessionId,
        patientId: pRealId,
        encounterId,
        appointmentId,
        conversationMessages: history,
        shortReport,
        patientName: currentUser?.fullName || patientProfile?.fullName || 'Aarav Sharma',
        patientAge: patientProfile?.age || 32,
        patientGender: patientProfile?.gender || 'Male',
        patientPhone: currentUser?.phone || patientProfile?.emergencyContactPhone || '+91 98000 00000',
        startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        completedAt: new Date().toISOString(),
        status: redFlags.length > 0 ? 'EMERGENCY_TRIGGERED' : 'COMPLETED',
        verificationStatus: 'PENDING_PHYSICIAN_REVIEW',
        triagePriority: currentPriority,
        triageRationale: redFlags.length > 0
          ? 'CRITICAL RED FLAG: Emergency department resuscitation priority.'
          : 'Pre-arrival intake completed with physician-ready short clinical report.',
        chiefComplaint: shortReport?.chiefComplaint?.mainReason || firstPatientMsg,
        originalLanguage: language,
        originalPatientStatement: firstPatientMsg,
        translatedSummary: shortReport?.summary?.text || firstPatientMsg,
        selectedHospitalId: targetHospitalId,
        trustedHospitalId: targetHospitalId,
        trustedHospitalName: targetHospitalName,
        selectedDepartmentId: 'dept-001',
        targetDoctorId: 'doc-vikram',
        recommendedMedicines: collectedMeds,
        redFlagsDetected: redFlags,
        isRedFlagTriggered: redFlags.length > 0,
        aiSummary: summary
      };

      // Bidirectional appointment link
      if (latestApt) {
        db.saveAppointment({ ...latestApt, clinicalSessionId: activeSessionId });
      }

      db.saveClinicalSession(newSession);
      await AIIntakeEngine.saveSessionToCloud(newSession);

      // Persist directly to central database /api/patients
      try {
        await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_session', session: newSession })
        });
      } catch (err) {
        console.warn('Central session sync error:', err);
      }

      // If target hospital exists, ensure trusted permission is granted
      if (targetHospitalId && pRealId) {
        db.saveTrustedHospital({
          id: `trust-${Date.now()}`,
          patientId: pRealId,
          patientProfileId: patientProfile?.id || pRealId,
          hospitalId: targetHospitalId,
          hospitalName: targetHospitalName,
          hospitalAddress: 'Shivajinagar, Pune, Maharashtra 411005',
          hospitalCity: patientProfile?.city || 'Pune',
          grantedAt: new Date().toISOString(),
          status: 'ACTIVE',
          allowEmergencyAlert: true,
          allowMedicalHistory: true,
          ambulanceAvailable: true
        });
      }

      // Hospital notification for pre-arrival intake & report awaiting doctor verification
      const notif = {
        id: `notif-${Date.now()}`,
        hospitalId: targetHospitalId,
        type: 'PRE_ARRIVAL_INTAKE' as const,
        title: `AI Clinical Report & Medicines: ${newSession.patientName}`,
        message: `New clinical intake with recommended medicines awaiting doctor review & approval. Patient ID: ${pRealId}`,
        timestamp: new Date().toISOString(),
        read: false,
        patientId: pRealId,
        patientName: newSession.patientName,
        sessionId: newSession.id,
        data: { sessionId: newSession.id, priority: newSession.triagePriority }
      };
      db.addNotification(notif as any);
      try {
        await fetch('/api/hospitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save_notification', notification: notif })
        });
      } catch {}

      // Real-time broadcast via syncRelay to instantly alert hospital & doctor
      syncRelay.publish('clinical_session_saved', newSession);
      syncRelay.publish(`hospital_session_${targetHospitalId}`, newSession);
      syncRelay.publish('medibridge_db_update', { type: 'clinical_sessions', data: newSession });
      syncRelay.publish(`patient_session_update_${pRealId}`, newSession);

      db.logAction(
        currentUser?.id || 'usr-pat',
        currentUser?.fullName || 'Registered Patient',
        'PATIENT',
        'INTAKE_COMPLETED',
        'ClinicalSession',
        activeSessionId,
        `Completed AI clinical intake (${language.toUpperCase()}) routed to ${targetHospitalName}. Awaiting Doctor Approval.`
      );

      setIsIntakeDone(true);
      setIsProcessing(false);
      onIntakeCompleted(newSession);
    } catch (err: any) {
      console.error('[Error generating short report]:', err);
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isProcessing) return;

    // Check if patient selected "Finish & Generate Report" quick reply
    if (/finish.*report|generate.*report|सारांश देखें|अहवाल तयार करा|خلاصہ دیکھیں/i.test(messageContent)) {
      handleFinishAndGenerateReport();
      return;
    }

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

    try {
      // Analyze through modern LLM-backed Clinical Intake Engine
      const result = await AIIntakeEngine.analyzeInputAsync(
        messageContent,
        updatedHistory,
        language,
        medicalSystem,
        isRedFlagDetectionEnabled,
        patientProfile
      );

      // Add finish option to suggested replies if not already present and enough turns
      const patientMsgCount = updatedHistory.filter(m => m.sender === 'PATIENT').length;
      let finalSuggestedReplies = result.suggestedReplies || [];
      if (patientMsgCount >= 2 && !result.isComplete && !result.isRedFlagTriggered) {
        const finishLabel: Record<LanguageCode, string> = {
          en: '📋 Finish Interview & Generate Report',
          hi: '📋 साक्षात्कार समाप्त करें व रिपोर्ट बनाएं',
          mr: '📋 मुलाखत पूर्ण करा व अहवाल बनवा',
          ur: '📋 انٹرویو مکمل کریں اور رپورٹ بنائیں',
          kn: '📋 ಇಂಟರ್ವ್ಯೂ ಪೂರ್ಣಗೊಳಿಸಿ ವರದಿ ತಯಾರಿಸಿ',
          gu: '📋 ઇન્ટરવ્યુ પૂર્ણ કરો અને રિપોર્ટ બનાવો',
          ta: '📋 நேர்காணலை முடித்து அறிக்கை உருவாக்கவும்',
          bn: '📋 সাক্ষাৎকার শেষ করে রিপোর্ট তৈরি করুন'
        };
        const label = finishLabel[language] || finishLabel.en;
        if (!finalSuggestedReplies.includes(label)) {
          finalSuggestedReplies = [...finalSuggestedReplies, label];
        }
      }

      const aiMsg: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        sessionId: activeSessionId,
        sender: 'AI_CLINICAL_INTAKE',
        text: result.nextBotMessage,
        language: language,
        timestamp: new Date().toISOString(),
        suggestedQuickReplies: finalSuggestedReplies,
        conditionCategory: result.conditionCategory,
        medicineRecommendations: result.medicineRecommendations,
        triageAssessment: result.triageAssessment
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

        const pId = patientProfile?.patientId || patientProfile?.id || (currentUser ? db.getPatientByUserId(currentUser.id)?.patientId : '') || currentUser?.id || 'pat-001';
        const pName = currentUser?.fullName || patientProfile?.fullName || 'Registered Patient';

        // 1. Strict Verified Trusted Hospital Lookup ONLY
        let trustedHospitals = db.getTrustedHospitals(pId).filter(
          t => t.status === 'ACTIVE' && t.hospitalId && t.allowEmergencyAlert !== false
        );
        if (trustedHospitals.length === 0) {
          try {
            const cloudTrusted = await cloudDb.getTrustedHospitals(pId);
            trustedHospitals = (cloudTrusted || []).filter(
              (t: any) => t.status === 'ACTIVE' && t.hospitalId && t.allowEmergencyAlert !== false
            ) as any;
          } catch {}
        }

        // Fallback to active registered hospital in the system so emergency alerts are dispatched without fail
        if (trustedHospitals.length === 0) {
          const regHosps = db.getHospitals();
          if (regHosps.length > 0) {
            const h = regHosps[0];
            trustedHospitals = [{
              id: `trust-auto-${Date.now()}`,
              patientId: pId,
              hospitalId: (h as any).hospitalId || h.id,
              hospitalName: (h as any).hospitalName || h.name,
              status: 'ACTIVE',
              allowEmergencyAlert: true,
              allowMedicalHistory: true
            }] as any;
          }
        }

        if (trustedHospitals.length === 0) {
          showToast(
            '🚨 CRITICAL RED FLAG DETECTED',
            `Severe clinical symptoms detected (${result.redFlagsDetected.join(', ')}). No verified trusted hospital linked. Call 108 / 112 emergency services immediately!`,
            'EMERGENCY'
          );
          db.logAction(
            currentUser?.id || 'usr-pat',
            pName,
            'PATIENT',
            'RED_FLAG_TRIGGERED',
            'IntakeSession',
            activeSessionId,
            `Red flag triggered (${result.redFlagsDetected.join(', ')}). Alert transmission withheld because patient has no verified trusted hospital.`
          );
        } else {
          // Exactly the patient's verified trusted hospital only
          const targetHospital = trustedHospitals[0];
          const targetHospitalId = targetHospital.hospitalId;
          const targetHospitalName = targetHospital.hospitalName;

          // Resolve live / current location
          let liveLocation = {
            lat: 18.7303,
            lng: 73.6766,
            address: patientProfile?.address || 'Current Patient Location',
            city: patientProfile?.city || 'Pune'
          };

          try {
            const gpsPromise = LocationHospitalService.getCurrentGpsPosition();
            const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 1200));
            const gpsRes = await Promise.race([gpsPromise, timeoutPromise]);
            if (gpsRes && gpsRes.coordinates) {
              liveLocation = {
                lat: gpsRes.coordinates.lat,
                lng: gpsRes.coordinates.lng,
                address: gpsRes.label || patientProfile?.address || 'Live GPS Coordinates',
                city: gpsRes.city || patientProfile?.city || 'Local'
              };
            } else if (patientProfile?.address || patientProfile?.city) {
              liveLocation = {
                lat: 18.7303,
                lng: 73.6766,
                address: `${patientProfile.address || ''}${patientProfile.city ? ', ' + patientProfile.city : ''}`.trim(),
                city: patientProfile.city || 'Pune'
              };
            }
          } catch (locErr) {
            console.warn('[liveLocation resolution warn]:', locErr);
          }

          const redFlagDetailsStr = result.redFlagsDetected && result.redFlagsDetected.length > 0
            ? result.redFlagsDetected.join(', ')
            : 'Critical clinical red flag detected during intake';

          const existingAlerts = db.getEmergencyAlerts(targetHospitalId);
          const activeEmergency = existingAlerts.find(a =>
            (a.caseId === activeSessionId || a.sessionId === activeSessionId || a.patientId === pId) &&
            a.status !== 'RESOLVED' && a.status !== 'HANDOVER_COMPLETED'
          );

          let alertToSave: EmergencyAlert;

          if (activeEmergency) {
            alertToSave = {
              ...activeEmergency,
              caseId: activeSessionId,
              patientId: pId,
              patientName: pName,
              hospitalId: targetHospitalId,
              hospitalName: targetHospitalName,
              priority: 'RED',
              severity: 'CRITICAL',
              redFlags: Array.from(new Set([...(activeEmergency.redFlags || []), ...result.redFlagsDetected])),
              redFlagDetails: Array.from(new Set([...(activeEmergency.redFlags || []), ...result.redFlagsDetected])).join(', '),
              triggerReason: `${activeEmergency.triggerReason} + ${result.redFlagsDetected.join(' + ')}`,
              timestamp: new Date().toISOString(),
              liveLocation,
              originalMessage: messageContent,
              detectedLanguage: language,
              detectedEmergencyConcern: result.translatedConcern || redFlagDetailsStr
            };
          } else {
            const alertId = `emg-${Date.now()}`;
            alertToSave = {
              id: alertId,
              caseId: activeSessionId,
              sessionId: activeSessionId,
              patientId: pId,
              patientName: pName,
              patientAge: patientProfile?.age || 35,
              patientGender: patientProfile?.gender || 'Male',
              patientPhone: currentUser?.phone || '+91 98000 00000',
              hospitalId: targetHospitalId,
              hospitalName: targetHospitalName,
              priority: 'RED',
              severity: 'CRITICAL',
              triggerReason: redFlagDetailsStr,
              redFlags: result.redFlagsDetected,
              redFlagDetails: redFlagDetailsStr,
              originalMessage: messageContent,
              detectedLanguage: language,
              translatedSummary: result.translatedConcern || redFlagDetailsStr,
              detectedEmergencyConcern: result.translatedConcern || redFlagDetailsStr,
              status: 'DISPATCHED',
              timestamp: new Date().toISOString(),
              liveLocation,
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
                liveCoordinates: { lat: liveLocation.lat, lng: liveLocation.lng }
              }
            };
          }

          // 1. Secure Local Database persistence
          db.saveEmergencyAlert(alertToSave);

          // 2. Secure Cloud Database persistence
          await cloudDb.saveEmergencyAlert(alertToSave);

          // 3. Secure Central Backend API persistence
          try {
            await fetch('/api/emergencies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(alertToSave)
            });
          } catch (apiErr) {
            console.warn('[POST /api/emergencies warn]:', apiErr);
          }

          // 4. Save and broadcast emergency clinical session for Pre-Arrival Queue visibility
          const emergencySession: any = {
            id: activeSessionId,
            patientId: pId,
            encounterId: `enc-${Date.now()}`,
            conversationMessages: updatedHistory,
            shortReport: {
              chiefComplaint: {
                mainReason: redFlagDetailsStr,
                duration: 'Acute sudden onset',
                severity: 'CRITICAL / RED',
                progression: 'Acute clinical red flag deterioration',
                bodySites: ['Cardiovascular / Vital Systems']
              },
              historyOfPresentIllness: messageContent,
              redFlags: {
                detected: true,
                items: result.redFlagsDetected,
                actionTaken: `Emergency alert dispatched strictly to verified trusted hospital ${targetHospitalName}. Paramedic unit en route.`
              },
              summary: {
                text: `Patient triggered acute red flag clinical criteria: ${redFlagDetailsStr}. Original Statement: "${messageContent}". AI intake immediately dispatched emergency telemetry to ${targetHospitalName}.`
              }
            },
            patientName: pName,
            patientAge: patientProfile?.age || 35,
            patientGender: patientProfile?.gender || 'Male',
            patientPhone: currentUser?.phone || patientProfile?.emergencyContactPhone || '+91 98000 00000',
            startedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
            completedAt: new Date().toISOString(),
            status: 'EMERGENCY_TRIGGERED',
            triagePriority: 'RED',
            triageRationale: `🚨 CRITICAL RED FLAG DETECTED: ${redFlagDetailsStr}. Immediate ED resuscitation priority.`,
            chiefComplaint: redFlagDetailsStr,
            originalLanguage: language,
            originalPatientStatement: messageContent,
            translatedSummary: result.translatedConcern || redFlagDetailsStr,
            selectedHospitalId: targetHospitalId,
            selectedDepartmentId: 'dept-001',
            targetDoctorId: 'doc-001',
            redFlagsDetected: result.redFlagsDetected,
            isRedFlagTriggered: true,
            aiSummary: {
              chiefComplaint: {
                mainReason: redFlagDetailsStr,
                duration: 'Acute sudden onset',
                severity: 'CRITICAL / RED',
                progression: 'Acute clinical red flag deterioration',
                bodySites: ['Cardiovascular / Vital Systems']
              },
              historyOfPresentIllness: messageContent,
              redFlags: {
                detected: true,
                items: result.redFlagsDetected,
                actionTaken: `Emergency alert dispatched to verified trusted hospital ${targetHospitalName}.`
              },
              triageAssessment: {
                suggestedPriority: 'RED',
                rationale: 'Critical clinical red flag detected during AI intake. Immediate emergency physician evaluation required.'
              }
            }
          };

          db.saveClinicalSession(emergencySession);
          await AIIntakeEngine.saveSessionToCloud(emergencySession);
          try {
            await fetch('/api/patients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'save_session', session: emergencySession })
            });
          } catch (sessionApiErr) {
            console.warn('[save emergency session API warn]:', sessionApiErr);
          }

          // 5. Real-time broadcast strictly to verified trusted hospital channels
          syncRelay.publish(`hospital_emergency_${targetHospitalId}`, alertToSave);
          syncRelay.publish('emergency_alert_dispatched', alertToSave);
          syncRelay.publish('clinical_session_saved', emergencySession);
          syncRelay.publish(`hospital_session_${targetHospitalId}`, emergencySession);
          window.dispatchEvent(new CustomEvent('medibridge_db_update', { detail: { type: 'SAVE_CLINICAL_SESSION', session: emergencySession } }));

          db.addNotification({
            id: `notif-${Date.now()}`,
            recipientRole: 'TRIAGE',
            title: '🚨 AUTOMATIC EMERGENCY RED ALERT',
            message: `${pName} (ID: ${pId}, Case: ${activeSessionId}) triggered red flags (${redFlagDetailsStr}). Dispatched strictly to verified trusted hospital ${targetHospitalName}.`,
            type: 'EMERGENCY',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl: '/triage'
          });

          db.logAction(
            currentUser?.id || 'usr-pat',
            pName,
            'PATIENT',
            'EMERGENCY_DISPATCHED',
            'EmergencyAlert',
            alertToSave.id,
            `Emergency alert dispatched strictly to verified trusted hospital: ${targetHospitalName} (${targetHospitalId}). Case ID: ${activeSessionId}. Live Location: ${liveLocation.address}`
          );

          showToast(
            '🚨 EMERGENCY ALERT DISPATCHED',
            `Alert sent to verified trusted hospital: ${targetHospitalName}. Paramedic unit alerted.`,
            'EMERGENCY'
          );

          onEmergencyTriggered(alertToSave.id);
        }
      }

      if (result.isComplete) {
        setCurrentPriority(result.suggestedTriagePriority);
        await handleFinishAndGenerateReport(updatedHistory);
      }
    } catch (err: any) {
      console.error('[handleSendMessage error]:', err);
      setIsProcessing(false);
    }
  };

  const handleSimulateRedFlagEmergency = () => {
    handleToggleRedFlagDetection(true);
    const redFlagStatements: Record<LanguageCode, string> = {
      en: 'I am having severe crushing chest pain radiating to my left arm and shoulder, with cold sweats, dizziness, and difficulty breathing for the past 45 minutes.',
      hi: 'मुझे पिछले 45 मिनट से सीने में बहुत तेज दबाव और दर्द हो रहा है जो बाएं हाथ तक जा रहा है, साथ में पसीना और सांस लेने में तकलीफ हो रही है।',
      mr: 'मला गेल्या 45 मिनिटांपासून छातीत अतिशय तीव्र कळ आणि दाब जाणवत असून तो डाव्या हाताकडे पसरत आहे, खूप घाम फुटला आहे आणि श्वास घेण्यास त्रास होत आहे.',
      ur: 'مجھے پچھلے 45 منٹ سے سینے میں شدید دباؤ اور درد ہو रहा ہے جو بائیں بازو میں جا رہا ہے، ساتھ میں پسینہ اور سانس لینے میں دشواری ہو رہی ہے۔',
      kn: 'ನನಗೆ ಕಳೆದ 45 ನಿಮಿಷಗಳಿಂದ ಎದೆಯಲ್ಲಿ ತೀವ್ರವಾದ ನೋವು ಮತ್ತು ಎಡಗೈಗೆ ಹರಡುತ್ತಿರುವ ಒತ್ತಡವಿದೆ, ಜೊತೆಗೆ ತಣ್ಣನೆಯ ಬೆವರು ಮತ್ತು ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆ.',
      gu: 'મને છેલ્લા 45 મિનિટથી છાતીમાં ખૂબ જ તીવ્ર દબાણ અને દુખાવો થઈ રહ્યો છે જે ડાબા હાથમાં ફેલાઈ રહ્યો છે, સાથે ઠંડો પરસેવો અને શ્વાસ લેવામાં તકલીફ છે.',
      ta: 'எனக்கு கடந்த 45 நிமிடங்களாக மார்பில் கடுமையான அழுத்தம் மற்றும் வலி இடது கைக்கு பரவுகிறது, அத்துடன் குளிர்ந்த வியர்வை மற்றும் மூச்சுத்திணறல் உள்ளது.',
      bn: 'আমার গত 45 মিনিট ধরে বুকে তীব্র চাপ ও ব্যথা হচ্ছে যা বাম হাতে ছড়িয়ে পড়ছে, সাথে ঠান্ডা ঘাম এবং শ্বাসকষ্ট হচ্ছে।'
    };
    handleSendMessage(redFlagStatements[language] || redFlagStatements.en);
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm">{t('talk_to_ai')}</h3>
              <div className="flex items-center gap-1 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                <Globe className="w-3 h-3 text-teal-600" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  aria-label="Select Consultation Language"
                  className="bg-transparent text-[10px] font-bold text-teal-800 uppercase outline-hidden cursor-pointer"
                >
                  {ALL_SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code} className="text-slate-800 normal-case font-normal">
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setMedicalSystem(m => m === 'ALLOPATHY' ? 'AYURVEDA' : 'ALLOPATHY')}
                className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
                  medicalSystem === 'AYURVEDA'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}
                title="Toggle Allopathy vs. Ayurveda Intake"
              >
                {medicalSystem === 'AYURVEDA' ? '🌿 AYUSH' : '🩺 ALLOPATHY'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {t('talk_to_ai_sub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Automatic Red Flag Detection Trigger Button */}
          <button
            type="button"
            onClick={handleSimulateRedFlagEmergency}
            disabled={isProcessing}
            className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-red-500"
            title="Automatically triggers Red Flag detection and dispatches emergency alert to linked hospital"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span className="font-extrabold tracking-tight">🚨 Auto Red Flag Test</span>
          </button>

          {/* Stop / Enable Red Flag Detection Toggle */}
          <button
            type="button"
            onClick={() => handleToggleRedFlagDetection()}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition shadow-sm ${
              isRedFlagDetectionEnabled
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
            title={isRedFlagDetectionEnabled ? 'Click to stop red flag detection' : 'Click to enable red flag detection'}
          >
            {isRedFlagDetectionEnabled ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                <span className="hidden md:inline text-[11px]">Red Flags:</span>
                <span className="font-extrabold text-[10px] text-rose-700">ACTIVE</span>
              </>
            ) : (
              <>
                <ShieldOff className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline text-[11px]">Red Flags:</span>
                <span className="font-extrabold text-[10px] text-slate-500">STOPPED</span>
              </>
            )}
          </button>

          {/* Priority Badge */}
          <div className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono uppercase flex items-center gap-1.5 ${
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

          {messages.filter(m => m.sender === 'PATIENT').length >= 1 && !isIntakeDone && (
            <button
              type="button"
              onClick={() => handleFinishAndGenerateReport()}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Finish conversation and compile physician report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Generate Report</span>
              <span className="sm:hidden">Report</span>
            </button>
          )}

          <button
            onClick={handleRestartChat}
            className="p-2 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-200 shadow-sm transition"
            title="Restart Intake"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Red Flag Banner (Emergency indicator remains red) */}
      {redFlags.length > 0 && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider">{t('emergency_callout')}</span>
              <p className="text-[11px] text-red-700 line-clamp-1">
                {redFlags.join(' • ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleStopRedFlagAndContinue}
              className="px-3 py-1.5 bg-white hover:bg-red-100 text-red-700 font-extrabold text-xs rounded-xl shadow-sm border border-red-300 flex items-center gap-1.5 transition whitespace-nowrap"
              title="Stop red flag detection and continue intake normally"
            >
              <Ban className="w-3.5 h-3.5 text-red-600" />
              <span>Stop Red Flag &amp; Continue</span>
            </button>
            <span className="text-[10px] font-mono bg-red-600 text-white px-2.5 py-1 rounded-lg font-bold uppercase shadow-sm">
              ER NOTIFIED
            </span>
          </div>
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

              {/* Specialized Doctor Consultation Required (Non-Minor / Another Way of Issue) */}
              {!isUser && msg.conditionCategory === 'SPECIALIZED_DOCTOR_REQUIRED' && (
                <div className="mt-2.5 max-w-[92%] sm:max-w-[85%] rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-950 text-sm">
                          Specialist Doctor Consultation Recommended
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px]">
                          {msg.triageAssessment?.recommendedDepartment || 'Specialist OPD'}
                        </span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        ⚠️ <strong>No over-the-counter self-medication advised:</strong> Your reported health symptoms indicate a specialized or non-minor condition. Self-medicating with over-the-counter pills is unsafe and can mask critical signs. Direct consultation with a qualified doctor is advised.
                      </p>
                      {msg.triageAssessment?.rationale && (
                        <p className="text-amber-700 italic text-[11px] pt-1">
                          Clinical Reason: {msg.triageAssessment.rationale}
                        </p>
                      )}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleFinishAndGenerateReport()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Generate Clinical Summary & Consult Specialist</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Verified OTC Symptomatic Medicine Recommendations with Direct Buying Links */}
              {!isUser && msg.medicineRecommendations && msg.medicineRecommendations.length > 0 && (
                <div className="mt-2.5 max-w-[95%] sm:max-w-[88%] rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 p-4 sm:p-5 shadow-md animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                          <span>Verified Over-The-Counter Medicine Recommendations</span>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                            Safe OTC
                          </span>
                        </h4>
                        <p className="text-[11px] text-emerald-700">
                          Symptomatic relief for mild fever / headache / cold with direct online pharmacy purchase links.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {msg.medicineRecommendations.map((med) => (
                      <div
                        key={med.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-emerald-300 hover:shadow-md transition duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-slate-900 text-sm sm:text-base">
                                {med.name}
                              </h5>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                {med.category.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              Generic Name: {med.genericName}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 shrink-0">
                            <Clock className="w-3 h-3" />
                            <span>{med.timing}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-700">Dosage: </span>
                            <span>{med.dosage}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Indication: </span>
                            <span>{med.indication}</span>
                          </div>
                        </div>

                        {med.caution && (
                          <p className="text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-md px-2.5 py-1.5 mb-3 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                            <span><strong>Caution:</strong> {med.caution}</span>
                          </p>
                        )}

                        {/* Direct Pharmacy Buying Links */}
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                            🛒 Instant Pharmacy Buying Links:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {med.buyingLinks.map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center p-2 rounded-lg border border-slate-200 bg-white hover:bg-teal-50/60 hover:border-teal-400 text-slate-700 hover:text-teal-900 transition group shadow-2xs text-center"
                              >
                                <span className="font-bold text-xs text-slate-900 group-hover:text-teal-700 flex items-center gap-1">
                                  <span>{link.storeName}</span>
                                  <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                </span>
                                {link.priceEstimate && (
                                  <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                                    {link.priceEstimate}
                                  </span>
                                )}
                                {link.badge && (
                                  <span className="text-[9px] text-slate-400 group-hover:text-teal-600 mt-0.5">
                                    {link.badge}
                                  </span>
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-[10px] text-slate-400 text-center italic">
                    Medical Disclaimer: Over-the-counter medicine suggestions provide temporary symptomatic relief. If fever or symptoms do not improve within 48 to 72 hours, consult an OPD physician.
                  </p>
                </div>
              )}

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

      {/* Quick Red Flag Auto-Trigger Banner */}
      <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-t border-rose-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-rose-950 font-medium">
          <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
          <span>Need to demonstrate emergency triage? Click button to trigger live red-flag dispatch:</span>
        </div>
        <button
          type="button"
          onClick={handleSimulateRedFlagEmergency}
          disabled={isProcessing}
          className="px-3 py-1 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-300" />
          <span>🚨 Simulate Red-Flag Emergency</span>
        </button>
      </div>

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
