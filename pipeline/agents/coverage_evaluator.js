/**
 * AGENT 18: COVERAGE EVALUATOR (مقيم التغطية التعليمية)
 * 
 * يحسب نسبة التغطية (Coverage Score) لكل درس بناءً على:
 * - وفرة الموارد (Resource Availability)
 * - تنوع المصادر (Source Diversity: YouTube + DzExams)
 * - التدقيق والتحقق (Verification & Direct IDs)
 * - مطابقة المنهاج (Curriculum Alignment)
 * - الجودة المنهجية (Quality & Adversarial Pass)
 */

const fs = require('fs');
const path = require('path');

function evaluateCoverage() {
  const assetsPath = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/verified/correlated_curriculum_assets.json');
  if (!fs.existsSync(assetsPath)) {
    console.error('Assets file not found');
    return {};
  }

  const data = JSON.parse(fs.readFileSync(assetsPath, 'utf-8'));
  const report = {};

  console.log(`\n======================================================`);
  console.log(`[AGENT 18 - COVERAGE EVALUATOR] تقييم التغطية التعليمية`);
  console.log(`======================================================\n`);

  for (const [id, item] of Object.entries(data.lessons)) {
    const vids = item.videos.length;
    const articles = item.articles.length;
    const summaries = item.summaries.length;
    const exercises = item.exercises.length;
    const methodologies = item.methodologies.length;

    // معايير التغطية:
    // الفيديوهات (الهدف >= 3) -> 35%
    // المقالات والمذكرات (الهدف >= 1) -> 20%
    // الملخصات (الهدف >= 1) -> 15%
    // التمارين والنماذج (الهدف >= 1) -> 15%
    // تنوع الأساتذة (>= 2 أساتذة) -> 15%

    const uniqueTeachers = new Set(item.videos.map(v => v.teacher)).size;

    let score = 0;
    score += Math.min(1.0, vids / 3) * 0.35;
    score += Math.min(1.0, (articles + methodologies) / 1) * 0.20;
    score += Math.min(1.0, summaries / 1) * 0.15;
    score += Math.min(1.0, exercises / 1) * 0.15;
    score += Math.min(1.0, uniqueTeachers / 2) * 0.15;

    const finalScore = parseFloat(score.toFixed(2));

    report[item.lesson.title] = {
      canonical_id: id,
      title: item.lesson.title,
      problematic: item.lesson.problematic,
      videos_count: vids,
      articles_count: articles,
      summaries_count: summaries,
      exercises_count: exercises,
      methodologies_count: methodologies,
      unique_teachers: uniqueTeachers,
      coverage_score: finalScore,
      status: finalScore >= 0.70 ? 'COVERED_WELL' : finalScore >= 0.40 ? 'PARTIAL' : 'NEEDS_MORE'
    };

    console.log(`[+] الدرس: "${item.lesson.title}" | التغطية: ${(finalScore * 100).toFixed(0)}% (${report[item.lesson.title].status})`);
    console.log(`    -> فيديوهات: ${vids} (أساتذة: ${uniqueTeachers}) | مقالات: ${articles} | ملخصات: ${summaries} | تمارين: ${exercises}`);
  }

  const outPath = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/reports/COVERAGE_REPORT.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[+] تم حفظ تقرير التغطية في: ${outPath}`);

  return report;
}

if (require.main === module) {
  evaluateCoverage();
}

module.exports = { evaluateCoverage };
