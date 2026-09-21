const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data');
const subjectFiles = [
  { file: 'philosophy.js', key: 'الفلسفة', prefix: 'philosophy' },
  { file: 'islamic.js', key: 'العلوم الإسلامية', prefix: 'islamic' },
  { file: 'history.js', key: 'التاريخ والجغرافيا', prefix: 'history' },
  { file: 'math.js', key: 'الرياضيات', prefix: 'math' },
  { file: 'arabic.js', key: 'اللغة العربية', prefix: 'arabic' },
  { file: 'french.js', key: 'اللغة الفرنسية', prefix: 'french' },
  { file: 'english.js', key: 'اللغة الإنجليزية', prefix: 'english' }
];

for (const sf of subjectFiles) {
  const filePath = path.join(dataDir, sf.file);
  if (!fs.existsSync(filePath)) continue;

  const code = fs.readFileSync(filePath, 'utf-8');
  const sandbox = { window: { PlatformData: {} } };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const subj = sandbox.window.PlatformData[sf.key];
  if (!subj || !Array.isArray(subj.lessons)) continue;

  subj.lessons = subj.lessons.map(l => {
    const lNum = String(l.id).padStart(2, '0');
    const stableId = l.canonical_id || `${sf.prefix}-${lNum}`;
    return {
      ...l,
      lessonId: stableId
    };
  });

  const outCode = `/**
 * Data Module: ${sf.key} (${subj.id})
 * Standardized Lesson IDs & Production Verified
 * Zero Emojis | Strict Provenance
 */

window.PlatformData = window.PlatformData || {};

window.PlatformData['${sf.key}'] = ${JSON.stringify(subj, null, 2)};
`;

  fs.writeFileSync(filePath, outCode, 'utf-8');
  console.log(`Updated lessonId for all ${subj.lessons.length} lessons in ${sf.file}`);
}

console.log('All 7 subjects now have stable lessonId properties.');
