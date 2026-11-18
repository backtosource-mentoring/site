#!/usr/bin/env python3
"""Build the on-domain newsletter signup pages: /newsletter (HE) and /en/newsletter (EN).
Embeds the MailerLite form "BOL EN - Weekly Note" (slug FFy25J, group BOL EN, double opt-in).
Run from the repo root: python3 tools/build_newsletter.py
"""
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from build_blog import head, shell, set_lang_switch, write, SITE  # noqa: E402

EMBED = """<script>
(function(w,d,e,u,f,l,n){w[f]=w[f]||function(){(w[f].q=w[f].q||[]).push(arguments);},l=d.createElement(e),l.async=1,l.src=u,n=d.getElementsByTagName(e)[0],n.parentNode.insertBefore(l,n);})(window,document,'script','https://assets.mailerlite.com/js/universal.js','ml');
ml('account', '2599906');
</script>"""

T = {
    "he": {"path": "newsletter.html", "url": f"{SITE}/newsletter", "alt": f"{SITE}/en/newsletter", "alt_path": "/en/newsletter",
           "title": "המכתב השבועי | ביולוגיה של מנהיגות - קבלת החלטות תחת לחץ",
           "desc": "מכתב שבועי קצר על קבלת החלטות תחת לחץ: מה המחקר מראה, ומה זה אומר ביום עבודה אמיתי. למנהלות, מנהלים ובעלי תפקידי מפתח. מאת אסתר מיכל קציר.",
           "home": "/", "home_t": "דף הבית", "eyebrow": "המכתב השבועי", "h1": "מכתב אחד בשבוע. על הרגע שבו הלחץ מתחיל להחליט במקומנו.",
           "body": ["כל שבוע: מחקר אחד על קבלת החלטות תחת לחץ, מה הוא מראה באמת, ומה עושים איתו מחר בבוקר.",
                    "קצר. בלי מוטיבציה ובלי תיאוריות רכות. אפשר להסיר בלחיצה.",
                    "המכתב נכתב כרגע באנגלית. המאמרים בעברית מחכים בבלוג."],
           "blog": "/blog/", "blog_t": "לבלוג בעברית"},
    "en": {"path": "en/newsletter.html", "url": f"{SITE}/en/newsletter", "alt": f"{SITE}/newsletter", "alt_path": "/newsletter",
           "title": "The Weekly Note | Biology of Leadership - Decisions Under Pressure",
           "desc": "A short weekly note on decision-making under pressure: what the research shows, and what it means on a real workday. For executives and key roles. By Esther Michele Kazir.",
           "home": "/en/", "home_t": "Home", "eyebrow": "The Weekly Note", "h1": "One note a week. On the moment pressure starts making the decision for you.",
           "body": ["Each week: one study on decisions under pressure, what it actually shows, and what to do with it tomorrow morning.",
                    "Short. No motivation, no soft theory. Unsubscribe in one click.",
                    "Not calm. Clear."],
           "blog": "/en/blog/", "blog_t": "Read past notes on the blog"},
}

for lang, t in T.items():
    header, footer = shell(lang)
    header = set_lang_switch(header, lang, t["alt_path"])
    body = "\n".join(f'<p class="muted">{p}</p>' for p in t["body"])
    page = head(lang, t["title"], t["desc"], t["url"], t["alt"], extra=EMBED + "\n") + header + f"""

<main>
<section class="page-hero">
  <div class="shell stack">
    <nav class="crumbs" aria-label="breadcrumb"><a href="{t['home']}">{t['home_t']}</a></nav>
    <p class="eyebrow">{t['eyebrow']}</p>
    <h1 class="prose">{t['h1']}</h1>
    <div class="prose">{body}</div>
  </div>
</section>
<section>
  <div class="shell stack">
    <div class="ml-embedded" data-form="FFy25J" dir="ltr"></div>
    <p><a class="link" href="{t['blog']}">{t['blog_t']}</a></p>
  </div>
</section>
</main>
""" + footer + "</body>\n</html>\n"
    write(ROOT / t["path"], page)

sm = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
sm = re.sub(r"\s*<url><loc>[^<]*/newsletter</loc>.*?</url>", "", sm)
sm = sm.replace("</urlset>", f'  <url><loc>{SITE}/newsletter</loc><priority>0.7</priority></url>\n  <url><loc>{SITE}/en/newsletter</loc><priority>0.7</priority></url>\n</urlset>')
(ROOT / "sitemap.xml").write_text(sm, encoding="utf-8")
print("built newsletter pages")
