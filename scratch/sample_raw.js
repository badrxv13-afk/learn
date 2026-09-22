const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('data/pipeline/raw/competitor_4am_discovery.json', 'utf8'));
console.log('Sample raw item titles:');
raw.items.slice(0, 10).forEach(i => console.log('-', i.title));
