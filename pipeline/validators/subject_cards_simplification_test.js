/**
 * PHASE 5.1 — Subject Cards Simplification Validation Suite
 * 
 * يتحقق بدقة من:
 * 1. تبسيط بطاقات المواد السبع في الشاشة العامة
 * 2. الحفاظ فقط على: الأيقونة، اسم المادة، المعامل، عدد الدروس المحسوب ديناميكياً، وزر دخول المادة
 * 3. الحذف التام لتفاصيل الفيديوهات والتمارين والمراجعات والملخصات ودورات البكالوريا ووصف المادة من البطاقة العامة
 * 4. الحفاظ الصارم على 100% من بيانات الموارد وسجل Registry
 * 5. عمل دالة التحديث الديناميكي updateSubjectCardsDynamicData
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
console.log('  بدء فحص تبسيط بطاقات المواد (Phase 5.1 QA)');
console.log('====================================================');

// تحميل البيانات والمخزن المركزي
const sandbox = {
  window: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  document: {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = v; }
  },
  sessionStorage: {
    _d: {},
    getItem(k) { return this._d[k] || null; },
    setItem(k, v) { this._d[k] = v; }
  },
  console
};
sandbox.window = sandbox;
vm.createContext(sandbox);

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
  'app.js'
];

for (const f of dataFiles) {
  const code = fs.readFileSync(path.join(baseDir, f), 'utf-8');
  vm.runInContext(code, sandbox);
}

const store = sandbox.window.PlatformStore;
const registry = sandbox.window.PlatformRegistry;
const app = sandbox.window;

// 1. فحص وجود جميع المواد السبع ومطابقة المعاملات والدروس
console.log('\n--- 1. فحص بيانات المواد السبع والمعاملات والدروس الديناميكية ---');
const subjects = ['الفلسفة', 'العلوم الإسلامية', 'التاريخ والجغرافيا', 'اللغة الإنجليزية', 'اللغة الفرنسية', 'اللغة العربية', 'الرياضيات'];

subjects.forEach(subName => {
  const subj = store.getSubject(subName);
  const lessons = store.getLessons(subName);
  assert(subj !== undefined, `المادة (${subName}) مسجلة ومعرّفة في مخزن البيانات`);
  assert(typeof subj.coefficient === 'number' && subj.coefficient > 0, `معامل مادة (${subName}) محدد وصحيح: ${subj.coefficient}`);
  assert(lessons.length > 0, `عدد دروس (${subName}) ديناميكي ومتاح: ${lessons.length} درساً`);
});

// 2. فحص بنية البطاقات في index.html واستبعاد التفاصيل المحذوفة
console.log('\n--- 2. فحص بطاقات المواد في index.html وتنظيفها من الحشو ---');
const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');

// استخراج شبكة المواد من index.html
const gridStart = html.indexOf('id="screen-dashboard"');
const gridEnd = html.indexOf('id="screen-subject-detail"');
assert(gridStart !== -1 && gridEnd !== -1, 'شاشة لوحة التحكم screen-dashboard وشبكة المواد موجودتان');

const dashboardSection = html.slice(gridStart, gridEnd);

subjects.forEach(subName => {
  // التأكد من وجود البطاقة مع سمة data-subject وزر دخول المادة
  assert(dashboardSection.includes(`data-subject="${subName}"`), `بطاقة مادة (${subName}) تحمل السمة data-subject`);
  assert(dashboardSection.includes(`openSubjectDetail('${subName}')`), `بطاقة (${subName}) ترتبط بدالة الانتقال openSubjectDetail`);
  
  // استخراج المقطع الخاص بالبطاقة بدقة
  const cardRegex = new RegExp(`data-subject="${subName}"[\\s\\S]*?دخول المادة[\\s\\S]*?<\\/svg>\\s*<\\/span>\\s*<\\/div>\\s*<\\/div>`, 'u');
  const match = dashboardSection.match(cardRegex);
  assert(match !== null, `تم استخراج بطاقة (${subName}) بنجاح وبنيتها متكاملة`);

  const cardHtml = match ? match[0] : '';

  // التحقق من وجود العناصر الخمسة الإلزامية
  assert(cardHtml.includes('<svg'), `بطاقة (${subName}) تحتوي على الأيقونة الرسمية للمادة`);
  assert(cardHtml.includes(subName), `بطاقة (${subName}) تعرض اسم المادة بوضوح`);
  assert(cardHtml.includes(`data-subject-meta="${subName}"`), `بطاقة (${subName}) تحتوي على وسم البيانات الديناميكية data-subject-meta`);
  assert(cardHtml.includes('دخول المادة'), `بطاقة (${subName}) تحتوي على زر "دخول المادة"`);

  // التحقق من الحذف التام للتفاصيل غير المرغوبة من البطاقة العامة
  assert(!cardHtml.includes('فيديو') && !cardHtml.includes('فيديوهات'), `بطاقة (${subName}) لا تعرض عدد الفيديوهات`);
  assert(!cardHtml.includes('تمرين') && !cardHtml.includes('تمارين') && !cardHtml.includes('تمريناً'), `بطاقة (${subName}) لا تعرض عدد التمارين`);
  assert(!cardHtml.includes('مراجعة') && !cardHtml.includes('مراجعات'), `بطاقة (${subName}) لا تعرض عدد المراجعات`);
  assert(!cardHtml.includes('ملخص') && !cardHtml.includes('ملخصات') && !cardHtml.includes('ملخصاً'), `بطاقة (${subName}) لا تعرض عدد الملخصات`);
  assert(!cardHtml.includes('بكالوريا'), `بطاقة (${subName}) لا تعرض تفاصيل دورات البكالوريا في البطاقة العامة`);
});

// 3. فحص دالة التحديث الديناميكي updateSubjectCardsDynamicData
console.log('\n--- 3. فحص دالة التحديث الديناميكي updateSubjectCardsDynamicData ---');
assert(typeof app.updateSubjectCardsDynamicData === 'function', 'دالة updateSubjectCardsDynamicData معرّفة ومصدرة');
assert(typeof app.formatLessonCount === 'function', 'دالة formatLessonCount معرّفة للجموع العربية');

// اختبار formatLessonCount
assert(app.formatLessonCount(1) === 'درس واحد', 'تنسيق درس واحد سليم');
assert(app.formatLessonCount(2) === 'درسان', 'تنسيق درسان سليم');
assert(app.formatLessonCount(4) === '4 دروس', 'تنسيق 4 دروس سليم');
assert(app.formatLessonCount(13) === '13 درساً', 'تنسيق 13 درساً سليم');
assert(app.formatLessonCount(42) === '42 درساً', 'تنسيق 42 درساً سليم');

// 4. فحص سلامة سجل الموارد وعدم ضياع أي محتوى داخلي
console.log('\n--- 4. فحص سلامة سجل الموارد وعدم حذف أي محتوى تعليمي ---');
const totalResources = Object.keys(registry || {}).length;
assert(totalResources >= 580, `سجل الموارد PlatformRegistry كامل بنسبة 100% (${totalResources} مورداً)`);

const philoBac = store.getSubjectBac('الفلسفة');
assert(philoBac.length >= 10, `موارد البكالوريا لمادة الفلسفة محفوظة ومتاحة داخل المادة (${philoBac.length} دورات)`);

const philoSummaries = store.getSubjectSummaries('الفلسفة');
assert(philoSummaries.length >= 5, `الملخصات الوزارية محفوظة ومتاحة داخل المادة (${philoSummaries.length} ملخصات)`);

console.log('\n====================================================');
console.log(`  نتائج فحص تبسيط بطاقات المواد (Phase 5.1):`);
console.log(`  إجمالي الفحوصات الناجحة: ${passedTests}`);
console.log(`  إجمالي الفحوصات الفاشلة: ${totalTests - passedTests}`);
console.log('====================================================');

if (totalTests - passedTests > 0) {
  process.exit(1);
} else {
  console.log('\nتم اجتياز جميع اختبارات تبسيط بطاقات المواد بنجاح 100%!');
}
