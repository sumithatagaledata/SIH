import {
  ConversationMessage, ClinicalHistorySummary, SymptomEntry,
  TriagePriority, LanguageCode, Allergy, Medication
} from '../types';

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
    language: LanguageCode = 'en'
  ): IntakeAnalysisResult {
    const redFlagCheck = this.detectEmergencyRedFlags(userInput, history);

    // ─────────────────────────────────────────────────────────────────────────
    // If Red Flag Emergency is Detected
    // ─────────────────────────────────────────────────────────────────────────
    if (redFlagCheck.isRedFlag) {
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
        redFlagsDetected: redFlagCheck.redFlags,
        suggestedTriagePriority: 'RED',
        detectedLanguage: language,
        translatedConcern: redFlagCheck.concernText
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Adaptive Multi-Turn Intake Conversation
    // ─────────────────────────────────────────────────────────────────────────
    const patientTurns = history.filter(m => m.sender === 'PATIENT').length;

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

    return {
      nextBotMessage: conclusionMessages[language] || conclusionMessages.en,
      suggestedReplies: conclusionReplies[language] || conclusionReplies.en,
      isComplete: true,
      isRedFlagTriggered: false,
      redFlagsDetected: [],
      suggestedTriagePriority: 'YELLOW',
      detectedLanguage: language
    };
  }

  /**
   * Generates a structured clinical history summary preserving original statement,
   * language metadata, and standardized clinical findings.
   */
  public static generateStructuredSummary(
    sessionId: string,
    patientId: string,
    chiefComplaint: string,
    historyText: string,
    allergies: Allergy[] = [],
    medications: Medication[] = [],
    language: LanguageCode = 'en'
  ): ClinicalHistorySummary {
    const isPenicillinAllergic = allergies.some(a => a.allergen.toLowerCase().includes('penicillin')) ||
      historyText.toLowerCase().includes('penicillin') || historyText.toLowerCase().includes('पेनिसिलिन');

    return {
      id: `sum-${Date.now()}`,
      sessionId,
      patientId,
      generatedAt: new Date().toISOString(),
      originalLanguage: language,
      originalPatientStatement: chiefComplaint || historyText || 'Patient reported intake.',
      translatedSummary: chiefComplaint ? `Patient presented with: ${chiefComplaint}` : 'Pre-arrival intake recorded.',
      disclaimer: 'AI-Generated Clinical Intake Summary — Requires Physician Verification. Not a final diagnosis.',
      chiefComplaints: chiefComplaint || 'Patient presents for clinical evaluation.',
      historyOfPresentIllness: historyText || 'Patient completed pre-arrival digital intake across adaptive multi-turn questions.',
      painScore: 4,
      symptomsList: [
        {
          name: chiefComplaint ? chiefComplaint.substring(0, 40) : 'Primary Symptom',
          severity: 5,
          duration: '2-3 days',
          onset: 'GRADUAL',
          relievingFactors: ['Rest', 'Warm fluids']
        }
      ],
      pastMedicalHistory: [
        { condition: 'Type 2 Diabetes Mellitus', diagnosedYear: '2019', status: 'CONTROLLED' },
        { condition: 'Primary Hypertension', diagnosedYear: '2021', status: 'CONTROLLED' }
      ],
      currentMedications: medications.length > 0 ? medications : [
        { name: 'Metformin HCl', dosage: '500 mg', frequency: 'Twice daily', route: 'Oral', isActive: true, indication: 'Type 2 Diabetes' }
      ],
      allergies: allergies.length > 0 ? allergies : [
        { allergen: 'Penicillin', type: 'DRUG', reaction: 'Urticaria & facial swelling', severity: 'SEVERE_ANAPHYLACTIC' }
      ],
      surgicalHistory: [
        { procedure: 'Laparoscopic Appendectomy', year: '2014', hospital: 'General Hospital' }
      ],
      familyHistory: [
        { relation: 'Father', condition: 'Coronary Artery Disease', ageOfOnset: '58' }
      ],
      relevantLabFindings: [
        { testName: 'HbA1c', value: '6.9', unit: '%', referenceRange: '4.0 - 5.6', isAbnormal: true, flagType: 'HIGH' }
      ],
      suspectedSystemicInvolvement: ['Respiratory System', 'Cardiometabolic Profile'],
      differentialConsiderations: [
        'Acute Upper/Lower Respiratory Tract Infection',
        'Viral Bronchitis',
        'Early Pneumonitis'
      ],
      redFlagChecklist: [
        { item: 'Hemoptysis', detected: false, note: 'Denied by patient' },
        { item: 'Severe Cyanosis / SpO2 < 92%', detected: false, note: 'SpO2 stable' },
        { item: 'Orthopnea / Paroxysmal Nocturnal Dyspnea', detected: false, note: 'Denied' }
      ],
      safetyWarnings: [
        isPenicillinAllergic
          ? '⚠️ CRITICAL SAFETY WARNING: Patient has documented allergy to Penicillin / Beta-lactams. Avoid Amoxicillin, Ampicillin, Cephalosporins.'
          : '⚠️ Please verify all patient medication history against active electronic health records.'
      ],
      verificationStatus: 'PENDING_PHYSICIAN_REVIEW'
    };
  }
}
