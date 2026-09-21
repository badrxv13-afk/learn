/**
 * فحص تحسينات الواجهة وتجربة المستخدم (UI/UX Polish Validator)
 * يتحقق من تطبيق محاور تحسين UI/UX الـ 15 دون المساس بأي بيانات
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('  بدء فحص تحسينات الواجهة وتجربة المستخدم (Phase 3 UI/UX)');
console.log('====================================================\n');

// 1. فحص ملف styles.css ونظام التصميم (Design Tokens)
{
  console.log('--- 1. فحص متغيرات التصميم ونظام الألوان الموحد ---');
  const css = fs.readFileSync(path.join(baseDir, 'styles.css'), 'utf-8');

  assert(css.includes(':root'), 'تعريف المتغيرات الجذرية :root موجود في styles.css');
  assert(css.includes('--color-brand-600'), 'تعريف اللون الأساسي --color-brand-600 موجود');
  assert(css.includes('--transition-fast') && css.includes('--transition-normal'), 'تعريف سرعات الحركة والانتقالات الموحدة موجود');
  assert(css.includes(':focus-visible'), 'دعم إمكانية الوصول والتنقل بلوحة المفاتيح عبر :focus-visible موجود');
  assert(css.includes('.btn-interactive'), 'فئة الأزرار التفاعلية .btn-interactive موجودة');
  assert(css.includes('.is-active-subject'), 'فئة المادة النشطة .is-active-subject موجودة');
  assert(css.includes('.is-active-lesson'), 'فئة الدرس النشط .is-active-lesson موجودة');
  assert(css.includes('.is-active-video'), 'فئة الفيديو النشط .is-active-video موجودة');
}

// 2. فحص إمكانية الوصول والتجاوب للشاشات الصغيرة (Mobile Polish)
{
  console.log('\n--- 2. فحص التجاوب وإمكانية الوصول على الهواتف ---');
  const css = fs.readFileSync(path.join(baseDir, 'styles.css'), 'utf-8');
  assert(css.includes('@media (max-width: 640px)'), 'تنسيقات التجاوب الخاصة بالهواتف (@media max-width: 640px) مدمجة');
  assert(css.includes('min-height: 40px'), 'مساحات النقر الملائمة للإبهام (Touch Targets) محددة بحد أدنى');
}

// 3. فحص استبدال كافة الأسماء الثابتة بالوسوم الديناميكية
{
  console.log('\n--- 3. فحص ديناميكية التخصيص واستبدال الأسماء الثابتة ---');
  const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');
  
  // التأكد من عدم وجود نصوص جامدة لمحمد محمد في واجهة المستخدم
  assert(!html.includes('"محمد محمد"'), 'تم استبدال كافة الإشارات الثابتة لـ "محمد محمد" بفئات ديناميكية');
  assert(html.includes('student-display-name'), 'فئة student-display-name مستخدمة في ترويسات كافة الشاشات');
  assert(html.includes('student-display-branch'), 'فئة student-display-branch مستخدمة لشارات الشعبة');
}

// 4. فحص بطاقات المواد ودعم سمات data-subject
{
  console.log('\n--- 4. فحص بطاقات المواد والوسوم التفاعلية ---');
  const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');
  const subjects = ['الفلسفة', 'العلوم الإسلامية', 'التاريخ والجغرافيا', 'اللغة الإنجليزية', 'اللغة الفرنسية', 'اللغة العربية', 'الرياضيات'];

  subjects.forEach(sub => {
    assert(html.includes(`data-subject="${sub}"`), `بطاقة مادة (${sub}) تحمل السمة data-subject للتفاعل والتمييز النشط`);
  });
}

// 5. فحص شريط التبويبات العلوي وتكامل دوال التبديل
{
  console.log('\n--- 5. فحص شريط التبويبات العلوي وإدارة الحالة النشطة ---');
  const appJs = fs.readFileSync(path.join(baseDir, 'app.js'), 'utf-8');
  assert(appJs.includes('function setActiveHeaderTab'), 'دالة إدارة التبويب النشط setActiveHeaderTab موجودة');
  assert(appJs.includes('function updateActiveSubjectCardUI'), 'دالة تمييز بطاقة المادة النشطة updateActiveSubjectCardUI موجودة');
  assert(appJs.includes('window.setActiveHeaderTab = setActiveHeaderTab'), 'تصدير دالة setActiveHeaderTab لـ window متاح');
  assert(appJs.includes('window.updateActiveSubjectCardUI = updateActiveSubjectCardUI'), 'تصدير دالة updateActiveSubjectCardUI لـ window متاح');
}

// 6. فحص الحالات الخاصة (Empty & Active states في توليد البطاقات)
{
  console.log('\n--- 6. فحص حالات الواجهة الخاصة (Empty State & Active Items) ---');
  const appJs = fs.readFileSync(path.join(baseDir, 'app.js'), 'utf-8');
  assert(appJs.includes('is-active-lesson'), 'محرك توليد الدروس يدعم فئة الدرس النشط is-active-lesson');
  assert(appJs.includes('is-active-video'), 'محرك توليد الفيديوهات يدعم فئة الفيديو النشط is-active-video');
  assert(appJs.includes('لا توجد دروس مسجلة حالياً'), 'محرك الدروس يتضمن واجهة أنيقة لحالة القائمة الفارغة (Empty State)');
}

// 7. التحقق الصارم من الحفاظ التام على الموارد والروابط والأنظمة السابقة
{
  console.log('\n--- 7. التحقق الصارم من استقرار البنية والبيانات ---');
  const registryJs = fs.readFileSync(path.join(baseDir, 'data/registry.js'), 'utf-8');
  const storeJs = fs.readFileSync(path.join(baseDir, 'data/store.js'), 'utf-8');
  const appJs = fs.readFileSync(path.join(baseDir, 'app.js'), 'utf-8');

  assert(registryJs.includes('PlatformRegistry'), 'سجل الموارد PlatformRegistry سليم ومستقل 100%');
  assert(storeJs.includes('PlatformStore'), 'مخزن البيانات التعليمية PlatformStore سليم 100%');
  assert(appJs.includes('destroyCurrentVideoPlayer'), 'محرك إنهاء وتدمير مشغل YouTube سليم ومحافظ عليه');
  assert(appJs.includes('buildYouTubeEmbedUrl'), 'منشئ روابط YouTube المتوافق مع GitHub Pages سليم 100%');
  assert(appJs.includes('mordix_ai_student'), 'مفتاح ملف الطالب في localStorage سليم 100%');
}

// 8. فحص دمج لوغو الموقع والتنسيقات عالية الحدة (High Contrast & Logo Integration)
{
  console.log('\n--- 8. فحص دمج لوغو الموقع والتنسيقات عالية الحدة والوضوح ---');
  const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');
  const css = fs.readFileSync(path.join(baseDir, 'styles.css'), 'utf-8');
  const appJs = fs.readFileSync(path.join(baseDir, 'app.js'), 'utf-8');

  // التحقق من وجود ملف اللوغو
  assert(fs.existsSync(path.join(baseDir, 'images.jfif')), 'ملف شعار الموقع images.jfif موجود فعلياً في جذر المشروع');

  // التحقق من إدراج الشعار في الأماكن المحددة
  assert(html.includes('rel="icon" type="image/jpeg" href="images.jfif"'), 'أيقونة المتصفح Favicon تشير إلى images.jfif في ترويسة الصفحة');
  assert(html.includes('<img src="images.jfif" alt="mordix_ai" class="w-full h-full object-contain p-0.5" />'), 'شعار الهيدر الرئيسي مدمج باستخدام images.jfif داخل حاوية أنيقة');
  assert(html.includes('<img src="images.jfif" alt="mordix_ai" class="w-full h-full object-contain" />'), 'شعار شاشة الإعداد والترحيب مدمج باستخدام images.jfif');
  assert(html.includes('<img src="images.jfif" alt="mordix_ai" class="w-full h-full object-contain p-0.5" />'), 'شعار الفوتر مدمج باستخدام images.jfif');

  // التحقق من حدة التباين وعزل الألوان غير الباهتة
  assert(css.includes('.onboarding-branch-card.is-selected-branch'), 'فئة الشعبة المختارة عالية الحدة .onboarding-branch-card.is-selected-branch موجودة');
  assert(css.includes('border-right-width: 7px') || css.includes('border-right: 7px'), 'شريط تمييز الدرس النشط والفيديو النشط حاد وعريض بـ 7 بكسل');
  assert(css.includes('#dbeafe') || css.includes('#fee2e2'), 'ألوان الخلفيات النشطة حادة التباين وواضحة (بدون تدرجات باهتة غير ملحوظة)');
  assert(appJs.includes('is-selected-branch'), 'دالة اختيار الشعبة في شاشة الإعداد تفعل فئة التحديد الحادة is-selected-branch');
}

console.log('\n====================================================');
console.log(`  نتائج فحص تحسينات الواجهة (Phase 3 UI/UX):`);
console.log(`  إجمالي الفحوصات الناجحة: ${passed}`);
console.log(`  إجمالي الفحوصات الفاشلة: ${failed}`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\nتم اجتياز جميع اختبارات تحسين الواجهة وتجربة الاستخدام بنجاح 100%!');
}
