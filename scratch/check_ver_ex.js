const fs = require('fs');

const ver = JSON.parse(fs.readFileSync('data/pipeline/verified/competitor_4am_verified.json', 'utf8'));
const isExercise = (t) => /تمرين|تمارين|تطبيق|مسأل|سلسلة|وضعي|حل/i.test(t || '');

const verEx = ver.verifiedResources.filter(i => 
  isExercise(i.discoverySource && i.discoverySource.discoveredTitle) || 
  isExercise(i.verifiedSource && i.verifiedSource.title)
);
console.log('Verified exercise matches:', verEx.length);

verEx.forEach((i, idx) => {
  console.log(`${idx + 1}. [${i.subjectId}] [${i.lessonTitle}] ${i.verifiedSource.title} (${i.verifiedSource.videoId})`);
});
