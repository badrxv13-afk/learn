const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data/pipeline/raw/dzexams_4am_exercises_raw.json', 'utf8'));
console.log('Metadata:', raw.metadata);

const bySubject = {};
for (const item of raw.items) {
  bySubject[item.subjectName] = (bySubject[item.subjectName] || 0) + 1;
}
console.log('Items by Subject in DzExams Raw:');
for (const [s, count] of Object.entries(bySubject)) {
  console.log(`- ${s}: ${count} exercises`);
}

const directPdfCount = raw.items.filter(i => i.directPdfUrl).length;
console.log(`Direct PDF URLs available: ${directPdfCount} / ${raw.items.length}`);
