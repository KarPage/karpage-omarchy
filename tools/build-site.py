#!/usr/bin/env python3
"""Build the static pages of apps.karpage.com from site/apps.json.

Writes site/index.html, one site/<slug>.html per app and site/sitemap.xml.
No dependencies beyond Python 3. Run from the repo root: python3 tools/build-site.py
"""
import re
import json
import pathlib
from html import escape

ROOT = pathlib.Path(__file__).resolve().parent.parent / "site"
BASE = "https://apps.karpage.com"
SUBTITLE = "open tools for people who drive computers"
CSP = ("default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; "
       "font-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-src https://karpage.app")

MARKS = {
    "kp": '<svg viewBox="0 0 512 512" fill="currentColor"><g transform="translate(0,512) scale(0.1,-0.1)"><path d="M840 4159 c0 -637 3 -958 10 -954 5 3 10 12 10 19 0 28 153 315 210 394 l60 83 0 710 0 709 -145 0 -145 0 0 -961z M1420 4560 c0 -308 2 -560 5 -560 3 0 29 18 58 39 65 48 201 131 216 131 8 0 11 130 11 475 l0 475 -145 0 -145 0 0 -560z M2310 4264 c-623 -99 -1128 -505 -1354 -1091 -40 -103 -68 -209 -93 -348 -19 -109 -18 36 -14 -1977 l1 -848 140 0 139 0 4 1388 c3 1287 4 1392 21 1462 68 291 193 524 386 721 192 196 451 336 730 396 67 14 130 18 300 18 200 0 222 -2 320 -27 587 -149 991 -585 1091 -1178 7 -41 13 -140 13 -220 -1 -238 -44 -423 -149 -635 -311 -627 -1021 -934 -1697 -734 -57 17 -145 50 -197 75 -51 24 -98 44 -103 44 -7 0 -6 -273 1 -297 3 -10 116 -57 208 -87 186 -60 268 -71 518 -71 188 1 234 4 320 23 374 81 709 275 948 547 464 529 565 1261 262 1890 -198 411 -567 733 -1005 879 -183 61 -282 77 -500 81 -142 3 -221 0 -290 -11z M2366 3684 c-464 -84 -814 -426 -923 -904 -16 -68 -17 -170 -18 -1125 0 -577 1 -1186 3 -1352 l3 -303 133 0 133 0 7 37 c3 21 6 620 6 1331 0 1431 -3 1368 65 1525 18 43 48 103 67 134 78 131 269 293 344 293 32 0 34 -2 34 -34 0 -19 -7 -39 -17 -47 -9 -8 -24 -32 -34 -54 -17 -37 -19 -82 -19 -667 l0 -628 33 0 c43 1 105 30 143 68 55 54 65 91 71 244 l6 139 33 -3 c28 -3 70 -39 268 -231 l236 -229 0 -43 0 -43 -72 -26 c-187 -68 -376 -74 -553 -19 -82 25 -185 75 -185 89 0 8 -9 14 -21 14 -40 0 -143 91 -248 220 l-20 25 0 -205 -1 -205 42 -30 c134 -97 264 -157 426 -197 73 -19 115 -22 262 -22 159 0 184 3 275 28 202 55 409 177 543 321 467 499 396 1284 -151 1691 -244 182 -577 261 -871 208z m419 -294 c44 -12 119 -42 167 -67 85 -44 88 -46 88 -80 l0 -36 -67 7 c-125 12 -143 1 -338 -194 -150 -151 -174 -170 -202 -170 l-33 0 0 236 c0 227 -1 236 -20 241 -15 4 -20 14 -20 38 0 33 0 34 58 40 31 4 62 8 67 11 25 10 227 -7 300 -26z m429 -271 c94 -105 164 -253 191 -404 19 -111 19 -189 0 -301 -31 -176 -115 -333 -248 -461 -66 -64 -79 -73 -112 -73 l-38 0 8 53 c13 90 10 159 -10 197 -10 19 -105 123 -211 231 -175 176 -194 198 -194 229 0 37 -26 8 353 397 81 83 147 159 147 167 0 11 10 16 34 16 28 0 42 -9 80 -51z"/></g></svg>',
    "raptor": '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-linecap="square"><path d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6" stroke-width="1.6"/><path d="M16 8v5M16 19v5M8 16h5M19 16h5" stroke-width="1.4"/><rect x="14.6" y="14.6" width="2.8" height="2.8" fill="currentColor" stroke="none"/></svg>',
    "car": '<svg viewBox="0 0 32 32" fill="currentColor"><path d="M4.5 19.5c1-3.6 3-5.4 6-5.4h5.6l2.2-3.2h6.4c2 0 3.4 1.3 4 3l.8 2.4v3.2h-1.7a2.7 2.7 0 0 1-5.2 0h-9.6a2.7 2.7 0 0 1-5.2 0H4.5v-2.8z"/></svg>',
    "launch": '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"><rect x="5" y="7" width="22" height="18"/><path d="M5 12.2h22M12 20.2h8M17.2 17.4 20.2 20.2 17.2 23"/></svg>',
}


