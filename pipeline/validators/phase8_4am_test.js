/**
 * PHASE 8 — 4AM Full Data Ingestion & Cross-Level Isolation Test Suite
 * mordix_ai
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
  }
}

console.log('====================================================');
console.log('  بدء فحص تكامل بيانات الطور المتوسط (Phase 8 QA)');
console.log('====================================================');

// تهيئة بيئة المتصفح الافتراضية
const sandbox = {
  window: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  document: {
    getElementById: (id) => ({
      id,
      classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
      style: {},
      value: '',
      textContent: '',
      innerHTML: '',
      querySelectorAll: () => [],
      querySelector: () => null
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    clear() { this._d = {}; }
  },
  sessionStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
    clear() { this._d = {}; }
  },
  console
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// تحميل الملفات بالترتيب
const files = [
  'data/store.js',
  'data/philosophy.js',
  'data/islamic.js',
  'data/history.js',
  'data/math.js',
  'data/arabic.js',
  'data/french.js',
  'data/english.js',
  'data/registry.js',
  'data/four_am.js',
  'data/registry_4am.js',
  'app.js'
];

for (const f of files) {
  const code = fs.readFileSync(path.join(baseDir, f), 'utf-8');
  vm.runInContext(code, sandbox);
}

const store = sandbox.window.PlatformStore;
const data4am = sandbox.window.PlatformData4AM;
const registry4am = sandbox.window.PlatformRegistry4AM;
const registry3as = sandbox.window.PlatformRegistry;

// 1. فحص المنهاج والدروس الـ 145 لجميع المواد الـ 9
console.log('\n--- 1. فحص المنهاج الكامل (145 درساً عبر 9 مواد) ---');
assert(data4am && typeof data4am === 'object', 'PlatformData4AM معرّف بنجاح');

const expectedCounts = {
  'math_4am': { name: 'الرياضيات', count: 14 },
  'arabic_4am': { name: 'اللغة العربية', count: 28 },
  'french_4am': { name: 'اللغة الفرنسية', count: 9 },
  'english_4am': { name: 'اللغة الإنجليزية', count: 23 },
  'physics_4am': { name: 'العلوم الفيزيائية والتكنولوجيا', count: 16 },
  'science_4am': { name: 'علوم الطبيعة والحياة', count: 13 },
  'history_geography_4am': { name: 'التاريخ والجغرافيا', count: 17 },
  'islamic_4am': { name: 'التربية الإسلامية', count: 15 },
  'civics_4am': { name: 'التربية المدنية', count: 10 }
};

let totalLessonsCalc = 0;
for (const [key, exp] of Object.entries(expectedCounts)) {
  const subj = data4am[key];
  assert(subj !== undefined, `مادة [${exp.name}] موجودة في قاعدة بيانات 4AM`);
  assert(subj.lessons.length === exp.count, `مادة [${exp.name}] تحتوي على ${exp.count} درساً بالضبط (الفعلي: ${subj.lessons.length})`);
  
  const allHaveCanonical = subj.lessons.every(l => l.canonical_id && l.lessonId && l.title);
  assert(allHaveCanonical, `جميع دروس مادة [${exp.name}] تحمل canonical_id و lessonId و title`);
  
  totalLessonsCalc += subj.lessons.length;
}

assert(totalLessonsCalc === 145, `إجمالي دروس 4AM هو 145 درساً رسمياً بالضبط`);

// 2. فحص استعلامات PlatformStore لـ 4AM
console.log('\n--- 2. فحص استعلامات PlatformStore ومطابقة الدروس والموارد ---');

for (const [key, exp] of Object.entries(expectedCounts)) {
  const lessonsFromStore = store.getLessons(exp.name, '4am');
  assert(lessonsFromStore.length === exp.count, `store.getLessons("${exp.name}", "4am") يرجع ${exp.count} درساً`);

  const firstLesson = store.getLesson(exp.name, 1, '4am');
  assert(firstLesson && firstLesson.id === 1, `store.getLesson("${exp.name}", 1, "4am") يرجع الدرس الأول بنجاح`);

  const reviews = store.getSubjectReviews(exp.name, '4am');
  assert(Array.isArray(reviews) && reviews.length > 0, `store.getSubjectReviews("${exp.name}", "4am") متاح`);

  const summaries = store.getSubjectSummaries(exp.name, '4am');
  assert(Array.isArray(summaries) && summaries.length > 0, `store.getSubjectSummaries("${exp.name}", "4am") متاح`);

  const bac = store.getSubjectBac(exp.name, '4am');
  assert(Array.isArray(bac) && bac.length === 0, `store.getSubjectBac("${exp.name}", "4am") يرجع 0 (4AM يخضع لـ BEM فقط)`);
}

// 3. فحص سجل الموارد الموحد (Resource Registry) لـ 4AM
console.log('\n--- 3. فحص سجل الموارد الموحد وأقسام BEM والامتحانات والملخصات ---');

assert(registry4am && typeof registry4am === 'object', 'PlatformRegistry4AM معرّف بنجاح');
const total4amResources = Object.keys(registry4am).length;
assert(total4amResources >= 40, `سجل موارد 4AM يحتوي على 40 مورداً معتمداً على الأقل (الفعلي: ${total4amResources})`);

const all4amRes = store.getAllResources('4am');
assert(all4amRes.length >= 40, `store.getAllResources("4am") يرجع 40 مورداً على الأقل`);

// فحص كل مادة ومواردها
for (const [key, exp] of Object.entries(expectedCounts)) {
  const subjRes = store.getResourcesBySubject(exp.name, '4am');
  assert(subjRes.length >= 3, `مادة [${exp.name}] تحتوي على 3 موارد على الأقل (BEM + امتحانات + ملخصات/مراجعات)`);

  const bemRes = store.getResourcesByType(exp.name, 'bem', '4am');
  assert(bemRes.length === 1, `مادة [${exp.name}] لديها أرشيف BEM رسمي معتمد`);
  assert(bemRes[0].sourceUrl.includes('/ar/bem/'), `أرشيف BEM لمادة [${exp.name}] يوثق مصدر BEM الرسمي`);

  const examRes = store.getResourcesByType(exp.name, 'exam', '4am');
  assert(examRes.length >= 1, `مادة [${exp.name}] لديها نماذج امتحانات فصول موثقة`);

  const summaryRes = store.getResourcesByType(exp.name, 'summary', '4am');
  assert(summaryRes.length >= 1, `مادة [${exp.name}] لديها بنك ملخصات موثق`);

  const reviewRes = store.getResourcesByType(exp.name, 'review', '4am');
  assert(reviewRes.length >= 1, `مادة [${exp.name}] لديها باقة مراجعة نهائية موثقة`);
}

// 4. فحص العزل الصارم بين 3AS و 4AM
console.log('\n--- 4. فحص العزل الصارم التام بين 3AS و 4AM ---');

// لا توجد موارد BEM في 3AS
const bacResourcesIn3AS = store.getAllResources('3as');
const bemIn3AS = bacResourcesIn3AS.filter(r => r.type === 'bem' || r.levelId === '4am');
assert(bemIn3AS.length === 0, `صفر موارد 4AM أو BEM متسربة داخل الطور الثانوي (3AS)`);

// لا توجد موارد BAC في 4AM
const bacIn4AM = all4amRes.filter(r => r.type === 'bac' || r.levelId === '3as');
assert(bacIn4AM.length === 0, `صفر موارد 3AS أو BAC متسربة داخل الطور المتوسط (4AM)`);

// فحص الرياضيات في الطورين
const math4amRes = store.getResourcesBySubject('الرياضيات', '4am');
const math3asRes = store.getResourcesBySubject('الرياضيات', '3as');
assert(math4amRes.every(r => r.levelId === '4am'), `جميع موارد رياضيات 4AM تنتمي لـ 4am فقط`);
assert(math3asRes.every(r => r.levelId === '3as' || !r.levelId), `جميع موارد رياضيات 3AS تنتمي لـ 3as فقط`);

// 5. فحص سلامة وثبات بيانات 3AS (READ-ONLY Verification)
console.log('\n--- 5. فحص سلامة وثبات بيانات 3AS (READ-ONLY Verification) ---');

const philoSubj = store.getSubject('الفلسفة', '3as');
assert(philoSubj && philoSubj.lessons.length === 13, 'مادة الفلسفة (3AS) سليمة وتحتفظ بـ 13 درساً');

const math3asSubj = store.getSubject('الرياضيات', '3as');
assert(math3asSubj && math3asSubj.lessons.length === 4, 'مادة الرياضيات (3AS) سليمة وتحتفظ بـ 4 دروس');

const arabic3asSubj = store.getSubject('اللغة العربية', '3as');
assert(arabic3asSubj && arabic3asSubj.lessons.length === 42, 'مادة اللغة العربية (3AS) سليمة وتحتفظ بـ 42 درساً');

const islamic3asSubj = store.getSubject('العلوم الإسلامية', '3as');
assert(islamic3asSubj && islamic3asSubj.lessons.length === 15, 'مادة العلوم الإسلامية (3AS) سليمة وتحتفظ بـ 15 درساً');

const history3asSubj = store.getSubject('التاريخ والجغرافيا', '3as');
assert(history3asSubj && history3asSubj.lessons.length === 19, 'مادة التاريخ والجغرافيا (3AS) سليمة وتحتفظ بـ 19 درساً');

const french3asSubj = store.getSubject('اللغة الفرنسية', '3as');
assert(french3asSubj && french3asSubj.lessons.length === 17, 'مادة اللغة الفرنسية (3AS) سليمة وتحتفظ بـ 17 درساً');

const english3asSubj = store.getSubject('اللغة الإنجليزية', '3as');
assert(english3asSubj && english3asSubj.lessons.length === 27, 'مادة اللغة الإنجليزية (3AS) سليمة وتحتفظ بـ 27 درساً');

// 6. فحص خلو المنصة من الرموز التعبيرية في ملفات البيانات
console.log('\n--- 6. فحص خلو ملفات 4AM من أي إيموجي (Zero Emojis) ---');
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/u;

const fourAmContent = fs.readFileSync(path.join(baseDir, 'data/four_am.js'), 'utf8');
const reg4amContent = fs.readFileSync(path.join(baseDir, 'data/registry_4am.js'), 'utf8');

assert(!emojiRegex.test(fourAmContent), 'ملف data/four_am.js خالٍ تماماً من الإيموجي');
assert(!emojiRegex.test(reg4amContent), 'ملف data/registry_4am.js خالٍ تماماً من الإيموجي');

console.log('\n====================================================');
console.log(`  نتائج فحص تكامل بيانات الرابعة متوسط (Phase 8):`);
console.log(`  إجمالي الفحوصات: ${totalTests}`);
console.log(`  الناجحة: ${passedTests}`);
console.log(`  الفاشلة: ${totalTests - passedTests}`);
console.log('====================================================');

if (totalTests === passedTests) {
  console.log('تم اجتياز جميع اختبارات المرحلة الثامنة بنجاح 100%!');
  process.exit(0);
} else {
  console.error('فشل في بعض اختبارات المرحلة الثامنة');
  process.exit(1);
}
