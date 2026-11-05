-- Phone framing for the Kar Page window.
-- Omarchy 4 loads this from the bottom of hyprland.lua:
--   require("hypr.karpage")
-- Install adds that line. It does not add keybinds.
-- Firefox stays class firefox, so these rules do not match it.
-- The launcher frames that window itself.

local home = os.getenv("HOME") or ""
local xdg = os.getenv("XDG_CONFIG_HOME")
if xdg == nil or xdg == "" then
  xdg = home .. "/.config"
end

local function trim(value)
  return (value:gsub("^%s+", ""):gsub("%s+$", ""))
end

local cfg = {
  side = "right",
  opacity = "1.0",
  phone_width = 430,
  phone_height = 932,
  margin = 48,
  rounding = 46,
  border_size = 2,
}

local file = io.open(xdg .. "/karpage/config", "r")
if file then
  for line in file:lines() do
    local raw = trim(line)
    if raw ~= "" and raw:sub(1, 1) ~= "#" then
      local key, value = raw:match("^([%w_]+)%s*=%s*(.*)$")
      if key and value then
        value = trim(value):gsub("^[\"']", ""):gsub("[\"']$", "")
        if key == "side" and (value == "left" or value == "right" or value == "center") then
          cfg.side = value
        elseif key == "opacity" and value:match("^%d+%.?%d*$") then
          local number = tonumber(value)
          if number and number >= 0.85 and number <= 1 then
            cfg.opacity = string.format(number == math.floor(number) and "%.1f" or "%.2f", number)
          end
        elseif key == "phone_width" or key == "phone_height" or key == "margin" or key == "rounding" or key == "border_size" then
          local number = tonumber(value)
          if number and number >= 0 and value:match("^%d+$") then
            cfg[key] = number
          end
        end
      end
    end
  end
  file:close()
end

local class_match = "^(karpage|KarPage|chrome-karpage\\.app.*|brave-karpage\\.app.*|msedge-karpage\\.app.*|vivaldi-karpage\\.app.*)$"

local rules = {
  float = true,
  size = { cfg.phone_width, cfg.phone_height },
  rounding = cfg.rounding,
  rounding_power = 4,
  border_size = cfg.border_size,
  border_color = "rgb(ececec) rgb(2b2b2b)",
  opacity = cfg.opacity .. " override " .. cfg.opacity .. " override",
  tag = "+karpage",
}

local margin = tostring(math.floor(cfg.margin))
if cfg.side == "left" then
  rules.move = { margin, "(monitor_h-window_h)/2" }
elseif cfg.side == "right" then
  rules.move = { "monitor_w-window_w-" .. margin, "(monitor_h-window_h)/2" }
else
  rules.center = true
end

if o and type(o.window) == "function" then
  o.window(class_match, rules)
elseif hl and type(hl.window_rule) == "function" then
  rules.match = { class = class_match }
  hl.window_rule(rules)
end
