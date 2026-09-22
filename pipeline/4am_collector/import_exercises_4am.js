/**
 * mordix_ai — 4AM Exercises Platform Importer
 * إدراج التمارين الموثقة في سجل الموارد الموحد data/registry_4am.js
 * وتغذية exercisesData في data/four_am.js لضمان حساب الإحصائيات ديناميكياً
 * خلو تام من الإيموجيات (Zero Emojis) - عزل تام لـ 3AS (READ-ONLY)
 */

const fs = require('fs');
const path = require('path');

const baseDir = path.resolve(__dirname, '../..');

function stripEmojis(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function importVerifiedExercises() {
  console.log('\n==================================================');
  console.log('Importing Verified 4AM Exercises to Registry & Store...');
  console.log('==================================================');

  const verifiedFile = path.join(baseDir, 'data/pipeline/verified/exercises_4am_verified.json');
  if (!fs.existsSync(verifiedFile)) {
    console.error('Verified exercises file not found:', verifiedFile);
    process.exit(1);
  }

  const verifiedData = JSON.parse(fs.readFileSync(verifiedFile, 'utf8'));
  const verifiedList = verifiedData.verifiedExercises || [];
  console.log(`Loaded ${verifiedList.length} verified exercises to import.`);

  // 1. تحميل سجل 4AM الحالي
  const registryPath = path.join(baseDir, 'data/registry_4am.js');
  global.window = {};
  eval(fs.readFileSync(registryPath, 'utf8'));
  const currentRegistry = global.window.PlatformRegistry4AM || {};
  const initialRegistryCount = Object.keys(currentRegistry).length;
  console.log(`Current PlatformRegistry4AM count before exercises: ${initialRegistryCount}`);

  // 2. تحميل شجرة بيانات 4AM الحالية
  const fourAmPath = path.join(baseDir, 'data/four_am.js');
  global.window = {};
  eval(fs.readFileSync(fourAmPath, 'utf8'));
  const currentFourAm = global.window.PlatformData4AM || {};

  // 3. إدراج الموارد في Registry
  let newRegistryImports = 0;
  for (const ex of verifiedList) {
    const resId = ex.id;
    const hasSolution = ex.subtype === 'solved_exercise' || /مع\s+الحل|محلول|بالحل/i.test(ex.title);

    const registryItem = {
      id: resId,
      levelId: '4am',
      level: 'السنة الرابعة متوسط',
      branch: 'التعليم المتوسط',
      subjectId: ex.subjectId,
      subjectName: stripEmojis(ex.subjectName),
      lessonId: ex.lessonId,
      lessonTitle: stripEmojis(ex.lessonTitle),
      type: 'exercise',
      subtype: ex.subtype,
      title: stripEmojis(ex.title),
      badge: stripEmojis(ex.badge || 'تطبيق منهجي'),
      url: ex.url,
      problem: {
        available: true,
        format: ex.videoId ? 'video' : (ex.directPdfUrl ? 'pdf' : 'document'),
        url: ex.url,
        text: stripEmojis(ex.title)
      },
      solution: {
        available: hasSolution,
        format: ex.videoId ? 'video' : (ex.directPdfUrl ? 'pdf' : 'document'),
        url: ex.url,
        text: hasSolution ? 'الحل النموذجي المعتمد متوفر مع الموضوع' : null
      },
      source: {
        type: ex.origin === 'dzexams' ? 'official' : 'educational_channel',
        name: stripEmojis(ex.source?.name || (ex.origin === 'dzexams' ? 'DzExams التعليمية' : 'قناة تعليمية')),
        url: ex.url,
        verified: true
      },
      teacher: stripEmojis(ex.teacher || ex.channelName || ''),
      videoId: ex.videoId || null,
      directPdfUrl: ex.directPdfUrl || null,
      documentUrl: ex.documentUrl || null,
      matchStatus: ex.matchStatus || 'MATCH_CONFIRMED',
      matchScore: ex.matchScore || 0.95,
      auditStatus: 'SAFE_TO_IMPORT',
      verificationStatus: 'verified',
      provenance: {
        origin: ex.origin,
        importedAt: new Date().toISOString()
      }
    };

    currentRegistry[resId] = registryItem;
    newRegistryImports++;
  }

  console.log(`PlatformRegistry4AM updated: ${Object.keys(currentRegistry).length} total resources (+${newRegistryImports} exercises).`);

  // 4. تحديث exercisesData في four_am.js لكل مادة ودرس
  let totalExercisesDataAdded = 0;
  // إعادة ضبط exercisesData لكل مادة
  for (const [sId, subj] of Object.entries(currentFourAm)) {
    subj.exercisesData = {};
    for (const lesson of subj.lessons || []) {
      subj.exercisesData[lesson.title] = [];
    }
  }

  // توزيع التمارين الموثقة على الدروس المقترنة
  for (const ex of verifiedList) {
    const subj = currentFourAm[ex.subjectId];
    if (subj) {
      subj.exercisesData = subj.exercisesData || {};
      const lessonTitle = ex.lessonTitle;
      if (!subj.exercisesData[lessonTitle]) {
        subj.exercisesData[lessonTitle] = [];
      }

      const exerciseIndex = subj.exercisesData[lessonTitle].length + 1;
      subj.exercisesData[lessonTitle].push({
        num: exerciseIndex,
        resourceId: ex.id,
        title: stripEmojis(ex.title),
        type: stripEmojis(ex.badge || 'تطبيق منهجي وتمرين محلول'),
        subtype: ex.subtype,
        url: ex.url,
        directPdfUrl: ex.directPdfUrl || null,
        videoId: ex.videoId || null,
        teacher: stripEmojis(ex.teacher || ex.channelName || ''),
        hasSolution: ex.subtype === 'solved_exercise' || /مع\s+الحل|محلول|بالحل/i.test(ex.title),
        verified: true
      });
      totalExercisesDataAdded++;
    }
  }

  console.log(`four_am.js exercisesData updated: ${totalExercisesDataAdded} exercise entries linked across lessons.`);

  // 5. حفظ data/registry_4am.js
  const registryOutput = `/**\n * mordix_ai — سجل الموارد التعليمية الموحد لطور 4AM\n * محدث ببنك التمارين والتطبيقات المنهجية الموثقة\n * خلو تام من الإيموجيات (Zero Emojis)\n */\n\nwindow.PlatformRegistry4AM = ${JSON.stringify(currentRegistry, null, 2)};\n`;
  fs.writeFileSync(registryPath, stripEmojis(registryOutput), 'utf8');
  console.log(`Saved updated registry to: ${registryPath}`);

  // 6. حفظ data/four_am.js
  const fourAmOutput = `/**\n * mordix_ai — منهاج السنة الرابعة متوسط المعتمد (4AM Curriculum)\n * محدث ببنك التمارين والتطبيقات والفيديوهات الموثقة\n * خلو تام من الإيموجيات (Zero Emojis)\n */\n\nwindow.PlatformData4AM = ${JSON.stringify(currentFourAm, null, 2)};\n`;
  fs.writeFileSync(fourAmPath, stripEmojis(fourAmOutput), 'utf8');
  console.log(`Saved updated four_am.js to: ${fourAmPath}`);

  return {
    initialCount: initialRegistryCount,
    finalCount: Object.keys(currentRegistry).length,
    newExercisesCount: newRegistryImports,
    totalExercisesLinked: totalExercisesDataAdded
  };
}

module.exports = { importVerifiedExercises };

if (require.main === module) {
  importVerifiedExercises();
}
