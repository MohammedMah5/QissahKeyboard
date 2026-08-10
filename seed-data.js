/* =====================================================================
   Qissah Keyboard — Seed content for Firestore (categories + stories)
   Used to populate the database on first run and as an offline fallback
   if Firestore reads/writes are unavailable (e.g. security rules).
   ===================================================================== */

export const seedCategories = [
  { id: 'entrepreneurship', name: 'قصص ريادة الأعمال', order: 1 },
  { id: 'cultures', name: 'قصص ثقافات استثنائية', order: 2 },
];

function thumb(text, bg = '8C61E6') {
  // Scene images fall back to thumbnailUrl in game.js, so return empty for scenes
  if (text.startsWith('Scene')) return '';
  
  // Use local images from Assets/Narrations when possible for reliable loading
  const localImages = {
    'Build Your Idea': './Assets/Narrations/Enterprenurship/AlbaikStory1/Cover.png',
    'Digital Marketing': './Assets/Narrations/Enterprenurship/Sooque.com/Cover.png',
    'Team Management': './Assets/Narrations/Enterprenurship/AlbaikStory1/Cover.png',
    'Crowdfunding': './Assets/Narrations/Enterprenurship/Talabat/Cover.png',
    'Asian Cultures': './Assets/Narrations/Culture/Bajau/cover.png',
    'Amazon Tribes': './Assets/Narrations/Culture/Korowai/Cover.png',
    'Japanese Traditions': './Assets/Narrations/Culture/Sentinel/Cover.png',
    'African Civilizations': './Assets/Narrations/Culture/Bajau/cover.png',
  };
  if (localImages[text]) return localImages[text];
  return `https://placehold.co/700x400/${bg}/ffffff?text=${encodeURIComponent(text)}`;
}

