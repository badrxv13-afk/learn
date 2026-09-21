const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data');
const subjectFiles = ['islamic.js', 'history.js', 'math.js', 'arabic.js', 'french.js', 'english.js'];

const sandbox = { window: { PlatformData: {} } };
vm.createContext(sandbox);

for (const f of subjectFiles) {
  const filePath = path.join(dataDir, f);
  if (fs.existsSync(filePath)) {
    vm.runInContext(fs.readFileSync(filePath, 'utf-8'), sandbox);
  }
}

for (const [name, subj] of Object.entries(sandbox.window.PlatformData)) {
  console.log(`=== ${name} (${(subj.lessons || []).length} دروس) ===`);
  (subj.lessons || []).forEach(l => {
    console.log(`  - [${l.id}] ${l.title} (${l.unit || l.problematic || l.axis || ''})`);
  });
}
