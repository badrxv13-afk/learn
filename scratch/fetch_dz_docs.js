const https = require('https');

https.get('https://www.dzexams.com/ar/4am/mathematiques/cours', (res) => {
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    console.log('HTML Length:', html.length);
    const docRegex = /href="([^"]*(?:documents|cours|sujet)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    let count = 0;
    while ((match = docRegex.exec(html)) !== null && count < 20) {
      const href = match[1];
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text && !text.includes('التعليم')) {
        console.log(`${count + 1}. [${href}] -> ${text}`);
        count++;
      }
    }
  });
}).on('error', err => console.error(err));
