#!/usr/bin/env python3
"""Static contracts for the Jade Rain entry and existing media compatibility."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("build_site", ROOT / "tools/build-site.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class SiteTests(unittest.TestCase):
    def test_webp_only_media_has_no_missing_png_fallback(self):
        shot = {"id": "sample-shot", "w": 1920, "h": 1157, "format": "webp"}
        self.assertIn('src="img/sample-shot.webp"', build.picture(shot))
        self.assertEqual(build.full_src(shot), "img/sample-shot.webp")

    def test_legacy_png_media_is_unchanged(self):
        shot = {"id": "old", "w": 960, "h": 540}
        self.assertIn('src="img/old.png"', build.picture(shot))
        self.assertEqual(build.full_src(shot), "img/old.png")

    def test_public_app_without_measured_facts_is_not_unreleased(self):
        text = build.tile_detail({"status": "public", "license": "MIT"})
        self.assertEqual(text, "MIT · public source")

    def test_jade_entry_is_public_not_marketplace(self):
        apps = json.loads((ROOT / "site/apps.json").read_text())["apps"]
        matches = [a for a in apps if a["slug"] == "jade-rain-matrix"]
        self.assertEqual(len(matches), 1)
        app = matches[0]
        self.assertEqual(app["status"], "public")
        self.assertEqual(app["repo"], "KarPage/jade-rain-matrix")
        self.assertNotIn("listing", app)
        page = build.page(app, apps)
        self.assertIn('href="https://github.com/bjarneo/omarchy-matrix-theme"', page)
        self.assertIn('href="https://x.com/iamdothash"', page)
        for shot in app["shots"]:
            self.assertTrue((ROOT / "site" / build.full_src(shot)).is_file())
        self.assertIn("jade-rain-matrix", (ROOT / "site/index.html").read_text())

    def test_jade_uses_approved_loop_and_one_still(self):
        apps = json.loads((ROOT / "site/apps.json").read_text())["apps"]
        app = next(a for a in apps if a["slug"] == "jade-rain-matrix")
        self.assertEqual([s["id"] for s in app["shots"]], ["jade-rain-real-1"])
        page = build.page(app, apps)
        self.assertEqual(page.count('data-rain-loop'), 1)
        for attr in ['autoplay', 'muted', 'loop', 'playsinline']:
            self.assertIn(attr, page)
        for fmt in ['webm', 'mp4']:
            self.assertIn(f'data-src="media/jade-rain-loop.{fmt}"', page)
            self.assertTrue((ROOT / f"site/media/jade-rain-loop.{fmt}").is_file())
        self.assertIn('class="rain-poster"', page)
        self.assertIn('img/jade-rain-loop-poster.webp', page)
        self.assertIn('Pause animation', page)
        self.assertNotIn('jade-rain-live-', page)
        home = (ROOT / 'site/index.html').read_text()
        self.assertIn('data-rain-loop', home)
        self.assertNotIn('jade-rain-live-', home)
        self.assertFalse(list((ROOT / 'site/img').glob('jade-rain-live-*')))
        self.assertFalse(list((ROOT / 'site/img').glob('*v2*')))

    def test_mcholev_is_a_website_not_a_plugin(self):
        apps = json.loads((ROOT / "site/apps.json").read_text())["apps"]
        app = next(a for a in apps if a["slug"] == "mcholev")
        self.assertEqual(app["status"], "web app")
        self.assertEqual(app["name"], "Commercial Helicopter Pilot")
        self.assertEqual(app["tag"], "WEB · ASTRO · VERCEL")
        self.assertEqual(app["open"][1], "https://mcholev.com")
        self.assertNotIn("listing", app)
        self.assertFalse(app.get("license") and app.get("repo"))
        page = build.page(app, apps)
        self.assertIn('href="https://mcholev.com"', page)
        self.assertIn("WEB · ASTRO · VERCEL", page)
        self.assertIn("<h1>Commercial Helicopter Pilot</h1>", page)
        self.assertIn("img/mcholev-cover.webp", page)
        self.assertNotIn("Mihail", page)
        self.assertNotIn("Cholev", page)
        self.assertNotIn("plugins.omarchy.org", page)
        for shot in app["shots"]:
            self.assertTrue((ROOT / "site" / build.full_src(shot)).is_file())
        home = (ROOT / "site/index.html").read_text()
        self.assertIn('href="/mcholev"', home)
        self.assertIn("WEB · ASTRO · VERCEL", home)
        self.assertIn("All apps: 7 apps", home)
        self.assertIn("<h2>Commercial Helicopter Pilot</h2>", home)
        self.assertIn('srcset="img/mcholev-cover.avif 1x"', home)
        self.assertIn('loading="eager"', home[home.index('href="/mcholev"'):])
        self.assertNotIn("Mihail", home)
        self.assertNotIn("Cholev", home)

    def test_legacy_reel_is_unchanged(self):
        apps = json.loads((ROOT / "site/apps.json").read_text())["apps"]
        app = next(a for a in apps if a["slug"] == "omaraptor")
        page = build.page(app, apps)
        self.assertIn('class="reel"', page)
        self.assertNotIn('data-rain-loop', page)

if __name__ == "__main__":
    unittest.main()
