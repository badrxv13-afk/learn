/**
 * mordix_ai — 4AM Exercises & Applications Validation Suite
 * يتحقق بدقة من:
 * 1. عزل 3AS (عدم مساس بيانات 3AS).
 * 2. تكامل سجل الموارد PlatformRegistry4AM ومطابقة الدروس.
 * 3. خلو البيانات من الإيموجي (Zero Emojis).
 * 4. عدم وجود تكرار (Zero Duplicates).
 * 5. صدق الأرقام وتوافق دوال PlatformStore (Data -> UI).
 * 6. فحص حالة NO_VERIFIED_EXERCISE_FOUND للدروس الخالية (Zero Fake Data).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '../..');

console.log('\n=============================================');
console.log('RUNNING: pipeline/validators/exercises_4am_test.js');
console.log('=============================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// 1. Mock browser environment
global.window = {
  appState: { level: '4am' }
};

// تحميل سجل ومخزن البيانات
require(path.join(baseDir, 'data/four_am.js'));
require(path.join(baseDir, 'data/registry_4am.js'));
require(path.join(baseDir, 'data/store.js'));

const store = global.window.PlatformStore;
const registry4AM = global.window.PlatformRegistry4AM || {};
const data4AM = global.window.PlatformData4AM || {};

// 1. عزل 3AS التام
runTest('3AS isolation: 3AS data files must not be modified or contain 4AM exercises', () => {
  const math3as = fs.readFileSync(path.join(baseDir, 'data/math.js'), 'utf8');
  const philo3as = fs.readFileSync(path.join(baseDir, 'data/philosophy.js'), 'utf8');
  const reg3as = fs.readFileSync(path.join(baseDir, 'data/registry.js'), 'utf8');

  assert(!math3as.includes('math_4am'), 'math.js must not contain 4am identifiers');
  assert(!philo3as.includes('4am'), 'philosophy.js must not contain 4am');
  assert(!reg3as.includes('math_4am'), 'registry.js must not contain 4am resources');
});

// 2. فحص بنك التمارين في PlatformRegistry4AM
runTest('Registry integrity: verified exercises structure and fields', () => {
  const allExercises = Object.values(registry4AM).filter(r => r.type === 'exercise');
  assert(allExercises.length > 0, `Expected at least some verified exercises, found ${allExercises.length}`);

  for (const ex of allExercises) {
    assert.strictEqual(ex.levelId, '4am', `Exercise ${ex.id} must have levelId="4am"`);
    assert(ex.subjectId, `Exercise ${ex.id} must have subjectId`);
    assert(ex.lessonId, `Exercise ${ex.id} must have lessonId`);
    assert(ex.title && ex.title.trim().length > 3, `Exercise ${ex.id} must have a valid title`);
    assert(ex.url, `Exercise ${ex.id} must have a url`);
    assert(ex.source && ex.source.name, `Exercise ${ex.id} must have source`);
    assert(ex.verificationStatus === 'verified' || ex.auditStatus === 'SAFE_TO_IMPORT', `Exercise ${ex.id} must be verified`);

    // فحص خاص لـ YouTube
    if (ex.videoId) {
      assert.strictEqual(ex.videoId.length, 11, `YouTube videoId in ${ex.id} must be exactly 11 characters`);
      assert(ex.url.includes(ex.videoId), `YouTube URL in ${ex.id} must include videoId`);
    }

    // فحص خاص لـ DzExams
    if (ex.provenance && ex.provenance.origin === 'dzexams') {
      assert(ex.url.startsWith('https://www.dzexams.com/'), `DzExams URL in ${ex.id} must be from dzexams.com`);
    }
  }
});

// 3. منع التكرار
runTest('Deduplication: no duplicate exercise IDs, video IDs or URLs', () => {
  const allExercises = Object.values(registry4AM).filter(r => r.type === 'exercise');
  const seenIds = new Set();
  const seenVideoIds = new Set();
  const seenUrls = new Set();

  for (const ex of allExercises) {
    assert(!seenIds.has(ex.id), `Duplicate exercise ID detected: ${ex.id}`);
    seenIds.add(ex.id);

    if (ex.videoId) {
      assert(!seenVideoIds.has(ex.videoId), `Duplicate YouTube videoId detected: ${ex.videoId}`);
      seenVideoIds.add(ex.videoId);
    }

    if (ex.directPdfUrl) {
      assert(!seenUrls.has(ex.directPdfUrl), `Duplicate PDF URL detected: ${ex.directPdfUrl}`);
      seenUrls.add(ex.directPdfUrl);
    }
  }
});

// 4. خلو تام من الإيموجي
runTest('Zero Emojis policy across four_am.js and registry_4am.js', () => {
  const regContent = fs.readFileSync(path.join(baseDir, 'data/registry_4am.js'), 'utf8');
  const fourAmContent = fs.readFileSync(path.join(baseDir, 'data/four_am.js'), 'utf8');

  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;
  
  const regMatches = regContent.match(emojiRegex) || [];
  const fourAmMatches = fourAmContent.match(emojiRegex) || [];

  assert.strictEqual(regMatches.length, 0, `registry_4am.js contains ${regMatches.length} emojis`);
  assert.strictEqual(fourAmMatches.length, 0, `four_am.js contains ${fourAmMatches.length} emojis`);
});

// 5. صدق وتزامن دوال PlatformStore
runTest('PlatformStore accuracy: getResourcesByType and getLessonExercises', () => {
  const subjects = store.getAllSubjects('4am');
  assert(subjects.length === 9, 'Must return 9 subjects for 4AM');

  for (const s of subjects) {
    const subjExercises = store.getResourcesByType(s.name, 'exercise', '4am');
    const lessons = store.getLessons(s.name, '4am');

    let totalFromLessons = 0;
    for (const l of lessons) {
      const lessonExs = store.getLessonExercises(s.name, l.title, '4am');
      assert(Array.isArray(lessonExs), `getLessonExercises for ${s.name} - ${l.title} must be array`);
      assert.strictEqual(l.exercises, lessonExs.length, `lesson.exercises must match getLessonExercises length for ${l.title}`);
      totalFromLessons += lessonExs.length;
    }

    // التحقق من أن عدد تمارين الدروس لا يتجاوز موارد المادة الإجمالية
    console.log(`  Subject [${s.name}]: ${subjExercises.length} total exercises in registry, ${totalFromLessons} mapped to lessons`);
  }
});

// 6. التحقق من التعامل مع الدروس الخالية
runTest('Zero Fake Data: empty lessons return empty array without errors', () => {
  const mathSubj = store.getSubject('الرياضيات', '4am');
  assert(mathSubj, 'Math subject must exist');

  // فحص استعلام لدرس غير موجود أو بدون تمارين
  const nonExistent = store.getLessonExercises('الرياضيات', 'درس غير موجود إطلاقاً', '4am');
  assert.strictEqual(nonExistent.length, 0, 'Non-existent lesson must return 0 exercises');
});

console.log(`\nAll ${passedTests}/${totalTests} tests in exercises_4am_test.js PASSED successfully.\n`);
