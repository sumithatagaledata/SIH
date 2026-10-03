// MediBridge AI — Internal Clinical Medicine Recommendation & Triage Classification Service
// Fully self-contained inside api/_lib for reliable Vercel Serverless Function & Vite dev execution

export type ConditionCategory = 'CRITICAL_EMERGENCY' | 'NORMAL_MINOR_ISSUE' | 'SPECIALIZED_DOCTOR_REQUIRED';
export type LanguageCode = 'en' | 'hi' | 'mr' | 'ta' | 'te' | 'kn' | 'bn' | 'gu' | 'ur' | 'ml' | 'pa';

export interface MedicineBuyingLink {
  storeName: 'Tata 1mg' | 'Apollo Pharmacy' | 'PharmEasy' | 'Netmeds';
  url: string;
  priceEstimate?: string;
  badge?: string;
}

export interface MedicineRecommendation {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  timing: string;
  indication: string;
  category: 'FEVER' | 'HEADACHE' | 'COLD_FLU' | 'COUGH_THROAT' | 'ACIDITY_GAS' | 'BODY_PAIN' | 'DEHYDRATION';
  buyingLinks: MedicineBuyingLink[];
  caution: string;
  duration?: string;
  warnings?: string[];
  status?: 'APPROVED' | 'UNAPPROVED' | 'PENDING';
}

export interface ClinicalTriageAssessment {
  category: ConditionCategory;
  rationale: string;
  recommendedDepartment?: string;
  isMedicationRecommended: boolean;
  medicationDisclaimer?: string;
  medicines: MedicineRecommendation[];
}

export const TRUSTED_PHARMACIES = [
  { storeName: 'Tata 1mg' as const, baseUrl: 'https://www.1mg.com/search/all?name=' },
  { storeName: 'Apollo Pharmacy' as const, baseUrl: 'https://www.apollopharmacy.in/search-medicines/' },
  { storeName: 'PharmEasy' as const, baseUrl: 'https://pharmeasy.in/search/all?name=' },
  { storeName: 'Netmeds' as const, baseUrl: 'https://www.netmeds.com/catalogsearch/result?q=' }
];

export function buildBuyingLinks(medicineSearchQuery: string): MedicineBuyingLink[] {
  const enc = encodeURIComponent(medicineSearchQuery);
  return [
    {
      storeName: 'Tata 1mg',
      url: `https://www.1mg.com/search/all?name=${enc}`,
      priceEstimate: '₹30 - ₹70',
      badge: 'Certified Genuine'
    },
    {
      storeName: 'Apollo Pharmacy',
      url: `https://www.apollopharmacy.in/search-medicines/${enc}`,
      priceEstimate: '₹28 - ₹65',
      badge: '2-Hr Express Available'
    },
    {
      storeName: 'PharmEasy',
      url: `https://pharmeasy.in/search/all?name=${enc}`,
      priceEstimate: '₹32 - ₹68',
      badge: 'Top Discount'
    },
    {
      storeName: 'Netmeds',
      url: `https://www.netmeds.com/catalogsearch/result?q=${enc}`,
      priceEstimate: '₹30 - ₹66',
      badge: 'Verified Stock'
    }
  ];
}

