const https = require('https');

const url = 'https://www.dzexams.com/ar/documents/dTcwSEJaUG1QcmJ6clJBckxqcmJZZz09';

https.get(url, (res) => {
  let html = '';
  res.on('data', chunk => { html += chunk; });
  res.on('end', () => {
    // Look for pdf links, download links, view links
    const links = html.match(/href="([^"]*(?:pdf|download|telecharger|view)[^"]*)"/gi) || [];
    console.log('PDF/Download links:', links);

    // Look for teacher name or description
    const teacherMatch = html.match(/(?:إعداد|للأستاذ|الاستاذ|الأستاذة)[\s\S]{1,40}/i);
    console.log('Teacher hint:', teacherMatch ? teacherMatch[0] : 'None');

    // Look for breadcrumb or tags
    const breadcrumb = html.match(/class="[^"]*breadcrumb[^"]*"[\s\S]*?<\/ol>/i);
    console.log('Breadcrumb:', breadcrumb ? breadcrumb[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'None');
  });
});
