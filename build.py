#!/usr/bin/env python3
"""Build the static site for Dr. Radhika's Allergy & Lung Clinic.

Reads src/layout.html + src/pages/*.html and writes a deployable tree to
dist/. Every page gets a real URL of its own, its own <title>, description,
canonical and structured data.

    python3 build.py            # -> dist/
    python3 build.py --serve    # build, then serve dist/ on :8000
"""

import hashlib
import json
import os
import re
import shutil
import sys
from datetime import date

SITE = "https://www.allergylungclinic.com"
CLINIC = "Dr. Radhika's Allergy & Lung Clinic"
PHONE = "+91-97018-64848"
BUILT = date.today().isoformat()

SRC, PAGES, DIST = "src", "src/pages", "dist"

ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "2nd Floor, Youniq, Above Labonel Fine Baking, 1335/A, Road No. 45, Jubilee Hills",
    "addressLocality": "Hyderabad",
    "addressRegion": "Telangana",
    "postalCode": "500033",
    "addressCountry": "IN",
}

PHYSICIAN = {
    "@type": "Physician",
    "name": "Dr. Radhika Sharma",
    "medicalSpecialty": ["Allergy", "Pulmonary"],
    "alumniOf": "Christian Medical College, Vellore",
    "hasCredential": [
        "MD, Respiratory Medicine",
        "Diploma in Allergy & Asthma (D.A.A), CMC Vellore",
        "Fellowship in Interventional Pulmonology",
    ],
    "image": SITE + "/assets/portrait.webp",
}

CLINIC_SCHEMA = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "name": CLINIC,
    "url": SITE + "/",
    "telephone": PHONE,
    "image": SITE + "/assets/og.png",
    "medicalSpecialty": ["Allergy", "Pulmonary"],
    "address": ADDRESS,
    "hasMap": "https://maps.google.com/?q=Youniq,+Road+No.+45,+Jubilee+Hills,+Hyderabad+500033",
    # Decoded from the clinic's Google Business Profile Plus Code 7J9WCCG5+6C
    # (short form CCG5+6C). Verified by re-encoding: the point round-trips to the
    # same code, in a 14m cell on Road No. 45.
    "geo": {"@type": "GeoCoordinates", "latitude": 17.425562, "longitude": 78.408563},
    "openingHoursSpecification": [{
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "11:00",
        "closes": "18:00",
    }],
    "availableService": [
        {"@type": "MedicalTest", "name": "Skin prick allergy testing"},
        {"@type": "MedicalTest", "name": "Specific IgE blood testing"},
        {"@type": "MedicalTest", "name": "Spirometry with bronchodilator reversibility"},
        {"@type": "MedicalTherapy", "name": "Allergen immunotherapy"},
        {"@type": "MedicalTherapy", "name": "Smoking cessation programme"},
    ],
    "employee": PHYSICIAN,
}

