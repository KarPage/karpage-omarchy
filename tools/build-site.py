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
    "raptor": '<svg viewBox="0 0 32 32" fill="currentColor"><path fill-rule="evenodd" d="M16 1.25 17.3 4.6 17.9 8.4 19.3 11.6 30.75 19.6 30.75 22 21.3 21.4 21.9 23.6 27.4 27.6 27.4 29.9 20.4 28.9 18.6 30.75 16 30 13.4 30.75 11.6 28.9 4.6 29.9 4.6 27.6 10.1 23.6 10.7 21.4 1.25 22 1.25 19.6 12.7 11.6 14.1 8.4 14.7 4.6ZM16 5.4 16.75 8 16 11.2 15.25 8Z"/></svg>',
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
TIGHT = {"kp": "84 0 344 512", "raptor": "1.25 1.25 29.5 29.5", "car": "4.5 10.85 25 10.65",
         "launch": "4.2 6.2 23.6 19.6", "year": "3.5 5 25.3 20.85"}


def mark(app, cls="mark"):
    svg = MARKS.get(app.get("mark"), "")
    if "big" in cls and app.get("mark") in TIGHT:
        svg = re.sub(r'viewBox="[^"]*"', 'viewBox="%s"' % TIGHT[app["mark"]], svg, count=1)
    return '<span class="%s" aria-hidden="true">%s</span>' % (cls, svg)


