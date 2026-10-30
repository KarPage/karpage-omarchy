(function () {
  "use strict";
  var OLD = {
    "omaraptor-player": "/omaraptor",
    "oma-year-planner": "/oma-year",
    "kar-page": "/kar-page",
    "kar-page-launcher": "/launcher",
    "omakardash": "/omakardash"
  };
  if (document.body.classList.contains("home")) {
    var dest = OLD[window.location.hash.slice(1)];
    if (dest) window.location.replace(dest);
  }

  var board = document.querySelector(".board");
  if (board) {
    var boxes = board.querySelectorAll(".stat");
    var panels = document.querySelectorAll("[data-panel]");
    var tiles = document.querySelectorAll("#grid > li");
    var reset = document.querySelector(".reset");
    var panel = document.getElementById("panel");
    var pick = function (key) {
      Array.prototype.forEach.call(boxes, function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === key));
      });
      board.classList.toggle("has-active", key !== "");
      Array.prototype.forEach.call(panels, function (p) {
        p.hidden = p.getAttribute("data-panel") !== key;
      });
      Array.prototype.forEach.call(tiles, function (li) {
        li.hidden = key !== "" && (" " + li.getAttribute("data-tags") + " ").indexOf(" " + key + " ") < 0;
      });
      reset.hidden = key === "";
      document.dispatchEvent(new Event("kp:filter"));
    };
    Array.prototype.forEach.call(boxes, function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-filter");
        var on = b.getAttribute("aria-pressed") === "true";
        pick(on ? "" : key);
        if (!on && key === "all") panel.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    });
    reset.addEventListener("click", function () { pick(""); });
  }

  function selectText(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    var sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".copy"), function (button) {
    var code = document.getElementById(button.getAttribute("data-copy"));
    var timer = 0;
    function show(text, ok) {
      button.textContent = text;
      button.classList.toggle("ok", ok);
      window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        button.textContent = "COPY";
        button.classList.remove("ok");
      }, 1600);
    }
    function failed() {
      selectText(code);
      show("SELECTED", false);
    }
    button.addEventListener("click", function () {
      if (!code) return;
      var text = code.textContent;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { show("COPIED", true); }, failed);
      } else {
        failed();
      }
    });
  });

  /* Demo player: click-to-play YouTube facade; nothing loads from YouTube until the visitor plays. */
  var screen = document.querySelector(".demo-screen");
  if (screen) {
    var urlIn = document.getElementById("demo-url");
    var msg = document.querySelector(".demo-msg");
    var stateEl = document.querySelector(".demo-state");
    var idEl = document.querySelector(".demo-id");
    var runs = document.querySelectorAll(".demo-run span");
    var VID = /^[A-Za-z0-9_-]{11}$/;
    var YT = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
    var parseLink = function (raw) {
      var s = String(raw || "").trim(), u, id = null, m;
      if (!s) return { err: "Paste a YouTube link first." };
      if (s.length > 2048 || /\s/.test(s)) return { err: "That doesn't look like a link." };
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s;
      try { u = new URL(s); } catch (x) { return { err: "That doesn't look like a link." }; }
      if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username || u.password || u.port) return { err: "That doesn't look like a link." };
      var h = u.hostname.toLowerCase().replace(/\.$/, ""), path = u.pathname;
      if (h === "youtu.be") {
        m = path.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
        id = m && m[1];
      } else if (YT.indexOf(h) >= 0) {
        if (/^\/watch\/?$/.test(path)) id = u.searchParams.get("v");
        else { m = path.match(/^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})\/?$/); id = m && m[1]; }
      } else {
        return { err: "Only YouTube links play in this web demo. X, Twitch and the other sites work in the real app." };
      }
      if (!id || !VID.test(id)) return { err: "That YouTube link has no valid video ID." };
      var t = u.searchParams.get("t") || u.searchParams.get("start") || "", start = 0;
      m = t.match(/^(\d{1,6})s?$/) || null;
      if (m) start = +m[1];
      else if ((m = t.match(/^(?:(\d{1,2})h)?(?:(\d{1,3})m)?(?:(\d{1,3})s)?$/)) && t) start = (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
      return { id: id, start: start };
    };
    var say = function (text, bad) {
      msg.textContent = text;
      msg.classList.toggle("bad", !!bad);
    };
    var play = function (id, start, label) {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&playsinline=1" + (start ? "&start=" + start : "");
      f.title = "Demo player: " + label;
      f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      f.referrerPolicy = "strict-origin-when-cross-origin";
      screen.replaceChildren(f);
      screen.classList.add("playing");
      screen.removeAttribute("role");
      screen.setAttribute("aria-label", "Demo player: " + label + ". Press Enter to control the video.");
      stateEl.textContent = "PLAYING";
      idEl.textContent = id;
      var line = "▶ NOW · " + label + " // privacy-enhanced embed // the real app plays it in mpv with the full HUD // ";
      Array.prototype.forEach.call(runs, function (r) { r.textContent = line; });
    };
    var fromInput = function () {
      var r = parseLink(urlIn.value);
      if (r.err) { say(r.err, true); return; }
      say("");
      play(r.id, r.start, r.id === screen.getAttribute("data-id") ? screen.getAttribute("data-label") : "youtu.be/" + r.id);
    };
    screen.addEventListener("click", function () {
      var f = screen.querySelector("iframe");
      if (f) { f.focus(); return; }
      var r = parseLink(urlIn.value);
      if (r.err) { r = { id: screen.getAttribute("data-id"), start: 0 }; urlIn.value = "https://www.youtube.com/watch?v=" + r.id; }
      say("");
      play(r.id, r.start, r.id === screen.getAttribute("data-id") ? screen.getAttribute("data-label") : "youtu.be/" + r.id);
    });
    document.querySelector(".demo-go").addEventListener("click", fromInput);
    urlIn.addEventListener("keydown", function (ev) {
      if (ev.isComposing) return;
      if (ev.key === "Enter") { ev.preventDefault(); fromInput(); }
      else if (ev.key === "Escape") { ev.preventDefault(); urlIn.blur(); }
    });
  }

  /* Selection cursor: one box that follows the mouse and the arrow keys. */
  var home = document.body.classList.contains("home");
  var SPEC = home
    ? [".board .stat", "#panel .rows > li", "#grid > li"]
    : [".demo-screen", ".demo-in", ".demo-go", ".acts > .act", ".hero-shot", ".gallery > figure", ".others > li"];
  var groups = [], all = [], cur = null, lastStat = null;
  SPEC.forEach(function (sel, g) {
    var list = [];
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (box) {
      var f = box.matches("a[href], button, [data-kf]") ? box : box.querySelector("a[href], button, input");
      if (!f) return;
      f.setAttribute("data-k", "");
      f.tabIndex = list.length ? -1 : 0;
      var it = { box: box, f: f, g: g };
      list.push(it);
      all.push(it);
    });
    groups.push(list);
  });
  if (!all.length) return;

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var box = document.createElement("div");
  box.className = "kcur";
  box.setAttribute("aria-hidden", "true");
  document.body.appendChild(box);
  document.documentElement.classList.add("kc");

  function shown(it) { return it.box.getClientRects().length > 0; }
  function firstShown(list) {
    for (var i = 0; i < list.length; i++) if (shown(list[i])) return list[i];
    return null;
  }
  function owner(node) {
    for (var i = 0; i < all.length; i++) if (all[i].box === node || all[i].box.contains(node)) return all[i];
    return null;
  }
  var queued = 0;
  function place() {
    queued = 0;
    if (!cur || !shown(cur)) { box.classList.remove("on"); return; }
    var r = cur.box.getBoundingClientRect(), pad = 5;
    box.style.transform = "translate(" + Math.round(r.left + window.scrollX - pad) + "px," + Math.round(r.top + window.scrollY - pad) + "px)";
    box.style.width = Math.round(r.width + pad * 2) + "px";
    box.style.height = Math.round(r.height + pad * 2) + "px";
    box.classList.add("on");
  }
  function later() { if (!queued) queued = window.requestAnimationFrame(place); }
  function setCur(it, focus) {
    cur = it;
    if (home && it.g === 0) lastStat = it;
    groups[it.g].forEach(function (x) { x.f.tabIndex = x === it ? 0 : -1; });
    if (focus && document.activeElement !== it.f) it.f.focus({ preventScroll: true });
    box.classList.remove("idle");
    place();
  }
  function reveal(it) {
    it.box.scrollIntoView({ block: "nearest", inline: "nearest", behavior: still.matches ? "auto" : "instant" });
    place();
  }
  function gap(a1, a2, b1, b2) { return b2 < a1 ? a1 - b2 : b1 > a2 ? b1 - a2 : 0; }
  function move(from, dir) {
    var a = from.box.getBoundingClientRect(), best = null, score = Infinity;
    all.forEach(function (it) {
      if (it === from || !shown(it)) return;
      var b = it.box.getBoundingClientRect(), main, cross, drift;
      if (dir === "l" || dir === "r") {
        main = dir === "r" ? b.left - a.right : a.left - b.right;
        cross = gap(a.top, a.bottom, b.top, b.bottom);
        if (cross > 0) return;
        drift = Math.abs(b.top - a.top);
      } else {
        main = dir === "d" ? b.top - a.bottom : a.top - b.bottom;
        cross = gap(a.left, a.right, b.left, b.right);
        drift = a.width > b.width * 1.5 ? Math.abs(b.left - a.left) : Math.abs(b.left + b.width / 2 - a.left - a.width / 2);
      }
      if (main < -4) return;
      var s = Math.max(main, 0) + cross * 4 + drift * 0.01;
      if (s < score) { score = s; best = it; }
    });
    if (best && best.g === 0 && from.g !== 0 && lastStat && shown(lastStat)) return lastStat;
    return best;
  }
  function refresh() {
    groups.forEach(function (list) {
      var on = null;
      list.forEach(function (x) { if (x.f.tabIndex === 0 && shown(x)) on = x; });
      on = on || firstShown(list);
      list.forEach(function (x) { x.f.tabIndex = x === on ? 0 : -1; });
    });
    if (cur && !shown(cur)) {
      var back = lastStat || firstShown(all);
      if (back) setCur(back, all.some(function (x) { return x.f === document.activeElement; }) || document.activeElement === document.body);
    }
    later();
  }

  document.addEventListener("kp:filter", refresh);
  window.addEventListener("resize", later);
  window.addEventListener("load", later);
  document.addEventListener("transitionend", later);
  document.addEventListener("animationend", later);
  if (window.ResizeObserver) new ResizeObserver(later).observe(document.body);

  document.addEventListener("pointermove", function (ev) {
    if (ev.pointerType !== "mouse") return;
    var it = owner(ev.target);
    if (it && it !== cur) setCur(it, true);
  });
  document.addEventListener("focusin", function (ev) {
    var it = owner(ev.target);
    if (it && it.f === ev.target) { if (it !== cur) setCur(it, false); else box.classList.remove("idle"); }
    else box.classList.add("idle");
  });

  var DIRS = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d" };
  document.addEventListener("keydown", function (ev) {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.isComposing) return;
    var t = ev.target;
    var pass = t && t.id === "demo-url" && (ev.key === "ArrowUp" || ev.key === "ArrowDown");
    if (t && !pass && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var k = ev.key, active = document.activeElement;
    var idle = !active || active === document.body || active === document.documentElement;
    if (!cur || !shown(cur)) cur = firstShown(all);
    if (!cur) return;
    if (DIRS[k]) {
      var next = move(cur, DIRS[k]);
      if (!next && active !== cur.f) next = cur;
      if (!next) return;
      ev.preventDefault();
      setCur(next, true);
      reveal(next);
    } else if (k === "Escape") {
      ev.preventDefault();
      if (!home) { window.location.href = "/"; return; }
      var reset = document.querySelector(".reset");
      if (reset && !reset.hidden) reset.click();
      else if (cur.g !== 0) { var s = lastStat || groups[0][0]; setCur(s, true); reveal(s); }
    } else if (k === "Backspace" && !home) {
      ev.preventDefault();
      window.location.href = "/";
    } else if ((k === "Enter" || k === " ") && active === cur.f && cur.f.hasAttribute("data-kf")) {
      ev.preventDefault();
      cur.f.click();
    } else if ((k === "Enter" && idle) || (k === " " && (idle || (active === cur.f && cur.f.tagName === "A")))) {
      ev.preventDefault();
      setCur(cur, true);
      cur.f.click();
    }
  });

  cur = firstShown(all);
  if (home && cur && cur.g === 0) lastStat = cur;
  place();
  window.requestAnimationFrame(function () { box.classList.add("go"); });
})();
