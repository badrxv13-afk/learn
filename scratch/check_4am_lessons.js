const path = require('path');

global.window = {};
require(path.join(__dirname, '../data/four_am.js'));

const fourAm = global.window.PlatformData4AM;
console.log('4AM subjects count:', Object.keys(fourAm).length);

let totalLessons = 0;
for (const [sId, subj] of Object.entries(fourAm)) {
  console.log(`- [${sId}] ${subj.name}: ${(subj.lessons || []).length} lessons`);
  totalLessons += (subj.lessons || []).length;
}
console.log('Total lessons:', totalLessons);
