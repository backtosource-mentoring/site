#!/usr/bin/env python3
"""Build the bilingual blog (Hebrew at /blog/, English at /en/blog/).

Reads tools/blog_articles.py, reuses the header/footer of about.html and en/about.html,
writes article pages, index pages, RSS feeds and updates sitemap.xml.
Run from the repo root: python3 tools/build_blog.py
"""
import html, json, re, sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from blog_articles import ARTICLES  # noqa: E402

SITE = "https://backtosource-mentoring.com"
NEWSLETTER = "https://bol-weekly-note-esther.netlify.app/?utm_source=site&utm_medium=blog"
APP = "https://app.backtosource-mentoring.com/?utm_source=site&utm_medium=blog"

L = {
    "he": {"dir": "rtl", "lang": "he", "locale": "he_IL", "alt_locale": "en_US", "base": "/blog/",
            "src": "about.html", "blog": "בלוג", "home": "דף הבית",
            "index_title": "בלוג | ביולוגיה של מנהיגות - קבלת החלטות תחת לחץ",
            "index_desc": "מאמרים על קבלת החלטות תחת לחץ, ויסות ומנהיגות, מבוססי מחקר ומעשיים, לתפקידי הנהלה ומפתח. מאת אסתר מיכל קציר.",
            "index_h1": "ביולוגיה של מנהיגות", "index_kicker": "מאמרים על הרגע שבו הלחץ מתחיל להחליט במקומנו",
            "eyebrow": "בלוג", "read": "לקריאה", "source": "מקור", "by": "אסתר מיכל קציר",
            "app_t": "לפני ההחלטה הבאה", "app_p": "שלושה עוגנים, פחות מדקה. אפליקציית הוויסות החינמית, בעברית ובאנגלית.",
            "app_b": "לפתיחת האפליקציה", "lec_b": "הרצאה לצוות ההנהלה",
            "nl_t": "המכתב השבועי", "nl_p": "מאמר אחד בשבוע על החלטות תחת לחץ, ישירות למייל. כרגע באנגלית.",
            "nl_b": "להרשמה", "other": "Read in English", "more": "עוד מאמרים", "month": "%d.%m.%Y"},
    "en": {"dir": "ltr", "lang": "en", "locale": "en_US", "alt_locale": "he_IL", "base": "/en/blog/",
            "src": "en/about.html", "blog": "Blog", "home": "Home",
            "index_title": "Blog | Biology of Leadership - Decisions Under Pressure",
            "index_desc": "Research-based, practical articles on decision-making under pressure, regulation and leadership for executives and key roles. By Esther Michele Kazir.",
            "index_h1": "Biology of Leadership", "index_kicker": "Notes on the moment pressure starts making the decision for you",
            "eyebrow": "Blog", "read": "Read", "source": "Source", "by": "Esther Michele Kazir",
            "app_t": "Before your next decision", "app_p": "Three anchors, under a minute. The free regulation app, in English and Hebrew.",
            "app_b": "Open the app", "lec_b": "A talk for your leadership team",
            "nl_t": "The Weekly Note", "nl_p": "One short note a week on decisions under pressure, in your inbox.",
            "nl_b": "Subscribe", "other": "לקריאה בעברית", "more": "More articles", "month": "%b %d, %Y"},
}


def shell(lang):
    """Return (header_html, footer_html) taken from the about page, with absolute asset paths."""
    src = (ROOT / L[lang]["src"]).read_text(encoding="utf-8")
    header = src[src.index("<header class=\"nav\">"): src.index("</header>") + len("</header>")]
    footer = src[src.index("<footer class=\"footer\">"):src.index("</body>")]
    for part in ("header", "footer"):
        pass
    def fix(s):
        s = s.replace('src="../assets/', 'src="/assets/').replace('src="assets/', 'src="/assets/')
        s = s.replace("aria-current='page' ", "")
        return s
    header, footer = fix(header), fix(footer)
    # language switch target is set per page later
    return header, footer


