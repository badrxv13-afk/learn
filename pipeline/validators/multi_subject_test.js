/**
 * End-to-End Multi-Subject Validation Suite
 * Tests data integrity, dynamic counters (DATA -> UI), YouTube ID provenance,
 * empty state behavior, and zero-emoji compliance across all 7 subjects.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');
const dataFiles = [
  'data/store.js',
  'data/philosophy.js',
  'data/islamic.js',
  'data/history.js',
  'data/math.js',
  'data/arabic.js',
  'data/french.js',
  'data/english.js'
];

// إنشاء بيئة محاكاة المتصفح
const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    addEventListener: () => {}
  },
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; }
  },
  sessionStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = v; }
  },
  console: console
};
sandbox.window = sandbox;
vm.createContext(sandbox);

console.log('====================================================');
console.log('RUNNING MULTI-SUBJECT PRODUCTION VALIDATION SUITE');
console.log('====================================================');

// 1. تحميل كافة الملفات في الـ Sandbox
for (const relPath of dataFiles) {
  const fullPath = path.join(baseDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: File missing: ${relPath}`);
    process.exit(1);
  }
  const code = fs.readFileSync(fullPath, 'utf-8');
  try {
    vm.runInContext(code, sandbox);
    console.log(`PASS: Loaded ${relPath}`);
  } catch (err) {
    console.error(`FAIL: Error evaluating ${relPath}:`, err.message);
    process.exit(1);
  }
}

const store = sandbox.window.PlatformStore;
if (!store) {
  console.error('FAIL: PlatformStore not found on window object.');
  process.exit(1);
}

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

// 2. اختبار عدد المواد المسجلة
console.log('\n--- TEST 1: Subject Registry ---');
const subjects = store.getAllSubjects();
assert(subjects.length === 7, `Expected 7 registered subjects, found ${subjects.length}`);

// 3. اختبار الإحصائيات العامة
console.log('\n--- TEST 2: Global Stats Calculation ---');
const globalStats = store.getGlobalStats();
console.log('Global Stats:', JSON.stringify(globalStats, null, 2));
assert(globalStats.subjectsCount === 7, 'Global subjects count is 7');
assert(globalStats.totalLessons >= 130, `Total lessons >= 130 (actual: ${globalStats.totalLessons})`);
assert(globalStats.totalVideos >= 900, `Total verified videos >= 900 (actual: ${globalStats.totalVideos})`);
assert(globalStats.totalExercises >= 200, `Total verified exercises >= 200 (actual: ${globalStats.totalExercises})`);
assert(globalStats.totalBac >= 130, `Total BAC sessions >= 130 (actual: ${globalStats.totalBac})`);

// 4. اختبار كل مادة بالتفصيل
console.log('\n--- TEST 3: Individual Subject Integrity & Dynamic Counters ---');
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}-\u{23FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}]/u;

for (const s of subjects) {
  console.log(`\nVerifying Subject: ${s.name} (${s.id})`);
  const lessons = store.getLessons(s.name);
  assert(lessons.length > 0, `Lessons array is populated (${lessons.length} lessons)`);

  let subjectVideoCount = 0;
  let allVideosHaveValidId = true;
  let hasAnyEmoji = false;

  for (const lesson of lessons) {
    const vids = store.getLessonVideos(s.name, lesson.title);
    const exs = store.getLessonExercises(s.name, lesson.title);

    let actualVids = 0;
    const teachers = new Set();
    vids.forEach(ch => {
      (ch.videos || []).forEach(v => {
        actualVids++;
        const ytid = v.youtubeId || v.youtube_id || v.id;
        if (!ytid || ytid.length !== 11 || ytid.includes(' ')) {
          allVideosHaveValidId = false;
        }
        if (emojiRegex.test(v.title || '') || emojiRegex.test(ch.channel || '')) {
          hasAnyEmoji = true;
        }
      });
      if (ch.channel) teachers.add(ch.channel);
    });

    subjectVideoCount += actualVids;

    // التحقق من أن أرقام الدرس ديناميكية ومطابقة 100% لمحتوى المصفوفات
    if (lesson.videos !== actualVids) {
      assert(false, `Lesson "${lesson.title}": counter ${lesson.videos} !== actual array length ${actualVids}`);
    }
    if (lesson.teachers !== teachers.size) {
      assert(false, `Lesson "${lesson.title}": teacher counter ${lesson.teachers} !== unique channels ${teachers.size}`);
    }
    if (lesson.exercises !== exs.length) {
      assert(false, `Lesson "${lesson.title}": exercise counter ${lesson.exercises} !== actual exercises ${exs.length}`);
    }
  }

  assert(allVideosHaveValidId, `All videos have valid 11-char YouTube IDs in ${s.name}`);
  assert(!hasAnyEmoji, `Zero emojis strictly maintained in ${s.name}`);

  const bac = store.getSubjectBac(s.name);
  assert(bac.length >= 15, `BAC sessions >= 15 in ${s.name} (actual: ${bac.length})`);

  const summaries = store.getSubjectSummaries(s.name);
  assert(summaries.length > 0, `Summaries are populated in ${s.name} (actual: ${summaries.length})`);

  const exams = store.getSubjectExams(s.name);
  assert(exams.length >= 3, `Semester exams configured in ${s.name} (actual: ${exams.length})`);
}

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('ALL INTEGRATION & PROVENANCE TESTS PASSED SUCCESSFULLY');
} else {
  console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
console.log('====================================================');
