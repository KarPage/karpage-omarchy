#!/usr/bin/env python3
"""Loopback-only browser contracts and desktop/narrow previews; optional Playwright."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1] / "site"


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        if self.headers.get("Host") != f"127.0.0.1:{self.server.server_port}":
            self.send_error(403)
            return
        path = urlsplit(self.path).path
        if path != "/" and "." not in path.rsplit("/", 1)[-1]:
            self.path = path + ".html"
        super().do_GET()


def check(out):
    out.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}"
    results = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=shutil.which("google-chrome"), headless=True,
                                        args=["--no-sandbox"])
            for label, width, height in [("desktop", 1440, 1000), ("narrow", 390, 844)]:
                context = browser.new_context(viewport={"width": width, "height": height},
                                              reduced_motion="no-preference")
                page = context.new_page()
                errors, failures = [], []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.on("response", lambda r: failures.append(f"{r.status} {r.url}") if r.status >= 400 else None)
                page.goto(url, wait_until="networkidle")
                tile = page.locator('.tile[href="/jade-rain-matrix"]')
                tile.scroll_into_view_if_needed()
                expect(tile.locator("video")).to_have_js_property("paused", False)
                assert page.locator("#grid > li").count() == 7
                page.screenshot(path=str(out / f"site-preview-home-{label}.png"), full_page=True)
                tile.screenshot(path=str(out / f"site-preview-tile-{label}.png"))
                page.locator('[data-filter="open"]').click()
                expect(tile).to_be_visible()
                page.goto(url + "/jade-rain-matrix", wait_until="networkidle")
                expect(page.locator("h1")).to_have_text("Jade Rain Matrix")
                video = page.locator("[data-rain-loop]")
                expect(video).to_have_js_property("paused", False)
                for prop in ("autoplay", "muted", "loop", "playsInline"):
                    expect(video).to_have_js_property(prop, True)
                assert video.evaluate("v => v.videoWidth") == 1920
                assert page.locator('a[href="https://github.com/bjarneo/omarchy-matrix-theme"]').count() == 1
                assert page.locator('a[href="https://x.com/iamdothash"]').count() == 1
                toggle = page.locator(".rain-toggle")
                toggle.focus()
                page.keyboard.press("Enter")
                expect(video).to_have_js_property("paused", True)
                expect(toggle).to_have_text("Play animation")
                toggle.click()
                expect(video).to_have_js_property("paused", False)
                # Seek through the seam; playback must continue into a new loop.
                video.evaluate("v => { v.currentTime = 4.9; }")
                page.wait_for_function("document.querySelector('[data-rain-loop]').currentTime < 2")
                page.locator(".shots a").focus()
                page.keyboard.press("Enter")
                expect(page.locator(".lb")).to_be_visible()
                page.keyboard.press("Escape")
                expect(page.locator(".lb")).not_to_be_visible()
                for image in page.locator("main img").all():
                    expect(image).to_have_js_property("complete", True)
                    assert image.evaluate("i => i.naturalWidth > 0")
                page.evaluate("scrollTo(0, document.body.scrollHeight)")
                expect(video).to_have_js_property("paused", True)
                page.evaluate("scrollTo(0, 0)")
                expect(video).to_have_js_property("paused", False)
                page.screenshot(path=str(out / f"site-preview-page-{label}.png"), full_page=True)
                assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                page.emulate_media(reduced_motion="reduce")
                expect(video).to_have_js_property("paused", True)
                expect(page.locator(".rain-poster")).to_be_visible()
                assert video.locator("source[src]").count() == 0
                size = page.locator(".rain-poster").bounding_box()
                assert abs(size["height"] / size["width"] - 1158 / 1920) < 0.01
                expect(toggle).not_to_be_visible()
                page.screenshot(path=str(out / f"site-preview-page-reduced-{label}.png"), full_page=True)
                page.emulate_media(reduced_motion="no-preference")
                expect(video).to_have_js_property("paused", False)
                assert not errors, errors
                assert not failures, failures
                results.append({"viewport": label, "playback": "passed", "pause_keyboard": "passed",
                                "seam": "passed", "lightbox_keyboard": "passed", "offscreen": "passed",
                                "dynamic_reduced_motion": "passed", "js_errors": errors, "http_errors": failures})
                context.close()
            for mode, js in [("reduced-motion", True), ("no-js", False)]:
                context = browser.new_context(reduced_motion="reduce" if js else "no-preference",
                                              java_script_enabled=js)
                page = context.new_page()
                media = []
                page.on("request", lambda r: media.append(r.url) if r.resource_type == "media" else None)
                page.goto(url + "/jade-rain-matrix", wait_until="networkidle")
                expect(page.locator(".rain-poster")).to_be_visible()
                expect(page.locator("[data-rain-loop]")).not_to_be_visible()
                assert not media, media
                assert page.locator("[data-rain-loop] source[src]").count() == 0
                assert page.locator(".shots img").count() == 1
                results.append({"mode": mode, "poster_only": True, "media_requests": media})
                context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    check(parser.parse_args().output)
