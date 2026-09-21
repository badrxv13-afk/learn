/**
 * AGENT 02: YOUTUBE RESEARCHER (باحث يوتيوب التعليمي الجزائري)
 * 
 * الهدف: الاكتشاف المنهجي لأفضل الفيديوهات التعليمية الجزائرية
 * لمادة الفلسفة - السنة الثالثة ثانوي - شعبة آداب وفلسفة.
 * 
 * المسؤولية: DISCOVERY فقط
 * لا يضيف إلى verified dataset بنفسه.
 * يسلّم النتائج إلى: YouTube Classifier -> Lesson Mapper -> QA.
 */

const fs = require('fs');
const path = require('path');

// 1. قائمة الدروس الرسمية للبحث المنهجي (3AS آداب وفلسفة)
const TARGET_LESSONS = [
  { id: 'habit_will', title: 'العادة والإرادة', unit: 'إدراك العالم الخارجي' },
  { id: 'sensation_perception', title: 'الإحساس والإدراك', unit: 'إدراك العالم الخارجي' },
  { id: 'language_thought', title: 'اللغة والفكر', unit: 'إدراك العالم الخارجي' },
  { id: 'consciousness_unconscious', title: 'الشعور واللاشعور', unit: 'إدراك العالم الخارجي' },
  { id: 'memory_imagination', title: 'الذاكرة والخيال', unit: 'إدراك العالم الخارجي' },
  { id: 'morals_values', title: 'الأخلاق بين الثوابت والمتغيرات', unit: 'الأخلاق والسياسة' },
  { id: 'rights_duties_justice', title: 'الحقوق والواجبات والعدل', unit: 'الأخلاق والسياسة' },
  { id: 'freedom_responsibility', title: 'الحرية والمسؤولية', unit: 'الأخلاق والسياسة' },
  { id: 'family_economic_political', title: 'العلاقات الأسرية والحياة الاقتصادية والسياسية', unit: 'الأخلاق والسياسة' },
  { id: 'violence_tolerance', title: 'العنف والتسامح', unit: 'الأخلاق والسياسة' },
  { id: 'math_philosophy', title: 'فلسفة الرياضيات', unit: 'فلسفة العلوم' },
  { id: 'matter_science', title: 'علوم المادة الجامدة وعلوم المادة الحية', unit: 'فلسفة العلوم' },
  { id: 'human_sciences', title: 'العلوم الإنسانية', unit: 'فلسفة العلوم' }
];

// صيغ الاستعلامات المتنوعة لكل درس
const QUERY_TEMPLATES = [
  (lesson) => `${lesson} فلسفة 3 ثانوي`,
  (lesson) => `${lesson} 3AS فلسفة`,
  (lesson) => `${lesson} آداب وفلسفة`,
  (lesson) => `${lesson} بكالوريا`,
  (lesson) => `${lesson} مقالة فلسفية`,
  (lesson) => `${lesson} منهجية`,
  (lesson) => `${lesson} شرح`,
  (lesson) => `${lesson} مراجعة`,
  (lesson) => `${lesson} الأستاذ`
];

// قاموس أساتذة الفلسفة المعتمدين في الجزائر للتعرف التلقائي
const KNOWN_TEACHERS = [
  { name: 'عادل مقرود', patterns: ['عادل مقرود', 'مقرود'] },
  { name: 'خليل سعيداني', patterns: ['خليل سعيداني', 'سعيداني'] },
  { name: 'هواري', patterns: ['هواري', 'الفلسفة مع هواري', 'houari'] },
  { name: 'فارس', patterns: ['فارس', 'prof fares', 'fares philo'] },
  { name: 'عبدالحق حمداش', patterns: ['حمداش', 'عبدالحق حمداش'] },
  { name: 'اسكندر لطفي غربي', patterns: ['اسكندر', 'غربي', 'اسكندر لطفي غربي'] },
  { name: 'حركات محمد', patterns: ['حركات', 'حركات محمد'] },
  { name: 'فاضل زراط', patterns: ['زراط', 'فاضل زراط'] },
  { name: 'بلفضيل', patterns: ['بلفضيل', 'belfodil'] },
  { name: 'محمد حمدود', patterns: ['حمدود', 'محمد حمدود'] },
  { name: 'جدة بوعبدالله', patterns: ['جدة بوعبدالله', 'بوعبدالله'] },
  { name: 'عبد الرزاق شنوف', patterns: ['شنوف', 'عبد الرزاق شنوف'] },
  { name: 'أنور أبو عروة', patterns: ['أبو عروة', 'ابو عروة'] },
  { name: 'بوسعادي', patterns: ['بوسعادي'] },
  { name: 'قادري رياض', patterns: ['قادري', 'قادري رياض'] }
];

