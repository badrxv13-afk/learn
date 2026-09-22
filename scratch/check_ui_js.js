const https = require('https');

https.get('https://www.dzexams.com/build/assets/ui-DA5kvaSB.js', (res) => {
  let js = '';
  res.on('data', chunk => { js += chunk; });
  res.on('end', () => {
    console.log('UI JS Length:', js.length);
    const exportIdx = js.lastIndexOf('export{');
    if (exportIdx !== -1) {
      console.log('Exports:', js.substring(exportIdx));
    }
  });
});
