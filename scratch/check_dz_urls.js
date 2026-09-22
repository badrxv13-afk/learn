const fs = require('fs');

const registryText = fs.readFileSync('data/registry_4am.js', 'utf8');
const urls = [];
const regex = /https?:\/\/[^\s"',]+/g;
let match;
while ((match = regex.exec(registryText)) !== null) {
  urls.push(match[0]);
}

const dzexamsUrls = urls.filter(u => u.includes('dzexams.com'));
console.log('Total URLs in registry_4am.js:', urls.length);
console.log('DzExams URLs in registry_4am.js:', dzexamsUrls.length);
console.log('Sample DzExams URLs:');
console.log(Array.from(new Set(dzexamsUrls)).slice(0, 15));