// Master Database of Safe OTC Symptomatic Medications for Normal Minor Issues
export const OTC_MEDICINE_CATALOG: Record<string, MedicineRecommendation> = {
  dolo_650: {
    id: 'med-dolo-650',
    name: 'Dolo 650mg Tablet',
    genericName: 'Paracetamol (Acetaminophen) 650mg',
    dosage: '1 tablet every 6 to 8 hours after meals as needed (Maximum 3 to 4 tablets in 24 hours)',
    timing: 'Take after meals with water',
    indication: 'Relieves mild-to-moderate fever, headache, and body aches',
    category: 'FEVER',
    buyingLinks: buildBuyingLinks('Dolo 650mg Tablet'),
    caution: 'Do not exceed 4g (4,000mg) per day. Avoid combining with other paracetamol products or alcohol. Consult doctor if fever lasts > 3 days.'
  },
  crocin_advance: {
    id: 'med-crocin-adv',
    name: 'Crocin Advance 500mg/650mg',
    genericName: 'Fast-Release Paracetamol',
    dosage: '1 tablet every 4 to 6 hours after meals (Maximum 4 tablets daily)',
    timing: 'Take after food with a glass of water',
    indication: 'Rapid antipyretic for fever reduction and mild headache',
    category: 'FEVER',
    buyingLinks: buildBuyingLinks('Crocin Advance Tablet'),
    caution: 'Avoid in severe liver impairment. Do not take on empty stomach if prone to gastric sensitivity.'
  },
  saridon: {
    id: 'med-saridon',
    name: 'Saridon Headache Relief Tablet',
    genericName: 'Paracetamol 250mg + Propyphenazone 150mg + Caffeine 50mg',
    dosage: '1 tablet with water. Repeat after 4 to 6 hours if headache persists (Max 2 tablets in 24 hours)',
    timing: 'Take with a glass of water after food',
    indication: 'Targeted fast relief from tension headache and frontal head pain',
    category: 'HEADACHE',
    buyingLinks: buildBuyingLinks('Saridon Tablet'),
    caution: 'Contains caffeine. Not recommended for children under 12 years or pregnant women without doctor consult.'
  },
  disprin: {
    id: 'med-disprin',
    name: 'Disprin Regular 350mg Effervescent Tablet',
    genericName: 'Aspirin (Acetylsalicylic Acid) 350mg',
    dosage: '1-2 tablets dissolved in half a glass of clean water after food (Max 3 tablets daily)',
    timing: 'Dissolve in water, take after food',
    indication: 'Fast dissolvable relief from throbbing headache and minor aches',
    category: 'HEADACHE',
    buyingLinks: buildBuyingLinks('Disprin Regular 350mg Tablet'),
    caution: 'Do NOT give to children/teens under 16 (Reye syndrome risk). Avoid if you have active stomach ulcer, bleeding disorders, or asthma.'
  },
  cetzine: {
    id: 'med-cetzine-10',
    name: 'Cetzine 10mg / Cetirizine Tablet',
    genericName: 'Cetirizine Hydrochloride 10mg',
    dosage: '1 tablet once daily, preferably in the evening or at bedtime',
    timing: 'Night time / After dinner',
    indication: 'Relieves runny nose, continuous sneezing, allergic rhinitis, and watery eyes',
    category: 'COLD_FLU',
    buyingLinks: buildBuyingLinks('Cetzine 10mg Tablet'),
    caution: 'May cause mild drowsiness. Avoid driving or operating heavy machinery after consumption. Avoid alcohol.'
  },
  otrivin_spray: {
    id: 'med-otrivin-nasal',
    name: 'Otrivin Oxy Fast Relief Adult Nasal Spray (0.05%)',
    genericName: 'Oxymetazoline / Xylometazoline Hydrochloride',
    dosage: '1 to 2 sprays in each nostril, twice daily (Morning and Night)',
    timing: 'Direct nasal application',
    indication: 'Clears severe nasal blockage and sinus congestion within 25 seconds',
    category: 'COLD_FLU',
    buyingLinks: buildBuyingLinks('Otrivin Adult Nasal Spray'),
    caution: 'Do NOT use for more than 3 to 5 consecutive days to prevent rebound congestion (rhinitis medicamentosa).'
  },
  strepsils: {
    id: 'med-strepsils',
    name: 'Strepsils Honey & Lemon Lozenges',
    genericName: '2,4-Dichlorobenzyl alcohol 1.2mg + Amylmetacresol 0.6mg',
    dosage: 'Dissolve 1 lozenge slowly in mouth every 3 to 4 hours as needed (Max 8 lozenges in 24 hours)',
    timing: 'Slow oral dissolution',
    indication: 'Antiseptic soothing relief for sore, scratchy, and painful throat',
    category: 'COUGH_THROAT',
    buyingLinks: buildBuyingLinks('Strepsils Honey and Lemon Lozenges'),
    caution: 'Do not swallow whole. If sore throat persists with high fever or pus, consult a doctor for antibiotic evaluation.'
  },
  honitus_syrup: {
    id: 'med-honitus-syrup',
    name: 'Dabur Honitus Herbal Cough Syrup',
    genericName: 'Ayurvedic Honey, Tulsi, Mulethi, Banapsha & Kantkari',
    dosage: '2 teaspoons (10ml) 3 to 4 times daily with lukewarm water',
    timing: 'After meals with warm water',
    indication: 'Non-drowsy herbal soothing for both dry and productive seasonal cough',
    category: 'COUGH_THROAT',
    buyingLinks: buildBuyingLinks('Dabur Honitus Cough Syrup 100ml'),
    caution: 'Safe non-drowsy formulation. Consult a physician if cough persists over 10 days or produces discolored blood/pus.'
  },
  digene_tablets: {
    id: 'med-digene',
    name: 'Digene Ultra Chewable Antacid Tablets (Mixed Fruit / Mint)',
    genericName: 'Magnesium Hydroxide + Aluminium Hydroxide + Simethicone',
    dosage: '1 to 2 tablets chewed thoroughly 30 minutes after meals or when acidity occurs',
    timing: 'Post meals (Chew before swallowing)',
    indication: 'Neutralizes stomach acid, relieves heartburn, sour belching, and gastric bloating',
    category: 'ACIDITY_GAS',
    buyingLinks: buildBuyingLinks('Digene Chewable Tablets'),
    caution: 'Chew thoroughly, do not swallow whole. Take 2 hours apart from other prescription drugs to avoid absorption interference.'
  },
  gelusil_syrup: {
    id: 'med-gelusil',
    name: 'Gelusil MPS Antacid Liquid',
    genericName: 'Aluminium Hydroxide, Dimethicone, Magnesium Hydroxide',
    dosage: '1 to 2 teaspoons (5-10ml) after meals or at bedtime',
    timing: 'Post meals / Bedtime',
    indication: 'Rapid coating and cooling relief for acidity, acid reflux, and gas',
    category: 'ACIDITY_GAS',
    buyingLinks: buildBuyingLinks('Gelusil MPS Liquid Antacid'),
    caution: 'Shake bottle well before use. If acidity persists with severe chest/radiating pain, immediately rule out cardiac issues.'
  },
  volini_gel: {
    id: 'med-volini',
    name: 'Volini Pain Relief Gel / Spray',
    genericName: 'Diclofenac Diethylamine + Methyl Salicylate + Menthol + Linseed Oil',
    dosage: 'Apply a thin layer gently 3 to 4 times daily over affected painful muscle/joint area',
    timing: 'External topical application',
    indication: 'Topical relief for backache, joint stiffness, neck strain, and muscular sprains',
    category: 'BODY_PAIN',
    buyingLinks: buildBuyingLinks('Volini Pain Relief Gel 50g'),
    caution: 'For external use only. Do not apply on broken, burned, or open wound skin. Wash hands thoroughly after application.'
  },
  electral_ors: {
    id: 'med-electral-ors',
    name: 'Electral ORS Powder (WHO Recommended Formula)',
    genericName: 'Sodium Chloride, Potassium Chloride, Sodium Citrate, Dextrose',
    dosage: 'Dissolve entire 21.8g sachet in 1 Litre of clean drinking water. Sip continuously throughout the day',
    timing: 'Sip throughout the day',
    indication: 'Prevents dehydration, restores vital electrolyte balance during diarrhea, vomiting, heat exhaustion or viral fatigue',
    category: 'DEHYDRATION',
    buyingLinks: buildBuyingLinks('Electral Powder Sachet 21.8g'),
    caution: 'Discard any unused reconstituted solution after 24 hours. Do not boil already prepared solution.'
  }
};

