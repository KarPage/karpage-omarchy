# Kar Page for Omarchy

Launcher for [Kar Page](https://karpage.app) on Omarchy. It opens the live site in a Chromium app window. This repo is the whole install. The Kar Page app source is not here.

Paste this into a terminal on Omarchy. `less` shows the script first. Press `q` to install, or Ctrl-C to stop.

```bash
git clone https://github.com/KarPage/karpage-omarchy.git && cd karpage-omarchy && less install && ./install
```

## What the script does

It checks that `chromium` is on your PATH. Then it copies two files into your home directory:

- `~/.local/share/applications/karpage.desktop`
- `~/.local/share/icons/hicolor/512x512/apps/karpage.png`

No `sudo`. No network. It does not install packages. If Chromium is missing, it stops and prints `sudo pacman -S chromium`.

The window uses the same Chromium profile as the browser, so a Kar Page sign-in is shared. The script does not read a password or a key.

`install` is the file `less` opens:

```sh
#!/bin/sh
# Install the Kar Page launcher for this user. No sudo. No network.
set -eu
cd "$(dirname "$0")"

if ! command -v chromium >/dev/null 2>&1; then
  echo "Chromium is not installed. On Omarchy run: sudo pacman -S chromium" >&2
  exit 1
fi

data="${XDG_DATA_HOME:-$HOME/.local/share}"
apps="$data/applications"
icons="$data/icons/hicolor/512x512/apps"
mkdir -p "$apps" "$icons"
cp -f karpage.desktop "$apps/karpage.desktop"
cp -f karpage.png "$icons/karpage.png"
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$apps" || true
fi
echo "Kar Page is in the launcher."
```

Open **Kar Page** from the Omarchy launcher. The window loads https://karpage.app.

Remove it with `./uninstall` from this directory. That deletes the two files above. The website is unchanged.

## What you can verify

The desktop entry, the icon, and both scripts are the entire source. MIT license. Nothing in this repo can deploy, or see, the private app.

This audit covers the launcher. The window still shows whatever is deployed at https://karpage.app.
