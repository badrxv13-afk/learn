const https = require('https');

https.get('https://www.dzexams.com/build/assets/web-DowvUEC8.js', (res) => {
  let js = '';
  res.on('data', chunk => { js += chunk; });
  res.on('end', () => {
    console.log('JS Length:', js.length);
    const idx = js.indexOf('btn-item-document');
    if (idx !== -1) {
      console.log('Found btn-item-document:');
      console.log(js.substring(Math.max(0, idx - 200), idx + 400));
    }
    const docIdx = js.indexOf('/documents/');
    if (docIdx !== -1) {
      console.log('Found /documents/:');
      console.log(js.substring(Math.max(0, docIdx - 200), docIdx + 400));
    }
    const sujetIdx = js.indexOf('/sujet/');
    if (sujetIdx !== -1) {
      console.log('Found /sujet/:');
      console.log(js.substring(Math.max(0, sujetIdx - 200), sujetIdx + 400));
    }
  });
});
