/**
 * UNIVERSAL DATA COMPLETION ENGINE (محرك إكمال بيانات المنصة الشامل)
 * 
 * يغطي المواد الـ 7 لشعبة آداب وفلسفة:
 * 1. الفلسفة
 * 2. العلوم الإسلامية
 * 3. التاريخ والجغرافيا
 * 4. اللغة العربية
 * 5. الرياضيات
 * 6. اللغة الفرنسية
 * 7. اللغة الإنجليزية
 * 
 * المبادئ الحاكمة:
 * - DATA -> UI (لا أرقام وهمية أو ثابتة، الأعداد تستمد مباشرة من database.length)
 * - استخراج YouTube Video IDs حقيقية ومؤكدة (Zero search query as video link)
 * - تجميع الفيديوهات حسب القنوات والأستاذ (Channel Grouping)
 * - استكشاف وفك تشفير وثائق وشهادات البكالوريا من DzExams
 * - بناء مصفوفة اكتمال البيانات (Data Completeness Matrix) وتوليد تقرير شامل
 */

const fs = require('fs');
const path = require('path');

// تحميل البروفايلات السبعة
function loadSubjectProfiles() {
  const profDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/pipeline/profiles');
  const files = fs.readdirSync(profDir).filter(f => f.endsWith('.profile.json'));
  const profiles = {};
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(profDir, f), 'utf-8'));
    profiles[data.arabic_name] = data;
  }
  return profiles;
}

// دالة البحث الموحدة في YouTube
async function searchYouTube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ar`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) return [];

    const html = await res.text();
    const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
    if (!match) return [];

    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
    if (!contents || !contents.length) return [];

    const items = contents[0]?.itemSectionRenderer?.contents || [];
    const videos = [];

    for (const item of items) {
      if (item.videoRenderer) {
        const v = item.videoRenderer;
        const videoId = v.videoId;
        if (!videoId || videoId.length !== 11) continue;

        const title = v.title?.runs?.[0]?.text || '';
        const channel = v.ownerText?.runs?.[0]?.text || '';
        const duration = v.lengthText?.simpleText || '25:00';
        const published_at = v.publishedTimeText?.simpleText || '';

        // استبعاد الفيديوهات القصيرة جداً (Shorts)
        const parts = duration.split(':').map(Number);
        if (parts.length === 2 && parts[0] < 2) continue;

        let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        if (v.thumbnail?.thumbnails?.length) {
          thumbnail = v.thumbnail.thumbnails[v.thumbnail.thumbnails.length - 1].url;
        }

        videos.push({
          youtube_id: videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title: title.trim(),
          channel: channel.trim(),
          duration,
          published_at,
          thumbnail
        });
      }
    }

    return videos;
  } catch (err) {
    console.error(`[Search Engine] Fetch error for query "${query}":`, err.message);
    return [];
  }
}

// دالة فك تشفير مستندات DzExams
function decodeDzExamsId(encoded) {
  try {
    const raw = Buffer.from(encoded, 'base64').toString('latin1');
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) - 8);
    }
    return out;
  } catch (e) {
    return null;
  }
}

// جلب موارد DzExams لمادة محددة
async function fetchDzExamsForSubject(profile) {
  const resources = {
    cours: [],
    bac: [],
    exams: []
  };

  if (!profile.dzexams_base) return resources;

  const pages = [
    { url: `${profile.dzexams_base}/cours`, type: 'cours' },
    { url: profile.dzexams_bac, type: 'bac' },
    { url: `${profile.dzexams_base}/e1`, type: 'exams' }
  ];

  for (const p of pages) {
    if (!p.url) continue;
    try {
      const res = await fetch(p.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
        }
      });
      if (!res.ok) continue;

      const html = await res.text();
      const itemRegex = /<a[^>]+data-id=["']([^"']+)["'][^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
      let m;

      while ((m = itemRegex.exec(html)) !== null) {
        const rawDataId = m[1];
        const classList = m[2];
        const inner = m[3];
        const titleMatch = inner.match(/<span[^>]*class=["'][^"']*doc-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                           inner.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : inner.replace(/<[^>]+>/g, '').trim();
        if (!title || title.length < 3) continue;

        const slug = decodeDzExamsId(rawDataId);
        let finalUrl = p.url;
        if (classList.includes('btn-item-sujet')) {
          finalUrl = slug ? `https://www.dzexams.com/ar/sujets/${slug}` : p.url;
        } else if (classList.includes('btn-item-document')) {
          finalUrl = slug ? `https://www.dzexams.com/ar/documents/${slug}` : p.url;
        }

        const item = {
          title,
          url: finalUrl,
          type: p.type,
          has_solution: title.includes('مع الحل') || title.includes('تصحيح')
        };

        if (p.type === 'bac') resources.bac.push(item);
        else if (p.type === 'cours') resources.cours.push(item);
        else resources.exams.push(item);
      }
    } catch (e) {
      console.warn(`Could not fetch dzexams page: ${p.url}`);
    }
  }

  return resources;
}

module.exports = { loadSubjectProfiles, searchYouTube, fetchDzExamsForSubject };
