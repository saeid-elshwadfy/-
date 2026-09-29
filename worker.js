const DB_URL = "https://saeid-elshwadfy-default-rtdb.firebaseio.com";

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

function isCrawler(request) {
  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  return /facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|discordbot|slackbot|googlebot|bingbot/i.test(ua);
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\n", {
        headers: {"content-type": "text/plain; charset=utf-8"}
      });
    }

    const match = url.pathname.match(/^\/book\/([^/]+)\/?$/);
    if (!match) {
      return new Response("Book share worker is running.", {
        status: 200,
        headers: {"content-type": "text/plain; charset=utf-8"}
      });
    }

    const bookId = decodeURIComponent(match[1]);
    if (!bookId || bookId.length > 200) {
      return new Response("Invalid book id", {status: 400});
    }

    const apiUrl = `${DB_URL}/books/${encodeURIComponent(bookId)}.json`;
    const dbResponse = await fetch(apiUrl, {
      headers: {"accept": "application/json"}
    });

    if (!dbResponse.ok) {
      return new Response("Unable to load book", {status: 502});
    }

    const book = await dbResponse.json();
    if (!book) {
      return new Response("Book not found", {status: 404});
    }

    const title = book.title || "كتاب";
    const author = book.author || "سعيد الشوادفي";
    const description = book.desc || `اقرأ كتاب «${title}» للكاتب ${author}.`;
    const image = cleanUrl(book.coverUrl);
    const target = `https://saeid-elshwadfy.github.io/?book=${encodeURIComponent(bookId)}&read=1`;
    const canonical = `${url.origin}/book/${encodeURIComponent(bookId)}`;

    const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>${esc(title)} | ${esc(author)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">

<meta property="og:type" content="book">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ""}
<meta property="og:site_name" content="موقع الكاتب الروائي | سعيد الشوادفي">
<meta property="og:locale" content="ar_EG">

<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(image)}">` : ""}

<meta http-equiv="refresh" content="0;url=${esc(target)}">
</head>
<body>
<p>جاري فتح الكتاب… <a href="${esc(target)}">اضغط هنا إذا لم يفتح تلقائيًا</a></p>
<script>
window.location.replace(${JSON.stringify(target)});
</script>
</body>
</html>`;

    // Social crawlers need the HTML/meta tags. Human visitors are redirected too,
    // while the HTML remains valid if JavaScript is unavailable.
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": isCrawler(request)
          ? "public, max-age=300"
          : "no-store"
      }
    });
  }
};