# slug -> (url path, source fragment, <title>, meta description, nav section)
P = [
    ("/", "home",
     CLINIC,
     "Consultant-led allergy testing, immunotherapy, asthma and lung care in Jubilee Hills, "
     "Hyderabad. Proper testing first, then treatment aimed at the cause.",
     "/"),

    ("/allergy-testing/", "allergy-testing",
     "Allergy Testing · " + CLINIC,
     "Skin prick testing and specific IgE blood tests in Jubilee Hills, Hyderabad — read against "
     "your history and explained in the same visit by Dr. Radhika Sharma.",
     "/allergy-testing/"),

    ("/lung-tests/", "lung-tests",
     "Breathing & Lung Tests · " + CLINIC,
     "Spirometry with reversibility, FeNO and lung function testing in Jubilee Hills, Hyderabad. "
     "What each breathing test measures, and what the numbers actually mean.",
     "/lung-tests/"),

    ("/immunotherapy/", "immunotherapy",
     "Immunotherapy · " + CLINIC,
     "Allergen immunotherapy in Hyderabad: the only treatment that changes the allergy rather than "
     "masking it. Who it suits, what it involves, and when the answer is no.",
     "/immunotherapy/"),

    ("/asthma-lung/", "asthma-lung",
     "Asthma & Lung Disorders · " + CLINIC,
     "Asthma, COPD, bronchiectasis and post-infective airway disease measured rather than guessed "
     "at — consultant respiratory care in Jubilee Hills, Hyderabad.",
     "/asthma-lung/"),

    ("/smoking-cessation/", "smoking-cessation",
     "Smoking Cessation · " + CLINIC,
     "A smoking cessation programme in Jubilee Hills, Hyderabad. Come and talk about tobacco "
     "whether or not you have decided to stop — medication and support, no lecture.",
     "/"),

    ("/first-visit/", "first-visit",
     "Your First Visit · " + CLINIC,
     "What happens at your first appointment: allow about an hour, stop antihistamines five days "
     "before allergy testing, and bring earlier reports. Jubilee Hills, Hyderabad.",
     "/"),

    ("/knowledge/", "knowledge",
     "Knowledge & Updates · " + CLINIC,
     "Plain explanations of allergy, asthma and lung disease from Dr. Radhika Sharma, MD — written "
     "in clinic, with the Hyderabad detail that general websites leave out.",
     "/knowledge/"),

    ("/about/", "about",
     "About Dr. Radhika Sharma · Allergy & Lung Clinic",
     "Dr. Radhika Sharma, MD (Respiratory Medicine), Diploma in Allergy & Asthma from CMC Vellore. "
     "Consultant Pulmonologist and Allergy Specialist in Jubilee Hills, Hyderabad.",
     "/about/"),

    ("/sleep/", "sleep",
     "Sleep Apnoea & Snoring · " + CLINIC,
     "Snoring, daytime tiredness and sleep apnoea assessed in Jubilee Hills, Hyderabad. "
     "How sleep-disordered breathing is diagnosed, and what CPAP and the alternatives involve.",
     "/sleep/"),

    ("/allergy-check/", "allergy-check",
     "Is It Allergy? A Two-Minute Check · " + CLINIC,
     "Seven questions about the pattern of your symptoms, to tell you whether allergy testing "
     "is likely to be worth your time. Not a diagnosis \u2014 a sorting tool.",
     "/allergy-testing/"),

    ("/book/", "book",
     "Book an Appointment · " + CLINIC,
     "Book an appointment at Dr. Radhika's Allergy & Lung Clinic, Jubilee Hills, Hyderabad. "
     "Fill in the form and it opens WhatsApp with your details ready to send.",
     "/"),

    ("/privacy/", "privacy",
     "Privacy Notice · " + CLINIC,
     "What this website does with your information: no accounts, no tracking, no database. "
     "The booking form sends nothing to us \u2014 you send it yourself from your own WhatsApp.",
     "/"),

    ("/terms/", "terms",
     "Terms & Medical Disclaimer · " + CLINIC,
     "General information, not medical advice. Reading this site does not create a "
     "doctor-patient relationship. Emergency guidance and practitioner registration details.",
     "/"),

    ("/contact/", "contact",
     "Contact & Directions · " + CLINIC,
     "Dr. Radhika's Allergy & Lung Clinic, 2nd Floor Youniq, Road No. 45, Jubilee Hills, Hyderabad "
     "500033. Mon–Sat, 11 am – 6 pm. Book on WhatsApp: +91 97018 64848.",
     "/contact/"),
]

