const fs = require('fs');

const verified = JSON.parse(fs.readFileSync('data/pipeline/verified/exercises_4am_verified.json', 'utf8'));
console.log('Sample needsVerification items:');
verified.needsVerification.slice(0, 15).forEach((item, idx) => {
  console.log(`${idx + 1}. [${item.subjectName}] ${item.title}`);
});
