/**
 * mordix_ai — DzExams 4AM Exercises Extractor
 * استخراج وتدقيق تمارين وتطبيقات السنة الرابعة متوسط من DzExams
 * مع فك تشفير المعرفات الحقيقية والتحقق من الروابط وملفات PDF
 * بدون أي توليد وهمي (Zero Fake Data) وبدون إيموجيات
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUBJECT_MAPPINGS = [
  { id: 'math_4am', slug: 'mathematiques', name: 'الرياضيات' },
  { id: 'arabic_4am', slug: 'arabe', name: 'اللغة العربية' },
  { id: 'physics_4am', slug: 'physique', name: 'العلوم الفيزيائية والتكنولوجيا' },
  { id: 'science_4am', slug: 'sciences-naturelles', name: 'علوم الطبيعة والحياة' },
  { id: 'french_4am', slug: 'francais', name: 'اللغة الفرنسية' },
  { id: 'english_4am', slug: 'anglais', name: 'اللغة الإنجليزية' },
  { id: 'history_geography_4am', slug: 'histoire-geographie', name: 'التاريخ والجغرافيا' },
  { id: 'islamic_4am', slug: 'tarbia-islamia', name: 'التربية الإسلامية' },
  { id: 'civics_4am', slug: 'tarbia-madania', name: 'التربية المدنية' }
];

// دالة فك تشفير معرّف الوثيقة على DzExams (مبنية على لوجيك المنصة المثبت: Base64 -> charCodeAt - 8)
function decodeDzId(encoded) {
  try {
    const raw = Buffer.from(encoded, 'base64').toString('binary');
    let decoded = '';
    for (let i = 0; i < raw.length; i++) {
      decoded += String.fromCharCode(raw.charCodeAt(i) - 8);
    }
    return decoded;
  } catch (err) {
    return null;
  }
}

// دالة تنظيف الإيموجي الصارمة
function stripEmojis(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fetchUrl(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = 'https://www.dzexams.com' + redirectUrl;
        }
        return resolve(fetchUrl(redirectUrl, maxRedirects - 1));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data });
      });
    }).on('error', err => reject(err));
  });
}

// فلتر استبعاد ما ليس تمريناً وفق تعريف التمرين الصارم في Rule 3
function isExerciseTitle(title) {
  const t = title.toLowerCase();

  // كلمات سلبية تستبعد فوراً
  const negativePatterns = [
    /اختبارات?\s+الفصل/i,
    /فروض?\s+الفصل/i,
    /امتحانات?\s+الفصل/i,
    /شهادة\s+التعليم\s+المتوسط/i,
    /مواضيع\s+شهادة/i,
    /حوليات\s+شهادة/i,
    /مذكرات\s+/i,
    /مذكرة\s+/i,
    /التوزيع\s+السنوي/i,
    /المخطط\s+السنوي/i,
    /كتاب\s+مدرسي/i,
    /الكتاب\s+المدرسي/i,
    /تقويم\s+تشخيصي/i,
    /أولمبياد/i
  ];

  // إذا كان يحتوي على كلمات سلبية صريحة وليس سلسلة تمارين
  for (const neg of negativePatterns) {
    if (neg.test(t) && !/تمارين|سلسلة|تطبيق/i.test(t)) {
      return false;
    }
  }

  // إذا كان مجرد "درس" أو "ملخص" بدون ذكر تمارين
  if (/^درس\s+/i.test(t) || /^دروس\s+/i.test(t) || /^ملخص\s+/i.test(t) || /^الموجز\s+/i.test(t)) {
    if (!/تمارين|تطبيقات|مسائل|سلسلة|مع\s+الحل/i.test(t)) {
      return false;
    }
  }

  // كلمات إيجابية حاسمة للتمارين
  const positivePatterns = [
    /تمرين/i,
    /تمارين/i,
    /سلسلة/i,
    /سلاسل/i,
    /تطبيق/i,
    /تطبيقات/i,
    /مسائل/i,
    /مسألة/i,
    /أنشطة\s+تعلمية/i,
    /أوراق\s+عمل/i,
    /وضعية\s+إدماجية/i,
    /وضعيات\s+إدماجية/i,
    /وضعية\s+ادماجية/i,
    /وضعيات\s+ادماجية/i,
    /حلول\s+تمارين/i,
    /سؤال\s+وجواب/i,
    /سؤال\s+مع\s+الحل/i
  ];

  return positivePatterns.some(pos => pos.test(t));
}

// استخراج اسم الأستاذ من العنوان إن وجد
function extractTeacherFromTitle(title) {
  const match = title.match(/(?:إعداد\s+الأستاذ(?:ة)?|للأستاذ(?:ة)?|الاستاذ(?:ة)?|الأستاذ(?:ة)?)\s+([^\-]+?)(?:\s*-\s*4\s*متوسط|\s*$)/i);
  if (match) {
    return stripEmojis(match[1].trim());
  }
  return null;
}

// تحديد تصنيف نوع التمرين الفرعي
function determineExerciseSubtype(title) {
  const t = title.toLowerCase();
  if (/سلسلة|سلاسل/i.test(t)) return 'series';
  if (/أوراق\s+عمل/i.test(t)) return 'worksheet';
  if (/وضعية\s+إدماجية|وضعيات/i.test(t)) return 'problem';
  if (/تطبيق|تطبيقات/i.test(t)) return 'application';
  if (/حل|محلول|مرفق\s+بالحل/i.test(t)) return 'solved_exercise';
  return 'exercise';
}

async function extractDzExamsSubject(subject) {
  console.log(`\n==================================================`);
  console.log(`Extracting DzExams for: ${subject.name} (${subject.slug})`);
  console.log(`==================================================`);

  const coursUrl = `https://www.dzexams.com/ar/4am/${subject.slug}/cours`;
  let pageRes;
  try {
    pageRes = await fetchUrl(coursUrl);
  } catch (err) {
    console.error(`Error fetching ${coursUrl}:`, err.message);
    return [];
  }

  if (pageRes.statusCode !== 200) {
    console.warn(`Non-200 status code (${pageRes.statusCode}) for ${coursUrl}`);
    return [];
  }

  const html = pageRes.data;
  // النمط لاقتناص data-id وعنوان الوثيقة
  const itemRegex = /<a\s+[^>]*href="#"\s+[^>]*data-id="([^"]+)"[^>]*class="[^"]*btn-item-document[^"]*"[^>]*>[\s\S]*?<span\s+class="doc-title">([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi;
  // نمط بديل إذا اختلف ترتيب السمات
  const itemRegexAlt = /<a\s+[^>]*class="[^"]*btn-item-document[^"]*"[^>]*data-id="([^"]+)"[^>]*>[\s\S]*?<span\s+class="doc-title">([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi;

  const foundDocs = [];
  const seenIds = new Set();

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const rawId = match[1];
    const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
    if (!seenIds.has(rawId)) {
      seenIds.add(rawId);
      foundDocs.push({ rawId, rawTitle });
    }
  }

  while ((match = itemRegexAlt.exec(html)) !== null) {
    const rawId = match[1];
    const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
    if (!seenIds.has(rawId)) {
      seenIds.add(rawId);
      foundDocs.push({ rawId, rawTitle });
    }
  }

  console.log(`Total documents found on ${subject.slug}/cours: ${foundDocs.length}`);

  // تصفية التمارين الصريحة
  const exerciseCandidates = [];
  for (const doc of foundDocs) {
    const cleanTitle = stripEmojis(doc.rawTitle);
    if (isExerciseTitle(cleanTitle)) {
      const decodedSlug = decodeDzId(doc.rawId);
      if (decodedSlug) {
        exerciseCandidates.push({
          rawId: doc.rawId,
          decodedSlug,
          title: cleanTitle,
          teacher: extractTeacherFromTitle(cleanTitle),
          subtype: determineExerciseSubtype(cleanTitle),
          documentUrl: `https://www.dzexams.com/ar/documents/${decodedSlug}`,
          subjectId: subject.id,
          subjectName: subject.name,
          levelId: '4am'
        });
      }
    }
  }

  console.log(`Valid exercise candidates after strict filtering: ${exerciseCandidates.length}`);
  return exerciseCandidates;
}

// التحقق من وثيقة DzExams واستخراج رابط الـ PDF المباشر وتفاصيل المحتوى
async function verifyDzExamsDocument(doc) {
  try {
    const res = await fetchUrl(doc.documentUrl);
    if (res.statusCode !== 200) {
      return {
        ...doc,
        verificationStatus: 'REJECTED',
        rejectionReason: `HTTP_${res.statusCode}`
      };
    }

    const html = res.data;
    // استخراج رابط الـ PDF المباشر إن وجد
    const pdfMatch = html.match(/href="([^"]*(?:uploads\/documents|\.pdf)[^"]*)"/i);
    let directPdfUrl = null;
    if (pdfMatch) {
      directPdfUrl = pdfMatch[1];
      if (directPdfUrl.startsWith('/')) {
        directPdfUrl = 'https://www.dzexams.com' + directPdfUrl;
      }
    }

    // استخراج الأستاذ إن لم يكن معروفاً من العنوان
    let teacher = doc.teacher;
    if (!teacher) {
      const teacherPageMatch = html.match(/(?:إعداد\s+الأستاذ(?:ة)?|للأستاذ(?:ة)?|الاستاذ(?:ة)?|الأستاذ(?:ة)?)\s+([^<]+?)(?:-|\s*<\/span>|\s*$)/i);
      if (teacherPageMatch) {
        teacher = stripEmojis(teacherPageMatch[1].replace(/4\s*متوسط/g, '').trim());
      }
    }

    return {
      ...doc,
      directPdfUrl,
      teacher,
      urlClassification: directPdfUrl ? 'DIRECT_RESOURCE' : 'SOURCE_PAGE',
      verificationStatus: 'SAFE_TO_IMPORT',
      provenance: {
        source: 'dzexams',
        sourcePage: `https://www.dzexams.com/ar/4am/${doc.subjectId}/cours`,
        documentUrl: doc.documentUrl,
        directPdfUrl,
        rawToken: doc.rawId,
        decodedToken: doc.decodedSlug,
        extractedAt: new Date().toISOString()
      }
    };
  } catch (err) {
    return {
      ...doc,
      verificationStatus: 'NEEDS_VERIFICATION',
      error: err.message
    };
  }
}

async function main() {
  console.log('Starting Phase 10: DzExams 4AM Exercises Extraction...');
  const allCandidates = [];

  for (const s of SUBJECT_MAPPINGS) {
    const candidates = await extractDzExamsSubject(s);
    allCandidates.push(...candidates);
  }

  console.log(`\nTotal exercise candidates extracted across 9 subjects: ${allCandidates.length}`);

  console.log('\nVerifying document pages and extracting PDF links with batch concurrency (10)...');
  const verifiedDocs = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < allCandidates.length; i += BATCH_SIZE) {
    const chunk = allCandidates.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(chunk.map(d => verifyDzExamsDocument(d)));
    verifiedDocs.push(...results);
    const progress = Math.min(i + BATCH_SIZE, allCandidates.length);
    console.log(`Verified ${progress} of ${allCandidates.length} documents...`);
  }

  const safeCount = verifiedDocs.filter(d => d.verificationStatus === 'SAFE_TO_IMPORT').length;
  const rejectedCount = verifiedDocs.filter(d => d.verificationStatus === 'REJECTED').length;
  const needsReviewCount = verifiedDocs.filter(d => d.verificationStatus === 'NEEDS_VERIFICATION').length;

  console.log(`\nExtraction & Verification Complete:`);
  console.log(`- Total Extracted: ${verifiedDocs.length}`);
  console.log(`- SAFE_TO_IMPORT: ${safeCount}`);
  console.log(`- NEEDS_VERIFICATION: ${needsReviewCount}`);
  console.log(`- REJECTED: ${rejectedCount}`);

  const outputDir = path.join(__dirname, '../../data/pipeline/raw');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'dzexams_4am_exercises_raw.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    metadata: {
      source: 'dzexams',
      levelId: '4am',
      totalExtracted: verifiedDocs.length,
      safeToImport: safeCount,
      needsVerification: needsReviewCount,
      rejected: rejectedCount,
      extractedAt: new Date().toISOString()
    },
    items: verifiedDocs
  }, null, 2), 'utf8');

  console.log(`Saved raw DzExams exercises to: ${outputFile}`);
}

main().catch(err => {
  console.error('Fatal error in DzExams exercises extractor:', err);
  process.exit(1);
});
