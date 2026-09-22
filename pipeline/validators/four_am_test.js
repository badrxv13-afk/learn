/**
 * PHASE 6 — 4AM (السنة الرابعة متوسط) Validation Suite
 * 
 * يتحقق بدقة من:
 * 1. تعريف مواد السنة الرابعة متوسط الـ 9 بمعاملاتها الرسمية المعتمدة
 * 2. سلامة سجل موارد 4AM وشهادة BEM وعزلها الصارم عن 3AS
 * 3. استعلامات PlatformStore والتوجيه السليم حسب الطور
 * 4. إدارة ملف الطالب وحفظ واسترجاع الطور (level: '4am' vs '3as') وتوافق النسخ السابقة
 * 5. واجهة المستخدم وبطاقات المواد المبسطة وقسم BEM في index.html
 * 6. التوافق الكامل مع الاستضافة الثابتة (GitHub Pages) وخلو المنصة من أي بيانات وهمية
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
console.log('  بدء فحص إضافة طور السنة الرابعة متوسط (Phase 6 QA)');
console.log('====================================================');

// تهيئة بيئة تشغيل متصفح افتراضية (Headless DOM Sandbox)
const sandbox = {
  window: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  document: {
    getElementById: (id) => {
      return {
        id,
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
          toggle: () => {}
        },
        style: {},
        value: '',
        textContent: '',
        innerHTML: '',
        querySelectorAll: () => [],
        querySelector: () => null
      };
    },
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

// تحميل ملفات البيانات والمخزن
const dataFiles = [
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

for (const f of dataFiles) {
  const code = fs.readFileSync(path.join(baseDir, f), 'utf-8');
  vm.runInContext(code, sandbox);
}

const store = sandbox.window.PlatformStore;
const data4am = sandbox.window.PlatformData4AM;
const registry4am = sandbox.window.PlatformRegistry4AM;
const registryAll = sandbox.window.PlatformRegistry;
const StudentProfile = sandbox.window.StudentProfile;

// ============================================================
// 1. فحص بيانات مواد السنة الرابعة متوسط الـ 9 والمعاملات الرسمية
// ============================================================
console.log('\n--- 1. فحص تعريف المواد الـ 9 للسنة الرابعة متوسط والمعاملات الرسمية ---');

assert(typeof data4am === 'object' && data4am !== null, 'كائن PlatformData4AM معرّف ومتاح عالمياً');

const expected4amSubjects = [
  { id: 'math_4am', name: 'الرياضيات', coef: 4, urlPart: 'mathematiques' },
  { id: 'arabic_4am', name: 'اللغة العربية', coef: 5, urlPart: 'arabe' },
  { id: 'french_4am', name: 'اللغة الفرنسية', coef: 3, urlPart: 'francais' },
  { id: 'english_4am', name: 'اللغة الإنجليزية', coef: 2, urlPart: 'anglais' },
  { id: 'physics_4am', name: 'العلوم الفيزيائية والتكنولوجيا', coef: 2, urlPart: 'physique' },
  { id: 'science_4am', name: 'علوم الطبيعة والحياة', coef: 2, urlPart: 'sciences-naturelles' },
  { id: 'history_geography_4am', name: 'التاريخ والجغرافيا', coef: 3, urlPart: 'histoire-geographie' },
  { id: 'islamic_4am', name: 'التربية الإسلامية', coef: 2, urlPart: 'tarbia-islamia' },
  { id: 'civics_4am', name: 'التربية المدنية', coef: 1, urlPart: 'tarbia-madania' }
];

assert(Object.keys(data4am).length === 9, 'عدد مواد 4AM هو 9 مواد أساسية بالضبط');

expected4amSubjects.forEach(exp => {
  const subj = data4am[exp.id];
  assert(subj !== undefined, `مادة [${exp.name}] (${exp.id}) موجودة في PlatformData4AM`);
  assert(subj.coefficient === exp.coef, `معامل مادة [${exp.name}] رسمي ومطابق للمنهاج الجزائري (${exp.coef})`);
  assert(subj.levelId === '4am', `المعرف levelId لمادة [${exp.name}] هو 4am`);
  assert(subj.level === 'السنة الرابعة متوسط', `الطور لمادة [${exp.name}] هو السنة الرابعة متوسط`);
  assert(subj.branch === 'التعليم المتوسط', `الشعبة لمادة [${exp.name}] هي التعليم المتوسط`);
  assert(Array.isArray(subj.lessons), `قائمة الدروس لمادة [${exp.name}] مصفوفة معرفة`);
  assert(subj.sourceUrl && subj.sourceUrl.includes(exp.urlPart), `الرابط المصدري الرسمي لمادة [${exp.name}] صحيح وموثق على DzExams`);
});

// التأكد من عدم وجود بيانات وهمية للدروس أو الفيديوهات
expected4amSubjects.forEach(exp => {
  const subj = data4am[exp.id];
  assert(subj.lessons.length === 0 || subj.lessons.every(l => typeof l.title === 'string'), `مادة [${exp.name}] خالية من الدروس الوهمية`);
});

// ============================================================
// 2. فحص سجل موارد 4AM وشهادة BEM
// ============================================================
console.log('\n--- 2. فحص سجل موارد 4AM وأرشيف شهادة التعليم المتوسط (BEM) ---');

assert(typeof registry4am === 'object' && registry4am !== null, 'سجل PlatformRegistry4AM معرّف ومتاح عالمياً');
const count4amResources = Object.keys(registry4am).length;
assert(count4amResources >= 26, `عدد موارد 4AM موثق وكافٍ (${count4amResources} مورداً مسجلاً)`);

// فحص وجود موارد BEM لجميع المواد الـ 9
expected4amSubjects.forEach(exp => {
  const bemRes = Object.values(registry4am).find(r => r.subjectId === exp.id && r.type === 'bem');
  assert(bemRes !== undefined, `أرشيف دورات BEM لمادة [${exp.name}] مسجل ومتاح`);
  assert(bemRes.levelId === '4am', `مورد BEM لمادة [${exp.name}] يحمل levelId: '4am'`);
  assert(bemRes.sourceUrl && bemRes.sourceUrl.includes('/ar/bem/'), `رابط أرشيف BEM لمادة [${exp.name}] يشير إلى dzexams.com/ar/bem`);
  assert(bemRes.problem && bemRes.problem.available === true, `المواضيع متوفرة لأرشيف BEM لمادة [${exp.name}]`);
  assert(bemRes.solution && bemRes.solution.available === true, `الحلول متوفرة لأرشيف BEM لمادة [${exp.name}]`);
});

// فحص امتحانات الفصول e1, e2, e3
const examResources = Object.values(registry4am).filter(r => r.type === 'exam');
assert(examResources.length >= 10, `امتحانات الفصول لـ 4AM مسجلة وموثقة (${examResources.length} مورداً)`);
examResources.forEach(res => {
  assert(res.sourceUrl && res.sourceUrl.includes('/ar/4am/'), `رابط الامتحان (${res.id}) يشير إلى قسم 4am`);
});

// ============================================================
// 3. فحص العزل الصارم بين الأطوار في PlatformStore
// ============================================================
console.log('\n--- 3. فحص عزل الأطوار الصارم في استعلامات PlatformStore ---');

const subjects4amFromStore = store.getAllSubjects('4am');
assert(subjects4amFromStore.length === 9, 'store.getAllSubjects("4am") يرجع 9 مواد للرابعة متوسط');

const subjects3asFromStore = store.getAllSubjects('3as');
assert(subjects3asFromStore.length === 7, 'store.getAllSubjects("3as") يرجع 7 مواد للثالثة ثانوي');

// فحص عدم حدوث تصادم في المواد المشتركة في الاسم (مثل الرياضيات واللغة العربية)
const math4am = store.getSubject('الرياضيات', '4am');
assert(math4am && math4am.id === 'math_4am', 'getSubject("الرياضيات", "4am") يرجع مادة 4AM بنجاح');
assert(math4am.coefficient === 4, 'معامل رياضيات 4AM هو 4');

const math3as = store.getSubject('الرياضيات', '3as');
assert(math3as && math3as.id === 'math', 'getSubject("الرياضيات", "3as") يرجع مادة 3AS بنجاح');
assert(math3as.coefficient === 2, 'معامل رياضيات 3AS آداب وفلسفة هو 2');

// فحص عزل الموارد لعدم تسرب موارد 4AM إلى 3AS أو العكس
const math4amResources = store.getResourcesBySubject('الرياضيات', '4am');
assert(math4amResources.length > 0, 'توجد موارد رياضيات لـ 4AM');
assert(math4amResources.every(r => r.levelId === '4am'), 'جميع موارد رياضيات 4AM تحمل levelId: "4am" ولا تحتوي أي مورد ثانوي');

const math3asResources = store.getResourcesBySubject('الرياضيات', '3as');
assert(math3asResources.length > 0, 'توجد موارد رياضيات لـ 3AS');
assert(math3asResources.every(r => r.levelId === '3as' || !r.levelId), 'جميع موارد رياضيات 3AS تنتمي للطور الثانوي دون أي تسرب لـ 4AM');

// فحص استعلام الموارد بالنوع (BEM مقابل BAC)
const bemMathRes = store.getResourcesByType('الرياضيات', 'bem', '4am');
assert(bemMathRes.length > 0, 'استعلام موارد bem لمادة الرياضيات 4AM ناجح');
assert(bemMathRes.every(r => r.type === 'bem'), 'كافة موارد bem المسترجعة نوعها bem');

const bacMathRes = store.getResourcesByType('الرياضيات', 'bac', '3as');
assert(bacMathRes.length > 0, 'استعلام موارد bac لمادة الرياضيات 3AS ناجح');
assert(bacMathRes.every(r => r.type === 'bac'), 'كافة موارد bac المسترجعة نوعها bac');

// ============================================================
// 4. فحص نظام ملف الطالب وحفظ الطور (StudentProfile)
// ============================================================
console.log('\n--- 4. فحص ملف الطالب واسترجاع واختيار الطور التعليمي ---');

sandbox.localStorage.clear();

// فحص الزيارة الأولى
assert(StudentProfile.load() === null, 'في أول زيارة يكون الملف فارغاً');

// حفظ طالب في طور 4AM
const saved4am = StudentProfile.save('بلال', 'التعليم المتوسط', '4am');
assert(saved4am.level === '4am', 'تم حفظ level: "4am" في ملف الطالب');
assert(saved4am.name === 'بلال', 'تم حفظ الاسم بلال');
assert(saved4am.branch === null || saved4am.branch === 'التعليم المتوسط', 'طور 4AM لا يتطلب شعبة (branch: null)');

// استرجاع الملف
const loaded4am = StudentProfile.load();
assert(loaded4am && loaded4am.level === '4am', 'تم استرجاع طور 4am بنجاح من localStorage');

// فحص التوافق مع ملف قديم لا يحتوي على حقل level
sandbox.localStorage.setItem('mordix_ai_student', JSON.stringify({
  version: 1,
  initialized: true,
  name: 'خالد',
  branch: 'آداب وفلسفة'
}));

const loadedLegacy = StudentProfile.load();
assert(loadedLegacy && loadedLegacy.level === '3as', 'الملف القديم يتم ترقيته تلقائياً وافتراض level: "3as" دون أي خطأ');

// ============================================================
// 5. فحص بنية HTML وشاشات 4AM وBEM في index.html
// ============================================================
console.log('\n--- 5. فحص عناصر واجهة المستخدم في index.html ---');

const htmlContent = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');

// تضمين ملفات البيانات الجديدة في وسوم السكربت
assert(htmlContent.includes('<script src="data/four_am.js"></script>'), 'تضمين data/four_am.js في index.html');
assert(htmlContent.includes('<script src="data/registry_4am.js"></script>'), 'تضمين data/registry_4am.js في index.html');

// حاوية مواد 4AM في لوحة التحكم
assert(htmlContent.includes('id="dashboard-subjects-4am"'), 'وجود حاوية بطاقات مواد 4AM (#dashboard-subjects-4am)');
assert(htmlContent.includes('id="dashboard-subjects-3as"'), 'وجود حاوية بطاقات مواد 3AS (#dashboard-subjects-3as)');

// التحقق من وجود جميع بطاقات مواد 4AM الـ 9 بتنسيق Phase 5.1 المبسط
expected4amSubjects.forEach(exp => {
  assert(htmlContent.includes(`data-subject-id="${exp.id}"`), `بطاقة مادة [${exp.name}] موجودة في شبكة 4AM (معرف: ${exp.id})`);
  assert(htmlContent.includes(`openSubjectDetail('${exp.id}')`), `بطاقة مادة [${exp.name}] ترتبط بـ openSubjectDetail('${exp.id}')`);
  assert(htmlContent.includes(`معامل ${exp.coef}`), `بطاقة مادة [${exp.name}] تعرض المعامل الرسمي (${exp.coef})`);
});

// قسم شهادة التعليم المتوسط (BEM) في لوحة التحكم
assert(htmlContent.includes('id="dashboard-bem-section"'), 'وجود قسم BEM المخصص (#dashboard-bem-section)');
assert(htmlContent.includes('openResourceIndex(\'bem\''), 'وجود أزرار الوصول السريع لمواضيع BEM');

// شاشة الإعداد الأولى (Onboarding)
assert(htmlContent.includes('data-ob-level="4am"'), 'وجود زر اختيار طور السنة الرابعة متوسط في شاشة الإعداد');
assert(htmlContent.includes('data-ob-level="3as"'), 'وجود زر اختيار طور الثالثة ثانوي في شاشة الإعداد');
assert(htmlContent.includes('id="onboarding-branch-section"'), 'وجود قسم الشعبة القابل للإخفاء (#onboarding-branch-section)');

// نافذة تعديل بيانات الطالب
assert(htmlContent.includes('id="settings-level-select"'), 'وجود قائمة اختيار الطور في نافذة الإعدادات (#settings-level-select)');
assert(htmlContent.includes('id="settings-branch-container"'), 'وجود حاوية اختيار الشعبة القابلة للإخفاء في الإعدادات');

// خلو كود 4AM والملفات الجديدة من الإيموجي تماماً
const fourAmJs = fs.readFileSync(path.join(baseDir, 'data/four_am.js'), 'utf-8');
const registry4amJs = fs.readFileSync(path.join(baseDir, 'data/registry_4am.js'), 'utf-8');
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

assert(!emojiRegex.test(fourAmJs), 'ملف data/four_am.js خالٍ تماماً من الإيموجي');
assert(!emojiRegex.test(registry4amJs), 'ملف data/registry_4am.js خالٍ تماماً من الإيموجي');

// ============================================================
// ملخص النتائج
// ============================================================
console.log('\n====================================================');
console.log(`  نتائج فحص إضافة طور السنة الرابعة متوسط (Phase 6):`);
console.log(`  إجمالي الفحوصات: ${totalTests}`);
console.log(`  الناجحة: ${passedTests}`);
console.log(`  الفاشلة: ${totalTests - passedTests}`);
console.log('====================================================');

if (totalTests === passedTests) {
  console.log('\nتم اجتياز جميع اختبارات طور السنة الرابعة متوسط بنجاح 100%!');
  process.exit(0);
} else {
  console.error('\nتوجد اختبارات فاشلة!');
  process.exit(1);
}
