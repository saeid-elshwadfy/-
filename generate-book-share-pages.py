#!/usr/bin/env python3
import html
import json
import os
import shutil
import urllib.parse
import urllib.request
from pathlib import Path

DATABASE_URL = os.environ.get('FIREBASE_DATABASE_URL', 'https://saeid-elshwadfy-default-rtdb.firebaseio.com').rstrip('/')
SITE_URL = os.environ.get('SITE_URL', 'https://saeid-elshwadfy.github.io').rstrip('/')
OUT_DIR = Path(os.environ.get('BOOK_SHARE_DIR', 'books'))
DEFAULT_IMAGE = 'https://res.cloudinary.com/uha8a6rd/image/upload/v1790121942/ieq5er6fzf6xyfhmtgcw.jpg'


def esc(value):
    return html.escape(str(value or ''), quote=True)


def fetch_books():
    url = f'{DATABASE_URL}/books.json'
    req = urllib.request.Request(url, headers={'User-Agent': 'book-share-generator/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = json.load(response)
    if not data:
        return {}
    if not isinstance(data, dict):
        raise RuntimeError('Firebase books data is not an object')
    return data


def page_for(book_id, book):
    title = book.get('title') or 'كتاب'
    author = book.get('author') or 'سعيد الشوادفي'
    desc = book.get('desc') or f'اقرأ كتاب «{title}» للكاتب {author}.'
    cover = book.get('coverUrl') or DEFAULT_IMAGE
    encoded_id = urllib.parse.quote(str(book_id), safe='')
    reader_url = f'{SITE_URL}/?book={encoded_id}&read=1'
    share_url = f'{SITE_URL}/books/{encoded_id}.html'
    if cover.startswith('/'):
        cover = SITE_URL + cover

    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)} — سعيد الشوادفي</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(share_url)}">
<meta property="og:type" content="book">
<meta property="og:site_name" content="موقع الكاتب الروائي | سعيد الشوادفي">
<meta property="og:locale" content="ar_AR">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{esc(cover)}">
<meta property="og:image:alt" content="غلاف {esc(title)}">
<meta property="og:url" content="{esc(share_url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{esc(cover)}">
<meta http-equiv="refresh" content="0;url={esc(reader_url)}">
<style>
body{{font-family:Arial,sans-serif;text-align:center;padding:40px;background:#f7f3ee;color:#33221a}}
img{{max-width:280px;max-height:400px;border-radius:12px}}
a{{display:inline-block;margin-top:20px;padding:12px 22px;background:#8b1e2d;color:#fff;text-decoration:none;border-radius:8px}}
</style>
</head>
<body>
<img src="{esc(cover)}" alt="غلاف {esc(title)}">
<h1>{esc(title)}</h1>
<p>{esc(desc)}</p>
<p>بقلم: {esc(author)}</p>
<a href="{esc(reader_url)}">📖 فتح الكتاب والقراءة</a>
<script>window.location.replace({json.dumps(reader_url, ensure_ascii=False)});</script>
</body>
</html>
'''


def main():
    books = fetch_books()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Remove generated HTML pages only; keep any non-generated files.
    for old in OUT_DIR.glob('*.html'):
        old.unlink()
    generated = 0
    for book_id, book in books.items():
        if not isinstance(book, dict):
            continue
        (OUT_DIR / f'{book_id}.html').write_text(page_for(book_id, book), encoding='utf-8')
        generated += 1
    print(f'Generated {generated} book share pages in {OUT_DIR}/')


if __name__ == '__main__':
    main()
