/**
 * أداة تطوير واختبار محلي فقط (Development-Only Local Server Utility)
 * 
 * تنبيه هام للإنتاج:
 * منصة ألماد التعليمية (ELMED) منصة ثابته بالكامل (100% Static Web Application)
 * مصممة للنشر المباشر عبر GitHub Pages دون أي خادم Node.js أو Backend في الإنتاج.
 * 
 * هذا الملف مخصص حصرياً للمطورين الذين يرغبون في معاينة الموقع محلياً عبر HTTP
 * بدلاً من بروتوكول (file://) قبل رفعه إلى مستودع GitHub.
 * 
 * لا يتطلب أي مكتبات خارجية (Zero Dependencies - Pure Node.js).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  // تطبيق سياسة Referrer القياسية الصارمة المتوافقة مع YouTube
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // الحماية من Directory Traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(BASE_DIR, safePath);

  // التأكد من أن الملف المطلوب داخل مسار المشروع
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: غير مسموح بالوصول خارج مجلد المشروع.');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: الملف المطلوب غير موجود.');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (streamErr) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error');
      }
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('====================================================');
  console.log('  خادم منصة ألماد التعليمية المحلي يعمل بنجاح');
  console.log(`  الرابط المحلي: http://localhost:${PORT}`);
  console.log('  ترويسة الأمان: Referrer-Policy: strict-origin-when-cross-origin');
  console.log('  حالة مشغل YouTube: مهيأ بالكامل لمنع Error 153');
  console.log('====================================================');
});

module.exports = server;
