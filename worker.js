const DB_URL =
  "https://saeid-elshwadfy-default-rtdb.firebaseio.com";

const SITE_URL =
  "https://saeid-elshwadfy.github.io";

const SITE_NAME =
  "موقع الكاتب الروائي | سعيد الشوادفي";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // ==========================================
    // /book/اسم-الكتاب
    // أو /book/BOOK_ID للروابط القديمة
    // ==========================================

    const match = url.pathname.match(/^\/book\/([^/]+)\/?$/);

    if (!match) {
      return new Response(
        "Worker is running. Use /book/BOOK-NAME",
        {
          status: 200,
          headers: {
            "content-type":
              "text/plain; charset=UTF-8"
          }
        }
      );
    }

    const slug = decodeURIComponent(match[1]).trim();

    if (!slug || slug.length > 300) {
      return new Response(
        "Invalid book reference.",
        {
          status: 400,
          headers: {
            "content-type":
              "text/plain; charset=UTF-8"
          }
        }
      );
    }

    const firebaseUrl =
      `${DB_URL}/books.json`;

    try {
      // ==========================================
      // جلب جميع الكتب من Firebase
      // ==========================================

      const response = await fetch(
        firebaseUrl,
        {
          headers: {
            "accept": "application/json"
          }
        }
      );

      if (!response.ok) {
        return new Response(
          "Unable to read books from Firebase.",
          {
            status: 502,
            headers: {
              "content-type":
                "text/plain; charset=UTF-8"
            }
          }
        );
      }

      const books = await response.json();

      const wantedSlug =
        normalizeSlug(slug);

      let book = null;

      // ==========================================
      // البحث بالـ slug
      // ==========================================

      if (
        books &&
        typeof books === "object"
      ) {
        for (
          const [id, item]
          of Object.entries(books)
        ) {
          if (
            !item ||
            typeof item !== "object"
          ) {
            continue;
          }

          const titleSlug =
            makeSlug(
              item.title || "كتاب"
            );

          if (
            titleSlug === wantedSlug
          ) {
            book = {
              ...item,
              id
            };

            break;
          }
        }
      }

      // ==========================================
      // توافق مع الروابط القديمة بالـ ID
      // ==========================================

      if (
        !book &&
        books &&
        books[slug]
      ) {
        book = {
          ...books[slug],
          id: slug
        };
      }

      // ==========================================
      // الكتاب غير موجود
      // ==========================================

      if (!book) {
        return new Response(
          "Book not found.",
          {
            status: 404,
            headers: {
              "content-type":
                "text/plain; charset=UTF-8"
            }
          }
        );
      }

      // ==========================================
      // بيانات الكتاب
      // ==========================================

      const rawTitle =
        book.title || "كتاب";

      const rawAuthor =
        book.author ||
        "سعيد الشوادفي";

      const rawDescription =
        book.desc ||
        `كتاب ${rawTitle} للكاتب ${rawAuthor}`;

      const title =
        escapeHtml(rawTitle);

      const author =
        escapeHtml(rawAuthor);

      const description =
        escapeHtml(rawDescription);

      const image =
        escapeAttr(
          book.coverUrl || ""
        );

      // ==========================================
      // رابط Worker الأساسي للكتاب
      // ==========================================

      const bookSlug =
        makeSlug(rawTitle);

      const workerUrl =
        `${url.origin}/book/${encodeURIComponent(bookSlug)}`;

      // ==========================================
      // مهم جدًا:
      // نفتح الموقع العادي بدون read=1
      //
      // وبالتالي الموقع يعرض:
      // الهيدر
      // الرئيسية
      // الكتاب
      // الأسعار
      // الشراء
      // وسائل الدفع
      //
      // والقراءة لا تبدأ تلقائيًا.
      // ==========================================

      const siteUrl =
        `${SITE_URL}/?book=${encodeURIComponent(book.id)}`;

      // ==========================================
      // الصفحة الوسيطة
      // ==========================================

      const html = `<!doctype html>
<html lang="ar" dir="rtl">

<head>

  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <title>
    ${title} | ${author}
  </title>

  <meta
    name="description"
    content="${description}"
  >

  <link
    rel="canonical"
    href="${escapeAttr(workerUrl)}"
  >

  <!-- ========================================
       Open Graph
       ======================================== -->

  <meta
    property="og:type"
    content="book"
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
    content="${escapeAttr(workerUrl)}"
  >

  <meta
    property="og:site_name"
    content="${escapeAttr(SITE_NAME)}"
  >

  <meta
    property="og:locale"
    content="ar_EG"
  >

  ${
    image
      ? `
  <meta
    property="og:image"
    content="${image}"
  >

  <meta
    property="og:image:secure_url"
    content="${image}"
  >

  <meta
    property="og:image:type"
    content="image/jpeg"
  >

  <meta
    property="og:image:alt"
    content="${title}"
  >
  `
      : ""
  }

  <!-- ========================================
       Twitter / X
       ======================================== -->

  <meta
    name="twitter:card"
    content="${
      image
        ? "summary_large_image"
        : "summary"
    }"
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
    image
      ? `
  <meta
    name="twitter:image"
    content="${image}"
  >

  <meta
    name="twitter:image:alt"
    content="${title}"
  >
  `
      : ""
  }

  <!-- ========================================
       Book Structured Data
       ======================================== -->

  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    name: rawTitle,
    author: {
      "@type": "Person",
      name: rawAuthor
    },
    description: rawDescription,
    ...(book.coverUrl
      ? {
          image: book.coverUrl
        }
      : {}),
    url: workerUrl
  })}
  </script>

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

      padding: 25px;

      font-family:
        Arial,
        Tahoma,
        sans-serif;

      background:
        linear-gradient(
          135deg,
          #111827,
          #1f2937
        );

      color: #fff;
    }

    .card {
      width: 100%;
      max-width: 520px;

      padding: 30px 25px;

      text-align: center;

      background:
        rgba(255,255,255,.08);

      border:
        1px solid
        rgba(255,255,255,.12);

      border-radius: 22px;

      box-shadow:
        0 20px 60px
        rgba(0,0,0,.35);

      backdrop-filter:
        blur(12px);
    }

    .site-name {
      font-size: 14px;
      opacity: .7;
      margin-bottom: 20px;
    }

    .cover {
      display: block;

      width: auto;
      max-width: 230px;
      max-height: 330px;

      margin:
        0 auto 22px;

      border-radius: 12px;

      box-shadow:
        0 12px 30px
        rgba(0,0,0,.35);
    }

    h1 {
      margin:
        0 0 8px;

      font-size: 27px;

      line-height: 1.5;
    }

    .author {
      opacity: .75;

      margin-bottom: 18px;

      font-size: 15px;
    }

    .description {
      line-height: 1.9;

      font-size: 15px;

      opacity: .9;

      margin-bottom: 22px;
    }

    .button {
      display: inline-block;

      padding:
        12px 26px;

      border-radius: 12px;

      background:
        #ffffff;

      color:
        #111827;

      text-decoration: none;

      font-weight: bold;

      transition:
        transform .2s ease;
    }

    .button:hover {
      transform:
        translateY(-2px);
    }

    .note {
      margin-top: 15px;

      font-size: 12px;

      opacity: .55;
    }

  </style>

</head>

<body>

  <main class="card">

    <div class="site-name">
      ${escapeHtml(SITE_NAME)}
    </div>

    ${
      image
        ? `
    <img
      class="cover"
      src="${image}"
      alt="${title}"
    >
    `
        : ""
    }

    <h1>
      ${title}
    </h1>

    <div class="author">
      بقلم ${author}
    </div>

    <div class="description">
      ${description}
    </div>

    <a
      class="button"
      href="${escapeAttr(siteUrl)}"
    >
      📖 عرض الكتاب
    </a>

    <div class="note">
      جاري فتح صفحة الكتاب...
    </div>

  </main>

  <script>
    setTimeout(function () {
      window.location.replace(
        ${JSON.stringify(siteUrl)}
      );
    }, 500);
  </script>

</body>

</html>`;

      // ==========================================
      // إرسال الصفحة
      // ==========================================

      return new Response(
        html,
        {
          status: 200,

          headers: {
            "content-type":
              "text/html; charset=UTF-8",

            "cache-control":
              "public, max-age=300",

            "x-content-type-options":
              "nosniff"
          }
        }
      );

    } catch (error) {

      return new Response(
        "Worker error: " +
        String(error),
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


// ==================================================
// تكوين Slug من عنوان الكتاب
// ==================================================

function makeSlug(value) {

  return normalizeSlug(
    String(value || "")
      .trim()
      .toLowerCase()

      // إزالة التشكيل
      .replace(
        /[\u064B-\u065F\u0670]/g,
        ""
      )

      // توحيد الحروف العربية
      .replace(
        /[أإآ]/g,
        "ا"
      )

      .replace(
        /ى/g,
        "ي"
      )

      .replace(
        /ة/g,
        "ه"
      )

      // استبدال المسافات والرموز بشرطة
      .replace(
        /[^\u0600-\u06FFa-z0-9]+/gi,
        "-"
      )

      .replace(
        /^-+|-+$/g,
        ""
      )
  );
}


// ==================================================
// Normalize للـ Slug القادم من الرابط
// ==================================================

function normalizeSlug(value) {

  return String(value || "")
    .trim()
    .toLowerCase()

    .replace(
      /[\u064B-\u065F\u0670]/g,
      ""
    )

    .replace(
      /[أإآ]/g,
      "ا"
    )

    .replace(
      /ى/g,
      "ي"
    )

    .replace(
      /ة/g,
      "ه"
    )

    .replace(
      /[^\u0600-\u06FFa-z0-9]+/gi,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""
    );
}


// ==================================================
// حماية النصوص HTML
// ==================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#39;"
    );
}


// ==================================================
// حماية خصائص HTML
// ==================================================

function escapeAttr(value) {

  return escapeHtml(value);
}
