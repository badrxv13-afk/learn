const https = require('https');

https.get('https://www.dzexams.com/build/assets/ui-DA5kvaSB.js', (res) => {
  let js = '';
  res.on('data', chunk => { js += chunk; });
  res.on('end', () => {
    const idx = js.indexOf('function E(');
    if (idx !== -1) {
      console.log('function E:');
      console.log(js.substring(idx, idx + 400));
    } else {
      const idx2 = js.indexOf('E=');
      console.log('E=:');
      console.log(js.substring(idx2, idx2 + 400));
    }
  });
});