def mark_year():
    filled = {(1, 0), (2, 0), (0, 1), (1, 2), (3, 2)}
    rects = "".join(
        '<rect x="%.1f" y="%.1f" width="5" height="5.4"%s/>'
        % (4 + c * 6.4, 5.5 + r * 7.2, ' fill="currentColor"' if (c, r) in filled else "")
        for r in range(3) for c in range(4))
    return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1">%s</svg>' % rects


MARKS["year"] = mark_year()
e = lambda s: escape(str(s), quote=True)


# Glyph bounds (measured from the rendered SVGs) so a boxed mark can fill its square edge to edge.
TIGHT = {"kp": "84 0 344 512", "raptor": "3.2 3.2 25.6 25.6", "car": "4.5 10.85 25 10.65",
         "launch": "4.2 6.2 23.6 19.6", "year": "3.5 5 25.3 20.85"}


def mark(app, cls="mark"):
    svg = MARKS.get(app.get("mark"), "")
    if "big" in cls and app.get("mark") in TIGHT:
        svg = re.sub(r'viewBox="[^"]*"', 'viewBox="%s"' % TIGHT[app["mark"]], svg, count=1)
    return '<span class="%s" aria-hidden="true">%s</span>' % (cls, svg)


def picture(shot, eager=False):
    base = "img/" + shot["id"]
    x2 = shot.get("x2")
    src = []
    if shot.get("avif"):
        src.append('<source type="image/avif" srcset="%s">' % (base + ".avif" + (" 1x, %s-2x.avif 2x" % base if x2 else "")))
    src.append('<source type="image/webp" srcset="%s">' % (base + ".webp" + (" 1x, %s-2x.webp 2x" % base if x2 else "")))
    load = 'loading="eager" fetchpriority="high"' if eager else 'loading="lazy"'
    return '<picture>%s<img src="%s.png" alt="%s" width="%d" height="%d" decoding="async" %s></picture>' % (
        "".join(src), base, e(shot.get("alt") or ""), shot["w"], shot["h"], load)


def full_src(shot):
    return "img/%s%s" % (shot["id"], "-2x.webp" if shot.get("x2") else ".png")


def og_image(app):
    if not app["shots"]:
        return ""
    s = app["shots"][0]
    return "%s/%s" % (BASE, full_src(s))


def head(title, desc, keywords, path, image):
    card = "summary_large_image" if image else "summary"
    img = ('<meta property="og:image" content="%s">\n<meta name="twitter:image" content="%s">\n' % (e(image), e(image))) if image else ""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#000000">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="%s">