const CRITICAL_EMERGENCY_PATTERNS = [
  /chest.*pain|heart.*attack|crushing.*chest|pressure.*chest|pain.*radiat.*arm|pain.*radiat.*jaw|sweat.*chest/i,
  /seene.*(me|mein).*dard|chhati.*(me|mein).*dard|chhatit.*vedna|छातीत.*वेदना|सीने.*दर्द|दिल.*दौरा|छाती.*दाटून/i,
  /nenjil.*vali|edeyalli.*novu|gundelo.*noppi|buke.*byatha|chhatima.*dukhava/i,
  /cannot.*breathe|gasping.*air|difficult.*breathing|shortness.*breath|saans.*(taklif|phool|nahi)|dam.*ghot|shwas.*(nahi|tras)|श्वास.*नाही|दम.*कोंड|सांस.*नहीं|দম.*বন্ধ/i,
  /usiru.*katt|muchu.*thinaral|swasa.*aadaka/i,
  /facial.*droop|sudden.*weakness|slurred.*speech|arm.*numb|ek.*taraf.*paralysis|bol.*nahi.*pa.*raha|stroke|face.*tedha|चेहरा.*वाकडा|पक्षाघात|बोलता.*नाही/i,
  /lakwa|paralysis|muh.*tedha|haath.*pair.*sunn/i,
  /vomit.*blood|cough.*blood|severe.*bleeding|massive.*hemorrhage|khoon.*ulti|raktastrav|रक्ताची.*उलटी|खून.*उल्टी/i,
  /throat.*swell|cannot.*swallow|anaphylaxis|tongue.*swoll|gala.*phool|gale.*sujan|throat.*closing/i,
  /unconscious|fainted|behoshi|loss.*consciousness|head.*injury|chakkar.*aakar.*gir|concussion/i
];