# Small inline glyphs that sit beside a word (monochrome, sized to the text).
# Omarchy: official mark (MIT, github.com/basecamp/omarchy; vector via Simple Icons).
# Tux: Simple Icons "linux" silhouette of Larry Ewing's Tux (made with The GIMP).
GLYPHS = {
    "omarchy": ("0 0 24 24", "M0 0v24h12.8v-3.2h8V3.2h-3.2v1.6h1.6v14.4H4.8V4.8h8V1.6h9.6v20.8h-8V24H24V0Zm1.6 1.6h9.6v1.6h-8v8H1.6Zm0 11.2h1.6v8h8v1.6H1.6Z"),
    "linux": ("0 0 24 24", "M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.132 1.884 1.071.771-.06 1.592-.536 2.257-1.306.631-.765 1.683-1.084 2.378-1.503.348-.199.629-.469.649-.853.023-.4-.2-.811-.714-1.376v-.097l-.003-.003c-.17-.2-.25-.535-.338-.926-.085-.401-.182-.786-.492-1.046h-.003c-.059-.054-.123-.067-.188-.135a.357.357 0 00-.19-.064c.431-1.278.264-2.55-.173-3.694-.533-1.41-1.465-2.638-2.175-3.483-.796-1.005-1.576-1.957-1.56-3.368.026-2.152.236-6.133-3.544-6.139zm.529 3.405h.013c.213 0 .396.062.584.198.19.135.33.332.438.533.105.259.158.459.166.724 0-.02.006-.04.006-.06v.105a.086.086 0 01-.004-.021l-.004-.024a1.807 1.807 0 01-.15.706.953.953 0 01-.213.335.71.71 0 00-.088-.042c-.104-.045-.198-.064-.284-.133a1.312 1.312 0 00-.22-.066c.05-.06.146-.133.183-.198.053-.128.082-.264.088-.402v-.02a1.21 1.21 0 00-.061-.4c-.045-.134-.101-.2-.183-.333-.084-.066-.167-.132-.267-.132h-.016c-.093 0-.176.03-.262.132a.8.8 0 00-.205.334 1.18 1.18 0 00-.09.4v.019c.002.089.008.179.02.267-.193-.067-.438-.135-.607-.202a1.635 1.635 0 01-.018-.2v-.02a1.772 1.772 0 01.15-.768c.082-.22.232-.406.43-.533a.985.985 0 01.594-.2zm-2.962.059h.036c.142 0 .27.048.399.135.146.129.264.288.344.465.09.199.14.4.153.667v.004c.007.134.006.2-.002.266v.08c-.03.007-.056.018-.083.024-.152.055-.274.135-.393.2.012-.09.013-.18.003-.267v-.015c-.012-.133-.04-.2-.082-.333a.613.613 0 00-.166-.267.248.248 0 00-.183-.064h-.021c-.071.006-.13.04-.186.132a.552.552 0 00-.12.27.944.944 0 00-.023.33v.015c.012.135.037.2.08.334.046.134.098.2.166.268.01.009.02.018.034.024-.07.057-.117.07-.176.136a.304.304 0 01-.131.068 2.62 2.62 0 01-.275-.402 1.772 1.772 0 01-.155-.667 1.759 1.759 0 01.08-.668 1.43 1.43 0 01.283-.535c.128-.133.26-.2.418-.2zm1.37 1.706c.332 0 .733.065 1.216.399.293.2.523.269 1.052.468h.003c.255.136.405.266.478.399v-.131a.571.571 0 01.016.47c-.123.31-.516.643-1.063.842v.002c-.268.135-.501.333-.775.465-.276.135-.588.292-1.012.267a1.139 1.139 0 01-.448-.067 3.566 3.566 0 01-.322-.198c-.195-.135-.363-.332-.612-.465v-.005h-.005c-.4-.246-.616-.512-.686-.71-.07-.268-.005-.47.193-.6.224-.135.38-.271.483-.336.104-.074.143-.102.176-.131h.002v-.003c.169-.202.436-.47.839-.601.139-.036.294-.065.466-.065zm2.8 2.142c.358 1.417 1.196 3.475 1.735 4.473.286.534.855 1.659 1.102 3.024.156-.005.33.018.513.064.646-1.671-.546-3.467-1.089-3.966-.22-.2-.232-.335-.123-.335.59.534 1.365 1.572 1.646 2.757.13.535.16 1.104.021 1.67.067.028.135.06.205.067 1.032.534 1.413.938 1.23 1.537v-.043c-.06-.003-.12 0-.18 0h-.016c.151-.467-.182-.825-1.065-1.224-.915-.4-1.646-.336-1.77.465-.008.043-.013.066-.018.135-.068.023-.139.053-.209.064-.43.268-.662.669-.793 1.187-.13.533-.17 1.156-.205 1.869v.003c-.02.334-.17.838-.319 1.35-1.5 1.072-3.58 1.538-5.348.334a2.645 2.645 0 00-.402-.533 1.45 1.45 0 00-.275-.333c.182 0 .338-.03.465-.067a.615.615 0 00.314-.334c.108-.267 0-.697-.345-1.163-.345-.467-.931-.995-1.788-1.521-.63-.4-.986-.87-1.15-1.396-.165-.534-.143-1.085-.015-1.645.245-1.07.873-2.11 1.274-2.763.107-.065.037.135-.408.974-.396.751-1.14 2.497-.122 3.854a8.123 8.123 0 01.647-2.876c.564-1.278 1.743-3.504 1.836-5.268.048.036.217.135.289.202.218.133.38.333.59.465.21.201.477.335.876.335.039.003.075.006.11.006.412 0 .73-.134.997-.268.29-.134.52-.334.74-.4h.005c.467-.135.835-.402 1.044-.7zm2.185 8.958c.037.6.343 1.245.882 1.377.588.134 1.434-.333 1.791-.765l.211-.01c.315-.007.577.01.847.268l.003.003c.208.199.305.53.391.876.085.4.154.78.409 1.066.486.527.645.906.636 1.14l.003-.007v.018l-.003-.012c-.015.262-.185.396-.498.595-.63.401-1.746.712-2.457 1.57-.618.737-1.37 1.14-2.036 1.191-.664.053-1.237-.2-1.574-.898l-.005-.003c-.21-.4-.12-1.025.056-1.69.176-.668.428-1.344.463-1.897.037-.714.076-1.335.195-1.814.12-.465.308-.797.641-.984l.045-.022zm-10.814.049h.01c.053 0 .105.005.157.014.376.055.706.333 1.023.752l.91 1.664.003.003c.243.533.754 1.064 1.189 1.637.434.598.77 1.131.729 1.57v.006c-.057.744-.48 1.148-1.125 1.294-.645.135-1.52.002-2.395-.464-.968-.536-2.118-.469-2.857-.602-.369-.066-.61-.2-.723-.4-.11-.2-.113-.602.123-1.23v-.004l.002-.003c.117-.334.03-.752-.027-1.118-.055-.401-.083-.71.043-.94.16-.334.396-.4.69-.533.294-.135.64-.202.915-.47h.002v-.002c.256-.268.445-.601.668-.838.19-.201.38-.336.663-.336zm7.159-9.074c-.435.201-.945.535-1.488.535-.542 0-.97-.267-1.28-.466-.154-.134-.28-.268-.373-.335-.164-.134-.144-.333-.074-.333.109.016.129.134.199.2.096.066.215.2.36.333.292.2.68.467 1.167.467.485 0 1.053-.267 1.398-.466.195-.135.445-.334.648-.467.156-.136.149-.267.279-.267.128.016.034.134-.147.332a8.097 8.097 0 01-.69.468zm-1.082-1.583V5.64c-.006-.02.013-.042.029-.05.074-.043.18-.027.26.004.063 0 .16.067.15.135-.006.049-.085.066-.135.066-.055 0-.092-.043-.141-.068-.052-.018-.146-.008-.163-.065zm-.551 0c-.02.058-.113.049-.166.066-.047.025-.086.068-.14.068-.05 0-.13-.02-.136-.068-.01-.066.088-.133.15-.133.08-.031.184-.047.259-.005.019.009.036.03.03.05v.02h.003z"),
}


def glyph(name):
    if name == "kp":
        svg = re.sub(r'viewBox="[^"]*"', 'viewBox="%s"' % TIGHT["kp"], MARKS["kp"], count=1)
        return svg.replace("<svg ", '<svg class="g" aria-hidden="true" focusable="false" ', 1)
    vb, d = GLYPHS[name]
    return '<svg class="g" viewBox="%s" aria-hidden="true" focusable="false"><path fill="currentColor" d="%s"/></svg>' % (vb, d)


