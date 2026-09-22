const https = require('https');

const url = 'https://www.dzexams.com/ar/documents/dTcwSEJaUG1QcmJ6clJBckxqcmJZZz09';

https.get(url, (res) => {
  console.log('Status code:', res.statusCode);
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    console.log('HTML Length:', html.length);
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    console.log('Page Title:', titleMatch ? titleMatch[1].trim() : 'No title');
    const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    console.log('H1:', h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : 'No H1');
  });
}).on('error', err => console.error(err));
