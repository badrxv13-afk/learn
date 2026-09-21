const { execSync } = require('child_process');
const path = require('path');

const tests = [
  'pipeline/validators/multi_subject_test.js',
  'pipeline/validators/ui_flow_test.js',
  'pipeline/validators/browser_runtime_test.js',
  'pipeline/validators/resource_registry_integrity_test.js',
  'pipeline/validators/resource_ui_integration_test.js',
  'pipeline/validators/youtube_embed_test.js',
  'pipeline/validators/student_profile_test.js',
  'pipeline/validators/ui_ux_polish_test.js',
  'pipeline/validators/subject_cards_simplification_test.js'
];

const nodeCmd = 'C:/Users/mad/AppData/Roaming/Antigravity/bin/agy-node.cmd';
let allPassed = true;

for (const t of tests) {
  console.log(`\n>>> RUNNING: ${t}`);
  try {
    const stdout = execSync(`"${nodeCmd}" ${t}`, { stdio: 'pipe' }).toString();
    console.log(stdout.trim());
  } catch (err) {
    allPassed = false;
    console.error(`FAILED ${t}:`, err.stdout ? err.stdout.toString() : err.message);
  }
}

console.log('\n=============================================');
if (allPassed) {
  console.log('ALL VALIDATION SUITES PASSED FLAWLESSLY (100% SUCCESS)');
} else {
  console.error('SOME TESTS FAILED');
  process.exit(1);
}
console.log('=============================================');
