# KarPage apps

Static list of KarPage apps, for [apps.karpage.com](https://apps.karpage.com). One HTML page, one stylesheet, one script. No framework, no build, no tracking, no external fonts or CDNs.

## Add an app

Edit `apps.json`. Each app is one JSON object on its own line. Add a line inside the array and keep the commas valid:

```json
{"name":"Example","description":"One line, taken from that repo.","status":"public","open":"https://example.com","install":"echo the real install line","launch":"example open","source":"https://github.com/KarPage/example","image":"img/example.jpg","imageAlt":"What the picture shows"}
```

Leave out any field that does not apply. The page reads only these fields:

| Field | What it shows |
| --- | --- |
| `name` | The row title. Required. |
| `description` | One line. |
| `status` | The badge text, such as `web`, `marketplace`, or `private beta`. |
| `open` | An `https` link labeled Open. |
| `install` | One shell line, labeled Install, with a copy button. |
| `launch` | One local shell line, labeled Launch, with a copy button. The page cannot start the app. |
| `source` | A public `https` link labeled Source. |
| `image` | A file under this folder, such as `img/example.jpg`. No `..` and no remote URL. |
| `imageAlt` | The picture's description. |

Do not put keys, tokens, VINs, domain key paths, or account details in this file. OmaKarDash is listed with a description and a private-beta badge only.

## Preview

`apps.json` is loaded with `fetch`, so open the page over HTTP. From this folder:

```sh
python3 -m http.server 8080
```

Then open http://127.0.0.1:8080/.

## Deploy on Vercel

Import this repository as a new Vercel project and use these settings. The files are already static, so there is no build.

1. Set **Root Directory** to `site`.
2. Set **Framework Preset** to **Other**.
3. Turn on **Override** for the build command and leave the command empty. Vercel then skips the build and serves the files as they are.
4. Leave **Output Directory** unset. With Other, and with no `public` folder in `site`, Vercel serves this directory, which is where `index.html` lives.

Do not add a `public` directory here. On the Other preset, Vercel prefers `public` over the project root.

The hostname this page is for is `apps.karpage.com`. Attach that domain in the Vercel project when you want it live, and point DNS at that point. This repo does not deploy itself and does not change DNS.
