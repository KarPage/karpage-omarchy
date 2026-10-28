(function () {
  var NS = "http://www.w3.org/2000/svg";
  var DEFAULT_SINCE = "2026-10-27";
  var SUBTITLE = "built for Omarchy";
  var root = document.getElementById("apps");
  var live = document.getElementById("copy-status");
  var stats = document.getElementById("stats");
  var lede = document.getElementById("lede");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.setAttribute("aria-busy", "true");
  typeSubtitle();

  function svgEl(name, attrs) {
    var el = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function svgRoot() {
    return svgEl("svg", { viewBox: "0 0 32 32", fill: "none" });
  }

  function markKp() {
    var s = svgRoot();
    s.appendChild(svgEl("path", {
      d: "M5 5v22M5 16.2 14 5M5 16.2 14 27",
      stroke: "currentColor",
      "stroke-width": "2.2",
      "stroke-linecap": "square",
      "stroke-linejoin": "miter"
    }));
    s.appendChild(svgEl("path", {
      d: "M18 27V5h7.2a6.2 6.2 0 0 1 0 12.4H18",
      stroke: "currentColor",
      "stroke-width": "2.2"
    }));
    return s;
  }

  function markYear() {
    var s = svgRoot();
    var filled = { "1,0": true, "2,0": true, "0,1": true, "1,2": true, "3,2": true };
    var row;
    var col;
    for (row = 0; row < 3; row += 1) {
      for (col = 0; col < 4; col += 1) {
        s.appendChild(svgEl("rect", {
          x: String(4 + col * 6.4),
          y: String(5.5 + row * 7.2),
          width: "5",
          height: "5.4",
          fill: filled[col + "," + row] ? "currentColor" : "none",
          stroke: "currentColor",
          "stroke-width": "1"
        }));
      }
    }
    return s;
  }

  function markWatch() {
    var s = svgRoot();
    s.appendChild(svgEl("circle", { cx: "16", cy: "16", r: "10.2", stroke: "currentColor", "stroke-width": "1.4" }));
    s.appendChild(svgEl("circle", { cx: "16", cy: "16", r: "5.6", stroke: "currentColor", "stroke-width": "1.2" }));
    s.appendChild(svgEl("circle", { cx: "16", cy: "16", r: "1.5", fill: "currentColor" }));
    s.appendChild(svgEl("path", { d: "M16 16 16 6.1A9.9 9.9 0 0 1 24.6 13.4Z", fill: "currentColor" }));
    return s;
  }

  function markCar() {
    var s = svgRoot();
    s.appendChild(svgEl("path", {
      d: "M4.5 19.5c1-3.6 3-5.4 6-5.4h5.6l2.2-3.2h6.4c2 0 3.4 1.3 4 3l.8 2.4v3.2h-1.7a2.7 2.7 0 0 1-5.2 0h-9.6a2.7 2.7 0 0 1-5.2 0H4.5v-2.8z",
      fill: "currentColor"
    }));
    return s;
  }

  function markLaunch() {
    var s = svgRoot();
    s.appendChild(svgEl("rect", {
      x: "5", y: "7", width: "22", height: "18",
      stroke: "currentColor", "stroke-width": "1.6"
    }));
    s.appendChild(svgEl("path", { d: "M5 12.2h22", stroke: "currentColor", "stroke-width": "1.6" }));
    s.appendChild(svgEl("path", {
      d: "M12 20.2h8M17.2 17.4 20.2 20.2 17.2 23",
      stroke: "currentColor",
      "stroke-width": "1.6",
      "stroke-linecap": "square",
      "stroke-linejoin": "miter"
    }));
    return s;
  }

  function markInitials(name) {
    var parts = name.trim().split(/\s+/).slice(0, 2);
    var letters = parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    var s = svgRoot();
    var text = svgEl("text", {
      x: "16",
      y: "21",
      "text-anchor": "middle",
      "font-size": "11",
      "font-family": "ui-monospace, monospace",
      fill: "currentColor"
    });
    text.textContent = letters || "•";
    s.appendChild(text);
    return s;
  }

  var marks = {
    kp: markKp,
    year: markYear,
    watch: markWatch,
    car: markCar,
    launch: markLaunch
  };

  function typeSubtitle() {
    if (reduceMotion) {
      lede.textContent = SUBTITLE;
      return;
    }
    var index = 0;
    function step() {
      index += 1;
      lede.textContent = SUBTITLE.slice(0, index);
      if (index < SUBTITLE.length) window.setTimeout(step, 46);
    }
    step();
  }

  function parseDay(iso) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var utc = Date.UTC(year, month - 1, day);
    var check = new Date(utc);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return utc;
  }

  function daysUp(iso) {
    var start = parseDay(iso);
    if (start === null) start = parseDay(DEFAULT_SINCE);
    var now = new Date();
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((today - start) / 86400000);
    if (diff < 0) return 0;
    return diff + 1;
  }

  function httpsUrl(value) {
    if (typeof value !== "string") return "";
    try {
      var url = new URL(value);
      if (url.protocol !== "https:") return "";
      return url.href;
    } catch (error) {
      return "";
    }
  }

  function commandText(value) {
    if (typeof value !== "string") return "";
    var text = value.trim();
    if (text === "" || /[\r\n]/.test(text)) return "";
    return text;
  }

  function shotId(value) {
    if (typeof value !== "string") return "";
    if (!/^[a-z0-9-]+$/.test(value)) return "";
    return value;
  }

  function link(href, label) {
    var anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = label;
    return anchor;
  }

  function say(message) {
    live.textContent = "";
    window.setTimeout(function () {
      live.textContent = message;
    }, 20);
  }

  function selectText(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    var selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function copyText(value, name, label, code, button) {
    function done(ok) {
      if (ok) {
        button.textContent = "Copied";
        say("Copied " + label.toLowerCase() + " command for " + name + ".");
      } else {
        selectText(code);
        button.textContent = "Copy";
        say("Could not copy. The command for " + name + " is selected.");
      }
      window.setTimeout(function () {
        button.textContent = "Copy";
      }, 1600);
    }

    function fallback() {
      var area = document.createElement("textarea");
      area.className = "clipboard-sink";
      area.value = value;
      area.setAttribute("readonly", "");
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      document.body.removeChild(area);
      done(ok);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(value).then(function () {
        done(true);
      }).catch(fallback);
      return;
    }
    fallback();
  }

  function logoFor(app) {
    var wrap = document.createElement("div");
    wrap.className = "logo";
    wrap.setAttribute("aria-hidden", "true");
    var key = typeof app.mark === "string" ? app.mark : "";
    var draw = marks[key] || function () { return markInitials(app.name); };
    wrap.appendChild(draw());
    return wrap;
  }

  function shotFor(app) {
    var id = shotId(app.shot);
    if (!id) return null;
    var figure = document.createElement("figure");
    figure.className = "window";
    var caption = document.createElement("figcaption");
    caption.className = "titlebar";
    var dots = document.createElement("span");
    dots.className = "dots";
    dots.setAttribute("aria-hidden", "true");
    var n;
    for (n = 0; n < 3; n += 1) dots.appendChild(document.createElement("span"));
    var title = document.createElement("span");
    title.className = "wintitle";
    title.textContent = app.name.trim();
    caption.appendChild(dots);
    caption.appendChild(title);
    var screen = document.createElement("div");
    screen.className = "screen";
    var picture = document.createElement("picture");
    var source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = "img/" + id + ".webp";
    var img = document.createElement("img");
    img.src = "img/" + id + ".png";
    img.alt = typeof app.shotAlt === "string" && app.shotAlt.trim() !== ""
      ? app.shotAlt.trim()
      : app.name.trim();
    img.loading = "lazy";
    img.decoding = "async";
    img.width = 1280;
    img.height = 800;
    picture.appendChild(source);
    picture.appendChild(img);
    screen.appendChild(picture);
    figure.appendChild(caption);
    figure.appendChild(screen);
    return figure;
  }

  function renderApp(app, index) {
    if (!app || typeof app.name !== "string" || app.name.trim() === "") return null;
    var name = app.name.trim();
    var article = document.createElement("article");
    article.className = "app";
    var titleId = "app-" + index + "-title";
    article.setAttribute("aria-labelledby", titleId);

    var identity = document.createElement("div");
    identity.className = "identity";
    identity.appendChild(logoFor(app));
    var idText = document.createElement("div");
    idText.className = "id-text";
    var head = document.createElement("div");
    head.className = "head";
    var title = document.createElement("h2");
    title.id = titleId;
    title.textContent = name;
    head.appendChild(title);
    if (typeof app.status === "string" && app.status.trim() !== "") {
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = app.status.trim();
      head.appendChild(badge);
    }
    idText.appendChild(head);
    if (typeof app.description === "string" && app.description.trim() !== "") {
      var desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = app.description.trim();
      idText.appendChild(desc);
    }
    identity.appendChild(idText);
    article.appendChild(identity);

    var shot = shotFor(app);
    if (shot) article.appendChild(shot);

    var actions = document.createElement("div");
    actions.className = "actions";
    var openUrl = httpsUrl(app.open);
    if (openUrl) actions.appendChild(link(openUrl, "Open"));

    var panel = document.createElement("div");
    panel.className = "command";
    panel.id = "command-" + index;
    panel.hidden = true;
    var prompt = document.createElement("span");
    prompt.className = "prompt";
    prompt.setAttribute("aria-hidden", "true");
    prompt.textContent = "$";
    var pre = document.createElement("pre");
    var code = document.createElement("code");
    pre.appendChild(code);
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "copy";
    copy.textContent = "Copy";
    panel.appendChild(prompt);
    panel.appendChild(pre);
    panel.appendChild(copy);

    var current = "";
    var currentLabel = "";
    var opener = null;
    var hasCommand = false;

    function setPressed(button, on) {
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.setAttribute("aria-expanded", on ? "true" : "false");
    }

    function closePanel() {
      panel.hidden = true;
      code.textContent = "";
      current = "";
      currentLabel = "";
      if (opener) setPressed(opener, false);
      opener = null;
    }

    function openPanel(button, label, command) {
      if (opener === button && !panel.hidden) {
        closePanel();
        return;
      }
      if (opener && opener !== button) setPressed(opener, false);
      current = command;
      currentLabel = label;
      code.textContent = command;
      panel.hidden = false;
      panel.setAttribute("aria-label", label + " command");
      opener = button;
      setPressed(button, true);
      copy.setAttribute("aria-label", "Copy " + label.toLowerCase() + " command for " + name);
      copy.focus();
      say(label + " command for " + name + ". " + command);
    }

    function addCommand(label, value) {
      var command = commandText(value);
      if (!command) return;
      hasCommand = true;
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-controls", panel.id);
      setPressed(button, false);
      button.addEventListener("click", function () {
        openPanel(button, label, command);
      });
      actions.appendChild(button);
    }

    addCommand("Install", app.install);
    addCommand("Launch", app.launch);
    var source = httpsUrl(app.source);
    if (source) actions.appendChild(link(source, "Source"));

    copy.addEventListener("click", function () {
      if (!current) return;
      copyText(current, name, currentLabel, code, copy);
    });
    panel.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || panel.hidden) return;
      event.preventDefault();
      var back = opener;
      closePanel();
      if (back) back.focus();
    });

    if (actions.childNodes.length) article.appendChild(actions);
    if (hasCommand) article.appendChild(panel);
    return article;
  }

  function setCount(id, value) {
    document.getElementById(id).textContent = String(value);
  }

  function renderStats(since, apps) {
    var counts = { total: 0, live: 0, beta: 0, soon: 0 };
    apps.forEach(function (app) {
      if (!app || typeof app.name !== "string" || app.name.trim() === "") return;
      counts.total += 1;
      var status = typeof app.status === "string" ? app.status.trim().toLowerCase() : "";
      if (status === "web" || status === "marketplace" || status === "public") counts.live += 1;
      else if (status === "private beta") counts.beta += 1;
      else if (status === "coming soon") counts.soon += 1;
    });
    setCount("stat-total", counts.total);
    setCount("stat-live", counts.live);
    setCount("stat-beta", counts.beta);
    setCount("stat-soon", counts.soon);
    setCount("stat-days", daysUp(since));
    stats.setAttribute("aria-busy", "false");
  }

  function normalize(data) {
    if (Array.isArray(data)) return { since: DEFAULT_SINCE, apps: data };
    if (data && Array.isArray(data.apps)) {
      return {
        since: typeof data.since === "string" ? data.since : DEFAULT_SINCE,
        apps: data.apps
      };
    }
    return null;
  }

  function fail() {
    var message = document.createElement("p");
    message.className = "error";
    message.textContent = "Could not load apps.json.";
    root.appendChild(message);
    root.setAttribute("aria-busy", "false");
    stats.setAttribute("aria-busy", "false");
  }

  fetch("apps.json")
    .then(function (response) {
      if (!response.ok) throw new Error("status");
      return response.json();
    })
    .then(function (data) {
      var pack = normalize(data);
      if (!pack) {
        fail();
        return;
      }
      renderStats(pack.since, pack.apps);
      pack.apps.forEach(function (app, index) {
        var article = renderApp(app, index);
        if (article) root.appendChild(article);
      });
      root.setAttribute("aria-busy", "false");
    })
    .catch(fail);
})();
