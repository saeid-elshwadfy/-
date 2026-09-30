export default {
  async fetch(request) {
    const url = new URL(request.url);

    // الرابط المطلوب:
    // /book/اسم-الكتاب
    const match = url.pathname.match(/^\/book\/([^/]+)\/?$/);

    // الصفحة الرئيسية للـ Worker
    if (!match) {
      return new Response(
        "موقع الكاتب الروائي | سعيد الشوادفي",
        {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=UTF-8"
          }
        }
      );
    }

    const slug = decodeURIComponent(match[1]).trim();

    const firebaseUrl =
      "https://saeid-elshwadfy-default-rtdb.firebaseio.com/books.json";

    try {
      // قراءة الكتب من Firebase
      const response = await fetch(firebaseUrl, {
        headers: {
          "accept": "application/json"
        }
      });

      if (!response.ok) {
        return new Response(
          "تعذر قراءة بيانات الكتب.",
          {
            status: 502,
            headers: {
              "content-type": "text/plain; charset=UTF-8"
            }
          }
        );
      }

      const books = await response.json();
      const wanted = normalizeSlug(slug);

      let book = null;

      // البحث بالاسم
      if (books && typeof books === "object") {
        for (const [id, item] of Object.entries(books)) {
          if (!item || typeof item !== "object") continue;

          const titleSlug = makeSlug(item.title || "كتاب");

          if (titleSlug === wanted) {
            book = {
              ...item,
              id
            };
            break;
          }
        }
      }

      // دعم الروابط القديمة باستخدام ID
      if (!book && books && books[slug]) {
        book = {
          ...books[slug],
          id: slug
        };
      }

      // الكتاب غير موجود
      if (!book) {
        return new Response(
          "الكتاب غير موجود.",
          {
            status: 404,
            headers: {
              "content-type": "text/plain; charset=UTF-8"
            }
          }
        );
      }

      // بيانات الكتاب
      const rawTitle =
        String(book.title || "كتاب").trim();

      const rawAuthor =
        String(book.author || "سعيد الشوادفي").trim();

      const rawDescription =
        String(
          book.desc ||
          `كتاب ${rawTitle} للكاتب ${rawAuthor}`
        ).trim();

      const rawImage =
        String(book.coverUrl || "").trim();

      // تنظيف البيانات قبل إدخالها في HTML
      const title = escapeHtml(rawTitle);
      const author = escapeHtml(rawAuthor);
      const description = escapeHtml(rawDescription);
      const image = escapeAttr(rawImage);

      // رابط المشاركة الحالي
      const bookSlug = makeSlug(rawTitle);

      const shareUrl =
        `${url.origin}/book/${encodeURIComponent(bookSlug)}`;

      // رابط الموقع الفعلي لفتح الكتاب
      const siteUrl =
        `https://saeid-elshwadfy.github.io/?book=${encodeURIComponent(book.id)}&read=1`;

      /*
       * صفحة المشاركة
       *
       * مهم:
       * لا نضع تحويلًا قبل بيانات OG.
       * مواقع فيسبوك وواتساب وغيرها تحتاج تقرأ
       * بيانات الصفحة أولًا.
       */
      const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>

  <meta charset="UTF-8">

  <meta name="viewport"
        content="width=device-width, initial-scale=1.0">

  <title>${title} | ${author}</title>

  <meta
    name="description"
    content="${description}"
  >

  <meta
    name="author"
    content="${author}"
  >

  <meta
    name="robots"
    content="index, follow"
  >

  <link
    rel="canonical"
    href="${escapeAttr(shareUrl)}"
  >

  <!-- ========================= -->
  <!-- Open Graph -->
  <!-- ========================= -->

  <meta
    property="og:type"
    content="book"
  >

  <meta
    property="og:locale"
    content="ar_AR"
  >

  <meta
    property="og:site_name"
    content="موقع الكاتب الروائي | سعيد الشوادفي"
  >

  <meta
    property="og:title"
    content="${title}"
  >

  <meta
    property="og:description"
    content="${description}"
  >

  <meta
    property="og:url"
    content="${escapeAttr(shareUrl)}"
  >

  ${
    rawImage
      ? `
  <meta
    property="og:image"
    content="${image}"
  >

  <meta
    property="og:image:alt"
    content="غلاف ${title}"
  >
  `
      : ""
  }

  <!-- ========================= -->
  <!-- Twitter / X -->
  <!-- ========================= -->

  <meta
    name="twitter:card"
    content="summary_large_image"
  >

  <meta
    name="twitter:title"
    content="${title}"
  >

  <meta
    name="twitter:description"
    content="${description}"
  >

  ${
    rawImage
      ? `
  <meta
    name="twitter:image"
    content="${image}"
  >

  <meta
    name="twitter:image:alt"
    content="غلاف ${title}"
  >
  `
      : ""
  }

  <!-- ========================= -->
  <!-- بيانات الكتاب لمحركات البحث -->
  <!-- ========================= -->

  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    "name": rawTitle,
    "author": {
      "@type": "Person",
      "name": rawAuthor
    },
    "description": rawDescription,
    ...(rawImage
      ? {
          "image": [rawImage]
        }
      : {}),
    "url": shareUrl
  })}
  </script>

  <!-- ========================= -->
  <!-- شكل صفحة التحويل -->
  <!-- ========================= -->

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111;
      color: #fff;
      font-family: Arial, Tahoma, sans-serif;
      text-align: center;
      padding: 20px;
    }

    .box {
      width: 100%;
      max-width: 520px;
      padding: 30px 20px;
      border-radius: 20px;
      background: #1d1d1d;
    }

    img {
      max-width: 180px;
      max-height: 260px;
      border-radius: 12px;
      margin-bottom: 20px;
      object-fit: cover;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 25px;
    }

    p {
      line-height: 1.8;
      color: #ccc;
    }

    .button {
      display: inline-block;
      margin-top: 15px;
      padding: 13px 25px;
      border-radius: 10px;
      background: #fff;
      color: #111;
      text-decoration: none;
      font-weight: bold;
    }

    .site {
      margin-top: 20px;
      font-size: 13px;
      color: #888;
    }
  </style>

