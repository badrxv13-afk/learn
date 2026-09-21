/**
 * منصة ألماد التعليمية - مخزن البيانات المركزي (Platform Data Store)
 * يدير استعلامات وتحديثات المواد، الدروس، الفيديوهات، والتمارين، والمراجعات، والملخصات، والبكالوريا
 * بدون أي إيموجيات (Zero Emojis)
 */

window.PlatformData = window.PlatformData || {};

const PlatformStore = {
  /**
   * دالة مساعدة داخلية لمطابقة عناوين الدروس بمرونة عالية
   * تعالج الفروقات الطفيفة في المسافات، علامات الترقيم، والأقواس
   */
  _findDataByLessonKey(dataObj, lessonTitle) {
    if (!dataObj || !lessonTitle) return null;
    if (dataObj[lessonTitle]) return dataObj[lessonTitle];

    const cleanTitle = String(lessonTitle).trim();
    if (dataObj[cleanTitle]) return dataObj[cleanTitle];

    const normalized = cleanTitle.replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
    const keys = Object.keys(dataObj);

    for (const key of keys) {
      if (key.trim() === cleanTitle) return dataObj[key];
      const normKey = key.replace(/\s+/g, ' ').replace(/[()]/g, '').trim();
      if (normKey === normalized) return dataObj[key];
    }
    return null;
  },

  /**
   * جلب كافة المواد المسجلة في المنصة
   */
  getAllSubjects() {
    return Object.values(window.PlatformData);
  },

  /**
   * جلب بيانات مادة محددة بالاسم أو المعرف
   */
  getSubject(subjectName) {
    if (!subjectName) return window.PlatformData['الفلسفة'];
    return window.PlatformData[subjectName] || 
      Object.values(window.PlatformData).find(s => s.id === subjectName || s.name === subjectName) || 
      window.PlatformData['الفلسفة'];
  },

  /**
   * جلب قائمة دروس مادة محددة
   */
  /**
   * جلب قائمة دروس مادة محددة مع حساب الإحصائيات ديناميكياً من قاعدة البيانات
   * (DATA -> UI) لا أرقام وهمية أو ثابتة
   */
  getLessons(subjectName) {
    const subj = this.getSubject(subjectName);
    if (!subj || !subj.lessons) return [];

    return subj.lessons.map(lesson => {
      const channels = this._findDataByLessonKey(subj.channelsData, lesson.title) || [];
      let actualVideoCount = 0;
      const actualTeachers = new Set();

      channels.forEach(ch => {
        const vids = (ch.videos || []).filter(v => v && v.title);
        actualVideoCount += vids.length;
        if (vids.length > 0 && ch.channel) {
          actualTeachers.add(ch.channel);
        }
      });

      const exercises = this._findDataByLessonKey(subj.exercisesData, lesson.title) || [];
      const actualExerciseCount = exercises.length;

      return {
        ...lesson,
        videos: actualVideoCount,
        teachers: actualTeachers.size,
        exercises: actualExerciseCount
      };
    });
  },

  /**
   * جلب بيانات درس محدد داخل مادة
   */
  getLesson(subjectName, lessonTitleOrId) {
    const lessons = this.getLessons(subjectName);
    if (typeof lessonTitleOrId === 'number') {
      return lessons.find(l => l.id === lessonTitleOrId) || lessons[0];
    }
    return lessons.find(l => l.title === lessonTitleOrId) || lessons[0];
  },

  /**
   * جلب قنوات وفيديوهات درس محدد - بيانات حقيقية فقط دون أي توليد وهمي
   */
  getLessonVideos(subjectName, lessonTitle) {
    const subj = this.getSubject(subjectName);
    if (!subj) return [];

    const realChannels = this._findDataByLessonKey(subj.channelsData, lessonTitle);
    if (realChannels && Array.isArray(realChannels) && realChannels.length > 0) {
      return realChannels.filter(ch => ch.videos && ch.videos.length > 0);
    }
    
    // صفر بيانات وهمية: إرجاع مصفوفة فارغة لتعرض الواجهة Empty State نظيف
    return [];
  },

  /**
   * جلب قائمة تمارين درس محدد - بيانات حقيقية فقط دون أي توليد وهمي
   */
  getLessonExercises(subjectName, lessonTitle) {
    const subj = this.getSubject(subjectName);
    if (!subj) return [];

    const realExercises = this._findDataByLessonKey(subj.exercisesData, lessonTitle);
    if (realExercises && Array.isArray(realExercises) && realExercises.length > 0) {
      return realExercises;
    }

    // صفر بيانات وهمية: إرجاع مصفوفة فارغة لتعرض الواجهة Empty State نظيف
    return [];
  },

  /**
   * ============================================================
   * سجل الموارد الموحد (Resource Registry - Single Source of Truth)
   * ============================================================
   */

  /**
   * جلب كافة الموارد المسجلة في المنصة
   */
  getAllResources() {
    return Object.values(window.PlatformRegistry || {});
  },

  /**
   * جلب مورد محدد بواسطة معرفه العالمي الفريد (resourceId)
   */
  getResourceById(resourceId) {
    if (!resourceId || !window.PlatformRegistry) return null;
    return window.PlatformRegistry[resourceId] || null;
  },

  /**
   * جلب الموارد لمادة معينة بواسطة subjectId أو subjectName
   */
  getResourcesBySubject(subjectIdOrName) {
    const subj = this.getSubject(subjectIdOrName);
    const sId = subj ? subj.id : subjectIdOrName;
    return this.getAllResources().filter(r => r.subjectId === sId);
  },

  /**
   * جلب الموارد لمادة ونوع معينين (bac | exam | exercise | summary | review)
   */
  getResourcesByType(subjectIdOrName, type) {
    const subj = this.getSubject(subjectIdOrName);
    const sId = subj ? subj.id : subjectIdOrName;
    return this.getAllResources().filter(r => r.subjectId === sId && r.type === type);
  },

  /**
   * جلب الموارد المرتبطة بدرس محدد بواسطة lessonId الأساسي
   */
  getLessonResources(lessonId) {
    if (!lessonId) return [];
    return this.getAllResources().filter(r => r.lessonId === lessonId);
  },

  /**
   * جلب قائمة مراجعات مادة محددة (فيديوهات المراجعة الشاملة وقنوات الأساتذة)
   */
  getSubjectReviews(subjectName) {
    const subj = this.getSubject(subjectName);
    return subj ? (subj.reviews || []) : [];
  },

  /**
   * جلب قائمة الملخصات المعتمدة لمادة محددة
   */
  getSubjectSummaries(subjectName) {
    const subj = this.getSubject(subjectName);
    return subj ? (subj.summaries || []) : [];
  },

  /**
   * جلب أرشيف دورات البكالوريا لمادة محددة
   */
  getSubjectBac(subjectName) {
    const subj = this.getSubject(subjectName);
    return subj ? (subj.baccalaureate || []) : [];
  },

  /**
   * جلب امتحانات الفصول لمادة محددة
   */
  getSubjectExams(subjectName) {
    const subj = this.getSubject(subjectName);
    return subj ? (subj.exams || []) : [];
  },

  /**
   * تعيين أو إضافة قنوات وفيديوهات لدرس محدد
   */
  setLessonVideos(subjectName, lessonTitle, channelsArray) {
    const subj = this.getSubject(subjectName);
    if (!subj) return false;
    subj.channelsData = subj.channelsData || {};
    subj.channelsData[lessonTitle] = channelsArray;
    return true;
  },

  /**
   * تعيين أو إضافة تمارين لدرس محدد
   */
  setLessonExercises(subjectName, lessonTitle, exercisesArray) {
    const subj = this.getSubject(subjectName);
    if (!subj) return false;
    subj.exercisesData = subj.exercisesData || {};
    subj.exercisesData[lessonTitle] = exercisesArray;
    return true;
  },

  /**
   * إضافة درس جديد لمادة محددة
   */
  addLesson(subjectName, lessonObj) {
    const subj = this.getSubject(subjectName);
    if (!subj) return false;
    subj.lessons = subj.lessons || [];
    subj.lessons.push(lessonObj);
    return true;
  },

  /**
   * إضافة ملخص جديد لمادة محددة
   */
  addSummary(subjectName, summaryObj) {
    const subj = this.getSubject(subjectName);
    if (!subj) return false;
    subj.summaries = subj.summaries || [];
    subj.summaries.push(summaryObj);
    return true;
  },

  /**
   * إضافة دورة بكالوريا جديدة لمادة محددة
   */
  addBaccalaureate(subjectName, bacObj) {
    const subj = this.getSubject(subjectName);
    if (!subj) return false;
    subj.baccalaureate = subj.baccalaureate || [];
    subj.baccalaureate.push(bacObj);
    return true;
  },

  /**
   * جلب إحصائيات المنصة الشاملة عبر جميع المواد
   */
  getGlobalStats() {
    const subjects = this.getAllSubjects();
    let totalLessons = 0;
    let totalVideos = 0;
    let totalExercises = 0;
    let totalReviews = 0;
    let totalSummaries = 0;
    let totalBac = 0;

    subjects.forEach(s => {
      totalLessons += (s.lessons || []).length;
      totalSummaries += (s.summaries || []).length;
      totalBac += (s.baccalaureate || []).length;

      (s.reviews || []).forEach(r => {
        totalReviews += (r.videos || []).length;
      });

      (s.lessons || []).forEach(l => {
        const vids = this.getLessonVideos(s.name, l.title);
        vids.forEach(c => { totalVideos += (c.videos || []).length; });
        const exs = this.getLessonExercises(s.name, l.title);
        totalExercises += exs.length;
      });
    });

    return {
      subjectsCount: subjects.length,
      totalLessons,
      totalVideos,
      totalExercises,
      totalReviews,
      totalSummaries,
      totalBac
    };
  },

  /**
   * حفظ رابط يوتيوب مخصص في التخزين المحلي
   */
  saveCustomVideoUrl(channel, videoTitle, url) {
    localStorage.setItem(`yt_${channel}_${videoTitle}`, url);
  },

  /**
   * جلب رابط يوتيوب مخصص من التخزين المحلي
   */
  getCustomVideoUrl(channel, videoTitle) {
    return localStorage.getItem(`yt_${channel}_${videoTitle}`);
  },

  // ============================================================
  // سجل الموارد الموحد (Resource Registry - Single Source of Truth)
  // ============================================================

  /**
   * جلب كافة الموارد التعليمية المسجلة
   */
  getAllResources() {
    if (!window.PlatformRegistry) return [];
    return Object.values(window.PlatformRegistry);
  },

  /**
   * جلب مورد محدد بواسطة معرفه الفريد (resourceId)
   */
  getResourceById(resourceId) {
    if (!window.PlatformRegistry || !resourceId) return null;
    return window.PlatformRegistry[resourceId] || null;
  },

  /**
   * جلب موارد مادة محددة
   */
  getResourcesBySubject(subjectNameOrId) {
    const subj = this.getSubject(subjectNameOrId);
    const subjectId = subj ? subj.id : subjectNameOrId;
    return this.getAllResources().filter(r => r.subjectId === subjectId || r.subjectName === subjectNameOrId);
  },

  /**
   * جلب موارد مادة حسب نوعها (bac, exam, exercise, summary, review)
   */
  getResourcesByType(subjectNameOrId, type) {
    const res = this.getResourcesBySubject(subjectNameOrId);
    if (!type || type === 'all') return res;
    return res.filter(r => r.type === type);
  },

  /**
   * جلب موارد درس محدد بواسطة lessonId
   */
  getLessonResources(lessonId) {
    if (!lessonId) return [];
    return this.getAllResources().filter(r => r.lessonId === lessonId);
  }
};

window.PlatformStore = PlatformStore;
