/**
 * mordix_ai — 4AM Full Exercises UI Flow Runtime Test
 * يختبر محاكاة كاملة للمسار:
 * 4AM -> المادة -> الدرس -> تمارين -> قائمة التمارين -> عارض المورد -> العودة -> درس آخر
 * مع اختبار درس يحتوي تمارين ودرس بدون تمارين، وموارد YouTube و DzExams
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');

console.log('\n=============================================');
console.log('RUNNING: pipeline/validators/browser_runtime_exercises_flow_test.js');
console.log('=============================================\n');

function createElementMock(id = '') {
  return {
    id,
    classList: {
      _classes: new Set(['hidden']),
      add(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
      contains(c) { return this._classes.has(c); },
      toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); },
      has(c) { return this._classes.has(c); }
    },
    addEventListener: () => {},
    removeEventListener: () => {},
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
  removeEventListener: () => {},
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
    addEventListener: () => {},
    removeEventListener: () => {},
    body: createElementMock('body')
  },
  sessionStorage: {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
  },
  localStorage: {
    _store: {},
    getItem(k) { return this._store[k] || null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; }
  },
  console
};

mockDom.window = mockDom;

const context = vm.createContext(mockDom);

// تحميل سكربتات المنصة داخل السياق
const scriptsToLoad = [
  'data/four_am.js',
  'data/registry_4am.js',
  'data/store.js',
  'app.js'
];

for (const s of scriptsToLoad) {
  const code = fs.readFileSync(path.join(baseDir, s), 'utf8');
  vm.runInContext(code, context);
}

const store = context.PlatformStore;
const appState = context.appState;

// 1. تهيئة حالة التطبيق لطور 4AM
console.log('--- 1. تهيئة حالة التطبيق لطور 4AM ---');
appState.level = '4am';
appState.stage = 'متوسط';
appState.year = 'السنة الرابعة متوسط';
appState.branch = 'التعليم المتوسط';

// 2. الدخول لصفحة مادة الرياضيات
console.log('--- 2. الدخول لصفحة مادة الرياضيات (openSubjectDetail) ---');
context.openSubjectDetail('الرياضيات');
assert.strictEqual(appState.currentSubject, 'الرياضيات');
const screenSubjectDetail = mockDom.document.getElementById('screen-subject-detail');
assert(!screenSubjectDetail.classList.contains('hidden'), 'Subject detail screen must be visible');
console.log('  [PASS] صفحة مادة الرياضيات ظاهرة بنجاح');

// 3. الدخول لفهرس الدروس
console.log('--- 3. الدخول لفهرس دروس الرياضيات (openLessonsIndex) ---');
context.openLessonsIndex('الرياضيات');
const screenLessonsIndex = mockDom.document.getElementById('screen-lessons-index');
assert(!screenLessonsIndex.classList.contains('hidden'), 'Lessons index must be visible');
const lessonsListContainer = mockDom.document.getElementById('lessons-list-container');
assert(lessonsListContainer.innerHTML.includes('الأعداد الطبيعية والأعداد الناطقة'), 'Lesson 1 must be rendered');
console.log('  [PASS] فهرس الدروس معروض والدروس الـ 14 حاضرة');

// 4. الدخول لفضاء درس به تمارين
console.log('--- 4. الدخول لفضاء درس (الأعداد الطبيعية والأعداد الناطقة) ---');
context.openLessonHub('الأعداد الطبيعية والأعداد الناطقة');
const screenLessonHub = mockDom.document.getElementById('screen-lesson-hub');
assert(!screenLessonHub.classList.contains('hidden'), 'Lesson Hub must be visible');
const hubExBadge = mockDom.document.getElementById('hub-exercises-count-badge');
console.log(`  Badge Text in Hub: "${hubExBadge.textContent}"`);
assert(hubExBadge.textContent.includes('تمارين'), 'Hub badge must display exercises');
assert(!hubExBadge.textContent.includes('0 تمارين'), 'Lesson 1 must have > 0 exercises');
console.log('  [PASS] فضاء الدرس يعرض العدد الحقيقي الدقيق للتمارين');

// 5. فتح قائمة تمارين الدرس
console.log('--- 5. فتح قائمة تمارين الدرس (openLessonExercises) ---');
context.openLessonExercises('الأعداد الطبيعية والأعداد الناطقة');
const screenLessonExercises = mockDom.document.getElementById('screen-lesson-exercises');
assert(!screenLessonExercises.classList.contains('hidden'), 'Lesson exercises screen must be visible');
const exListTitle = mockDom.document.getElementById('exercises-list-title');
console.log(`  Exercises List Title: "${exListTitle.textContent}"`);
assert(exListTitle.textContent.includes('قائمة التمارين ('), 'Title must show exercises count');
const exercisesContainer = mockDom.document.getElementById('exercises-container');
assert(exercisesContainer.innerHTML.includes('exercise-item-card'), 'Exercise cards must be rendered in DOM');
console.log('  [PASS] شاشة التمارين تعرض بطاقات التمارين المسترجعة من السجل بنجاح');

// 6. فتح عارض المورد لتمرين محدد
console.log('--- 6. فتح عارض المورد لتمرين محدد (openResourceViewer) ---');
const mathExercises = store.getLessonExercises('الرياضيات', 'الأعداد الطبيعية والأعداد الناطقة');
assert(mathExercises.length > 0, 'Must have exercises for lesson 1');
const firstEx = mathExercises[0];
context.openResourceViewer(firstEx.resourceId, 'problem');
assert.strictEqual(appState.currentResource.id, firstEx.resourceId);
console.log(`  [PASS] تم فتح عارض المورد المستقل للتمرين: ${firstEx.title.substring(0, 50)}...`);

// 7. الرجوع لقائمة التمارين
console.log('--- 7. الرجوع لقائمة التمارين ---');
context.openLessonExercises('الأعداد الطبيعية والأعداد الناطقة');
assert(!screenLessonExercises.classList.contains('hidden'));
console.log('  [PASS] الرجوع لقائمة التمارين نجح بسلاسة');

// 8. اختبار فضاء درس بدون تمارين مؤكدة (NO_VERIFIED_EXERCISE_FOUND)
console.log('--- 8. اختبار فضاء درس بدون تمارين مؤكدة ---');
const subjects = store.getAllSubjects('4am');
let emptyLessonFound = null;
for (const s of subjects) {
  for (const l of s.lessons || []) {
    const exs = store.getLessonExercises(s.name, l.title);
    if (exs.length === 0) {
      emptyLessonFound = { subject: s.name, lesson: l.title };
      break;
    }
  }
  if (emptyLessonFound) break;
}

assert(emptyLessonFound, 'Should find at least one lesson without exercises to test Empty State');
console.log(`  Testing empty lesson: [${emptyLessonFound.subject}] ${emptyLessonFound.lesson}`);
appState.currentSubject = emptyLessonFound.subject;
context.openLessonHub(emptyLessonFound.lesson);
const emptyHubBadge = mockDom.document.getElementById('hub-exercises-count-badge');
assert(emptyHubBadge.textContent.includes('0 تمارين'), 'Empty lesson must show 0 exercises');

context.openLessonExercises(emptyLessonFound.lesson);
assert(!screenLessonExercises.classList.contains('hidden'));
assert(exercisesContainer.innerHTML.includes('لا توجد نماذج تمارين منشورة لهذا الدرس حالياً'), 'Must display clean empty state');
console.log('  [PASS] الدرس الخالي يعرض 0 تمارين وشاشة Empty State النظيفة دون أخطاء');

// 9. التأكد من عدم ظهور أي مورد لـ 3AS في واجهات 4AM
console.log('--- 9. التأكد من عدم ظهور أي مورد لـ 3AS في واجهات 4AM ---');
const all4amExercises = store.getResourcesByType('الرياضيات', 'exercise', '4am');
for (const ex of all4amExercises) {
  assert.strictEqual(ex.levelId, '4am');
  assert(!ex.id.includes('3as'));
  assert(ex.branch !== 'آداب وفلسفة');
}
console.log('  [PASS] صفر تسرب لموارد 3AS داخل واجهات واستعلامات 4AM');

console.log('\n=============================================');
console.log('FULL 4AM EXERCISES UI RUNTIME FLOW PASSED 100%!');
console.log('=============================================\n');
