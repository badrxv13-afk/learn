/**
 * AGENT 03: YOUTUBE CLASSIFIER (مصنف فيديوهات يوتيوب التعليمية)
 * 
 * الهدف: استلام مخرجات Agent 02 (YouTube Researcher) وتدقيق كل فيديو عبر:
 * - هل هو تعليمي فعلاً؟
 * - هل هو فلسفة؟
 * - هل يخص 3AS؟
 * - هل يخص شعبة آداب وفلسفة؟
 * - ما الدرس الذي ينتمي إليه؟
 * - طبيعة المحتوى (شرح كامل، مقال، منهجية، مراجعة، حل موضوع، خارج المنهاج)
 * 
 * المخرجات:
 * - classification
 * - confidence
 * - confidence_reasons
 * - decision (ACCEPT | NEEDS_REVIEW | REJECT)
 */

const fs = require('fs');
const path = require('path');

// الكلمات المفتاحية للمصادقة على مادة الفلسفة
const PHILOSOPHY_KEYWORDS = [
  'فلسفة', 'فلسفي', 'فلسفية', 'مقالة', 'مقال', 'أطروحة', 'نقيض', 'تركيب', 
  'جدلية', 'استقصاء', 'تحليل نص', 'الإشكالية', 'المشكلة', 'الإدراك', 'الإحساس',
  'العادة', 'الإرادة', 'اللغة', 'الفكر', 'الشعور', 'اللاشعور', 'الذاكرة', 'الخيال',
  'النسيان', 'الأخلاق', 'العدالة', 'الحقوق', 'الواجبات', 'الحرية', 'المسؤولية',
  'العنف', 'التسامح', 'الديمقراطية', 'الرياضيات', 'المنهج التجريبي', 'البيولوجيا',
  'العلوم الإنسانية', 'التكيف', 'ديكارت', 'أرسطو', 'أفلاطون', 'كانط', 'سارتر',
  'برغسون', 'ابن رشد', 'الفارابي', 'الغزالي', 'هيجل', 'ماركس'
];

// الكلمات التي تدل على البكالوريا الجزائرية ومستوى 3 ثانوي
const ALGERIAN_3AS_KEYWORDS = [
  '3as', '3 ثانوي', 'ثالثة ثانوي', 'الثالثة ثانوي', 'بكالوريا', 'باك', 'bac',
  'الجزائر', 'وزارة التربية', 'مفتشية', 'امتحان البكالوريا'
];

// الكلمات التي تشير لشعبة آداب وفلسفة
const ARTS_BRANCH_KEYWORDS = [
  'آداب وفلسفة', 'اداب وفلسفة', 'آداب و فلسفة', 'اداب و فلسفة', 'أدب وفلسفة',
  'الشعبة الأدبية', 'شعبة الآداب', 'أدبي', 'أدبيين'
];

// الكلمات التي تشير إلى شعب أخرى (علمية / لغات)
const OTHER_BRANCH_KEYWORDS = [
  'علوم تجريبية', 'شعب علمية', 'علميين', 'تقني رياضي', 'رياضيات', 'تسيير واقتصاد',
  'لغات أجنبية'
];

/**
 * تصنيف وفحص الفيديو الواحد
 */