</head>

<body>

  <div class="box">

    ${
      rawImage
        ? `<img
             src="${image}"
             alt="غلاف ${title}"
           >`
        : ""
    }

    <h1>${title}</h1>

    <p>
      بقلم: ${author}
    </p>

    <p>
      ${description}
    </p>

    <a
      class="button"
      href="${escapeAttr(siteUrl)}"
    >
      قراءة الكتاب
    </a>

    <div class="site">
      موقع الكاتب الروائي | سعيد الشوادفي
    </div>

  </div>

  <!--
    التحويل يتم بعد إعطاء محركات ومواقع المشاركة
    فرصة لقراءة بيانات Open Graph.
  -->

  <script>
    setTimeout(function () {
      window.location.replace(
        ${JSON.stringify(siteUrl)}
      );
    }, 300);
  </script>

</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=UTF-8",

          // منع تخزين نسخة قديمة بسرعة
          "cache-control":
            "public, max-age=60, s-maxage=300",

          // تحسينات أمان بسيطة
          "x-content-type-options":
            "nosniff",

          "referrer-policy":
            "strict-origin-when-cross-origin"
        }
      });

    } catch (error) {

      return new Response(
        "حدث خطأ في Worker: " + String(error),
        {
          status: 500,
          headers: {
            "content-type":
              "text/plain; charset=UTF-8"
          }
        }
      );
    }
  }
};


// ========================================
// إنشاء اسم مناسب للرابط
// ========================================

function makeSlug(value) {
  return normalizeSlug(
    String(value || "")
      .trim()
      .toLowerCase()

      // إزالة التشكيل
      .replace(/[\u064B-\u065F\u0670]/g, "")

      // توحيد الحروف العربية
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")

      // تحويل المسافات والرموز إلى -
      .replace(/[^\u0600-\u06FFa-z0-9]+/gi, "-")

      // إزالة - من البداية والنهاية
      .replace(/^-+|-+$/g, "")
  );
}


// ========================================
// توحيد الرابط أثناء البحث
// ========================================

function normalizeSlug(value) {
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


// ========================================
// حماية النصوص داخل HTML
// ========================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


// ========================================
// حماية الخصائص والروابط
// ========================================

function escapeAttr(value) {
  return escapeHtml(value);
}
