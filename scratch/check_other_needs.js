const fs = require('fs');

const verified = JSON.parse(fs.readFileSync('data/pipeline/verified/exercises_4am_verified.json', 'utf8'));

const otherSubjects = verified.needsVerification.filter(i => i.subjectName !== 'الرياضيات');
console.log('NeedsVerification in other subjects:', otherSubjects.length);
otherSubjects.slice(0, 20).forEach((item, idx) => {
  console.log(`${idx + 1}. [${item.subjectName}] ${item.title}`);
});
