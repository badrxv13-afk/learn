const https = require('https');

https.get('https://www.dzexams.com/build/assets/web-DowvUEC8.js', (res) => {
  let js = '';
  res.on('data', chunk => { js += chunk; });
  res.on('end', () => {
    const idx = js.indexOf('function Bt(');
    if (idx !== -1) {
      console.log('function Bt definition:');
      console.log(js.substring(idx, idx + 400));
    } else {
      const idx2 = js.indexOf('Bt=');
      console.log('Bt= definition:');
      console.log(js.substring(idx2, idx2 + 400));
    }
  });
});
