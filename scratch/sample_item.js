const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data/pipeline/raw/competitor_4am_discovery.json', 'utf8'));
console.log('Sample item:', JSON.stringify(raw.items[0], null, 2));

const cands = JSON.parse(fs.readFileSync('data/pipeline/normalized/competitor_4am_candidates.json', 'utf8'));
console.log('Sample candidate:', JSON.stringify(cands.candidates[0], null, 2));