const SPECIALIZED_DOCTOR_PATTERNS = [
  {
    regex: /bp\s*(?:is|high|>)?\s*(?:1[5-9]\d|2\d\d)|blood\s*pressure\s*(?:very\s*high|shoot|1[5-9]\d)|high\s*bp|hypertension\s*crisis/i,
    department: 'Cardiology / General Medicine',
    reason: 'Severely elevated blood pressure requires professional clinical management.'
  },
  {
    regex: /sugar\s*(?:level|is|high|>)?\s*(?:2[5-9]\d|[3-9]\d\d)|uncontrolled\s*diabetes|sugar\s*300|sugar\s*400/i,
    department: 'Diabetology / Endocrinology',
    reason: 'Significantly uncontrolled blood glucose requires prescription insulin or dosage adjustment.'
  },
  {
    regex: /burn.*urin|peshab.*jalan|urine.*infection|uti|blood.*urine|mutra.*dah|kidney.*pain|flank.*pain|stone.*pain/i,
    department: 'Urology / Nephrology',
    reason: 'Urinary tract infections or renal stones require urine culture analysis and targeted prescription antibiotics.'
  },
  {
    regex: /acute.*abdominal|severe.*stomach.*pain|sharp.*stomach.*pain|pet.*bahut.*zyada.*dard|potaat.*tivr.*vedna|vomit.*continuous|loose.*motions.*with.*blood|appendix|gallbladder/i,
    department: 'Gastroenterology / General Surgery',
    reason: 'Severe or localized abdominal pain requires physical palpation and imaging to rule out acute abdomen.'
  },
  {
    regex: /pregnant|pregnancy|garbhvati|garbh|expecting.*baby|breastfeed|lactating|feeding.*mother/i,
    department: 'Obstetrics & Gynecology',
    reason: 'During pregnancy and lactation, specialist obstetrician clearance is mandatory before taking medications.'
  },
  {
    regex: /baby|infant|newborn|toddler|chhota.*bachha|1.*month.*old|6.*month.*old|1.*year.*old|2.*year.*old|balak/i,
    department: 'Pediatrics',
    reason: 'Pediatric patients require weight-based precise dosing. Over-the-counter self-medication is unsafe.'
  },
  {
    regex: /ear.*discharge|pus.*ear|ear.*pain.*severe|eye.*pus|severe.*tonsil|white.*spots.*throat|infected.*wound|pus.*wound/i,
    department: 'ENT / Otorhinolaryngology',
    reason: 'Purulent discharge indicates bacterial infection requiring prescription antimicrobial therapy.'
  },
  {
    regex: /fever.*(?:more.*than.*[4-9]|5.*days|week|hafta|10.*days)|weight.*loss.*sudden|unexplained.*lump|yellow.*eyes|jaundice|piliya/i,
    department: 'Internal Medicine',
    reason: 'Persistent fever lasting beyond 3-4 days or jaundice requires laboratory workup rather than symptom masking.'
  },
  {
    regex: /panic.*attack|severe.*anxiety|depression|hallucination|cannot.*sleep.*days|ghabrahat.*extreme/i,
    department: 'Psychiatry / Clinical Psychology',
    reason: 'Psychiatric distress requires professional evaluation and counseling.'
  }
];

