/**
 * AGENT 04: DZEXAMS RESEARCHER (باحث موقع DzExams الجزائري)
 * 
 * الهدف: الاكتشاف المنهجي للدروس، المقالات، الملخصات، المنهجيات،
 * التمارين، الاختبارات، الفروض، ومواضيع وحلول البكالوريا.
 * 
 * المصادر:
 * - https://www.dzexams.com/ar/3as/philosophie/cours
 * - https://www.dzexams.com/ar/3as/philosophie/d1
 * - https://www.dzexams.com/ar/3as/philosophie/e1
 * - https://www.dzexams.com/ar/3as/philosophie/d2
 * - https://www.dzexams.com/ar/3as/philosophie/e2
 * - https://www.dzexams.com/ar/3as/philosophie/e3
 * - https://www.dzexams.com/ar/bac/philosophie
 */

const fs = require('fs');
const path = require('path');
const { AgentContract } = require('../utils/agent_contract');

// خوارزمية فك تشفير روابط مستندات DzExams المكتشفة في الفحص المعماري
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

const DZ_TARGET_PAGES = [
  { url: 'https://www.dzexams.com/ar/3as/philosophie/cours', category: 'cours', subCategory: 'دروس وتمارين ومقالات' },
  { url: 'https://www.dzexams.com/ar/3as/philosophie/d1', category: 'devoirs_1', subCategory: 'فروض الفصل الأول' },
  { url: 'https://www.dzexams.com/ar/3as/philosophie/e1', category: 'examens_1', subCategory: 'اختبارات الفصل الأول' },
  { url: 'https://www.dzexams.com/ar/3as/philosophie/d2', category: 'devoirs_2', subCategory: 'فروض الفصل الثاني' },
  { url: 'https://www.dzexams.com/ar/3as/philosophie/e2', category: 'examens_2', subCategory: 'اختبارات الفصل الثاني' },
  { url: 'https://www.dzexams.com/ar/3as/philosophie/e3', category: 'examens_3', subCategory: 'اختبارات الفصل الثالث' },
  { url: 'https://www.dzexams.com/ar/bac/philosophie/lp', category: 'baccalaureate', subCategory: 'شهادة البكالوريا الرسمية - آداب وفلسفة' }
];

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
      }
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.error(`Fetch error for ${url}:`, e.message);
    return null;
  }
}

function parseDzExamsHtml(html, pageMeta) {
  const records = [];
  
  // 1. استخراج المستندات والمواضيع التي تستخدم data-id (documents / sujets)
  // نمط: <a href="#" data-id="..." class="... btn-item-document ..."><span class="doc-title">TITLE</span></a>
  const itemRegex = /<a[^>]+data-id=["']([^"']+)["'][^>]*class=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = itemRegex.exec(html)) !== null) {
    const rawDataId = match[1];
    const classList = match[2];
    const innerHtml = match[3];

    const titleMatch = innerHtml.match(/<span[^>]*class=["'][^"']*doc-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                       innerHtml.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i);
    
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : innerHtml.replace(/<[^>]+>/g, '').trim();
    if (!title || title.length < 4) continue;

    const slug = decodeDzExamsId(rawDataId);
    let finalUrl = pageMeta.url;
    let resourceType = 'document';

    if (classList.includes('btn-item-sujet')) {
      finalUrl = slug ? `https://www.dzexams.com/ar/sujets/${slug}` : pageMeta.url;
      resourceType = 'sujet';
    } else if (classList.includes('btn-item-document')) {
      finalUrl = slug ? `https://www.dzexams.com/ar/documents/${slug}` : pageMeta.url;
      resourceType = 'document';
    } else if (classList.includes('btn-item-article')) {
      finalUrl = slug ? `https://www.dzexams.com/ar/articles/${slug}` : pageMeta.url;
      resourceType = 'article';
    }

    // استخراج معلومات الأستاذ إن وجدت في العنوان
    let author = null;
    const authorMatch = title.match(/(?:للأستاذ|للاستاذ|إعداد الأستاذ|الأستاذ|إعداد الطالب|إعداد المتفوق)\s+([^-\(\)\–]+)/i);
    if (authorMatch) {
      author = authorMatch[1].trim();
    }

    // استخراج السنة إن وجدت
    let year = null;
    const yearMatch = title.match(/(20\d{2})/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    // فحص توفر الحل
    const hasSolution = title.includes('مع الحل') || title.includes('تصحيح') || title.includes('حلول') || title.includes('مع الإجابة');

    records.push({
      document_id: rawDataId,
      slug: slug,
      title: title,
      url: finalUrl,
      source_page: pageMeta.url,
      category: pageMeta.category,
      sub_category: pageMeta.subCategory,
      resource_type: resourceType,
      author: author,
      year: year,
      has_solution: hasSolution,
      source: 'DzExams'
    });
  }

  return records;
}

async function runDzExamsDiscovery(pages = null) {
  const targetPages = pages || DZ_TARGET_PAGES;
  console.log(`\n======================================================`);
  console.log(`[AGENT 04 - DZEXAMS RESEARCHER] بدء دورة استكشاف موقع DzExams`);
  console.log(`عدد الصفحات المستهدفة: ${targetPages.length}`);
  console.log(`======================================================\n`);

  const allDiscovered = [];
  const seenUrls = new Set();

  for (const page of targetPages) {
    process.stdout.write(`    -> جلب محتوى: ${page.subCategory} (${page.url}) ... `);
    const html = await fetchPage(page.url);
    if (!html) {
      console.log('فشل الاتصال!');
      continue;
    }

    const items = parseDzExamsHtml(html, page);
    console.log(`عُثر على ${items.length} عنصر`);

    for (const it of items) {
      if (!seenUrls.has(it.url + it.title)) {
        seenUrls.add(it.url + it.title);
        allDiscovered.push(it);
      }
    }

    // مهلة لتخفيف العبء على الخادم
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n======================================================`);
  console.log(`[AGENT 04 - DZEXAMS RESEARCHER] اكتمل الاستكشاف بنجاح`);
  console.log(`إجمالي الموارد المكتشفة والفريدة: ${allDiscovered.length}`);
  console.log(`======================================================\n`);

  const outDir = path.resolve('c:/Users/mad/Desktop/موقع تعلمي/data/pipeline/raw/dzexams');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'discovered_dzexams.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allDiscovered, null, 2), 'utf-8');
  console.log(`[+] تم حفظ موارد DzExams في: ${jsonPath}`);

  return allDiscovered;
}

async function runDzExamsResearcherAgent(request) {
  const results = await runDzExamsDiscovery((request.input && request.input.pages) || null);

  return AgentContract.createResponse({
    task_id: request.task_id,
    agent: 'dzexams_researcher_v2',
    status: 'COMPLETED',
    records: results,
    provenance: {
      source: 'https://www.dzexams.com/ar/3as/philosophie',
      discovered_count: results.length
    },
    metrics: {
      total_items: results.length
    }
  });
}

if (require.main === module) {
  runDzExamsResearcherAgent({ task_id: 'dzexams_manual' });
}

module.exports = { runDzExamsResearcherAgent, runDzExamsDiscovery };
