/**
 * AGENT 07: LESSON MAPPER (رابط الموارد بهيكل المنهاج الرسمي)
 * 
 * الهدف: ربط الموارد المصنفة بالهيكل الهرمي الدقيق للمنهاج:
 * الفلسفة -> 3AS -> آداب وفلسفة -> الإشكالية -> الدرس
 * 
 * إذا لم يكن الربط مؤكداً:
 * confidence < threshold
 * status = "needs_review"
 * ولا يدخل مباشرة إلى production.
 */

const fs = require('fs');
const path = require('path');

// شجرة المنهاج الوزاري الرسمي لشعبة آداب وفلسفة
const CURRICULUM_TREE = {
  subject: 'الفلسفة',
  grade: '3AS',
  branch: 'آداب وفلسفة',
  units: [
    {
      id: 'unit_1',
      title: 'الإشكالية الأولى: في إدراك العالم الخارجي',
      lessons: [
        { id: 'lesson_1_1', title: 'الإحساس والإدراك', keywords: ['إحساس', 'إدراك', 'حواس', 'عقلية', 'جشطالتية', 'ظواهرية'] },
        { id: 'lesson_1_2', title: 'اللغة والفكر', keywords: ['لغة', 'فكر', 'دال', 'مدلول', 'علاقة اللغة بالفكر', 'وظائف اللغة'] },
        { id: 'lesson_1_3', title: 'الشعور واللاشعور', keywords: ['شعور', 'لاشعور', 'فرويد', 'حياة نفسية', 'عقدة'] },
        { id: 'lesson_1_4', title: 'الذاكرة والخيال', keywords: ['ذاكرة', 'خيال', 'نسيان', 'إبداع', 'برغسون', 'ريبو'] },
        { id: 'lesson_1_5', title: 'العادة والإرادة', keywords: ['عادة', 'إرادة', 'تكيف', 'سلوك مكتسب', 'عزم', 'روتين'] }
      ]
    },
    {
      id: 'unit_2',
      title: 'الإشكالية الثانية: في الأخلاق والسياسة والحياة المعاشية',
      lessons: [
        { id: 'lesson_2_1', title: 'الأخلاق بين الثوابت والمتغيرات', keywords: ['أخلاق', 'ثوابت', 'متغيرات', 'خير', 'شر', 'منفعة'] },
        { id: 'lesson_2_2', title: 'الحقوق والواجبات والعدل', keywords: ['حقوق', 'واجبات', 'عدل', 'مساواة', 'تفاوت'] },
        { id: 'lesson_2_3', title: 'الحرية والمسؤولية', keywords: ['حرية', 'مسؤولية', 'حتمية', 'جبر', 'اختيار'] },
        { id: 'lesson_2_4', title: 'العلاقات الأسرية والحياة الاقتصادية والسياسية', keywords: ['أسرة', 'اقتصاد', 'سياسة', 'ديمقراطية', 'رأسمالية', 'اشتراكية'] },
        { id: 'lesson_2_5', title: 'العنف والتسامح', keywords: ['عنف', 'تسامح', 'لا عنف', 'عدوان'] }
      ]
    },
    {
      id: 'unit_3',
      title: 'الإشكالية الثالثة: في فلسفة العلوم',
      lessons: [
        { id: 'lesson_3_1', title: 'فلسفة الرياضيات', keywords: ['رياضيات', 'أصل الرياضيات', 'عقلية', 'تجريبية', 'يقين رياضي', 'أكسيوماتيك'] },
        { id: 'lesson_3_2', title: 'علوم المادة الجامدة وعلوم المادة الحية', keywords: ['مادة جامدة', 'مادة حية', 'بيولوجيا', 'منهج تجريبي', 'استقراء', 'فرضية', 'حتمية'] },
        { id: 'lesson_3_3', title: 'العلوم الإنسانية', keywords: ['علوم إنسانية', 'علم التاريخ', 'علم الاجتماع', 'علم النفس', 'حادثة تاريخية'] }
      ]
    }
  ]
};

/**
 * مطابقة دقيقة لمورد تعليمي مع شجرة المنهاج
 */
function mapResourceToCurriculum(resource) {
  const text = `${resource.title || ''} ${resource.description || ''} ${resource.lesson || ''}`.toLowerCase();
  
  let bestMatch = null;
  let maxScore = 0;

  for (const unit of CURRICULUM_TREE.units) {
    for (const lesson of unit.lessons) {
      let score = 0;
      
      // تطابق مباشر مع عنوان الدرس
      if (text.includes(lesson.title.toLowerCase())) {
        score += 5;
      }
      
      // تطابق مع الكلمات المفتاحية التخصصية
      for (const kw of lesson.keywords) {
        if (text.includes(kw.toLowerCase())) {
          score += 1.5;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = { unit, lesson, score };
      }
    }
  }

  // إذا كانت النتيجة كافية للاعتماد
  const isMapped = bestMatch && bestMatch.score >= 3;

  return {
    ...resource,
    subject: CURRICULUM_TREE.subject,
    grade: CURRICULUM_TREE.grade,
    branch: CURRICULUM_TREE.branch,
    curriculum_unit: isMapped ? bestMatch.unit.title : null,
    curriculum_unit_id: isMapped ? bestMatch.unit.id : null,
    canonical_lesson: isMapped ? bestMatch.lesson.title : null,
    canonical_lesson_id: isMapped ? bestMatch.lesson.id : null,
    mapping_confidence: isMapped ? Math.min(0.98, parseFloat((bestMatch.score / 10).toFixed(2))) : 0.2,
    mapping_status: isMapped ? 'mapped' : 'unmapped'
  };
}

/**
 * معالجة قائمة الموارد المصنفة وربطها بالمنهاج
 */
function runLessonMapper(inputPath = null, outputPath = null) {
  const inPath = inputPath || path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/normalized/classified_youtube_videos.json');
  const outDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/normalized');
  const outPath = outputPath || path.join(outDir, 'mapped_resources.json');

  if (!fs.existsSync(inPath)) {
    console.error(`[Agent 07 - Lesson Mapper] Input not found: ${inPath}`);
    return [];
  }

  const items = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  console.log(`\n======================================================`);
  console.log(`[AGENT 07 - LESSON MAPPER] بدء ربط الموارد بهيكل المنهاج`);
  console.log(`عدد الموارد: ${items.length}`);
  console.log(`======================================================\n`);

  const mapped = items.map(mapResourceToCurriculum);

  let mappedCount = 0;
  mapped.forEach(m => {
    if (m.mapping_status === 'mapped') mappedCount++;
  });

  console.log(`نتائج الربط:`);
  console.log(`  - موارد تم ربطها بنجاح: ${mappedCount} (${((mappedCount/mapped.length)*100).toFixed(1)}%)`);
  console.log(`  - موارد غير مؤكدة الربط: ${mapped.length - mappedCount}`);

  fs.writeFileSync(outPath, JSON.stringify(mapped, null, 2), 'utf-8');
  console.log(`[+] تم حفظ الموارد المربوطة في: ${outPath}\n`);

  return mapped;
}

if (require.main === module) {
  runLessonMapper();
}

module.exports = { mapResourceToCurriculum, runLessonMapper, CURRICULUM_TREE };
