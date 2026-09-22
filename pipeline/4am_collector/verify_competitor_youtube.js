/**
 * mordix_ai — Step 3: Competitor YouTube Verifier
 * 
 * يقرأ data/pipeline/normalized/competitor_4am_candidates.json
 * ويبحث عن الفيديوهات الحقيقية على YouTube مع تطبيق:
 * - التحقق الصارم من Video ID الحقيقي
 * - منع التكرار مع ما هو موجود في mordix_ai
 * - حظر التسرب بين الأطوار (Cross-Level Shield)
 * - توثيق كامل للـ Provenance (discoverySource + verifiedSource)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const baseDir = path.resolve(__dirname, '../..');
const candidatesPath = path.join(baseDir, 'data/pipeline/normalized/competitor_4am_candidates.json');
const verifiedRegistryPath = path.join(baseDir, 'data/registry_4am.js');
const verifiedJsonPath = path.join(baseDir, '4am_verified_resources.json');
const outputPath = path.join(baseDir, 'data/pipeline/verified/competitor_4am_verified.json');
const cacheDir = path.join(baseDir, 'data/pipeline/cache/youtube');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

console.log('=== بدء التحقق من مرشحي المنافس عبر YouTube ===');

// 1. تحميل الموارد المعتمدة الحالية في mordix_ai
let existingVerified = [];
if (fs.existsSync(verifiedJsonPath)) {
  existingVerified = JSON.parse(fs.readFileSync(verifiedJsonPath, 'utf8'));
}
const existingVideoIds = new Set(existingVerified.map(v => (v.url ? v.url.replace(/.*v=/, '') : v.id)));
console.log(`[OK] تم تحميل ${existingVerified.length} مورداً موجوداً في mordix_ai (${existingVideoIds.size} معرّف فيديو فريد).`);

// 2. محرك البحث والاتصال بـ YouTube
let cookieJar = 'SOCS=CAESEwgDEgk2ODE4MTQzMzAaAmFyIAEaBgiA_LyaBg; CONSENT=YES+cb; YSC=test; GPS=1;';

function updateCookieJar(setCookies) {
  if (!setCookies || !Array.isArray(setCookies)) return;
  const jarMap = new Map();
  cookieJar.split('; ').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > 0) jarMap.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  });
  setCookies.forEach(sc => {
    const clean = sc.split(';')[0];
    const idx = clean.indexOf('=');
    if (idx > 0) jarMap.set(clean.slice(0, idx).trim(), clean.slice(idx + 1).trim());
  });
  cookieJar = Array.from(jarMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

function fetchUrlWithRedirects(targetUrl, maxRedirects = 3) {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) return resolve({ statusCode: 500, html: '' });

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Cookie': cookieJar
      }
    };

    https.get(targetUrl, options, (res) => {
      if (res.headers['set-cookie']) updateCookieJar(res.headers['set-cookie']);

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) redirectUrl = `https://www.youtube.com${redirectUrl}`;
        return resolve(fetchUrlWithRedirects(redirectUrl, maxRedirects - 1));
      }

      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, html }));
    }).on('error', () => resolve({ statusCode: 500, html: '' }));
  });
}

async function fetchYouTubeSearch(query) {
  const hash = crypto.createHash('md5').update(query).digest('hex');
  const cacheFile = path.join(cacheDir, `${hash}.json`);

  if (fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Array.isArray(cached) && cached.length > 0) return cached;
    } catch (e) {}
  }

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  let res = await fetchUrlWithRedirects(url);
  if (res.statusCode !== 200 || !res.html.includes('ytInitialData')) {
    await new Promise(r => setTimeout(r, 400));
    res = await fetchUrlWithRedirects(url);
  }
  if (res.statusCode !== 200) return [];

  const match = res.html.match(/ytInitialData\s*=\s*({.+?});<\/script>/s) ||
                res.html.match(/var\s+ytInitialData\s*=\s*({.+?});/s);
  if (!match) return [];

  try {
    const json = JSON.parse(match[1]);
    const contents = json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    const videos = [];

    function extract(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (obj.videoRenderer) {
        const vr = obj.videoRenderer;
        const videoId = vr.videoId;
        const title = vr.title?.runs?.map(r => r.text).join('') || vr.title?.simpleText || '';
        const channelName = vr.ownerText?.runs?.map(r => r.text).join('') || '';
        const channelId = vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
        const publishedAt = vr.publishedTimeText?.simpleText || '';
        const duration = vr.lengthText?.simpleText || '';
        const thumbnail = vr.thumbnail?.thumbnails?.[0]?.url || '';
        if (videoId && title) {
          videos.push({
            videoId,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
            title,
            channelName,
            channelId,
            publishedAt,
            duration,
            thumbnail
          });
        }
      }
      for (const k of Object.keys(obj)) extract(obj[k]);
    }
    extract(contents);

    fs.writeFileSync(cacheFile, JSON.stringify(videos, null, 2), 'utf8');
    return videos;
  } catch (e) {
    return [];
  }
}

// أنماط الحظر والعزل
const crossLevelRegex = /(?:3as|2as|1as|3\s*ثانوي|2\s*ثانوي|1\s*ثانوي|بكالوريا|bac\b|5ap|4ap|3ap|2ap|1ap|ابتدائي)/i;
const fourAmConfirmRegex = /(?:4am|4\s*am|4\s*متوسط|رابعة\s*متوسط|الرابعة\s*متوسط|بيام|bem|شهادة\s*التعليم\s*المتوسط)/i;

// 3. قراءة المرشحين
const candData = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'));
const candidates = candData.candidates;
console.log(`[OK] سيتم التحقق من ${candidates.length} مرشحاً من المنافس.`);

async function runVerification() {
  const verifiedList = [];
  let confirmedCount = 0;
  let probableCount = 0;
  let needsVerifCount = 0;
  let rejectedCount = 0;
  let alreadyInPlatformCount = 0;
  let newAddedCount = 0;
  let duplicateCount = 0;

  const seenDiscoveredVideoIds = new Set();

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    if (i % 25 === 0) {
      console.log(`... معالجة المرشح ${i + 1} من أصل ${candidates.length}`);
    }

    // 1. فحص هل هو موجود أصلاً في قاعدة بياناتنا بناءً على العنوان والقناة
    const existingMatch = existingVerified.find(v => {
      if (!v.title) return false;
      const vTitle = v.title.toLowerCase();
      const cTitle = cand.discoveredTitle.toLowerCase();
      const vChan = (v.source?.name || '').toLowerCase();
      const cChan = cand.channelName.toLowerCase();
      
      const titleMatch = vTitle.includes(cTitle) || cTitle.includes(vTitle);
      const chanMatch = vChan.includes(cChan) || cChan.includes(vChan);
      return titleMatch && (chanMatch || v.lessonId === cand.lessonId);
    });

    if (existingMatch) {
      alreadyInPlatformCount++;
      const vId = (existingMatch.url || '').replace(/.*v=/, '') || existingMatch.id;
      
      verifiedList.push({
        candidateId: cand.candidateId,
        subjectId: cand.subjectId,
        subjectName: cand.subjectName,
        lessonId: cand.lessonId,
        lessonTitle: cand.lessonTitle,
        levelId: '4am',
        resourceType: cand.resourceType,
        matchStatus: 'MATCH_CONFIRMED',
        matchScore: 1.0,
        isAlreadyInPlatform: true,
        isNewResource: false,
        discoverySource: {
          type: 'competitor_reference',
          sourceFile: cand.sourceFile,
          sourceUrl: cand.sourceUrl,
          discoveredTitle: cand.discoveredTitle,
          discoveredChannel: cand.channelName,
          discoveredTeacher: cand.teacherName
        },
        verifiedSource: {
          type: 'youtube',
          url: existingMatch.url,
          videoId: vId,
          title: existingMatch.title,
          channelName: existingMatch.source?.name || cand.channelName,
          channelId: existingMatch.source?.channelId || null,
          duration: existingMatch.duration || 'فيديو شرح',
          thumbnail: existingMatch.thumbnail || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`
        },
        verificationStatus: 'verified',
        verifiedAt: new Date().toISOString()
      });
      confirmedCount++;
      continue;
    }

    // 2. البحث في YouTube عبر استعلامات مخصصة
    let searchResults = [];
    for (const q of cand.searchQueries) {
      const res = await fetchYouTubeSearch(q);
      if (res && res.length > 0) {
        searchResults = res;
        break; // تم إيجاد نتائج
      }
    }

    if (!searchResults || searchResults.length === 0) {
      needsVerifCount++;
      verifiedList.push({
        candidateId: cand.candidateId,
        subjectId: cand.subjectId,
        subjectName: cand.subjectName,
        lessonId: cand.lessonId,
        lessonTitle: cand.lessonTitle,
        levelId: '4am',
        resourceType: cand.resourceType,
        matchStatus: 'NEEDS_VERIFICATION',
        matchScore: 0.0,
        isAlreadyInPlatform: false,
        isNewResource: false,
        discoverySource: {
          type: 'competitor_reference',
          sourceFile: cand.sourceFile,
          sourceUrl: cand.sourceUrl,
          discoveredTitle: cand.discoveredTitle,
          discoveredChannel: cand.channelName,
          discoveredTeacher: cand.teacherName
        },
        verifiedSource: null,
        verificationStatus: 'unverified'
      });
      continue;
    }

    // 3. مطابقة وتقييم أفضل نتيجة
    let bestVideo = null;
    let bestScore = 0;

    for (const vid of searchResults.slice(0, 8)) {
      // فحص حظر الأطوار
      if (crossLevelRegex.test(vid.title)) continue;

      let score = 0;
      const vTitle = vid.title.toLowerCase();
      const dTitle = cand.discoveredTitle.toLowerCase();
      const dChan = cand.channelName.toLowerCase();
      const dTeacher = (cand.teacherName || '').toLowerCase();
      const vChan = vid.channelName.toLowerCase();

      // تطابق العنوان
      if (vTitle.includes(dTitle) || dTitle.includes(vTitle)) {
        score += 0.5;
      } else {
        const dWords = dTitle.split(/\s+/).filter(w => w.length > 2);
        const matchWords = dWords.filter(w => vTitle.includes(w));
        score += (matchWords.length / Math.max(1, dWords.length)) * 0.4;
      }

      // تطابق القناة أو الأستاذ
      if (vChan.includes(dChan) || dChan.includes(vChan)) {
        score += 0.35;
      } else if (dTeacher && (vTitle.includes(dTeacher) || vChan.includes(dTeacher))) {
        score += 0.3;
      }

      // وجود 4AM أو بيام
      if (fourAmConfirmRegex.test(vid.title)) {
        score += 0.15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestVideo = vid;
      }
    }

    if (!bestVideo || bestScore < 0.45) {
      if (bestVideo && crossLevelRegex.test(bestVideo.title)) {
        rejectedCount++;
        verifiedList.push({
          candidateId: cand.candidateId,
          matchStatus: 'REJECTED',
          matchScore: bestScore,
          reason: 'Cross-level leakage detected'
        });
      } else {
        needsVerifCount++;
        verifiedList.push({
          candidateId: cand.candidateId,
          matchStatus: 'NEEDS_VERIFICATION',
          matchScore: bestScore,
          reason: 'Insufficient match confidence'
        });
      }
      continue;
    }

    // تحديد الحالة
    let status = 'MATCH_CONFIRMED';
    if (bestScore < 0.75) {
      status = 'MATCH_PROBABLE';
      probableCount++;
    } else {
      confirmedCount++;
    }

    // فحص التكرار مع المعرفات المكتشفة في هذه الدورة أو في المنصة
    const vId = bestVideo.videoId;
    let isNew = false;
    if (existingVideoIds.has(vId) || seenDiscoveredVideoIds.has(vId)) {
      duplicateCount++;
    } else {
      seenDiscoveredVideoIds.add(vId);
      isNew = true;
      newAddedCount++;
    }

    verifiedList.push({
      candidateId: cand.candidateId,
      subjectId: cand.subjectId,
      subjectName: cand.subjectName,
      lessonId: cand.lessonId,
      lessonTitle: cand.lessonTitle,
      levelId: '4am',
      resourceType: cand.resourceType,
      matchStatus: status,
      matchScore: Math.round(bestScore * 100) / 100,
      isAlreadyInPlatform: existingVideoIds.has(vId),
      isNewResource: isNew,
      discoverySource: {
        type: 'competitor_reference',
        sourceFile: cand.sourceFile,
        sourceUrl: cand.sourceUrl,
        discoveredTitle: cand.discoveredTitle,
        discoveredChannel: cand.channelName,
        discoveredTeacher: cand.teacherName
      },
      verifiedSource: {
        type: 'youtube',
        url: bestVideo.youtubeUrl,
        videoId: bestVideo.videoId,
        title: bestVideo.title,
        channelName: bestVideo.channelName,
        channelId: bestVideo.channelId,
        publishedAt: bestVideo.publishedAt,
        duration: bestVideo.duration,
        thumbnail: bestVideo.thumbnail
      },
      verificationStatus: 'verified',
      verifiedAt: new Date().toISOString()
    });
  }

  console.log('\n=== ملخص نتائج التحقق عبر YouTube ===');
  console.log(`- إجمالي المرشحين المفحوصين: ${candidates.length}`);
  console.log(`- مطابقة مؤكدة (MATCH_CONFIRMED): ${confirmedCount}`);
  console.log(`- مطابقة محتملة (MATCH_PROBABLE): ${probableCount}`);
  console.log(`- بحاجة لمراجعة وتأكيد (NEEDS_VERIFICATION): ${needsVerifCount}`);
  console.log(`- مرفوضة (REJECTED): ${rejectedCount}`);
  console.log(`- موجودة مسبقاً في المنصة: ${alreadyInPlatformCount}`);
  console.log(`- موارد جديدة معتمدة ومؤهلة للإضافة: ${newAddedCount}`);
  console.log(`- تكرارات مستبعدة: ${duplicateCount}`);

  const outputPayload = {
    metadata: {
      dataset: 'competitor_4am_verified',
      levelId: '4am',
      totalCandidatesChecked: candidates.length,
      matchConfirmed: confirmedCount,
      matchProbable: probableCount,
      needsVerification: needsVerifCount,
      rejected: rejectedCount,
      alreadyInPlatform: alreadyInPlatformCount,
      newVerifiedAdded: newAddedCount,
      duplicatesFound: duplicateCount,
      generatedAt: new Date().toISOString()
    },
    verifiedResources: verifiedList
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
  console.log(`[OK] تم حفظ الموارد الموثقة في: ${outputPath}`);
}

runVerification();