/**
 * دالة مساعدة لتأخير الطلبات لتفادي حظر الشبكة
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * جلب نتائج البحث من يوتيوب باستخدام استعلام محدد
 */
async function searchYouTube(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.youtube.com/results?search_query=${encodedQuery}&hl=ar`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      }
    });
    
    if (!res.ok) {
      console.warn(`[YouTube Researcher] HTTP Error ${res.status} for query: ${query}`);
      return [];
    }

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) {
      return [];
    }

    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents || !contents.length) return [];

    const items = contents[0]?.itemSectionRenderer?.contents || [];
    const videos = [];

    for (const item of items) {
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        const videoId = v.videoId;
        if (!videoId || videoId.length !== 11) continue;

        const title = v.title?.runs?.[0]?.text || v.title?.accessibility?.accessibilityData?.label || '';
        const channel = v.ownerText?.runs?.[0]?.text || '';
        const duration = v.lengthText?.simpleText || '';
        const published_at = v.publishedTimeText?.simpleText || '';
        const descSnippet = v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '';
        
        let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        if (v.thumbnail?.thumbnails?.length) {
          thumbnail = v.thumbnail.thumbnails[v.thumbnail.thumbnails.length - 1].url;
        }

        videos.push({
          youtube_id: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: title.trim(),
          channel: channel.trim(),
          duration,
          published_at,
          thumbnail,
          description: descSnippet.trim()
        });
      }
    }

    return videos;
  } catch (err) {
    console.error(`[YouTube Researcher] Fetch error for query "${query}":`, err.message);
    return [];
  }
}

/**
 * تحديد الأستاذ بدقة من خلال اسم القناة والعنوان
 * إذا لم يكن مؤكداً -> null
 */
function identifyTeacher(channel, title, description) {
  const text = `${channel} ${title} ${description}`.toLowerCase();
  for (const t of KNOWN_TEACHERS) {
    for (const pat of t.patterns) {
      if (text.includes(pat.toLowerCase())) {
        return t.name;
      }
    }
  }
  return null;
}

/**
 * تحديد الدرس المرشح (Candidate Lesson)
 * إذا لم يتطابق مع أي درس -> null
 */
function identifyLessonCandidate(title, description, fallbackLesson) {
  const text = `${title} ${description}`;
  for (const l of TARGET_LESSONS) {
    // التحقق من عنوان الدرس كاملاً أو أجزائه الدالة
    if (text.includes(l.title)) return l.title;
    
    // شروط مطابقة دقيقة
    if (l.title === 'العادة والإرادة' && (text.includes('العادة') && text.includes('الإرادة') || text.includes('العادة والارادة'))) {
      return l.title;
    }
    if (l.title === 'الإحساس والإدراك' && (text.includes('الإحساس') && text.includes('الإدراك') || text.includes('الاحساس والادراك'))) {
      return l.title;
    }
    if (l.title === 'اللغة والفكر' && text.includes('اللغة') && text.includes('الفكر')) {
      return l.title;
    }
    if (l.title === 'الشعور واللاشعور' && (text.includes('الشعور') && text.includes('اللاشعور') || text.includes('اللاشعور'))) {
      return l.title;
    }
    if (l.title === 'الذاكرة والخيال' && (text.includes('الذاكرة') || text.includes('النسيان') || text.includes('الإبداع') || text.includes('الابداع'))) {
      return l.title;
    }
    if (l.title === 'الحرية والمسؤولية' && (text.includes('الحرية') && text.includes('المسؤولية'))) {
      return l.title;
    }
    if (l.title === 'فلسفة الرياضيات' && (text.includes('الرياضيات') && (text.includes('اليقين الرياضي') || text.includes('المفاهيم الرياضية') || text.includes('فلسفة الرياضيات')))) {
      return l.title;
    }
    if (l.title === 'علوم المادة الجامدة وعلوم المادة الحية' && (text.includes('المادة الحية') || text.includes('المنهج التجريبي') || text.includes('الفرضية') || text.includes('الحتمية'))) {
      return l.title;
    }
    if (l.title === 'العلوم الإنسانية' && (text.includes('العلوم الإنسانية') || text.includes('علم التاريخ') || text.includes('علم الاجتماع') || text.includes('علم النفس'))) {
      return l.title;
    }
  }

  // إذا لم نجد تطابقاً كلياً، نفحص fallbackLesson من سياق الاستعلام
  if (fallbackLesson && text.includes(fallbackLesson)) {
    return fallbackLesson;
  }

  return null;
}

/**
 * تحديد الشعبة (Branch)
 */
function identifyBranch(title, description) {
  const text = `${title} ${description}`;
  if (text.includes('آداب وفلسفة') || text.includes('اداب و فلسفة') || text.includes('آداب و فلسفة') || text.includes('اداب وفلسفة') || text.includes('أدب وفلسفة')) {
    return 'آداب وفلسفة';
  }
  if (text.includes('شعب علمية') || text.includes('علوم تجريبية') || text.includes('تقني رياضي') || text.includes('رياضيات')) {
    return 'شعب علمية';
  }
  if (text.includes('جميع الشعب') || text.includes('لكل الشعب')) {
    return 'جميع الشعب';
  }
  return null;
}

/**
 * تصنيف نوع الفيديو (Video Type)
 */
function classifyVideoType(title, description) {
  const text = `${title} ${description}`;
  
  if (text.includes('منهجية') || text.includes('طريقة المقال') || text.includes('طريقة الاستقصاء') || text.includes('طريقة المقارنة') || text.includes('تحليل نص')) {
    return 'methodology';
  }
  if (text.includes('مقال') || text.includes('مقالة') || text.includes('جدلية') || text.includes('هل التكيف') || text.includes('هل الإدراك') || text.includes('هل اللغة')) {
    return 'essay';
  }
  if (text.includes('مراجعة شاملة') || text.includes('المراجعة النهائية') || text.includes('مراجعة ليلة الامتحان')) {
    return 'revision';
  }
  if (text.includes('حل موضوع') || text.includes('تصحيح موضوع') || text.includes('موضوع مقترح')) {
    return 'exam_solution';
  }
  if (text.includes('بكالوريا') || text.includes('باك') || text.includes('BAC') || text.includes('توقعات')) {
    return 'bac_preparation';
  }
  if (text.includes('ملخص') || text.includes('مخطط') || text.includes('خريطة ذهنية') || text.includes('في 10 دقائق')) {
    return 'summary';
  }
  if (text.includes('تمرين') || text.includes('تطبيقات')) {
    return 'exercise';
  }
  if (text.includes('درس') || text.includes('شرح') || text.includes('الجزء')) {
    return 'lesson';
  }
  return 'other';
}

/**
 * حساب نسبة الثقة الأولية بناءً على الأدلة الصريحة
 */
function calculateDiscoveryConfidence({ teacher, lesson_candidate, branch, title, queriesCount }) {
  let score = 0.2; // الأساس

  if (teacher) score += 0.25;
  if (lesson_candidate) score += 0.25;
  if (branch === 'آداب وفلسفة') score += 0.15;
  else if (branch === 'جميع الشعب') score += 0.05;
  
  if (title.includes('3AS') || title.includes('3 ثانوي') || title.includes('الثالثة ثانوي') || title.includes('بكالوريا') || title.includes('باك')) {
    score += 0.1;
  }

  if (queriesCount > 1) score += 0.05;

  return Math.min(0.95, parseFloat(score.toFixed(2)));
}

/**
 * المحرك الرئيسي للوكيل: تشغيل عملية الاكتشاف الكاملة
 */
async function runDiscovery(targetLessons = null) {
  const lessonsToProcess = targetLessons || TARGET_LESSONS;
  console.log(`\n======================================================`);
  console.log(`[AGENT 02 - YOUTUBE RESEARCHER] بدء دورة الاكتشاف`);
  console.log(`عدد الدروس المستهدفة: ${lessonsToProcess.length}`);
  console.log(`======================================================\n`);

  const rawDiscovered = new Map(); // key: youtube_id -> record
  let totalSearches = 0;

  for (const lesson of lessonsToProcess) {
    console.log(`\n[+] جاري البحث للدرس: "${lesson.title}" (${lesson.unit})`);

    for (const tmpl of QUERY_TEMPLATES) {
      const q = tmpl(lesson.title);
      totalSearches++;
      process.stdout.write(`    -> استعلام: "${q}" ... `);

      const results = await searchYouTube(q);
      process.stdout.write(`عُثر على ${results.length} فيديو\n`);

      for (const item of results) {
        if (rawDiscovered.has(item.youtube_id)) {
          // دمج الاستعلامات للفيديو المتكرر
          const existing = rawDiscovered.get(item.youtube_id);
          if (!existing.queries.includes(q)) {
            existing.queries.push(q);
          }
        } else {
          // تسجيل فيديو جديد
          const teacher = identifyTeacher(item.channel, item.title, item.description);
          const lesson_candidate = identifyLessonCandidate(item.title, item.description, lesson.title);
          const branch = identifyBranch(item.title, item.description);
          const type = classifyVideoType(item.title, item.description);

          const record = {
            youtube_id: item.youtube_id,
            url: item.url,
            title: item.title,
            channel: item.channel,
            teacher: teacher, // لا نخترع، إذا غير مؤكد = null
            duration: item.duration,
            published_at: item.published_at,
            thumbnail: item.thumbnail,
            description: item.description,
            lesson_candidate: lesson_candidate, // إذا غير مؤكد = null
            branch: branch,
            grade: "3AS",
            type: type,
            queries: [q],
            confidence: 0, // سيُحسب تالياً
            status: "discovered" // لم يتم اعتماده بعد (DISCOVERY ONLY)
          };

          rawDiscovered.set(item.youtube_id, record);
        }
      }

      // راحة 1 ثانية بين الاستعلامات لتجنب حظر الشبكة
      await sleep(1000);
    }
  }

  // حساب الثقة وتجهيز القائمة النهائية
  const finalResults = Array.from(rawDiscovered.values()).map(rec => {
    rec.confidence = calculateDiscoveryConfidence({
      teacher: rec.teacher,
      lesson_candidate: rec.lesson_candidate,
      branch: rec.branch,
      title: rec.title,
      queriesCount: rec.queries.length
    });
    return rec;
  });

  // ترتيب النتائج حسب الثقة تنازلياً
  finalResults.sort((a, b) => b.confidence - a.confidence);

  console.log(`\n======================================================`);
  console.log(`[AGENT 02 - YOUTUBE RESEARCHER] اكتملت دورة الاكتشاف بنجاح`);
  console.log(`إجمالي الاستعلامات المنفذة: ${totalSearches}`);
  console.log(`إجمالي الفيديوهات الفريدة المكتشفة: ${finalResults.length}`);
  console.log(`======================================================\n`);

  // حفظ المخرجات في مسار قاعدة البيانات المرحلية
  const outDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/raw/youtube');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'discovered_videos.json');
  fs.writeFileSync(jsonPath, JSON.stringify(finalResults, null, 2), 'utf-8');
  console.log(`[+] تم حفظ البيانات المكتشفة في: ${jsonPath}`);

  // توليد ملخص الاكتشاف
  generateSummaryMarkdown(finalResults, path.join(outDir, 'DISCOVERY_SUMMARY.md'));

  return finalResults;
}

/**
 * توليد تقرير markdown احترافي للنتائج
 */
function generateSummaryMarkdown(videos, outputPath) {
  const byLesson = {};
  const byTeacher = {};
  let withTeacher = 0;
  let artsBranch = 0;

  videos.forEach(v => {
    const l = v.lesson_candidate || 'غير محدد';
    byLesson[l] = (byLesson[l] || 0) + 1;

    const t = v.teacher || 'أستاذ غير محدد';
    byTeacher[t] = (byTeacher[t] || 0) + 1;

    if (v.teacher) withTeacher++;
    if (v.branch === 'آداب وفلسفة') artsBranch++;
  });

  let md = `# تقرير نتائج وكيل الاكتشاف (YouTube Researcher Agent)\n\n`;
  md += `**تاريخ التشغيل:** ${new Date().toLocaleString('ar-DZ')}\n`;
  md += `**إجمالي الفيديوهات المكتشفة والمجردة من التكرار:** ${videos.length}\n`;
  md += `**فيديوهات بأساتذة مؤكدين:** ${withTeacher} (${((withTeacher/videos.length)*100).toFixed(1)}%)\n`;
  md += `**فيديوهات صريحة لشعبة آداب وفلسفة:** ${artsBranch}\n\n`;

  md += `## 1. توزيع الفيديوهات حسب الدروس المرشحة\n\n`;
  md += `| الدرس المرشح | عدد الفيديوهات المكتشفة |\n| :--- | :--- |\n`;
  for (const [l, count] of Object.entries(byLesson)) {
    md += `| ${l} | ${count} |\n`;
  }

  md += `\n## 2. توزيع الفيديوهات حسب الأساتذة المعتمدين\n\n`;
  md += `| الأستاذ | عدد الفيديوهات |\n| :--- | :--- |\n`;
  for (const [t, count] of Object.entries(byTeacher)) {
    md += `| ${t} | ${count} |\n`;
  }

  md += `\n## 3. عينة من أعلى الفيديوهات موثوقية (Top Discovered Samples)\n\n`;
  md += `| YouTube ID | العنوان | القناة | الأستاذ | الدرس المرشح | النوع | الثقة |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  videos.slice(0, 20).forEach(v => {
    md += `| \`${v.youtube_id}\` | [${v.title.replace(/\|/g, '-')}](${v.url}) | ${v.channel} | ${v.teacher || '—'} | ${v.lesson_candidate || '—'} | \`${v.type}\` | **${v.confidence}** |\n`;
  });

  md += `\n---\n*تم إعداد هذا التقرير تلقائياً بواسطة Agent 02 (YouTube Researcher) لتسليمه إلى YouTube Classifier و Lesson Mapper و QA.*`;

  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(`[+] تم توليد تقرير الاكتشاف في: ${outputPath}`);
}

// تشغيل الوكيل إذا تم استدعاؤه مباشرة
if (require.main === module) {
  // دعم خيار الفحص للـ Pilot (3 دروس الأولى) أو للكل
  const args = process.argv.slice(2);
  let lessons = null;

  if (args.includes('--pilot')) {
    lessons = TARGET_LESSONS.slice(0, 3); // العادة والإرادة، الإحساس والإدراك، اللغة والفكر
    console.log('[*] تشغيل وضع الـ Pilot على الدروس الثلاثة الأولى.');
  }

  runDiscovery(lessons).catch(err => {
    console.error('Fatal Researcher error:', err);
    process.exit(1);
  });
}

module.exports = { runDiscovery, TARGET_LESSONS };
