const fs = require('fs');

const ver = JSON.parse(fs.readFileSync('data/pipeline/verified/competitor_4am_verified.json', 'utf8'));
console.log('Sample verifiedResource keys:', Object.keys(ver.verifiedResources[0]));
console.log('Sample verifiedResource:', JSON.stringify(ver.verifiedResources[0], null, 2));
