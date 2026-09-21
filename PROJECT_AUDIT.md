# تقرير التدقيق الفني الشامل للمشروع (PROJECT_AUDIT.md)
**منصة ألماد التعليمية - التحضير للبكالوريا الجزائرية**  
**التاريخ:** 21 سبتمبر 2026  
**الدور:** Lead AI Engineer + Research Orchestrator + Data Architect + QA Director  

---

## 1. البنية التقنية العامة (Architecture Overview)

المشروع عبارة عن تطبيق ويب تفاعلي من نوع **Single Page Application (SPA)** بدون إطار عمل ثقيل (Vanilla JavaScript + HTML5 + Tailwind CSS CDN + Custom CSS).

### هيكل الملفات والمجلدات:
- `index.html`: الملف الرئيسي لواجهة المستخدم، يحتوي على هيكل كافة الشاشات (Wizard, Dashboard, Subject Detail, Lessons Index, Lesson Hub, Videos View, Video Player, Exercises View, Modals).
- `styles.css`: التنسيقات المخصصة، الرسوم المتحركة، وأزرار التنقل.
- `app.js`: محرك المنصة الرئيسي (Routing, State Management, UI Renderers, Player Controller, History PushState).
- `data/store.js`: المخزن المركزي للبيانات (`PlatformStore`) ومسؤول عن قراءة وتعديل البيانات من كائن `window.PlatformData`.
- `data/*.js`: ملفات المواد الدراسية:
  * `data/philosophy.js` (مادة الفلسفة)
  * `data/islamic.js` (العلوم الإسلامية)
  * `data/history.js` (التاريخ والجغرافيا)
  * `data/arabic.js` (اللغة العربية)
  * `data/math.js` (الرياضيات)
  * `data/french.js` (اللغة الفرنسية)
  * `data/english.js` (اللغة الإنجليزية)
- `extracted_all_courses.json`, `extracted_lessons.json`, `full_lessons_data.json`: مستودعات بيانات سابقة مستخرجة من تطبيقات قديمة.
- `thumbnails/`: مجلد يحتوي على لقطات وصور مصغرة محلية لبعض الفيديوهات.

---

## 2. نموذج البيانات الحالي (Current Data Model & Schema)

### كائن المادة في `PlatformData[subjectName]`:
```javascript
{
  id: 'philosophy',
  title: 'الفلسفة',
  coefficient: 6,
  description: '...',
  lessons: [
    { id: 1, title: 'الإحساس والادراك', videos: 29, teachers: 3 },
    ...
  ],
  channelsData: {
    'الإحساس والادراك': [
      {
        channel: 'عادل مقرود',
        channelUrl: 'https://www.youtube.com/@...',
        videos: [
          { title: 'طبيعة الادراك...', duration: '32:05', youtubeId: 'Bttkh-S5kgs' },
          { title: 'التكيف بين العادة و الارادة', duration: '28:14' } // بدون youtubeId!
        ]
      }
    ]
  },
  exercisesData: {
    'الإحساس والادراك': [
      { num: 1, title: 'الإحساس والادراك', type: 'docx' }
    ]
  },
  reviews: [
    {
      channel: 'عادل مقرود',
      videos: [{ id: 1, title: '...', duration: '45:00' }]
    }
  ],
  summaries: [
    { id: 1, title: '...', type: 'pdf' }
  ],
  baccalaureate: [
    { id: 2024, title: 'دورة 2024', tag: 'دورة رسمية', year: 2024 }
  ],
  exams: [
    { id: 1, title: 'امتحانات الفصل الأول', term: 'الفصل الأول' }
  ]
}
```

---

## 3. نقاط الضعف والفجوات الحرجة (Critical Flaws & Vulnerabilities)

1. **فجوة المنهاج في الفلسفة (Curriculum Incompleteness):**
   - درس **"العادة والإرادة"** (الوحدة الخامسة من الإشكالية الأولى في المنهاج الرسمي لشعبة آداب وفلسفة) **غير موجود كدرس مستقل** في قائمة `lessons`!
   - تم حشر فيديوهات "العادة والإرادة" عشوائياً داخل درس `الإحساس والادراك`.
   - درس **"الحرية والمسؤولية"** مفقود كدرس مستقل ضمن قائمة الدروس الرئيسية.
   - غياب شجرة المنهاج الرسمية (الإشكاليات -> الوحدات التعليمية -> الدروس -> المحاور والمفاهيم).

2. **بيانات وهمية وافتراضية (Synthetic / Fake Fallback Data):**
   - في `data/store.js` (الأسطر 80-101 و 116-120)، عند عدم العثور على فيديوهات أو تمارين للدرس، يتم توليد قنوات وفيديوهات وهمية تلقائياً:
     `{ id: 1, title: 'شرح درس ... - الجزء 01', duration: '25:00' }`
     وهذا ينافي مبدأ الدقة والمصداقية الذي شدد عليه المستخدم.

