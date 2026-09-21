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
});

// ============================================================
// 1. خدمات وروابط YouTube (YouTube & Media Resolver)
// ============================================================

function extractYouTubeId(url) {
  if (!url) return null;
  const cleanUrl = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
  const match = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

function getYouTubeSearchUrl(channel, title) {
  const query = encodeURIComponent(`أستاذ ${channel} ${title} ${appState.currentSubject} بكالوريا`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

function getYouTubeEmbedUrl(channel, title, explicitUrl) {
  if (explicitUrl) {
    const id = extractYouTubeId(explicitUrl);
    if (id) {
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    }
  }
  const query = encodeURIComponent(`أستاذ ${channel} ${title} ${appState.currentSubject} بكالوريا`);
  return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1&rel=0`;
}

function resolveVideoUrls(vid, channel) {
  const saved = PlatformStore.getCustomVideoUrl(channel, vid.title);
  if (saved) {
    const videoId = extractYouTubeId(saved);
    return {
      watchUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : saved,
      embedUrl: getYouTubeEmbedUrl(channel, vid.title, saved),
      source: 'custom'
    };
  }

  if (vid.youtubeId) {
    return {
      watchUrl: `https://www.youtube.com/watch?v=${vid.youtubeId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${vid.youtubeId}?autoplay=1&rel=0`,
      source: 'direct-id'
    };
  }

  if (vid.url) {
    return {
      watchUrl: vid.url,
      embedUrl: getYouTubeEmbedUrl(channel, vid.title, vid.url),
      source: 'direct-url'
    };
  }

  return {
    watchUrl: getYouTubeSearchUrl(channel, vid.title),
    embedUrl: getYouTubeEmbedUrl(channel, vid.title, null),
    source: 'search'
  };
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
      <div class="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
        <p class="text-sm font-bold text-slate-500">جاري إعداد وتحديث كتالوج فيديوهات هذا الدرس.</p>
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
              <a href="${chan.channelUrl}" target="_blank" rel="noopener noreferrer" class="text-sm font-bold text-slate-900 hover:text-red-700 transition-colors flex items-center gap-1.5 group" title="زيارة القناة على YouTube">
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
              
              <a href="${ytUrl}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold ${isVerified ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'} px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer" title="فتح الفيديو مباشرة على YouTube">
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
 * بناء قائمة بطاقات التمارين ديناميكياً للدرس المحدد
 */
function renderExercises(lessonTitle) {
  const container = document.getElementById('exercises-container');
  if (!container) return;

  const exercises = PlatformStore.getLessonExercises(appState.currentSubject, lessonTitle);

  if (!exercises || exercises.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200">
        <p class="text-sm font-bold text-slate-500">جاري إعداد نماذج التمارين لهذا الدرس.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = exercises.map(ex => {
    const safeTitle = (ex.title || '').replace(/'/g, "\\'");
    const safeLesson = (lessonTitle || '').replace(/'/g, "\\'");
    return `
      <div class="exercise-item-card p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-brand-300 hover:bg-white hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3 sm:gap-4">
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
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                تمرين 0${ex.num}
              </span>
              <span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                ملف docx
              </span>
            </div>
            <h4 class="text-sm sm:text-base font-bold text-slate-900">
              ${ex.title}
            </h4>
            <p class="text-xs text-slate-500 mt-0.5">
              نموذج وزاري رسمي معتمد لشعبة آداب وفلسفة مع خطة المقال وسلم التنقيط
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button onclick="openExerciseModal(${ex.num}, '${safeTitle}', 'معالجة إشكالية درس ${safeLesson} وفق المنهجية المقررة (طريقة جدلية / استقصاء بالوضع) مع شبكة التقويم وسلم التنقيط المعتمد.')" class="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
            <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>عرض التمرين والحل</span>
          </button>
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
  const iframe = document.getElementById('youtube-iframe-player');

  if (embedFrame && previewFrame && iframe) {
    embedFrame.classList.add('hidden');
    previewFrame.classList.remove('hidden');
    iframe.src = '';
  }
}

function playYouTubeEmbed() {
  const embedFrame = document.getElementById('video-embed-frame');
  const previewFrame = document.getElementById('video-preview-frame');
  const iframe = document.getElementById('youtube-iframe-player');

  if (!embedFrame || !previewFrame || !iframe) return;

  const embedUrl = appState.currentEmbedUrl || getYouTubeEmbedUrl(appState.currentChannel, appState.currentVideo, appState.currentYouTubeUrl);
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
  document.getElementById('exercise-detail-modal').classList.add('hidden');
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

  const modal = document.getElementById('category-modal');
  const title = document.getElementById('category-modal-title');
  const subtitle = document.getElementById('category-modal-subtitle');
  const body = document.getElementById('category-modal-body');
  const iconContainer = document.getElementById('category-modal-icon-container');

  const subject = appState.currentSubject || 'الفلسفة';
  subtitle.textContent = `المستوى: الثالثة ثانوي • الشعبة: آداب وفلسفة • المادة: ${subject}`;

  let iconSvg = '';
  let iconClass = 'bg-emerald-100 text-emerald-800';

  if (categoryName === 'ملخصات') {
    iconClass = 'bg-blue-100 text-blue-800';
    iconSvg = `<svg class="w-5 h-5 stroke-current stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;

    const summaries = PlatformStore.getSubjectSummaries(subject);
    title.textContent = `فهرس الملخصات (${summaries.length > 0 ? summaries.length : 'المعتمدة'}) - ${subject}`;

    if (summaries && summaries.length > 0) {
      body.innerHTML = summaries.map(s => `
        <div class="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
              ${s.id}
            </span>
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${s.type === 'pdf' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}">
                  ${s.type === 'pdf' ? 'ملف PDF' : 'ملف docx'}
                </span>
                <h4 class="text-xs sm:text-sm font-bold text-slate-900">${s.title}</h4>
              </div>
              <p class="text-[11px] text-slate-500">ملخص وزاري شامل ومعتمد لشهادة البكالوريا</p>
            </div>
          </div>
          <button onclick="openNoticeModal('${s.title.replace(/'/g, "\\'")}', 'ملخص معتمد لمادة ${subject} جاهز للمعاينة والتحميل بصيغة ${s.type.toUpperCase()}.')" class="shrink-0 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
            <svg class="w-3.5 h-3.5 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            <span>تحميل / معاينة</span>
          </button>
        </div>
      `).join('');
    } else {
      body.innerHTML = `
        <div class="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
          <p class="text-xs font-bold text-slate-500">جاري إعداد وتحميل حزمة ملخصات مادة ${subject}.</p>
        </div>
      `;
    }

  } else if (categoryName === 'المراجعات') {
    iconClass = 'bg-amber-100 text-amber-800';
    iconSvg = `<svg class="w-5 h-5 stroke-current stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="m9 16 2 2 4-4"></path></svg>`;

    const reviews = PlatformStore.getSubjectReviews(subject);
    let totalReviews = 0;
    reviews.forEach(ch => { totalReviews += (ch.videos ? ch.videos.length : 0); });

    title.textContent = `المراجعات الشاملة (${totalReviews} فيديو) - ${subject}`;

    if (reviews && reviews.length > 0) {
      body.innerHTML = reviews.map(chan => `
        <div class="channel-group-card p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs mb-4">
          <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center">
                <svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h4 class="text-sm font-bold text-slate-900">الأستاذ: ${chan.channel}</h4>
            </div>
            <span class="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
              ${chan.videos.length} مقاطع
            </span>
          </div>

          <div class="space-y-2">
            ${chan.videos.map(vid => {
              const safeTitle = (vid.title || '').replace(/'/g, "\\'");
              const safeChan = (chan.channel || '').replace(/'/g, "\\'");
              const ytSearch = getYouTubeSearchUrl(chan.channel, vid.title);
              return `
                <div class="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/40 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
                  <div class="flex items-center gap-3 flex-1">
                    ${vid.thumbnail ? `
                      <div class="relative w-20 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-2xs">
                        <img src="${vid.thumbnail}" alt="${safeTitle}" class="w-full h-full object-cover">
                      </div>
                    ` : `
                      <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                      </div>
                    `}
                    <div>
                      <h5 class="text-xs sm:text-sm font-bold text-slate-800 leading-snug">${vid.title}</h5>
                      <span class="text-[10px] text-slate-400">مراجعة نهائية مركزة • ${vid.duration || '25:00'}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button onclick="closeCategoryModal(); playVideoLesson('${safeTitle}', '${safeChan}')" class="text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                      مشاهدة في المنصة
                    </button>
                    <a href="${ytSearch}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer">
                      <span>YouTube</span>
                    </a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');
    } else {
      body.innerHTML = `
        <div class="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
          <p class="text-xs font-bold text-slate-500">جاري إعداد باقة فيديوهات المراجعة الشاملة لمادة ${subject}.</p>
        </div>
      `;
    }

  } else if (categoryName === 'البكالوريا') {
    iconClass = 'bg-rose-100 text-rose-800';
    iconSvg = `<svg class="w-5 h-5 stroke-current stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;

    const bac = PlatformStore.getSubjectBac(subject);
    title.textContent = `فهرس البكالوريا (${bac.length > 0 ? bac.length : 'الأرشيف الكامل'}) - ${subject}`;

    if (bac && bac.length > 0) {
      body.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${bac.map(b => `
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-rose-300 hover:bg-white transition-all flex items-center justify-between gap-3">
              <div>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200">${b.tag || 'دورة رسمية'}</span>
                <h4 class="text-sm font-bold text-slate-900 mt-1">${b.title}</h4>
                <p class="text-[11px] text-slate-400">مواضيع مع الحل وسلالم التنقيط الوزارية</p>
              </div>
              <button onclick="openNoticeModal('${b.title.replace(/'/g, "\\'")}', 'موضوع بكالوريا ${subject} (${b.title}) مع الإجابة النموذجية وسلم التنقيط المعتمد.')" class="shrink-0 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer">
                عرض الموضوع
              </button>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
          <p class="text-xs font-bold text-slate-500">جاري إدراج مواضيع البكالوريا لمادة ${subject}.</p>
        </div>
      `;
    }

  } else if (categoryName === 'امتحانات') {
    iconClass = 'bg-orange-100 text-orange-800';
    iconSvg = `<svg class="w-5 h-5 stroke-current stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="14.01"></line><line x1="12" y1="14" x2="12" y2="14.01"></line><line x1="8" y1="14" x2="8" y2="14.01"></line></svg>`;

    const exams = PlatformStore.getSubjectExams(subject);
    title.textContent = `امتحانات الفصول - ${subject}`;

    const examList = (exams && exams.length > 0) ? exams : [
      { id: 1, title: 'امتحانات الفصل الأول', term: 'الفصل الأول' },
      { id: 2, title: 'امتحانات الفصل الثاني', term: 'الفصل الثاني' },
      { id: 3, title: 'امتحانات الفصل الثالث', term: 'الفصل الثالث' }
    ];

    body.innerHTML = examList.map(ex => `
      <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-orange-300 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">${ex.term || 'فصل دراسي'}</span>
            <h4 class="text-sm font-bold text-slate-900">${ex.title}</h4>
          </div>
          <p class="text-xs text-slate-500">نماذج اختبارات فصلية من مختلف ثانويات الوطن مع حلولها المفصلة</p>
        </div>
        <button onclick="openNoticeModal('${ex.title.replace(/'/g, "\\'")}', 'باقة امتحانات ${ex.title} لمادة ${subject} مع سلم التنقيط النموذجي.')" class="shrink-0 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all cursor-pointer">
          تصفح النماذج
        </button>
      </div>
    `).join('');
  }

  iconContainer.className = `w-10 h-10 rounded-xl flex items-center justify-center ${iconClass}`;
  iconContainer.innerHTML = iconSvg;

  modal.classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
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
