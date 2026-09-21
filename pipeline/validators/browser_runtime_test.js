const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');

// عناصر وهمية لـ DOM
function createElementMock(id = '') {
  return {
    id,
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    textContent: '',
    innerHTML: '',
    value: '',
    href: '',
    src: '',
    style: {}
  };
}

const mockDom = {
  window: {},
  addEventListener: () => {},
  scrollTo: () => {},
  history: {
    pushState: () => {},
    replaceState: () => {}
  },
  document: {
    getElementById: (id) => createElementMock(id),
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
mockDom.window = mockDom;
vm.createContext(mockDom);

// تحميل الملفات
const files = [
  'data/store.js',
  'data/philosophy.js',
  'data/islamic.js',
  'data/history.js',
  'data/math.js',
  'data/arabic.js',
  'data/french.js',
  'data/english.js',
  'app.js'
];

for (const f of files) {
  const code = fs.readFileSync(path.join(baseDir, f), 'utf-8');
  vm.runInContext(code, mockDom);
}

console.log('Testing subject switching and rendering for all 7 subjects:');
const subjects = mockDom.window.PlatformStore.getAllSubjects();

for (const s of subjects) {
  console.log(`Testing: ${s.name}`);
  mockDom.window.openSubjectDetail(s.name);
  mockDom.window.renderLessons(s.name);

  const lessons = mockDom.window.PlatformStore.getLessons(s.name);
  if (lessons.length > 0) {
    const firstLesson = lessons[0].title;
    mockDom.window.renderChannelsVideos(firstLesson);
    mockDom.window.renderExercises(firstLesson);
  }

  // تجربة كل تبويبات الأقسام
  mockDom.window.openCategoryContent('فيديوهات المراجعة الشاملة');
  mockDom.window.openCategoryContent('الملخصات المعتمدة');
  mockDom.window.openCategoryContent('مواضيع البكالوريا الرسمية');
  mockDom.window.openCategoryContent('امتحانات وفروض الفصول');
}

console.log('ALL 7 SUBJECTS AND MODALS RENDERED WITH ZERO RUNTIME ERRORS!');
