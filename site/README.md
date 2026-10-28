# Kar Page Apps

Static list for [apps.karpage.com](https://apps.karpage.com). One HTML page, one stylesheet, one script. No framework, no build, no tracking, no external fonts or CDNs.

## Add an app

Edit `apps.json`. `since` is the day this page started (`2026-10-27`). Each app is one JSON object on its own line inside `apps`. Keep the commas valid:

```json
{"name":"Example","description":"One line, taken from that repo.","status":"coming soon","mark":"year","shot":"example","shotAlt":"What the picture shows"}
```

That example is not a real app. Do not add an app you do not have a source for.

The page reads only these fields:

| Field | What it shows |
| --- | --- |
| `since` | Calendar date `YYYY-MM-DD`. Days up counts that day as day 1. A bad or missing date falls back to `2026-10-27`. |
| `name` | The row title. Required. |
| `description` | One line. |
| `status` | Badge text. `web`, `marketplace`, and `public` count as live. `private beta` and `coming soon` have their own counters. |
| `open` | An `https` link labeled Open. |
| `install` | One shell line, labeled Install, with a copy button. |
| `launch` | One local shell line, labeled Launch, with a copy button. The page cannot start the app. |
| `source` | A public `https` link labeled Source. |
| `mark` | Logo. `kp`, `year`, `watch`, `car`, or `launch`. Anything else becomes a two-letter monogram. |
| `shot` | File id. The page loads `img/<id>.webp` and falls back to `img/<id>.png`. Letters, numbers, and hyphens only. |
| `shotAlt` | The picture's description. |

Shots are lazy-loaded. Keep each WebP and each PNG under about 250 KB. Logos are drawn in the page. They are original glyphs, not trademarked marks.

Do not put keys, tokens, VINs, domain key paths, or account details in this file. OmaKarDash has no install line. Its picture is the demo dashboard for the fictional car Northwind. OmaWatch's picture is a drawn placeholder. Do not replace it with a capture of a live session, an account, a name, or a key path.

## Preview

`apps.json` is loaded with `fetch`, so open the page over HTTP. From this folder:

```sh
python3 -m http.server 8080
```

Then open http://127.0.0.1:8080/.

The counters (apps, live, private beta, coming soon, days up) are computed in the browser from `apps.json`.

## Deploy on Vercel

Import this repository as a new Vercel project and use these settings. The files are already static, so there is no build.

1. Set **Root Directory** to `site`.
2. Set **Framework Preset** to **Other**.
3. Turn on **Override** for the build command and leave the command empty. Vercel then skips the build and serves the files as they are.
4. Leave **Output Directory** unset. With Other, and with no `public` folder in `site`, Vercel serves this directory, which is where `index.html` lives.

Do not add a `public` directory here. On the Other preset, Vercel prefers `public` over the project root.

The hostname this page is for is `apps.karpage.com`. Attach that domain in the Vercel project when you want it live, and point DNS at that point. This repo does not deploy itself and does not change DNS.
