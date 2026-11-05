-- Opt-in Kar Page keybinds. Install does not load this file.
-- Add the next line to the bottom of ~/.config/hypr/hyprland.lua:
--   require("hypr.karpage_binds")
--
-- Omarchy uses SUPER+K for its keybindings menu, so these sit on SUPER+SHIFT+K.

local home = os.getenv("HOME") or ""
local bin = home .. "/.local/bin/karpage"

if o and type(o.bind) == "function" then
  o.bind("SUPER + SHIFT + K", "Kar Page", bin .. " open")
  o.bind("SUPER + SHIFT + ALT + K", "Kar Page mode", bin .. " toggle")
  o.bind("SUPER + SHIFT + CTRL + K", "Kar Page side", bin .. " side toggle")
elseif hl and type(hl.bind) == "function" and hl.dsp and type(hl.dsp.exec_cmd) == "function" then
  hl.bind("SUPER + SHIFT + K", hl.dsp.exec_cmd(bin .. " open"), { description = "Kar Page" })
  hl.bind("SUPER + SHIFT + ALT + K", hl.dsp.exec_cmd(bin .. " toggle"), { description = "Kar Page mode" })
  hl.bind("SUPER + SHIFT + CTRL + K", hl.dsp.exec_cmd(bin .. " side toggle"), { description = "Kar Page side" })
end