const NORMAL_MINOR_PATTERNS = [
  {
    regex: /fever|bukhar|taap|taav|temperature|feverish|jwar|halka.*bukhar|mild.*fever|100.*degree|101.*degree|बुखार|ताप|ज्वर|તાવ|ಜ್ವರ|காய்ச்சல்|జ్వరం|জ্বর|بخار/i,
    key: 'fever'
  },
  {
    regex: /headache|sar.*dard|sir.*dard|doke.*dukhi|sirdard|frontal.*headache|tension.*headache|matha.*byatha|thala.*vali|सिरदर्द|सरदर्द|डोकेदुखी|डोके.*दुखी|माथा.*दुख|તથા|തലവേദന|தலைவலி|ತಲೆನೋವು|తలనొప్పి|মাথাব্যথা|মাথা.*ব্যথা|سر.*درد/i,
    key: 'headache'
  },
  {
    regex: /cold|runny.*nose|sneezing|sardi|zukham|thandi|shardi|naak.*beh|band.*naak|rhinitis|chhink|sinus|सर्दी|जुकाम|पडसे|શરદી|ಶೀತ|சளி|జలుబు|ঠাণ্ডা|নাক.*পানি|نزلہ|زکام/i,
    key: 'cold'
  },
  {
    regex: /sore.*throat|throat.*pain|gale.*kharash|gala.*dard|ghasa.*dukhi|khasi|khokla|dry.*cough|cough|खांसी|खोकला|घसा.*दुखी|गले.*खराश|गले.*दर्द|ઉધરસ|ಕೆಮ್ಮು|இருமல்|దగ్గు|কাশি|গলা.*ব্যথা|کھانسی|گلے.*درد/i,
    key: 'throat_cough'
  },
  {
    regex: /acidity|gas|heartburn|jalan|khatti.*dakar|apachan|bloat|pet.*jalan|gastric|एसिडिटी|गैस|जलन|खट्टी.*डकार|पित्त|ಅಸಿಡಿಟಿ|அசிடிட்டி|অম্লতা|گیس|تیزابیت/i,
    key: 'acidity'
  },
  {
    regex: /body.*ache|body.*pain|badan.*dard|angdukhi|sharir.*dard|muscle.*pain|tiredness|fatigue|बदन.*दर्द|अंगदुखी|शरीर.*दर्द|શરીર.*દર્દ|ಮೈಕೈ.*ನೋವು|உடல்.*வலி|శరీర.*ನొప్పి|শরীর.*ব্যথা|جسم.*درد/i,
    key: 'body_pain'
  },
  {
    regex: /dehydration|kamzori|thakan|electrolytes|weakness.*heat|कमजोरी|थकान|निर्जलीकरण|डिहाइड्रेशन/i,
    key: 'dehydration'
  }
];

