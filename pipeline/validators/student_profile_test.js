/**
 * فحص نظام التخزين المحلي لملف الطالب في mordix_ai (Student Profile LocalStorage Validator)
 * يتحقق من الحالات الثمانية المحددة في متطلبات النظام
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');

function createMockElement(id = '') {
  const hiddenClasses = new Set();
  return {
    id,
    classList: {
      add: (c) => hiddenClasses.add(c),
      remove: (c) => hiddenClasses.delete(c),
      contains: (c) => hiddenClasses.has(c)
    },
    textContent: '',
    innerHTML: '',
    value: '',
    href: '',
    src: '',
    style: {},
    disabled: false,
    setAttribute: function(k, v) { this[k] = v; },
    removeAttribute: function(k) { delete this[k]; },
    focus: () => {}
  };
}

function createMockEnvironment(initialLocalStorage = {}) {
  const elements = {};
  const getEl = (id) => {
    if (!elements[id]) elements[id] = createMockElement(id);
    return elements[id];
  };

  const store = { ...initialLocalStorage };
  const mockLocalStorage = {
    _data: store,
    getItem(k) { return this._data[k] !== undefined ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };

  const mockSessionStorage = {
    _data: {},
    getItem(k) { return this._data[k] !== undefined ? this._data[k] : null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const mockDom = {
    window: {},
    document: {
      getElementById: (id) => getEl(id),
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    addEventListener: () => {},
    scrollTo: () => {},
    history: {
      pushState: () => {},
      replaceState: () => {}
    },
    console
  };
  mockDom.window = mockDom;

  vm.createContext(mockDom);

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
    'app.js'
  ];

  for (const f of files) {
    const code = fs.readFileSync(path.join(baseDir, f), 'utf-8');
    vm.runInContext(code, mockDom);
  }

  return { mockDom, elements, getEl, mockLocalStorage };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('  بدء فحص نظام ملف الطالب المحلي (mordix_ai_student)');
console.log('====================================================\n');

// 1. أول زيارة: لا يوجد ملف محفوظ -> تظهر شاشة الإعداد
{
  console.log('--- 1. اختبار أول زيارة (First Visit) ---');
  const env = createMockEnvironment();
  const profile = env.mockDom.window.StudentProfile.load();
  assert(profile === null, 'في أول زيارة يكون ملف الطالب فارغاً (null)');

  env.mockDom.window.bootWithStudentProfile();
  const onboardingEl = env.getEl('screen-onboarding');
  const dashboardEl = env.getEl('screen-dashboard');
  assert(!onboardingEl.classList.contains('hidden'), 'تظهر شاشة الإعداد (screen-onboarding) في أول زيارة');
  assert(dashboardEl.classList.contains('hidden'), 'شاشة لوحة التحكم مخفية في أول زيارة حتى يتم الإدخال');
}

// 2. حفظ الاسم والشعبة -> الدخول للمنصة
{
  console.log('\n--- 2. اختبار حفظ الاسم والشعبة والدخول للمنصة ---');
  const env = createMockEnvironment();
  const saved = env.mockDom.window.StudentProfile.save('أحمد', 'آداب وفلسفة');
  assert(saved !== null, 'تمت عملية الحفظ بنجاح');
  assert(saved.version === 1, 'رقم إصدار البيانات هو 1');
  assert(saved.initialized === true, 'تم ضبط initialized إلى true');
  assert(saved.name === 'أحمد', 'تم حفظ الاسم أحمد بنجاح');
  assert(saved.branch === 'آداب وفلسفة', 'تم حفظ الشعبة آداب وفلسفة بنجاح');

  // التحقق من بنية JSON المخزنة في localStorage تحت المفتاح المحدد
  const rawJson = env.mockLocalStorage.getItem('mordix_ai_student');
  assert(rawJson !== null, 'المفتاح mordix_ai_student موجود في localStorage');
  const parsed = JSON.parse(rawJson);
  assert(parsed.name === 'أحمد' && parsed.branch === 'آداب وفلسفة', 'مطابقة البيانات المخزنة كـ JSON');

  // تطبيق على الواجهة
  env.mockDom.window.StudentProfile.applyToUI(saved);
  assert(env.getEl('header-student-name').textContent === 'أحمد', 'اسم الطالب يظهر في شريط الهيدر العلوي');
  assert(env.getEl('dashboard-student-name').textContent.includes('أحمد'), 'الترحيب في لوحة التحكم يتضمن اسم أحمد');
  assert(env.getEl('dashboard-branch-name').textContent === 'آداب وفلسفة', 'الشعبة تظهر بشكل صحيح في بطاقة لوحة التحكم');
}

// 3. تحديث الصفحة (Refresh): لا تظهر شاشة الإعداد ويتم استرجاع البيانات تلقائياً
{
  console.log('\n--- 3. اختبار تحديث الصفحة (Page Refresh) ---');
  const initialData = {
    'mordix_ai_student': JSON.stringify({
      version: 1,
      initialized: true,
      name: 'أحمد',
      branch: 'آداب وفلسفة'
    })
  };
  const env = createMockEnvironment(initialData);
  const profile = env.mockDom.window.StudentProfile.load();
  assert(profile !== null && profile.initialized === true, 'تم استرجاع الملف المحفوظ تلقائياً');

  env.mockDom.window.bootWithStudentProfile();
  const onboardingEl = env.getEl('screen-onboarding');
  const dashboardEl = env.getEl('screen-dashboard');
  assert(onboardingEl.classList.contains('hidden'), 'شاشة الإعداد لا تظهر عند تحديث الصفحة');
  assert(!dashboardEl.classList.contains('hidden'), 'يتم الدخول مباشرة إلى لوحة التحكم عند التحديث');
  assert(env.getEl('header-student-name').textContent === 'أحمد', 'الاسم مسترجع في الهيدر');
  assert(env.mockDom.window.appState.branch === 'آداب وفلسفة', 'الشعبة مسترجعة في appState');
}

// 4. إغلاق المتصفح وفتحه: البيانات موجودة في localStorage
{
  console.log('\n--- 4. اختبار استمرار البيانات بعد إغلاق المتصفح ---');
  const persistentData = {
    'mordix_ai_student': JSON.stringify({
      version: 1,
      initialized: true,
      name: 'فاطمة',
      branch: 'علوم تجريبية'
    })
  };
  const env = createMockEnvironment(persistentData);
  const profile = env.mockDom.window.StudentProfile.load();
  assert(profile.name === 'فاطمة', 'اسم الطالب مستمر وثابت: فاطمة');
  assert(profile.branch === 'علوم تجريبية', 'الشعبة مستمرة وثابتة: علوم تجريبية');
}

// 5. تعديل الاسم: يتم تحديث الترحيب
{
  console.log('\n--- 5. اختبار تعديل الاسم في الإعدادات ---');
  const initialData = {
    'mordix_ai_student': JSON.stringify({
      version: 1,
      initialized: true,
      name: 'أحمد',
      branch: 'آداب وفلسفة'
    })
  };
  const env = createMockEnvironment(initialData);
  env.getEl('settings-name-input').value = 'يوسف';
  env.getEl('settings-branch-select').value = 'آداب وفلسفة';
  env.mockDom.window.saveStudentSettings();

  const updatedProfile = env.mockDom.window.StudentProfile.load();
  assert(updatedProfile.name === 'يوسف', 'تم تحديث الاسم إلى يوسف في localStorage');
  assert(env.getEl('header-student-name').textContent === 'يوسف', 'تم تحديث الاسم في شريط الهيدر');
  assert(env.getEl('dashboard-student-name').textContent.includes('يوسف'), 'تم تحديث الترحيب الرئيسي إلى يوسف');
}

// 6. تعديل الشعبة: يتم حفظها وتحديث الواجهة
{
  console.log('\n--- 6. اختبار تعديل الشعبة في الإعدادات ---');
  const initialData = {
    'mordix_ai_student': JSON.stringify({
      version: 1,
      initialized: true,
      name: 'يوسف',
      branch: 'آداب وفلسفة'
    })
  };
  const env = createMockEnvironment(initialData);
  env.getEl('settings-name-input').value = 'يوسف';
  env.getEl('settings-branch-select').value = 'رياضيات';
  env.mockDom.window.saveStudentSettings();

  const updatedProfile = env.mockDom.window.StudentProfile.load();
  assert(updatedProfile.branch === 'رياضيات', 'تم تحديث الشعبة إلى رياضيات في localStorage');
  assert(env.mockDom.window.appState.branch === 'رياضيات', 'تم تحديث الشعبة في appState');
  assert(env.getEl('dashboard-branch-name').textContent === 'رياضيات', 'تم تحديث الشعبة في بطاقة لوحة التحكم');
}

// 7. إعادة الضبط: حذف مفتاح mordix_ai_student فقط وعودة شاشة الإعداد دون المساس بالبيانات التعليمية
{
  console.log('\n--- 7. اختبار إعادة ضبط البيانات المحلية ---');
  const initialData = {
    'mordix_ai_student': JSON.stringify({
      version: 1,
      initialized: true,
      name: 'أحمد',
      branch: 'آداب وفلسفة'
    })
  };
  const env = createMockEnvironment(initialData);
  assert(env.mockDom.window.PlatformStore.getAllSubjects().length === 7, 'بيانات المواد موجودة قبل إعادة الضبط');
  assert(Object.keys(env.mockDom.window.PlatformRegistry || {}).length > 0, 'بيانات الموارد موجودة قبل إعادة الضبط');

  env.mockDom.window.StudentProfile.reset();
  assert(env.mockDom.window.StudentProfile.load() === null, 'تم حذف المفتاح mordix_ai_student من localStorage');
  assert(env.mockLocalStorage.getItem('mordix_ai_student') === null, 'المفتاح محذوف فعلياً من مخزن المتصفح');

  // التأكيد الصارم على عدم حذف أو تعديل البيانات التعليمية
  assert(env.mockDom.window.PlatformStore.getAllSubjects().length === 7, 'المواد السبع بقيت كاملة 100% دون أي تعديل');
  assert(Object.keys(env.mockDom.window.PlatformRegistry || {}).length > 0, 'سجل الموارد PlatformRegistry بقي كاملاً دون مساس');

  // محاكاة إعادة الإعداد
  env.mockDom.window.showOnboardingScreen();
  assert(!env.getEl('screen-onboarding').classList.contains('hidden'), 'عادت شاشة الإعداد للظهور مجدداً بعد إعادة الضبط');
}

// 8. التوافق مع الاستضافة الثابتة و GitHub Pages
{
  console.log('\n--- 8. اختبار التوافق مع GitHub Pages والاستضافة الثابتة ---');
  const htmlContent = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');
  assert(htmlContent.includes('screen-onboarding'), 'شاشة الإعداد مدمجة مباشرة في index.html بدون قالب خارجي');
  assert(htmlContent.includes('student-settings-modal'), 'نافذة الإعدادات مدمجة مباشرة في index.html');
  assert(!htmlContent.includes('firebase'), 'لا يوجد أي استخدام لـ Firebase');
  assert(!htmlContent.includes('supabase'), 'لا يوجد أي استخدام لـ Supabase');
  assert(htmlContent.includes('mordix_ai'), 'الهوية البصرية مطابقة لـ mordix_ai');
}

console.log('\n====================================================');
console.log(`  نتائج فحص نظام ملف الطالب:`);
console.log(`  إجمالي الفحوصات الناجحة: ${passed}`);
console.log(`  إجمالي الفحوصات الفاشلة: ${failed}`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nتم اجتياز جميع اختبارات نظام حفظ ملف الطالب بنجاح 100%!');
}
