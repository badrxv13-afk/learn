/**
 * AGENT 20: UI FLOW & INTEGRATION TESTER (مختبر تدفق واجهة المستخدم)
 * 
 * يختبر كل المسارات الأساسية في الواجهة ومخزن البيانات:
 * Subject -> Philosophy -> Lessons -> Videos -> Exercises -> Bac -> Summaries
 * يتحقق من عدم وجود: undefined, null, broken IDs, dummy fallbacks
 */

const fs = require('fs');
const path = require('path');

async function testUiFlow() {
  console.log(`\n======================================================`);
  console.log(`[AGENT 20 - UI FLOW TESTER] بدء اختبارات التكامل والواجهة`);
  console.log(`======================================================\n`);

  let failures = 0;
  let passes = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  }

  // 1. محاكاة بيئة المتصفح (Simulate Browser Window)
  const window = {
    PlatformData: {},
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    }
  };
  global.window = window;
  global.localStorage = window.localStorage;

  // 2. تحميل data/store.js
  const storeCode = fs.readFileSync(path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/store.js'), 'utf-8');
  eval(storeCode);
  const PlatformStore = window.PlatformStore;
  assert(PlatformStore !== undefined, 'PlatformStore تم تحميله وتعيينه بنجاح');

  // 3. تحميل data/philosophy.js المحدث
  const philoCode = fs.readFileSync(path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/philosophy.js'), 'utf-8');
  eval(philoCode);
  const philoData = window.PlatformData['الفلسفة'];
  assert(philoData !== undefined, 'window.PlatformData["الفلسفة"] مسجل بنجاح');

  // 4. فحص مادة الفلسفة
  assert(philoData.code === 'PHILO_3AS_LP', 'رمز المادة مطابق: PHILO_3AS_LP');
  assert(philoData.branch === 'آداب وفلسفة', 'الشعبة مطابقة: آداب وفلسفة');
  assert(philoData.grade === 'الثالثة ثانوي', 'المستوى مطابق: 3AS');

  // 5. فحص فهرس الدروس الرسمي
  const lessons = PlatformStore.getLessons('الفلسفة');
  assert(lessons.length === 13, `قائمة الدروس تحتوي على 13 درساً رسمياً (الحالي: ${lessons.length})`);

  const habitLesson = lessons.find(l => l.title === 'العادة والإرادة');
  assert(habitLesson !== undefined, 'درس "العادة والإرادة" موجود ككيان رسمي في المنهاج');

  const senseLesson = lessons.find(l => l.title === 'الإحساس والإدراك');
  assert(senseLesson !== undefined, 'درس "الإحساس والإدراك" موجود في المنهاج');

  const langLesson = lessons.find(l => l.title === 'اللغة والفكر');
  assert(langLesson !== undefined, 'درس "اللغة والفكر" موجود في المنهاج');

  // 6. فحص فيديوهات درس "العادة والإرادة"
  const habitChannels = PlatformStore.getLessonVideos('الفلسفة', 'العادة والإرادة');
  assert(habitChannels.length > 0, `قنوات درس العادة والإرادة متوفرة (${habitChannels.length} قنوات)`);
  
  let totalHabitVids = 0;
  let verifiedHabitVids = 0;
  habitChannels.forEach(c => {
    (c.videos || []).forEach(v => {
      totalHabitVids++;
      if (v.youtubeId && v.youtubeId.length === 11 && v.verified) {
        verifiedHabitVids++;
      }
    });
  });
  assert(totalHabitVids >= 10, `إجمالي فيديوهات العادة والإرادة كافٍ وموثق (${totalHabitVids} فيديو)`);
  assert(verifiedHabitVids === totalHabitVids, `جميع فيديوهات العادة والإرادة تمتلك YouTube ID صالح ومؤكد (${verifiedHabitVids}/${totalHabitVids})`);

  // 7. فحص فيديوهات درس "الإحساس والإدراك"
  const senseChannels = PlatformStore.getLessonVideos('الفلسفة', 'الإحساس والإدراك');
  let senseVids = 0;
  senseChannels.forEach(c => senseVids += (c.videos || []).length);
  assert(senseVids >= 15, `فيديوهات الإحساس والإدراك كافية (${senseVids} فيديو)`);

  // 8. فحص فيديوهات درس "اللغة والفكر"
  const langChannels = PlatformStore.getLessonVideos('الفلسفة', 'اللغة والفكر');
  let langVids = 0;
  langChannels.forEach(c => langVids += (c.videos || []).length);
  assert(langVids >= 15, `فيديوهات اللغة والفكر كافية (${langVids} فيديو)`);

  // 9. فحص تمارين ومقالات الدروس
  const habitExercises = PlatformStore.getLessonExercises('الفلسفة', 'العادة والإرادة');
  assert(habitExercises.length >= 2, `تمارين العادة والإرادة متوفرة (${habitExercises.length} نماذج)`);
  assert(habitExercises[0].question !== undefined, 'التمرين يحتوي على نص الإشكالية الفلسفية الحقيقية');
  assert(habitExercises[0].rubric !== undefined, 'التمرين يحتوي على عناصر الإجابة وسلم التنقيط المعتمد');

  // 10. فحص البكالوريا والملخصات
  const bac = PlatformStore.getSubjectBac('الفلسفة');
  assert(bac.length >= 10, `أرشيف البكالوريا الرسمية متوفر (${bac.length} دورات)`);
  assert(bac[0].url !== undefined && bac[0].url.includes('dzexams.com'), 'رابط دورة البكالوريا موثق برابط صالح من DzExams');

  const summaries = PlatformStore.getSubjectSummaries('الفلسفة');
  assert(summaries.length >= 5, `الملخصات الوزارية متوفرة (${summaries.length} ملخصات)`);
  assert(summaries[0].url !== undefined, 'الملخص يمتلك رابط تحميل أو معاينة صريح');

  // 11. فحص حل الروابط (URL Resolver Logic) كما في app.js
  function testResolveVideoUrls(vid, channel) {
    if (vid.youtubeId) {
      return {
        watchUrl: `https://www.youtube.com/watch?v=${vid.youtubeId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${vid.youtubeId}?autoplay=1&rel=0`,
        source: 'direct-id'
      };
    }
    return { source: 'search' };
  }

  const sampleVid = habitChannels[0].videos[0];
  const resolved = testResolveVideoUrls(sampleVid, habitChannels[0].channel);
  assert(resolved.source === 'direct-id', 'مشغل الفيديو يكتشف المعرف المباشر (direct-id) بدون بحث وهمي');
  assert(resolved.embedUrl.includes('youtube-nocookie.com/embed/'), 'رابط التضمين آمن ومتوافق');

  console.log(`\n======================================================`);
  console.log(`[UI FLOW TEST RESULT] إجمالي الاختبارات: ${passes + failures} | نجاح: ${passes} | فشل: ${failures}`);
  console.log(`======================================================\n`);

  if (failures > 0) {
    throw new Error(`${failures} integration tests failed!`);
  }
  return true;
}

if (require.main === module) {
  testUiFlow().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { testUiFlow };
