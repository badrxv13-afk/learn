const fs = require('fs');
const path = require('path');

const filePath = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/philosophy.js');
let code = fs.readFileSync(filePath, 'utf-8');

// تنظيف كافة الإيموجيات
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{2388}-\u{23FF}\u{1FA70}-\u{1FAFF}\u{200D}\u{FE0F}]/gu;
code = code.replace(emojiRegex, '');

// تنظيف علامات البكالوريا القديمة مثل "حل ✅" أو 👍
code = code.replace(/👍\s*\d*/g, '').replace(/👎\s*\d*/g, '').replace(/حل\s*✅/g, 'حل معتمد');

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Sanitized data/philosophy.js to zero emojis.');
