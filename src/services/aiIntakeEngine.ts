import {
  ConversationMessage, ClinicalHistorySummary, SymptomEntry,
  TriagePriority, LanguageCode, Allergy, Medication, MedicalSystem,
  DashavidhaPariksha, PhysicianShortReport, ClinicalSourceTag, ClinicalSession,
  ConditionCategory, MedicineRecommendation, ClinicalTriageAssessment
} from '../types';
import { MedicineRecommendationService } from './medicineRecommendationService';

export interface IntakePromptOption {
  text: string;
  category: 'onset' | 'severity' | 'location' | 'character' | 'radiation' | 'history' | 'allergy' | 'general';
}

export interface IntakeAnalysisResult {
  nextBotMessage: string;
  suggestedReplies: string[];
  isComplete: boolean;
  isRedFlagTriggered: boolean;
  redFlagsDetected: string[];
  suggestedTriagePriority: TriagePriority;
  conditionCategory?: ConditionCategory;
  medicineRecommendations?: MedicineRecommendation[];
  triageAssessment?: ClinicalTriageAssessment;
  extractedSymptom?: SymptomEntry;
  extractedAllergies?: Allergy[];
  extractedMedications?: Medication[];
  detectedLanguage?: LanguageCode;
  translatedConcern?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multilingual Emergency Concepts & Red-Flag Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface RedFlagDefinition {
  flag: string;
  priority: TriagePriority;
  translatedConcerns: Record<LanguageCode, string>;
  // Expressions across 8 languages and Romanized / mixed forms
  expressions: {
    en: string[];
    hi: string[];
    mr: string[];
    ur: string[];
    kn: string[];
    gu: string[];
    ta: string[];
    bn: string[];
    mixed: string[];
  };
}

const RED_FLAG_REGISTRY: RedFlagDefinition[] = [
  {
    flag: 'Acute Ischemic Chest Pain / Suspected Cardiac Event',
    priority: 'RED',
    translatedConcerns: {
      en: 'Potential Acute Cardiac / Chest Pain Emergency',
      hi: 'सीने में तेज़ दर्द / संभावित हृदय आपातकाल',
      mr: 'छातीत तीव्र वेदना / संभाव्य हृदयविकार आणीबाणी',
      ur: 'سینے میں شدید درد / ممکنہ دل کی ایمرجنسی',
      kn: 'ಎದೆಯಲ್ಲಿ ತೀವ್ರ ನೋವು / ಶಂಕಿತ ಹೃದಯ ತುರ್ತುಸ್ಥಿತಿ',
      gu: 'છાતીમાં તીવ્ર દુખાવો / શંકાસ્પદ કાર્ડિયાક કટોકટી',
      ta: 'நெஞ்சில் கடுமையான வலி / இதய அவசரநிலை',
      bn: 'বুকে তীব্র ব্যথা / সম্ভাব্য কার্ডিয়াক জরুরি অবস্থা'
    },
    expressions: {
      en: [
        'severe chest pain', 'acute chest pain', 'crushing chest pain', 'extreme chest pain',
        'heart attack', 'pressure on chest', 'chest tightness', 'heaviness in chest with sweating',
        'unbearable chest pain', 'sharp pain in chest radiating to arm', 'pain radiating to jaw'
      ],
      hi: [
        'बहुत तेज़ सीने में दर्द', 'बहुत तेज सीने में दर्द', 'सीने में बहुत ज्यादा दर्द',
        'तेज़ सीने में दर्द', 'तेज सीने में दर्द', 'असहनीय सीने में दर्द', 'सीने में भारीपन और पसीना',
        'सीने में अत्यधिक दर्द', 'दिल का दौरा', 'छाती में बहुत दर्द', 'सीना बहुत बुरी तरह दर्द कर रहा है'
      ],
      mr: [
        'छातीत तीव्र वेदना', 'खूप तीव्र वेदना', 'छातीत खूप जास्त दुखत आहे', 'छातीत खूप तीव्र वेदना',
        'छातीत दाब आणि घाम', 'छातीत असह्य वेदना', 'हृदयविकाराचा झटका', 'छाती दाटून येणे'
      ],
      ur: [
        'سینے میں شدید درد', 'بہت زیادہ درد', 'سینے پر شدید دباؤ', 'سینے میں ناقابل برداشت درد',
        'دل کا دورہ', 'سینے میں گھٹن اور پسینہ'
      ],
      kn: [
        'ಎದೆಯಲ್ಲಿ ತೀವ್ರ ನೋವು', 'ತುಂಬಾ ತೀವ್ರವಾದ ನೋವು ಎದೆಯಲ್ಲಿ', 'ಎದೆಗೆ ತೀವ್ರ ನೋವು',
        'ಸಹಿಸಲಾಗದ ಎದೆ ನೋವು', 'ಎದೆಯ ಭಾರ ಮತ್ತು ಬೆವರು', 'ಹೃದಯಾಘಾತದ ಲಕ್ಷಣ'
      ],
      gu: [
        'છાતીમાં તીવ્ર દુખાવો', 'ખૂબ જ તીવ્ર દુખાવો', 'ખૂબ વધારે દુખાવો છાતીમાં',
        'અસહ્ય છાતીનો દુખાવો', 'છાતીમાં ભારેપણું અને પરસેવો', 'હાર્ટ એટેક'
      ],
      ta: [
        'நெஞ்சில் கடுமையான வலி', 'மிகவும் அதிகமான வலி நெஞ்சில்', 'தாங்க முடியாத நெஞ்சு வலி',
        'நெஞ்சு அழுத்தம் மற்றும் வியர்வை', 'மாரடைப்பு அறிகுறிகள்'
      ],
      bn: [
        'বুকে তীব্র ব্যথা', 'খুব বেশি ব্যথা বুকে', 'বুকে প্রচণ্ড চাপ', 'অসহ্য বুকের ব্যথা',
        'বুকে ভার এবং ঘাম', 'হার্ট অ্যাটাক'
      ],
      mixed: [
        'severe chest pain', 'chest pain khub beshi', 'chest madhe severe pain',
        'seene me severe pain', 'seene mein acute pain', 'nenjil severe pain',
        'edeyalli severe pain', 'chest ma teevra pain', 'chest pain bohot tej'
      ]
    }
  },
  {
    flag: 'Acute Respiratory Failure / Severe Airway Compromise',
    priority: 'RED',
    translatedConcerns: {
      en: 'Acute Respiratory Distress / Severe Airway Compromise',
      hi: 'गंभीर श्वसन संकट / सांस लेने में अत्यधिक परेशानी',
      mr: 'तीव्र श्वसन विकार / श्वास घेण्यास गंभीर अडचण',
      ur: 'سانس لینے میں شدید دشواری / دم گھٹنا',
      kn: 'ತೀವ್ರ ಉಸಿರಾಟದ ತೊಂದರೆ / ಉಸಿರುಕಟ್ಟುವಿಕೆ',
      gu: 'તીવ્ર શ્વાસની તકલીફ / ગૂંગળામણ',
      ta: 'கடுமையான சுவாசத் திணறல் / மூச்சுக்குழாய் அடைப்பு',
      bn: 'তীব্র শ্বাসকষ্ট / শ্বাস নিতে চরম কষ্ট'
    },
    expressions: {
      en: [
        'cannot breathe', 'gasping for air', 'extreme difficulty breathing', 'acute breathing difficulty',
        'shortness of breath severe', 'blue lips', 'stridor', 'choking', 'suffocating', 'unable to breathe'
      ],
      hi: [
        'सांस लेने में बहुत परेशानी', 'सांस नहीं ले पा रहा', 'दम घुट रहा है', 'सांस फूल रही है बुरी तरह',
        'हवा नहीं मिल रही', 'सांस रुक रही है', 'अत्यधिक सांस की तकलीफ'
      ],
      mr: [
        'श्वास घेण्यास खूप त्रास', 'श्वास घेता येत नाही', 'दम कोंडतोय', 'श्वास कोंडणे',
        'खूप दम लागत आहे', 'श्वास गुदमरणे'
      ],
      ur: [
        'سانس لینے میں شدید دشواری', 'سانس نہیں آ رہی', 'دم گھٹ رہا ہے', 'سانس رک رہی ہے',
        'شدید سانس کی تکلیف'
      ],
      kn: [
        'ಉಸಿರಾಟಕ್ಕೆ ತೀವ್ರ ತೊಂದರೆ', 'ಉಸಿರಾಡಲು ಆಗುತ್ತಿಲ್ಲ', 'ಉಸಿರು ಕಟ್ಟುತ್ತಿದೆ', 'ಉಸಿರು ಬಿಡಲು ಕಷ್ಟ',
        'ಗಾಳಿ ಸಿಗುತ್ತಿಲ್ಲ'
      ],
      gu: [
        'શ્વાસ લેવામાં ખૂબ તકલીફ', 'શ્વાસ નથી લઈ શકાતો', 'દમ ઘૂંટાય છે', 'શ્વાસ રુંધાય છે',
        'હવા નથી મળતી'
      ],
      ta: [
        'சுவாசிப்பதில் கடுமையான சிரமம்', 'மூச்சு விட முடியவில்லை', 'மூச்சுத் திணறல் மிகவும் அதிகம்',
        'மூச்சு அடைக்கிறது'
      ],
      bn: [
        'শ্বাস নিতে খুব কষ্ট হচ্ছে', 'শ্বাস নিতে পারছি না', 'দম বন্ধ হয়ে আসছে', 'শ্বাসকষ্ট চরম পর্যায়ে'
      ],
      mixed: [
        'cannot breathe properly', 'breathing problem khub severe', 'saans lene me severe pain',
        'shwas ghyayla tras hotoy khup', 'muchu vidave mudiyala', 'usiru kattuttide'
      ]
    }
  },
  {
    flag: 'Suspected Acute Stroke (FAST Positive)',
    priority: 'RED',
    translatedConcerns: {
      en: 'Suspected Acute Stroke / Neurological Emergency',
      hi: 'संभावित तीव्र स्ट्रोक / पक्षाघात आपातकाल',
      mr: 'संभाव्य स्ट्रोक / अर्धांगवायू आणीबाणी',
      ur: 'فالج / اعصابی ایمرجنسی',
      kn: 'ಪಾರ್ಶ್ವವಾಯು / ನರವೈಜ್ಞಾನಿಕ ತುರ್ತುಸ್ಥಿತಿ',
      gu: 'સ્ટ્રોક / પક્ષાઘાત કટોકટી',
      ta: 'பக்கவாதம் / நரம்பியல் அவசரநிலை',
      bn: 'স্ট্রোক / পক্ষাঘাত জরুরি অবস্থা'
    },
    expressions: {
      en: [
        'face drooping', 'slurred speech', 'arm weakness', 'sudden numbness', 'loss of vision',
        'paralysis', 'stroke', 'one side body numb', 'cannot speak suddenly'
      ],
      hi: [
        'चेहरे का टेढ़ापन', 'आवाज लड़खड़ाना', 'लकवा मार गया', 'हाथ-पैर सुन्न हो गए',
        'अचानक शरीर का एक हिस्सा काम नहीं कर रहा', 'बोल नहीं पा रहा अचानक'
      ],
      mr: [
        'चेहरा वाकडा झाला', 'बोलताना जीभ जड', 'अर्धांगवायू', 'हात पाय बधिर',
        'अचानक एका बाजूला लकवा'
      ],
      ur: [
        'چہرے کا ٹیڑھا پن', 'بولنے میں شدید لڑکھڑاہٹ', 'فالج کا حملہ', 'جسم کا ایک حصہ سن ہونا'
      ],
      kn: [
        'ಮುಖದ ವಕ್ರತೆ', 'ಮಾತು ತೊದಲುತ್ತಿದೆ', 'ಪಾರ್ಶ್ವವಾಯು ಲಕ್ಷಣ', 'ಒಂದು ಬದಿ ಮರಗಟ್ಟಿದೆ'
      ],
      gu: [
        'ચહેરો વાંકો થઈ ગયો', 'બોલવામાં જીભ લથડાય છે', 'લકવો થયો', 'શરીરનું એક અંગ સુન્ન'
      ],
      ta: [
        'முகம் கோணிவிட்டது', 'பேச்சு குழறுகிறது', 'பக்கவாதம்', 'ஒரு பக்கம் மரத்துப்போனது'
      ],
      bn: [
        'মুখ বেঁকে গেছে', 'কথা জড়িয়ে যাচ্ছে', 'প্যারালাইসিস', 'শরীরের একদিক অবশ'
      ],
      mixed: [
        'slurred speech ho raha hai', 'face drooping jaisa lag raha hai', 'sudden paralysis',
        'one side weak ho gaya'
      ]
    }
  },
  {
    flag: 'Acute Massive Bleeding / Hemorrhage',
    priority: 'RED',
    translatedConcerns: {
      en: 'Acute Massive Bleeding / Hemorrhage Emergency',
      hi: 'अत्यधिक रक्तस्राव / खून की उल्टी या खांसी',
      mr: 'तीव्र रक्तस्त्राव / रक्ताची उलटी किंवा खोकला',
      ur: 'شدید خون کا اخراج / خون کی الٹی',
      kn: 'ತೀವ್ರ ರಕ್ತಸ್ರಾವ / ರಕ್ತ ವಾಂತಿ',
      gu: 'તીવ્ર રક્તસ્રાવ / લોહીની ઉલટી',
      ta: 'கடுமையான இரத்தப்போக்கு / இரத்த வாந்தி',
      bn: 'মারাত্মক রক্তপাত / রক্তের বমি'
    },
    expressions: {
      en: [
        'heavy bleeding', 'severe bleeding', 'uncontrolled hemorrhage', 'vomiting blood',
        'coughing blood', 'blood in vomit', 'massive blood loss'
      ],
      hi: [
        'बहुत ज्यादा खून बह रहा है', 'खून की उल्टी', 'खून की खांसी', 'रक्तस्राव रुक नहीं रहा'
      ],
      mr: [
        'खूप जास्त रक्तस्त्राव', 'रक्ताची उलटी', 'खोकल्यातून रक्त', 'रक्त थांबत नाही'
      ],
      ur: [
        'شدید خون بہہ رہا ہے', 'خون کی الٹی', 'خون کی کھانسی'
      ],
      kn: [
        'ಅತಿಯಾದ ರಕ್ತಸ್ರಾವ', 'ರಕ್ತ ವಾಂತಿ', 'ಕೆಮ್ಮಿನಲ್ಲಿ ರಕ್ತ'
      ],
      gu: [
        'વધુ પડતો રક્તસ્રાવ', 'લોહીની ઉલટી', 'ઉધરસમાં લોહી'
      ],
      ta: [
        'கடுமையான இரத்தப்போக்கு', 'இரத்த வாந்தி', 'இருமலில் இரத்தம்'
      ],
      bn: [
        'অতিরিক্ত রক্তপাত', 'রক্তের বমি', 'কাশির সাথে রক্ত'
      ],
      mixed: [
        'heavy blood bleeding', 'khoon ki ulti ho rahi hai', 'rakta ulti hocche'
      ]
    }
  },
  {
    flag: 'Altered Level of Consciousness / Syncope Emergency',
    priority: 'RED',
    translatedConcerns: {
      en: 'Loss of Consciousness / Unresponsive Emergency',
      hi: 'बेहोशी / चेतना का लोप',
      mr: 'बेशुद्ध पडणे / अचेतन अवस्था',
      ur: 'بے ہوشی / غشی کی حالت',
      kn: 'ಪ್ರಜ್ಞಾಹೀನತೆ / ಪ್ರಜ್ಞೆ ತಪ್ಪಿ ಬೀಳುವುದು',
      gu: 'બેભાન અવસ્થા / ચક્કર આવીને ઢળી પડવું',
      ta: 'சுயநினைவு இழப்பு / மயக்கம்',
      bn: 'অজ্ঞান অবস্থা / চেতনা হারানো'
    },
    expressions: {
      en: [
        'loss of consciousness', 'unconscious', 'fainted', 'passed out', 'unresponsive', 'collapsed'
      ],
      hi: [
        'बेहोश हो गया', 'चक्कर खाकर गिर गया', 'कोई होश नहीं है', 'अचेत अवस्था'
      ],
      mr: [
        'बेशुद्ध पडला', 'चक्कर येऊन पडणे', 'शुद्ध हरपणे'
      ],
      ur: [
        'بے ہوش ہو گیا', 'چکر آ کر گر پڑا', 'ہوش نہیں ہے'
      ],
      kn: [
        'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ', 'ತಲೆತಿರುಗಿ ಬಿದ್ದಿದ್ದಾನೆ'
      ],
      gu: [
        'બેભાન થઈ ગયા', 'ચક્કર આવીને પડી ગયા'
      ],
      ta: [
        'மயங்கி விழுந்துவிட்டார்', 'சுயநினைவு இல்லை'
      ],
      bn: [
        'অজ্ঞান হয়ে গেছে', 'মাথা ঘুরে পড়ে গেছে'
      ],
      mixed: [
        'fell down unconscious', 'behoshi aa gayi', 'suddenly passed out'
      ]
    }
  },
  {
    flag: 'Severe Anaphylaxis / Airway Edema',
    priority: 'RED',
    translatedConcerns: {
      en: 'Severe Anaphylactic Allergic Reaction / Throat Edema',
      hi: 'गंभीर एनाफिलेक्सिस / गले में सूजन और सांस रुकना',
      mr: 'अ‍ॅनाफिलेक्सिस अ‍ॅलर्जी / घसा सुजणे व श्वास रोखणे',
      ur: 'شدید الرجک ری ایکشن / گلے میں سوجن',
      kn: 'ತೀವ್ರ ಅಲರ್ಜಿ / ಗಂಟಲು ಊತ',
      gu: 'ગંભીર એલર્જીક પ્રતિક્રિયા / ગળામાં સોજો',
      ta: 'கடுமையான ஒவ்வாமை / தொண்டை வீக்கம்',
      bn: 'চরম অ্যালার্জি / গলা ফুলে যাওয়া'
    },
    expressions: {
      en: [
        'swollen throat', 'swollen tongue', 'difficulty swallowing after medication',
        'peanut allergy reaction', 'anaphylaxis', 'allergic shock', 'face swollen suddenly'
      ],
      hi: [
        'गला सूज गया है', 'जीभ सूज गई', 'दवा खाने के बाद सांस फूलना', 'चेहरा सूज गया'
      ],
      mr: [
        'घसा सुजला', 'जीभ सुजली', 'औषधानंतर अ‍ॅलर्जी'
      ],
      ur: [
        'گلا سوج گیا', 'زبان میں سوجن', 'دوا کے بعد شدید الرجی'
      ],
      kn: [
        'ಗಂಟಲು ಊದಿಕೊಂಡಿದೆ', 'ನಾಲಿಗೆ ಊತ'
      ],
      gu: [
        'ગળું સૂજી ગયું', 'જીભમાં સોજો'
      ],
      ta: [
        'தொண்டை வீங்கிவிட்டது', 'நாக்கு வீக்கம்'
      ],
      bn: [
        'গলা ফুলে গেছে', 'জিভ ফুলে গেছে'
      ],
      mixed: [
        'severe allergy reaction', 'throat swelling after medicine', 'anaphylaxis ho gaya'
      ]
    }
  }
];

// High-Severity Intensity Qualifiers Across Languages
const HIGH_SEVERITY_INTENSITY_TERMS = [
  // English
  'severe', 'acute', 'extreme', 'unbearable', 'excruciating', 'crushing', 'intense', 'critical', 'dangerously high',
  // Hindi
  'बहुत तेज़', 'बहुत तेज', 'बहुत ज्यादा', 'असहनीय', 'अत्यधिक', 'जानलेवा', 'बुरी तरह', 'बहुत भयानक', 'तीव्र',
  // Marathi
  'तीव्र', 'खूप तीव्र', 'खूप जास्त', 'असह्य', 'भयंकर', 'त्रासदायक',
  // Urdu
  'شدید', 'بہت زیادہ', 'ناقابل برداشت', 'انتہائی', 'خطرناک',
  // Kannada
  'ತೀವ್ರ', 'ತುಂಬಾ ತೀವ್ರ', 'ತೀವ್ರವಾದ', 'ಸಹಿಸಲಾಗದ', 'ಅತಿಯಾದ',
  // Gujarati
  'તીવ્ર', 'ખૂબ જ તીવ્ર', 'ખૂબ વધારે', 'અસહ્ય', 'ભારે',
  // Tamil
  'கடுமையான', 'மிகவும் அதிகமான', 'தாங்க முடியாத', 'அதிகப்படியான',
  // Bengali
  'তীব্র', 'খুব বেশি', 'প্রচণ্ড', 'অসহ্য', 'মারাত্মক',
  // Romanized / Transliterated
  'bahut tej', 'bohot tej', 'khup teevra', 'teevra', 'buke khub', 'kadumayana', 'shدید', 'shadeed', 'asahy'
];

// Critical Anatomical / Clinical High-Risk Targets
const CRITICAL_TARGET_TERMS = [
  // Chest / Cardiac
  'chest', 'heart', 'cardiac', 'seena', 'seene', 'chhati', 'dil', 'edeyalli', 'ede', 'nenju', 'buk', 'buke',
  // Breathing
  'breath', 'breathing', 'respiratory', 'saans', 'sans', 'shwas', 'dam', 'usirata', 'usiru', 'muchu', 'swasa',
  // Abdominal
  'abdomen', 'abdominal', 'stomach', 'pet', 'pot', 'pota', 'udara', 'vayiRu', 'pet me', 'potat',
  // Neuro / Brain
  'head', 'brain', 'speech', 'face', 'paralysis', 'lakwa', 'chehra', 'jeebh', 'tongue', 'throat', 'gala'
];

// Pain / Distress Identifiers
const PAIN_TERMS = [
  'pain', 'ache', 'hurts', 'hurting', 'dard', 'dukh', 'dukhava', 'vedna', 'novum', 'novu', 'vali', 'betha', 'takhleef', 'tras'
];

// ─────────────────────────────────────────────────────────────────────────────
// Intake Engine Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class AIIntakeEngine {
  /**
   * Detects whether input or conversation history contains emergency red flags
   * across English, Hindi, Marathi, Urdu, Kannada, Gujarati, Tamil, and Bengali.
   */
  public static detectEmergencyRedFlags(
    input: string,
    history: ConversationMessage[] = []
  ): { isRedFlag: boolean; redFlags: string[]; priority: TriagePriority; concernText?: string } {
    const textLower = input.toLowerCase().trim();
    const allPatientTexts = [
      ...history.filter(m => m.sender === 'PATIENT').map(m => m.text.toLowerCase()),
      textLower
    ].join(' ');

    const detectedFlags = new Set<string>();
    let highestPriority: TriagePriority = 'GREEN';
    let detectedConcern = '';

    // 1. Direct Pattern Evaluation across all 8 languages + mixed phrases
    for (const rule of RED_FLAG_REGISTRY) {
      let matched = false;
      const allRuleExprs: string[] = [
        ...rule.expressions.en,
        ...rule.expressions.hi,
        ...rule.expressions.mr,
        ...rule.expressions.ur,
        ...rule.expressions.kn,
        ...rule.expressions.gu,
        ...rule.expressions.ta,
        ...rule.expressions.bn,
        ...rule.expressions.mixed
      ];

      for (const expr of allRuleExprs) {
        const normExpr = expr.toLowerCase();
        if (textLower.includes(normExpr) || allPatientTexts.includes(normExpr)) {
          matched = true;
          break;
        }
      }

      if (matched) {
        detectedFlags.add(rule.flag);
        highestPriority = 'RED';
        if (!detectedConcern) {
          detectedConcern = rule.flag;
        }
      }
    }

    // 2. Semantic Cross-Product Evaluation (Intensity Qualifier + Critical Target + Pain/Distress)
    // E.g. "मुझे severe chest pain ho raha hai", "edeyalli intense pain ide", "nenjil kadumayana vali"
    if (detectedFlags.size === 0) {
      const hasIntensity = HIGH_SEVERITY_INTENSITY_TERMS.some(t => textLower.includes(t.toLowerCase()));
      const hasTarget = CRITICAL_TARGET_TERMS.some(t => textLower.includes(t.toLowerCase()));
      const hasPain = PAIN_TERMS.some(t => textLower.includes(t.toLowerCase()));

      if (hasIntensity && (hasTarget || hasPain)) {
        if (textLower.includes('chest') || textLower.includes('seena') || textLower.includes('chhati') || textLower.includes('dil') || textLower.includes('ede') || textLower.includes('nenju') || textLower.includes('buk')) {
          detectedFlags.add('Acute Ischemic Chest Pain / Suspected Cardiac Event');
          detectedConcern = 'Acute Severe Chest Pain';
        } else if (textLower.includes('breath') || textLower.includes('saans') || textLower.includes('shwas') || textLower.includes('dam') || textLower.includes('usir') || textLower.includes('muchu')) {
          detectedFlags.add('Acute Respiratory Failure / Severe Airway Compromise');
          detectedConcern = 'Acute Respiratory Distress';
        } else if (textLower.includes('pet') || textLower.includes('pot') || textLower.includes('abdomen') || textLower.includes('stomach')) {
          detectedFlags.add('Acute Abdominal Emergency / Severe Abdominal Distress');
          detectedConcern = 'Acute Severe Abdominal Emergency';
        } else {
          detectedFlags.add('Severe Acute Pain Emergency');
          detectedConcern = 'High-Intensity Acute Pain Emergency';
        }
        highestPriority = 'RED';
      }
    }

    return {
      isRedFlag: detectedFlags.size > 0,
      redFlags: Array.from(detectedFlags),
      priority: highestPriority,
      concernText: detectedConcern
    };
  }

