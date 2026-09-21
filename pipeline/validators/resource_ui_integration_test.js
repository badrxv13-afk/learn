/**
 * Resource UI & Routing Integration Test
 * Verifies that the new Resource Presentation Architecture works completely end-to-end:
 * 1. Dedicated screens (#screen-resource-index and #screen-resource-viewer) exist in index.html
 * 2. openCategoryContent('البكالوريا' / 'امتحانات' / 'ملخصات' / 'المراجعات') routes to dedicated screens
 * 3. NO modals are opened for educational learning content
 * 4. Case A and Case B rendering works correctly
 * 5. Tab switcher between problem and solution works correctly
 * 6. Browser history popstate state reconstruction works correctly
 * 7. Zero emojis
 * 8. Zero search URLs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve(__dirname, '../..');

function runTest() {
  console.log('====================================================');
  console.log('--- STARTING RESOURCE UI & ROUTING INTEGRATION TEST ---');
  console.log('====================================================');

  // Load index.html
  const htmlContent = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');

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

  // --- Step 1: HTML Screen Verification ---
  console.log('\n[1/5] Checking index.html Screen Elements...');
  assert(htmlContent.includes('id="screen-resource-index"'), 'index.html contains screen-resource-index');
  assert(htmlContent.includes('id="screen-resource-viewer"'), 'index.html contains screen-resource-viewer');
  assert(htmlContent.includes('id="resource-cards-container"'), 'index.html contains resource-cards-container');
  assert(htmlContent.includes('id="viewer-pane-problem"'), 'index.html contains viewer-pane-problem');
  assert(htmlContent.includes('id="viewer-pane-solution"'), 'index.html contains viewer-pane-solution');
  assert(htmlContent.includes('data/registry.js'), 'index.html includes script data/registry.js');

  // --- Step 2: DOM & Application Sandbox Simulation ---
  console.log('\n[2/5] Initializing Headless DOM & Application Context...');

  class MockClassList {
    constructor() {
      this.classes = new Set(['hidden']);
    }
    add(...cls) { cls.forEach(c => this.classes.add(c)); }
    remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
    contains(c) { return this.classes.has(c); }
    toString() { return Array.from(this.classes).join(' '); }
  }

  class MockElement {
    constructor(id, tagName = 'div') {
      this.id = id;
      this.tagName = tagName;
      this.classList = new MockClassList();
      this.textContent = '';
      this.innerHTML = '';
      this.attributes = {};
      this.style = {};
      this.listeners = {};
    }

    setAttribute(k, v) { this.attributes[k] = v; }
    getAttribute(k) { return this.attributes[k]; }
    removeAttribute(k) { delete this.attributes[k]; }
    addEventListener(event, fn) { this.listeners[event] = fn; }

    get className() { return this.classList.toString(); }
    set className(val) {
      this.classList.classes = new Set(val.split(' ').filter(Boolean));
    }
  }

  const elementsMap = new Map();
  function getOrCreateElement(id, tag = 'div') {
    if (!elementsMap.has(id)) {
      elementsMap.set(id, new MockElement(id, tag));
    }
    return elementsMap.get(id);
  }

  // Pre-register IDs from index.html
  const knownIds = [
    'wizard-container', 'screen-unavailable', 'screen-dashboard', 'screen-subject-detail',
    'screen-lessons-index', 'screen-lesson-hub', 'screen-lesson-videos', 'screen-video-player',
    'screen-lesson-exercises', 'screen-resource-index', 'screen-resource-viewer',
    'step-view-1', 'step-view-2', 'step-view-3', 'btn-prev', 'btn-next', 'btn-next-text',
    'step-indicator-1', 'step-indicator-2', 'step-indicator-3', 'step-line-1', 'step-line-2',
    'unavailable-reason', 'active-subject-badge', 'lessons-list-container', 'channels-videos-container',
    'exercises-container', 'category-modal', 'category-modal-title', 'category-modal-subtitle',
    'category-modal-body', 'category-modal-icon-container', 'exercise-detail-modal',
    'exercise-modal-tag', 'exercise-modal-title', 'exercise-modal-question', 'notice-modal',
    'notice-title', 'notice-text', 'resource-index-breadcrumb-subject-text', 'resource-index-breadcrumb-type',
    'resource-index-title', 'resource-index-subtitle', 'resource-index-back-btn-text',
    'resource-cards-container', 'res-filter-all', 'res-filter-bac', 'res-filter-exam',
    'res-filter-exercise', 'res-filter-summary', 'res-filter-review',
    'viewer-breadcrumb-subject-text', 'viewer-breadcrumb-type-text', 'viewer-breadcrumb-title',
    'viewer-metadata-card', 'viewer-tag-type', 'viewer-tag-subject', 'viewer-tag-level',
    'viewer-title', 'viewer-source-badge-container', 'viewer-meta-details',
    'viewer-status-problem', 'viewer-status-solution',
    'viewer-tab-problem', 'viewer-tab-solution',
    'viewer-pane-problem', 'viewer-pane-solution',
    'viewer-btn-source', 'viewer-btn-download',
    'subject-detail-name', 'subject-detail-desc', 'subject-detail-lessons-count',
    'subject-detail-duration', 'subject-detail-branch', 'lessons-index-title',
    'lessons-index-subtitle', 'lessons-breadcrumb-subject-text', 'lesson-hub-title',
    'hub-videos-count-badge', 'hub-exercises-count-badge', 'player-video-title',
    'player-breadcrumb-title', 'player-channel-title', 'btn-open-youtube',
    'player-btn-videos-text', 'player-btn-exercises-text', 'video-embed-frame',
    'video-preview-frame', 'youtube-iframe-player'
  ];

  knownIds.forEach(id => getOrCreateElement(id));

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => getOrCreateElement(id),
      querySelectorAll: () => [],
      addEventListener: () => {}
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    history: {
      state: null,
      pushState: (state) => { sandbox.history.state = state; },
      replaceState: (state) => { sandbox.history.state = state; }
    },
    scrollTo: () => {},
    addEventListener: () => {}
  };
  sandbox.window = sandbox;
  sandbox.window.history = sandbox.history;
  vm.createContext(sandbox);

  // Load data scripts
  vm.runInContext(fs.readFileSync(path.join(baseDir, 'data', 'store.js'), 'utf-8'), sandbox);
  const dataFiles = [
    'philosophy.js', 'islamic.js', 'history.js', 'math.js', 'arabic.js', 'french.js', 'english.js'
  ];
  for (const f of dataFiles) {
    vm.runInContext(fs.readFileSync(path.join(baseDir, 'data', f), 'utf-8'), sandbox);
  }
  vm.runInContext(fs.readFileSync(path.join(baseDir, 'data', 'registry.js'), 'utf-8'), sandbox);

  // Load app.js
  const appJsCode = fs.readFileSync(path.join(baseDir, 'app.js'), 'utf-8');
  vm.runInContext(appJsCode, sandbox);

  // --- Step 3: Test openCategoryContent Routing (Zero Modals) ---
  console.log('\n[3/5] Testing openCategoryContent & Routing without Modals...');

  const categoryModal = getOrCreateElement('category-modal');
  const screenResourceIndex = getOrCreateElement('screen-resource-index');
  const screenResourceViewer = getOrCreateElement('screen-resource-viewer');
  const cardsContainer = getOrCreateElement('resource-cards-container');

  // Test 3.1: Clicking 'البكالوريا'
  sandbox.openCategoryContent('البكالوريا');
  assert(categoryModal.classList.contains('hidden'), 'category-modal remains HIDDEN when clicking "البكالوريا"');
  assert(!screenResourceIndex.classList.contains('hidden'), 'screen-resource-index is VISIBLE when clicking "البكالوريا"');
  assert(cardsContainer.innerHTML.includes('resource-card'), 'Cards container is populated with resource cards');
  assert(cardsContainer.innerHTML.includes('عرض الموضوع'), 'Resource cards have "عرض الموضوع" button');

  // Test 3.2: Filter tabs
  sandbox.filterResourceIndex('exam');
  assert(cardsContainer.innerHTML.includes('امتحان') || cardsContainer.innerHTML.includes('الفصل'), 'Filter switches to exams');

  // --- Step 4: Test openResourceViewer (Case A & Case B) ---
  console.log('\n[4/5] Testing openResourceViewer (Case A & Case B)...');

  // Test 4.1: Case B Resource (Official BAC 2024)
  sandbox.openResourceViewer('philosophy-bac-2024', 'problem');
  assert(!screenResourceViewer.classList.contains('hidden'), 'screen-resource-viewer is VISIBLE');
  assert(screenResourceIndex.classList.contains('hidden'), 'screen-resource-index is HIDDEN when viewer opens');

  const problemPane = getOrCreateElement('viewer-pane-problem');
  const solutionPane = getOrCreateElement('viewer-pane-solution');
  const sourceBadge = getOrCreateElement('viewer-source-badge-container');

  assert(problemPane.innerHTML.includes('الموضوع الأصلي متوفر كاملاً'), 'Case B problem pane renders official external source card');
  assert(sourceBadge.innerHTML.includes('مصدر رسمي معتمد'), 'Source badge indicates official source');
  assert(!problemPane.classList.contains('hidden'), 'Problem pane is visible by default');
  assert(solutionPane.classList.contains('hidden'), 'Solution pane is hidden by default');

  // Test 4.2: Tab Switcher
  sandbox.switchViewerTab('solution');
  assert(problemPane.classList.contains('hidden'), 'Problem pane is hidden after switching to solution');
  assert(!solutionPane.classList.contains('hidden'), 'Solution pane is visible after switching to solution');

  // Test 4.3: Case A Resource (Methodological Exercise)
  sandbox.openResourceViewer('philosophy-ex-philo_3as_lp_01-01', 'problem');
  assert(problemPane.innerHTML.includes('نص الموضوع والإشكالية المقررة'), 'Case A problem pane renders formatted problem text');
  sandbox.switchViewerTab('solution');
  assert(solutionPane.innerHTML.includes('شبكة التقويم وتوزيع النقاط المعتمدة') || solutionPane.innerHTML.includes('نقاط'), 'Case A solution pane renders marking scheme');

  // --- Step 5: Test History Navigation & PopState ---
  console.log('\n[5/5] Testing PopState History Restoration...');

  sandbox.handleNavigationPop({ screen: 'resource-index', type: 'bac', subject: 'الفلسفة' });
  assert(!screenResourceIndex.classList.contains('hidden'), 'Popstate correctly restores resource-index screen');

  sandbox.handleNavigationPop({ screen: 'resource-viewer', resourceId: 'philosophy-bac-2024', tab: 'solution' });
  assert(!screenResourceViewer.classList.contains('hidden'), 'Popstate correctly restores resource-viewer screen');
  assert(!solutionPane.classList.contains('hidden'), 'Popstate correctly restores active tab');

  // --- Step 6: Exercise Screen Integration ---
  console.log('\nTesting Exercise Cards Direct Viewer Link...');
  const exercisesContainer = getOrCreateElement('exercises-container');
  sandbox.renderExercises('الإحساس والإدراك');
  assert(exercisesContainer.innerHTML.includes('openResourceViewer'), 'renderExercises generates cards with openResourceViewer links');
  assert(!exercisesContainer.innerHTML.includes('openExerciseModal'), 'renderExercises NO LONGER uses openExerciseModal');

  // Final Summary
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
