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
  getLessons(subjectName) {
    const subj = this.getSubject(subjectName);
    return subj ? (subj.lessons || []) : [];
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
   * جلب قنوات وفيديوهات درس محدد
   */
  getLessonVideos(subjectName, lessonTitle) {
    const subj = this.getSubject(subjectName);
    if (!subj) return [];

    const realChannels = this._findDataByLessonKey(subj.channelsData, lessonTitle);
    if (realChannels && realChannels.length > 0) {
      return realChannels;
    }
    
    // توليد قنوات وفيديوهات متخصصة للدرس بحسب أساتذة المادة المعتمدين
    const teachersList = (subj.reviews && subj.reviews.length > 0)
      ? subj.reviews.map(r => r.channel)
      : ['الأساتذة المعتمدون', 'قناة البكالوريا الرسمية', 'المكتبة التعليمية الجزائرية'];

    const selectedTeachers = teachersList.slice(0, 3);
    return selectedTeachers.map((tch, idx) => ({
      channel: tch,
      channelUrl: '',
      videos: [
        {
          id: (idx * 2) + 1,
          title: `شرح درس ${lessonTitle} - الجزء 01`,
          duration: '25:00'
        },
        {
          id: (idx * 2) + 2,
          title: `حل تطبيقات وتمارين درس ${lessonTitle} - الجزء 02`,
          duration: '20:00'
        }
      ]
    }));
  },

  /**
   * جلب قائمة تمارين درس محدد
   */
  getLessonExercises(subjectName, lessonTitle) {
    const subj = this.getSubject(subjectName);
    if (!subj) return [];

    const realExercises = this._findDataByLessonKey(subj.exercisesData, lessonTitle);
    if (realExercises && realExercises.length > 0) {
      return realExercises;
    }

    return [
      { num: 1, title: `تمرين تطبيقي نموذجي: ${lessonTitle}`, type: 'docx' },
      { num: 2, title: `معالجة إشكالية وامتحان وزاري: ${lessonTitle}`, type: 'docx' }
    ];
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
  }
};

window.PlatformStore = PlatformStore;
