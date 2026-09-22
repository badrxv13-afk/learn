const https = require('https');

https.get('https://www.dzexams.com/ar/4am/mathematiques/cours', (res) => {
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    const scripts = html.match(/<script[^>]*src="([^"]+)"/gi) || [];
    console.log('Scripts:', scripts);
  });
});
