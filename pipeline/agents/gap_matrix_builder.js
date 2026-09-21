/**
 * AGENT 09: GAP MATRIX BUILDER (محلل فجوات المحتوى التعليمي)
 * 
 * المخرجات:
 * - data/pipeline/reports/GAP_MATRIX.json
 * - data/pipeline/reports/GAP_MATRIX.md
 * 
 * يحدد بدقة النقص الفعلي لكل درس عبر كافة أنواع الموارد المطلوبة:
 * video, course, summary, article, methodology, exercise, exam, exam_solution, quote, concept, revision
 */

const fs = require('fs');
const path = require('path');
const { AgentContract } = require('../utils/agent_contract');

const RESOURCE_TYPES = [
  'video',
  'course',
  'summary',
  'article',
  'methodology',
  'exercise',
  'exam',
  'exam_solution',
  'quote',
  'concept',
  'revision'
];

const TARGET_MINIMUMS = {
  video: 3,
  course: 1,
  summary: 1,
  article: 2,
  methodology: 1,
  exercise: 2,
  exam: 1,
  exam_solution: 1,
  quote: 2,
  concept: 2,
  revision: 1
};

function buildGapMatrix(curriculumFile, currentDataFile = null) {
  const curriculum = JSON.parse(fs.readFileSync(curriculumFile, 'utf-8'));
  
  // فحص الموارد الحالية إذا كانت متوفرة
  let existingData = null;
  if (currentDataFile && fs.existsSync(currentDataFile)) {
    try {
      existingData = JSON.parse(fs.readFileSync(currentDataFile, 'utf-8'));
    } catch (e) {}
  }

  const matrix = {};

  for (const lesson of curriculum.lessons) {
    matrix[lesson.canonical_id] = {
      canonical_id: lesson.canonical_id,
      title: lesson.title,
      problematic: lesson.problematic,
      counts: {},
      targets: { ...TARGET_MINIMUMS },
      gaps: [],
      coverage_score: 0
    };

    let totalPoints = 0;
    let maxPoints = 0;

    for (const type of RESOURCE_TYPES) {
      // إحصاء الموارد الحالية (افتراضياً 0 للبدء المنضبط حتى يتم جمعها وتدقيقها)
      let count = 0;
      if (existingData && existingData[lesson.title] && existingData[lesson.title][type]) {
        count = existingData[lesson.title][type].length || 0;
      }

      matrix[lesson.canonical_id].counts[type] = count;
      const target = TARGET_MINIMUMS[type];
      maxPoints += target;
      totalPoints += Math.min(count, target);

      if (count < target) {
        matrix[lesson.canonical_id].gaps.push({
          type,
          current: count,
          required: target,
          deficit: target - count
        });
      }
    }

    matrix[lesson.canonical_id].coverage_score = parseFloat((totalPoints / maxPoints).toFixed(2));
  }

  return matrix;
}

async function runGapMatrixAgent(request) {
  const currPath = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/curriculum_master.json');
  const outDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const matrix = buildGapMatrix(currPath);
  const jsonPath = path.join(outDir, 'GAP_MATRIX.json');
  fs.writeFileSync(jsonPath, JSON.stringify(matrix, null, 2), 'utf-8');

  // توليد تقرير Markdown
  let md = `# مصفوفة فجوات المحتوى التعليمي (GAP MATRIX REPORT)\n\n`;
  md += `**تاريخ التوليد:** ${new Date().toLocaleString('ar-DZ')}\n\n`;
  md += `| المعرف | الدرس | الإشكالية | التغطية | الفجوات ذات الأولوية |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const item of Object.values(matrix)) {
    const gapsList = item.gaps.slice(0, 4).map(g => `${g.type} (-${g.deficit})`).join(', ');
    md += `| \`${item.canonical_id}\` | **${item.title}** | ${item.problematic.split(':')[0]} | **${(item.coverage_score * 100).toFixed(0)}%** | ${gapsList} |\n`;
  }

  const mdPath = path.join(outDir, 'GAP_MATRIX.md');
  fs.writeFileSync(mdPath, md, 'utf-8');

  console.log(`[+] Gap Matrix generated at: ${jsonPath}`);
  console.log(`[+] Gap Report generated at: ${mdPath}`);

  return AgentContract.createResponse({
    task_id: request.task_id,
    agent: 'gap_matrix_builder_v2',
    status: 'COMPLETED',
    records: Object.values(matrix),
    provenance: {
      curriculum_file: currPath,
      report_file: mdPath
    },
    metrics: {
      total_lessons_evaluated: Object.keys(matrix).length
    }
  });
}

if (require.main === module) {
  runGapMatrixAgent({ task_id: 'gap_matrix_init' });
}

module.exports = { runGapMatrixAgent, buildGapMatrix, RESOURCE_TYPES };
