# Kar Page Apps

Static site for [apps.karpage.com](https://apps.karpage.com). A front page with every app, plus one page per app (`/omaraptor`, `/oma-year`, `/kar-page`, `/launcher`, `/jade-rain-matrix`, `/omakardash`). No framework, no tracking, no external fonts or CDNs. Every page works without JavaScript; `site.js` only adds the copy buttons, the stat filters and old-link redirects.

## Build

App detail pages and the sitemap are generated. The circuit-board `index.html` is hand-maintained and the builder deliberately preserves it; update its tiles, filter counts and rotating subtitle when adding an app.

```sh
python3 tools/measure.py     # optional: re-measure sizes, commits, licenses, releases into apps.json
python3 tools/build-site.py  # writes site/index.html, site/<slug>.html, site/sitemap.xml
```

Both use only the Python standard library. `measure.py` makes a depth-1 clone of each app's `repo` and reads the public GitHub API without signing in.

## apps.json

Each app is one object in `apps`. Only add an app you have a real source for. Screenshots use demo data only.

| Field | What it does |
| --- | --- |
| `slug`, `name`, `mark` | URL (`/<slug>`), title, and logo (`kp`, `year`, `raptor`, `car`, `launch`, `rain`). |
| `status` | Badge and filter: `marketplace`, `in review`, `public`, `web app`, `coming soon`. |
| `license`, `repo` | An app with both counts as open source. `repo` is `KarPage/<name>`. |
| `short` | One line on the front tile. |
| `tag`, `tagline`, `lede` | Hero kicker, subtitle and intro on the app page. |
| `seo` | `title`, `description`, `keywords` for that page's meta, Open Graph and X card. |
| `features` | `[[TITLE, text], ...]`. |
| `install`, `installNote`, `installFiles` | `[[LABEL, command], ...]`. The first command is the copyable install card. |
| `inspiration` | `[title, source-url, handle, profile-url]` rendered as linked attribution. |
| `links` | `[[LABEL, https-url], ...]`, such as `SOURCE`, `WEBSITE`, `MARKETPLACE`. |
| `open` | `[LABEL, https-url]` for a web app. |
| `listing`, `review` | Marketplace listing URL, or the marketplace submission URL while in review. |
| `facts` | Written by `measure.py`. Only measured values are shown; missing values are left out. |
| `loop` | Actual-screen `webm`, `mp4`, `poster`, `w`, `h`, `label`, `cap`; poster-only with reduced motion or no JavaScript. |
| `shots` | `{id, alt, w, h, x2, avif, format, cap}`. Loads `img/<id>.webp`, falls back to `img/<id>.png`; `x2` adds `-2x`, `avif` adds `.avif`. Use `format: "webp"` for WebP-only originals without PNG duplication. Empty list shows a placeholder. |
| `chips`, `related`, `soon`, `frame`, `fine` | Supported sites, a related app, coming-soon text, `phone` frame, small print. |

## Rules

Square corners only. Demo data only in screenshots. No maps, flags, news or politics. Keep the CSP in `vercel.json` and the page meta strict: no inline scripts or styles.

## Icon credits

- Omarchy mark: from the Omarchy project (MIT, github.com/basecamp/omarchy), vector via Simple Icons. Unofficial, not affiliated.
- Tux silhouette: Simple Icons "linux" glyph, based on Tux by Larry Ewing (lewing@isc.tamu.edu), drawn with The GIMP.
- OmaRaptor jet: an original drawing for this site.
- No Arch Linux logo is used: the Arch trademark policy requires the ™ mark with the logo and limits combining it with other marks.

### Actual-screen animation

Jade Rain uses a five-second silent live-screen capture plus one original still,
with the original words/logo configuration unchanged. The desktop bar is cropped
out; no windows, notifications or private data. Videos live in `media/`; their
poster and the single still live in `img/`. The README-only animated WebP is not
duplicated here. Old placeholder/rejected screenshots are not release assets.

Loops are static posters without JavaScript or with reduced motion. Video sources
are attached only when motion is allowed and the frame is visible; offscreen or
hidden pages pause. The detail page has a square pause/resume control. Changing
the OS motion preference pauses and detaches sources. The separate OmaRaptor reel
controller is unchanged.

Optional browser verification (Playwright and Chromium already installed):
`python3 tools/check_site_ui.py --output /path/to/previews`.