<title>%s</title>
<meta name="description" content="%s">
<meta name="keywords" content="%s">
<link rel="canonical" href="%s">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kar Page Apps">
<meta property="og:title" content="%s">
<meta property="og:description" content="%s">
<meta property="og:url" content="%s">
%s<meta name="twitter:card" content="%s">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preload" href="fonts/ShareTechMono-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
""" % (CSP, e(title), e(desc), e(keywords), e(BASE + path), e(title), e(desc), e(BASE + path), img, card)


def size(n):
    if n >= 1_000_000:
        return "%.1f MB" % (n / 1_000_000)
    return "%d KB" % round(n / 1000)


def install_detail(app):
    f = app.get("facts")
    if not f:
        return ""
    if "installBytes" in f:
        return "installs %d files · %s · %s clone" % (len(app.get("installFiles", [])), size(f["installBytes"]), size(f["downloadBytes"]))
    return "%s download · %s on disk · %d files · %s without screenshots" % (
        size(f["downloadBytes"]), size(f["repoBytes"]), f["files"], size(f["appBytes"]))


def source_detail(app):
    f = app.get("facts") or {}
    parts = [f.get("license"), f.get("release"), f.get("commit") and "%s · %s" % (f["commit"], f["commitDate"])]
    return " · ".join(x for x in parts if x)


def tile_detail(app):
    f = app.get("facts")
    if f:
        parts = [f.get("license"), f.get("release") or f.get("commit"),
                 size(f["installBytes"]) + " install" if "installBytes" in f else size(f["downloadBytes"]) + " download"]
        if app.get("listing"):
            parts = ["on plugins.omarchy.org", f.get("license"), parts[2]]
        return " · ".join(x for x in parts if x)
    if app.get("open"):
        return app["open"][1]
    return "no release yet · demo data"


def act(kind, main, detail, href=None, copy_id=None):
    det = '<small>%s</small>' % e(detail) if detail else ""
    if copy_id is not None:
        return ('<div class="act act-install"><span class="act-k">%s</span><pre><code id="%s">%s</code></pre>%s'
                '<button class="copy" type="button" data-copy="%s" aria-label="Copy install command">COPY</button></div>'
                % (e(kind), copy_id, e(main), det, copy_id))
    return ('<a class="act" href="%s" rel="noopener"><span class="act-k">%s <i aria-hidden="true">↗</i></span><span class="act-v">%s</span>%s</a>'
            % (e(href), e(kind), e(main), det))


def live(app):
    """Kar Page: the public karpage.app homepage, live in a phone-shaped frame sized to the viewport height.
    Plain markup, so it works without JS; the frame is one cursor stop (Enter moves focus into the app)."""
    home = app["open"][1].rstrip("/") + "/"
    name = e(app["name"])
    return (
        '<div class="live">'
        '<div class="live-phone" data-kf tabindex="0" aria-label="%s, live. Press Enter to use it.">'
        '<iframe class="live-frame" src="%s" title="%s, live app" loading="eager" '
        'sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" '
        'referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe>'
        '</div>'
        '<a class="live-open" href="%s" target="_blank" rel="noopener">OPEN FULL APP <i aria-hidden="true">↗</i></a>'
        '</div>' % (name, e(home), name, e(home)))


def actions(app):
    out = []
    if app.get("install"):
        out.append(act("INSTALL", app["install"][0][1], install_detail(app), copy_id="act-install"))
    if app.get("open") and not app.get("embed"):
        out.append(act("OPEN", app["open"][1], "web app · runs in the browser", href=app["open"][1]))
    for label, href in app["links"]:
        if label == "SOURCE":
            out.append(act("SOURCE", href.replace("https://", ""), source_detail(app), href=href))
        else:
            detail = "Omarchy plugin marketplace · listed 2026-10-28 · io.github.karpage.oma-year" if label == "MARKETPLACE" else ""
            out.append(act(label, href, detail, href=href))
    if app.get("review"):
        out.append(act("MARKETPLACE REVIEW", app["review"].replace("https://", ""), "submitted to the Omarchy plugin marketplace · open · in review", href=app["review"]))
    if not out:
        return ""
    note = ""
    f = app.get("facts")
    if f:
        note = '<p class="act-note">Sizes measured %s from a depth-1 clone of github.com/%s.</p>' % (e(f["measured"]), e(app["repo"]))
    cls = "acts acts-3" if len(out) == 3 and media_top(app) else "acts"
    return '<div class="%s">%s</div>%s' % (cls, "".join(out), note)


def status_badge(app):
    return '<span class="badge s-%s">%s</span>' % (e(app["status"].replace(" ", "-")), e(app["status"].upper()))


def placeholder(app, small=False):
    cmd = "" if small else '<code>$ chromium --app=https://karpage.app</code>'
    return ('<div class="placeholder" role="img" aria-label="No screenshot yet for %s">%s<b>%s</b>%s<small>SCREENSHOT COMING SOON</small></div>'
            % (e(app["name"]), mark(app, "ph-mark"), e(app["name"].upper()), cmd))


FOOT = """<footer class="foot">
<p class="foot-brand">KARPAGE · BUILT FOR OMARCHY</p>
<p>Open-source apps are MIT licensed and link to their source. Kar Page itself is a private codebase.</p>
<p>Unofficial. Not affiliated with Omarchy, Tesla, SpaceX or NASA. Screenshots use demo data or open-licensed footage.</p>
</footer>
<script src="site.js"></script>
</body>
</html>
"""


FILTERS = [
    ("all", "apps", lambda a: True),
    ("open", "open source · MIT", lambda a: bool(a.get("license") and a.get("repo"))),
    ("marketplace", "on omarchy marketplace", lambda a: a["status"] == "marketplace"),
    ("review", "marketplace review", lambda a: a["status"] == "in review"),
    ("soon", "coming soon", lambda a: a["status"] == "coming soon"),
]


def tags(app):
    return " ".join(k for k, _, f in FILTERS if f(app))


def row_line(key, app):
    f = app.get("facts") or {}
    if key == "marketplace" and app.get("listing"):
        return app["listing"].replace("https://", ""), app["listing"]
    if key == "review" and app.get("review"):
        return "submission #%s · open · review pending" % app["review"].rsplit("/", 1)[1], app["review"]
    if app.get("repo"):
        parts = [f.get("license"), "github.com/" + app["repo"], f.get("release") or f.get("commit")]
        return " · ".join(x for x in parts if x), "https://github.com/" + app["repo"]
    if app.get("open"):
        return app["open"][1], app["open"][1]
    return "no release yet · demo data only", ""


def board(apps):
    boxes, panels = [], []
    for key, label, f in FILTERS:
        hits = [a for a in apps if f(a)]
        if not hits:
            continue
        n = "%d app%s" % (len(hits), "" if len(hits) == 1 else "s")
        if key != "all" and len(hits) <= 2:
            n += ": " + ", ".join(a["name"] for a in hits)
        boxes.append('<button class="stat" type="button" aria-pressed="false" aria-controls="panel" data-filter="%s" data-hint="&gt; %s — %s">'
                     '<span class="led" aria-hidden="true"></span><span class="stat-k">%s</span><span class="stat-v">%d</span></button>'
                     % (key, e("all apps" if key == "all" else label), e(n), e(label), len(hits)))
        rows = []
        for a in hits:
            line, href = row_line(key, a)
            ext = ('<a class="row-ext" href="%s" rel="noopener">%s ↗</a>' % (e(href), e(line))) if href else '<span class="row-ext">%s</span>' % e(line)
            rows.append('<li><a class="row-app" href="/%s">%s<span>%s</span></a>%s%s</li>'
                        % (e(a["slug"]), mark(a), e(a["name"]), status_badge(a), ext))
        panels.append('<div class="panel-body" data-panel="%s" hidden><p class="panel-h">&gt; filter --%s <span>%d match%s</span></p><ul class="rows">%s</ul></div>'
                      % (key, key, len(hits), "" if len(hits) == 1 else "es", "".join(rows)))
    idle = '<div class="panel-body" data-panel="" ><p class="panel-h">&gt; select a box to filter <span>%d apps online</span></p></div>' % len(apps)
    return ('<div class="board" role="group" aria-label="Filter apps">%s</div>'
            '<div class="traces" aria-hidden="true"></div>'
            '<section class="panel" id="panel" aria-live="polite" aria-label="Selection"><div class="panel-top"><span>PREVIEW</span>'
            '<button class="reset" type="button" hidden>× ALL</button></div><p class="panel-h panel-hint" aria-hidden="true" hidden></p>%s%s</section>'
            % ("".join(boxes), idle, "".join(panels)))


def index(apps):
    tiles = []
    for i, a in enumerate(apps):
        if a["shots"]:
            s = a["shots"][0]
            media = '<div class="tile-shot%s">%s</div>' % (" phone" if a.get("frame") == "phone" else "", picture(s, i == 0))
        else:
            media = '<div class="tile-shot">%s</div>' % placeholder(a, small=True)
        tiles.append("""<li data-tags="%s"><a class="tile" href="/%s">
