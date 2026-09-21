/**
 * منصة ألماد التعليمية - محرك التطبيق العام (Application Core Engine)
 * يدعم التوسع الديناميكي لكافة المواد والشعب والدروس
 * بدون أي إيموجيات (Zero Emojis)
 */

// حالة التطبيق (Application State)
const appState = {
  currentStep: 1, // 1: الطور, 2: السنة, 3: الشعبة
  stage: null,    // 'متوسط' | 'ثانوي'
  year: null,     // 'الأولى ثانوي' | 'الثانية ثانوي' | 'الثالثة ثانوي'
  branch: null,   // 'آداب وفلسفة' | 'علوم تجريبية' | 'رياضيات' | ...
  currentSubject: 'الفلسفة',
  currentLesson: 'الإحساس والادراك',
  currentVideo: 'التكيف بين العادة و الارادة',
  currentChannel: 'عادل مقرود',
  currentYouTubeUrl: '',
  currentEmbedUrl: '',
  isPlaying: false,
  lastStepBeforeUnavailable: 1,
  currentResource: null,
  currentResourceType: 'bac',
  currentViewerTab: 'problem',
};
window.appState = appState;


// عناصر واجهة المستخدم الرئيسية (UI Elements)
const wizardContainer = document.getElementById('wizard-container');
const screenUnavailable = document.getElementById('screen-unavailable');
const screenDashboard = document.getElementById('screen-dashboard');
const screenSubjectDetail = document.getElementById('screen-subject-detail');
const screenLessonsIndex = document.getElementById('screen-lessons-index');
const screenLessonHub = document.getElementById('screen-lesson-hub');
const screenLessonVideos = document.getElementById('screen-lesson-videos');
const screenVideoPlayer = document.getElementById('screen-video-player');
const screenLessonExercises = document.getElementById('screen-lesson-exercises');
const screenResourceIndex = document.getElementById('screen-resource-index');
const screenResourceViewer = document.getElementById('screen-resource-viewer');

const stepView1 = document.getElementById('step-view-1');
const stepView2 = document.getElementById('step-view-2');
const stepView3 = document.getElementById('step-view-3');

const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnNextText = document.getElementById('btn-next-text');

const stepIndicator1 = document.getElementById('step-indicator-1');
const stepIndicator2 = document.getElementById('step-indicator-2');
const stepIndicator3 = document.getElementById('step-indicator-3');
const stepLine1 = document.getElementById('step-line-1');
const stepLine2 = document.getElementById('step-line-2');

const unavailableReason = document.getElementById('unavailable-reason');
const activeSubjectBadge = document.getElementById('active-subject-badge');
const lessonsListContainer = document.getElementById('lessons-list-container');
const channelsVideosContainer = document.getElementById('channels-videos-container');

// تهيئة الصفحة عند التحميل
document.addEventListener('DOMContentLoaded', () => {
  renderLessons(appState.currentSubject);
  renderChannelsVideos(appState.currentLesson);
  updateStepUI();
  initYouTubeErrorListener();
});

// ============================================================
// 1. خدمات وروابط YouTube (YouTube & Media Resolver)
// ============================================================

function extractYouTubeId(url) {
  if (!url) return null;
  const cleanUrl = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
  const match = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

/**
 * منشئ روابط التضمين المعتمدة والمتوافقة مع الاستضافة الثابتة (GitHub Pages)
 * وسياسة Referrer لتفادي Error 153 وضمان صحة المعاملات.
 *
 * @param {string} videoId معرف الفيديو (11 حرفاً) أو رابطه
 * @param {object} options خيارات التضمين (autoplay)
 * @returns {string} رابط التضمين القياسي أو فارغ إذا كان المعرّف غير صالح
 */
function buildYouTubeEmbedUrl(videoId, options = {}) {
  const cleanId = extractYouTubeId(videoId);
  if (!cleanId) return '';

  const queryParts = [];
  queryParts.push('enablejsapi=1');
  queryParts.push('rel=0');
  queryParts.push('playsinline=1');

  if (options.autoplay !== undefined) {
    queryParts.push(`autoplay=${options.autoplay ? '1' : '0'}`);
  }

  // تمرير origin و widget_referrer ديناميكياً في بيئات الويب (GitHub Pages / HTTPS)
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const protocol = window.location.protocol;
    if ((protocol === 'http:' || protocol === 'https:') && origin && origin !== 'null') {
      queryParts.push(`origin=${encodeURIComponent(origin)}`);
      if (window.location.href) {
        queryParts.push(`widget_referrer=${encodeURIComponent(window.location.href)}`);
      }
    }
  }

  return `https://www.youtube.com/embed/${cleanId}?${queryParts.join('&')}`;
}