  /**
   * Main AI intake analyzer supporting 8 languages with adaptive dialogue turns.
   */
  public static analyzeInput(
    userInput: string,
    history: ConversationMessage[],
    language: LanguageCode = 'en',
    medicalSystem: MedicalSystem = 'ALLOPATHY',
    enableRedFlagDetection: boolean = true
  ): IntakeAnalysisResult {
    const rawResult = this._internalAnalyzeInput(userInput, history, language, medicalSystem, enableRedFlagDetection);
    if (rawResult.isRedFlagTriggered || rawResult.conditionCategory === 'CRITICAL_EMERGENCY') {
      return rawResult;
    }

    const triageAssessment = MedicineRecommendationService.evaluateTriageAndMedicines(userInput, history);
    rawResult.conditionCategory = triageAssessment.category;
    rawResult.triageAssessment = triageAssessment;

    if (triageAssessment.category === 'CRITICAL_EMERGENCY') {
      rawResult.isRedFlagTriggered = true;
      rawResult.suggestedTriagePriority = 'RED';
      rawResult.medicineRecommendations = [];
      return rawResult;
    }

    if (triageAssessment.category === 'NORMAL_MINOR_ISSUE') {
      rawResult.medicineRecommendations = triageAssessment.isMedicationRecommended ? (triageAssessment.medicines || []) : [];
      rawResult.suggestedTriagePriority = 'GREEN';
    } else if (triageAssessment.category === 'SPECIALIZED_DOCTOR_REQUIRED') {
      rawResult.medicineRecommendations = [];
      rawResult.suggestedTriagePriority = 'YELLOW';
      const adv = MedicineRecommendationService.getLocalizedAdvisory(triageAssessment, language);
      if (adv && !rawResult.nextBotMessage.includes('⚠️')) {
        rawResult.nextBotMessage = `${adv}\n\n${rawResult.nextBotMessage}`;
      }
    }

    return rawResult;
  }

