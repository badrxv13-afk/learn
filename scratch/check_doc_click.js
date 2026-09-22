const https = require('https');

https.get('https://www.dzexams.com/ar/4am/mathematiques/cours', (res) => {
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    // Search for javascript handling btn-item-document
    const match = html.match(/btn-item-document[\s\S]{0,1000}/);
    if (match) {
      console.log('Match:');
      console.log(match[0].substring(0, 500));
    }

    const scriptMatches = html.match(/<script[\s\S]*?<\/script>/gi) || [];
    console.log('Script tags count:', scriptMatches.length);
    for (const sc of scriptMatches) {
      if (sc.includes('btn-item-document') || sc.includes('data-id') || sc.includes('/sujet/') || sc.includes('/document')) {
        console.log('Found in script:');
        console.log(sc.substring(0, 500));
      }
    }
  });
});
