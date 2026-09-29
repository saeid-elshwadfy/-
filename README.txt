# الحل النهائي لمشاركة الكتب

هذا الحل يحافظ على الكتب وبياناتها في Firebase كما هي.

## الفكرة
زر المشاركة في `index.html` يرسل رابطًا إلى Cloudflare Worker:
`/book/BOOK_ID`

الـ Worker يقرأ:
`books/BOOK_ID`
من Firebase Realtime Database، ثم يقدم لفيسبوك/واتساب:
- اسم الكتاب
- الوصف
- غلاف الكتاب

وبعد ذلك يحول الزائر إلى:
`https://saeid-elshwadfy.github.io/?book=BOOK_ID&read=1`

## مهم قبل الرفع
1. أنشئ Cloudflare Worker جديد.
2. انسخ محتوى `worker/worker.js` إليه.
3. بعد النشر سيعطيك Cloudflare رابطًا مثل:
   `https://book-share.example.workers.dev`
4. افتح `index.html` وابحث عن:
   `YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev`
   واستبدل الجزء كله باسم رابط الـ Worker الحقيقي.
5. ارفع `index.html` المعدل إلى GitHub Pages.
6. لا ترفع ملفات الكتب إلى GitHub. الكتب تبقى في Firebase/Cloudinary كما هي.

## اختبار
بعد النشر، شارك رابطًا مثل:
`https://YOUR-WORKER-DOMAIN/book/BOOK_ID`

إذا كان الكتاب موجودًا في Firebase، يجب أن تكون معاينة المشاركة باسم الكتاب وغلافه.