# url path, fragment, title, description, ISO date  (all under /knowledge/)
ARTICLES = [
    ("/knowledge/dust-allergy/", "knowledge-dust-allergy",
     "Is it dust allergy, or something else? · Knowledge",
     "“Dust allergy” is a folk category, not a diagnosis — at least five different things hide "
     "behind it, and the treatments diverge completely. How to tell them apart.",
     "2026-09-08"),

    ("/knowledge/igg-tests/", "knowledge-igg-tests",
     "The food intolerance blood test you paid for doesn't work · Knowledge",
     "IgG food intolerance panels sold in India are not validated tests. What the antibody actually "
     "means, why the result looks convincing, and what to do instead.",
     "2026-09-02"),

    ("/knowledge/homeopathy/", "knowledge-homeopathy",
     "Homeopathy, Ayurveda and allergy: an honest answer · Knowledge",
     "An honest answer on homeopathy and Ayurveda for allergy, from a doctor asked it every week — "
     "what the evidence shows, and where the real harm comes from.",
     "2026-08-24"),

    ("/knowledge/post-tb/", "knowledge-post-tb",
     "You finished TB treatment. Why are you still breathless? · Knowledge",
     "Breathless after completing TB treatment? Post-TB lung disease is common, under-recognised "
     "and treatable. Why curing the infection is not always the end of it.",
     "2026-08-12"),

    ("/knowledge/child-nebuliser/", "knowledge-child-nebuliser",
     "Should my child be on a preventer inhaler? · Knowledge",
     "Your child has been nebulised three times this year. When a preventer inhaler is the right "
     "answer, why inhaled steroids worry parents, and what the risks actually are.",
     "2026-07-30"),

    ("/knowledge/parthenium/", "knowledge-parthenium",
     "Congress grass (Parthenium): rash as well as sneezing · Knowledge",
     "Congress grass (Parthenium) causes an itchy rash as well as sneezing, and the contact "
     "dermatitis is often missed. Season, pattern and treatment in Hyderabad.",
     "2026-07-18"),

    ("/knowledge/monsoon-asthma/", "knowledge-monsoon-asthma",
     "Monsoon asthma in Hyderabad · Knowledge",
     "Why June to September is the hardest season for Hyderabad lungs — mould, dust mite, "
     "thunderstorm asthma and viral surges, and how to get ahead of it.",
     "2026-06-26"),
]


def fingerprint_assets():
    """Copy assets to dist, giving site.css and site.js content-hashed names.

    Without this the filenames never change, so the long immutable cache
    header served for /assets/* pins every returning visitor to whichever
    stylesheet they downloaded first -- new HTML, year-old CSS.
    """
    src_dir = os.path.join(SRC, "assets")
    out_dir = os.path.join(DIST, "assets")
    shutil.copytree(src_dir, out_dir)

    renamed = {}
    for name in ("site.css", "site.js"):
        path = os.path.join(out_dir, name)
        digest = hashlib.sha256(open(path, "rb").read()).hexdigest()[:10]
        stem, ext = os.path.splitext(name)
        hashed = "%s.%s%s" % (stem, digest, ext)
        os.rename(path, os.path.join(out_dir, hashed))
        renamed["/assets/" + name] = "/assets/" + hashed
    return renamed


def esc(s):
    """Escape for an HTML attribute value."""
    return (s.replace("&", "&amp;").replace("<", "&lt;")
             .replace(">", "&gt;").replace('"', "&quot;"))


def schema_for(path, title, desc, art_date=None):
    if path in ("/", "/contact/"):
        return CLINIC_SCHEMA
    if path == "/about/":
        doc = dict(PHYSICIAN)
        doc.update({"@context": "https://schema.org", "url": SITE + path,
                    "address": ADDRESS, "telephone": PHONE, "worksFor": {
                        "@type": "MedicalClinic", "name": CLINIC, "url": SITE + "/"}})
        return doc
    if art_date:
        return {
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "headline": title.split(" · ")[0],
            "description": desc,
            "url": SITE + path,
            "datePublished": art_date,
            "dateModified": art_date,
            "inLanguage": "en",
            "author": PHYSICIAN,
            "publisher": {"@type": "MedicalClinic", "name": CLINIC, "url": SITE + "/"},
            "breadcrumb": {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "Knowledge",
                     "item": SITE + "/knowledge/"},
                    {"@type": "ListItem", "position": 3, "name": title.split(" · ")[0]},
                ],
            },
        }
    return {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "name": title.split(" · ")[0],
        "description": desc,
        "url": SITE + path,
        "inLanguage": "en",
        "about": {"@type": "MedicalClinic", "name": CLINIC, "url": SITE + "/"},
    }


def mark_nav(html, section):
    """Give the current section's nav link its underline, and aria-current."""
    def sub(m):
        href = m.group(1)
        if href != section:
            return m.group(0)
        return '<a href="%s" class="on" aria-current="page">' % href
    return re.sub(r'<a href="(/[\w/-]*)">', sub, html)