<div class="tile-bar"><span class="num">%02d</span>%s<span class="tile-path">~/%s</span>%s</div>
%s
<div class="tile-body"><h2>%s</h2><p>%s</p><code class="tile-meta">%s</code><span class="go" aria-hidden="true">OPEN →</span></div>
</a></li>""" % (tags(a), e(a["slug"]), i + 1, mark(a), e(a["slug"]), status_badge(a), media, e(a["name"]), e(a["short"]), e(tile_detail(a))))
    desc = "Kar Page Apps: %s. OmaRaptor Player, a free YouTube video player for Omarchy and Linux, plus Oma Year Planner, Kar Page, the Kar Page Launcher and OmaKarDash." % SUBTITLE.capitalize()
    kw = "Omarchy apps, YouTube player, video player, YouTube video player for Omarchy, YouTube video player for Linux, Hyprland, mpv, yt-dlp, OmaRaptor Player, Oma Year Planner, Kar Page"
    img = og_image(next(a for a in apps if a["slug"] == "omaraptor"))
    return head("Kar Page Apps", desc, kw, "/", img) + """<body class="home">
<a class="skip" href="#apps">Skip to apps</a>
<div class="wrap">
<header class="mast">
<p class="prompt">~/apps <span>$</span> ls</p>
<h1>Kar Page Apps<span class="cursor" aria-hidden="true"></span></h1>
<p class="lede">%s</p>
<p class="keys" aria-hidden="true"><span class="kg"><kbd data-key="ArrowLeft">←</kbd><kbd data-key="ArrowUp">↑</kbd><kbd data-key="ArrowDown">↓</kbd><kbd data-key="ArrowRight">→</kbd><em>move</em></span><span class="kg"><kbd class="w" data-key="Enter">↲ ENTER</kbd><em>select</em></span><span class="kg"><kbd class="w" data-key="Escape">ESC</kbd><em>back</em></span></p>
%s
</header>
<main id="apps" tabindex="-1">
<ul class="tiles" id="grid">
%s
</ul>
</main>
""" % (e(SUBTITLE), board(apps), "\n".join(tiles)) + FOOT


def code_tile(i, label, cmd, detail=""):
    return ('<div class="code"><b>%s</b><pre><code id="cmd-%d">%s</code></pre>%s'
            '<button class="copy" type="button" data-copy="cmd-%d" aria-label="Copy: %s">COPY</button></div>'
            % (e(label), i, e(cmd), '<small>%s</small>' % e(detail) if detail else "", i, e(label.lower())))


def media_top(app):
    """Apps whose real media leads the page: hero shot, optional reel, more shots, then the three cards."""
    return bool(app["shots"] and (app.get("reel") or app.get("mediaTop")))


def reel(app):
    """Hero screenshot on top (eager, sized), then the real-app screen recording if there is one (muted loop,
    poster is its own first frame so the box is never black), then the other real screenshots, lazy-loaded.
    No third-party code."""
    r, shots = app.get("reel"), app["shots"]
    hero = shots[0]
    top = ('<figure class="frame hero-shot hero-still"><a href="%s">%s</a><figcaption>%s</figcaption></figure>'
           % (e(full_src(hero)), picture(hero, True), e(hero.get("cap", ""))))
    if not r:
        return '%s<div class="shots">%s</div>' % (top, figs_html(shots[1:]))
    video = ('<video class="reel" width="%d" height="%d" poster="%s" muted loop playsinline preload="metadata" '
             'disablepictureinpicture aria-label="%s">%s</video>' % (
                 r["w"], r["h"], e(r.get("poster") or full_src(hero)), e(r["label"]),
                 "".join('<source src="%s" type="video/%s">' % (e(r[k]), k) for k in ("webm", "mp4") if r.get(k))))
    return ('%s<figure class="frame reel-frame">%s<figcaption class="reel-cap">%s</figcaption></figure>'
            '<div class="shots">%s</div>' % (top, video, e(r["cap"]), figs_html(shots[1:])))


def figs_html(shots):
    return "".join('<figure class="frame"><a href="%s">%s</a><figcaption>%s</figcaption></figure>'
                   % (e(full_src(s)), picture(s), e(s.get("cap", ""))) for s in shots)


def page(app, apps):
    sec = []
    n = 0

    def section(id_, title, body):
        nonlocal n
        n += 1
        sec.append('<section id="%s"><h2><span>%02d</span> %s</h2>%s</section>' % (id_, n, e(title), body))

    nav = []
    shots = app["shots"]
    if media_top(app):
        hero_media = reel(app)
    elif shots:
        s = shots[0]
        cls = "frame hero-shot phone" if app.get("frame") == "phone" else "frame hero-shot"
        hero_media = '<figure class="%s"><a href="%s">%s</a></figure>' % (cls, e(full_src(s)), picture(s, True))
    else:
        hero_media = '<figure class="frame hero-shot">%s</figure>' % placeholder(app)

    section("features", "FEATURES", '<div class="grid">%s</div>' % "".join(
        '<div class="feat"><b>%s</b><p>%s</p></div>' % (e(t), e(p)) for t, p in app["features"]))
    nav.append(("features", "FEATURES"))
    rest = [] if media_top(app) else shots[1:]
    if rest:
        figs = "".join('<figure class="frame"><a href="%s">%s</a><figcaption>%s</figcaption></figure>'
                       % (e(full_src(s)), picture(s), e(s.get("cap", ""))) for s in rest)
        section("gallery", "GALLERY", '<div class="gallery">%s</div>' % figs)
        nav.append(("gallery", "GALLERY"))
    if app.get("chips"):
        c = app["chips"]
        section("sites", c["title"], '<ul class="chips">%s</ul><p class="note">%s</p>'
                % ("".join("<li>%s</li>" % e(x) for x in c["items"]), e(c["note"])))
    if app.get("install"):
        body = "".join(code_tile(i, l, c, install_detail(app) if i == 0 else "") for i, (l, c) in enumerate(app["install"]))
        if app.get("installNote"):
            body += '<p class="note">%s</p>' % e(app["installNote"])
        section("install", "INSTALL", body)
        nav.append(("install", "INSTALL"))
    elif app.get("soon"):
        section("status", "STATUS", '<div class="feat soon"><b>COMING SOON</b><p>%s</p></div>' % e(app["soon"]))
        nav.append(("status", "STATUS"))
    if app.get("related"):
        r = app["related"]
        section("omarchy", r[0], '<a class="feat link" href="/%s"><b>KAR PAGE LAUNCHER →</b><p>%s</p></a>' % (e(r[2]), e(r[1])))
    if app.get("fine"):
        section("credits", "CREDITS · NOTES", '<div class="fine">%s</div>' % "".join("<p>%s</p>" % e(f) for f in app["fine"]))
        nav.append(("credits", "CREDITS"))

    others = "".join('<li><a href="/%s">%s<span>%s</span></a></li>' % (e(a["slug"]), mark(a), e(a["name"]))
                     for a in apps if a is not app)
    seo = app["seo"]
    if app.get("embed"):
        hero = ('<section class="hero hero-live">\n<div class="title-row">%s<h1>%s</h1>%s</div>\n<p class="live-sub">%s</p>\n<p class="live-desc">%s</p>\n%s\n</section>'
                % (mark(app, "mark big"), e(app["name"]), status_badge(app), e(app["tagline"]), e(app["embedLine"]), live(app)))
    else:
        hero = """<section class="hero">
