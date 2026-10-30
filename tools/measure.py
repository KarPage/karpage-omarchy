#!/usr/bin/env python3
"""Measure the public repos listed in site/apps.json and store the numbers there.

For each app with a "repo" field it makes a shallow clone and records:
files (count), repo bytes on disk without .git, shallow-clone download bytes (.git after
a depth-1 clone), app bytes (repo without screenshots/, media/ and preview.png), the
latest commit, the latest GitHub release and the SPDX license. "installFiles" lists
files whose size is the real install footprint (for installers that copy a few files).
Run from the repo root: python3 tools/measure.py
"""
import datetime
import json
import pathlib
import subprocess
import tempfile
import urllib.request

SITE = pathlib.Path(__file__).resolve().parent.parent / "site"
SKIP = {"screenshots", "media", "preview.png", ".git"}


def du(path, skip=()):
    total = 0
    for p in path.rglob("*"):
        rel = p.relative_to(path).parts
        if rel[0] in skip or not p.is_file() or p.is_symlink():
            continue
        total += p.stat().st_size
    return total


def api(url):
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "kp-measure"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except Exception:
        return None


def measure(repo, install_files):
    with tempfile.TemporaryDirectory() as tmp:
        d = pathlib.Path(tmp) / "r"
        subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/%s.git" % repo, str(d)], check=True)
        out = subprocess.run(["git", "-C", str(d), "log", "-1", "--format=%h %cs"], capture_output=True, text=True, check=True).stdout.split()
        files = subprocess.run(["git", "-C", str(d), "ls-files"], capture_output=True, text=True, check=True).stdout.split("\n")
        m = {
            "files": len([f for f in files if f]),
            "repoBytes": du(d, {".git"}),
            "downloadBytes": du(d / ".git"),
            "appBytes": du(d, SKIP),
            "commit": out[0],
            "commitDate": out[1],
        }
        if install_files:
            m["installBytes"] = sum((d / f).stat().st_size for f in install_files)
    info = api("https://api.github.com/repos/%s" % repo) or {}
    lic = (info.get("license") or {}).get("spdx_id")
    if lic and lic != "NOASSERTION":
        m["license"] = lic
    rel = api("https://api.github.com/repos/%s/releases/latest" % repo)
    if rel and rel.get("tag_name"):
        m["release"] = rel["tag_name"]
    m["measured"] = datetime.date.today().isoformat()
    return m


def main():
    path = SITE / "apps.json"
    data = json.loads(path.read_text())
    for app in data["apps"]:
        if app.get("repo"):
            app["facts"] = measure(app["repo"], app.get("installFiles", []))
            print(app["slug"], app["facts"])
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
