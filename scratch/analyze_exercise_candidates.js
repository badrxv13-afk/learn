const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data/pipeline/raw/competitor_4am_discovery.json', 'utf8'));
const cands = JSON.parse(fs.readFileSync('data/pipeline/normalized/competitor_4am_candidates.json', 'utf8'));
const ver = JSON.parse(fs.readFileSync('data/pipeline/verified/competitor_4am_verified.json', 'utf8'));

const isExercise = (t) => /تمرين|تمارين|تطبيق|مسأل|سلسلة|وضعي|حل/i.test(t || '');

const rawEx = raw.items.filter(i => isExercise(i.discoveredTitle));
console.log('Raw exercise matches:', rawEx.length);

const candsEx = cands.candidates.filter(i => isExercise(i.discoveredTitle));
console.log('Candidates exercise matches:', candsEx.length);

const verEx = ver.verifiedResources.filter(i => isExercise(i.discoveredTitle) || isExercise(i.matchedVideoTitle));
console.log('Verified exercise matches:', verEx.length);

console.log('\nSample from verified exercises:');
verEx.slice(0, 10).forEach(i => {
  console.log(`- [${i.subjectId}] [${i.canonicalLessonTitle}] Title: ${i.matchedVideoTitle} (Channel: ${i.channelName}, ID: ${i.matchedVideoId})`);
});
