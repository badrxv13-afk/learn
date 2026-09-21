const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data');
const subjectFiles = ['philosophy.js', 'islamic.js', 'history.js', 'math.js', 'arabic.js', 'french.js', 'english.js'];

const sandbox = { window: { PlatformData: {} } };
vm.createContext(sandbox);

const report = {};

for (const f of subjectFiles) {
  const filePath = path.join(dataDir, f);
  if (!fs.existsSync(filePath)) continue;
  
  const code = fs.readFileSync(filePath, 'utf-8');
  try {
    vm.runInContext(code, sandbox);
  } catch (err) {
    console.error(`Error loading ${f}:`, err.message);
  }
}

const subjects = sandbox.window.PlatformData;
console.log('=== SUBJECTS AUDIT ===');
for (const [subjName, data] of Object.entries(subjects)) {
  const lessonCount = (data.lessons || []).length;
  const channelDataKeys = Object.keys(data.channelsData || {});
  let totalVideos = 0;
  let realVideos = 0;
  let totalChannels = 0;

  for (const [lessTitle, chs] of Object.entries(data.channelsData || {})) {
    if (Array.isArray(chs)) {
      totalChannels += chs.length;
      for (const ch of chs) {
        if (Array.isArray(ch.videos)) {
          totalVideos += ch.videos.length;
          for (const v of ch.videos) {
            const ytid = v.youtubeId || v.youtube_id || v.id;
            if (ytid && typeof ytid === 'string' && ytid.length === 11 && !ytid.includes(' ')) {
              realVideos++;
            }
          }
        }
      }
    }
  }

  const exerciseCount = Object.values(data.exercisesData || {}).reduce((acc, curr) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
  const bacCount = (data.baccalaureate || []).length;
  const summaryCount = (data.summaries || []).length;
  const reviewCount = (data.reviews || []).reduce((acc, r) => acc + ((r.videos || []).length), 0);

  report[subjName] = {
    id: data.id,
    lessons: lessonCount,
    lessonsWithChannels: channelDataKeys.length,
    totalChannels,
    totalVideos,
    realYouTubeVideos: realVideos,
    exercises: exerciseCount,
    baccalaureate: bacCount,
    summaries: summaryCount,
    reviews: reviewCount
  };
}

console.log(JSON.stringify(report, null, 2));