<p class="tag">%s</p>
<div class="title-row">%s<h1>%s</h1>%s</div>
<p class="tagline">%s</p>
<p class="lede">%s</p>
<p class="keys" aria-hidden="true"><span class="kg"><kbd data-key="ArrowLeft">←</kbd><kbd data-key="ArrowUp">↑</kbd><kbd data-key="ArrowDown">↓</kbd><kbd data-key="ArrowRight">→</kbd><em>move</em></span><span class="kg"><kbd class="w" data-key="Enter">↲ ENTER</kbd><em>open</em></span><span class="kg"><kbd class="w" data-key="Escape">ESC</kbd><em>back</em></span></p>
%s
%s
</section>""" % (e(app["tag"]), mark(app, "mark big"), e(app["name"]), status_badge(app), e(app["tagline"]), e(app["lede"]),
                 *((hero_media, actions(app)) if media_top(app) else (actions(app), hero_media)))
    return head(seo["title"], seo["description"], seo["keywords"], "/" + app["slug"], og_image(app)) + """<body class="app">
<a class="skip" href="#top">Skip to content</a>
<header class="bar">
<a class="brand" href="/"><span class="back" aria-hidden="true">←</span> KAR PAGE APPS</a>
<nav aria-label="Sections">%s</nav>
</header>
<main id="top" class="wrap" tabindex="-1">
%s
%s
<section class="more"><h2><span>›</span> MORE APPS</h2><ul class="others">%s</ul></section>
</main>
""" % ("".join('<a href="#%s">%s</a>' % (i, t) for i, t in nav), hero, "\n".join(sec), others) + FOOT


def main():
    apps = json.loads((ROOT / "apps.json").read_text())["apps"]
    (ROOT / "index.html").write_text(index(apps))
    for a in apps:
        (ROOT / (a["slug"] + ".html")).write_text(page(a, apps))
    urls = [BASE + "/"] + [BASE + "/" + a["slug"] for a in apps]
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n'
                                      % "\n".join("<url><loc>%s</loc></url>" % u for u in urls))


if __name__ == "__main__":
    main()
