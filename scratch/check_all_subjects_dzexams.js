const https = require('https');

const subjects = [
  { id: 'math_4am', slug: 'mathematiques', name: 'الرياضيات' },
  { id: 'arabic_4am', slug: 'arabe', name: 'اللغة العربية' },
  { id: 'physics_4am', slug: 'physique', name: 'العلوم الفيزيائية' },
  { id: 'science_4am', slug: 'sciences-naturelles', name: 'علوم الطبيعة والحياة' },
  { id: 'french_4am', slug: 'francais', name: 'اللغة الفرنسية' },
  { id: 'english_4am', slug: 'anglais', name: 'اللغة الإنجليزية' },
  { id: 'history_geo_4am', slug: 'histoire-geographie', name: 'التاريخ والجغرافيا' },
  { id: 'islamic_4am', slug: 'tarbia-islamia', name: 'التربية الإسلامية' },
  { id: 'civics_4am', slug: 'tarbia-madania', name: 'التربية المدنية' }
];

async function checkSubject(s) {
  const url = `https://www.dzexams.com/ar/4am/${s.slug}/cours`;
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const itemMatches = data.match(/class="item-center btn-item-document"/g) || [];
        resolve({
          name: s.name,
          slug: s.slug,
          statusCode: res.statusCode,
          length: data.length,
          docCount: itemMatches.length
        });
      });
    }).on('error', err => {
      resolve({ name: s.name, slug: s.slug, error: err.message });
    });
  });
}

(async () => {
  console.log('Checking DzExams cours pages for all 9 subjects of 4AM...');
  for (const s of subjects) {
    const res = await checkSubject(s);
    console.log(`- ${res.name} (${res.slug}): status=${res.statusCode}, size=${res.length}, docs=${res.docCount}`);
  }
})();
