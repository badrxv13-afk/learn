/**
 * mordix_ai — Step 2: Competitor Candidates Normalizer
 * 
 * يقرأ data/pipeline/raw/competitor_4am_discovery.json
 * ويطابق كل عنصر مع المنهاج القانوني لـ 4AM في data/four_am.js
 * وينشئ صيغ البحث في YouTube
 */

const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../..');
const rawPath = path.join(baseDir, 'data/pipeline/raw/competitor_4am_discovery.json');
const fourAmPath = path.join(baseDir, 'data/four_am.js');
const normOutputPath = path.join(baseDir, 'data/pipeline/normalized/competitor_4am_candidates.json');

console.log('=== بدء تطبيع بيانات المنافس (NORMALIZATION) ===');

// 1. تحميل المنهاج الرسمي المعتمد
global.window = {};
eval(fs.readFileSync(fourAmPath, 'utf8'));
const curriculum = global.window.PlatformData4AM;

const canonicalLessons = new Map();
const canonicalSubjects = new Map();

for (const [subjKey, subjData] of Object.entries(curriculum)) {
  canonicalSubjects.set(subjKey, subjData);
  for (const l of subjData.lessons) {
    const lId = l.lessonId || l.canonical_id;
    canonicalLessons.set(lId, {
      lessonId: lId,
      canonical_id: l.canonical_id,
      title: l.title,
      subjectId: subjKey,
      subjectName: subjData.name || subjData.title
    });
  }
}

// دالة مطابقة عنوان الدرس مع المعرف القانوني
function matchCanonicalLesson(subjectId, rawTitle) {
  if (!rawTitle || rawTitle === 'المراجعات النهائية') return null;
  const subj = curriculum[subjectId];
  if (!subj || !subj.lessons) return null;

  const clean = rawTitle.replace(/[()\-–.,]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. مطابقة مباشرة
  for (const l of subj.lessons) {
    const lClean = l.title.replace(/[()\-–.,]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (clean === lClean) return l;
  }

  // 2. مطابقة بالكلمات المفتاحية
  let best = null;
  let maxOverlap = 0;
  const cleanWords = clean.split(' ').filter(w => w.length > 2);

  for (const l of subj.lessons) {
    const lWords = l.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let overlap = 0;
    for (const w of cleanWords) {
      if (lWords.some(lw => lw.includes(w) || w.includes(lw))) overlap++;
    }
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      best = l;
    }
  }

  if (maxOverlap >= 2 || (cleanWords.length === 1 && maxOverlap === 1)) {
    return best;
  }
  return null;
}

// 2. قراءة البيانات الخام
const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const rawItems = rawData.items;

const normalizedCandidates = [];
const seenKey = new Set();
let duplicatesCount = 0;

for (const item of rawItems) {
  const dedupKey = `${item.subjectId}___${item.channelName}___${item.discoveredTitle}`.toLowerCase();
  if (seenKey.has(dedupKey)) {
    duplicatesCount++;
    continue;
  }
  seenKey.add(dedupKey);

  // البحث عن الدرس القانوني
  const matchedLesson = matchCanonicalLesson(item.subjectId, item.lessonTitle);
  const lessonId = matchedLesson ? (matchedLesson.lessonId || matchedLesson.canonical_id) : null;
  const canonicalLessonTitle = matchedLesson ? matchedLesson.title : (item.lessonTitle || '');

  // بناء استعلامات البحث في YouTube
  const cleanTitle = item.discoveredTitle.replace(/[|«»"]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanChannel = item.channelName.replace(/[|«»"]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanTeacher = item.teacherName.replace(/[|«»"]/g, ' ').replace(/\s+/g, ' ').trim();

  const queries = [
    `"${cleanTitle}" "${cleanChannel}"`,
    `"${cleanTitle}" 4 متوسط`,
    `"${cleanChannel}" "${canonicalLessonTitle}" 4 متوسط`
  ];

  normalizedCandidates.push({
    candidateId: `cand-${normalizedCandidates.length + 1}`,
    levelId: '4am',
    subjectId: item.subjectId,
    subjectName: item.subjectName,
    lessonId: lessonId,
    lessonTitle: canonicalLessonTitle,
    rawLessonTitle: item.lessonTitle,
    resourceType: item.resourceType,
    channelName: item.channelName,
    teacherName: item.teacherName,
    discoveredTitle: item.discoveredTitle,
    sourceFile: item.sourceFile,
    sourceUrl: item.sourceUrl,
    searchQueries: queries,
    status: 'DISCOVERY_CANDIDATE',
    normalizedAt: new Date().toISOString()
  });
}

const normOutput = {
  metadata: {
    dataset: 'competitor_4am_candidates',
    levelId: '4am',
    totalRawItems: rawItems.length,
    duplicatesRemoved: duplicatesCount,
    totalUniqueCandidates: normalizedCandidates.length,
    generatedAt: new Date().toISOString()
  },
  candidates: normalizedCandidates
};

fs.mkdirSync(path.dirname(normOutputPath), { recursive: true });
fs.writeFileSync(normOutputPath, JSON.stringify(normOutput, null, 2), 'utf8');

console.log('=== اكتمل تطبيع المرشحين (NORMALIZATION) ===');
console.log(`- إجمالي العناصر الأصلية: ${rawItems.length}`);
console.log(`- التكرارات المستبعدة: ${duplicatesCount}`);
console.log(`- المرشحين الفريدين: ${normalizedCandidates.length}`);
console.log(`- مسار الحفظ: ${normOutputPath}`);

// إحصائية حسب المادة والدرس
const bySubjLesson = {};
normalizedCandidates.forEach(c => {
  const k = `${c.subjectName} -> ${c.lessonTitle || 'مراجعات عامة'} (${c.resourceType})`;
  bySubjLesson[k] = (bySubjLesson[k] || 0) + 1;
});
console.log('\nتوزيع المرشحين الفريدين:');
console.log(bySubjLesson);
