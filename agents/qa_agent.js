/**
 * AGENT 12: FINAL QA AGENT (وكيل مراقبة الجودة وضمان المعايير)
 * 
 * الهدف: فحص الموارد بعد انتهاء جميع مراحل التصنيف والربط:
 * - التحقق من صحة الرابط والمعرف
 * - مطابقة الدرس والشعبة
 * - فحص التناقضات
 * - تدقيق نسبة الثقة (Confidence Threshold)
 * - التحقق من سلامة البنية (Schema Validation)
 * 
 * المخرجات:
 * - قبول -> verified/
 * - رفض -> rejected/ (مع ذكر السبب بدقة)
 */

const fs = require('fs');
const path = require('path');

const MIN_CONFIDENCE_THRESHOLD = 0.65;

function validateAndGate(resource) {
  const issues = [];

  // 1. فحص معرف اليوتيوب
  if (!resource.youtube_id || resource.youtube_id.length !== 11) {
    issues.push('معرف فيديو غير صالح (يجب أن يتكون من 11 حرفاً)');
  }

  // 2. فحص الرابط
  if (!resource.url || !resource.url.includes('youtube.com/watch?v=')) {
    issues.push('رابط الفيديو غير صالح');
  }

  // 3. فحص عنوان الفيديو
  if (!resource.title || resource.title.trim().length < 5) {
    issues.push('عنوان الفيديو مفقود أو قصير جداً');
  }

  // 4. فحص القناة
  if (!resource.channel || resource.channel.trim().length === 0) {
    issues.push('اسم القناة مفقود');
  }

  // 5. فحص الدرس
  if (!resource.canonical_lesson) {
    issues.push('الدرس غير محدد أو غير مطابق للمنهاج الرسمي');
  }

  // 6. فحص الوحدة التعليمية / الإشكالية
  if (!resource.curriculum_unit) {
    issues.push('الإشكالية / الوحدة التعليمية غير مرتبطة');
  }

  // 7. فحص الشعبة والمستوى
  if (resource.grade !== '3AS') {
    issues.push('المستوى الدراسي غير مطابق لـ 3AS');
  }

  if (resource.branch_status === 'scientific_or_other') {
    issues.push('المحتوى مخصص للشعب العلمية فقط ولا يطابق آداب وفلسفة');
  }

  // 8. فحص القرار المبدئي لـ Classifier
  if (resource.decision === 'REJECT') {
    issues.push('مرفوض مسبقاً من وكيل التصنيف (YouTube Classifier)');
  }

  // 9. فحص نسبة الثقة
  if (resource.confidence < MIN_CONFIDENCE_THRESHOLD) {
    issues.push(`نسبة الثقة (${resource.confidence}) أقل من الحد الأدنى المقبول (${MIN_CONFIDENCE_THRESHOLD})`);
  }

  const passed = issues.length === 0;

  return {
    ...resource,
    qa_passed: passed,
    qa_checked_at: new Date().toISOString(),
    qa_issues: issues
  };
}

/**
 * تشغيل فحص الجودة الشامل على الموارد المربوطة
 */
function runQAGate(inputPath = null) {
  const inPath = inputPath || path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/normalized/mapped_resources.json');
  const verDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/verified');
  const rejDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/rejected');

  if (!fs.existsSync(verDir)) fs.mkdirSync(verDir, { recursive: true });
  if (!fs.existsSync(rejDir)) fs.mkdirSync(rejDir, { recursive: true });

  if (!fs.existsSync(inPath)) {
    console.error(`[Agent 12 - QA Agent] Input not found: ${inPath}`);
    return { verified: [], rejected: [] };
  }

  const items = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  console.log(`\n======================================================`);
  console.log(`[AGENT 12 - FINAL QA GATE] بدء بوابة التدقيق الصارمة`);
  console.log(`عدد الموارد الخاضعة للتدقيق: ${items.length}`);
  console.log(`======================================================\n`);

  const results = items.map(validateAndGate);
  const verified = results.filter(r => r.qa_passed);
  const rejected = results.filter(r => !r.qa_passed);

  console.log(`نتائج تدقيق الجودة:`);
  console.log(`  - مجاز بنجاح (VERIFIED): ${verified.length} (${((verified.length/items.length)*100).toFixed(1)}%)`);
  console.log(`  - مرفوض / استبعاد (REJECTED): ${rejected.length} (${((rejected.length/items.length)*100).toFixed(1)}%)`);

  const verPath = path.join(verDir, 'verified_youtube_videos.json');
  const rejPath = path.join(rejDir, 'rejected_youtube_videos.json');

  fs.writeFileSync(verPath, JSON.stringify(verified, null, 2), 'utf-8');
  fs.writeFileSync(rejPath, JSON.stringify(rejected, null, 2), 'utf-8');

  console.log(`[+] تم حفظ الموارد المعتمدة في: ${verPath}`);
  console.log(`[+] تم حفظ الموارد المرفوضة في: ${rejPath}\n`);

  return { verified, rejected };
}

if (require.main === module) {
  runQAGate();
}

module.exports = { validateAndGate, runQAGate };
