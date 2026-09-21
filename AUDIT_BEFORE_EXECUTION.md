# AUDIT BEFORE EXECUTION (فحص مستودع الشيفرة قبل التنفيذ)
**التاريخ والوقت:** 21 سبتمبر 2026  
**المشروع:** منصة ألماد التعليمية - نظام الوكلاء واستيراد البيانات  

---

## 1. تفكيك شجرة الاعتماديات (Dependency Graph)

```
index.html
  ├── styles.css (تنسيقات الواجهة وتأثيرات الحركة)
  ├── data/store.js (PlatformStore - إدارة الاستعلامات وحالات البيانات)
  │     └── window.PlatformData (الكائن المركزي العالمي للبيانات)
  ├── data/philosophy.js (window.PlatformData['الفلسفة'])
  ├── data/islamic.js (window.PlatformData['العلوم الإسلامية'])
  ├── data/history.js (window.PlatformData['التاريخ والجغرافيا'])
  ├── data/english.js (window.PlatformData['اللغة الإنجليزية'])
  ├── data/french.js (window.PlatformData['اللغة الفرنسية'])
  ├── data/arabic.js (window.PlatformData['اللغة العربية'])
  ├── data/math.js (window.PlatformData['الرياضيات'])
  └── app.js (Application Core Engine - Controller & UI Renderer)
```

---

## 2. آليات العرض وتدفق البيانات (UI & Data Flow)

1. **عرض الدروس (`renderLessons`)**:
   - يستدعي `PlatformStore.getLessons(subjectTitle)`.
   - يعتمد على مصفوفة `subj.lessons` التي تحتوي على `{ id, title, videos, teachers }`.
   - عند النقر، يستدعي `openLessonHub(lesson.title)`.
2. **عرض فضاء الدرس (`openLessonHub`)**:
   - يجلب عدد الفيديوهات عبر `PlatformStore.getLessonVideos(subject, lessonTitle)`.
   - يجلب التمارين عبر `PlatformStore.getLessonExercises(subject, lessonTitle)`.
   - يوفر زرين: "فيديوهات الدرس" و "تمارين ونماذج".
3. **عرض الفيديوهات (`renderChannelsVideos`)**:
   - يجلب القنوات من `subj.channelsData[lessonTitle]`.
   - كل قناة تحتوي على `channel`, `channelUrl`, `videos: [{ title, duration, youtubeId, thumbnail }]`.
   - لكل فيديو، يستدعي `resolveVideoUrls(vid, channel)`. إذا كان `youtubeId` متوفراً يتم تفعيل وسم "رابط مؤكد" وزر تشغيل Embed مباشر.
4. **مشغل الفيديو (`playVideoLesson`)**:
   - يُحمّل الفيديو في iframe مع خيار التبديل إلى YouTube أو إدخال رابط مخصص.
5. **عرض التمارين والملخصات والبكالوريا**:
   - `renderExercises`: يقرأ من `subj.exercisesData[lessonTitle]`.
   - `openCategoryContent`: يقرأ `summaries`, `reviews`, `baccalaureate`, `exams`.

---

## 3. المعرفات الحساسة وقواعد التوافق (Strict Invariants)

- **أسماء المفاتيح (Key Integrity)**: مفاتيح `channelsData` و `exercisesData` يجب أن تطابق تماماً خاصية `title` في كائنات `lessons`.
- **الـ IDs الرقمية**: الحفاظ على تسلسل المعرفات الرقمية للدروس حتى لا تنكسر أي روابط مفهرسة.
- **حقول الفيديو الإلزامية في واجهة العرض**:
  `title` (نصي), `duration` (نصي مثل "45:00"), `youtubeId` (معرف 11 حرفاً), `thumbnail` (رابط صورة أو محلي).
- **الامتناع عن كسر واجهات المواد الأخرى**:
  ملفات `islamic.js`, `history.js`, `arabic.js`, `math.js`, `french.js`, `english.js` تظل تعمل كما هي دون تعديل.

---

## 4. خطة الحماية والنسخ الاحتياطي (Safety & Rollback)
- إنشاء مجلد نسخ احتياطي كامل قبل كتابة أي سطر برمجيات إنتاجي: `data/pipeline/backups/<timestamp>/`.
- توليد ملف المادة الجديد في مجلد معزول: `generated/verified_philosophy.js`.
- فحص بناء الجملة ومطابقة المخطط برمجياً قبل الاستبدال النهائي.
