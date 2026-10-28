#!/usr/bin/env bash
# Round-trip the installer and the window commands against a fake Hyprland.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
shellcheck -s bash "$root/karpage"
shellcheck -s sh "$root/install" "$root/uninstall"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

export HOME=$tmp/home
export XDG_CONFIG_HOME=$HOME/.config
export XDG_STATE_HOME=$HOME/.local/state
export XDG_DATA_HOME=$HOME/.local/share
mkdir -p "$HOME"

hypr=$HOME/.config/hypr
mkdir -p "$hypr"
cat >"$hypr/hyprland.conf" <<'EOF'
# user
source = ~/.config/hypr/monitors.conf

bind = SUPER, Return, exec, kitty

# karpage-omarchy:begin
source = /old/karpage.conf
# karpage-omarchy:end

# keep me
windowrule = float on, match:class kitty
EOF
cat >"$hypr/hyprland.lua" <<'EOF'
-- user
require("hypr.monitors")

-- karpage-omarchy:begin
require("old.karpage")
-- karpage-omarchy:end

-- keep me
hl.bind("SUPER + RETURN", hl.dsp.exec_cmd("kitty"))
EOF
target=$tmp/real-hyprland.conf
printf 'real config\n' >"$target"
ln -s "$target" "$hypr/linked.conf"

KARPAGE_NO_RELOAD=1 "$root/install" >/tmp/kp-install.out 2>&1
KARPAGE_NO_RELOAD=1 "$root/install" >/tmp/kp-install2.out 2>&1

begin_count=$(grep -c 'karpage-omarchy:begin' "$hypr/hyprland.conf")
[ "$begin_count" -eq 1 ]
grep -q "source = $hypr/karpage.conf" "$hypr/hyprland.conf"
grep -q 'windowrule = float on, match:class kitty' "$hypr/hyprland.conf"
grep -q 'source = ~/.config/hypr/monitors.conf' "$hypr/hyprland.conf"
grep -q 'bind = SUPER, Return, exec, kitty' "$hypr/hyprland.conf"
grep -q '/old/karpage.conf' "$hypr/hyprland.conf" && exit 1

lua_count=$(grep -c 'karpage-omarchy:begin' "$hypr/hyprland.lua")
[ "$lua_count" -eq 1 ]
grep -q 'require("hypr.karpage")' "$hypr/hyprland.lua"
grep -q 'hl.bind("SUPER + RETURN"' "$hypr/hyprland.lua"
grep -q 'require("old.karpage")' "$hypr/hyprland.lua" && exit 1
grep -q '^-- karpage-omarchy:begin$' "$hypr/hyprland.lua"

conf_before=$(cat "$hypr/hyprland.conf")
# The second install output was already produced. Compare the file to a third run.
cp "$hypr/hyprland.conf" "$tmp/conf-once"
KARPAGE_NO_RELOAD=1 "$root/install" >/dev/null
diff -u "$tmp/conf-once" "$hypr/hyprland.conf"
diff -u "$root/config.example" "$XDG_CONFIG_HOME/karpage/config"

grep -q "bindd = SUPER SHIFT, K, Kar Page, exec, $HOME/.local/bin/karpage open" "$hypr/karpage-binds.conf"
grep -q 'SUPER SHIFT ALT, K' "$hypr/karpage-binds.conf"
grep -q 'SUPER SHIFT CTRL, K' "$hypr/karpage-binds.conf"
test -x "$HOME/.local/bin/karpage"
test -f "$hypr/karpage.lua"
test -f "$hypr/karpage_binds.lua"
grep -q "^Exec=$HOME/.local/bin/karpage open$" "$XDG_DATA_HOME/applications/karpage.desktop"
grep -q 'StartupWMClass=karpage' "$XDG_DATA_HOME/applications/karpage.desktop"

# A symlink is not rewritten.
grep -q 'real config' "$target"
saved_conf=$(cat "$hypr/hyprland.conf")
printf '%s\n' "$saved_conf" >"$target"
rm "$hypr/hyprland.conf"
ln -s "$target" "$hypr/hyprland.conf"
KARPAGE_NO_RELOAD=1 "$root/install" >/tmp/kp-install-link.out 2>&1
grep -Fq "Left $hypr/hyprland.conf alone because it is a symlink." /tmp/kp-install-link.out
diff -u "$target" <(printf '%s\n' "$saved_conf")
rm "$hypr/hyprland.conf"
printf '%s\n' "$saved_conf" >"$hypr/hyprland.conf"

"$HOME/.local/bin/karpage" --help >/dev/null
"$HOME/.local/bin/karpage" keys | grep -q 'Super+Shift+K'

# Remembered mode yields to a newer config file.
"$HOME/.local/bin/karpage" mode tile >/dev/null
[ "$("$HOME/.local/bin/karpage" mode)" = tile ]
touch -d '2 seconds ago' "$XDG_STATE_HOME/karpage/mode" "$XDG_STATE_HOME/karpage/side"
touch "$XDG_CONFIG_HOME/karpage/config"
[ "$("$HOME/.local/bin/karpage" mode)" = phone ]