export class MedicineRecommendationService {
  public static evaluateTriageAndMedicines(
    currentInput: string,
    history: Array<{ sender: string; text: string }> = []
  ): ClinicalTriageAssessment {
    const combinedText = [
      ...history.map(m => m.text),
      currentInput
    ].join(' ').trim();

    const lower = combinedText.toLowerCase();

    // 1. STEP 1: Check for Critical Life-Threatening Red Flags
    for (const pattern of CRITICAL_EMERGENCY_PATTERNS) {
      if (pattern.test(lower)) {
        return {
          category: 'CRITICAL_EMERGENCY',
          rationale: 'High-risk life-threatening emergency symptoms detected. Immediate hospital emergency triage required.',
          isMedicationRecommended: false,
          medicationDisclaimer: '🚨 CRITICAL SAFETY ALERT: Do NOT self-medicate or take over-the-counter pills during an acute emergency. Immediate emergency medical intervention is required.',
          medicines: []
        };
      }
    }

    // 2. STEP 2: Check for "Another Way of Issue" (Specialized / Non-Minor / Doctor Required)
    for (const item of SPECIALIZED_DOCTOR_PATTERNS) {
      if (item.regex.test(lower)) {
        return {
          category: 'SPECIALIZED_DOCTOR_REQUIRED',
          rationale: item.reason,
          recommendedDepartment: item.department,
          isMedicationRecommended: false,
          medicationDisclaimer: `⚠️ Clinical Safety Advisory: Your reported condition (${item.reason}) is specialized and cannot be safely treated with over-the-counter self-medication. Please consult a specialist doctor in ${item.department}.`,
          medicines: []
        };
      }
    }

    // 3. STEP 3: Check for Normal Minor Issues (Fever, Headache, Cold, Acidity, Body Ache)
    const detectedNormalKeys = new Set<string>();
    for (const item of NORMAL_MINOR_PATTERNS) {
      if (item.regex.test(lower)) {
        detectedNormalKeys.add(item.key);
      }
    }

    if (detectedNormalKeys.size > 0) {
      const selectedMedicines: MedicineRecommendation[] = [];

      if (detectedNormalKeys.has('fever') && detectedNormalKeys.has('headache')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.dolo_650);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.saridon);
      } else if (detectedNormalKeys.has('fever')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.dolo_650);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.crocin_advance);
      } else if (detectedNormalKeys.has('headache')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.saridon);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.dolo_650);
      }

      if (detectedNormalKeys.has('cold')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.cetzine);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.otrivin_spray);
      }

      if (detectedNormalKeys.has('throat_cough')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.strepsils);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.honitus_syrup);
      }

      if (detectedNormalKeys.has('acidity')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.digene_tablets);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.gelusil_syrup);
      }

      if (detectedNormalKeys.has('body_pain') && !selectedMedicines.some(m => m.id === 'med-dolo-650')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.volini_gel);
        selectedMedicines.push(OTC_MEDICINE_CATALOG.dolo_650);
      }

      if (detectedNormalKeys.has('dehydration')) {
        selectedMedicines.push(OTC_MEDICINE_CATALOG.electral_ors);
      }

      const uniqueMeds = Array.from(
        new Map(selectedMedicines.map(m => [m.id, m])).values()
      ).slice(0, 3);

      return {
        category: 'NORMAL_MINOR_ISSUE',
        rationale: 'Mild, common seasonal symptoms suitable for over-the-counter symptomatic management.',
        isMedicationRecommended: true,
        medicationDisclaimer: 'Verified OTC Symptomatic Care: These over-the-counter remedies provide symptomatic relief. If fever, headache, or other symptoms do not improve within 48 to 72 hours, consult a physician.',
        medicines: uniqueMeds
      };
    }

    return {
      category: 'NORMAL_MINOR_ISSUE',
      rationale: 'Clinical history collection in progress.',
      isMedicationRecommended: false,
      medicines: []
    };
  }

  public static getLocalizedAdvisory(
    assessment: ClinicalTriageAssessment,
    lang: LanguageCode = 'en'
  ): string {
    if (assessment.category === 'CRITICAL_EMERGENCY') {
      const msgs: Record<string, string> = {
        en: '🚨 **CRITICAL SAFETY ADVISORY**: Emergency red flags have been detected. Do NOT take over-the-counter medication. Immediate emergency hospital care is required.',
        hi: '🚨 **गंभीर आपातकालीन चेतावनी**: आपातकालीन लक्षण (रेड फ्लैग) पाए गए हैं। कृपया कोई भी सामान्य गोली या दवा खुद से न लें। तुरंत नजदीकी अस्पताल के आपातकालीन कक्ष (ER) जाएं।',
        mr: '🚨 **तातडीची आणीबाणी सूचना**: आपत्कालीन लक्षणे आढळली आहेत. कोणतीही औषधे स्वतःहून घेऊ नका. तातडीने जवळच्या हॉस्पिटलच्या अपघात विभागात जा.',
        ur: '🚨 **ہنگامی الرٹ**: ہنگامی علامات کا پتہ چلا ہے۔ براہ کرم خود سے دوائیں نہ لیں، فوری طور پر ایمرجنسی میں جائیں۔',
        kn: '🚨 **ತುರ್ತು ಎಚ್ಚರಿಕೆ**: ಗಂಭೀರ ತುರ್ತು ಲಕ್ಷಣಗಳು ಕಂಡುಬಂದಿವೆ. ಯಾವುದೇ ಮಾತ್ರೆಗಳನ್ನು ಸ್ವಂತವಾಗಿ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ. ತಕ್ಷಣವೇ ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ ತೆರಳಿ.',
        gu: '🚨 **કટોકટી ચેતવણી**: કટોકટીના લક્ષણો જણાયા છે. જાતે કોઈ દવા લેશો નહીં. તાત્કાલિક ઇમરજન્સી હોસ્પિટલમાં જાઓ.',
        ta: '🚨 **அவசர எச்சரிக்கை**: தீவிர அறிகுறிகள் உள்ளன. தாங்களாகவே மருந்துகளை உட்கொள்ள வேண்டாம். உடனடியாக அவசர பிரிவிற்கு செல்லவும்.',
        bn: '🚨 **জরুরি সতর্কবার্তা**: বিপজ্জনক জরুরি লক্ষণ সনাক্ত করা হয়েছে। নিজে কোনো ওষুধ খাবেন না। অবিলম্বে জরুরি বিভাগে যান।'
      };
      return msgs[lang] || msgs.en;
    }

    if (assessment.category === 'SPECIALIZED_DOCTOR_REQUIRED') {
      const msgs: Record<string, string> = {
        en: `⚠️ **CLINICAL ADVISORY — NO OVER-THE-COUNTER MEDICINES RECOMMENDED**:\nYour reported symptoms indicate a specialized or non-minor condition (${assessment.rationale}). Taking unprescribed over-the-counter medicines could mask important signs or cause complications. Please consult a qualified specialist in **${assessment.recommendedDepartment || 'General Medicine'}**.`,
        hi: `⚠️ **क्लिनिकल सलाह — बिना डॉक्टर की पर्ची के दवा न लें**:\nआपकी समस्या सामान्य बुखार/सिरदर्द से अलग और विशेष प्रकार की है (${assessment.rationale})। खुद से दवाइयां लेना हानिकारक हो सकता है। कृपया **${assessment.recommendedDepartment || 'जनरल फिजिशियन'}** से परामर्श करें।`,
        mr: `⚠️ **वैद्यकीय सल्ला — स्वतःहून औषधे घेऊ नका**:\nतुमची लक्षणे सामान्य सर्दी-तापापेक्षा वेगळी आणि गुंतागुंतीची आहेत (${assessment.rationale})। स्वतःहून औषध घेतल्यास मूळ आजार लपून धोका वाढू शकतो. कृपया **${assessment.recommendedDepartment || 'तज्ज्ञ डॉक्टर'}** यांचा सल्ला घ्या.`,
        ur: `⚠️ **طبی مشورہ — خود سے دوائیں نہ لیں**:\nآپ کی علامات ایک مخصوص نوعیت کی بیماری کی طرف اشارہ کرتی ہیں۔ براہ کرم ماہر ڈاکٹر سے رجوع کریں۔`,
        kn: `⚠️ **ವೈದ್ಯಕೀಯ ಸಲಹೆ — ಸ್ವಂತ ಔಷಧೋಪಚಾರ ಬೇಡ**:\nನಿಮ್ಮ ಲಕ್ಷಣಗಳು ತಜ್ಞ ವೈದ್ಯರ ಮೌಲ್ಯಮಾಪನವನ್ನು ಬಯಸುತ್ತವೆ. ದಯವಿಟ್ಟು ಸೂಕ್ತ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.`,
        gu: `⚠️ **તબીબી સલાહ — જાતે દવા લેશો નહીં**:\nતમારા લક્ષણો વિશિષ્ટ નિદાનની જરૂરિયાત દર્શાવે છે. કૃપા કરીને નિષ્ણાત ડોક્ટરની સલાહ લો.`,
        ta: `⚠️ **மருத்துவ ஆலோசனை — சுய மருத்துவம் வேண்டாம்**:\nஉங்கள் அறிகுறிகளுக்கு சிறப்பு மருத்துவரின் பரிசோதனை தேவைப்படுகிறது. தகுந்த மருத்துவரை அணுகவும்.`,
        bn: `⚠️ **ক্লিনিকাল পরামর্শ — ডাক্তারের পরামর্শ ছাড়া ওষুধ নয়**:\nআপনার শারীরিক অবস্থাটি একটি বিশেষ রোগ নির্দেশ করে। অনুগ্রহ করে বিশেষজ্ঞ চিকিৎসকের পরামর্শ নিন।`
      };
      return msgs[lang] || msgs.en;
    }

    if (assessment.category === 'NORMAL_MINOR_ISSUE' && assessment.medicines && assessment.medicines.length > 0) {
      const msgs: Record<string, string> = {
        en: `💊 **Verified OTC Symptomatic Care**: For your reported mild symptoms (such as fever / headache / cold), the following over-the-counter remedies provide safe relief with verified pharmacy buying links:`,
        hi: `💊 **सामान्य लक्षणों हेतु सुरक्षित दवाइयां**: आपके सामान्य लक्षणों (जैसे बुखार / सिरदर्द / सर्दी) के लिए निम्नलिखित सुरक्षित ओवर-द-काउंटर दवाइयां और उनके ऑनलाइन खरीद लिंक उपलब्ध हैं:`,
        mr: `💊 **सामान्य त्रासासाठी सुरक्षित औषधे**: तुमच्या सामान्य लक्षणांसाठी (ताप / डोकेदुखी / सर्दी) खालील सुरक्षित औषधे आणि खरेदीच्या खात्रीशीर लिंक्स उपलब्ध आहेत:`,
        ur: `💊 **عام علامات کے لیے تجویز کردہ ادویات**: آپ کے ہلکے بخار یا سر درد کے لیے محفوظ ادویات اور آن لائن خریدنے کے لنکس ذیل میں ہیں:`,
        kn: `💊 **ಸಾಮಾನ್ಯ ಲಕ್ಷಣಗಳಿಗೆ ಶಿಫಾರಸು ಮಾಡಲಾದ ಔಷಧಿಗಳು**: ಜ್ವರ ಮತ್ತು ತಲೆನೋವಿಗೆ ಸುರಕ್ಷಿತ ಔಷಧಿಗಳು ಮತ್ತು ನೇರ ಖರೀದಿ ಲಿಂಕ್‌ಗಳು:`,
        gu: `💊 **સામાન્ય લક્ષણો માટે સલામત દવાઓ**: તમારા તાવ અને માથાના દુખાવા માટે ઉપલબ્ધ દવાઓ અને ખરીદી લિંક્સ:`,
        ta: `💊 **சாதாரண அறிகுறிகளுக்கான மருந்துகள்**: காய்ச்சல் மற்றும் தலைவலிக்கான அங்கீகரிக்கப்பட்ட மருந்துகள் மற்றும் வாங்கும் இணைப்புகள்:`,
        bn: `💊 **সাধারণ উপসর্গের জন্য ওষুধ**: হালকা জ্বর এবং মাথাব্যথার জন্য প্রস্তাবিত ওষুধ ও কেনার লিঙ্ক:`
      };
      return msgs[lang] || msgs.en;
    }

    return '';
  }
}
