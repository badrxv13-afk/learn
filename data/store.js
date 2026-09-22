/**
 * mordix_ai — مخزن البيانات المركزي (Platform Data Store)
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
   * جلب كافة المواد المسجلة في المنصة حسب المستوى (3as أو 4am)
   */
  getAllSubjects(levelId) {
    const lvl = levelId || (typeof window !== 'undefined' && window.appState && window.appState.level) || '3as';
    if (lvl === '4am' && typeof window !== 'undefined' && window.PlatformData4AM) {
      return Object.values(window.PlatformData4AM);
    }
    return Object.values((typeof window !== 'undefined' && window.PlatformData) || {});
  },

  /**
   * جلب بيانات مادة محددة بالاسم أو المعرف مع مراعاة المستوى
   */
  getSubject(subjectName, levelId) {
    const lvl = levelId || (typeof window !== 'undefined' && window.appState && window.appState.level) || null;

    if (!subjectName) {
      if (lvl === '4am' && typeof window !== 'undefined' && window.PlatformData4AM) {
        return window.PlatformData4AM['math_4am'] || Object.values(window.PlatformData4AM)[0];
      }
      return (typeof window !== 'undefined' && window.PlatformData) ? window.PlatformData['الفلسفة'] : null;
    }

    // فحص 4AM أولاً إذا كان المستوى 4AM أو المعرف مخصصاً لـ 4AM
    if ((lvl === '4am' || String(subjectName).endsWith('_4am')) && typeof window !== 'undefined' && window.PlatformData4AM) {
      if (window.PlatformData4AM[subjectName]) return window.PlatformData4AM[subjectName];
      const match4am = Object.values(window.PlatformData4AM).find(s => s.id === subjectName || s.name === subjectName || s.title === subjectName);
      if (match4am) return match4am;
    }

    // فحص 3AS في PlatformData
    if (typeof window !== 'undefined' && window.PlatformData) {
      if (window.PlatformData[subjectName]) return window.PlatformData[subjectName];
      const match3as = Object.values(window.PlatformData).find(s => s.id === subjectName || s.name === subjectName || s.title === subjectName);
      if (match3as) return match3as;
    }

    // فحص في 4AM كحل بديل إذا لم يعثر عليه في 3AS
    if (typeof window !== 'undefined' && window.PlatformData4AM) {
      if (window.PlatformData4AM[subjectName]) return window.PlatformData4AM[subjectName];
      const matchFallback = Object.values(window.PlatformData4AM).find(s => s.id === subjectName || s.name === subjectName || s.title === subjectName);
      if (matchFallback) return matchFallback;
    }

    return (typeof window !== 'undefined' && window.PlatformData) ? window.PlatformData['الفلسفة'] : null;
  },

  /**
   * جلب قائمة دروس مادة محددة مع حساب الإحصائيات ديناميكياً من قاعدة البيانات
   * (DATA -> UI) لا أرقام وهمية أو ثابتة
   */
  getLessons(subjectName, levelId) {
    const subj = this.getSubject(subjectName, levelId);
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
  getLesson(subjectName, lessonTitleOrId, levelId) {
    const lessons = this.getLessons(subjectName, levelId);
    if (typeof lessonTitleOrId === 'number') {
      return lessons.find(l => l.id === lessonTitleOrId) || lessons[0];
    }
    return lessons.find(l => l.title === lessonTitleOrId) || lessons[0];
  },

  /**
   * جلب قنوات وفيديوهات درس محدد - بيانات حقيقية فقط دون أي توليد وهمي
   */
  getLessonVideos(subjectName, lessonTitle, levelId) {
    const subj = this.getSubject(subjectName, levelId);
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
   * يدعم الاستدعاء المعتمد (subjectName, lessonTitle) والاستدعاء المباشر بواسطة (lessonId)
   */
  getLessonExercises(subjectNameOrLessonId, lessonTitle, levelId) {
    // 1. دعم الاستدعاء المباشر بواسطة lessonId
    if (!lessonTitle && typeof subjectNameOrLessonId === 'string') {
      const lessonId = subjectNameOrLessonId.trim();
      const res = this.getLessonResources(lessonId, levelId).filter(r => r.type === 'exercise');
      if (res.length > 0) return res;

      // محاولة العثور على الدرس في شجرة المواد
      const allSubjs = this.getAllSubjects(levelId);
      for (const s of allSubjs) {
        const l = (s.lessons || []).find(item => item.lessonId === lessonId || item.id === lessonId);
        if (l) {
          return this.getLessonExercises(s.name, l.title, s.levelId || levelId);
        }
      }
      return [];
    }

    // 2. الاستدعاء الثنائي (subjectName, lessonTitle)
    const subj = this.getSubject(subjectNameOrLessonId, levelId);
    if (!subj) return [];

    const realExercises = this._findDataByLessonKey(subj.exercisesData, lessonTitle);
    if (realExercises && Array.isArray(realExercises) && realExercises.length > 0) {
      return realExercises;
    }

    // فحص احتياطي في السجل الموحد بواسطة lessonId
    const lObj = (subj.lessons || []).find(l => l.title === lessonTitle);
    if (lObj && lObj.lessonId) {
      const regExs = this.getLessonResources(lObj.lessonId, subj.levelId || levelId).filter(r => r.type === 'exercise');
      if (regExs.length > 0) return regExs;
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
   * جلب كافة الموارد المسجلة في المنصة مع دعم تصفية الطور (4am أو 3as)
   */
  getAllResources(levelId) {
    const lvl = levelId || (typeof window !== 'undefined' && window.appState && window.appState.level) || null;
    let all = [];
    if (typeof window !== 'undefined') {
      if (window.PlatformRegistry) {
        all = Object.values(window.PlatformRegistry);
      }
      if (window.PlatformRegistry4AM) {
        const existingIds = new Set(all.map(r => r.id || r.resourceId));
        Object.values(window.PlatformRegistry4AM).forEach(r => {
          if (!existingIds.has(r.id || r.resourceId)) {
            all.push(r);
          }
        });
      }
    }
    if (lvl === '4am') {
      return all.filter(r => r.levelId === '4am');
    } else if (lvl === '3as') {
      return all.filter(r => r.levelId === '3as' || !r.levelId || r.level === 'الثالثة ثانوي');
    }
    return all;
  },

  /**
   * جلب مورد محدد بواسطة معرفه العالمي الفريد (resourceId)
   */
  getResourceById(resourceId) {
    if (!resourceId) return null;
    if (typeof window !== 'undefined') {
      if (window.PlatformRegistry4AM && window.PlatformRegistry4AM[resourceId]) {
        return window.PlatformRegistry4AM[resourceId];
      }
      if (window.PlatformRegistry && window.PlatformRegistry[resourceId]) {
        return window.PlatformRegistry[resourceId];
      }
    }
    return null;
  },

  /**
   * جلب الموارد لمادة معينة بواسطة subjectId أو subjectName مع عزل الأطوار
   */
  getResourcesBySubject(subjectIdOrName, levelId) {
    const subj = this.getSubject(subjectIdOrName, levelId);
    const sId = subj ? subj.id : subjectIdOrName;
    const resolvedLevel = levelId || (subj ? subj.levelId : null) || (typeof window !== 'undefined' && window.appState && window.appState.level) || '3as';

    return this.getAllResources(resolvedLevel).filter(r => {
      const matchSubject = (r.subjectId === sId || r.subjectName === subjectIdOrName || (subj && (r.subjectName === subj.name || r.subjectName === subj.title)));
      if (!matchSubject) return false;

      // عزل صارم للأطوار لمنع أي تسرب للموارد
      if (resolvedLevel === '4am') {
        return r.levelId === '4am';
      } else {
        return r.levelId === '3as' || !r.levelId || r.level === 'الثالثة ثانوي';
      }
    });
  },

  /**
   * جلب الموارد لمادة ونوع معينين (bac | bem | exam | exercise | summary | review)
   */
  getResourcesByType(subjectIdOrName, type, levelId) {
    const res = this.getResourcesBySubject(subjectIdOrName, levelId);
    if (!type || type === 'all') return res;
    return res.filter(r => r.type === type);
  },

  /**
   * جلب الموارد المرتبطة بدرس محدد بواسطة lessonId الأساسي
   */
  getLessonResources(lessonId, levelId) {
    if (!lessonId) return [];
    return this.getAllResources(levelId).filter(r => r.lessonId === lessonId);
  },

  /**
   * جلب قائمة مراجعات مادة محددة (فيديوهات المراجعة الشاملة وقنوات الأساتذة)
   */
  getSubjectReviews(subjectName, levelId) {
    const subj = this.getSubject(subjectName, levelId);
    return subj ? (subj.reviews || []) : [];
  },

  /**
   * جلب قائمة الملخصات المعتمدة لمادة محددة
   */
  getSubjectSummaries(subjectName, levelId) {
    const subj = this.getSubject(subjectName, levelId);
    return subj ? (subj.summaries || []) : [];
  },

  /**
   * جلب أرشيف دورات البكالوريا لمادة محددة
   */
  getSubjectBac(subjectName, levelId) {
    const subj = this.getSubject(subjectName, levelId);
    return subj ? (subj.baccalaureate || []) : [];
  },

  /**
   * جلب امتحانات الفصول لمادة محددة
   */
  getSubjectExams(subjectName, levelId) {
    const subj = this.getSubject(subjectName, levelId);
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
  }
};

window.PlatformStore = PlatformStore;