mkdir -p "$XDG_DATA_HOME/karpage/browsers/chromium"
printf 'keep\n' >"$XDG_CONFIG_HOME/karpage/config-note"
# uninstall must not delete the config. The note sits beside it.
cp "$XDG_CONFIG_HOME/karpage/config" "$tmp/config-saved"
"$root/uninstall" >/tmp/kp-uninstall.out
[ ! -e "$HOME/.local/bin/karpage" ]
[ ! -e "$hypr/karpage.conf" ]
[ ! -e "$hypr/karpage.lua" ]
[ ! -e "$XDG_DATA_HOME/applications/karpage.desktop" ]
[ ! -e "$XDG_STATE_HOME/karpage" ]
diff -u "$tmp/config-saved" "$XDG_CONFIG_HOME/karpage/config"
grep -q 'windowrule = float on, match:class kitty' "$hypr/hyprland.conf"
grep -q 'karpage-omarchy:begin' "$hypr/hyprland.conf" && exit 1
grep -q 'karpage-omarchy:begin' "$hypr/hyprland.lua" && exit 1
grep -q 'hl.bind("SUPER + RETURN"' "$hypr/hyprland.lua"
# A second uninstall stays quiet and successful.
"$root/uninstall" >/dev/null

# Behavior against a fake compositor and browser.
bin=$tmp/bin
mkdir -p "$bin"
cat >"$bin/hyprctl" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" >> "${KARPAGE_TEST_LOG:?}"
case "$1" in
  clients) cat "${KARPAGE_TEST_CLIENTS:?}" ;;
  monitors) cat "${KARPAGE_TEST_MONITORS:?}" ;;
  dispatch)
    case "$2" in
      hl.dsp*) exit 1 ;;
    esac
    exit 0
    ;;
  *) exit 0 ;;
esac
EOF
cat >"$bin/chromium" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" >> "${KARPAGE_TEST_BROWSER:?}"
exit 0
EOF
cp "$bin/chromium" "$bin/firefox"
chmod 755 "$bin/hyprctl" "$bin/chromium" "$bin/firefox"

cat >"$tmp/monitors" <<'EOF'
Monitor DP-2 (ID 1):
	1920x1080@60.00000 at 2560x0
	reserved: 0 0 0 0
	scale: 1.00
	focused: no
Monitor eDP-1 (ID 0):
	2560x1440@60.00000 at 0x0
	reserved: 36 0 0 0
	scale: 1.00
	focused: yes
EOF
cat >"$tmp/clients" <<'EOF'
Window 0x99 -> $(echo pwned)
	mapped: 1
	class: firefox
	title: Kar Page $(echo pwned)
	pid: 1
	pinned: 0
	fullscreen: 0

Window 0x55a1 -> Kar Page
	mapped: 1
	class: chrome-karpage.app__-Default
	title: Kar Page
	initialClass: chrome-karpage.app__-Default
	pid: 4242
	pinned: 0
	fullscreen: 0
EOF
cat >"$tmp/clients-none" <<'EOF'
Window 0x99 -> Kar Page
	mapped: 1
	class: firefox
	title: Kar Page
	pid: 1
	pinned: 0
	fullscreen: 0
EOF

export PATH="$bin:$PATH"
export KARPAGE_NO_NOTIFY=1
export KARPAGE_NO_RELOAD=1
export KARPAGE_POLL_TRIES=1
export KARPAGE_POLL_SLEEP=0
export KARPAGE_TEST_LOG=$tmp/hypr.log
export KARPAGE_TEST_BROWSER=$tmp/browser.log
export KARPAGE_TEST_CLIENTS=$tmp/clients
export KARPAGE_TEST_MONITORS=$tmp/monitors

# Reinstall into the same fake home now that the command is on PATH via the copy.
# The behavior tests call the repo script so they do not depend on install.
: >"$KARPAGE_TEST_LOG"
: >"$KARPAGE_TEST_BROWSER"
"$root/karpage" open
grep -q 'focuswindow address:0x55a1' "$KARPAGE_TEST_LOG"
grep -q 'resizewindowpixel' "$KARPAGE_TEST_LOG" && exit 1
grep -q 'address:0x99' "$KARPAGE_TEST_LOG" && exit 1
[ ! -s "$KARPAGE_TEST_BROWSER" ]
[ ! -e "$tmp/pwned" ]

: >"$KARPAGE_TEST_LOG"
"$root/karpage" mode phone
grep -q 'resizewindowpixel exact 430 932,address:0x55a1' "$KARPAGE_TEST_LOG"
grep -q 'movewindowpixel exact 2082 272,address:0x55a1' "$KARPAGE_TEST_LOG"
grep -q 'setfloating address:0x55a1' "$KARPAGE_TEST_LOG"
grep -q 'setprop address:0x55a1 rounding 46' "$KARPAGE_TEST_LOG"
grep -q 'dispatch pin ' "$KARPAGE_TEST_LOG" && exit 1

