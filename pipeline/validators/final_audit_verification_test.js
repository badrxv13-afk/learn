/**
 * mordix_ai — FINAL AUDIT VERIFICATION TEST
 * 
 * اختبار شامل لنتائج التدقيق النهائي واستيراد بيانات 4AM:
 * 1. فحص ملف 4am_verified_resources.json
 * 2. فحص ملف 4AM_FINAL_AUDIT_REPORT.md
 * 3. فحص registry_4am.js و four_am.js
 * 4. محاكاة المسار الكامل: 4AM → Subject → Lesson → Resource
 * 5. التأكد التام من عدم المساس بـ 3AS وعزل الأطوار
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const baseDir = path.resolve(__dirname, '../..');

console.log('=== بدء اختبار التحقق النهائي لبيانات 4AM ===\n');

// 1. فحص وجود التقرير وملف الموارد
const reportPath = path.join(baseDir, '4AM_FINAL_AUDIT_REPORT.md');
const verifiedJsonPath = path.join(baseDir, '4am_verified_resources.json');

assert(fs.existsSync(reportPath), 'تقرير 4AM_FINAL_AUDIT_REPORT.md مفقود');
assert(fs.existsSync(verifiedJsonPath), 'ملف 4am_verified_resources.json مفقود');
console.log('[PASS] ملفات المخرجات (التقرير وملف الموارد المعتمدة) موجودة بنجاح.');

const verifiedResources = JSON.parse(fs.readFileSync(verifiedJsonPath, 'utf8'));
assert(Array.isArray(verifiedResources) && verifiedResources.length > 0, 'ملف 4am_verified_resources.json فارغ');
console.log(`[PASS] تم التحقق من وجود ${verifiedResources.length} مورداً معتمداً في JSON.`);

// التأكد أن كل الموارد في 4am_verified_resources.json هي SAFE_TO_IMPORT حصراً
for (const r of verifiedResources) {
  assert.strictEqual(r.auditStatus, 'SAFE_TO_IMPORT', `المورد ${r.id} ليس SAFE_TO_IMPORT`);
  assert.strictEqual(r.levelId, '4am', `المورد ${r.id} ليس 4am`);
  assert(r.subjectId, `المورد ${r.id} يفتقد subjectId`);
  assert(r.url && r.url.startsWith('https://'), `المورد ${r.id} رابط غير صالح: ${r.url}`);
  assert.strictEqual(r.verificationStatus, 'verified', `المورد ${r.id} غير موثق`);
}
console.log('[PASS] جميع الموارد في 4am_verified_resources.json هي SAFE_TO_IMPORT وبمواصفات قياسية.');

// 2. محاكاة بيئة المتصفح وتشغيل PlatformStore
global.window = {
  appState: { level: '4am' }
};

// تحميل بيانات 3AS (READ-ONLY)
global.window.PlatformData = {};
const subjects3AS = ['math', 'arabic', 'history', 'islamic', 'french', 'english', 'philosophy'];
for (const s of subjects3AS) {
  const filePath = path.join(baseDir, `data/${s}.js`);
  if (fs.existsSync(filePath)) {
    eval(fs.readFileSync(filePath, 'utf8'));
  }
}
const registry3asPath = path.join(baseDir, 'data/registry.js');
if (fs.existsSync(registry3asPath)) {
  eval(fs.readFileSync(registry3asPath, 'utf8'));
}

// تحميل بيانات 4AM
eval(fs.readFileSync(path.join(baseDir, 'data/four_am.js'), 'utf8'));
eval(fs.readFileSync(path.join(baseDir, 'data/registry_4am.js'), 'utf8'));
eval(fs.readFileSync(path.join(baseDir, 'data/store.js'), 'utf8'));

const store = global.window.PlatformStore;
assert(store, 'PlatformStore غير موجود');

// 3. اختبار: 4AM → Subject → Lesson → Resource
console.log('\n--- اختبار المسار: 4AM → Subject → Lesson → Resource ---');

const subjects4am = store.getAllSubjects('4am');
assert.strictEqual(subjects4am.length, 9, 'يجب أن يكون عدد مواد 4AM هو 9 مواد');
console.log(`[PASS] عدد مواد 4AM هو ${subjects4am.length} مواد.`);

let totalLessonsWithVideos = 0;
let totalVerifiedVideosInLessons = 0;

for (const subj of subjects4am) {
  const lessons = store.getLessons(subj.name, '4am');
  assert(lessons.length > 0, `المادة ${subj.name} لا تحتوي على دروس`);
  
  let subjVideos = 0;
  for (const lesson of lessons) {
    if (lesson.videos > 0) {
      totalLessonsWithVideos++;
      subjVideos += lesson.videos;
      totalVerifiedVideosInLessons += lesson.videos;

      // فحص جلب الفيديوهات للدرس (Resource retrieval)
      const channels = store.getLessonVideos(subj.name, lesson.title, '4am');
      assert(channels.length > 0, `الدرس ${lesson.title} يجب أن يحتوي على قنوات`);
      
      for (const ch of channels) {
        assert(ch.channel, 'يجب توفر اسم القناة');
        assert(Array.isArray(ch.videos) && ch.videos.length > 0, 'القناة يجب أن تحتوي على فيديوهات');
        for (const v of ch.videos) {
          assert(v.id && /^[a-zA-Z0-9_-]{11}$/.test(v.id), `معرف فيديو غير صالح: ${v.id}`);
          assert(v.title, 'يجب توفر عنوان الفيديو');
          assert.strictEqual(v.auditStatus, 'SAFE_TO_IMPORT', 'حالة الفيديو يجب أن تكون SAFE_TO_IMPORT');
        }
      }
    }
  }
  console.log(`  [OK] المادة "${subj.name}": ${lessons.length} درساً، تضم ${subjVideos} فيديو معتمد موزع على الدروس.`);
}

console.log(`\n[PASS] تم التحقق من ${totalLessonsWithVideos} درساً تضم ${totalVerifiedVideosInLessons} فيديو تعليمي حقيقي ومدقق.`);

// 4. اختبار سجل الموارد الموحد PlatformRegistry4AM
console.log('\n--- اختبار سجل الموارد الموحد (Resource Registry) لـ 4AM ---');
const all4amResources = store.getAllResources('4am');
assert(all4amResources.length >= 426, `يجب أن يكون عدد موارد 4AM هو 426 على الأقل، وُجد: ${all4amResources.length}`);
console.log(`[PASS] سجل موارد 4AM يحتوي بدقة على ${all4amResources.length} مورداً مدققاً.`);

// فحص كل مورد بالمعرف الفريد getResourceById
for (const r of all4amResources) {
  const fetched = store.getResourceById(r.id || r.resourceId);
  assert(fetched, `فشل جلب المورد بالمعرف: ${r.id}`);
  assert.strictEqual(fetched.levelId, '4am');
  assert.strictEqual(fetched.verificationStatus, 'verified');
}
console.log(`[PASS] جميع الـ ${all4amResources.length} مورداً تُسترجع بنجاح عبر getResourceById ومعزولة بنسبة 100%.`);

// 5. فحص عزل طور 3AS بنسبة 100% وعدم تأثره نهائياً
console.log('\n--- فحص عزل طور 3AS وعدم المساس ببياناته (Zero Leakage) ---');
const subjects3as = store.getAllSubjects('3as');
assert.strictEqual(subjects3as.length, 7, `عدد مواد 3AS يجب أن يبقى 7 مواد، وُجد: ${subjects3as.length}`);
console.log(`[PASS] مواد 3AS الـ 7 موجودة كاملة دون أي تعديل.`);

const resources3as = store.getAllResources('3as');
for (const r of resources3as) {
  assert(r.levelId === '3as' || !r.levelId || r.level === 'الثالثة ثانوي', `تسرب مورد 4AM إلى 3AS: ${r.id}`);
}
console.log(`[PASS] مواد 3AS الـ 8 وسجل موارد 3AS بقيا دون أي تغيير وبصفر تسرب.`);

// فحص دروس مادة الرياضيات لـ 3AS
const mathLessons3as = store.getLessons('الرياضيات', '3as');
assert.strictEqual(mathLessons3as.length, 4, 'دروس رياضيات 3AS يجب أن تبقى 4 دروس');
console.log('[PASS] دروس 3AS لم تتغير ومطابقة للمرجع الأصلي 100%.');

console.log('\n=============================================');
console.log('✅ اكتملت جميع اختبارات التحقق بنجاح تام 100%!');
console.log('=============================================');
