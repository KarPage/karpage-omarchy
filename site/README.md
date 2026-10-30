# Kar Page Apps

Static list for [apps.karpage.com](https://apps.karpage.com). One HTML page, one stylesheet, one script. No framework, no build, no tracking, no external fonts or CDNs.

## Add an app

Edit `apps.json`. Each app is one object in `apps`. Keep the commas valid:

```json
{"name":"Example","description":"One line, taken from that repo.","status":"coming soon","mark":"year","shots":[]}
```

That example is not a real app. Do not add an app you do not have a source for.

The page reads only these fields:

| Field | What it shows |
| --- | --- |
| `name` | The row title. Required. |
| `description` | One line. |
| `tagline` | Optional short subtitle under the name. |
| `notes` | Extra paragraphs under the description. |
| `points` | Optional short bullet list under the description. |
| `fine` | Optional small print at the bottom of the card, for credits and disclaimers. |
| `status` | Badge text. `marketplace` means listed on the Omarchy plugin marketplace, `in review` means submitted and waiting, and `coming soon` is not released yet. Each of those has its own counter. |
| `license` | License name, such as `MIT`. An app with a `license` and a `source` link counts as open source. |
| `open` | An `https` link. The button reads `open` and is the solid button when it is present. |
| `site` | An `https` link to the app's own website. The button reads `website`. |
| `install` | One shell line. The button reads `install`, copies the line, and is the solid button when there is no Open link. |
| `launch` | One local shell line. The button reads `launch` and copies the line. The page cannot start the app. It is solid only when it is the only action. |
| `source` | A public `https` link. The button reads `source` and opens in a new tab. |
| `mark` | Logo. `kp`, `year`, `raptor`, `car`, or `launch`. Anything else becomes a two-letter monogram. |
| `frame` | `phone` or `wide`. Sets the gallery slide width. |
| `shots` | Gallery list. Two or more entries scroll as a gallery. One entry is a single window. An empty list leaves the preview slot ready and shows no picture. |
| `rail` | Extra shots in a narrow column beside the main picture. Same shot fields. On a narrow window the column stacks under the main picture. |
| `shot` | Older single-picture id, used only when `shots` is absent. |
| `shotAlt` | Description for that older single picture. |

Each shot is `{"id","alt","w","h","x2","avif"}`. `id` is letters, numbers, and hyphens. The page loads `img/<id>.webp` and falls back to `img/<id>.png`. `"x2": true` also loads `img/<id>-2x.webp` for sharp screens. `"avif": true` also loads `img/<id>.avif`, and with `x2` it loads `img/<id>-2x.avif`. Add an AVIF file only when `avif` is true, so a missing file is never requested. The first picture on the page loads immediately. The rest wait until they are near the screen.

`w` and `h` are the CSS pixel size of the 1x file. A 2x file is twice that on each side. New Kar Page shots use the names `img/kar-page-<slug>.png`, `img/kar-page-<slug>.webp`, and `img/kar-page-<slug>.avif`, plus optional `img/kar-page-<slug>-2x.webp` and `img/kar-page-<slug>-2x.avif`. List each one in `shots`. The shot on the card now is `kar-grid`. Add the next public screens under that `kar-page-<slug>` pattern and the existing gallery will scroll them.

Keep each WebP, each AVIF, and each PNG under about 250 KB. Logos are drawn in the page. The Kar Page mark is this repo's app icon, drawn in one color. The other marks are original glyphs. The GitHub button uses the mark-github path from GitHub's MIT-licensed octicons.

Buttons appear only for actions the app has. Install and Launch copy on click and show a toast that reads `copied ✓`. If the copy fails, the command is shown instead. Open and Source open in a new tab.

Do not put keys, tokens, VINs, domain key paths, account names, email addresses, or license plates in this file or in the pictures. OmaKarDash has no install, launch, or source button. Its pictures are a demo of the fictional car Northwind (Jade, Red, and Purple in the gallery, Clear in the narrow column). The screen says the read is unofficial and not affiliated with Tesla. OmaRaptor's pictures use open-licensed launch footage, credited in its fine print (the `fine` field). Kar Page's own codebase stays private, so that card has no source link.

## Preview

`apps.json` is loaded with `fetch`, so open the page over HTTP. From this folder:

```sh
python3 -m http.server 8080
```

Then open http://127.0.0.1:8080/.

The counters (apps, open source, on the marketplace, in review, coming soon) are computed in the browser from `apps.json`. A counter that would read 0 is not shown.

## Deploy on Vercel

Import this repository as a new Vercel project. The files are already static. `site/vercel.json` selects no framework, skips install and build, turns on clean URLs, and sets security headers. There is no analytics and no tracking.

1. Set **Root Directory** to `site`. That setting is on the project. `vercel.json` cannot set it.
2. Leave the build settings the file already defines: framework Other, empty install command, empty build command. Vercel then serves this directory.

Do not add a `public` directory here. On the Other preset, Vercel prefers `public` over the project root.

The hostname this page is for is `apps.karpage.com`. Attach that domain in the Vercel project when you want it live, and point DNS at that point. This repo does not deploy itself and does not change DNS.