3. **روابط YouTube غير صالحة أو مفقودة (Missing Video IDs):**
   - العديد من الفيديوهات تحتوي فقط على `title` و `duration: '20:00'` بدون `youtubeId` أو رابط URL.
   - المنصة تعتمد عند غياب الرابط على توليد رابط بحث Embed بديل:
     `listType=search&list=...` وهو غير دقيق وقد يعرض فيديوهات غير تعليمية أو خارج المنهاج.

4. **تمارين صورية (Dummy Exercises):**
   - في `exercisesData`، لا توجد نصوص أسئلة، ولا مقالات نموذجية، ولا سلالم تنقيط، بل فقط مصفوفة بعناوين مكررة مثل: `{ num: 1, title: 'الإحساس والادراك', type: 'docx' }`.

5. **انعدام التوثيق والمصدرية (No Provenance / Audit Trail):**
   - لا توجد مؤشرات ثقة (`confidence`)، ولا سجل للمصدر الأصلي (`source_url`)، ولا تاريخ جمع البيانات، ولا آلية تحقق لمنع التضارب (`conflict resolution`).

---

## 4. البيانات الناقصة في مادة الفلسفة (Missing Educational Assets)

| المورد | الحالة الحالية | النقص الفعلي |
| :--- | :--- | :--- |
| **دروس المنهاج** | 10 دروس فقط | ينقص إدراج "العادة والإرادة" و "الحرية والمسؤولية" وتنسيق الإشكاليات |
| **فيديوهات الدروس** | كثير منها بدون `youtubeId` حقيقي | ربط كل فيديو بـ YouTube ID دقيق للأستاذ المعتمد مع مدة حقيقية |
| **المقالات والملخصات** | 6 ملخصات عامة | ربط مقالات DzExams المفصلة والموثقة لكل درس وشعبة |
| **التمارين والمواضيع** | عناوين صورية فارغة | مواضيع ونماذج حقيقية مقسمة (جدلية، استقصاء، تحليل نص) |
| **البكالوريا** | قائمة سنوات بدون روابط | ربط مواضيع البكالوريا الرسمية وحلولها النموذجية وسلالم التنقيط |

---

## 5. تصنيف الملفات (Modification Boundaries)

### أ. ملفات لا يجب كسرها أو لمس هيكلها الأساسي (Do Not Break):
- `index.html`: الحفاظ الكامل على معرّفات الشاشات والأزرار (DOM IDs) ونظام العرض.
- `styles.css`: الحفاظ على التصميم العام وهوية المنصة البصرية وتجربة المستخدم (UX).
- `data/islamic.js`, `data/history.js`, `data/arabic.js`, `data/math.js`, `data/french.js`, `data/english.js`: لا يتم مسحها، وتظل تعمل بتوافق تام.

### ب. ملفات سيتم ترقيتها ودعمها برمجياً (Safe Migration & Enhancement):
- `data/store.js`: توسيع المخزن ليدعم الحقول الجديدة (مثل `youtubeId`, `provenance`, `confidence`, `source_url`, `canonical_id`) والتخلص التدريجي من البيانات الوهمية المفتعلة.
- `data/philosophy.js`: إعادة هيكلة المادة وتغذيتها بالبيانات الحقيقية المدققة بعد اجتياز Pipeline الـ QA.

### ج. طبقة البيانات الجديدة ونظام الوكلاء (Agentic Architecture Layer):
إنشاء مجلد معزول ومنظم في المشروع:
- `agents/`: برمجيات الوكلاء الـ 12 المتخصصة.
- `pipeline/`: محرك الـ Orchestrator ونظام المراحل (Discover, Collect, Normalize, Classify, Map, Deduplicate, Verify, QA, Import).
- `data/pipeline/`: قاعدة بيانات الاستيراد التدريجي:
  * `raw/` (youtube/, dzexams/)
  * `normalized/`
  * `verified/`
  * `rejected/`
  * `reports/`

---

## 6. خطة الدمج الآمنة (Integration Plan)

1. بناء **Universal Education Schema** (Knowledge Model) يدعم كافة العلاقات بدقة.
2. بناء الـ **Orchestrator** والوكلاء الـ 12.
3. تشغيل **Pilot** على مادة الفلسفة (شعبة آداب وفلسفة) لاختبار **3 دروس أساسية**:
   - الدرس 1: **العادة والإرادة** (لتصحيح الفجوة الأكبر).
   - الدرس 2: **الإحساس والإدراك**.
   - الدرس 3: **اللغة والفكر**.
4. مراجعة مخرجات الـ Pilot عبر QA Gate وFact Check Agent.
5. تحديث `data/philosophy.js` بالبيانات المدققة دون كسر أي وظيفة في الواجهة.
6. إصدار تقرير الجودة والجمع الشامل.