def head(lang, title, desc, url, alt_url, og_type="website", extra=""):
    c = L[lang]
    t, d = html.escape(title), html.escape(desc)
    he_url, en_url = (url, alt_url) if lang == "he" else (alt_url, url)
    return f"""<!doctype html>
<html lang="{c['lang']}" dir="{c['dir']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="he" href="{he_url}">
<link rel="alternate" hreflang="en" href="{en_url}">
<link rel="alternate" hreflang="x-default" href="{he_url}">
<link rel="alternate" type="application/rss+xml" title="{html.escape(c['index_h1'])}" href="{SITE}{c['base']}feed.xml">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="64x64" href="/assets/images/favicon-64.png">
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
<meta name="theme-color" content="#070A11">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="{c['locale']}">
<meta property="og:locale:alternate" content="{c['alt_locale']}">
<meta property="og:site_name" content="{html.escape(c['by'])}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:image" content="{SITE}/assets/images/og-image-v2.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{t}">
<meta name="twitter:description" content="{d}">
<meta name="twitter:image" content="{SITE}/assets/images/og-image-v2.jpg">
{extra}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;600;700&family=Frank+Ruhl+Libre:wght@300;400;500;700&display=swap">
<link rel="stylesheet" href="/assets/css/site.css">
<style>
.post-body{{max-width:var(--measure)}}
.post-body p{{margin:0 0 1.1rem;line-height:1.85}}
.post-body h2{{margin:2.4rem 0 .9rem;font-size:clamp(1.35rem,2.2vw,1.7rem)}}
.post-meta{{color:var(--slate);font-size:var(--s--1)}}
.post-source{{margin-top:2.2rem;padding-top:1rem;border-top:1px solid var(--line-soft);color:var(--slate);font-size:var(--s--1)}}
.post-source a{{color:var(--gold)}}
.post-cta{{margin-top:2.6rem}}
</style>
</head>
<body>
"""


def set_lang_switch(header, lang, alt_path):
    # point both language links (quick + menu) to the matching page in the other language
    return re.sub(r"(class='lang-(?:quick|switch)' href=')[^']*(')",
                  lambda m: m.group(1) + alt_path + m.group(2), header)


def render_body(blocks):
    out = []
    for kind, val in blocks:
        if kind == "p":
            out.append(f"<p>{html.escape(val)}</p>")
        elif kind == "h2":
            out.append(f"<h2>{html.escape(val)}</h2>")
        elif kind == "lines":
            out.append("<p>" + "<br>\n".join(html.escape(x) for x in val) + "</p>")
    return "\n".join(out)


def fmt_date(d, lang):
    return datetime.strptime(d, "%Y-%m-%d").strftime(L[lang]["month"])


