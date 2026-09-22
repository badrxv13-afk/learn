const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data/pipeline/raw/competitor_4am_discovery.json', 'utf8'));
console.log('Raw keys:', Object.keys(raw));
if (raw.extractedItems) console.log('extractedItems length:', raw.extractedItems.length);
if (raw.items) console.log('items length:', raw.items.length);

const cands = JSON.parse(fs.readFileSync('data/pipeline/normalized/competitor_4am_candidates.json', 'utf8'));
console.log('Candidates keys:', Object.keys(cands));
if (cands.candidates) console.log('candidates length:', cands.candidates.length);

const ver = JSON.parse(fs.readFileSync('data/pipeline/verified/competitor_4am_verified.json', 'utf8'));
console.log('Verified keys:', Object.keys(ver));
if (ver.verifiedItems) console.log('verifiedItems length:', ver.verifiedItems.length);