function classifyVideo(video) {
  const fullText = `${video.title} ${video.description} ${video.channel}`.toLowerCase();
  const titleText = video.title.toLowerCase();
  
  const reasons = [];
  let confidence = 0.2;

  // 1. هل هو تعليمي؟
  const isEducational = (
    video.channel.includes('أستاذ') || 
    video.channel.includes('استاذ') || 
    video.channel.includes('prof') || 
    video.channel.includes('قناة') ||
    video.channel.includes('فلسفة') ||
    video.teacher !== null ||
    titleText.includes('درس') ||
    titleText.includes('شرح') ||
    titleText.includes('مقال') ||
    titleText.includes('منهجية') ||
    titleText.includes('مراجعة')
  );

  if (!isEducational) {
    reasons.push('المحتوى لا يبدو تعليمياً أو غير مرتبط ببيئة تعليمية');
  } else {
    confidence += 0.2;
    reasons.push('المحتوى تعليمي ومقدم من قناة أو أستاذ تعليمي');
  }

  // 2. هل هو فلسفة؟
  let philosophyScore = 0;
  for (const kw of PHILOSOPHY_KEYWORDS) {
    if (fullText.includes(kw)) philosophyScore++;
  }
  const isPhilosophy = philosophyScore >= 1;
  if (isPhilosophy) {
    confidence += 0.2;
    reasons.push(`مرتبط بمادة الفلسفة (تطابق ${philosophyScore} مصطلحات فلسفية)`);
  } else {
    reasons.push('لا توجد مصطلحات فلسفية كافية في العنوان والوصف');
  }

  // 3. هل يخص 3AS؟
  let is3AS = false;
  for (const kw of ALGERIAN_3AS_KEYWORDS) {
    if (fullText.includes(kw)) {
      is3AS = true;
      break;
    }
  }
  if (is3AS) {
    confidence += 0.15;
    reasons.push('إشارة صريحة لمستوى الثالثة ثانوي / البكالوريا الجزائرية');
  } else {
    reasons.push('المستوى غير مذكور صراحة، قد يكون لمستوى آخر أو فلسفة جامعية');
  }

  // 4. هل يخص شعبة آداب وفلسفة؟
  let branchStatus = 'unknown';
  const hasArtsMention = ARTS_BRANCH_KEYWORDS.some(kw => fullText.includes(kw));
  const hasOtherMention = OTHER_BRANCH_KEYWORDS.some(kw => fullText.includes(kw));

  if (hasArtsMention && !hasOtherMention) {
    branchStatus = 'arts_and_philosophy';
    confidence += 0.2;
    reasons.push('موجه خصيصاً لشعبة آداب وفلسفة');
  } else if (hasArtsMention && hasOtherMention) {
    branchStatus = 'shared_streams';
    confidence += 0.1;
    reasons.push('مشترك بين شعبة آداب وفلسفة وشعب أخرى');
  } else if (!hasArtsMention && hasOtherMention) {
    branchStatus = 'scientific_or_other';
    reasons.push('موجه للشعب العلمية أو اللغات الأجنبية (محتوى جزئي فقط يطابق الآداب)');
  } else {
    // لم تُذكر الشعبة بالاسم ولكن الدرس ضمن تخصص الآداب (مثل العادة والإرادة)
    if (video.lesson_candidate === 'العادة والإرادة') {
      branchStatus = 'arts_and_philosophy';
      confidence += 0.15;
      reasons.push('درس العادة والإرادة مقرر حصري لآداب وفلسفة في 3AS');
    } else {
      branchStatus = 'general_philosophy';
      confidence += 0.05;
      reasons.push('الشعبة غير مصرح بها نصاً ولكنها مقبولة مبدئياً');
    }
  }

  // 5. الأستاذ
  if (video.teacher) {
    confidence += 0.1;
    reasons.push(`الأستاذ موثوق ومعتمد بالجزائر: ${video.teacher}`);
  }

  // 6. تصنيف طبيعة المحتوى التفصيلي
  let pedagogical_type = 'lesson';
  if (titleText.includes('منهجية') || titleText.includes('طريقة') || titleText.includes('استقصاء') || titleText.includes('جدلية')) {
    pedagogical_type = 'methodology_or_essay';
  } else if (titleText.includes('مقال') || titleText.includes('مقالة')) {
    pedagogical_type = 'essay';
  } else if (titleText.includes('مراجعة') || titleText.includes('ملخص')) {
    pedagogical_type = 'revision_or_summary';
  } else if (titleText.includes('حل موضوع') || titleText.includes('تصحيح') || titleText.includes('بكالوريا تجريبية')) {
    pedagogical_type = 'exam_solution';
  }

  // 7. اتخاذ القرار النهائي للوكيل (Decision)
  let decision = 'REJECT';
  confidence = Math.min(0.98, parseFloat(confidence.toFixed(2)));

  if (isEducational && isPhilosophy && is3AS && (branchStatus === 'arts_and_philosophy' || branchStatus === 'shared_streams')) {
    decision = confidence >= 0.7 ? 'ACCEPT_HIGH_CONFIDENCE' : 'ACCEPT_MODERATE';
  } else if (isEducational && isPhilosophy && is3AS) {
    decision = 'NEEDS_REVIEW';
  } else if (isEducational && isPhilosophy && confidence >= 0.5) {
    decision = 'NEEDS_REVIEW';
  } else {
    decision = 'REJECT';
  }

  return {
    youtube_id: video.youtube_id,
    url: video.url,
    title: video.title,
    channel: video.channel,
    teacher: video.teacher,
    duration: video.duration,
    published_at: video.published_at,
    thumbnail: video.thumbnail,
    lesson: video.lesson_candidate,
    branch_status: branchStatus,
    pedagogical_type,
    confidence,
    decision,
    reasons
  };
}

/**
 * معالجة ملف الفيديوهات المكتشفة وتوليد التصنيف
 */
function runClassifier(inputPath = null, outputPath = null) {
  const inPath = inputPath || path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/raw/youtube/discovered_videos.json');
  const outDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/normalized');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const outPath = outputPath || path.join(outDir, 'classified_youtube_videos.json');

  if (!fs.existsSync(inPath)) {
    console.error(`[Agent 03 - Classifier] Input file not found: ${inPath}`);
    return [];
  }

  const raw = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  console.log(`\n======================================================`);
  console.log(`[AGENT 03 - YOUTUBE CLASSIFIER] بدء تصنيف الفيديوهات`);
  console.log(`عدد الفيديوهات المستلمة: ${raw.length}`);
  console.log(`======================================================\n`);

  const classified = raw.map(classifyVideo);

  // إحصائيات التصنيف
  const stats = {
    ACCEPT_HIGH_CONFIDENCE: 0,
    ACCEPT_MODERATE: 0,
    NEEDS_REVIEW: 0,
    REJECT: 0
  };

  classified.forEach(c => {
    stats[c.decision] = (stats[c.decision] || 0) + 1;
  });

  console.log('نتائج التصنيف:');
  console.log(`  - قبول بثقة عالية (ACCEPT_HIGH): ${stats.ACCEPT_HIGH_CONFIDENCE}`);
  console.log(`  - قبول بثقة معتدلة (ACCEPT_MODERATE): ${stats.ACCEPT_MODERATE}`);
  console.log(`  - يحتاج مراجعة بشرية / تدقيق إضافي (NEEDS_REVIEW): ${stats.NEEDS_REVIEW}`);
  console.log(`  - مرفوض (REJECT): ${stats.REJECT}`);

  fs.writeFileSync(outPath, JSON.stringify(classified, null, 2), 'utf-8');
  console.log(`[+] تم حفظ نتائج التصنيف في: ${outPath}\n`);

  return classified;
}

if (require.main === module) {
  runClassifier();
}

module.exports = { classifyVideo, runClassifier };