def cta_cards(lang):
    c = L[lang]
    contact = "/contact" if lang == "he" else "/en/contact"
    lecture = "/lecture" if lang == "he" else "/en/lecture"
    return f"""<div class="grid-2 post-cta">
  <article class="card">
    <h3>{c['app_t']}</h3>
    <p>{c['app_p']}</p>
    <a class="link" href="{APP}" target="_blank" rel="noopener">{c['app_b']} ↗</a>
    <a class="link" href="{lecture}">{c['lec_b']}</a>
  </article>
  <article class="card">
    <h3>{c['nl_t']}</h3>
    <p>{c['nl_p']}</p>
    <a class="link" href="{NEWSLETTER}&utm_campaign={lang}" target="_blank" rel="noopener">{c['nl_b']} ↗</a>
  </article>
</div>"""


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def build():
    arts = sorted(ARTICLES, key=lambda a: (a["date"], a["issue"]), reverse=True)
    for lang in ("he", "en"):
        c = L[lang]
        other = "en" if lang == "he" else "he"
        header, footer = shell(lang)
        # article pages
        for a in arts:
            t = a[lang]
            url = f"{SITE}{c['base']}{a['slug']}"
            alt = f"{SITE}{L[other]['base']}{a['slug']}"
            ld = {
                "@context": "https://schema.org",
                "@graph": [
                    {"@type": "BlogPosting", "headline": t["title"], "description": t["description"],
                     "inLanguage": lang, "datePublished": a["date"], "dateModified": a["date"],
                     "mainEntityOfPage": url, "url": url, "keywords": t["keywords"],
                     "image": f"{SITE}/assets/images/og-image-v2.jpg",
                     "author": {"@type": "Person", "name": c["by"], "url": SITE + ("/about" if lang == "he" else "/en/about")},
                     "publisher": {"@type": "Person", "name": c["by"], "url": SITE}},
                    {"@type": "BreadcrumbList", "itemListElement": [
                        {"@type": "ListItem", "position": 1, "name": c["home"], "item": SITE + ("/" if lang == "he" else "/en/")},
                        {"@type": "ListItem", "position": 2, "name": c["blog"], "item": SITE + c["base"]},
                        {"@type": "ListItem", "position": 3, "name": t["title"], "item": url}]},
                ]}
            extra = (f'<meta property="article:published_time" content="{a["date"]}">\n'
                     f'<meta name="keywords" content="{html.escape(t["keywords"])}">\n'
                     f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n')
            h = set_lang_switch(header, lang, L[other]["base"] + a["slug"])
            others = [x for x in arts if x["slug"] != a["slug"]][:3]
            more = "\n".join(f'<li><a class="link" href="{c["base"]}{x["slug"]}">{html.escape(x[lang]["title"])}</a></li>' for x in others)
            page = head(lang, f"{t['title']} | {c['by']}", t["description"], url, alt, "article", extra) + h + f"""

<main>
<section class="page-hero">
  <div class="shell stack">
    <nav class="crumbs" aria-label="breadcrumb"><a href="{'/' if lang == 'he' else '/en/'}">{c['home']}</a><span aria-hidden="true">·</span><a href="{c['base']}">{c['blog']}</a></nav>
    <p class="eyebrow">{c['eyebrow']}</p>
    <h1 class="prose">{html.escape(t['title'])}</h1>
    <p class="post-meta">{c['by']} · <time datetime="{a['date']}">{fmt_date(a['date'], lang)}</time> · <a class="link" href="{L[other]['base']}{a['slug']}" hreflang="{other}">{c['other']}</a></p>
  </div>
</section>
<section>
  <article class="shell stack">
    <div class="post-body">
{render_body(t['body'])}
      <p class="post-source">{c['source']}: {a['source']}</p>
    </div>
    {cta_cards(lang)}
    <div class="stack" style="margin-top:2.4rem">
      <p class="eyebrow">{c['more']}</p>
      <ul class="stack" style="list-style:none;padding:0">{more}</ul>
    </div>
  </article>
</section>
</main>

""" + footer + "</body>\n</html>\n"
            write(ROOT / c["base"].strip("/") / f"{a['slug']}.html", page)

        # index page
        url = SITE + c["base"]
        alt = SITE + L[other]["base"]
        cards = "\n".join(f"""  <article class="card">
    <p class="post-meta"><time datetime="{a['date']}">{fmt_date(a['date'], lang)}</time></p>
    <h2 style="font-size:1.25rem">{html.escape(a[lang]['title'])}</h2>
    <p>{html.escape(a[lang]['description'])}</p>
    <a class="link" href="{c['base']}{a['slug']}">{c['read']}</a>
  </article>""" for a in arts)
        ld = {"@context": "https://schema.org", "@type": "Blog", "name": c["index_h1"], "url": url, "inLanguage": lang,
              "author": {"@type": "Person", "name": c["by"]},
              "blogPost": [{"@type": "BlogPosting", "headline": a[lang]["title"], "url": f"{url}{a['slug']}", "datePublished": a["date"]} for a in arts]}
        extra = f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>\n'
        h = set_lang_switch(header, lang, L[other]["base"])
        h = h.replace(f"href='{c['base']}'>", f"aria-current='page' href='{c['base']}'>", 1)
        page = head(lang, c["index_title"], c["index_desc"], url, alt, "website", extra) + h + f"""

<main>
<section class="page-hero">
  <div class="shell stack">
    <p class="eyebrow">{c['eyebrow']}</p>
    <h1>{c['index_h1']}</h1>
    <p class="kicker">{c['index_kicker']}</p>
    <hr class="hero-rule">
  </div>
</section>
<section>
  <div class="shell stack">
<div class="grid-2" style="width:100%">
{cards}
</div>
    {cta_cards(lang)}
  </div>
</section>
</main>

""" + footer + "</body>\n</html>\n"
        write(ROOT / c["base"].strip("/") / "index.html", page)

        # RSS
        items = "\n".join(f"""<item><title>{html.escape(a[lang]['title'])}</title><link>{url}{a['slug']}</link><guid>{url}{a['slug']}</guid><pubDate>{datetime.strptime(a['date'], '%Y-%m-%d').strftime('%a, %d %b %Y 08:00:00 +0200')}</pubDate><description>{html.escape(a[lang]['description'])}</description></item>""" for a in arts)
        rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>{html.escape(c['index_h1'])}</title><link>{url}</link><description>{html.escape(c['index_desc'])}</description><language>{lang}</language>
{items}
</channel></rss>
"""
        write(ROOT / c["base"].strip("/") / "feed.xml", rss)

    # sitemap
    sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    sm = re.sub(r"\s*<url><loc>[^<]*/blog/[^<]*</loc>.*?</url>", "", sm)
    entries = []
    for lang in ("he", "en"):
        other = "en" if lang == "he" else "he"
        entries.append(f'  <url><loc>{SITE}{L[lang]["base"]}</loc><priority>0.8</priority></url>')
        for a in arts:
            entries.append(f'  <url><loc>{SITE}{L[lang]["base"]}{a["slug"]}</loc><lastmod>{a["date"]}</lastmod><priority>0.7</priority></url>')
    sm = sm.replace("</urlset>", "\n".join(entries) + "\n</urlset>")
    (ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")
    print(f"built {len(arts)} articles x 2 languages")


if __name__ == "__main__":
    build()