def render(layout, path, frag, title, desc, section, art_date=None):
    body = open(os.path.join(PAGES, frag + ".html"), encoding="utf-8").read()
    canonical = SITE + path
    html = layout
    for key, val in [
        ("{{TITLE}}", esc(title)),
        ("{{OG_TITLE}}", esc(title.split(" · ")[0] if path != "/" else title)),
        ("{{DESCRIPTION}}", esc(desc)),
        ("{{CANONICAL}}", canonical),
        ("{{BASE}}", SITE),
        ("{{OG_TYPE}}", "article" if art_date else "website"),
        ("{{SCHEMA}}", json.dumps(schema_for(path, title, desc, art_date),
                                  ensure_ascii=False, separators=(",", ":"))),
    ]:
        html = html.replace(key, val)
    html = html.replace("{{BODY}}", body)      # last: body may contain braces
    html = mark_nav(html, section)

    out = os.path.join(DIST, path.strip("/"), "index.html") if path != "/" \
        else os.path.join(DIST, "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    return out, len(html)


def render_404(layout):
    body = open(os.path.join(PAGES, "404.html"), encoding="utf-8").read()
    html = layout
    for key, val in [
        ("{{TITLE}}", esc("Page not found · " + CLINIC)),
        ("{{OG_TITLE}}", esc("Page not found")),
        ("{{DESCRIPTION}}", esc("That page isn't here. Everything on the site is one click away.")),
        ("{{CANONICAL}}", SITE + "/404.html"),
        ("{{BASE}}", SITE),
        ("{{OG_TYPE}}", "website"),
        ("{{SCHEMA}}", json.dumps({"@context": "https://schema.org", "@type": "WebPage",
                                   "name": "Page not found"}, separators=(",", ":"))),
    ]:
        html = html.replace(key, val)
    html = html.replace("{{BODY}}", body)
    # a 404 must not be indexed whatever URL served it
    html = html.replace("<title>", '<meta name="robots" content="noindex">\n<title>', 1)
    open(os.path.join(DIST, "404.html"), "w", encoding="utf-8").write(html)


def write_extras(paths):
    urls = "".join(
        '  <url><loc>%s%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq>'
        '<priority>%s</priority></url>\n'
        % (SITE, p, BUILT, "monthly" if p != "/" else "weekly", "1.0" if p == "/" else "0.8")
        for p in paths)
    open(os.path.join(DIST, "sitemap.xml"), "w", encoding="utf-8").write(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls)

    open(os.path.join(DIST, "robots.txt"), "w", encoding="utf-8").write(
        "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n" % SITE)

    open(os.path.join(DIST, "site.webmanifest"), "w", encoding="utf-8").write(json.dumps({
        "name": CLINIC,
        "short_name": "Allergy & Lung Clinic",
        "start_url": "/",
        "display": "browser",
        "background_color": "#FDFBF7",
        "theme_color": "#FDFBF7",
        "icons": [
            {"src": "/assets/icon-180.png", "sizes": "180x180", "type": "image/png"},
            {"src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png"},
        ],
    }, indent=2) + "\n")


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    layout = open(os.path.join(SRC, "layout.html"), encoding="utf-8").read()
    for plain, hashed in fingerprint_assets().items():
        layout = layout.replace(plain, hashed)

    written = []
    for path, frag, title, desc, section in P:
        out, n = render(layout, path, frag, title, desc, section)
        written.append(path)
        print("  %-34s %6d  %s" % (path, n, out))
    for path, frag, title, desc, art_date in ARTICLES:
        out, n = render(layout, path, frag, title, desc, "/knowledge/", art_date)
        written.append(path)
        print("  %-34s %6d  %s" % (path, n, out))

    write_extras(written)

    # 404 gets the full shell, so a stray URL still shows the nav and the phone number
    render_404(layout)

    print("\n%d pages -> %s/" % (len(written), DIST))

    if "--serve" in sys.argv:
        import functools
        import http.server
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
        print("serving %s/ on http://localhost:8000 — Ctrl-C to stop" % DIST)
        try:
            http.server.HTTPServer(("", 8000), handler).serve_forever()
        except KeyboardInterrupt:
            print()


if __name__ == "__main__":
    main()