# Android robot (Simple Icons "android"). The Android robot is reproduced or modified from work
# created and shared by Google and used according to terms described in the Creative Commons 3.0
# Attribution License. No Apple or Chrome logos: their guidelines need written permission.
GLYPHS["android"] = ("0 0 24 24", "M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z")

# Generic UI symbols drawn for the install steps (our own line drawings, square caps).
def _ui(d):
    return ('<svg class="ui" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" '
            'stroke-width="2" stroke-linecap="square" stroke-linejoin="miter">%s</svg>') % d
UI_ICONS = {
    "share": _ui('<path d="M8.5 9H5v12h14V9h-3.5M12 2.5V15M8 6.5l4-4 4 4"/>'),
    "addsq": _ui('<path d="M4 4h16v16H4zM12 8v8M8 12h8"/>'),
    "more": _ui('<path d="M11 4h2v2h-2zM11 11h2v2h-2zM11 18h2v2h-2z"/>'),
    "install": _ui('<path d="M3 4h18v13H3zM8 21h8M12 7v6.5M9 10.5l3 3 3-3"/>'),
}

TAG_GLYPHS = {"OMARCHY": "omarchy", "LINUX": "linux"}


def tag_html(tag):
    return " · ".join(('<span class="gt">%s%s</span>' % (glyph(TAG_GLYPHS[t]), e(t))) if t in TAG_GLYPHS else e(t)
                      for t in tag.split(" · "))


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
    k = (glyph("omarchy") + e(kind)) if kind.startswith("MARKETPLACE") else e(kind)
    return ('<a class="act" href="%s" rel="noopener"><span class="act-k">%s <i aria-hidden="true">↗</i></span><span class="act-v">%s</span>%s</a>'
            % (e(href), k, e(main), det))


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
    g = glyph("omarchy") if app["status"] == "marketplace" else ""
    return '<span class="badge s-%s">%s%s</span>' % (e(app["status"].replace(" ", "-")), g, e(app["status"].upper()))


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
FOOT = FOOT.replace("KARPAGE · BUILT FOR OMARCHY", glyph("kp") + "KARPAGE · BUILT FOR " + glyph("omarchy") + "OMARCHY")


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
                     % (key, e("all apps" if key == "all" else label), e(n),
                        (glyph("omarchy") if "marketplace" in label.lower() else "") + e(label), len(hits)))
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
        if a.get("thumbs"):
            media = '<div class="tile-shot trio">%s</div>' % "".join(
                '<img src="img/%s.webp" srcset="img/%s.webp 1x, img/%s-2x.webp 2x" alt="%s" width="%d" height="%d" decoding="async" loading="lazy">'
                % (t["id"], t["id"], t["id"], e(t["alt"]), t["w"], t["h"]) for t in a["thumbs"])
        elif a["shots"]:
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

    def section(id_, title, body, pre=""):
        nonlocal n
        n += 1
        sec.append('<section id="%s"><h2><span>%02d</span> %s%s</h2>%s</section>' % (id_, n, pre, e(title), body))

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
    if app.get("related"):
        r = app["related"]
        section("omarchy", r[0], '<a class="feat link" href="/%s"><b>KAR PAGE LAUNCHER →</b><p>%s</p></a>' % (e(r[2]), e(r[1])),
                glyph("omarchy"))
        nav.append(("omarchy", r[0]))
    if app.get("pwa"):
        w = app["pwa"]

        def step_row(steps):
            # Each step is a key-cap chip: [icon] label, or a text-only cap for the final button.
            lis = []
            for ic, label in steps:
                if ic:
                    lis.append('<li><span class="cap">%s</span><span class="cap-l">%s</span></li>' % (UI_ICONS[ic], e(label)))
                else:
                    lis.append('<li><span class="cap cap-t">%s</span></li>' % e(label))
            return '<ol class="isteps">%s</ol>' % "".join(lis)

        def os_mark(c):
            if c.get("glyph"):
                return glyph(c["glyph"])
            return '<span class="osb">%s</span>' % e(c["badge"])

        cards = "".join('<div class="feat icard"><b>%s%s</b>%s</div>' % (os_mark(c), e(c["title"]), step_row(c["steps"]))
                        for c in w["cards"])
        d = w["desktop"]
        desk = '<div class="feat icard idesk"><b>%s</b>%s</div>' % (e(d["title"]), step_row(d["steps"]))
        note = e(w["note"]).replace("karpage.app", '<a href="https://karpage.app/" target="_blank" rel="noopener">karpage.app</a>', 1)
        btn = '<a class="btn-open" href="https://karpage.app/" target="_blank" rel="noopener">OPEN KARPAGE.APP <i aria-hidden="true">↗</i></a>'
        section("install", "INSTALL", '<div class="igrid">%s</div>%s<p class="note">%s</p>%s' % (cards, desk, note, btn))
        nav.append(("install", "INSTALL"))
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
</section>""" % (tag_html(app["tag"]), mark(app, "mark big"), e(app["name"]), status_badge(app), e(app["tagline"]), e(app["lede"]),
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
