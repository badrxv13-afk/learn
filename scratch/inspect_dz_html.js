const https = require('https');

https.get('https://www.dzexams.com/ar/4am/mathematiques/cours', (res) => {
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    // search for 'سلسلة تمارين الأعداد الطبيعية'
    const idx = html.indexOf('سلسلة تمارين الأعداد الطبيعية');
    if (idx !== -1) {
      console.log('Found! Context around occurrence:');
      console.log(html.substring(idx - 300, idx + 300));
    } else {
      const idx2 = html.indexOf('تمارين');
      console.log('First تمارين occurrence:');
      console.log(html.substring(idx2 - 200, idx2 + 300));
    }
  });
});
