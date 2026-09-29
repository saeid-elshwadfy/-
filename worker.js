const DB_URL = "https://saeid-elshwadfy-default-rtdb.firebaseio.com";
const SITE_URL = "https://saeid-elshwadfy.github.io";
const SITE_NAME = "موقع الكاتب الروائي | سعيد الشوادفي";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanUrl(value) {
  try {
    const u = new URL(String(value || ""));
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}

// نفس طريقة تكوين الـ slug المستخدمة في روابط المشاركة
function makeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FFa-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function isCrawler(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();

  return /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|googlebot|bingbot/i.test(ua);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // robots.txt
    if (url.pathname === "/robots.txt") {
      return new Response(
        "User-agent: *\nAllow: /\n",
        {
          headers: {
            "content-type": "text/plain; charset=utf-8"
          }
        }
      );
    }

    // رابط الكتاب:
    // /book/ID
    // أو
    // /book/اسم-الكتاب
    const match = url.pathname.match(/^\/book\/([^/]+)\/?$/);

    if (!match) {
      return new Response("Book share worker is running.", {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8"
        }
      });
    }

    const key = decodeURIComponent(match[1]);

    if (!key || key.length > 300) {
      return new Response("Invalid book reference", {
        status: 400
      });
    }

    let book = null;
    let bookId = null;

    /*
      أولاً:
      نجرب اعتبار الرابط Book ID
      عشان الروابط القديمة تفضل شغالة.
    */

    const directApiUrl =
      `${DB_URL}/books/${encodeURIComponent(key)}.json`;

    const directResponse = await fetch(directApiUrl, {
      headers: {
        "accept": "application/json"
      }
    });

    if (directResponse.ok) {
      const directBook = await directResponse.json();

      if (directBook) {
        book = directBook;
        bookId = key;
      }
    }

    /*
      لو مش ID، ندور على الكتاب باستخدام الـ slug.
    */

    if (!book) {
      const booksResponse = await fetch(
        `${DB_URL}/books.json`,
        {
          headers: {
            "accept": "application/json"
          }
        }
      );

      if (!booksResponse.ok) {
        return new Response("Unable to load books", {
          status: 502
        });
      }

      const books = await booksResponse.json();

      if (books && typeof books === "object") {
        for (const [id, candidate] of Object.entries(books)) {
          if (!candidate) continue;

          const candidateSlug = makeSlug(candidate.title);

          if (candidateSlug === key) {
            book = candidate;
            bookId = id;
            break;
          }
        }
      }
    }

    if (!book || !bookId) {
      return new Response("Book not found", {
        status: 404,
        headers: {
          "content-type": "text/plain; charset=utf-8"
        }
      });
    }

    const title = book.title || "كتاب";
    const author = book.author || "سعيد الشوادفي";

    const description =
      book.desc ||
      `اقرأ كتاب «${title}» للكاتب ${author}.`;

    const image = cleanUrl(book.coverUrl);

    /*
      بعد الضغط على الرابط:
      يفتح الكتاب الحقيقي داخل موقعك.
    */
    const target =
      `${SITE_URL}/?book=${encodeURIComponent(bookId)}&read=1`;

    /*
      الرابط الأساسي يفضل هو نفس الرابط الذي تمت مشاركته.
    */
    const canonical =
      `${url.origin}/book/${encodeURIComponent(key)}`;

    const html = `<!doctype html>
<html lang="ar" dir="rtl">

<head>

<meta charset="utf-8">

<title>${esc(title)} | ${esc(author)}</title>

<meta
  name="description"
  content="${esc(description)}"
>

<link
  rel="canonical"
  href="${esc(canonical)}"
>

<!-- Open Graph -->

<meta
  property="og:type"
  content="book"
>

<meta
  property="og:title"
  content="${esc(title)}"
>

<meta
  property="og:description"
  content="${esc(description)}"
>

<meta
  property="og:url"
  content="${esc(canonical)}"
>

<meta
  property="og:site_name"
  content="${esc(SITE_NAME)}"
>

<meta
  property="og:locale"
  content="ar_EG"
>

${image ? `
<meta
  property="og:image"
  content="${esc(image)}"
>

<meta
  property="og:image:alt"
  content="${esc(title)}"
>
` : ""}

<!-- Twitter / X -->

<meta
  name="twitter:card"
  content="${image ? "summary_large_image" : "summary"}"
>

<meta
  name="twitter:title"
  content="${esc(title)}"
>

<meta
  name="twitter:description"
  content="${esc(description)}"
>

${image ? `
<meta
  name="twitter:image"
  content="${esc(image)}"
>

<meta
  name="twitter:image:alt"
  content="${esc(title)}"
>
` : ""}

<!-- Book structured data -->

<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Book",
  "name": title,
  "author": {
    "@type": "Person",
    "name": author
  },
  "description": description,
  ...(image ? { "image": image } : {}),
  "url": canonical
})}
</script>

<!--
  تأخير بسيط جداً حتى تستطيع
  WhatsApp / Facebook / Telegram
  قراءة بيانات Open Graph.
-->
<meta
  http-equiv="refresh"
  content="0.3;url=${esc(target)}"
>

<style>
body {
  font-family: Arial, sans-serif;
  background: #f7f7f7;
  margin: 0;
  padding: 40px 20px;
  text-align: center;
  color: #222;
}

.card {
  max-width: 500px;
  margin: auto;
  background: white;
  padding: 25px;
  border-radius: 18px;
  box-shadow: 0 5px 25px rgba(0,0,0,.08);
}

.cover {
  max-width: 220px;
  max-height: 320px;
  border-radius: 12px;
  margin-bottom: 20px;
}

h1 {
  margin: 10px 0;
}

.author {
  color: #666;
  margin-bottom: 15px;
}

.description {
  line-height: 1.8;
}

a.button {
  display: inline-block;
  margin-top: 20px;
  padding: 12px 24px;
  background: #222;
  color: white;
  text-decoration: none;
  border-radius: 10px;
}
</style>

</head>

<body>

<div class="card">

${image ? `
<img
  class="cover"
  src="${esc(image)}"
  alt="${esc(title)}"
>
` : ""}

<h1>${esc(title)}</h1>

<div class="author">
بقلم ${esc(author)}
</div>

<div class="description">
${esc(description)}
</div>

<a
  class="button"
  href="${esc(target)}"
>
فتح الكتاب
</a>

</div>

<script>
setTimeout(function () {
  window.location.replace(${JSON.stringify(target)});
}, 300);
</script>

</body>

</html>`;

    return new Response(html, {
      status: 200,

      headers: {
        "content-type":
          "text/html; charset=utf-8",

        "cache-control":
          isCrawler(request)
            ? "public, max-age=300"
            : "no-store",

        "x-content-type-options":
          "nosniff"
      }
    });
  }
};