: >"$KARPAGE_TEST_LOG"
"$root/karpage" mode tile
grep -q 'resizewindowpixel exact 430 1308,address:0x55a1' "$KARPAGE_TEST_LOG"
grep -q 'movewindowpixel exact 2082 84,address:0x55a1' "$KARPAGE_TEST_LOG"

"$root/karpage" mode phone >/dev/null
: >"$KARPAGE_TEST_LOG"
"$root/karpage" side left
grep -q 'movewindowpixel exact 48 272,address:0x55a1' "$KARPAGE_TEST_LOG"

: >"$KARPAGE_TEST_LOG"
"$root/karpage" side center
grep -q 'movewindowpixel exact 1065 272,address:0x55a1' "$KARPAGE_TEST_LOG"

: >"$KARPAGE_TEST_LOG"
"$root/karpage" mode full
grep -q 'fullscreenstate 2 0' "$KARPAGE_TEST_LOG"
grep -q 'resizewindowpixel' "$KARPAGE_TEST_LOG" && exit 1

# No Kar Page window: launch Chromium, and do not steal Firefox.
# mode full is still remembered, which would request a fullscreen window size.
"$root/karpage" mode phone >/dev/null
"$root/karpage" side right >/dev/null
export KARPAGE_TEST_CLIENTS=$tmp/clients-none
: >"$KARPAGE_TEST_BROWSER"
: >"$KARPAGE_TEST_LOG"
"$root/karpage" --browser brave open 2>"$tmp/fallback.err"
grep -q "Browser 'brave' is not on PATH" "$tmp/fallback.err"
grep -q 'Using chromium' "$tmp/fallback.err"
grep -q -- '--app=https://karpage.app' "$KARPAGE_TEST_BROWSER"
grep -q -- '--class=karpage' "$KARPAGE_TEST_BROWSER"
grep -q -- "--user-data-dir=$XDG_DATA_HOME/karpage/browsers/chromium" "$KARPAGE_TEST_BROWSER"
grep -q -- '--window-size=430,932' "$KARPAGE_TEST_BROWSER"
grep -q 'focuswindow address:0x99' "$KARPAGE_TEST_LOG" && exit 1

"$root/karpage" --browser netscape open >/dev/null 2>"$tmp/bad-browser.err" && exit 1
grep -q 'Unknown browser' "$tmp/bad-browser.err"

# Scaled monitor: 1920x1080 at 1.5, origin 100,0, reserved top 30.
cat >"$tmp/monitors-scaled" <<'EOF'
Monitor eDP-1 (ID 0):
	1920x1080@60.00000 at 100x0
	reserved: 30 0 0 0
	scale: 1.50
	focused: yes
EOF
export KARPAGE_TEST_MONITORS=$tmp/monitors-scaled
export KARPAGE_TEST_CLIENTS=$tmp/clients
: >"$KARPAGE_TEST_LOG"
"$root/karpage" side right >/dev/null
"$root/karpage" mode phone
grep -q 'resizewindowpixel exact 304 658,address:0x55a1' "$KARPAGE_TEST_LOG"
grep -q 'movewindowpixel exact 1060 46,address:0x55a1' "$KARPAGE_TEST_LOG"

printf 'browser=firefox\npin=yes\n' >>"$XDG_CONFIG_HOME/karpage/config"
# State files are newer than the config until we touch the config.
touch "$XDG_CONFIG_HOME/karpage/config"
export KARPAGE_TEST_CLIENTS=$tmp/clients-none
: >"$KARPAGE_TEST_BROWSER"
"$root/karpage" open 2>"$tmp/ff.err"
grep -q -- "--profile $XDG_DATA_HOME/karpage/browsers/firefox" "$KARPAGE_TEST_BROWSER"
grep -q -- '--new-window https://karpage.app' "$KARPAGE_TEST_BROWSER"
grep -q -- '--app=' "$KARPAGE_TEST_BROWSER" && exit 1
test -f "$XDG_DATA_HOME/karpage/browsers/firefox/user.js"
grep -q 'toolkit.telemetry.enabled' "$XDG_DATA_HOME/karpage/browsers/firefox/user.js"

# Generated rules match the repo copy.
KARPAGE_NO_RELOAD=1 "$root/karpage" rules
# The config now requests firefox and pin, so restore the example before comparing.
cp "$root/config.example" "$XDG_CONFIG_HOME/karpage/config"
KARPAGE_NO_RELOAD=1 "$root/karpage" rules
if [ -f "$root/hypr/karpage.conf" ]; then
  diff -u "$root/hypr/karpage.conf" "$hypr/karpage.conf"
else
  cp "$hypr/karpage.conf" "$root/hypr/karpage.conf"
  echo "Saved generated hypr/karpage.conf"
fi

# conf_before is unused on purpose only as a sanity snapshot.
test -n "$conf_before"

echo "launcher tests passed"