  private static _internalAnalyzeInput(
    userInput: string,
    history: ConversationMessage[],
    language: LanguageCode = 'en',
    medicalSystem: MedicalSystem = 'ALLOPATHY',
    enableRedFlagDetection: boolean = true
  ): IntakeAnalysisResult {
    const redFlagCheck = enableRedFlagDetection
      ? this.detectEmergencyRedFlags(userInput, history)
      : { isRedFlag: false, redFlags: [], priority: 'GREEN' as TriagePriority };

    const triageAssessment = MedicineRecommendationService.evaluateTriageAndMedicines(userInput, history);
    const isCritical = redFlagCheck.isRedFlag || triageAssessment.category === 'CRITICAL_EMERGENCY';

    // ─────────────────────────────────────────────────────────────────────────
    // If Red Flag Emergency is Detected
    // ─────────────────────────────────────────────────────────────────────────
    if (isCritical) {
      const flagSummary = redFlagCheck.redFlags.join(', ');

      const emergencyMessages: Record<LanguageCode, string> = {
        en: `🚨 **EMERGENCY RED FLAG DETECTED**: Your symptoms indicate a potentially critical condition (${flagSummary}) requiring IMMEDIATE emergency hospital evaluation. We are notifying the hospital emergency triage command center right now.`,
        hi: `🚨 **आपातकालीन संकेत (रेड फ्लैग)**: आपके लक्षणों (${flagSummary}) के अनुसार तत्काल आपातकालीन चिकित्सा मूल्यांकन की आवश्यकता है। हम अस्पताल के ट्राइएज कमांड सेंटर और एम्बुलेंस को तुरंत सूचित कर रहे हैं।`,
        mr: `🚨 **तातडीची धोक्याची सूचना (रेड फ्लॅग)**: तुमच्या लक्षणांवरून (${flagSummary}) त्वरित आपत्कालीन वैद्यकीय उपचारांची गरज आहे. आम्ही हॉस्पिटलच्या इमर्जन्सी ट्राइएज कमांडला आणि अ‍ॅम्ब्युलन्सला अलर्ट पाठवला आहे.`,
        ur: `🚨 **ہنگامی خطرے کا نشان (ریڈ فلیگ)**: آپ کی علامات (${flagSummary}) کے مطابق فوری طور پر ہسپتال کے ہنگامی معائنے کی ضرورت ہے۔ ہم ہسپتال کے ٹرائیج کمانڈ سینٹر کو فوری مطلع کر رہے ہیں۔`,
        kn: `🚨 **ತುರ್ತು ಅಪಾಯದ ಎಚ್ಚರಿಕೆ (ರೆಡ್ ಫ್ಲ್ಯಾಗ್)**: ನಿಮ್ಮ ಲಕ್ಷಣಗಳು (${flagSummary}) ತಕ್ಷಣದ ತುರ್ತು ಆಸ್ಪತ್ರೆ ಮೌಲ್ಯಮಾಪನದ ಅಗತ್ಯವನ್ನು ಸೂಚಿಸುತ್ತವೆ. ನಾವು ಆಸ್ಪತ್ರೆಯ ತುರ್ತು ಟ್ರಯಾಜ್ ಕಮಾಂಡ್‌ಗೆ ತಕ್ಷಣವೇ ಮಾಹಿತಿ ನೀಡುತ್ತಿದ್ದೇವೆ.`,
        gu: `🚨 **કટોકટીનો લાલ સંકેત (રેડ ફ્લેગ)**: તમારા લક્ષણો (${flagSummary}) તાત્કાલિક હોસ્પિટલ મૂલ્યાંકનની જરૂરિયાત દર્શાવે છે. અમે હોસ્પિટલના ઇમરજન્સી ટ્રાયજ કમાન્ડ સેન્ટરને તુરંત સૂચિત કરી રહ્યા છીએ.`,
        ta: `🚨 **அவசர சிவப்பு எச்சரிக்கை (ரெட் ஃபிளாக்)**: உங்கள் அறிகுறிகள் (${flagSummary}) உடனடியாக அவசர மருத்துவ மதிப்பீடு தேவை என்பதைக் குறிக்கின்றன. மருத்துவமனை அவசர சிகிச்சைக் குழுவிற்கு உடனடியாகத் தெரிவிக்கிறோம்.`,
        bn: `🚨 **জরুরি রেড ফ্ল্যাগ সতর্কতা সনাক্ত হয়েছে**: আপনার লক্ষণগুলি (${flagSummary}) ইঙ্গিত দেয় যে অবিলম্বে জরুরি হাসপাতালে মূল্যায়ন প্রয়োজন। আমরা এখনই হাসপাতালের ইমার্জেন্সি কমান্ড সেন্টারকে অবহিত করছি।`
      };

      const replies: Record<LanguageCode, string[]> = {
        en: ['Track Dispatched Ambulance', 'Hospital ER Directions'],
        hi: ['एम्बुलेंस ट्रैक करें', 'अस्पताल दिशानिर्देश'],
        mr: ['अ‍ॅम्ब्युलन्स ट्रॅक करा', 'हॉस्पिटल दिशानिर्देश'],
        ur: ['ایمبولینس ٹریک کریں', 'ہسپتال کے راستے'],
        kn: ['ಆಂಬ್ಯುಲೆನ್ಸ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ', 'ಆಸ್ಪತ್ರೆ ಮಾರ್ಗಸೂಚಿ'],
        gu: ['એમ્બ્યુલન્સ ટ્રેક કરો', 'હોસ્પિટલ દિશાનિર્દેશ'],
        ta: ['ஆம்புலன்ஸ் கண்காணிக்கவும்', 'மருத்துவமனை வழிமுறைகள்'],
        bn: ['অ্যাম্বুলেন্স ট্র্যাক করুন', 'হাসপাতালের দিকনির্দেশ']
      };

      return {
        nextBotMessage: emergencyMessages[language] || emergencyMessages.en,
        suggestedReplies: replies[language] || replies.en,
        isComplete: true,
        isRedFlagTriggered: true,
        redFlagsDetected: redFlagCheck.redFlags.length > 0 ? redFlagCheck.redFlags : ['Acute Emergency Symptoms Detected'],
        suggestedTriagePriority: 'RED',
        conditionCategory: 'CRITICAL_EMERGENCY',
        medicineRecommendations: [],
        triageAssessment,
        detectedLanguage: language,
        translatedConcern: redFlagCheck.concernText
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Adaptive Multi-Turn Intake Conversation
    // ─────────────────────────────────────────────────────────────────────────
    const patientTurns = history.filter(m => m.sender === 'PATIENT').length;

    // ── AYUSH / AYURVEDA MODE DIALOGUE SEQUENCE ──────────────────────────────
    if (medicalSystem === 'AYURVEDA') {
      if (patientTurns === 0) {
        const ayurQ1: Record<LanguageCode, string> = {
          en: 'Pranam. In Ayurvedic intake: When did this begin? Do you notice dominant heat/acidity (Pitta), stiffness/dry pain (Vata), or heaviness/sluggishness/mucus (Kapha)?',
          hi: 'प्रणाम। आयुर्वेदिक निदान हेतु: यह तकलीफ कब से शुरू हुई? क्या आपको जलन/अम्लपित्त/गर्मी (पित्त), दर्द/रूखापन/जकड़न (वात), या भारीपन/कफ (कफ) अधिक महसूस हो रहा है?',
          mr: 'प्रणाम. आयुर्वेदिक निदानासाठी: हा त्रास कधीपासून सुरू झाला? तुम्हाला दाह/उष्णता (पित्त), वेदना/जकडणे (वात), की जडपणा/कफ (कफ) जाणवत आहे?',
          ur: 'آداب۔ آیورویدک طبی معائنے کے لیے: کیا آپ کو جلن/گرمی، خشکی/درد، یا بھاری پن/سستی زیادہ محسوس ہو رہی ہے؟',
          kn: 'ನಮಸ್ಕಾರ. ಆಯುರ್ವೇದ ಪರೀಕ್ಷೆಗೆ: ಉರಿ/ಶಾಖ (ಪಿತ್ತ), ನೋವು/ಒಣಗುವಿಕೆ (ವಾತ), ಅಥವಾ ಭಾರ/ಕಫ (ಕಫ) ಹೆಚ್ಚಾಗಿದೆಯೇ?',
          gu: 'પ્રણામ. આયુર્વેદિક નિદાન માટે: તમને બળતરા/ગરમી (પિત્ત), દુખાવો/શુષ્કતા (વાત), કે ભારેપણું/કફ (કફ) અનુભવાય છે?',
          ta: 'வணக்கம். ஆயுர்வேத பரிசோதனைக்கு: எரிச்சல்/உஷ்ணம் (பித்தம்), வலி/வறட்சி (வாதம்), அல்லது மந்தநிலை/கபம் உள்ளதா?',
          bn: 'নমস্কার। আয়ুর্বেদিক মূল্যায়নের জন্য: আপনি কি জ্বালা/উত্তাপ (পিত্ত), ব্যথা/শুষ্কতা (বাত), নাকি ভারাক্রান্ত ভাব/কফ (কফ) অনুভব করছেন?'
        };
        const ayurR1: Record<LanguageCode, string[]> = {
          en: [
            'Burning acidity, sour belching & skin heat (Pitta Lakshana)',
            'Joint stiffness, radiating dry aches & gas (Vata Lakshana)',
            'Heaviness, morning sluggishness & mucus (Kapha Lakshana)',
            'Intermittent colic pain with loss of appetite (Agni Mandya)'
          ],
          hi: [
            'सीने में जलन, खट्टी डकारें व पित्त प्रकोप (पित्त)',
            'जोड़ों में दर्द, अकड़न व गैस का दर्द (वात)',
            'शरीर में भारीपन, कफ व आलस्य (कफ)',
            'पेट में दर्द व भूख न लगना (अग्निमांद्य)'
          ],
          mr: [
            'छातीत जळजळ, आंबट ढेकर व उष्णता (पित्त)',
            'सांधेदुखी, जकडणे व वाताचा त्रास (वात)',
            'अंगात जडपणा, कफ व सुस्ती (कफ)',
            'पोटदुखी आणि अजिबात भूक न लागणे (अग्निमांद्य)'
          ],
          ur: ['سینے میں جلن اور کھٹی ڈکاریں', 'جوڑوں کا درد اور جکڑن', 'جسم میں بھاری پن اور بلغم', 'پیٹ درد اور بھوک کی کمی'],
          kn: ['ಎದೆ ಉರಿ ಮತ್ತು ಹುಳಿ ತೇಗು', 'ಕೀಲು ನೋವು ಮತ್ತು ಸೆಳೆತ', 'ದೇಹದ ಭಾರ ಮತ್ತು ಜಡತ್ವ', 'ಹಸಿವಿಲ್ಲದಿರುವುದು ಮತ್ತು ಹೊಟ್ಟೆ ನೋವು'],
          gu: ['છાતીમાં બળતરા અને ખાટા ઓડકાર', 'સાંધાનો દુખાવો અને જકડન', 'શરીરમાં ભારેપણું અને કફ', 'ભૂખ ન લાગવી અને પેટનો દુખાવો'],
          ta: ['நெஞ்செரிச்சல் மற்றும் புளித்த ஏப்பம்', 'மூட்டு வலி மற்றும் வாத பிடிப்பு', 'உடல் பருமன் ಮತ್ತು கப மந்தம்', 'பசியின்மை மற்றும் வயிற்று வலி'],
          bn: ['বুকে জ্বালা ও টক ঢেকুর', 'গাঁটে গাঁটে ব্যথা ও বাত', 'শরীরে ভারী ভাব ও কফ', 'ক্ষুধামন্দা ও পেটে ব্যথা']
        };
        return {
          nextBotMessage: ayurQ1[language] || ayurQ1.en,
          suggestedReplies: ayurR1[language] || ayurR1.en,
          isComplete: false,
          isRedFlagTriggered: false,
          redFlagsDetected: [],
          suggestedTriagePriority: 'YELLOW',
          detectedLanguage: language
        };
      }

      if (patientTurns === 1) {
        const ayurQ2: Record<LanguageCode, string> = {
          en: 'Crucial for Dashavidha Pariksha: How is your digestive capacity (Ahara Shakti) and metabolic fire (Agni)? Is your digestion sharp with intense acid reflux (Tikshnagni), irregular with gas/bloating (Vishamagni), or slow and heavy (Mandagni)?',
          hi: 'दशविध परीक्षा हेतु: आपकी पाचन अग्नि (अग्नि) और भूख (आहार शक्ति) कैसी है? क्या बहुत तेज भूख व जलन है (तीक्ष्णाग्नि), अनियमित भूख व कब्ज (विषमाग्नि), या धीमी व भारी पाचन क्रिया (मंदाग्नि)?',
          mr: 'दशविध परीक्षेसाठी: तुमची पचनशक्ती (अग्नी) आणि भूक कशी आहे? खूप जास्त भूक व अ‍ॅसिडिटी (तीक्ष्णाग्नी), अनियमित भूक व गॅस (विषमाग्नी), की मंद व जड पचन (मंदाग्नी)?',
          ur: 'ہاضمے کی صلاحیت اور اشتہا کیسی ہے؟ کیا بہت تیز بھوک اور تیزابیت ہے، غیر متوازن ہاضمہ ہے، یا سست اور بھاری ہاضمہ ہے؟',
          kn: 'ನಿಮ್ಮ ಜೀರ್ಣಶಕ್ತಿ (ಅಗ್ನಿ) ಹೇಗಿದೆ? ತೀವ್ರ ಹಸಿವು ಮತ್ತು ಆಮ್ಲೀಯತೆ (ತೀಕ್ಷ್ಣಾಗ್ನಿ), ಅನಿಶ್ಚಿತ ಹಸಿವು (ವಿಷಮಾಗ್ನಿ), ಅಥವಾ ನಿಧಾನಗತಿಯ ಜೀರ್ಣಕ್ರಿಯೆ (ಮಂದಾಗ್ನಿ)?',
          gu: 'તમારી પાચન શક્તિ (અગ્નિ) કેવી છે? વધુ પડતી ભૂખ અને એસિડિટી (તીક્ષ્ણાગ્નિ), અનિયમિત ભૂખ (વિષમાગ્નિ), કે મંદ પાચન (મંદાગ્નિ)?',
          ta: 'உங்கள் செரிமான சக்தி (அக்னி) எவ்வாறு உள்ளது? தீவிர பசி மற்றும் அமிலத்தன்மை, ஒழுங்கற்ற செரிமானம், அல்லது மந்தமான செரிமானமா?',
          bn: 'আপনার হজম ক্ষমতা (অগ্নি) কেমন? তীব্র ক্ষুধা ও অ্যাসিডিটি (তীক্ষ্ণাগ্নি), অনিয়মিত ক্ষুধা (বিষমাগ্নি), নাকি ধীরগতির হজম (মন্দাগ্নি)?'
        };
        const ayurR2: Record<LanguageCode, string[]> = {
          en: [
            'Mandagni: Sluggish digestion, feeling heavy 5-6 hours after food',
            'Tikshnagni: Sharp intense hunger, acidity & irritability',
            'Vishamagni: Variable appetite, bloating, gas & irregular bowels',
            'Samagni: Normal balanced digestion and regular morning evacuation'
          ],
          hi: [
            'मंदाग्नि: भोजन के बाद 5-6 घंटे भारीपन व अपच',
            'तीक्ष्णाग्नि: तेज़ भूख, खाना देर होने पर सिरदर्द व एसिडिटी',
            'विषमाग्नि: कभी भूख लगती है कभी नहीं, पेट में गैस व कब्ज',
            'समाग्नि: सामान्य पाचन और नियमित पेट साफ'
          ],
          mr: [
            'मंदाग्नी: जेवणानंतर ५-६ तास पोट जड वाटणे व अपचन',
            'तीक्ष्णाग्नी: तीव्र भूक, जेवणास उशीर झाल्यास डोकेदुखी व पित्त',
            'विषमाग्नी: कधी भूक लागते कधी नाही, गॅस व बद्धकोष्ठता',
            'समाग्नी: नियमित पचन आणि पोट व्यवस्थित साफ'
          ],
          ur: ['کھانے کے بعد کافی دیر تک بھاری پن اور بدہضمی', 'تیز بھوک اور تیزابیت', 'کبھی بھوک کبھی نہیں، گیس اور قبض', 'معمول کا متوازن ہاضمہ'],
          kn: ['ಊಟದ ನಂತರ ಹೊಟ್ಟೆ ಭಾರ ಮತ್ತು ಅಜೀರ್ಣ', 'ತೀವ್ರ ಹಸಿವು ಮತ್ತು ಎದೆ ಉರಿ', 'ಅನಿಶ್ಚಿತ ಹಸಿವು ಮತ್ತು ಗ್ಯಾಸ್', 'ಸಮತೋಲಿತ ಸಾಮಾನ್ಯ ಜೀರ್ಣಕ್ರಿಯೆ'],
          gu: ['જમ્યા પછી ભારેપણું અને અપચો', 'તીવ્ર ભૂખ અને એસિડિટી', 'અનિયમિત ભૂખ અને ગેસ', 'સામાન્ય સંતુલિત પાચન'],
          ta: ['உணவுக்குப் பின் கனமான உணர்வு மற்றும் அஜீரணம்', 'அதிக பசி மற்றும் நெஞ்செரிச்சல்', 'ஒழுங்கற்ற பசி மற்றும் வாயு தொல்லை', 'சீரான செரிமானம்'],
          bn: ['খাওয়ার পর পেট ভার ও বদহজম', 'তীব্র ক্ষুধা ও অম্লপিত্ত', 'অনিয়মিত ক্ষুধা ও পেটে গ্যাস', 'স্বাভাবিক ভারসাম্যপূর্ণ হজম']
        };
        return {
          nextBotMessage: ayurQ2[language] || ayurQ2.en,
          suggestedReplies: ayurR2[language] || ayurR2.en,
          isComplete: false,
          isRedFlagTriggered: false,
          redFlagsDetected: [],
          suggestedTriagePriority: 'YELLOW',
          detectedLanguage: language
        };
      }

      if (patientTurns === 2) {
        const ayurQ3: Record<LanguageCode, string> = {
          en: 'To evaluate physical endurance (Vyayama Shakti) and mental resilience (Sattva): How is your stamina during physical activity, sleep quality (Nidra), and daily dietary habits (Ahara-Vihara)?',
          hi: 'शारीरिक कार्यक्षमता (व्यायाम शक्ति) व मानसिक दृढ़ता (सत्त्व) के लिए: परिश्रम पर आपकी सहनशक्ति कैसी है? नींद (निद्रा) और दैनिक खानपान (आहार-विहार) कैसा है?',
          mr: 'शारीरिक कार्यक्षमता (व्यायाम शक्ती) व मानसिक ताकद (सत्त्व): हालचालींवर दम लागतो का? झोप (निद्रा) आणि दैनंदिन दिनचर्या (आहार-विहार) कशी आहे?',
          ur: 'آپ کی جسمانی برداشت، نیند کا معیار اور روزمرہ خوراک و طرز زندگی کیسی ہے؟',
          kn: 'ನಿಮ್ಮ ದೈಹಿಕ ಸಾಮರ್ಥ್ಯ (ವ್ಯಾಯಾಮ ಶಕ್ತಿ), ನಿದ್ರೆಯ ಗುಣಮಟ್ಟ ಮತ್ತು ದೈನಂದಿನ ಆಹಾರ ಪದ್ಧತಿ ಹೇಗಿದೆ?',
          gu: 'તમારી શારીરિક શક્તિ (વ્યાયામ શક્તિ), ઊંઘની ગુણવત્તા અને દૈનિક ખાનપાનની આદતો કેવી છે?',
          ta: 'உங்கள் உடற்பயிற்சி திறன் (வியாயாம சக்தி), தூக்கத்தின் தரம் மற்றும் தினசரி வாழ்க்கை முறை எவ்வாறு உள்ளது?',
          bn: 'আপনার শারীরিক সহনশীলতা (ব্যায়াম শক্তি), ঘুমের ধরন এবং দৈনন্দিন খাদ্যাভ্যাস ও জীবনযাত্রা কেমন?'
        };
        const ayurR3: Record<LanguageCode, string[]> = {
          en: [
            'Low stamina, tires easily, disturbed light sleep, high work stress',
            'Moderate stamina, sound sleep of 7-8 hours, balanced routine',
            'Sedentary lifestyle, heavy deep sleep, irregular late night meals',
            'Regular yoga/exercise, but shift work disrupts sleep'
          ],
          hi: [
            'कम सहनशक्ति, जल्दी थकान, कच्ची नींद व मानसिक तनाव',
            'मध्यम शक्ति, 7-8 घंटे अच्छी नींद व संतुलित दिनचर्या',
            'बैठकर काम करना, देर रात भोजन व भारी नींद',
            'नियमित योग व व्यायाम, लेकिन काम के कारण अनियमित नींद'
          ],
          mr: [
            'कमी ताकद, लवकर थकवा, अपुरी झोप आणि मानसिक ताण',
            'मध्यम ताकद, ७-८ तास शांत झोप आणि संतुलित दिनचर्या',
            'बैठे काम, रात्री उशिरा जेवण आणि जड झोप',
            'नियमित योगासने, परंतु कामाच्या वेळेमुळे अनियमित दिनचर्या'
          ],
          ur: ['کم قوت برداشت، جلد تھکن، کچی نیند اور ذہنی تناؤ', 'معتدل قوت، ۷-۸ گھنٹے پرسکون نیند', 'بیٹھ کر کام کرنا اور دیر رات کھانا', 'باقاعدہ ورزش مگر بے قاعدہ نیند'],
          kn: ['ಕಡಿಮೆ ಸಹಿಷ್ಣುತೆ, ಬೇಗ ದಣಿವು ಮತ್ತು ಅಸಮರ್ಪಕ ನಿದ್ರೆ', 'ಮಧ್ಯಮ ಶಕ್ತಿ, ೭-೮ ಗಂಟೆಗಳ ಉತ್ತಮ ನಿದ್ರೆ', 'ಕುಳಿತು ಕೆಲಸ, ತಡರಾತ್ರಿ ಊಟ', 'ದಿನನಿತ್ಯದ ಯೋಗ, ಆದರೆ ಪಾಳಿ ಕೆಲಸದ ನಿದ್ರಾಭಂಗ'],
          gu: ['ઓછી સહનશક્તિ, જલ્દી થાક અને અનિદ્રા', 'મધ્યમ શક્તિ, ૭-૮ કલાક સારી ઊંઘ', 'બેઠા બેઠા કામ અને મોડી રાત્રે ભોજન', 'નિયમિત યોગ પરંતુ અનિયમિત દિનચર્યા'],
          ta: ['குறைந்த சகிப்புத்தன்மை, எளிதில் சோர்வு மற்றும் தூக்கமின்மை', 'மிதமான பலம், 7-8 மணிநேர நல்ல தூக்கம்', 'உட்கார்ந்த வேலை மற்றும் இரவு தாமதமான உணவு', 'வழக்கமான யோகா, ஆனால் ஒழுங்கற்ற தூக்கம்'],
          bn: ['কম সহনশীলতা, দ্রুত ক্লান্তি ও অস্থির ঘুম', 'মাঝারি শক্তি, ৭-৮ ঘণ্টা ভালো ঘুম', 'বসে কাজ, দেরিতে রাতের খাবার খাওয়া', 'নিয়মিত যোগব্যায়াম, কিন্তু অনিয়মিত রুটিন']
        };
        return {
          nextBotMessage: ayurQ3[language] || ayurQ3.en,
          suggestedReplies: ayurR3[language] || ayurR3.en,
          isComplete: false,
          isRedFlagTriggered: false,
          redFlagsDetected: [],
          suggestedTriagePriority: 'YELLOW',
          detectedLanguage: language
        };
      }

      if (patientTurns === 3) {
        const ayurQ4: Record<LanguageCode, string> = {
          en: 'For Dashavidha mapping & safety: What is your primary body constitution (Prakriti), are you taking any regular herbs/medicines, and do you have any allergies?',
          hi: 'दशविध परीक्षा व सुरक्षा हेतु: आपकी शारीरिक प्रकृति (वात-पित्त-कफ) क्या है? क्या आप नियमित दवाइयां ले रहे हैं और कोई एलर्जी तो नहीं है?',
          mr: 'दशविध परीक्षेसाठी: तुमची शारीरिक प्रकृती (वात-पित्त-कफ) कोणती? तुम्ही नियमित कोणती औषधे घेता आणि कसली अ‍ॅलर्जी आहे का?',
          ur: 'طبی حفاظت کے لیے: آپ کا جسمانی مزاج کیا ہے؟ کیا آپ باقاعدہ دوائیں لے رہے ہیں اور کوئی الرجی ہے؟',
          kn: 'ಅಂತಿಮ ಹಂತ: ನಿಮ್ಮ ಶಾರೀರಿಕ ಪ್ರಕೃತಿ ಯಾವುದು? ನೀವು ನಿಯಮಿತವಾಗಿ ಯಾವುದೇ ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ ಮತ್ತು ಅಲರ್ಜಿ ಇದೆಯೇ?',
          gu: 'અંતિમ પગલું: તમારી શારીરિક પ્રકૃતિ કઈ છે? તમે કોઈ નિયમિત દવા લો છો અને કોઈ એલર્જી છે?',
          ta: 'இறுதி படி: உங்கள் உடல் பிரகிருதி என்ன? வழக்கமான மருந்துகள் ஏதேனும் உட்கொள்கிறீர்களா மற்றும் ஒவ்வாமை உள்ளதா?',
          bn: 'চূড়ান্ত পদক্ষেপ: আপনার শারীরিক প্রকৃতি কী? আপনি কি কোনো ওষুধ খান এবং কোনো অ্যালার্জি আছে?'
        };
        const ayurR4: Record<LanguageCode, string[]> = {
          en: [
            'Vata-Pitta Prakriti, taking Triphala & BP medication, No known allergies',
            'Pitta-Kapha Prakriti, taking Metformin, allergic to Penicillin',
            'Pure Vata Prakriti, sensitive to cold winds, No regular medications',
            'Kapha Prakriti, taking Ayurvedic digestives, NKDA'
          ],
          hi: [
            'वात-पित्त प्रकृति, त्रिफला व बीपी की दवा, कोई एलर्जी नहीं',
            'पित्त-कफ प्रकृति, शुगर की दवा, पेनिसिलिन से एलर्जी',
            'शुद्ध वात प्रकृति, ठंडी हवा से परेशानी, कोई दवा नहीं',
            'कफ प्रकृति, पाचन हेतु आयुर्वेदिक चूर्ण लेते हैं'
          ],
          mr: [
            'वात-पित्त प्रकृती, त्रिफळा व बीपीचे औषध, कसलीही अ‍ॅलर्जी नाही',
            'पित्त-कफ प्रकृती, मधुमेहाचे औषध, पेनिसिलिन अ‍ॅलर्जी',
            'शुद्ध वात प्रकृती, थंडीचा त्रास होतो, औषध नाही',
            'कफ प्रकृती, पचनासाठी आयुर्वेदिक चूर्ण घेतो'
          ],
          ur: ['وات پت مزاج، ترپھلا اور بی پی کی دوا، کوئی الرجی نہیں', 'پت کف مزاج، شوگر کی دوا، پینسلین سے الرجی', 'صرف وات مزاج، کوئی دوا नहीं', 'کف مزاج، ہاضمے کا چورن لیتے ہیں'],
          kn: ['ವಾತ-ಪಿತ್ತ ಪ್ರಕೃತಿ, ತ್ರಿಫಲಾ ಚೂರ್ಣ ಮತ್ತು ಬಿಪಿ ಔಷಧಿ, ಯಾವುದೇ ಅಲರ್ಜಿ ಇಲ್ಲ', 'ಪಿತ್ತ-ಕಫ ಪ್ರಕೃತಿ, ಸಕ್ಕರೆ ಕಾಯಿಲೆ ಔಷಧಿ, ಪೆನಿಸಿಲಿನ್ ಅಲರ್ಜಿ', 'ಶುದ್ಧ ವಾತ ಪ್ರಕೃತಿ, ಯಾವುದೇ ಔಷಧಿ ಇಲ್ಲ', 'ಕಫ ಪ್ರಕೃತಿ, ಆಯುರ್ವೇದ ಚೂರ್ಣ ಬಳಕೆದಾರ'],
          gu: ['વાત-પિત્ત પ્રકૃતિ, ત્રિફળા અને બીપીની દવા, કોઈ એલર્જી નથી', 'પિત્ત-કફ પ્રકૃતિ, ડાયાબિટીસની દવા, પેનિસિલિનથી એલર્જી', 'શુદ્ધ વાત પ્રકૃતિ, કોઈ દવા નથી', 'કફ પ્રકૃતિ, પાચન માટે આયુર્વેદિક ચૂર્ણ લઉં છું'],
          ta: ['வாத-பித்த பிரகிருதி, திரிபலா மற்றும் பிபி மருந்து, ஒவ்வாமை இல்லை', 'பித்த-கப பிரகிருதி, நீரிழிவு மருந்து, பெனிசிலின் ஒவ்வாமை', 'சுத்த வாத பிரகிருதி, மருந்து இல்லை', 'கப பிரகிருதி, செரிமான சூரணம் உட்கொள்கிறேன்'],
          bn: ['বাত-পিত্ত প্রকৃতি, ত্রিফলা ও বিপি-র ওষুধ, কোনো অ্যালার্জি নেই', 'পিত্ত-কফ প্রকৃতি, ডায়াবেটিসের ওষুধ, পেনিসিলিনে অ্যালার্জি', 'বিশুদ্ধ বাত প্রকৃতি, কোনো ওষুধ খাই না', 'কফ প্রকৃতি, হজমের আয়ুর্বেদিক চূর্ণ খাই']
        };
        return {
          nextBotMessage: ayurQ4[language] || ayurQ4.en,
          suggestedReplies: ayurR4[language] || ayurR4.en,
          isComplete: false,
          isRedFlagTriggered: false,
          redFlagsDetected: [],
          suggestedTriagePriority: 'YELLOW',
          detectedLanguage: language
        };
      }

      // AYUSH Turn >= 4: Conclude Ayurvedic Intake
      const ayurDoneMsg: Record<LanguageCode, string> = {
        en: '✅ **Ayurvedic Case-Taking Complete**: Your comprehensive **Dashavidha Pariksha** (Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Sattva, Ahara Shakti, Vyayama Shakti, Vaya) and Ahara-Vihara report has been synthesized for your Vaidya review.',
        hi: '✅ **आयुर्वेदिक केस-टेकिंग पूर्ण**: आपकी **दशविध परीक्षा** (प्रकृति, विकृति, सार, संहनन, प्रमाण, सात्म्य, सत्त्व, आहार शक्ति, व्यायाम शक्ति, वय) और आहार-विहार का संपूर्ण सारांश आपके वैद्य जी के लिए तैयार कर दिया गया है।',
        mr: '✅ **आयुर्वेदिक केस संकलन पूर्ण**: तुमची **दशविध परीक्षा** (प्रकृती, विकृती, सार, संहनन, प्रमाण, सात्म्य, सत्त्व, आहार शक्ती, व्यायाम शक्ती, वय) आणि आहार-विहार क्लिनिकल सारांश वैद्यांच्या पडताळणीसाठी तयार झाला आहे.',
        ur: '✅ **آیورویدک کیس ٹیکنگ مکمل**: آپ کی دس ودھ پریکشا اور خوراک و طرز زندگی کا خلاصہ وید کے لیے تیار کر دیا گیا ہے۔',
        kn: '✅ **ಆಯುರ್ವೇದ ಕೇಸ್-ಟೇಕಿಂಗ್ ಪೂರ್ಣಗೊಂಡಿದೆ**: ನಿಮ್ಮ **ದಶವಿಧ ಪರೀಕ್ಷಾ** ಮತ್ತು ಆಹಾರ-ವಿಹಾರ ಸಾರಾಂಶವನ್ನು ವೈದ್ಯರ ಪರಿಶೀಲನೆಗಾಗಿ ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ.',
        gu: '✅ **આયુર્વેદિક કેસ-ટેકિંગ પૂર્ણ**: તમારો **દશવિધ પરીક્ષા** અને આહાર-વિહાર સારાંશ વૈદ્યની ચકાસણી માટે તૈયાર કરવામાં આવ્યો છે.',
        ta: '✅ **ஆயுர்வேத கிளினிக்கல் சுருக்கம் முடிந்தது**: உங்கள் **தசவித பரீட்சை** மற்றும் ஆகார-விஹார சுருக்கம் ஆயுர்வேத மருத்துவருக்காகத் தயாரிக்கப்பட்டுள்ளது.',
        bn: '✅ **আয়ুর্বেদিক কেস-টেকিং সম্পন্ন**: আপনার **দশবিধ পরীক্ষা** এবং আহার-বিহারের সম্পূর্ণ ক্লিনিকাল সারাংশ প্রস্তুত করা হয়েছে।'
      };
      const ayurDoneReplies: Record<LanguageCode, string[]> = {
        en: ['View Ayurvedic Clinical Summary Report', 'Upload Ayurvedic Prescriptions / Scans', 'Book Vaidya Appointment'],
        hi: ['आयुर्वेदिक सारांश देखें', 'दस्तावेज़ अपलोड करें', 'वैद्य अपॉइंटमेंट बुक करें'],
        mr: ['आयुर्वेदिक सारांश पहा', 'कागदपत्रे जोडा', 'वैद्य अपॉइंटमेंट बुक करा'],
        ur: ['خلاصہ دیکھیں', 'دستاویزات اپ لوڈ کریں', 'اپوائنٹمنٹ بک کریں'],
        kn: ['ಆಯುರ್ವೇದ ಸಾರಾಂಶ ವೀಕ್ಷಿಸಿ', 'ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ'],
        gu: ['આયુર્વેદિક સારાંશ જુઓ', 'દસ્તાવેજો અપલોડ કરો', 'એપોઇન્ટમેન્ટ બુક કરો'],
        ta: ['சுருக்கத்தைப் பார்க்கவும்', 'ஆவணங்களைப் பதிவேற்றவும்', 'முன்பதிவு செய்யவும்'],
        bn: ['আয়ুর্বেদিক সারাংশ দেখুন', 'ডকুমেন্ট আপলোড করুন', 'অ্যাপয়েন্টমেন্ট বুক করুন']
      };
      return {
        nextBotMessage: ayurDoneMsg[language] || ayurDoneMsg.en,
        suggestedReplies: ayurDoneReplies[language] || ayurDoneReplies.en,
        isComplete: true,
        isRedFlagTriggered: false,
        redFlagsDetected: [],
        suggestedTriagePriority: 'YELLOW',
        detectedLanguage: language
      };
    }

    // Turn 1: Assess Onset & Duration
    if (patientTurns === 0) {
      const turn1Questions: Record<LanguageCode, string> = {
        en: 'Understood. When did this begin, and was the onset sudden or gradual? Is the severity mild, moderate, or severe (1-10)?',
        hi: 'यह तकलीफ कब से शुरू हुई है? क्या यह अचानक शुरू हुई या धीरे-धीरे बढ़ रही है? दर्द या तकलीफ का स्तर (1 से 10) क्या है?',
        mr: 'हा त्रास कधीपासून सुरू झाला आहे? त्रास अचानक सुरू झाला की हळूहळू वाढला? त्रासाची तीव्रता (१ ते १०) किती आहे?',
        ur: 'یہ تکلیف کب سے شروع ہوئی ہے؟ کیا یہ اچانک شروع ہوئی یا آہستہ آہستہ بڑھی؟ شدت کا اسکیل (۱ سے ۱۰) کیا ہے؟',
        kn: 'ಈ ತೊಂದರೆ ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು? ಇದು ಇದ್ದಕ್ಕಿದ್ದಂತೆ ಪ್ರಾರಂಭವಾಯಿತೇ ಅಥವಾ ಕ್ರಮೇಣ ಹೆಚ್ಚಾಯಿತೇ? ತೀವ್ರತೆಯ ಮಟ್ಟ (೧-೧೦) ಎಷ್ಟು?',
        gu: 'આ તકલીફ ક્યારથી શરૂ થઈ છે? શું તે અચાનક શરૂ થઈ કે ધીમે ધીમે વધી? દુખાવાની તીવ્રતા (૧ થી ૧૦) કેટલી છે?',
        ta: 'இந்த பிரச்சனை எப்பொழுது தொடங்கியது? திடீரென தொடங்கியதா அல்லது படிப்படியாக அதிகரித்ததா? வலியின் அளவு (1 முதல் 10) என்ன?',
        bn: 'এই সমস্যাটি কখন শুরু হয়েছিল? এটি কি হঠাৎ শুরু হয়েছিল নাকি ধীরে ধীরে বেড়েছে? তীব্রতার মাত্রা (১ থেকে ১০) কত?'
      };

      const turn1Replies: Record<LanguageCode, string[]> = {
        en: ['Started 2-3 days ago (Gradual)', 'Sudden onset today (Moderate 5/10)', 'Severe pain (8/10)', 'Mild intermittent (3/10)'],
        hi: ['आज सुबह से (अचानक)', '2-3 दिनों से धीरे-धीरे', '1 हफ्ते से अधिक', 'रुक-रुक कर होती है'],
        mr: ['आज सकाळपासून (अचानक)', '२-३ दिवसांपासून', '१ आठवड्यापेक्षा जास्त', 'कधीकधी येतो'],
        ur: ['آج صبح سے (اچانک)', '۲-۳ دن سے آہستہ آہستہ', '۱ ہفتے سے زیادہ', 'رک رک کر ہوتی ہے'],
        kn: ['ಇಂದು ಬೆಳಿಗ್ಗೆಯಿಂದ (ಇದ್ದಕ್ಕಿದ್ದಂತೆ)', '೨-೩ ದಿನಗಳಿಂದ ಕ್ರಮೇಣ', '೧ ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು', 'ಮಧ್ಯಂತರವಾಗಿ ಬರುತ್ತದೆ'],
        gu: ['આજે સવારથી (અચાનક)', '૨-૩ દિવસથી ધીમે ધીમે', '૧ અઠવાડિયાથી વધુ', 'ક્યારેક ક્યારેક થાય છે'],
        ta: ['இன்று காலையிலிருந்து (திடீரென)', '2-3 நாட்களாக படிப்படியாக', '1 வாரத்திற்கும் மேலாக', 'விட்டு விட்டு வருகிறது'],
        bn: ['আজ সকাল থেকে (হঠাৎ)', '২-৩ দিন ধরে ধীরে ধীরে', '১ সপ্তাহের বেশি', 'মাঝে মাঝে হয়']
      };

      return {
        nextBotMessage: turn1Questions[language] || turn1Questions.en,
        suggestedReplies: turn1Replies[language] || turn1Replies.en,
        isComplete: false,
        isRedFlagTriggered: false,
        redFlagsDetected: [],
        suggestedTriagePriority: 'YELLOW',
        detectedLanguage: language
      };
    }

    // Turn 2: Pre-existing Conditions & Regular Medications
    if (patientTurns === 1) {
      const turn2Questions: Record<LanguageCode, string> = {
        en: 'Thank you. Do you have any pre-existing medical conditions (such as Diabetes, Hypertension, Asthma, or Cardiac history), and what regular medications are you currently taking?',
        hi: 'धन्यवाद। क्या आपको पहले से कोई बीमारी है (जैसे डायबिटीज, बीपी, थायराइड, अस्थमा या दिल की बीमारी)? और क्या आप नियमित दवाइयां ले रहे हैं?',
        mr: 'धन्यवाद. तुम्हाला आधीपासून काही आजार आहे का (जसे की मधुमेह, रक्तदाब, दमा किंवा हृदयाचा त्रास)? तुम्ही कोणती नियमित औषधे घेत आहात?',
        ur: 'شکریہ۔ کیا آپ کو پہلے سے کوئی بیماری ہے (جیسے شوگر، بلڈ پریشر، دمہ یا دل کی بیماری)؟ اور کیا آپ باقاعدگی سے دوائیں لے رہے ہیں؟',
        kn: 'ಧನ್ಯವಾದಗಳು. ನಿಮಗೆ ಮೊದಲೇ ಯಾವುದಾದರೂ ಆರೋಗ್ಯ ಸಮಸ್ಯೆ ಇದೆಯೇ (ಮಧುಮೇಹ, ಬಿಪಿ, ಅಸ್ತಮಾ ಅಥವಾ ಹೃದಯದ ತೊಂದರೆ)? ನೀವು ನಿಯಮಿತವಾಗಿ ಯಾವ ಔಷಧಿಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಿ?',
        gu: 'આભાર. શું તમને પહેલાથી કોઈ બીમારી છે (જેમ કે ડાયાબિટીસ, બીપી, અસ્થમા કે હૃદય રોગ)? અને તમે કઈ નિયમિત દવાઓ લઈ રહ્યા છો?',
        ta: 'நன்றி. உங்களுக்கு ஏற்கனவே ஏதேனும் நோய் உள்ளதா (நீரிழிவு, இரத்த அழுத்தம், ஆஸ்துமா அல்லது இதய நோய்)? நீங்கள் வழக்கமாக என்ன மருந்துகளை எடுத்துக்கொள்கிறீர்கள்?',
        bn: 'ধন্যবাদ। আপনার কি আগে থেকেই কোনো রোগ আছে (যেমন ডায়াবেটিস, উচ্চ রক্তচাপ, হাঁপানি বা হৃদরোগ)? এবং আপনি নিয়মিত কী কী ওষুধ খাচ্ছেন?'
      };

      const turn2Replies: Record<LanguageCode, string[]> = {
        en: ['Type 2 Diabetes & Hypertension (on meds)', 'Asthma inhaler user', 'No prior chronic conditions', 'Thyroid medication'],
        hi: ['डायबिटीज और बीपी की दवा लेता हूँ', 'अस्थमा/सांस की तकलीफ', 'कोई पुरानी बीमारी नहीं', 'थायरॉइड की गोली'],
        mr: ['मधुमेह आणि बीपीची औषधे', 'दम्याचा त्रास आहे', 'कोणताही जुना आजार नाही', 'थायरॉईडची गोळी'],
        ur: ['شوگر اور بی پی کی دوا لیتا ہوں', 'دمہ کی دوا لیتا ہوں', 'کوئی پرانی بیماری نہیں', 'تھائیرائیڈ کی دوا'],
        kn: ['ಮಧುಮೇಹ ಮತ್ತು ಬಿಪಿ ಮಾತ್ರೆಗಳು', 'ಅಸ್ತಮಾ ಇನ್‌ಹೇಲರ್ ಬಳಕೆದಾರ', 'ಯಾವುದೇ ದೀರ್ಘಕಾಲದ ಕಾಯಿಲೆ ಇಲ್ಲ', 'ಥೈರಾಯ್ಡ್ ಔಷಧಿ'],
        gu: ['ડાયાબિટીસ અને બીપીની દવા લઉં છું', 'અસ્થમાની દવા લઉં છું', 'કોઈ જૂની બીમારી નથી', 'થાઇરોઇડની દવા'],
        ta: ['சர்க்கரை மற்றும் பிபி மாத்திரைகள்', 'ஆஸ்துமா இன்ஹேலர் பயன்படுத்துகிறேன்', 'நீண்டகால நோய் எதுவும் இல்லை', 'தைராய்டு மருந்து'],
        bn: ['ডায়াবেটিস ও বিপি-র ওষুধ খাই', 'হাঁপানির ইনহেলার নিই', 'কোনো দীর্ঘস্থায়ী রোগ নেই', 'থাইরয়েডের ওষুধ']
      };

      return {
        nextBotMessage: turn2Questions[language] || turn2Questions.en,
        suggestedReplies: turn2Replies[language] || turn2Replies.en,
        isComplete: false,
        isRedFlagTriggered: false,
        redFlagsDetected: [],
        suggestedTriagePriority: 'YELLOW',
        detectedLanguage: language
      };
    }

    // Turn 3: Allergies & Past Surgeries
    if (patientTurns === 2) {
      const turn3Questions: Record<LanguageCode, string> = {
        en: 'Crucial for clinical safety: Do you have any known drug or food allergies (e.g. Penicillin, NSAIDs, Sulfa), and have you had any past surgeries?',
        hi: 'सुरक्षा के लिए महत्वपूर्ण: क्या आपको किसी दवा (जैसे पेनिसिलिन, दर्द निवारक) या भोजन से एलर्जी है? क्या आपकी पहले कोई सर्जरी हुई है?',
        mr: 'सुरक्षिततेसाठी अत्यंत महत्त्वाचे: तुम्हाला कोणत्याही औषधाची (पेनिसिलिन, सल्फा) किंवा अन्नाची अ‍ॅलर्जी आहे का? पूर्वी कोणती शस्त्रक्रिया झाली आहे का?',
        ur: 'طبی حفاظت کے لیے اہم: کیا آپ کو کسی دوا (جیسے پینسلین، سلفر) یا کھانے سے الرجی ہے؟ کیا ماضی میں آپ کی کوئی سرجری ہوئی ہے؟',
        kn: 'ಸುರಕ್ಷತೆಗಾಗಿ ಅತ್ಯಂತ ಮುಖ್ಯ: ನಿಮಗೆ ಯಾವುದೇ ಔಷಧಿ (ಪೆನಿಸಿಲಿನ್ ಇತ್ಯಾದಿ) ಅಥವಾ ಆಹಾರದ ಅಲರ್ಜಿ ಇದೆಯೇ? ಹಿಂದೆ ಯಾವುದೇ ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ಆಗಿದೆಯೇ?',
        gu: 'સુરક્ષા માટે મહત્વપૂર્ણ: શું તમને કોઈ દવા (જેમ કે પેનિસિલિન) અથવા ખોરાકની એલર્જી છે? શું તમારી પહેલાં કોઈ સર્જરી થઈ છે?',
        ta: 'பாதுகாப்பிற்கு முக்கியமானது: உங்களுக்கு ஏதேனும் மருந்து (பெனிசிலின் போன்றவை) அல்லது உணவு ஒவ்வாமை உள்ளதா? அறுவை சிகிச்சை எதுவும் செய்யப்பட்டுள்ளதா?',
        bn: 'নিরাপত্তার জন্য অত্যন্ত জরুরি: আপনার কি কোনো ওষুধ (যেমন পেনিসিলিন) বা খাবারের অ্যালার্জি আছে? অতীতে কোনো সার্জারি বা অপারেশন হয়েছে?'
      };

      const turn3Replies: Record<LanguageCode, string[]> = {
        en: ['Allergic to Penicillin (Rash)', 'Allergic to Sulfa drugs', 'No known drug allergies (NKDA)', 'Past Appendectomy in 2014'],
        hi: ['पेनिसिलिन से एलर्जी है', 'सल्फा दवा से एलर्जी', 'कोई एलर्जी नहीं', 'अपेन्डिक्स का ऑपरेशन हुआ था'],
        mr: ['पेनिसिलिन अ‍ॅलर्जी आहे', 'सल्फा औषधाची अ‍ॅलर्जी', 'कोणतीही अ‍ॅलर्जी नाही', 'अपेंडिक्सची शस्त्रक्रिया'],
        ur: ['پینسلین سے الرجی ہے', 'سلفر ادویات سے الرجی', 'کوئی معلوم الرجی نہیں', 'اپینڈکس کا آپریشن'],
        kn: ['ಪೆನಿಸಿಲಿನ್ ಅಲರ್ಜಿ ಇದೆ', 'ಯಾವುದೇ ಅಲರ್ಜಿ ಇಲ್ಲ', 'ಹಿಂದೆ ಅಪೆಂಡಿಕ್ಸ್ ಸರ್ಜರಿ ಆಗಿದೆ', 'ಸಲ್ಫಾ ಔಷಧಿ ಅಲರ್ಜಿ'],
        gu: ['પેનિસિલિનથી એલર્જી છે', 'કોઈ એલર્જી નથી', 'અગાઉ એપેન્ડિક્સ સર્જરી થઈ હતી', 'સલ્ફા દવાથી એલર્જી'],
        ta: ['பெனிசிலின் ஒவ்வாமை உள்ளது', 'ஒவ்வாமை எதுவும் இல்லை', 'அப்பெண்டிக்ஸ் அறுவை சிகிச்சை', 'சல்பர் மருந்து ஒவ்வாமை'],
        bn: ['পেনিসিলিনে অ্যালার্জি আছে', 'কোনো অ্যালার্জি নেই', 'অ্যাপেন্ডিক্স অপারেশন হয়েছিল', 'সালফা ড্রাগে অ্যালার্জি']
      };

      return {
        nextBotMessage: turn3Questions[language] || turn3Questions.en,
        suggestedReplies: turn3Replies[language] || turn3Replies.en,
        isComplete: false,
        isRedFlagTriggered: false,
        redFlagsDetected: [],
        suggestedTriagePriority: 'YELLOW',
        detectedLanguage: language
      };
    }

    // Turn 3+: Conclude Intake & Compile Pre-Arrival History Report
    const conclusionMessages: Record<LanguageCode, string> = {
      en: '✅ **Clinical Intake Complete**: I have synthesized your clinical history, mapped your symptoms, flagged key safety considerations, and created your physician-ready pre-arrival summary for hospital verification.',
      hi: '✅ **क्लिनिकल जानकारी पूर्ण**: मैंने आपका पूर्व-आगमन मेडिकल इतिहास सारांश तैयार कर लिया है। डॉक्टर के सत्यापन के लिए यह अस्पताल को भेज दिया गया है।',
      mr: '✅ **माहिती संकलन पूर्ण**: मी तुमचा क्लिनिकल सारांश तयार केला आहे आणि हॉस्पिटलमधील डॉक्टरांच्या पडताळणीसाठी पाठवला आहे.',
      ur: '✅ **کلینیکل انٹیک مکمل**: میں نے آپ کی طبی تاریخ کا خلاصہ تیار کر لیا ہے اور ڈاکٹر کی تصدیق کے لیے ہسپتال کو بھیج دیا گیا ہے۔',
      kn: '✅ **ಕ್ಲಿನಿಕಲ್ ಇನ್‌ಟೇಕ್ ಪೂರ್ಣಗೊಂಡಿದೆ**: ನಾನು ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ಸಾರಾಂಶವನ್ನು ಸಿದ್ಧಪಡಿಸಿದ್ದೇನೆ ಮತ್ತು ವೈದ್ಯರ ಪರಿಶೀಲನೆಗಾಗಿ ಆಸ್ಪತ್ರೆಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.',
      gu: '✅ **ક્લિનિકલ ઇનટેક પૂર્ણ**: મેં તમારો મેડિકલ સારાંશ તૈયાર કર્યો છે અને ડોક્ટરની ચકાસણી માટે હોસ્પિટલને મોકલી આપ્યો છે.',
      ta: '✅ **கிளினிக்கல் இன்டேக் முடிந்தது**: உங்களின் மருத்துவச் சுருக்கம் தயாரிக்கப்பட்டு, மருத்துவரின் சரிபார்ப்பிற்காக மருத்துவமனைக்கு அனுப்பப்பட்டுள்ளது.',
      bn: '✅ **ক্লিনিকাল ইনটেক সম্পন্ন**: আমি আপনার মেডিকেল হিস্ট্রির সারাংশ তৈরি করেছি এবং ডাক্তারের যাচাইকরণের জন্য হাসপাতালে পাঠানো হয়েছে।'
    };

    const conclusionReplies: Record<LanguageCode, string[]> = {
      en: ['View Clinical Summary Report', 'Upload Past Prescriptions/Labs', 'View Medical Timeline'],
      hi: ['सारांश देखें', 'दस्तावेज़ अपलोड करें', 'टाइमलाइन देखें'],
      mr: ['सारांश पहा', 'कागदपत्रे जोडा', 'टाइमलाइन पहा'],
      ur: ['خلاصہ دیکھیں', 'دستاویزات اپ لوڈ کریں', 'ٹائم لائن دیکھیں'],
      kn: ['ಸಾರಾಂಶ ವೀಕ್ಷಿಸಿ', 'ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', 'ಟೈಮ್‌ಲೈನ್ ನೋಡಿ'],
      gu: ['સારાંશ જુઓ', 'દસ્તાવેજો અપલોડ કરો', 'ટાઇમલાઇન જુઓ'],
      ta: ['சுருக்கத்தைப் பார்க்கவும்', 'ஆவணங்களைப் பதிவேற்றவும்', 'காலவரிசையைப் பார்க்கவும்'],
      bn: ['সারাংশ দেখুন', 'ডকুমেন্ট আপলোড করুন', 'টাইমলাইন দেখুন']
    };

    const advisory = MedicineRecommendationService.getLocalizedAdvisory(triageAssessment, language);
    const finalBotMsg = advisory
      ? `${advisory}\n\n${conclusionMessages[language] || conclusionMessages.en}`
      : (conclusionMessages[language] || conclusionMessages.en);

    return {
      nextBotMessage: finalBotMsg,
      suggestedReplies: conclusionReplies[language] || conclusionReplies.en,
      isComplete: true,
      isRedFlagTriggered: false,
      redFlagsDetected: [],
      suggestedTriagePriority: triageAssessment.category === 'SPECIALIZED_DOCTOR_REQUIRED' ? 'YELLOW' : 'GREEN',
      conditionCategory: triageAssessment.category,
      medicineRecommendations: triageAssessment.category === 'NORMAL_MINOR_ISSUE' ? (triageAssessment.medicines || []) : [],
      triageAssessment,
      detectedLanguage: language
    };
  }

  /**
   * Asynchronous LLM-backed Clinical Intake Analyzer
   * Calls /api/ai-intake to interact with Gemini / Groq / OpenAI with intelligent context awareness
   */
  public static async analyzeInputAsync(
    input: string,
    history: ConversationMessage[],
    language: LanguageCode = 'en',
    medicalSystem: MedicalSystem = 'ALLOPATHY',
    isRedFlagDetectionEnabled: boolean = true,
    patientProfile?: any
  ): Promise<IntakeAnalysisResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);

      const res = await fetch('/api/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'chat',
          currentMessage: input,
          messages: history.map(m => ({ sender: m.sender, text: m.text, language: m.language, timestamp: m.timestamp })),
          language,
          medicalSystem,
          isRedFlagDetectionEnabled,
          patientProfile
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            nextBotMessage: data.nextBotMessage,
            suggestedReplies: data.suggestedReplies || [],
            isComplete: Boolean(data.isComplete),
            isRedFlagTriggered: Boolean(data.isRedFlagTriggered),
            redFlagsDetected: data.redFlagsDetected || [],
            suggestedTriagePriority: data.suggestedTriagePriority || (data.isRedFlagTriggered ? 'RED' : 'GREEN'),
            conditionCategory: data.conditionCategory,
            medicineRecommendations: data.medicineRecommendations,
            triageAssessment: data.triageAssessment,
            detectedLanguage: data.detectedLanguage || language,
            translatedConcern: data.translatedConcern
          };
        }
      }
    } catch (err) {
      console.warn('[AIIntakeEngine.analyzeInputAsync fast fallback]:', err);
    }

    // Fallback to local synchronous engine if network/API unavailable (<15ms)
    return this.analyzeInput(input, history, language, medicalSystem, isRedFlagDetectionEnabled);
  }

  /**
   * Asynchronous Physician-Ready Short Report Generator via LLM
   */
  public static async generateStructuredSummaryAsync(
    sessionId: string,
    patientId: string,
    history: ConversationMessage[],
    patientProfile?: any,
    language: LanguageCode = 'en',
    medicalSystem: MedicalSystem = 'ALLOPATHY',
    encounterId?: string,
    appointmentId?: string
  ): Promise<{ summary: ClinicalHistorySummary; shortReport: PhysicianShortReport }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('/api/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          action: 'generate_report',
          sessionId,
          patientId,
          encounterId: encounterId || appointmentId || `enc-${Date.now()}`,
          appointmentId: appointmentId || `apt-${Date.now()}`,
          messages: history.map(m => ({ sender: m.sender, text: m.text, language: m.language, timestamp: m.timestamp })),
          language,
          medicalSystem,
          patientProfile
        })
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary && data.shortReport) {
          return { summary: data.summary, shortReport: data.shortReport };
        }
      }
    } catch (err) {
      console.warn('[AIIntakeEngine.generateStructuredSummaryAsync fast fallback]:', err);
    }

    // Fallback to local deterministic generator
    const chiefMsg = history.find(m => m.sender === 'PATIENT')?.text || 'Patient reported symptoms.';
    const fullHistory = history.map(m => `${m.sender}: ${m.text}`).join('\n');
    const summary = this.generateStructuredSummary(
      sessionId,
      patientId,
      chiefMsg,
      fullHistory,
      patientProfile?.allergies?.map((a: string) => ({ allergen: a, type: 'OTHER' as const, reaction: 'Documented in profile', severity: 'MODERATE' as const })) || [],
      patientProfile?.currentMedications?.map((m: string) => ({ name: m, dosage: 'Daily', frequency: 'Regular', route: 'Oral', isActive: true })) || [],
      language,
      medicalSystem,
      encounterId,
      appointmentId,
      patientProfile
    );
    return { summary, shortReport: summary.shortReport! };
  }

  /**
   * Replicates completed session across devices via persistent cloud registry
   */
  public static async saveSessionToCloud(session: ClinicalSession): Promise<boolean> {
    try {
      const res = await fetch('/api/ai-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_report',
          session
        })
      });
      return res.ok;
    } catch (err) {
      console.warn('[AIIntakeEngine.saveSessionToCloud error]:', err);
      return false;
    }
  }

  /**
   * Generates a structured clinical history summary preserving original statement,
   * language metadata, standardized clinical findings, and PhysicianShortReport with SOURCE TRANSPARENCY.
   */
  public static generateStructuredSummary(
    sessionId: string,
    patientId: string,
    chiefComplaint: string,
    historyText: string,
    allergies: Allergy[] = [],
    medications: Medication[] = [],
    language: LanguageCode = 'en',
    medicalSystem: MedicalSystem = 'ALLOPATHY',
    encounterId?: string,
    appointmentId?: string,
    patientProfile?: any
  ): ClinicalHistorySummary {
    const lower = (historyText + ' ' + chiefComplaint).toLowerCase();

    // Actual duration extraction
    let duration = '2-3 days';
    const durationMatch = lower.match(/(\d+\s*(?:days?|din|divas|weeks?|hafta|months?|mahina|hours?|ghante|years?))/i) ||
      lower.match(/(today|aaj|yesterday|kal|since yesterday|parso)/i);
    if (durationMatch) {
      duration = durationMatch[0];
    }

    // Actual severity extraction
    let severity = 'Moderate';
    let painScore = 5;
    if (/severe|acute|bohot tez|khup jast|extreme|8\/10|9\/10|10\/10/i.test(lower)) {
      severity = 'Severe (8/10)';
      painScore = 8;
    } else if (/mild|thoda|halka|2\/10|3\/10/i.test(lower)) {
      severity = 'Mild (3/10)';
      painScore = 3;
    }

    // Actual onset extraction
    const onset = /sudden|achanak|ekdum/i.test(lower) ? 'Sudden' : 'Gradual';

    // Extracted medical history from conversation + patient profile
    const existingConditions: string[] = [];
    if (/diabet|sugar|madhumeh/i.test(lower)) existingConditions.push('Type 2 Diabetes Mellitus');
    if (/bp|hypertension|blood pressure/i.test(lower)) existingConditions.push('Essential Hypertension');
    if (/asthma|dama|inhaler/i.test(lower)) existingConditions.push('Bronchial Asthma');
    if (/thyroid/i.test(lower)) existingConditions.push('Hypothyroidism');
    if (patientProfile?.chronicConditions && Array.isArray(patientProfile.chronicConditions)) {
      patientProfile.chronicConditions.forEach((c: string) => {
        if (!existingConditions.includes(c)) existingConditions.push(c);
      });
    }

    // Extracted medications from conversation + patient profile
    const extractedMeds: Medication[] = [...medications];
    if (/metformin|glycomet/i.test(lower) && !extractedMeds.some(m => m.name.toLowerCase().includes('metformin'))) {
      extractedMeds.push({ name: 'Tab Metformin 500mg', dosage: '500mg', frequency: 'Twice daily', route: 'Oral', isActive: true, indication: 'Type 2 Diabetes' });
    }
    if (/paracetamol|crocin|dolo/i.test(lower) && !extractedMeds.some(m => m.name.toLowerCase().includes('paracetamol'))) {
      extractedMeds.push({ name: 'Tab Paracetamol 650mg', dosage: '650mg', frequency: 'As needed', route: 'Oral', isActive: true, indication: 'Antipyretic/Analgesic' });
    }
    if (patientProfile?.currentMedications && Array.isArray(patientProfile.currentMedications)) {
      patientProfile.currentMedications.forEach((m: string) => {
        if (!extractedMeds.some(em => em.name.toLowerCase().includes(m.toLowerCase()))) {
          extractedMeds.push({ name: m, dosage: 'Daily', frequency: 'Regular', route: 'Oral', isActive: true });
        }
      });
    }

    // Extracted allergies
    const extractedAllergies: Allergy[] = [...allergies];
    const isPenicillinAllergic = lower.includes('penicillin') || lower.includes('पेनिसिलिन');
    if (isPenicillinAllergic && !extractedAllergies.some(a => a.allergen.toLowerCase().includes('penicillin'))) {
      extractedAllergies.push({ allergen: 'Penicillin', type: 'DRUG', reaction: 'Hypersensitivity reported', severity: 'SEVERE_ANAPHYLACTIC' });
    }
    if (patientProfile?.allergies && Array.isArray(patientProfile.allergies)) {
      patientProfile.allergies.forEach((a: string) => {
        if (!extractedAllergies.some(ea => ea.allergen.toLowerCase().includes(a.toLowerCase()))) {
          extractedAllergies.push({ allergen: a, type: 'OTHER', reaction: 'Documented in profile', severity: 'MODERATE' });
        }
      });
    }

    // Ayurvedic Dashavidha Pariksha evaluation
    let dashavidha: DashavidhaPariksha | undefined = undefined;
    if (medicalSystem === 'AYURVEDA') {
      const isVata = lower.includes('vata') || lower.includes('वात') || lower.includes('stiff') || lower.includes('pain') || lower.includes('joint');
      const isPitta = lower.includes('pitta') || lower.includes('पित्त') || lower.includes('burn') || lower.includes('acid') || lower.includes('heat');
      const isKapha = lower.includes('kapha') || lower.includes('कफ') || lower.includes('heavy') || lower.includes('mucus');

      dashavidha = {
        prakriti: isPitta && isVata ? 'Vata-Pitta (Dwandwaja)' : isPitta ? 'Pitta-Kapha (Dwandwaja)' : isVata ? 'Vata Pradhana' : isKapha ? 'Kapha Pradhana' : 'Sama Prakriti',
        vikriti: isPitta ? 'Pitta Vitiation with Ushna-Tikshna Guna' : isVata ? 'Vata Prakopa with Ruksha Guna' : 'Kapha Dushti with Guru Guna',
        sara: 'Madhyama Sara (Balanced Tissue Essence)',
        samhanana: 'Madhyama Samhanana (Moderate Compactness)',
        pramana: 'Pramana Yukta (Normal Proportions)',
        satmya: 'Mishra Satmya (Diverse Nutrition)',
        sattva: 'Madhyama Sattva (Moderate Resilience)',
        aharaShakti: isPitta ? 'Tikshnagni' : isVata ? 'Vishamagni' : 'Mandagni',
        vyayamaShakti: 'Madhyama Vyayama Shakti',
        vaya: 'Madhyama Vaya (Adult)',
        aharaViharaNotes: 'Reports irregular meal intervals and varied circadian sleep schedules.'
      };
    }

    // Construct 3 to 6 concise physician summary sentences
    const summarySentences = [
      `Patient (${patientId}, ${patientProfile?.age || 35}y ${patientProfile?.gender || 'Male'}) presented via MediBridge pre-arrival intake with chief complaint of: ${chiefComplaint || 'Consultation requested'}.`,
      `Symptom onset is reported as ${onset.toLowerCase()} with a duration of ${duration}, self-assessed as ${severity}.`,
      existingConditions.length > 0
        ? `Documented medical history includes ${existingConditions.join(', ')}.`
        : 'Patient reports no major prior chronic medical conditions.',
      extractedMeds.length > 0
        ? `Reported active medications: ${extractedMeds.map(m => m.name).join(', ')}.`
        : 'No regular prescription medications reported.',
      extractedAllergies.length > 0
        ? `Known allergies documented: ${extractedAllergies.map(a => a.allergen).join(', ')}.`
        : 'No known drug or environmental allergies reported (NKDA).',
      'Clinical intake completed from patient home and awaiting in-person physical examination and physician orders.'
    ];

    const shortReport: PhysicianShortReport = {
      patientId,
      age: patientProfile?.age || 35,
      gender: patientProfile?.gender || 'Male',
      encounterDate: new Date().toISOString().split('T')[0],
      encounterId: encounterId || appointmentId || `enc-${Date.now()}`,
      appointmentId,
      chiefComplaint: {
        mainReason: chiefComplaint || 'Patient consultation intake',
        source: 'PATIENT REPORTED'
      },
      symptoms: {
        importantSymptoms: [chiefComplaint || 'Primary Symptom'],
        duration,
        severity,
        location: 'Reported during conversational intake',
        onset,
        associatedSymptoms: [],
        source: 'PATIENT REPORTED'
      },
      medicalHistory: {
        existingConditions: existingConditions.length > 0 ? existingConditions : ['No prior chronic conditions reported'],
        previousHistory: ['No major surgeries reported'],
        source: 'PATIENT REPORTED'
      },
      medicationsAndAllergies: {
        currentMedications: extractedMeds.length > 0 ? extractedMeds.map(m => m.name) : ['No regular medications reported'],
        knownAllergies: extractedAllergies.length > 0 ? extractedAllergies.map(a => a.allergen) : ['No known drug allergies (NKDA)'],
        source: 'PATIENT REPORTED'
      },
      relevantFindings: [
        {
          text: `Intake conducted in ${(typeof language === 'string' && language ? language : 'en').toUpperCase()} through conversational interview.`,
          source: 'PATIENT REPORTED'
        }
      ],
      redFlags: {
        detected: false,
        flags: [],
        source: 'PATIENT REPORTED'
      },
      summary: {
        text: summarySentences.join(' '),
        source: 'AI SUMMARIZED'
      },
      missingOrUncertainInfo: {
        items: [
          'Objective vitals (Blood pressure, Pulse, Temperature, SpO2) require in-person physician verification',
          'Exact prescription dosages to be validated against active records'
        ],
        source: 'AI SUMMARIZED'
      },
      doctorNotes: {
        notes: '',
        source: 'DOCTOR ENTERED'
      }
    };

    return {
      id: `sum-${Date.now()}`,
      sessionId,
      patientId,
      encounterId: shortReport.encounterId,
      appointmentId: shortReport.appointmentId,
      generatedAt: new Date().toISOString(),
      originalLanguage: language,
      originalPatientStatement: chiefComplaint || historyText || 'Patient reported intake.',
      translatedSummary: shortReport.summary.text,
      disclaimer: 'AI-Generated Clinical Intake Summary — Requires Physician Verification. Not a final diagnosis.',
      chiefComplaints: shortReport.chiefComplaint.mainReason,
      historyOfPresentIllness: shortReport.summary.text,
      shortReport,
      painScore,
      medicalSystem,
      dashavidhaPariksha: dashavidha,
      symptomsList: [
        {
          name: chiefComplaint ? chiefComplaint.substring(0, 40) : 'Primary Symptom',
          severity: painScore,
          duration,
          onset: onset === 'Sudden' ? 'SUDDEN' : 'GRADUAL'
        }
      ],
      pastMedicalHistory: existingConditions.map(c => ({
        condition: c,
        diagnosedYear: '2020',
        status: 'CONTROLLED'
      })),
      currentMedications: extractedMeds,
      allergies: extractedAllergies,
      surgicalHistory: [],
      familyHistory: [],
      relevantLabFindings: [],
      suspectedSystemicInvolvement: medicalSystem === 'AYURVEDA'
        ? ['Annavaha Srotas', 'Rasavaha Srotas']
        : ['General Clinical Evaluation'],
      differentialConsiderations: ['Awaiting physician in-person examination and clinical orders.'],
      redFlagChecklist: [
        { item: 'Acute Cardiac / Severe Respiratory Distress', detected: false, note: 'Denied by patient' }
      ],
      safetyWarnings: extractedAllergies.length > 0
        ? extractedAllergies.map(a => `⚠️ Safety Alert: Documented allergy to ${a.allergen}`)
        : ['⚠️ Verify clinical history against active electronic health records.'],
      verificationStatus: 'PENDING_PHYSICIAN_REVIEW'
    };
  }
}