function getYouTubeSearchUrl(channel, title) {
  const query = encodeURIComponent(`أستاذ ${channel} ${title} ${appState.currentSubject} بكالوريا`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

function getYouTubeEmbedUrl(channel, title, explicitUrl) {
  if (explicitUrl) {
    const id = extractYouTubeId(explicitUrl);
    if (id) {
      return buildYouTubeEmbedUrl(id, { autoplay: 1 });
    }
  }
  return '';
}

function resolveVideoUrls(vid, channel) {
  const saved = PlatformStore.getCustomVideoUrl(channel, vid.title);
  if (saved) {
    const videoId = extractYouTubeId(saved);
    return {
      watchUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : saved,
      embedUrl: videoId ? buildYouTubeEmbedUrl(videoId, { autoplay: 1 }) : '',
      source: 'custom'
    };
  }

  if (vid.youtubeId) {
    const cleanId = extractYouTubeId(vid.youtubeId);
    return {
      watchUrl: `https://www.youtube.com/watch?v=${cleanId || vid.youtubeId}`,
      embedUrl: cleanId ? buildYouTubeEmbedUrl(cleanId, { autoplay: 1 }) : '',
      source: 'direct-id'
    };
  }

  if (vid.url) {
    const directId = extractYouTubeId(vid.url);
    return {
      watchUrl: vid.url,
      embedUrl: directId ? buildYouTubeEmbedUrl(directId, { autoplay: 1 }) : '',
      source: 'direct-url'
    };
  }

  return {
    watchUrl: getYouTubeSearchUrl(channel, vid.title),
    embedUrl: '',
    source: 'search'
  };
}

/**
 * معالج أخطاء مشغل يوتيوب (Error 153, 100, 101, 150)
 */
function handleYouTubePlayerError(errorCode) {
  const fallbackEl = document.getElementById('video-error-fallback');
  const embedFrame = document.getElementById('video-embed-frame');
  const previewFrame = document.getElementById('video-preview-frame');
  const errorTitleEl = document.getElementById('video-error-title');
  const errorDescEl = document.getElementById('video-error-desc');
  const externalBtn = document.getElementById('video-error-external-btn');

  if (!fallbackEl) return;

  let title = 'تعذر تشغيل الفيديو داخل المشغل';
  let desc = 'يقيد مشغل YouTube التضمين المباشر لهذا الفيديو عبر هذا البروتوكول. يمكنك مشاهدته مباشرة عبر الرابط الرسمي.';

  if (errorCode === 153) {
    title = 'خطأ في إعدادات مشغل الفيديو (Error 153)';
    desc = (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:')
      ? 'للاختبار المحلي استخدم خادم HTTP محلي. أما النسخة النهائية فتعمل وتُشغّل الفيديوهات مباشرة عبر GitHub Pages.'
      : 'حدث قيد على ترويسة المشغل أو سياسة الأمان (Error 153). يرجى فتح الفيديو مباشرة عبر الرابط المرفق.';
  } else if (errorCode === 101 || errorCode === 150) {
    title = `تضمين الفيديو محظور (Error ${errorCode})`;
    desc = 'قام ناشر هذا المقطع أو القناة بحظر تشغيل الفيديو خارج موقع YouTube. يمكنك متابعة المشاهدة مباشرة عبر الرابط الرسمي.';
  } else if (errorCode === 100) {
    title = 'الفيديو غير متاح (Error 100)';
    desc = 'هذا المقطع تم حذفه أو ضبطه كخاص على YouTube.';
  } else if (errorCode === 2 || errorCode === 5) {
    title = `معاملات الفيديو غير صالحة (Error ${errorCode})`;
    desc = 'معاملات رابط الفيديو غير صحيحة أو لم يتم تعيين معرّف فيديو معتمد لهذا الدرس.';
  }

  if (errorTitleEl) errorTitleEl.textContent = title;
  if (errorDescEl) errorDescEl.textContent = desc;
  if (externalBtn) {
    externalBtn.href = appState.currentYouTubeUrl || '#';
  }

  if (embedFrame) embedFrame.classList.add('hidden');
  if (previewFrame) previewFrame.classList.add('hidden');
  fallbackEl.classList.remove('hidden');
}

/**
 * مراقبة رسائل postMessage القادمة من مشغل YouTube
 */
function initYouTubeErrorListener() {
  if (typeof window === 'undefined' || !window.addEventListener) return;
  window.addEventListener('message', (event) => {
    if (!event.origin || (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com'))) {
      return;
    }

    let payload = event.data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return;
      }
    }

    if (!payload) return;

    if (payload.event === 'onError' && typeof payload.info !== 'undefined') {
      handleYouTubePlayerError(Number(payload.info));
    } else if (payload.info && typeof payload.info === 'number' && [153, 100, 101, 150, 2, 5].includes(payload.info)) {
      handleYouTubePlayerError(payload.info);
    }
  });
}

// ============================================================
// 2. محرك العرض العام للدروس والفيديوهات والتمارين
// ============================================================

/**
 * بناء قائمة دروس أي مادة ديناميكياً
 */
function renderLessons(subjectTitle) {
  if (!lessonsListContainer) return;
  const lessons = PlatformStore.getLessons(subjectTitle);

  lessonsListContainer.innerHTML = lessons.map(lesson => {
    const safeTitle = (lesson.title || '').replace(/'/g, "\\'");
    return `
    <div onclick="openLessonHub('${safeTitle}')" class="lesson-row-card p-3 sm:p-4 flex items-center justify-between gap-4" title="انقر لفتح فضاء الدرس وفيديوهاته">
      
      <div class="flex items-center gap-3 sm:gap-4 overflow-hidden">
        <span class="w-6 h-6 rounded-full border border-slate-300 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0 bg-white">
          ${lesson.id}
        </span>
        <h3 class="text-sm sm:text-base font-bold text-slate-800 truncate">
          ${lesson.title}
        </h3>
      </div>

      <div class="flex items-center gap-2 sm:gap-2.5 shrink-0">
        
        <div class="stat-pill px-2.5 py-1 flex items-center gap-1.5" title="${lesson.teachers} أساتذة محاضرين">
          <span class="text-xs sm:text-sm font-bold text-slate-700">${lesson.teachers}</span>
          <svg class="w-4 h-4 text-indigo-600 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="3" width="13" height="10" rx="1.5"></rect>
            <line x1="12" y1="7" x2="19" y2="7"></line>
            <line x1="15.5" y1="13" x2="15.5" y2="21"></line>
            <circle cx="4.5" cy="6" r="2"></circle>
            <path d="M2 19v-4a2.5 2.5 0 0 1 5 0v4"></path>
            <path d="M7 11l3-1"></path>
          </svg>
        </div>

        <div class="stat-pill px-2.5 py-1 flex items-center gap-1.5" title="${lesson.videos} مقطع فيديو">
          <span class="text-xs sm:text-sm font-bold text-slate-700">${lesson.videos}</span>
          <svg class="w-4 h-4 text-red-600 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="13" rx="2"></rect>
            <polygon points="10 7 15 9.5 10 12 10 7" fill="currentColor"></polygon>
            <line x1="7" y1="20" x2="17" y2="20"></line>
            <line x1="12" y1="16" x2="12" y2="20"></line>
          </svg>
        </div>

      </div>

    </div>
  `;
  }).join('');
}

/**
 * فتح شاشة فهرس الدروس لأي مادة
 */
function openLessonsIndex(subjectTitle, isPopState = false) {
  if (typeof subjectTitle === 'string' && subjectTitle.trim() !== '') {
    appState.currentSubject = subjectTitle.trim();
  }
  appState.currentSubject = appState.currentSubject || 'الفلسفة';
  sessionStorage.setItem('currentSubject', appState.currentSubject);

  const subjectBtn = document.getElementById('lessons-breadcrumb-subject-btn');
  const subjectText = document.getElementById('lessons-breadcrumb-subject-text');
  const titleEl = document.getElementById('lessons-index-title');
  const subtitleEl = document.getElementById('lessons-index-subtitle');
  const backBtnText = document.getElementById('lessons-back-btn-text');

  const lessons = PlatformStore.getLessons(appState.currentSubject);

  if (subjectText) subjectText.textContent = `المادة: ${appState.currentSubject}`;
  if (titleEl) titleEl.textContent = `فهرس الدروس (${lessons.length})`;
  if (subtitleEl) subtitleEl.textContent = `المحتوى المفصل لمادة ${appState.currentSubject} لشعبة ${appState.branch || 'آداب وفلسفة'}`;
  if (backBtnText) backBtnText.textContent = `العودة لفضاء مادة ${appState.currentSubject}`;

  renderLessons(appState.currentSubject);

  hideAllScreens();
  screenLessonsIndex.classList.remove('hidden');
  screenLessonsIndex.classList.add('animate-fadeIn');

  if (!isPopState) {
    pushNavigationState('lessons');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// دالة توافقية مع الاستدعاءات القديمة
function openPhilosophyLessonsIndex() {
  openLessonsIndex(appState.currentSubject || 'الفلسفة');
}

/**
 * فتح فضاء خيارات الدرس (فيديو الدرس | تمارين)
 */
function openLessonHub(lessonTitle, isPopState = false) {
  if (typeof lessonTitle === 'string' && lessonTitle.trim() !== '') {
    appState.currentLesson = lessonTitle.trim();
  }
  appState.currentLesson = appState.currentLesson || 'الإحساس والادراك';
  sessionStorage.setItem('currentLesson', appState.currentLesson);

  const titleEl = document.getElementById('lesson-hub-title');
  if (titleEl) titleEl.textContent = appState.currentLesson;

  const lessonInfo = PlatformStore.getLesson(appState.currentSubject, appState.currentLesson);
  const channels = PlatformStore.getLessonVideos(appState.currentSubject, appState.currentLesson);
  
  let totalVideos = 0;
  channels.forEach(ch => { totalVideos += (ch.videos ? ch.videos.length : 0); });
  if (totalVideos === 0 && lessonInfo) totalVideos = lessonInfo.videos;

  const hubBadge = document.getElementById('hub-videos-count-badge');
  if (hubBadge) hubBadge.textContent = `${totalVideos} مقطع فيديو وشرح`;

  const exercises = PlatformStore.getLessonExercises(appState.currentSubject, appState.currentLesson);
  const hubExBadge = document.getElementById('hub-exercises-count-badge');
  if (hubExBadge) hubExBadge.textContent = `${exercises.length} تمارين تطبيقية ونماذج`;

  hideAllScreens();
  screenLessonHub.classList.remove('hidden');
  screenLessonHub.classList.add('animate-fadeIn');

  if (!isPopState) {
    pushNavigationState('hub');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * فتح قائمة فيديوهات الدرس
 */
function openLessonVideos(lessonTitle, isPopState = false) {
  if (typeof lessonTitle === 'string' && lessonTitle.trim() !== '') {
    appState.currentLesson = lessonTitle.trim();
  }
  appState.currentLesson = appState.currentLesson || 'الإحساس والادراك';
  sessionStorage.setItem('currentLesson', appState.currentLesson);

  const channels = PlatformStore.getLessonVideos(appState.currentSubject, appState.currentLesson);
  let totalVids = 0;
  channels.forEach(ch => { totalVids += (ch.videos ? ch.videos.length : 0); });
  if (totalVids === 0) {
    const lessonInfo = PlatformStore.getLesson(appState.currentSubject, appState.currentLesson);
    totalVids = lessonInfo ? lessonInfo.videos : 0;
  }

  const bcEl = document.getElementById('videos-breadcrumb-lesson-text');
  if (bcEl) bcEl.textContent = `عنوان الدرس: ${appState.currentLesson}`;

  const titleEl = document.getElementById('videos-list-title');
  if (titleEl) titleEl.textContent = `فهرس فيديوهات الدرس (${totalVids})`;

  const subEl = document.getElementById('videos-list-subtitle');
  if (subEl) subEl.textContent = `شروحات ومحاضرات درس ${appState.currentLesson} مصنفة حسب قنوات الأساتذة`;

  renderChannelsVideos(appState.currentLesson);

  hideAllScreens();
  screenLessonVideos.classList.remove('hidden');
  screenLessonVideos.classList.add('animate-fadeIn');

  if (!isPopState) {
    pushNavigationState('videos');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}


/**
 * بناء قائمة الفيديوهات مصنفة بالقنوات والصور المصغرة
 */
function renderChannelsVideos(lessonName) {
  if (!channelsVideosContainer) return;

  const channels = PlatformStore.getLessonVideos(appState.currentSubject, lessonName);
  
  if (!channels || channels.length === 0) {
    channelsVideosContainer.innerHTML = `
      <div class="text-center py-12 px-6 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 stroke-current stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"></rect>
            <polygon points="10 8 16 11 10 14 10 8" fill="currentColor"></polygon>
          </svg>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-1">لم يتم إدراج فيديوهات موثقة لهذا الدرس بعد</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">يجري العمل على تدقيق واعتماد شروحات الأساتذة لهذا الدرس وفق المنهاج الجزائري المعتمد.</p>
      </div>
    `;
    return;
  }

  channelsVideosContainer.innerHTML = channels.map((chan) => `
    <div class="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
      
      <div class="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
            <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2"></rect><polygon points="10 8 16 11 10 14 10 8" fill="currentColor"></polygon></svg>
          </div>
          <div>
            <span class="text-[11px] text-slate-400 block leading-tight">قناة:</span>
            ${chan.channelUrl ? `
              <a href="${chan.channelUrl}" target="_blank" rel="noopener" class="text-sm font-bold text-slate-900 hover:text-red-700 transition-colors flex items-center gap-1.5 group" title="زيارة القناة على YouTube">
                <span>${chan.channel}</span>
                <svg class="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>
              </a>
            ` : `<h4 class="text-sm font-bold text-slate-900">${chan.channel}</h4>`}
          </div>
        </div>
        <span class="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
          ${chan.videos.length} فيديوهات
        </span>
      </div>

      <div class="space-y-2">
        ${chan.videos.map(vid => {
          const videoUrls = resolveVideoUrls(vid, chan.channel);
          const ytUrl = videoUrls.watchUrl;
          const isVerified = videoUrls.source === 'direct-id' || videoUrls.source === 'direct-url' || videoUrls.source === 'custom';
          const safeTitle = (vid.title || '').replace(/'/g, "\\'");
          const safeChan = (chan.channel || '').replace(/'/g, "\\'");
          return `
          <div class="video-item-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isVerified ? 'border-r-4 border-r-emerald-500' : ''}">
            <div onclick="playVideoLesson('${safeTitle}', '${safeChan}')" class="flex items-center gap-3 cursor-pointer flex-1">
              ${vid.thumbnail ? `
                <div class="relative w-20 sm:w-24 h-12 sm:h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-xs">
                  <img src="${vid.thumbnail}" alt="${safeTitle}" class="w-full h-full object-cover">
                  <div class="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div class="w-6 h-6 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow">
                      <svg class="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                  </div>
                </div>
              ` : `
                <div class="w-8 h-8 rounded-full ${isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'} flex items-center justify-center shrink-0">
                  <svg class="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
              `}
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <h5 class="text-xs sm:text-sm font-semibold text-slate-800 hover:text-red-700 transition-colors">
                    ${vid.title}
                  </h5>
                  ${isVerified ? `
                    <span class="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.2 rounded-md shrink-0">
                      رابط مؤكد
                    </span>
                  ` : ''}
                </div>
                ${vid.duration ? `<span class="text-[10px] text-slate-400">المدة المقدرة: ${vid.duration}</span>` : '<span class="text-[10px] text-slate-400">شرح دراسي معتمد</span>'}
              </div>
            </div>

            <!-- أزرار التشغيل ورابط YouTube -->
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button onclick="playVideoLesson('${safeTitle}', '${safeChan}')" class="text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                مشاهدة في المنصة
              </button>
              
              <a href="${ytUrl}" target="_blank" rel="noopener" class="text-[11px] font-bold ${isVerified ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'} px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer" title="فتح الفيديو مباشرة على YouTube">
                <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>
                </svg>
                <span>YouTube</span>
              </a>
            </div>
          </div>
        `}).join('')}
      </div>

    </div>
  `).join('');
}

/**
 * فتح قائمة التمارين لدرس محدد
 */
function openLessonExercises(lessonTitle, isPopState = false) {
  if (typeof lessonTitle === 'string' && lessonTitle.trim() !== '') {
    appState.currentLesson = lessonTitle.trim();
  }
  appState.currentLesson = appState.currentLesson || 'الإحساس والادراك';
  sessionStorage.setItem('currentLesson', appState.currentLesson);

  const bcEl = document.getElementById('exercises-breadcrumb-lesson-text');
  if (bcEl) bcEl.textContent = `عنوان الدرس: ${appState.currentLesson}`;

  const exList = PlatformStore.getLessonExercises(appState.currentSubject, appState.currentLesson);

  const titleEl = document.getElementById('exercises-list-title');
  if (titleEl) titleEl.textContent = `قائمة التمارين (${exList.length})`;

  const subEl = document.getElementById('exercises-list-subtitle');
  if (subEl) subEl.textContent = `تطبيقات ونماذج معتمدة لدرس ${appState.currentLesson} - مادة ${appState.currentSubject}`;

  renderExercises(appState.currentLesson);

  hideAllScreens();
  screenLessonExercises.classList.remove('hidden');
  screenLessonExercises.classList.add('animate-fadeIn');

  if (!isPopState) {
    pushNavigationState('exercises');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * بناء قائمة بطاقات التمارين ديناميكياً للدرس المحدد مستندة إلى سجل الموارد الموحد
 */
function renderExercises(lessonTitle) {
  const container = document.getElementById('exercises-container');
  if (!container) return;

  const currentSubj = appState.currentSubject;
  const lessonObj = PlatformStore.getLesson(currentSubj, lessonTitle);
  const lessonId = lessonObj ? lessonObj.lessonId : null;

  // استعلام الموارد من السجل الموحد أولاً بواسطة lessonId
  let registeredExercises = [];
  if (lessonId) {
    registeredExercises = PlatformStore.getLessonResources(lessonId).filter(r => r.type === 'exercise');
  }

  // إذا لم نجد بواسطة lessonId، نبحث عبر كافة الموارد بعنوان الدرس
  if (registeredExercises.length === 0) {
    registeredExercises = PlatformStore.getAllResources().filter(r => 
      r.type === 'exercise' && 
      (r.subjectName === currentSubj || r.subjectId === currentSubj) &&
      (r.lessonTitle === lessonTitle || (r.title && r.title.includes(lessonTitle)))
    );
  }

  if (!registeredExercises || registeredExercises.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 px-6 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 stroke-current stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-1">لا توجد نماذج تمارين منشورة لهذا الدرس حالياً</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">جاري تدقيق وإدراج المواضيع الوزارية ونماذج البكالوريا الخاصة بهذا الدرس.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = registeredExercises.map((res, idx) => {
    const isOfficial = res.source && res.source.type === 'official';
    const sourceLabel = isOfficial ? 'مصدر رسمي' : (res.source ? res.source.name : 'مصدر معتمد');
    const badgeText = res.badge || `تمرين 0${idx + 1}`;
    const hasSolution = res.solution && res.solution.available;

    return `
      <div class="exercise-item-card p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-brand-400 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3 sm:gap-4 flex-1">
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
            <svg class="w-6 h-6 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                ${badgeText}
              </span>
              <span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                ${sourceLabel}
              </span>
              <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                الموضوع: متوفر
              </span>
              ${hasSolution ? `
                <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  الحل: متوفر
                </span>
              ` : ''}
            </div>
            <h4 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              ${res.title}
            </h4>
            <p class="text-xs text-slate-500 mt-1">
              ${res.problem && res.problem.text ? res.problem.text.substring(0, 110) + '...' : 'تطبيق منهجي مع شبكة التقويم وسلم التنقيط النموذجي الوزاري'}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
          <button onclick="openResourceViewer('${res.id}', 'problem')" class="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
            <svg class="w-3.5 h-3.5 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>عرض التمرين</span>
          </button>
          ${hasSolution ? `
            <button onclick="openResourceViewer('${res.id}', 'solution')" class="text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
              <svg class="w-3.5 h-3.5 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>عرض الحل</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// 3. مشغل الفيديو ومعاينة التمارين (Player & Modals)
// ============================================================

function playVideoLesson(videoTitle, channelName, isPopState = false) {
  if (typeof videoTitle === 'string' && videoTitle.trim() !== '') {
    appState.currentVideo = videoTitle.trim();
  }
  if (typeof channelName === 'string' && channelName.trim() !== '') {
    appState.currentChannel = channelName.trim();
  } else if (!appState.currentChannel) {
    appState.currentChannel = 'عادل مقرود';
  }
  appState.isPlaying = false;

  const titleEl = document.getElementById('player-video-title');
  const breadcrumbEl = document.getElementById('player-breadcrumb-title');
  const channelEl = document.getElementById('player-channel-title');
  const btnOpenYt = document.getElementById('btn-open-youtube');

  if (titleEl) titleEl.textContent = `درس ${appState.currentVideo}`;
  if (breadcrumbEl) breadcrumbEl.textContent = appState.currentVideo;
  if (channelEl) channelEl.textContent = `قناة: ${appState.currentChannel}`;

  const channels = PlatformStore.getLessonVideos(appState.currentSubject, appState.currentLesson);
  const chanObj = channels ? channels.find(c => c.channel === appState.currentChannel) : null;
  const vidObj = chanObj ? chanObj.videos.find(v => v.title === appState.currentVideo) : null;
  const vidData = vidObj || { title: appState.currentVideo };

  const videoUrls = resolveVideoUrls(vidData, appState.currentChannel);
  appState.currentYouTubeUrl = videoUrls.watchUrl;
  appState.currentEmbedUrl = videoUrls.embedUrl;

  if (btnOpenYt) {
    btnOpenYt.href = videoUrls.watchUrl;
  }

  // تحديث أزرار التنقل السريع للدرس في أسفل المشغل
  const totalVideos = channels.reduce((acc, c) => acc + (c.videos ? c.videos.length : 0), 0);
  const exercises = PlatformStore.getLessonExercises(appState.currentSubject, appState.currentLesson);
  const vidsTextEl = document.getElementById('player-btn-videos-text');
  const exTextEl = document.getElementById('player-btn-exercises-text');
  if (vidsTextEl) vidsTextEl.textContent = `قائمة الفيديوهات (${totalVideos})`;
  if (exTextEl) exTextEl.textContent = `تمارين الدرس (${exercises.length})`;

  resetPlayerFrames();

  hideAllScreens();
  screenVideoPlayer.classList.remove('hidden');
  screenVideoPlayer.classList.add('animate-fadeIn');

  if (!isPopState) {
    pushNavigationState('player');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetPlayerFrames() {
  const embedFrame = document.getElementById('video-embed-frame');
  const previewFrame = document.getElementById('video-preview-frame');
  const fallbackFrame = document.getElementById('video-error-fallback');
  const iframe = document.getElementById('youtube-iframe-player');

  if (embedFrame && previewFrame && iframe) {
    embedFrame.classList.add('hidden');
    if (fallbackFrame) fallbackFrame.classList.add('hidden');
    previewFrame.classList.remove('hidden');
    iframe.src = '';
  }
}

function playYouTubeEmbed() {
  const embedFrame = document.getElementById('video-embed-frame');
  const previewFrame = document.getElementById('video-preview-frame');
  const fallbackFrame = document.getElementById('video-error-fallback');
  const iframe = document.getElementById('youtube-iframe-player');

  if (!embedFrame || !previewFrame || !iframe) return;

  if (fallbackFrame) fallbackFrame.classList.add('hidden');

  let embedUrl = appState.currentEmbedUrl;
  if (!embedUrl && appState.currentYouTubeUrl) {
    embedUrl = buildYouTubeEmbedUrl(appState.currentYouTubeUrl, { autoplay: 1 });
  }

  if (!embedUrl) {
    handleYouTubePlayerError(2);
    return;
  }

  if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
    console.warn('[ELMED YouTube Player] للاختبار المحلي استخدم خادم HTTP محلي. أما النسخة النهائية فتعمل وتُشغّل الفيديوهات مباشرة عبر GitHub Pages.');
  }

  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.src = embedUrl;

  previewFrame.classList.add('hidden');
  embedFrame.classList.remove('hidden');
}

function promptCustomYouTubeUrl() {
  const currentVal = PlatformStore.getCustomVideoUrl(appState.currentChannel, appState.currentVideo) || appState.currentYouTubeUrl || '';
  const input = prompt('أدخل رابط أو معرّف فيديو YouTube لهذا الدرس (مثلاً: https://www.youtube.com/watch?v=... أو معرّف 11 حرفاً):', currentVal);

  if (input !== null && input.trim() !== '') {
    const cleanInput = input.trim();
    PlatformStore.saveCustomVideoUrl(appState.currentChannel, appState.currentVideo, cleanInput);
    
    const videoUrls = resolveVideoUrls({ title: appState.currentVideo, url: cleanInput }, appState.currentChannel);
    appState.currentYouTubeUrl = videoUrls.watchUrl;
    appState.currentEmbedUrl = videoUrls.embedUrl;

    const btnOpenYt = document.getElementById('btn-open-youtube');
    if (btnOpenYt) btnOpenYt.href = appState.currentYouTubeUrl;

    playYouTubeEmbed();
    alert('تم حفظ وتفعيل رابط الفيديو بنجاح!');
  }
}

function openExerciseModal(exNumber, exTitle, questionText) {
  const modal = document.getElementById('exercise-detail-modal');
  const tag = document.getElementById('exercise-modal-tag');
  const title = document.getElementById('exercise-modal-title');
  const question = document.getElementById('exercise-modal-question');

  tag.textContent = `تمرين تطبيقي رقم 0${exNumber}`;
  title.textContent = `${exTitle} (تمرين ${exNumber})`;
  question.textContent = questionText;

  modal.classList.remove('hidden');
}

function closeExerciseModal() {
  const modal = document.getElementById('exercise-detail-modal');
  if (modal) modal.classList.add('hidden');
}

function closeLessonModal() {
  const modal = document.getElementById('lesson-detail-modal');
  if (modal) modal.classList.add('hidden');
}

// ============================================================
// 4. فضاء المادة ولوحة التحكم والتنقل (Subjects & Dashboard)
// ============================================================

function openSubjectDetail(subjectName, isPopState = false) {
  if (typeof subjectName === 'string' && subjectName.trim() !== '') {
    appState.currentSubject = subjectName.trim();
  }
  appState.currentSubject = appState.currentSubject || 'الفلسفة';
  sessionStorage.setItem('currentSubject', appState.currentSubject);

  const subj = PlatformStore.getSubject(appState.currentSubject);

  if (activeSubjectBadge) {
    activeSubjectBadge.textContent = appState.currentSubject;
  }

  // تحديث عناصر صفحة المادة ديناميكياً
  const subjectNameEl = document.getElementById('subject-detail-name');
  const subjectDescEl = document.getElementById('subject-detail-desc');
  const subjectLessonsCountEl = document.getElementById('subject-detail-lessons-count');
  const subjectDurationEl = document.getElementById('subject-detail-duration');
  const subjectBranchEl = document.getElementById('subject-detail-branch');

  if (subjectNameEl && subj) subjectNameEl.textContent = subj.name;
  if (subjectDescEl && subj) subjectDescEl.textContent = subj.description || `منهاج مادة ${subj.name} المعتمد لشهادة البكالوريا`;
  if (subjectLessonsCountEl && subj) subjectLessonsCountEl.textContent = `${(subj.lessons || []).length} درساً`;
  if (subjectDurationEl && subj) subjectDurationEl.textContent = subj.duration || '—';
  if (subjectBranchEl && subj) subjectBranchEl.textContent = subj.branch || 'آداب وفلسفة';

  hideAllScreens();
  screenSubjectDetail.classList.remove('hidden');
  screenSubjectDetail.classList.add('animate-fadeIn');

  if (!isPopState) {
    pushNavigationState('subject');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * العودة الآمنة لفضاء المادة الحالية دون فقدان حالتها
 */
function backToCurrentSubject() {
  openSubjectDetail(appState.currentSubject);
}

/**
 * العودة الآمنة لفهرس دروس المادة الحالية
 */
function backToCurrentLessons() {
  openLessonsIndex(appState.currentSubject);
}

/**
 * العودة الآمنة لخيارات الدرس الحالي
 */
function backToCurrentLessonHub() {
  openLessonHub(appState.currentLesson);
}

function backToSubjects() {
  showDashboard();
}

function openCategoryContent(categoryName) {
  if (categoryName === 'الدروس') {
    openLessonsIndex(appState.currentSubject);
    return;
  }
  openResourceIndex(categoryName, appState.currentSubject);
}

// ============================================================
// محرك فهرس وعرض الموارد التعليمية الموحد (Resource Presentation Engine)
// تجربة مستقلة كاملة الشاشة بديلة عن النوافذ المنبثقة (Zero Modals for Learning Content)
// ============================================================

/**
 * فتح فهرس الموارد التعليمية للمادة المحددة بنظام البطاقات المنظمة
 */
function openResourceIndex(categoryType = 'all', subjectName = null, isPopState = false) {
  if (subjectName && typeof subjectName === 'string') {
    appState.currentSubject = subjectName.trim();
  }
  appState.currentSubject = appState.currentSubject || 'الفلسفة';
  sessionStorage.setItem('currentSubject', appState.currentSubject);

  // مطابقة أسماء الأقسام العربية مع المعرفات البرمجية
  let filterType = categoryType;
  if (categoryType === 'البكالوريا') filterType = 'bac';
  else if (categoryType === 'امتحانات') filterType = 'exam';
  else if (categoryType === 'ملخصات') filterType = 'summary';
  else if (categoryType === 'المراجعات') filterType = 'review';
  else if (categoryType === 'التمارين') filterType = 'exercise';

  appState.currentResourceType = filterType;

  // تحديث مسار التوجيه (Breadcrumbs)
  const breadcrumbSubjectText = document.getElementById('resource-index-breadcrumb-subject-text');
  const breadcrumbType = document.getElementById('resource-index-breadcrumb-type');
  const indexTitle = document.getElementById('resource-index-title');
  const indexSubtitle = document.getElementById('resource-index-subtitle');
  const backBtnText = document.getElementById('resource-index-back-btn-text');

  if (breadcrumbSubjectText) breadcrumbSubjectText.textContent = `المادة: ${appState.currentSubject}`;
  if (backBtnText) backBtnText.textContent = `العودة لفضاء مادة ${appState.currentSubject}`;

  const typeConfig = {
    'bac': {
      label: 'البكالوريا',
      title: `مواضيع البكالوريا الرسمية - ${appState.currentSubject}`,
      subtitle: `أرشيف دورات شهادة البكالوريا لمادة ${appState.currentSubject} مع المواضيع وسلالم التنقيط الوزارية`,
      colorClass: 'border-rose-200 text-rose-800 bg-rose-50'
    },
    'exam': {
      label: 'امتحانات الفصول',
      title: `امتحانات واختبارات الفصول - ${appState.currentSubject}`,
      subtitle: `نماذج اختبارات فصلية من مختلف ثانويات الوطن مع حلولها النموذجية`,
      colorClass: 'border-orange-200 text-orange-800 bg-orange-50'
    },
    'exercise': {
      label: 'التمارين والتطبيقات',
      title: `بنك التمارين والتطبيقات المنهجية - ${appState.currentSubject}`,
      subtitle: `تطبيقات ومقالات ونصوص نموذجية مع عناصر الإجابة وسلم التنقيط المعتمد`,
      colorClass: 'border-blue-200 text-blue-800 bg-blue-50'
    },
    'summary': {
      label: 'الملخصات',
      title: `فهرس الملخصات والمطويات المعتمدة - ${appState.currentSubject}`,
      subtitle: `ملخصات وزارية وشاملة وموثوقة لمنهاج مادة ${appState.currentSubject}`,
      colorClass: 'border-teal-200 text-teal-800 bg-teal-50'
    },
    'review': {
      label: 'المراجعات الشاملة',
      title: `المراجعات الشاملة والنهائية - ${appState.currentSubject}`,
      subtitle: `باقة حصص مراجعة مركزة لحل المواضيع ومراجعة المفاهيم الكبرى لشهادة البكالوريا`,
      colorClass: 'border-amber-200 text-amber-800 bg-amber-50'
    },
    'all': {
      label: 'كافة الموارد',
      title: `فهرس الموارد التعليمية الشامل - ${appState.currentSubject}`,
      subtitle: `أرشيف موحد لكافة دورات البكالوريا، الامتحانات، التمارين، والملخصات لمادة ${appState.currentSubject}`,
      colorClass: 'border-slate-800 text-white bg-slate-900'
    }
  };

  const currentCfg = typeConfig[filterType] || typeConfig['all'];
  if (breadcrumbType) breadcrumbType.textContent = currentCfg.label;
  if (indexTitle) indexTitle.textContent = currentCfg.title;
  if (indexSubtitle) indexSubtitle.textContent = currentCfg.subtitle;

  // تحديث أزرار فلاتر الأقسام بصرياً
  const filterBtns = ['all', 'bac', 'exam', 'exercise', 'summary', 'review'];
  filterBtns.forEach(t => {
    const btn = document.getElementById(`res-filter-${t}`);
    if (btn) {
      if (t === filterType) {
        btn.className = `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${typeConfig[t].colorClass}`;
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer';
      }
    }
  });

  // استعلام الموارد وعرض البطاقات
  const resources = PlatformStore.getResourcesByType(appState.currentSubject, filterType);
  renderResourceCards(resources, filterType);

  hideAllScreens();
  if (screenResourceIndex) {
    screenResourceIndex.classList.remove('hidden');
    screenResourceIndex.classList.add('animate-fadeIn');
  }

  if (!isPopState) {
    pushNavigationState('resource-index', { type: filterType, subject: appState.currentSubject });
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * بناء بطاقات الموارد ديناميكياً وفق معايير UI المعتمدة (Clean Cards)
 */
function renderResourceCards(resources, filterType) {
  const container = document.getElementById('resource-cards-container');
  if (!container) return;

  if (!resources || resources.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-6 bg-slate-50/90 rounded-3xl border border-slate-200 shadow-2xs">
        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 stroke-current stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <h4 class="text-sm font-bold text-slate-800 mb-1">لا توجد موارد مسجلة في هذا القسم حالياً</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">جاري تدقيق وإدراج الموارد الرسمية المعتمدة لمادة ${appState.currentSubject}.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = resources.map(res => {
    const isOfficial = res.source && res.source.type === 'official';
    const sourceBadge = isOfficial 
      ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">مصدر رسمي: ${res.source.name || 'الديوان الوطني / DzExams'}</span>`
      : `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md">مصدر خارجي: ${res.source.name || 'قناة تعليمية'}</span>`;

    const statusProblem = res.problem && res.problem.available
      ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">الموضوع: متوفر</span>`
      : `<span class="text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">الموضوع: —</span>`;

    const statusSolution = res.solution && res.solution.available
      ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">الحل: متوفر</span>`
      : `<span class="text-[11px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">الحل: —</span>`;

    const tagBadge = res.badge 
      ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">${res.badge}</span>`
      : `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">${res.type}</span>`;

    const extraLesson = res.lessonTitle 
      ? `<span class="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">الدرس: ${res.lessonTitle}</span>`
      : '';

    const extraYearTerm = res.year 
      ? `<span class="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">دورة ${res.year}</span>`
      : (res.term ? `<span class="text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">${res.term}</span>` : '');

    const hasSolution = res.solution && res.solution.available;

    return `
      <div class="resource-card p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-brand-400 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex-1">
          <div class="flex flex-wrap items-center gap-2 mb-2">
            ${tagBadge}
            ${extraYearTerm}
            ${extraLesson}
            ${sourceBadge}
          </div>
          <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-snug mb-2">
            ${res.title}
          </h3>
          <div class="flex items-center gap-3">
            ${statusProblem}
            ${statusSolution}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
          <button onclick="openResourceViewer('${res.id}', 'problem')" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
            <svg class="w-3.5 h-3.5 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>عرض الموضوع</span>
          </button>
          ${hasSolution ? `
            <button onclick="openResourceViewer('${res.id}', 'solution')" class="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
              <svg class="w-3.5 h-3.5 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>عرض الحل</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function filterResourceIndex(type) {
  openResourceIndex(type, appState.currentSubject);
}

function backToResourceIndex() {
  openResourceIndex(appState.currentResourceType || 'all', appState.currentSubject);
}

/**
 * فتح عارض المورد المخصص المستقل بكامل الشاشة (Dedicated Resource Viewer Screen)
 */
function openResourceViewer(resourceId, initialTab = 'problem', isPopState = false) {
  const res = PlatformStore.getResourceById(resourceId);
  if (!res) {
    console.error('Resource not found in registry:', resourceId);
    showDashboard();
    return;
  }

  appState.currentResource = res;
  appState.currentSubject = res.subjectName || appState.currentSubject;
  appState.currentViewerTab = initialTab || 'problem';

  // تحديث مسار التوجيه
  const breadcrumbSubject = document.getElementById('viewer-breadcrumb-subject-text');
  const breadcrumbType = document.getElementById('viewer-breadcrumb-type-text');
  const breadcrumbTitle = document.getElementById('viewer-breadcrumb-title');

  if (breadcrumbSubject) breadcrumbSubject.textContent = `المادة: ${res.subjectName}`;
  const typeLabels = {
    'bac': 'فهرس البكالوريا',
    'exam': 'امتحانات الفصول',
    'exercise': 'بنك التمارين',
    'summary': 'الملخصات المعتمدة',
    'review': 'المراجعات الشاملة'
  };
  if (breadcrumbType) breadcrumbType.textContent = typeLabels[res.type] || 'فهرس الموارد';
  if (breadcrumbTitle) breadcrumbTitle.textContent = res.title;

  // تحديث بطاقة التعريف بالمورد (Metadata Card)
  const tagType = document.getElementById('viewer-tag-type');
  const tagSubject = document.getElementById('viewer-tag-subject');
  const tagLevel = document.getElementById('viewer-tag-level');
  const viewerTitle = document.getElementById('viewer-title');
  const sourceBadgeContainer = document.getElementById('viewer-source-badge-container');
  const metaDetails = document.getElementById('viewer-meta-details');
  const statusProblem = document.getElementById('viewer-status-problem');
  const statusSolution = document.getElementById('viewer-status-solution');

  if (tagType) tagType.textContent = res.badge || res.type;
  if (tagSubject) tagSubject.textContent = res.subjectName;
  if (tagLevel) tagLevel.textContent = `${res.level || 'الثالثة ثانوي'} • ${res.branch || 'آداب وفلسفة'}`;
  if (viewerTitle) viewerTitle.textContent = res.title;

  const isOfficial = res.source && res.source.type === 'official';
  if (sourceBadgeContainer) {
    sourceBadgeContainer.innerHTML = isOfficial
      ? `<span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"><svg class="w-3.5 h-3.5 stroke-current stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> مصدر رسمي معتمد: ${res.source.name}</span>`
      : `<span class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full"><svg class="w-3.5 h-3.5 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> مصدر خارجي موثوق: ${res.source.name}</span>`;
  }

  if (metaDetails) {
    let detailsHtml = '';
    if (res.year) detailsHtml += `<span><strong>الدورة:</strong> ${res.year}</span>`;
    if (res.term) detailsHtml += `<span><strong>الفصل:</strong> ${res.term}</span>`;
    if (res.lessonTitle) detailsHtml += `<span><strong>الدرس المقترن:</strong> ${res.lessonTitle}</span>`;
    metaDetails.innerHTML = detailsHtml;
  }

  if (statusProblem) {
    statusProblem.textContent = (res.problem && res.problem.available) ? 'الموضوع: متوفر' : 'الموضوع: —';
  }
  if (statusSolution) {
    statusSolution.textContent = (res.solution && res.solution.available) ? 'الحل: متوفر' : 'الحل: —';
  }

  // بناء محتوى التبويبات حسب Case A و Case B
  renderViewerPanes(res);

  // أزرار الإجراءات السفلية
  const btnDownload = document.getElementById('viewer-btn-download');
  const btnSource = document.getElementById('viewer-btn-source');

  const downloadUrl = (res.problem && res.problem.url) || (res.solution && res.solution.url) || (res.source && res.source.url);
  if (btnDownload) {
    if (downloadUrl) {
      btnDownload.href = downloadUrl;
      btnDownload.classList.remove('hidden');
    } else {
      btnDownload.classList.add('hidden');
    }
  }

  if (btnSource) {
    if (res.source && res.source.url) {
      btnSource.href = res.source.url;
      btnSource.classList.remove('hidden');
    } else {
      btnSource.classList.add('hidden');
    }
  }

  // تفعيل التبويب المبدئي
  switchViewerTab(initialTab);

  hideAllScreens();
  if (screenResourceViewer) {
    screenResourceViewer.classList.remove('hidden');
    screenResourceViewer.classList.add('animate-fadeIn');
  }

  if (!isPopState) {
    pushNavigationState('resource-viewer', { resourceId: res.id, tab: initialTab, subject: appState.currentSubject });
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * بناء محتوى نافذتي الموضوع والحل بدقة مع تطبيق حالتي المحتوى (Case A / Case B)
 */
function renderViewerPanes(res) {
  const problemPane = document.getElementById('viewer-pane-problem');
  const solutionPane = document.getElementById('viewer-pane-solution');
  if (!problemPane || !solutionPane) return;

  const isCaseA = res.contentCase === 'A';
  const isOfficial = res.source && res.source.type === 'official';

  // ------------------------------------------------------------
  // 1. محتوى تبويب الموضوع (Problem Pane)
  // ------------------------------------------------------------
  if (isCaseA) {
    if (res.problem && res.problem.format === 'video' && res.metadata && res.metadata.youtubeId) {
      // فيديو مراجعة أو حل موضوع
      const reviewEmbedUrl = buildYouTubeEmbedUrl(res.metadata.youtubeId, { autoplay: 0 });
      problemPane.innerHTML = `
        <div class="rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video shadow-md">
          <iframe class="w-full h-full" src="${reviewEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 class="text-xs font-bold text-slate-700">${res.title}</h4>
            <span class="text-[11px] text-slate-400">قناة الأستاذ: ${res.metadata.channel || res.source.name} • المدة: ${res.metadata.duration || '25:00'}</span>
          </div>
          <a href="https://www.youtube.com/watch?v=${res.metadata.youtubeId}" target="_blank" rel="noopener" class="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 self-start sm:self-center">
            <span>فتح على YouTube</span>
          </a>
        </div>
      `;
    } else {
      // نص الإشكالية أو التمرين المنهجي
      const textContent = (res.problem && res.problem.text) || 'نص الموضوع أو الإشكالية المنهجية المقررة.';
      problemPane.innerHTML = `
        <div class="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
              <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <h3 class="text-base font-bold text-slate-900">نص الموضوع والإشكالية المقررة</h3>
          </div>
          <div class="p-5 rounded-xl bg-slate-50 border border-slate-200/80 mb-6">
            <p class="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed font-heading">
              ${textContent}
            </p>
          </div>
          <div class="text-xs text-slate-500 leading-relaxed space-y-2 border-t border-slate-100 pt-4">
            <div class="font-bold text-slate-700">توجيهات منهجية لمعالجة الموضوع:</div>
            <ul class="list-disc list-inside space-y-1 text-slate-600">
              <li>قراءة نص الموضوع أو السند بدقة وتحديد المصطلحات المفتاحية والعناد الفلسفي / الإشكالي.</li>
              <li>ضبط المنهجية المطلوبة (طريقة جدلية، استقصاء بالوضع، تحليل نص، أو حل مسألة).</li>
              <li>الالتزام بالخطوات المنهجية المعتمدة رسمياً في سلم التنقيط الوزاري.</li>
            </ul>
          </div>
        </div>
      `;
    }
  } else {
    // Case B: وثيقة المصدر المعتمد الرسمية
    const targetUrl = (res.problem && res.problem.url) || (res.source && res.source.url) || '#';
    const sourceTitle = isOfficial ? 'الديوان الوطني للامتحانات والمسابقات / DzExams' : (res.source.name || 'المصدر المعتمد');
    problemPane.innerHTML = `
      <div class="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
        <div class="w-16 h-16 rounded-2xl bg-brand-50 text-brand-700 border border-brand-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <svg class="w-8 h-8 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <span class="text-xs font-bold px-3 py-1 rounded-full ${isOfficial ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'} mb-3 inline-block">
          ${isOfficial ? 'وثيقة رسمية معتمدة' : 'مورد تعليمي خارجي'}
        </span>
        <h3 class="text-lg sm:text-xl font-bold text-slate-900 font-heading mb-2">
          ${res.title}
        </h3>
        <p class="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed mb-6">
          الموضوع الأصلي متوفر كاملاً بصيغة الطباعة الرسمية عبر أرشيف (${sourceTitle}). يمكنك فتحه مباشرة والاطلاع عليه دون أي اختصار.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <a href="${targetUrl}" target="_blank" rel="noopener" class="px-6 py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer">
            <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            <span>الانتقال إلى المصدر للاطلاع على الموضوع كاملاً</span>
          </a>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------
  // 2. محتوى تبويب الحل وسلم التنقيط (Solution Pane)
  // ------------------------------------------------------------
  if (isCaseA) {
    if (res.solution && res.solution.available) {
      const solutionIntro = res.solution.text || 'عناصر الإجابة وسلم التنقيط الوزاري النموذجي:';
      const markingScheme = res.solution.markingScheme || [
        'طرح المشكلة (المقدمة وضبط المفاهيم والعناد الفلسفي) [4 نقاط]',
        'محاولة حل المشكلة: عرض الموقف الأول ونقده وحججه [4 نقاط]',
        'عرض الموقف الثاني ونقده وحججه [4 نقاط]',
        'التركيب والحل النهائي المنهجي [4 نقاط]',
        'سلامة اللغة والمنطق وتناسق الأفكار [4 نقاط]'
      ];

      solutionPane.innerHTML = `
        <div class="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900">عناصر الإجابة النموذجية وسلالم التنقيط الوزارية</h3>
              <span class="text-[11px] text-slate-400">مجموع العلامة: [20 / 20]</span>
            </div>
          </div>
          <p class="text-xs sm:text-sm font-semibold text-slate-700 mb-4">${solutionIntro}</p>
          <div class="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200/90 mb-6">
            <h4 class="text-xs font-bold text-emerald-900 mb-3">شبكة التقويم وتوزيع النقاط المعتمدة:</h4>
            <ul class="space-y-2.5">
              ${markingScheme.map(item => `
                <li class="text-xs sm:text-sm text-slate-800 flex items-start gap-2.5">
                  <svg class="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  <span class="font-medium">${item}</span>
                </li>
              `).join('')}
            </ul>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed">
            <strong>ملاحظة هامة للمترشح:</strong> كل إجابة منظمة مدعومة بالأمثلة الفلسفية أو البراهين الرياضية الدقيقة تُعطى الأولوية في التقييم لدى لجان تصحيح البكالوريا.
          </div>
        </div>
      `;
    } else {
      solutionPane.innerHTML = `
        <div class="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center">
          <p class="text-sm font-bold text-slate-600">الحل النموذجي غير مطلوب أو غير متوفر لهذا المورد بشكل منفصل.</p>
        </div>
      `;
    }
  } else {
    // Case B: حل المصدر المعتمد
    const solUrl = (res.solution && res.solution.url) || (res.source && res.source.url) || '#';
    const sourceTitle = isOfficial ? 'الديوان الوطني للامتحانات والمسابقات / DzExams' : (res.source.name || 'المصدر المعتمد');
    if (res.solution && res.solution.available) {
      solutionPane.innerHTML = `
        <div class="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center">
          <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <svg class="w-8 h-8 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span class="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 mb-3 inline-block">
            الإجابة النموذجية المعتمدة
          </span>
          <h3 class="text-lg sm:text-xl font-bold text-slate-900 font-heading mb-2">
            الحل وسلالم التنقيط - ${res.title}
          </h3>
          <p class="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed mb-6">
            التصحيح النموذجي وسلم التنقيط الوزاري الصادر عن وزارة التربية متوفر للاطلاع والتحميل عبر (${sourceTitle}).
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <a href="${solUrl}" target="_blank" rel="noopener" class="px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>الانتقال إلى المصدر للاطلاع على الحل وسلم التنقيط</span>
            </a>
          </div>
        </div>
      `;
    } else {
      solutionPane.innerHTML = `
        <div class="p-8 rounded-3xl bg-slate-50 border border-slate-200 text-center">
          <p class="text-sm font-bold text-slate-600">الحل النموذجي غير متاح لهذا المورد حالياً.</p>
        </div>
      `;
    }
  }
}

/**
 * التبديل السلس بين تبويبي الموضوع والحل في صفحة عارض المورد
 */
function switchViewerTab(tabName) {
  appState.currentViewerTab = tabName;
  const tabProblem = document.getElementById('viewer-tab-problem');
  const tabSolution = document.getElementById('viewer-tab-solution');
  const paneProblem = document.getElementById('viewer-pane-problem');
  const paneSolution = document.getElementById('viewer-pane-solution');

  if (!tabProblem || !tabSolution || !paneProblem || !paneSolution) return;

  if (tabName === 'problem') {
    tabProblem.className = 'px-6 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-brand-700 bg-brand-700 text-white shadow-xs cursor-pointer flex items-center gap-2';
    tabSolution.className = 'px-6 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer flex items-center gap-2';
    paneProblem.classList.remove('hidden');
    paneSolution.classList.add('hidden');
  } else {
    tabSolution.className = 'px-6 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-emerald-700 bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-2';
    tabProblem.className = 'px-6 py-2.5 rounded-xl font-bold text-sm transition-all border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer flex items-center gap-2';
    paneSolution.classList.remove('hidden');
    paneProblem.classList.add('hidden');
  }

  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({
        screen: 'resource-viewer',
        resourceId: appState.currentResource ? appState.currentResource.id : null,
        tab: tabName,
        subject: appState.currentSubject
      }, '');
    }
  } catch (e) {}
}

function closeCategoryModal() {
  const modal = document.getElementById('category-modal');
  if (modal) modal.classList.add('hidden');
}

function hideAllScreens() {
  wizardContainer.classList.add('hidden');
  screenUnavailable.classList.add('hidden');
  screenDashboard.classList.add('hidden');
  screenSubjectDetail.classList.add('hidden');
  screenLessonsIndex.classList.add('hidden');
  screenLessonHub.classList.add('hidden');
  screenLessonVideos.classList.add('hidden');
  screenVideoPlayer.classList.add('hidden');
  screenLessonExercises.classList.add('hidden');
  if (screenResourceIndex) screenResourceIndex.classList.add('hidden');
  if (screenResourceViewer) screenResourceViewer.classList.add('hidden');
}

// ============================================================
// 5. مسار التوجيه والاختيار (Wizard Steps)
// ============================================================

function selectStage(stageName) {
  appState.stage = stageName;
  document.querySelectorAll('[data-stage]').forEach(card => {
    if (card.getAttribute('data-stage') === stageName) card.classList.add('active');
    else card.classList.remove('active');
  });
  btnNext.removeAttribute('disabled');
}

function selectYear(yearName) {
  appState.year = yearName;
  document.querySelectorAll('[data-year]').forEach(card => {
    if (card.getAttribute('data-year') === yearName) card.classList.add('active');
    else card.classList.remove('active');
  });
  btnNext.removeAttribute('disabled');
}

function selectBranch(branchName) {
  appState.branch = branchName;
  document.querySelectorAll('[data-branch]').forEach(card => {
    if (card.getAttribute('data-branch') === branchName) card.classList.add('active');
    else card.classList.remove('active');
  });
  btnNext.removeAttribute('disabled');
}

function handleNextStep() {
  if (appState.currentStep === 1) {
    if (!appState.stage) return;
    if (appState.stage === 'متوسط') {
      showUnavailableScreen('عذراً، محتوى الطور المتوسط قيد الإعداد والتطوير حالياً. المنصة متاحة حالياً للطور الثانوي.');
      appState.lastStepBeforeUnavailable = 1;
      return;
    }
    appState.currentStep = 2;
    updateStepUI();
    return;
  }

  if (appState.currentStep === 2) {
    if (!appState.year) return;
    if (appState.year === 'الأولى ثانوي' || appState.year === 'الثانية ثانوي') {
      showUnavailableScreen(`عذراً، محتوى (${appState.year}) قيد الإعداد والتحديث. يمكنك الاستفادة من المنصة عبر اختيار مسار (الثالثة ثانوي).`);
      appState.lastStepBeforeUnavailable = 2;
      return;
    }
    appState.currentStep = 3;
    updateStepUI();
    return;
  }

  if (appState.currentStep === 3) {
    if (!appState.branch) return;
    if (appState.branch === 'آداب وفلسفة') {
      showDashboard();
      return;
    } else {
      showUnavailableScreen(`عذراً، محتوى شعبة (${appState.branch}) قيد الإعداد والتجهيز. المنصة متاحة حالياً لشعبة "آداب وفلسفة".`);
      appState.lastStepBeforeUnavailable = 3;
      return;
    }
  }
}

function handlePrevStep() {
  if (appState.currentStep > 1) {
    appState.currentStep -= 1;
    updateStepUI();
  }
}

function updateStepUI() {
  hideAllScreens();
  wizardContainer.classList.remove('hidden');

  stepView1.classList.add('hidden');
  stepView2.classList.add('hidden');
  stepView3.classList.add('hidden');

  if (appState.currentStep === 1) {
    btnPrev.setAttribute('disabled', 'true');
  } else {
    btnPrev.removeAttribute('disabled');
  }

  resetIndicators();

  if (appState.currentStep === 1) {
    stepView1.classList.remove('hidden');
    stepView1.classList.add('animate-fadeIn');
    setIndicatorActive(stepIndicator1);
    btnNextText.textContent = 'التالي';
    if (!appState.stage) btnNext.setAttribute('disabled', 'true');
    else btnNext.removeAttribute('disabled');
  } else if (appState.currentStep === 2) {
    stepView2.classList.remove('hidden');
    stepView2.classList.add('animate-fadeIn');
    setIndicatorCompleted(stepIndicator1);
    setIndicatorActive(stepIndicator2);
    stepLine1.style.width = '100%';
    btnNextText.textContent = 'التالي';
    if (!appState.year) btnNext.setAttribute('disabled', 'true');
    else btnNext.removeAttribute('disabled');
  } else if (appState.currentStep === 3) {
    stepView3.classList.remove('hidden');
    stepView3.classList.add('animate-fadeIn');
    setIndicatorCompleted(stepIndicator1);
    setIndicatorCompleted(stepIndicator2);
    setIndicatorActive(stepIndicator3);
    stepLine1.style.width = '100%';
    stepLine2.style.width = '100%';
    btnNextText.textContent = 'دخول المنصة';
    if (!appState.branch) btnNext.setAttribute('disabled', 'true');
    else btnNext.removeAttribute('disabled');
  }
}

function resetIndicators() {
  [stepIndicator1, stepIndicator2, stepIndicator3].forEach(ind => {
    ind.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-white text-slate-400 border-2 border-slate-200 transition-all duration-300';
  });
  stepLine1.style.width = '0%';
  stepLine2.style.width = '0%';
}

function setIndicatorActive(el) {
  el.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-brand-700 text-white shadow-md shadow-brand-700/30 transition-all duration-300';
}

function setIndicatorCompleted(el) {
  el.className = 'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-emerald-600 text-white shadow-md shadow-emerald-600/20 transition-all duration-300';
  el.innerHTML = `<svg class="w-5 h-5 stroke-current stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
}

function showUnavailableScreen(reasonText) {
  hideAllScreens();
  screenUnavailable.classList.remove('hidden');
  screenUnavailable.classList.add('animate-fadeIn');
  if (reasonText && unavailableReason) unavailableReason.textContent = reasonText;
}

function goBackToEdit() {
  hideAllScreens();
  wizardContainer.classList.remove('hidden');
  appState.currentStep = appState.lastStepBeforeUnavailable || 1;
  updateStepUI();
}

function shortcutToPhilosophy() {
  appState.stage = 'ثانوي';
  appState.year = 'الثالثة ثانوي';
  appState.branch = 'آداب وفلسفة';
  showDashboard();
}

function showDashboard(isPopState = false) {
  hideAllScreens();
  screenDashboard.classList.remove('hidden');
  screenDashboard.classList.add('animate-fadeIn');
  if (!isPopState) {
    pushNavigationState('dashboard');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showAccountNotice() {
  openNoticeModal('حساب الطالب', 'يمكنك من هنا متابعة الساعات المنجزة (5 ساعات)، وتعديل المعلومات الشخصية.');
}

function showSubscriptionsNotice() {
  openNoticeModal('اشتراكاتي', 'أنت مسجل في باقة التحضير السنوية الكاملة لشعبة آداب وفلسفة - بكالوريا 2026.');
}

function openNoticeModal(title, message) {
  const modal = document.getElementById('notice-modal');
  document.getElementById('notice-title').textContent = title;
  document.getElementById('notice-text').textContent = message;
  modal.classList.remove('hidden');
}

function closeNoticeModal() {
  document.getElementById('notice-modal').classList.add('hidden');
}

function resetToHome() {
  appState.currentStep = 1;
  appState.stage = null;
  appState.year = null;
  appState.branch = null;

  document.querySelectorAll('.selection-card').forEach(card => card.classList.remove('active'));
  stepIndicator1.innerHTML = '1';
  stepIndicator2.innerHTML = '2';
  stepIndicator3.innerHTML = '3';

  updateStepUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// مستمعي النقر خارج النوافذ المنبثقة لإغلاقها
document.getElementById('category-modal').addEventListener('click', (e) => {
  if (e.target.id === 'category-modal') closeCategoryModal();
});

document.getElementById('exercise-detail-modal').addEventListener('click', (e) => {
  if (e.target.id === 'exercise-detail-modal') closeExerciseModal();
});

document.getElementById('notice-modal').addEventListener('click', (e) => {
  if (e.target.id === 'notice-modal') closeNoticeModal();
});

// ============================================================
// إدارة تاريخ المتصفح والتنقل السلس (Browser History & Navigation)
// ============================================================

function pushNavigationState(screenName, extraData = {}) {
  try {
    if (window.history && window.history.pushState) {
      window.history.pushState({
        screen: screenName,
        subject: appState.currentSubject,
        lesson: appState.currentLesson,
        video: appState.currentVideo,
        channel: appState.currentChannel,
        ...extraData
      }, '');
    }
  } catch (e) {
    // تجاوز أي قيود في البيئات المحلية الصارمة
  }
}

function handleNavigationPop(state) {
  const currentState = state || (window.history ? window.history.state : null);
  if (currentState && currentState.screen) {
    if (currentState.subject) {
      appState.currentSubject = currentState.subject;
      sessionStorage.setItem('currentSubject', appState.currentSubject);
    }
    if (currentState.lesson) {
      appState.currentLesson = currentState.lesson;
      sessionStorage.setItem('currentLesson', appState.currentLesson);
    }
    if (currentState.video) appState.currentVideo = currentState.video;
    if (currentState.channel) appState.currentChannel = currentState.channel;

    switch (currentState.screen) {
      case 'dashboard':
        showDashboard(true);
        break;
      case 'subject':
        openSubjectDetail(appState.currentSubject, true);
        break;
      case 'lessons':
        openLessonsIndex(appState.currentSubject, true);
        break;
      case 'hub':
        openLessonHub(appState.currentLesson, true);
        break;
      case 'videos':
        openLessonVideos(appState.currentLesson, true);
        break;
      case 'exercises':
        openLessonExercises(appState.currentLesson, true);
        break;
      case 'player':
        playVideoLesson(appState.currentVideo, appState.currentChannel, true);
        break;
      case 'resource-index':
        openResourceIndex(currentState.type || 'all', appState.currentSubject, true);
        break;
      case 'resource-viewer':
        openResourceViewer(currentState.resourceId, currentState.tab || 'problem', true);
        break;
      default:
        showDashboard(true);
    }
  } else {
    showDashboard(true);
  }
}

window.addEventListener('popstate', (e) => {
  handleNavigationPop(e.state || (window.history ? window.history.state : null));
});

// إتاحة كافة الدوال العامة للتفاعل المباشر من واجهة HTML
window.backToCurrentSubject = backToCurrentSubject;
window.backToCurrentLessons = backToCurrentLessons;
window.backToCurrentLessonHub = backToCurrentLessonHub;
window.backToSubjects = backToSubjects;
window.openSubjectDetail = openSubjectDetail;
window.openLessonsIndex = openLessonsIndex;
window.openLessonHub = openLessonHub;
window.openLessonVideos = openLessonVideos;
window.openLessonExercises = openLessonExercises;
window.playVideoLesson = playVideoLesson;
window.showDashboard = showDashboard;
window.openCategoryContent = openCategoryContent;
window.openResourceIndex = openResourceIndex;
window.openResourceViewer = openResourceViewer;
window.switchViewerTab = switchViewerTab;
window.filterResourceIndex = filterResourceIndex;
window.backToResourceIndex = backToResourceIndex;
window.openPhilosophyLessonsIndex = openPhilosophyLessonsIndex;
window.pushNavigationState = pushNavigationState;
window.handleNavigationPop = handleNavigationPop;
window.selectStage = selectStage;
window.selectYear = selectYear;
window.selectBranch = selectBranch;
window.closeLessonModal = closeLessonModal;
window.closeCategoryModal = closeCategoryModal;
window.closeExerciseModal = closeExerciseModal;
window.closeNoticeModal = closeNoticeModal;
window.showAccountNotice = showAccountNotice;
window.showSubscriptionsNotice = showSubscriptionsNotice;
window.playYouTubeEmbed = playYouTubeEmbed;
window.promptCustomYouTubeUrl = promptCustomYouTubeUrl;
window.buildYouTubeEmbedUrl = buildYouTubeEmbedUrl;
window.handleYouTubePlayerError = handleYouTubePlayerError;
window.initYouTubeErrorListener = initYouTubeErrorListener;
window.openExerciseModal = openExerciseModal;
window.resetToHome = resetToHome;
window.goBackToEdit = goBackToEdit;
window.shortcutToPhilosophy = shortcutToPhilosophy;

// تسجيل الحالة الابتدائية في سجل المتصفح
try {
  if (window.history && window.history.replaceState) {
    window.history.replaceState({
      screen: 'dashboard',
      subject: appState.currentSubject,
      lesson: appState.currentLesson
    }, '');
  }
} catch (e) {}
