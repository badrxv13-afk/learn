/**
 * Resource Registry Integrity Test
 * Validates the unified educational Resource Registry against strict requirements:
 * 1. Global uniqueness of resource IDs
 * 2. Referential integrity (subjectId and lessonId match PlatformData)
 * 3. Strict contentCase ("A" | "B")
 * 4. Allowed resource types ('bac', 'exam', 'exercise', 'summary', 'review')
 * 5. Case A / Case B contract adherence
 * 6. Official source truthfulness (DzExams / ONEC only)
 * 7. Zero search URLs (no youtube.com/results or google search)
 * 8. Zero emojis
 * 9. PlatformStore SSOT query methods validation
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '../..');

function runTest() {
  console.log('====================================================');
  console.log('--- STARTING RESOURCE REGISTRY INTEGRITY TEST ---');
  console.log('====================================================');

  const sandbox = {
    window: {},
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  // 1. Load store.js
  const storeCode = fs.readFileSync(path.join(baseDir, 'data', 'store.js'), 'utf-8');
  vm.runInContext(storeCode, sandbox);

  // 2. Load all 7 subject files
  const dataFiles = [
    'philosophy.js',
    'islamic.js',
    'history.js',
    'math.js',
    'arabic.js',
    'french.js',
    'english.js'
  ];

  for (const file of dataFiles) {
    const code = fs.readFileSync(path.join(baseDir, 'data', file), 'utf-8');
    vm.runInContext(code, sandbox);
  }

  // 3. Load registry.js
  const registryCode = fs.readFileSync(path.join(baseDir, 'data', 'registry.js'), 'utf-8');
  vm.runInContext(registryCode, sandbox);

  const PlatformData = sandbox.window.PlatformData;
  const PlatformStore = sandbox.window.PlatformStore;
  const PlatformRegistry = sandbox.window.PlatformRegistry;

  let totalTests = 0;
  let passedTests = 0;
  const failures = [];

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
    } else {
      failures.push(message);
      console.error(`  FAIL: ${message}`);
    }
  }

  // --- Test 1: Data Availability ---
  console.log('\n[1/7] Testing Data & Registry Availability...');
  assert(PlatformData && Object.keys(PlatformData).length === 7, `Expected 7 subjects in PlatformData, found ${Object.keys(PlatformData || {}).length}`);
  assert(PlatformRegistry && Object.keys(PlatformRegistry).length > 0, `Expected non-empty PlatformRegistry, found ${Object.keys(PlatformRegistry || {}).length}`);

  const resources = Object.values(PlatformRegistry);
  console.log(`  -> Total resources registered: ${resources.length}`);

  // Build lessonId set from PlatformData
  const validSubjectIds = new Set();
  const validLessonIdsBySubject = new Map();
  const allValidLessonIds = new Set();

  for (const [subjName, subj] of Object.entries(PlatformData)) {
    validSubjectIds.add(subj.id);
    const lessonIds = new Set();
    for (const l of (subj.lessons || [])) {
      if (l.lessonId) {
        lessonIds.add(l.lessonId);
        allValidLessonIds.add(l.lessonId);
      }
    }
    validLessonIdsBySubject.set(subj.id, lessonIds);
  }

  // --- Test 2: Resource ID Uniqueness & Hygiene ---
  console.log('\n[2/7] Testing Resource ID Uniqueness & Format...');
  const seenIds = new Set();
  let duplicateCount = 0;
  let whitespaceCount = 0;

  for (const r of resources) {
    if (seenIds.has(r.id)) duplicateCount++;
    seenIds.add(r.id);

    if (/\s/.test(r.id)) whitespaceCount++;
  }

  assert(duplicateCount === 0, `Detected ${duplicateCount} duplicate resource IDs!`);
  assert(whitespaceCount === 0, `Detected ${whitespaceCount} resource IDs containing whitespace!`);

  // --- Test 3: Referential Integrity (subjectId & lessonId) ---
  console.log('\n[3/7] Testing Referential Integrity...');
  let invalidSubjectIdCount = 0;
  let invalidLessonIdCount = 0;

  for (const r of resources) {
    if (!validSubjectIds.has(r.subjectId)) {
      invalidSubjectIdCount++;
    }

    if (r.lessonId) {
      const subjectLessonSet = validLessonIdsBySubject.get(r.subjectId);
      if (!subjectLessonSet || !subjectLessonSet.has(r.lessonId)) {
        invalidLessonIdCount++;
      }
    }
  }

  assert(invalidSubjectIdCount === 0, `Found ${invalidSubjectIdCount} resources with unknown subjectId!`);
  assert(invalidLessonIdCount === 0, `Found ${invalidLessonIdCount} resources with unmatched lessonId in subject!`);

  // --- Test 4: Strict Content Cases & Resource Types ---
  console.log('\n[4/7] Testing Content Cases and Resource Types...');
  const allowedTypes = new Set(['bac', 'exam', 'exercise', 'summary', 'review']);
  let invalidTypeCount = 0;
  let invalidCaseCount = 0;
  let caseACount = 0;
  let caseBCount = 0;

  for (const r of resources) {
    if (!allowedTypes.has(r.type)) invalidTypeCount++;
    if (r.contentCase !== 'A' && r.contentCase !== 'B') {
      invalidCaseCount++;
    } else if (r.contentCase === 'A') {
      caseACount++;
    } else {
      caseBCount++;
    }
  }

  assert(invalidTypeCount === 0, `Found ${invalidTypeCount} resources with invalid type!`);
  assert(invalidCaseCount === 0, `Found ${invalidCaseCount} resources with invalid contentCase!`);
  console.log(`  -> Case A (In-platform viewable): ${caseACount}`);
  console.log(`  -> Case B (External verified source): ${caseBCount}`);

  // --- Test 5: Contract Adherence (URLs, Sources & Case Details) ---
  console.log('\n[5/7] Testing Contract Adherence & Transparency...');
  let invalidCaseAProblems = 0;
  let invalidCaseBUrls = 0;
  let badOfficialSources = 0;
  let searchUrlCount = 0;

  for (const r of resources) {
    // Check Case A
    if (r.contentCase === 'A') {
      if (!r.problem || !r.problem.available) {
        invalidCaseAProblems++;
      }
    }

    // Check Case B
    if (r.contentCase === 'B') {
      if (!r.source || !r.source.url || !r.source.url.startsWith('http')) {
        invalidCaseBUrls++;
      }
    }

    // Check source transparency
    if (r.source && r.source.type === 'official') {
      const srcUrl = r.source.url || '';
      const srcName = r.source.name || '';
      const isTrueOfficial = srcUrl.includes('dzexams.com') ||
                             srcUrl.includes('onec.dz') ||
                             srcName.includes('وزار') ||
                             srcName.includes('الديوان الوطني') ||
                             srcName.includes('التوجيه التربوي');
      if (!isTrueOfficial) {
        badOfficialSources++;
      }
    }

    // Check zero search URLs
    const checkString = JSON.stringify(r);
    if (checkString.includes('youtube.com/results') || checkString.includes('google.com/search')) {
      searchUrlCount++;
    }
  }

  assert(invalidCaseAProblems === 0, `Found ${invalidCaseAProblems} Case A resources without valid problem data!`);
  assert(invalidCaseBUrls === 0, `Found ${invalidCaseBUrls} Case B resources without valid source URL!`);
  assert(badOfficialSources === 0, `Found ${badOfficialSources} resources marked official without true official provenance!`);
  assert(searchUrlCount === 0, `Found ${searchUrlCount} resources containing search query URLs!`);

  // --- Test 6: Zero Emojis in Registry ---
  console.log('\n[6/7] Testing Zero Emojis...');
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;
  let emojiMatches = 0;

  for (const r of resources) {
    const textToCheck = `${r.title} ${r.badge || ''} ${r.problem && r.problem.text || ''} ${r.source && r.source.name || ''}`;
    if (emojiRegex.test(textToCheck)) {
      emojiMatches++;
    }
  }

  assert(emojiMatches === 0, `Found ${emojiMatches} resources containing emojis!`);

  // --- Test 7: PlatformStore Query Methods ---
  console.log('\n[7/7] Testing PlatformStore Query Methods...');
  const allRes = PlatformStore.getAllResources();
  assert(allRes.length === resources.length, `PlatformStore.getAllResources() returned ${allRes.length}, expected ${resources.length}`);

  const sampleRes = resources[0];
  const fetchedRes = PlatformStore.getResourceById(sampleRes.id);
  assert(fetchedRes && fetchedRes.id === sampleRes.id, `PlatformStore.getResourceById(${sampleRes.id}) failed`);

  const philoBacs = PlatformStore.getResourcesByType('philosophy', 'bac');
  assert(philoBacs.length > 0, `PlatformStore.getResourcesByType('philosophy', 'bac') returned 0 items`);

  const philoResByArabic = PlatformStore.getResourcesBySubject('الفلسفة');
  assert(philoResByArabic.length > 0, `PlatformStore.getResourcesBySubject('الفلسفة') returned 0 items`);

  // Test lesson resources
  const sampleLessonId = allValidLessonIds.values().next().value;
  if (sampleLessonId) {
    const lessonRes = PlatformStore.getLessonResources(sampleLessonId);
    assert(Array.isArray(lessonRes), `PlatformStore.getLessonResources(${sampleLessonId}) did not return an array`);
  }

  console.log('====================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} PASSED`);
  if (failures.length > 0) {
    console.log('FAILURES:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  console.log('====================================================');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runTest();
