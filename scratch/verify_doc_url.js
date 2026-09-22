const https = require('https');

https.get('https://www.dzexams.com/ar/documents/bFxrf1tNUmldTzlZa3VSPmt0Ukprc4B5a3VSYmKCOEE=', (res) => {
  console.log('Status code:', res.statusCode);
  console.log('Headers:', res.headers.location);
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    console.log('HTML Length:', html.length);
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    console.log('Title:', titleMatch ? titleMatch[1].trim() : 'No title');
  });
}).on('error', err => console.error(err));
