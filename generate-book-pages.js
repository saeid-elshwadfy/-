const fs = require('fs');
const path = require('path');

const DB_URL = 'https://saeid-elshwadfy-default-rtdb.firebaseio.com/books.json';
const BASE_URL = 'https://saeid-elshwadfy.github.io';
const OUT_DIR = path.join(process.cwd(), 'books');

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeFileName(id) {
  return encodeURIComponent(id).replace(/%/g, '').replace(/\//g, '_');
}

function imageUrl(book) {
  return book?.coverUrl || `${BASE_URL}/og-default.jpg`;
}

async function main() {
  const response = await fetch(DB_URL);
  if (!response.ok) throw new Error(`Firebase HTTP ${response.status}`);
  const books = await response.json() || {};

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Remove previously generated book pages only. Never touch index.html.
  for (const name of fs.readdirSync(OUT_DIR)) {
    if (name.endsWith('.html')) fs.unlinkSync(path.join(OUT_DIR, name));
  }

  for (const [id, book] of Object.entries(books)) {
    if (!book || !book.title) continue;

    const url = `${BASE_URL}/books/${encodeURIComponent(id)}.html`;
    const target = `${BASE_URL}/?book=${encodeURIComponent(id)}&read=1`;
    const title = `📖 ${book.title} | سعيد الشوادفي`;
    const description = book.desc || `اقرأ كتاب «${book.title}» للكاتب سعيد الشوادفي مباشرة.`;
    const author = book.author || 'سعيد الشوادفي';
    const image = imageUrl(book);

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:type" content="book">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:alt" content="غلاف ${esc(book.title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(image)}">
  <meta http-equiv="refresh" content="0;url=${esc(target)}">
  <link rel="canonical" href="${esc(url)}">
</head>
<body>
  <main style="font-family:Arial,sans-serif;text-align:center;padding:40px">
    <img src="${esc(image)}" alt="غلاف ${esc(book.title)}" style="max-width:280px;border-radius:12px">
    <h1>${esc(book.title)}</h1>
    <p>بقلم: ${esc(author)}</p>
    <p>${esc(description)}</p>
    <p><a href="${esc(target)}">فتح الكتاب مباشرة</a></p>
  </main>
  <script>location.replace(${JSON.stringify(target)});</script>
</body>
</html>`;

    fs.writeFileSync(path.join(OUT_DIR, `${safeFileName(id)}.html`), html, 'utf8');
  }

  console.log(`Generated ${Object.keys(books).length} book share pages.`);
}

main().catch(err => { console.error(err); process.exit(1); });
