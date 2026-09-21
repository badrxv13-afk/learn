const { searchYouTube } = require('./universal_engine');

async function test() {
  console.log('Testing Islamic Studies:');
  const vids1 = await searchYouTube('العقيدة الاسلامية وأثرها على الفرد والمجتمع زكريا خرشي بكالوريا');
  console.log(`Found ${vids1.length} videos:`);
  vids1.slice(0, 3).forEach(v => console.log(`  - [${v.youtube_id}] (${v.duration}) ${v.channel}: ${v.title}`));

  console.log('\nTesting Mathematics:');
  const vids2 = await searchYouTube('المتتاليات عددية الأستاذ نور الدين آداب وفلسفة بكالوريا');
  console.log(`Found ${vids2.length} videos:`);
  vids2.slice(0, 3).forEach(v => console.log(`  - [${v.youtube_id}] (${v.duration}) ${v.channel}: ${v.title}`));

  console.log('\nTesting History/Geography:');
  const vids3 = await searchYouTube('بروز الصراع وتشكل العالم الأستاذ قنشوبة بكالوريا');
  console.log(`Found ${vids3.length} videos:`);
  vids3.slice(0, 3).forEach(v => console.log(`  - [${v.youtube_id}] (${v.duration}) ${v.channel}: ${v.title}`));
}

test();
