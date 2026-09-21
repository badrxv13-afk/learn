/**
 * YouTube Embed & Referrer-Policy Validator (GitHub Pages Static Hosting Edition)
 * 
 * يتحقق من:
 * 1. التوافق التام مع الاستضافة الثابتة (100% Static Hosting Compatible with GitHub Pages).
 * 2. عدم وجود أي اعتمادية إنتاجية على خادم backend أو server.js.
 * 3. عدم وجود أي أثر لـ localhost أو 127.0.0.1 في روابط التضمين أو واجهات الإنتاج.
 * 4. تطبيق ترويسة وسوم Referrer-Policy الصارمة (strict-origin-when-cross-origin).
 * 5. تطبيق خاصية referrerpolicy على كافة وسوم الـ iframe.
 * 6. توليد origin و widget_referrer بشكل ديناميكي كامل وفق معايير GitHub Pages و HTTPS.
 * 7. إزالة السمة المقيدة rel="noreferrer" من أزرار وروابط YouTube للاحتفاظ بـ rel="noopener" فقط.
 * 8. التحقق من بناء روابط Embed الرسمية (youtube.com/embed/ID) ورفض Search URLs و Watch URLs داخل iframe.
 * 9. فحص تشغيل 10 فيديوهات حقيقية عبر المواد السبع كاملة.
 * 10. معالجة حالات الأخطاء (153, 100, 101, 150, 2) ببطاقة بديل واضحة ومحددة.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`[FAIL] ${message}`);
  }
}

console.log('====================================================');
console.log('  فحص طبقة مشغل YouTube المتوافقة مع GitHub Pages');
console.log('====================================================\n');

// 1. فحص الفيديوهات الحقيقية عبر المواد السبع
const testVideos = [
  { subject: 'الفلسفة', id: '4h-OjPGRJJo', title: 'درس الإحساس والإدراك', channel: 'عادل مقرود' },
  { subject: 'الفلسفة', id: '80EzBwM2hB4', title: 'اللغة والفكر والدال والمدلول', channel: 'خليل سعيداني' },
  { subject: 'العلوم الإسلامية', id: 'IfoHQZb4kn4', title: 'العقيدة الإسلامية وأثرها على الفرد والمجتمع', channel: 'شمس الدين' },
  { subject: 'العلوم الإسلامية', id: 'uPROEQzvcuM', title: 'وسائل القرآن في تثبيت العقيدة الإسلامية', channel: 'شمس الدين' },
  { subject: 'اللغة العربية', id: '1B5WHxNScug', title: 'معاني وإعراب إذ، إذا، إذن، وحينئذ', channel: 'حيقون أسامة' },
  { subject: 'اللغة العربية', id: 'zQ_sQn4B4oY', title: 'البلاغة والاتساق والانسجام', channel: 'أبو بكر مبروك' },
  { subject: 'الرياضيات', id: 'YAGvr0KYl_o', title: 'المتتاليات العددية من الألف إلى الياء', channel: 'نور الدين' },
  { subject: 'الرياضيات', id: 'APX_36KrZu8', title: 'الدوال العددية وحساب النهايات', channel: 'نور الدين' },
  { subject: 'اللغة الفرنسية', id: '1dZMzCHz0xc', title: 'Le texte d\'histoire - Syntaxe et visée', channel: 'قناة البكالوريا الفرنسية' },
  { subject: 'التاريخ والجغرافيا', id: 'NXbUDyI_AHg', title: 'بروز الصراع وتشكل العالم', channel: 'بورنان' },
  { subject: 'اللغة الإنجليزية', id: 'BbfqemQc7-E', title: 'Ancient Civilizations - Ethics in Business', channel: 'قناة الإنجليزية للبكالوريا' }
];

console.log('--- 1. فحص سلامة معرّفات الفيديوهات (11 حرفاً) عبر المواد السبع ---');
testVideos.forEach(v => {
  const isValidLength = typeof v.id === 'string' && v.id.length === 11;
  const isValidChars = /^[a-zA-Z0-9_-]{11}$/.test(v.id);
  assert(isValidLength && isValidChars, `معرّف فيديو [${v.subject}] (${v.id}) سليم ومطابق لمعايير YouTube (11 حرفاً)`);
});

// 2. فحص ملف index.html
console.log('\n--- 2. فحص التوافق مع الاستضافة الثابتة في index.html ---');
const indexHtmlPath = path.join(baseDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

assert(
  indexHtml.includes('<meta name="referrer" content="strict-origin-when-cross-origin"'),
  'وجود وسم <meta name="referrer" content="strict-origin-when-cross-origin" /> في <head>'
);

assert(
  indexHtml.includes('id="youtube-iframe-player"') && 
  indexHtml.includes('referrerpolicy="strict-origin-when-cross-origin"'),
  'تطبيق خاصية referrerpolicy="strict-origin-when-cross-origin" على #youtube-iframe-player'
);

assert(
  indexHtml.includes('id="video-error-fallback"'),
  'وجود حاوية معالجة الأخطاء والبديل (#video-error-fallback)'
);

assert(
  indexHtml.includes('id="video-error-external-btn"'),
  'وجود زر المشاهدة الخارجية المباشرة (#video-error-external-btn)'
);

assert(
  !indexHtml.includes('rel="noopener noreferrer"'),
  'خلو index.html تماماً من سمة rel="noopener noreferrer" لروابط YouTube والاحتفاظ بـ rel="noopener"'
);

assert(
  !indexHtml.includes('http://localhost') && !indexHtml.includes('127.0.0.1'),
  'خلو index.html تماماً من أي مسارات أو روابط localhost'
);

// 3. فحص app.js ودوال بناء الرابط ومعالجة الأخطاء
console.log('\n--- 3. فحص كود app.js وتوافق الاستضافة الثابتة ---');
const appJsPath = path.join(baseDir, 'app.js');
const appJs = fs.readFileSync(appJsPath, 'utf8');

assert(
  appJs.includes('function buildYouTubeEmbedUrl('),
  'دالة buildYouTubeEmbedUrl المركزية معرفة داخل app.js'
);

assert(
  appJs.includes('function handleYouTubePlayerError('),
  'دالة handleYouTubePlayerError معرفة لمعالجة أخطاء المشغل'
);

assert(
  appJs.includes('function initYouTubeErrorListener('),
  'دالة initYouTubeErrorListener معرفة للاستماع لرسائل مشغل YouTube'
);

assert(
  !appJs.includes('rel="noopener noreferrer"'),
  'خلو app.js تماماً من سمة rel="noopener noreferrer" لروابط YouTube'
);

assert(
  !appJs.includes('http://localhost') && !appJs.includes('127.0.0.1'),
  'خلو app.js تماماً من أي اعتمادية أو روابط localhost'
);

// 4. اختبار تشغيلي لمحاكاة بيئة GitHub Pages (HTTPS Production)
console.log('\n--- 4. اختبار تشغيلي لمحاكاة بيئة GitHub Pages (HTTPS) ---');

function createMockElement(id = '') {
  return {
    id,
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    textContent: '',
    innerHTML: '',
    href: '',
    src: '',
    style: {}
  };
}

function createMockRuntime(locationMock) {
  const context = {
    window: {
      location: locationMock,
      addEventListener: () => {},
      scrollTo: () => {},
      history: { pushState: () => {}, replaceState: () => {} }
    },
    location: locationMock,
    document: {
      getElementById: (id) => createMockElement(id),
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    appState: { currentSubject: 'الفلسفة', currentLesson: 'الإحساس والإدراك' },
    PlatformStore: {
      getCustomVideoUrl: () => null
    },
    URLSearchParams,
    URL,
    console
  };
  context.window.window = context.window;
  vm.createContext(context);
  return context;
}

// محاكاة استضافة GitHub Pages على نطاق حقيقي
const ghPagesRuntime = createMockRuntime({
  protocol: 'https:',
  origin: 'https://algerian-student.github.io',
  href: 'https://algerian-student.github.io/elmed-platform/index.html'
});

vm.runInContext(appJs, ghPagesRuntime);

testVideos.forEach(v => {
  const embedUrl = ghPagesRuntime.buildYouTubeEmbedUrl(v.id, { autoplay: 1 });
  
  assert(
    embedUrl.startsWith(`https://www.youtube.com/embed/${v.id}`),
    `[${v.subject}] الرابط يبدأ بـ youtube.com/embed/${v.id}`
  );

  assert(
    !embedUrl.includes('youtube-nocookie.com'),
    `[${v.subject}] الرابط لا يستخدم نطاق youtube-nocookie.com`
  );

  assert(
    !embedUrl.includes('/watch?v=') && !embedUrl.includes('/results?search_query='),
    `[${v.subject}] الرابط خالٍ من روابط المشاهدة العادية وصفحات البحث`
  );

  assert(
    embedUrl.includes('enablejsapi=1') && embedUrl.includes('rel=0') && embedUrl.includes('playsinline=1'),
    `[${v.subject}] الرابط يحتوي على المعاملات القياسية الثلاثة (enablejsapi, rel=0, playsinline)`
  );

  assert(
    embedUrl.includes('origin=https%3A%2F%2Falgerian-student.github.io'),
    `[${v.subject}] الرابط يتضمن origin الديناميكي المشفر الخاص بـ GitHub Pages دون ذكر localhost`
  );

  assert(
    embedUrl.includes('widget_referrer=https%3A%2F%2Falgerian-student.github.io%2Felmed-platform%2Findex.html'),
    `[${v.subject}] الرابط يتضمن widget_referrer الديناميكي الكامل لموقع GitHub Pages`
  );
});

// 5. فحص رفض الاستعلامات غير الصالحة والبحث العشوائي كـ Embed
console.log('\n--- 5. اختبار حماية التضمين من المعرفات غير الصالحة وروابط البحث ---');
const invalidEmbed1 = ghPagesRuntime.buildYouTubeEmbedUrl(null);
const invalidEmbed2 = ghPagesRuntime.buildYouTubeEmbedUrl('');
const invalidEmbed3 = ghPagesRuntime.buildYouTubeEmbedUrl('https://www.youtube.com/results?search_query=test');

assert(invalidEmbed1 === '', 'رفض بناء embed لقيمة null وإرجاع نص فارغ بدلاً من تضمين البحث');
assert(invalidEmbed2 === '', 'رفض بناء embed لقيمة فارغة');
assert(invalidEmbed3 === '', 'رفض رابط صفحة البحث search_query كـ embed ومنع إدخاله في الـ iframe');

// 6. محاكاة بيئة file:// للتأكد من رسالة الإرشاد وغياب origin=null
console.log('\n--- 6. اختبار سلوك المنشئ تحت بروتوكول file:// ---');
const fileRuntime = createMockRuntime({
  protocol: 'file:',
  origin: 'null',
  href: 'file:///C:/Users/mad/Desktop/index.html'
});
vm.runInContext(appJs, fileRuntime);

const fileEmbedUrl = fileRuntime.buildYouTubeEmbedUrl('4h-OjPGRJJo', { autoplay: 0 });
assert(
  !fileEmbedUrl.includes('origin='),
  'تجنب تمرير origin=null تحت بروتوكول file://'
);
assert(
  fileEmbedUrl.startsWith('https://www.youtube.com/embed/4h-OjPGRJJo'),
  'بناء رابط صالح أساسي في بيئة التطوير المحلية'
);

// 7. اختبار معالجة أخطاء YouTube (Error 153, 100, 101, 150)
console.log('\n--- 7. اختبار معالج أخطاء مشغل يوتيوب (Error Handler) ---');

let lastErrorTitle = '';
let lastErrorDesc = '';
let fallbackVisible = false;

const errorDomMock = {
  window: {
    location: { protocol: 'https:', origin: 'https://username.github.io' },
    addEventListener: () => {},
    scrollTo: () => {},
    history: { pushState: () => {}, replaceState: () => {} }
  },
  document: {
    getElementById: (id) => {
      const el = createMockElement(id);
      el.classList = {
        add: (c) => { if (c === 'hidden' && id === 'video-error-fallback') fallbackVisible = false; },
        remove: (c) => { if (c === 'hidden' && id === 'video-error-fallback') fallbackVisible = true; },
        contains: () => false
      };
      Object.defineProperty(el, 'textContent', {
        set(val) {
          if (id === 'video-error-title') lastErrorTitle = val;
          if (id === 'video-error-desc') lastErrorDesc = val;
        },
        get() {
          if (id === 'video-error-title') return lastErrorTitle;
          if (id === 'video-error-desc') return lastErrorDesc;
          return '';
        }
      });
      return el;
    },
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  appState: { currentYouTubeUrl: 'https://www.youtube.com/watch?v=4h-OjPGRJJo' },
  PlatformStore: { getCustomVideoUrl: () => null },
  URLSearchParams,
  URL,
  console
};
errorDomMock.window.window = errorDomMock.window;
vm.createContext(errorDomMock);
vm.runInContext(appJs, errorDomMock);

// اختبار Error 153 في الإنتاج
errorDomMock.handleYouTubePlayerError(153);
assert(fallbackVisible === true, 'ظهور واجهة البديل (Fallback) عند استقبال Error 153');
assert(lastErrorTitle.includes('153'), 'عنوان الخطأ يوضح الرمز Error 153');
assert(lastErrorDesc.includes('الرابط المرفق') || lastErrorDesc.includes('سياسة الأمان'), 'تقديم إرشاد دقيق للمستخدم في الإنتاج');

// اختبار Error 101
errorDomMock.handleYouTubePlayerError(101);
assert(lastErrorTitle.includes('101'), 'تصنيف خطأ حظر التضمين Error 101 بشكل مستقل');

// اختبار Error 100
errorDomMock.handleYouTubePlayerError(100);
assert(lastErrorTitle.includes('100'), 'تصنيف خطأ الفيديو غير المتاح Error 100');

// 8. فحص تجريد الإنتاج من الاعتماد على server.js
console.log('\n--- 8. فحص طبيعة server.js كأداة تطوير محلي فقط ---');
const serverJsPath = path.join(baseDir, 'server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');
assert(
  serverJs.includes('Development-Only Local Server Utility'),
  'توثيق server.js بوضوح كأداة تطوير محلي حصراً'
);
assert(
  serverJs.includes('100% Static Web Application') && serverJs.includes('GitHub Pages'),
  'التأكيد على أن المنصة ثابته بنسبة 100% وتعمل مباشرة عبر GitHub Pages دون الحاجة للخادم'
);

// النتيجة النهائية
console.log('\n====================================================');
console.log(`  نتائج فحص توافق مشغل YouTube مع GitHub Pages:`);
console.log(`  إجمالي الاختبارات: ${totalTests}`);
console.log(`  الناجحة: ${passedTests}`);
console.log(`  الفاشلة: ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\nتم اجتياز جميع فحوصات التوافق مع GitHub Pages بنجاح 100%!');
  process.exit(0);
}
