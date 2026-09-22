/**
 * mordix_ai — Step 1: Competitor Raw Data Extractor
 * 
 * يقرأ كافة ملفات صفحات المنافس المحفوظة بـ SingleFile في المجلدين:
 * C:/Users/mad/Pictures/6525 و C:/Users/mad/Pictures/2027
 * ويستخرج منها البيانات التعليمية الخام دون تعديل
 */

const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../..');
const outputRawPath = path.join(baseDir, 'data/pipeline/raw/competitor_4am_discovery.json');

const dirs = [
  'C:/Users/mad/Pictures/6525',
  'C:/Users/mad/Pictures/2027'
];

const subjectMap = {
  '1': { id: 'math_4am', name: 'الرياضيات' },
  '12': { id: 'arabic_4am', name: 'اللغة العربية' },
  '13': { id: 'french_4am', name: 'اللغة الفرنسية' },
  '14': { id: 'english_4am', name: 'اللغة الإنجليزية' },
  '15': { id: 'science_4am', name: 'علوم الطبيعة والحياة' },
  '16': { id: 'history_geography_4am', name: 'التاريخ والجغرافيا' },
  '17': { id: 'physics_4am', name: 'العلوم الفيزيائية والتكنولوجيا' },
  '79': { id: 'islamic_4am', name: 'التربية الإسلامية' },
  '80': { id: 'civics_4am', name: 'التربية المدنية' }
};

const discoveredItems = [];
const scannedFiles = [];
let totalLessonsDiscovered = 0;
const lessonTitlesSet = new Set();
const channelNamesSet = new Set();
const teacherNamesSet = new Set();
let originalYoutubeLinksCount = 0;

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

  files.forEach(fileName => {
    const fullPath = path.join(dir, fileName);
    const html = fs.readFileSync(fullPath, 'utf8');
    scannedFiles.push({ dir, fileName, size: html.length });

    // SingleFile source URL
    let sourceUrl = '';
    const sfUrlMatch = html.match(/url:\s*(https?:\/\/[^\s\n\r"'>]+)/i) || html.match(/<!--\s*page url:\s*([^\s]+)/i);
    if (sfUrlMatch) sourceUrl = sfUrlMatch[1];

    // Subject
    let subjectId = null;
    let subjectName = '';
    const mMatch = sourceUrl.match(/matieres\/(\d+)/);
    if (mMatch && subjectMap[mMatch[1]]) {
      subjectId = subjectMap[mMatch[1]].id;
      subjectName = subjectMap[mMatch[1]].name;
    }

    // Lesson Title
    const lines = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                      .replace(/<style[\s\S]*?<\/style>/gi, '')
                      .replace(/<[^>]+>/g, '\n')
                      .split('\n')
                      .map(l => l.trim())
                      .filter(l => l.length > 0);

    let lessonTitle = '';
    const idx = lines.findIndex(l => l === 'عنوان الدرس:' || l.includes('عنوان الدرس'));
    if (idx !== -1 && lines[idx + 1]) {
      lessonTitle = lines[idx + 1].trim();
      lessonTitlesSet.add(lessonTitle);
    }

    const isReviews = sourceUrl.includes('/reviews') || fileName.includes('المراجعات');
    if (isReviews && !lessonTitle) {
      lessonTitle = 'المراجعات النهائية';
      lessonTitlesSet.add(lessonTitle);
    }

    const isExercises = sourceUrl.includes('/exercises') || fileName.includes('تمارين');
    const isVideos = sourceUrl.includes('/videos') || fileName.includes('فيديوهات الدرس');
    const isCoursesList = sourceUrl.endsWith('/courses') || fileName.includes('الدروس');

    // Check for existing youtube links in html
    const ytLinks = html.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/gi) || [];
    originalYoutubeLinksCount += ytLinks.length;

    // Course listing discovery
    if (isCoursesList) {
      // Find all course titles
      const courseTitleMatches = html.match(/<h[3-5][^>]*class="[^"]*course[^"]*"[^>]*>([\s\S]*?)<\/h[3-5]>/gi) || [];
      courseTitleMatches.forEach(cm => {
        const ct = cm.replace(/<[^>]+>/g, '').trim();
        if (ct.length > 2) {
          lessonTitlesSet.add(ct);
        }
      });
    }

    // Video / Channel discovery
    const channelSections = html.split(/<span>قناة:<\/span>/i);
    for (let i = 1; i < channelSections.length; i++) {
      const sec = channelSections[i];
      const chMatch = sec.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
      const channelName = chMatch ? chMatch[1].replace(/<[^>]+>/g, '').trim() : 'قناة غير معروفة';
      channelNamesSet.add(channelName);
      
      const teacherName = channelName.replace(/^الأستاذ(?:ة)?\s+/i, '').replace(/^(?:قناة\s+|أستاذك\s+في\s+)/i, '').trim();
      if (teacherName.length > 2) teacherNamesSet.add(teacherName);

      const pRegex = /<p[^>]*class="[^"]*break-words[^"]*"[^>]*>([\s\S]*?)(?:<div|<\/p>)/gi;
      let tMatch;
      const titles = [];
      while ((tMatch = pRegex.exec(sec)) !== null) {
        const cleanTitle = tMatch[1].replace(/<[^>]+>/g, '').trim();
        if (cleanTitle.length > 3 && !cleanTitle.includes('حقوق النشر') && !cleanTitle.includes('ملفات تعريف') && !cleanTitle.includes('فهرس')) {
          titles.push(cleanTitle);
        }
      }

      titles.forEach((vt, vIdx) => {
        discoveredItems.push({
          discoveryId: `elmed-${discoveredItems.length + 1}`,
          sourceFile: fileName,
          sourceDirectory: dir,
          sourceUrl: sourceUrl,
          subjectId: subjectId,
          subjectName: subjectName,
          lessonTitle: lessonTitle,
          resourceType: isExercises ? 'exercise' : isReviews ? 'review' : 'video',
          channelName: channelName,
          teacherName: teacherName,
          discoveredTitle: vt,
          orderInSection: vIdx + 1,
          extractedAt: new Date().toISOString()
        });
      });
    }
  });
});