export const seedStories = [
  // ------------------------------- Entrepreneurship -------------------------------
  {
    id: 'biz-1',
    title: 'بناء فكرة مشروعك',
    category: 'entrepreneurship',
    tier: 'free',
    expectedMinutes: 9,
    thumbnailUrl: thumb('Build Your Idea'),
    scenes: [
      {
        en: 'Every business starts with an idea.\nFind a problem worth solving.',
        ar: 'كل مشروع يبدأ بفكرة. ابحث عن مشكلة تستحق الحل.',
        image: thumb('Scene 1'),
        words: { every: 'كل', business: 'مشروع', starts: 'يبدأ', with: 'بـ', an: 'أداة تعريف', idea: 'فكرة', find: 'ابحث عن', a: 'أداة تعريف', problem: 'مشكلة', worth: 'تستحق', solving: 'الحل' },
      },
      {
        en: 'Write down your simple plan.\nLearn fast and improve often.',
        ar: 'اكتب خطتك البسيطة. تعلم بسرعة وحسّن كثيرًا.',
        image: thumb('Scene 2'),
        words: { write: 'اكتب', down: 'دوّن', your: 'الخاص بك', simple: 'بسيطة', plan: 'خطة', learn: 'تعلم', fast: 'بسرعة', and: 'و', improve: 'حسّن', often: 'كثيرًا' },
      },
    ],
  },
  {
    id: 'biz-2',
    title: 'التسويق الرقمي',
    category: 'entrepreneurship',
    tier: 'free',
    expectedMinutes: 11,
    thumbnailUrl: thumb('Digital Marketing'),
    scenes: [
      {
        en: 'Marketing tells your story well.\nKnow exactly who you serve.',
        ar: 'التسويق يروي قصتك جيدًا. اعرف بالضبط من تخدم.',
        image: thumb('Scene 1'),
        words: { marketing: 'التسويق', tells: 'يروي', your: 'الخاص بك', story: 'قصتك', well: 'جيدًا', know: 'اعرف', exactly: 'بالضبط', who: 'من', you: 'أنت', serve: 'تخدم' },
      },
      {
        en: 'Social media builds real trust.\nTrack results and adjust fast.',
        ar: 'وسائل التواصل الاجتماعي تبني ثقة حقيقية. تتبع النتائج وعدّل بسرعة.',
        image: thumb('Scene 2'),
        words: { social: 'اجتماعي', media: 'وسائل', builds: 'يبني', real: 'حقيقية', trust: 'ثقة', track: 'تتبع', results: 'النتائج', and: 'و', adjust: 'عدّل', fast: 'بسرعة' },
      },
    ],
  },
  {
    id: 'biz-3',
    title: 'إدارة الفريق',
    category: 'entrepreneurship',
    tier: 'pro',
    expectedMinutes: 13,
    thumbnailUrl: thumb('Team Management'),
    scenes: [
      {
        en: 'Great leaders listen more carefully.\nClear goals guide every team.',
        ar: 'القادة العظماء يستمعون بعناية أكبر. الأهداف الواضحة توجّه كل فريق.',
        image: thumb('Scene 1'),
        words: { great: 'عظماء', leaders: 'القادة', listen: 'يستمعون', more: 'أكثر', carefully: 'بعناية', clear: 'واضحة', goals: 'الأهداف', guide: 'توجّه', every: 'كل', team: 'فريق' },
      },
      {
        en: 'Give feedback quickly and kindly.\nA strong team solves anything.',
        ar: 'قدّم الملاحظات بسرعة وبلطف. الفريق القوي يحل أي شيء.',
        image: thumb('Scene 2'),
        words: { give: 'قدّم', feedback: 'ملاحظات', quickly: 'بسرعة', and: 'و', kindly: 'بلطف', a: 'أداة تعريف', strong: 'قوي', team: 'فريق', solves: 'يحل', anything: 'أي شيء' },
      },
    ],
  },
  {
    id: 'biz-4',
    title: 'التمويل الجماعي',
    category: 'entrepreneurship',
    tier: 'free',
    expectedMinutes: 10,
    thumbnailUrl: thumb('Crowdfunding'),
    scenes: [
      {
        en: 'Crowdfunding gathers support from many.\nA good story attracts backers.',
        ar: 'التمويل الجماعي يجمع الدعم من الكثيرين. القصة الجيدة تجذب الداعمين.',
        image: thumb('Scene 1'),
        words: { crowdfunding: 'التمويل الجماعي', gathers: 'يجمع', support: 'الدعم', from: 'من', many: 'الكثيرين', a: 'أداة تعريف', good: 'جيدة', story: 'قصة', attracts: 'تجذب', backers: 'الداعمين' },
      },
      {
        en: 'Set a clear funding goal.\nThank every supporter personally always.',
        ar: 'حدد هدف تمويل واضح. اشكر كل داعم شخصيًا دائمًا.',
        image: thumb('Scene 2'),
        words: { set: 'حدد', a: 'أداة تعريف', clear: 'واضح', funding: 'تمويل', goal: 'هدف', thank: 'اشكر', every: 'كل', supporter: 'داعم', personally: 'شخصيًا', always: 'دائمًا' },
      },
    ],
  },

  // ------------------------------- Exceptional Cultures -------------------------------
  {
    id: 'culture-1',
    title: 'ثقافات آسيا الغريبة',
    category: 'cultures',
    tier: 'free',
    expectedMinutes: 14,
    thumbnailUrl: thumb('Asian Cultures'),
    scenes: [
      {
        en: 'Asia holds many ancient traditions.\nEach country has unique customs.',
        ar: 'آسيا تحتضن العديد من التقاليد القديمة. كل بلد له عادات فريدة.',
        image: thumb('Scene 1'),
        words: { asia: 'آسيا', holds: 'تحتضن', many: 'الكثير من', ancient: 'القديمة', traditions: 'التقاليد', each: 'كل', country: 'بلد', has: 'لديه', unique: 'فريدة', customs: 'عادات' },
      },
      {
        en: 'Tea ceremonies show quiet patience.\nFestivals bring whole families together.',
        ar: 'مراسم الشاي تُظهر صبرًا هادئًا. المهرجانات تجمع العائلات بأكملها معًا.',
        image: thumb('Scene 2'),
        words: { tea: 'الشاي', ceremonies: 'مراسم', show: 'تظهر', quiet: 'هادئًا', patience: 'صبرًا', festivals: 'المهرجانات', bring: 'تجمع', whole: 'بأكملها', families: 'العائلات', together: 'معًا' },
      },
    ],
  },
  {
    id: 'culture-2',
    title: 'قبائل الأمازون',
    category: 'cultures',
    tier: 'free',
    expectedMinutes: 16,
    thumbnailUrl: thumb('Amazon Tribes'),
    scenes: [
      {
        en: 'Amazon tribes live near rivers.\nThe forest gives food and medicine.',
        ar: 'قبائل الأمازون تعيش قرب الأنهار. الغابة توفر الطعام والدواء.',
        image: thumb('Scene 1'),
        words: { amazon: 'الأمازون', tribes: 'قبائل', live: 'تعيش', near: 'قرب', rivers: 'الأنهار', the: 'ال', forest: 'الغابة', gives: 'توفر', food: 'الطعام', and: 'و', medicine: 'الدواء' },
      },
      {
        en: 'Elders teach ancient forest wisdom.\nSongs carry stories across time.',
        ar: 'الشيوخ يعلّمون حكمة الغابة القديمة. الأغاني تحمل القصص عبر الزمن.',
        image: thumb('Scene 2'),
        words: { elders: 'الشيوخ', teach: 'يعلّمون', ancient: 'القديمة', forest: 'الغابة', wisdom: 'حكمة', songs: 'الأغاني', carry: 'تحمل', stories: 'القصص', across: 'عبر', time: 'الزمن' },
      },
    ],
  },
  {
    id: 'culture-3',
    title: 'تقاليد اليابان',
    category: 'cultures',
    tier: 'pro',
    expectedMinutes: 12,
    thumbnailUrl: thumb('Japanese Traditions'),
    scenes: [
      {
        en: 'Japan values order and respect.\nSimple design reflects deep meaning.',
        ar: 'اليابان تقدّر النظام والاحترام. التصميم البسيط يعكس معنى عميقًا.',
        image: thumb('Scene 1'),
        words: { japan: 'اليابان', values: 'تقدّر', order: 'النظام', and: 'و', respect: 'الاحترام', simple: 'البسيط', design: 'التصميم', reflects: 'يعكس', deep: 'عميقًا', meaning: 'معنى' },
      },
      {
        en: 'Bowing shows politeness and honor.\nGardens create calm and balance.',
        ar: 'الانحناء يُظهر الأدب والشرف. الحدائق تخلق الهدوء والتوازن.',
        image: thumb('Scene 2'),
        words: { bowing: 'الانحناء', shows: 'يُظهر', politeness: 'الأدب', and: 'و', honor: 'الشرف', gardens: 'الحدائق', create: 'تخلق', calm: 'الهدوء', balance: 'التوازن' },
      },
    ],
  },
  {
    id: 'culture-4',
    title: 'حضارات أفريقيا القديمة',
    category: 'cultures',
    tier: 'free',
    expectedMinutes: 18,
    thumbnailUrl: thumb('African Civilizations'),
    scenes: [
      {
        en: 'Ancient Africa built great kingdoms.\nTrade routes connected distant lands.',
        ar: 'أفريقيا القديمة بنت ممالك عظيمة. طرق التجارة ربطت أراضٍ بعيدة.',
        image: thumb('Scene 1'),
        words: { ancient: 'القديمة', africa: 'أفريقيا', built: 'بنت', great: 'عظيمة', kingdoms: 'ممالك', trade: 'التجارة', routes: 'طرق', connected: 'ربطت', distant: 'بعيدة', lands: 'أراضٍ' },
      },
      {
        en: 'Griots kept history through storytelling.\nDrums carried messages across villages.',
        ar: 'الغريوت حافظوا على التاريخ عبر الحكي. الطبول حملت الرسائل عبر القرى.',
        image: thumb('Scene 2'),
        words: { griots: 'الغريوت', kept: 'حافظوا على', history: 'التاريخ', through: 'عبر', storytelling: 'الحكي', drums: 'الطبول', carried: 'حملت', messages: 'الرسائل', across: 'عبر', villages: 'القرى' },
      },
    ],
  },
];
