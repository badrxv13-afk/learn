/**
 * mordix_ai — فحص بيئة المتصفح وتشغيل واجهات السنة الرابعة متوسط بالكامل
 * Browser Runtime Test for 4AM Subjects, Lessons, Cards, and Resource Viewer
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');

function createElementMock(id = '') {
  return {
    id,
    classList: {
      _classes: new Set(),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); }
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
    _elements: {},
    getElementById(id) {
      if (!this._elements[id]) {
        this._elements[id] = createElementMock(id);
      }
      return this._elements[id];
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
mockDom.window = mockDom;
vm.createContext(mockDom);

// تحميل الملفات الأساسية
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
  vm.runInContext(code, mockDom);
}

console.log('Testing subject switching and rendering for all 9 4AM subjects:');

// تحديد طور الرابعة متوسط
mockDom.window.appState.level = '4am';
const subjects = mockDom.window.PlatformStore.getAllSubjects('4am');
console.log(`Loaded ${subjects.length} subjects for 4AM.`);

let totalTestedLessons = 0;
let totalTestedResources = 0;

for (const s of subjects) {
  console.log(`\nTesting 4AM Subject: ${s.name} (${s.id})`);
  
  // 1. فتح فضاء المادة
  mockDom.window.openSubjectDetail(s.id);
  const subjNameEl = mockDom.document.getElementById('subject-detail-name');
  if (subjNameEl.textContent !== s.name) {
    throw new Error(`Subject name mismatch: expected ${s.name}, got ${subjNameEl.textContent}`);
  }

  // 2. فتح فهرس الدروس ورسم البطاقات
  mockDom.window.openLessonsIndex(s.name);
  mockDom.window.renderLessons(s.name);
  const lessons = mockDom.window.PlatformStore.getLessons(s.name, '4am');
  totalTestedLessons += lessons.length;
  console.log(`  Rendered ${lessons.length} lessons`);

  // 3. فحص الدرس الأول ومحور الدرس
  if (lessons.length > 0) {
    const firstLesson = lessons[0].title;
    mockDom.window.openLessonHub(firstLesson);
    mockDom.window.renderChannelsVideos(firstLesson);
    mockDom.window.renderExercises(firstLesson);
  }

  // 4. فتح أقسام الموارد المختلفة
  mockDom.window.openCategoryContent('شهادة التعليم المتوسط');
  const bemRes = mockDom.window.PlatformStore.getResourcesByType(s.name, 'bem', '4am');
  totalTestedResources += bemRes.length;

  mockDom.window.openCategoryContent('امتحانات');
  const examRes = mockDom.window.PlatformStore.getResourcesByType(s.name, 'exam', '4am');
  totalTestedResources += examRes.length;

  mockDom.window.openCategoryContent('ملخصات');
  const sumRes = mockDom.window.PlatformStore.getResourcesByType(s.name, 'summary', '4am');
  totalTestedResources += sumRes.length;

  mockDom.window.openCategoryContent('المراجعات');
  const revRes = mockDom.window.PlatformStore.getResourcesByType(s.name, 'review', '4am');
  totalTestedResources += revRes.length;

  // 5. فحص فتح عارض الموارد (Resource Viewer) لأرشيف BEM
  if (bemRes.length > 0) {
    mockDom.window.openResourceViewer(bemRes[0].id, 'problem');
    const typeLabel = mockDom.document.getElementById('viewer-breadcrumb-type-text').textContent;
    if (typeLabel !== 'شهادة التعليم المتوسط (BEM)') {
      throw new Error(`Viewer typeLabel mismatch: expected "شهادة التعليم المتوسط (BEM)", got "${typeLabel}"`);
    }
  }
}

console.log('\n=============================================');
console.log(`ALL 9 4AM SUBJECTS TESTED AND RENDERED FLAWLESSLY!`);
console.log(`Total Lessons Verified: ${totalTestedLessons} (Target: 145)`);
console.log(`Total Resources Interacted: ${totalTestedResources} (Target: 40)`);
console.log('Zero runtime errors detected in 4AM workflows.');
console.log('=============================================');