const outputData = {
  metadata: {
    source: 'Competitor SingleFile Exports (ELMED App)',
    levelId: '4am',
    scannedDirectories: dirs,
    totalFilesScanned: scannedFiles.length,
    totalLessonsDiscovered: lessonTitlesSet.size,
    totalChannelsDiscovered: channelNamesSet.size,
    totalTeachersDiscovered: teacherNamesSet.size,
    originalYoutubeLinksPresent: originalYoutubeLinksCount,
    totalItemsDiscovered: discoveredItems.length,
    generatedAt: new Date().toISOString()
  },
  scannedFiles: scannedFiles.map(f => ({ file: f.fileName, dir: f.dir, sizeBytes: f.size })),
  discoveredLessons: Array.from(lessonTitlesSet),
  discoveredChannels: Array.from(channelNamesSet),
  discoveredTeachers: Array.from(teacherNamesSet),
  items: discoveredItems
};

// Ensure directory exists
fs.mkdirSync(path.dirname(outputRawPath), { recursive: true });
fs.writeFileSync(outputRawPath, JSON.stringify(outputData, null, 2), 'utf8');

console.log('=== اكتمل استخراج البيانات الخام (RAW DISCOVERY) ===');
console.log(`- الملفات المفحوصة: ${scannedFiles.length}`);
console.log(`- الدروس المكتشفة: ${lessonTitlesSet.size}`);
console.log(`- أسماء القنوات المكتشفة: ${channelNamesSet.size}`);
console.log(`- أسماء الأساتذة المكتشفين: ${teacherNamesSet.size}`);
console.log(`- روابط YouTube الأصلية في الملفات: ${originalYoutubeLinksCount}`);
console.log(`- إجمالي العناصر التعليمية المستخرجة: ${discoveredItems.length}`);
console.log(`- مسار الحفظ: ${outputRawPath}`);
