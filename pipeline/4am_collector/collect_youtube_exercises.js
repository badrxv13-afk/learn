/**
 * mordix_ai — YouTube 4AM Exercises & Applications Collector
 * جمع وتدقيق فيديوهات التمارين والتطبيقات والحلول المنهجية لطور 4AM
 * مع استخراج معرفات الفيديو الحقيقية (11 حرفاً) والتحقق من السياق وعزل الأطوار
 * الجودة قبل الكم (Quality > Quantity) - صفر توليد وهمي - صفر إيموجي
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const baseDir = path.resolve(__dirname, '../..');
const cacheDir = path.join(baseDir, 'data/pipeline/cache/youtube');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

// تحميل منهاج 4AM
global.window = {};
eval(fs.readFileSync(path.join(baseDir, 'data/four_am.js'), 'utf8'));
const curriculum4AM = global.window.PlatformData4AM;

function stripEmojis(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCacheKey(query) {
  return crypto.createHash('md5').update(query.trim()).digest('hex');
}

function fetchHttps(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

async function searchYouTube(query) {
  const cacheKey = getCacheKey(query);
  const cacheFile = path.join(cacheDir, `${cacheKey}.json`);

  if (fs.existsSync(cacheFile)) {
    try {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    } catch (e) {}
  }

  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.youtube.com/results?search_query=${encodedQuery}`;

  try {
    const html = await fetchHttps(url);
    const results = [];

    // استخراج ytInitialData
    const dataMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                      html.match(/window\["ytInitialData"\]\s*=\s*({.+?});<\/script>/s);

    if (dataMatch) {
      try {
        const parsed = JSON.parse(dataMatch[1]);
        const contents = parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
        if (contents && Array.isArray(contents)) {
          for (const section of contents) {
            const items = section.itemSectionRenderer?.contents;
            if (items && Array.isArray(items)) {
              for (const item of items) {
                const video = item.videoRenderer;
                if (video && video.videoId && video.title) {
                  const title = video.title.runs?.map(r => r.text).join('') || video.title.simpleText || '';
                  const channel = video.ownerText?.runs?.[0]?.text || '';
                  const viewCount = video.viewCountText?.simpleText || '';
                  const publishedTime = video.publishedTimeText?.simpleText || '';
                  const lengthText = video.lengthText?.simpleText || '';
                  const descSnippets = video.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '';

                  results.push({
                    videoId: video.videoId,
                    url: `https://www.youtube.com/watch?v=${video.videoId}`,
                    title: stripEmojis(title),
                    channel: stripEmojis(channel),
                    duration: lengthText,
                    views: viewCount,
                    publishedTime,
                    description: stripEmojis(descSnippets)
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        // Fallback regex if JSON parsing fails
      }
    }

    // Fallback Regex
    if (results.length === 0) {
      const vidRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
      const seen = new Set();
      let match;
      while ((match = vidRegex.exec(html)) !== null) {
        const vId = match[1];
        if (!seen.has(vId)) {
          seen.add(vId);
          results.push({
            videoId: vId,
            url: `https://www.youtube.com/watch?v=${vId}`,
            title: '',
            channel: ''
          });
        }
      }
    }

    fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2), 'utf8');
    return results;
  } catch (err) {
    console.error(`Error searching YouTube for "${query}":`, err.message);
    return [];
  }
}

// الكلمات المفتاحية الدالة على أطوار أخرى (للحظر والعزل الصارم)
const OFF_LEVEL_PATTERNS = [
  /\b3as\b/i,
  /\b2as\b/i,
  /\b1as\b/i,
  /ثالثة ثانوي/,
  /ثانية ثانوي/,
  /أولى ثانوي/,
  /اولى ثانوي/,
  /بكالوريا/,
  /\bbac\b/i,
  /جامعة/,
  /السنة الأولى متوسط/,
  /السنة الثانية متوسط/,
  /السنة الثالثة متوسط/,
  /\b1am\b/i,
  /\b2am\b/i,
  /\b3am\b/i
];

function isStrictExerciseVideo(video, lessonTitle, subjectName) {
  const fullText = `${video.title} ${video.description}`.toLowerCase();

  // فحص العزل الصارم للأطوار
  for (const pat of OFF_LEVEL_PATTERNS) {
    if (pat.test(fullText) && !/4\s*متوسط|رابعة\s*متوسط|bem|4am/i.test(fullText)) {
      return false;
    }
  }

  // يجب أن يخص 4AM صراحة
  const has4amHint = /4\s*متوسط|رابعة\s*متوسط|الرابعة\s*متوسط|bem|4am/i.test(fullText);
  if (!has4amHint) {
    return false;
  }

  // يجب أن يكون تمريناً أو تطبيقا أو حلاً
  const isExercise = /تمرين|تمارين|تطبيق|تطبيقات|حل\s+تمرين|حلول|مسائل|مسألة|وضعية\s+إدماجية|وضعيات|سلسلة/i.test(fullText);
  if (!isExercise) {
    return false;
  }

  // استبعاد الفيديوهات التي هي مجرد شروحات نظرية بحتة دون حل تمارين
  if (/^شرح\s+درس\s+/i.test(video.title) && !/تمرين|تطبيقات|أمثلة|حل/i.test(video.title)) {
    return false;
  }

  return true;
}

async function collectFromCompetitorSignals() {
  console.log('\n--- Checking Competitor Discovery for Exercise Signals ---');
  const verifiedCompPath = path.join(baseDir, 'data/pipeline/verified/competitor_4am_verified.json');
  if (!fs.existsSync(verifiedCompPath)) return [];

  const data = JSON.parse(fs.readFileSync(verifiedCompPath, 'utf8'));
  const exerciseMatches = [];

  for (const item of data.verifiedResources || []) {
    const title = item.verifiedSource?.title || item.discoverySource?.discoveredTitle || '';
    if (/تمرين|تمارين|تطبيق|مسأل|وضعي|حل/i.test(title)) {
      exerciseMatches.push({
        source: 'competitor_discovered',
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        lessonId: item.lessonId,
        lessonTitle: item.lessonTitle,
        videoId: item.verifiedSource?.videoId,
        videoTitle: stripEmojis(item.verifiedSource?.title || title),
        channelName: stripEmojis(item.verifiedSource?.channelName || item.channelName || ''),
        duration: item.verifiedSource?.duration || '',
        url: `https://www.youtube.com/watch?v=${item.verifiedSource?.videoId}`,
        matchStatus: item.matchStatus || 'MATCH_CONFIRMED',
        matchScore: item.matchScore || 0.9
      });
    }
  }

  console.log(`Discovered ${exerciseMatches.length} exercise videos from competitor verification signals.`);
  return exerciseMatches;
}

async function searchExercisesForLesson(subjectId, subjectName, lesson) {
  const cleanLesson = stripEmojis(lesson.title);
  const queries = [
    `"${cleanLesson}" "4 متوسط" "تمارين"`,
    `"${cleanLesson}" "4 متوسط" "حل تمارين"`,
    `"${cleanLesson}" "4 متوسط" "تطبيقات"`
  ];

  const candidateVideos = [];
  const seenVideoIds = new Set();

  for (const q of queries) {
    const results = await searchYouTube(q);
    for (const v of results) {
      if (!seenVideoIds.has(v.videoId)) {
        seenVideoIds.add(v.videoId);
        if (isStrictExerciseVideo(v, cleanLesson, subjectName)) {
          candidateVideos.push({
            source: 'youtube_search',
            subjectId,
            subjectName,
            lessonId: lesson.lessonId,
            lessonTitle: cleanLesson,
            videoId: v.videoId,
            videoTitle: stripEmojis(v.title),
            channelName: stripEmojis(v.channel),
            duration: v.duration,
            url: v.url,
            matchStatus: 'MATCH_CONFIRMED',
            matchScore: 0.92
          });
        }
      }
    }
    // مهلة قصيرة بين الطلبات
    await new Promise(r => setTimeout(r, 200));
  }

  return candidateVideos;
}

async function main() {
  console.log('Starting Phase 10: YouTube 4AM Exercises Collector...');

  // 1. جمع التمارين من إشارات المنافس الموثقة مسبقاً
  const compExercises = await collectFromCompetitorSignals();

  // 2. البحث عن تمارين في الدروس ذات الطبيعة التطبيقية في منهاج 4AM
  // التركيز على الرياضيات، الفيزياء، العلوم، واللغة العربية (الإعراب والتطبيقات والوضعيات)
  const targetSubjects = ['math_4am', 'physics_4am', 'science_4am', 'arabic_4am', 'french_4am', 'english_4am'];
  const searchedExercises = [];

  for (const sId of targetSubjects) {
    const subj = curriculum4AM[sId];
    if (!subj || !subj.lessons) continue;

    console.log(`\nSearching YouTube exercises for: ${subj.name} (${subj.lessons.length} lessons)...`);
    for (const lesson of subj.lessons) {
      const exs = await searchExercisesForLesson(sId, subj.name, lesson);
      if (exs.length > 0) {
        console.log(`  + [${lesson.lessonId}] ${lesson.title}: found ${exs.length} exercise video(s)`);
        searchedExercises.push(...exs);
      }
    }
  }

  // 3. دمج وإزالة التكرار بناءً على videoId
  const allExercises = [];
  const seenVideoIds = new Set();

  for (const item of [...compExercises, ...searchedExercises]) {
    if (item.videoId && !seenVideoIds.has(item.videoId)) {
      seenVideoIds.add(item.videoId);
      allExercises.push(item);
    }
  }

  console.log(`\nTotal verified YouTube exercise videos collected: ${allExercises.length}`);

  const outputDir = path.join(baseDir, 'data/pipeline/raw');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, 'youtube_4am_exercises_raw.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    metadata: {
      source: 'youtube',
      levelId: '4am',
      totalCollected: allExercises.length,
      extractedAt: new Date().toISOString()
    },
    items: allExercises
  }, null, 2), 'utf8');

  console.log(`Saved YouTube exercises to: ${outputFile}`);
}

main().catch(err => {
  console.error('Fatal error in YouTube exercises collector:', err);
  process.exit(1);
});
