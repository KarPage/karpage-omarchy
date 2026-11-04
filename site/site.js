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

  // Hero clock: the visitor's own local date and time, beside the H1. Static text
  // refreshed on each minute (shown with reduced motion too). No network.
  (function () {
    var box = document.querySelector(".mast .clock");
    var out = box && box.querySelector("time");
    if (!out) return;
    var D = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    var M = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    var two = function (v) { return (v < 10 ? "0" : "") + v; };
    var timer = 0;
    var tick = function () {
      var d = new Date();
      // Rebuilt as nodes so only the colon blinks (CSS); monospace keeps the width fixed.
      var cc = document.createElement("span");
      cc.className = "cc";
      cc.textContent = ":";
      cc.style.animationDelay = -d.getMilliseconds() + "ms";
      out.textContent = D[d.getDay()] + " " + d.getDate() + " " + M[d.getMonth()] + " " + d.getFullYear() +
        " \u00b7 " + two(d.getHours());
      out.appendChild(cc);
      out.appendChild(document.createTextNode(two(d.getMinutes())));
      out.setAttribute("datetime", d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()) + "T" + two(d.getHours()) + ":" + two(d.getMinutes()));
      window.clearTimeout(timer);
      timer = window.setTimeout(tick, 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
    };
    tick();
    box.classList.add("on");
    document.addEventListener("visibilitychange", function () { if (!document.hidden) tick(); });
  })();

  // Hero subtitle: cycles short terminal-style lines from data-tw (the tagline as a
  // shell comment, then one per app in grid order). The server-rendered tagline is
  // the static fallback (no JS, or prefers-reduced-motion).
  (function () {
    var tw = document.querySelector(".mast .tw[data-tw]");
    var calm = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (!tw || (calm && calm.matches)) return;
    var box = tw.parentNode;
    var cur = tw.querySelector(".cursor");
    var first = tw.textContent;
    var seq = tw.getAttribute("data-tw").split("|").filter(Boolean);
    /* Each line types in about 200 ms and clears at once, so it is never caught mid-word; only the cursor blinks while it holds. */
    var HOLD = 3200, GAP = 120, TYPE = 6;
    var idx = Math.max(0, seq.indexOf(first)), n = seq[idx].length, phase = "hold", timer = 0, stopped = false;
    var fit = function () {
      // Shrink (never grow) so the longest line stays on one line.
      var m = document.createElement("span");
      m.className = "tw p tw-m";
      m.style.fontSize = "1em";
      var longest = seq.reduce(function (a, b) { return b.length > a.length ? b : a; }, "");
      m.textContent = longest + "\u00a0\u00a0";
      box.appendChild(m);
      var w = m.getBoundingClientRect().width;
      box.removeChild(m);
      var room = box.clientWidth - 2;
      if (w > 0 && room > 0) tw.style.setProperty("--twf", Math.min(1, room / w).toFixed(3) + "em");
    };
    var draw = function () {
      // Rebuild the line each frame (fresh nodes, fresh cursor) so the moving
      // cursor never registers as a layout shift.
      var s = seq[idx].slice(0, n);
      while (tw.firstChild) tw.removeChild(tw.firstChild);
      cur = cur.cloneNode(false);
      var c0 = s.charAt(0);
      if (c0 === "/" || c0 === "#") {
        var sl = document.createElement("span");
        sl.className = "sl";
        sl.textContent = c0;
        tw.appendChild(sl);
        s = s.slice(1);
      }
      if (s) tw.appendChild(document.createTextNode(s));
      tw.appendChild(cur);
    };
    var step = function () {
      timer = 0;
      if (stopped || document.hidden) return;
      var wait;
      if (phase === "type") {
        n++;
        draw();
        if (n >= seq[idx].length) { phase = "hold"; tw.classList.remove("k"); wait = HOLD; } else { wait = Math.max(4, Math.min(TYPE, Math.floor(200 / seq[idx].length))); }
      } else {
        n = 0;
        draw();
        phase = "type";
        tw.classList.add("k");
        idx = (idx + 1) % seq.length;
        wait = GAP;
      }
      timer = window.setTimeout(step, wait);
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { window.clearTimeout(timer); timer = 0; }
      else if (!timer && !stopped) timer = window.setTimeout(step, phase === "hold" ? 1200 : TYPE);
    });
    if (calm && calm.addEventListener) {
      calm.addEventListener("change", function (ev) {
        if (!ev.matches) return;
        stopped = true;
        window.clearTimeout(timer);
        timer = 0;
        idx = Math.max(0, seq.indexOf(first));
        n = seq[idx].length;
        tw.classList.remove("k");
        draw();
      });
    }
    // Start from the server-rendered line, hold it, then begin.
    timer = window.setTimeout(step, HOLD);
  })();

  /* Home board: the filter is a bus controller and the app cards are chips on one PCB. Four pads (J1-J4),
     one bus each; 45-degree traces run from each pad to the top pins of every card it powers (left pins on
     phones). Picking a pad sends one pulse down its wires, powers those cards and dims the rest. Moving onto
     a card sends a short pulse back up its own wires to the pads it is on. Reduced motion: no pulses. */
  var pads = document.querySelector(".pads");
  if (pads) (function () {
    var boxes = [].slice.call(pads.querySelectorAll(".pad"));
    var tiles = [].slice.call(document.querySelectorAll("#grid > li"));
    var reset = document.querySelector(".reset");
    var probe = document.getElementById("probe"), pt = probe.querySelector(".probe-t");
    var svg = document.getElementById("tr"), bus = document.querySelector(".bus"), host = svg.parentNode;
    var NS = "http://www.w3.org/2000/svg", SPEED = 1.5, sel = "", wires = [], live = [], heard = false;
    var F = boxes.map(function (b) { return b.getAttribute("data-filter"); });
    var rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    var phone = function () { return window.innerWidth <= 760; };
    var tagged = function (li, f) { return (" " + li.getAttribute("data-tags") + " ").indexOf(" " + f + " ") >= 0; };
    var nameOf = function (li) { var h = li.querySelector("h2"); return h ? h.textContent : ""; };
    window.addEventListener("pointerdown", function () { heard = true; }, true);
    window.addEventListener("keydown", function (ev) { if (ev.isTrusted) heard = true; }, true);
    /* A tiny square-wave blip, like a logic probe. Only after a real key press or tap. */
    var actx = null, blip = function (f, len, vol) {
      if (!heard) return;
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === "suspended") actx.resume();
        var o = actx.createOscillator(), g = actx.createGain(), lp = actx.createBiquadFilter(), t = actx.currentTime;
        o.type = "square"; o.frequency.value = f; lp.type = "lowpass"; lp.frequency.value = 2600;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(lp); lp.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + len + 0.02);
      } catch (e) {}
    };
    tiles.forEach(function (li, n) {
      var p = document.createElement("span");
      p.className = "pins";
      p.setAttribute("aria-hidden", "true");
      F.forEach(function (f) { var i = document.createElement("i"); if (tagged(li, f)) i.className = "w"; p.appendChild(i); });
      li.appendChild(p);
      li.setAttribute("data-hz", String([660, 740, 880, 990, 1180][n % 5]));
    });
    function el(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); return e; }
    function R(e) { var h = host.getBoundingClientRect(), r = e.getBoundingClientRect(); return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height }; }

    /* Route every pad-to-card wire with 45-degree chamfers. Cards below the first row are reached through
       the gutters between cards, so no wire ever crosses a card. */
    function layout() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      wires = [];
      var b = R(bus), vias = {}, C = 6, top = Infinity, gap = 18;
      var rs = tiles.map(function (li) { return R(li); });
      rs.forEach(function (c) { if (c.y < top) top = c.y; });
      if (rs.length > 1) { var g0 = rs[1].x - (rs[0].x + rs[0].w); if (g0 > 0) gap = g0; }
      tiles.forEach(function (li, ci) {
        var c = rs[ci], pinEls = li.querySelectorAll(".pins i");
        F.forEach(function (f, i) {
          if (!tagged(li, f)) return;
          var p = R(boxes[i]), px = Math.round(p.x + p.w / 2), py = Math.round(p.y + p.h), d, pin = pinEls[i];
          if (!phone()) {
            var ly = Math.round(b.y + 16 + i * 14), tx = Math.round(c.x + 18 + i * ((c.w - 36) / 3)), s;
            pin.style.left = (tx - c.x - 4) + "px";
            pin.style.top = "";
            if (c.y < top + 4) {
              s = tx > px ? 1 : -1;
              if (Math.abs(tx - px) < 2 * C) d = "M" + px + " " + py + "V" + ly + "H" + tx + "V" + (c.y - 7);
              else d = "M" + px + " " + py + "V" + (ly - C) + "L" + (px + s * C) + " " + ly + "H" + (tx - s * C) + "L" + tx + " " + (ly + C) + "V" + (c.y - 7);
              vias[px + "," + ly] = [px, ly, f]; vias[tx + "," + ly] = [tx, ly, f];
            } else {
              /* Lower rows: down the gutter to the left of the card, then along the row gap to the pin. */
              var gx = Math.round(c.x - gap / 2 + (i - 1.5) * 3), gy = Math.round(c.y - gap / 2 - 2 + (i - 1.5) * 2), c2 = 3;
              s = gx > px ? 1 : -1;
              d = "M" + px + " " + py + "V" + (ly - C) + "L" + (px + s * C) + " " + ly + "H" + (gx - s * C) + "L" + gx + " " + (ly + C) +
                "V" + (gy - c2) + "L" + (gx + c2) + " " + gy + "H" + (tx - c2) + "L" + tx + " " + (gy + c2) + "V" + (c.y - 7);
              vias[px + "," + ly] = [px, ly, f]; vias[gx + "," + ly] = [gx, ly, f];
            }
          } else {
            /* Phone: one collector per bus, then a vertical lane down the left edge into each card's side pins. */
            var c4 = 4, ly2 = Math.round(b.y + 10 + i * 9), lx = Math.round(c.x - 36 + 3 + i * 7), ty = Math.round(c.y + 14 + i * 11);
            pin.style.top = (ty - c.y - 4) + "px";
            pin.style.left = "";
            d = "M" + px + " " + py + "V" + (ly2 - c4) + "L" + (px - c4) + " " + ly2 + "H" + (lx + c4) + "L" + lx + " " + (ly2 + c4) + "V" + (ty - c4) + "L" + (lx + c4) + " " + ty + "H" + (c.x - 7);
            vias[px + "," + ly2] = [px, ly2, f]; vias[lx + "," + ly2] = [lx, ly2, f];
          }
          var base = el("path", { d: d, "class": "base" });
          svg.appendChild(base);
          wires.push({ f: f, li: li, pin: pin, pad: boxes[i], d: d, base: base, len: base.getTotalLength() });
        });
      });
      Object.keys(vias).forEach(function (k) { var v = vias[k]; svg.appendChild(el("rect", { x: v[0] - 3, y: v[1] - 3, width: 6, height: 6, "class": "via", "data-f": v[2] })); });
      paint(false);
    }
    function overlay(w, cls) { var p = el("path", { d: w.d, "class": cls }); svg.appendChild(p); return p; }
    function clearLive() {
      live.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      live = [];
      [].slice.call(svg.querySelectorAll(".lit, .pulse")).forEach(function (n) { n.parentNode.removeChild(n); });
    }
    /* Which wires are energised, which cards are powered or not connected (NC). */
    function paint(animate) {
      clearLive();
      wires.forEach(function (w) { w.base.classList.toggle("on", !!sel && w.f === sel); w.pin.classList.remove("on"); });
      [].slice.call(svg.querySelectorAll(".via")).forEach(function (v) { v.classList.toggle("on", !!sel && v.getAttribute("data-f") === sel); });
      tiles.forEach(function (li) { li.classList.remove("pwr", "flash"); li.classList.toggle("nc", !!sel && !tagged(li, sel)); });
      if (!sel) return;
      wires.filter(function (w) { return w.f === sel; }).forEach(function (w) {
        var lit = overlay(w, "lit");
        if (!animate || rm.matches || !lit.animate) { w.pin.classList.add("on"); w.li.classList.add("pwr"); return; }
        var dur = w.len / SPEED, seg = 46, pu = overlay(w, "pulse");
        lit.style.strokeDasharray = w.len + " " + w.len;
        pu.style.strokeDasharray = seg + " " + (w.len + seg);
        live.push(lit.animate([{ strokeDashoffset: w.len }, { strokeDashoffset: 0 }], { duration: dur, easing: "linear", fill: "forwards" }));
        var a = pu.animate([{ strokeDashoffset: seg }, { strokeDashoffset: -w.len }], { duration: dur + seg / SPEED, easing: "linear", fill: "forwards" });
        live.push(a);
        var f0 = sel;
        window.setTimeout(function () {
          if (sel !== f0) return;
          w.pin.classList.add("on"); w.li.classList.add("pwr");
          w.li.classList.remove("flash"); void w.li.offsetWidth; w.li.classList.add("flash");
          blip(+w.li.getAttribute("data-hz"), 0.07, 0.03);
        }, dur);
        a.onfinish = function () { if (pu.parentNode) pu.parentNode.removeChild(pu); };
      });
    }
    /* The status line shows only while a bus is lit. */
    function say(text, dim) {
      pt.textContent = text ? text + " " : "";
      if (dim) { var sp = document.createElement("span"); sp.textContent = dim; pt.appendChild(sp); }
      probe.classList.toggle("on", !!sel);
    }
    function status() {
      if (!sel) { say(""); return; }
      var on = tiles.filter(function (li) { return tagged(li, sel); }).map(nameOf);
      say("> bus " + (F.indexOf(sel) + 1) + " · " + boxes[F.indexOf(sel)].getAttribute("data-name"),
        "→ " + on.length + (on.length === 1 ? " app powered: " : " apps powered: ") + on.join(", "));
    }
    var pick = function (key) {
      sel = key;
      boxes.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === key)); });
      pads.classList.toggle("has-active", key !== "");
      reset.hidden = key === "";
      traced = null;
      status();
      if (key) blip(220 + F.indexOf(key) * 55, 0.09, 0.03);
      paint(true);
      document.dispatchEvent(new Event("kp:filter"));
    };
    boxes.forEach(function (b) {
      b.addEventListener("click", function () {
        pick(b.getAttribute("aria-pressed") === "true" ? "" : b.getAttribute("data-filter"));
        var t = document.querySelector(".ktip");
        if (t) t.classList.add("got");
      });
    });
    reset.addEventListener("click", function () { pick(""); });

    /* Learn it: on a card, a pulse runs back up every wire it has and lights those pads. */
    var traced = null;
    function trace(li) {
      if (li === traced) return;
      traced = li;
      [].slice.call(svg.querySelectorAll(".back")).forEach(function (n) { n.parentNode.removeChild(n); });
      boxes.forEach(function (p) { p.classList.remove("ping"); });
      if (!li) { status(); return; }
      var ws = wires.filter(function (w) { return w.li === li; });
      if (sel) say("> " + nameOf(li), "· wired to " + ws.map(function (w) { return "J" + (F.indexOf(w.f) + 1) + " " + w.pad.getAttribute("data-name"); }).join(" · "));
      ws.forEach(function (w) {
        if (rm.matches || !w.base.animate) { w.pad.classList.add("ping"); window.setTimeout(function () { w.pad.classList.remove("ping"); }, 600); return; }
        var bk = overlay(w, "back"), seg = 30, dur = w.len / (SPEED * 1.6);
        bk.style.strokeDasharray = seg + " " + (w.len + seg);
        var a = bk.animate([{ strokeDashoffset: -w.len }, { strokeDashoffset: seg }], { duration: dur, easing: "linear", fill: "forwards" });
        a.onfinish = function () {
          if (bk.parentNode) bk.parentNode.removeChild(bk);
          w.pad.classList.add("ping");
          window.setTimeout(function () { w.pad.classList.remove("ping"); }, 600);
        };
      });
    }
    document.addEventListener("kp:cur", function (ev) {
      var e = ev.detail;
      trace(e && e.parentNode && e.parentNode.id === "grid" ? e : null);
    });
    /* 1-4 light a bus straight away. */
    document.addEventListener("keydown", function (ev) {
      if (!/^[1-4]$/.test(ev.key) || ev.altKey || ev.ctrlKey || ev.metaKey || ev.defaultPrevented) return;
      var t = ev.target;
      if (document.documentElement.classList.contains("lb-on") || (t && t.closest && t.closest("input, textarea, select, [contenteditable]"))) return;
      var b = boxes[+ev.key - 1];
      if (!b) return;
      ev.preventDefault();
      b.focus({ preventScroll: true });
      b.click();
    });

    var rt = 0;
    var relayout = function () { window.clearTimeout(rt); rt = window.setTimeout(layout, 60); };
    window.addEventListener("resize", relayout);
    window.addEventListener("load", relayout);
    if (window.ResizeObserver) { var ro = new ResizeObserver(relayout); ro.observe(document.getElementById("grid")); ro.observe(pads); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
    layout();
    window.__trace = { state: function () { return { sel: sel, wires: wires.length, pwr: tiles.filter(function (c) { return c.classList.contains("pwr"); }).length, nc: tiles.filter(function (c) { return c.classList.contains("nc"); }).length }; } };
  })();

  /* Shared key caps: every keyboard hint on the site is built from these. KCAP(groups) returns a .keys row;
     each group is [[label, key], ...] plus a caption. Caps press down (and click) while their key is held. */
  var KMAP = { "\u2190": "ArrowLeft", "\u2191": "ArrowUp", "\u2193": "ArrowDown", "\u2192": "ArrowRight", "ESC": "Escape", "TAB": "Tab", "\u21b5": "Enter", "PGUP": "PageUp", "PGDN": "PageDown", "T": "t", "?": "?", "+": "+", "\u2212": "-", "BACKSPACE": "Backspace", "SPACE": " ", "1": "1", "2": "2", "3": "3", "4": "4" };
  var kcap = function (label) {
    var k = KMAP[label];
    return '<kbd' + (label.length > 1 ? ' class="w"' : "") + (k ? ' data-key="' + (k === " " ? " " : k) + '"' : "") + ">" + label + "</kbd>";
  };
  window.KCAP = function (groups, cls) {
    return '<p class="keys' + (cls ? " " + cls : "") + '" aria-hidden="true">' + groups.map(function (g) {
      return '<span class="kg">' + g[0].map(kcap).join("") + (g[1] ? "<em>" + g[1] + "</em>" : "") + "</span>";
    }).join("") + "</p>";
  };
  window.KCAPS = function (text) { return text.split(" ").map(function (t) { return t === "/" || t === "+" && false ? '<span class="kor">' + t + "</span>" : t === "/" ? '<span class="kor">/</span>' : kcap(t); }).join(""); };
  /* A short dry key click, synthesised (no file, no network). Only after a real key press or click. */
  var actx = null, clickSnd = function (dull) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var n = Math.floor(actx.sampleRate * 0.018), buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
      var src = actx.createBufferSource(), bp = actx.createBiquadFilter(), g = actx.createGain();
      bp.type = "bandpass"; bp.frequency.value = dull ? 700 : 2400; bp.Q.value = 1.2; g.gain.value = dull ? 0.1 : 0.18;
      src.buffer = buf; src.connect(bp); bp.connect(g); g.connect(actx.destination); src.start();
    } catch (e) {}
  };

  /* Keycap hints light up while their real key is held. Looked up live, so caps in overlays work too. */
  var caps = { get length() { return 1; } };
  if (caps.length) {
    var allCaps = function () { return document.querySelectorAll(".keys kbd[data-key]"); };
    var at = {};
    var wallKey = null;
    var wallCaps = function (key) {
      var any = false;
      Array.prototype.forEach.call(allCaps(), function (k) {
        if (k.getAttribute("data-key") !== key || !k.getClientRects().length) return;
        any = true; k.classList.remove("hit", "kwall"); void k.offsetWidth; k.classList.add("kwall");
        window.setTimeout(function () { k.classList.remove("kwall"); }, 300);
      });
      if (any) clickSnd(true);
    };
    /* Shared wall cue: an arrow key that cannot move any further. One class, a short rose flash, no movement. */
    var wallT = new WeakMap();
    window.KWALL = function (el, key) {
      if (key) wallKey = key;
      [].concat(el).forEach(function (e) {
        if (!e || !e.classList) return;
        e.classList.remove("kwall"); void e.offsetWidth; e.classList.add("kwall");
        window.clearTimeout(wallT.get(e));
        wallT.set(e, window.setTimeout(function () { e.classList.remove("kwall"); }, 300));
      });
    };
    var lit = function (key, on) {
      var hitAny = false;
      Array.prototype.forEach.call(allCaps(), function (k) {
        var dk = k.getAttribute("data-key");
        if (dk !== key && !(dk === "t" && key === "T")) return;
        if (!k.getClientRects().length) return;
        if (on) { if (!k.classList.contains("hit")) hitAny = true; at[key] = Date.now(); k.classList.add("hit"); return; }
        window.setTimeout(function () { k.classList.remove("hit"); }, Math.max(0, 160 - (Date.now() - (at[key] || 0))));
      });
      if (hitAny) clickSnd();
    };
    /* The ENTER / SPACE cap shows whichever of the two was pressed last (ENTER until then). */
    var sw = document.querySelectorAll(".keys .ksw");
    var typing = function (t) { return t && t.closest && t.closest("input, textarea, select, [contenteditable]"); };
    /* Capture on window, registered before the overlays, so caps inside dialogs light up too. */
    window.addEventListener("keydown", function (ev) {
      if (typing(ev.target)) return;
      if (ev.key === " " || ev.key === "Enter") {
        Array.prototype.forEach.call(sw, function (w) { w.classList.toggle("sp", ev.key === " "); });
      }
      /* Arrows wait until every handler ran, so a blocked move (KWALL) shows a rose cap instead of a press. */
      if (/^Arrow/.test(ev.key)) { var ak = ev.key; wallKey = null; window.setTimeout(function () { if (wallKey === ak) wallCaps(ak); else lit(ak, true); }, 0); }
      else lit(ev.code === "Slash" && ev.shiftKey ? "?" : ev.key, true);
    }, true);
    window.addEventListener("keyup", function (ev) { lit(ev.code === "Slash" || ev.key === "?" ? "?" : ev.key, false); }, true);
    window.addEventListener("blur", function () { Array.prototype.forEach.call(allCaps(), function (k) { k.classList.remove("hit"); }); });
    /* Inside a dialog a cap is also a button: a click presses its key. */
    document.addEventListener("click", function (ev) {
      var k = ev.target.closest && ev.target.closest(".ck .keys kbd[data-key]");
      if (!k) return;
      var key = k.getAttribute("data-key");
      window.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
      window.setTimeout(function () { window.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true })); }, 120);
    });
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

  /* Real-app screen recording: muted, looping, plays only while on screen.
     Visitors who prefer reduced motion get the poster only. */
  var reel = document.querySelector("video.reel");
  if (reel) {
    var calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    var seen = !("IntersectionObserver" in window), want = null;
    var sync = function () {
      if (want === false || (want === null && (calm.matches || !seen))) { reel.pause(); return; }
      reel.muted = true;
      var p = reel.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (!seen) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; sync(); }, { threshold: 0.2 }).observe(reel);
    if (calm.addEventListener) calm.addEventListener("change", sync);
    sync();
    /* Keyboard: the reel is a stop in the page cursor; Enter or Space toggles play/pause and wins over autoplay. */
    reel.tabIndex = -1;
    reel.setAttribute("data-kf", "");
    reel.addEventListener("click", function (ev) { if (ev.detail === 0) { want = reel.paused; sync(); } });
  }

  /* Screenshot lightbox: a real <a href> to the full image stays as the no-JS fallback; with JS a click opens
     the shot in a see-through glass overlay. Esc, the X, a click outside or a vertical swipe closes; Left/Right or a sideways swipe step through. */
  var shotLinks = Array.prototype.filter.call(document.querySelectorAll("figure.frame > a[href]"), function (a) {
    return a.querySelector("img");
  });
  if (shotLinks.length) {
    var lb = document.createElement("div");
    lb.className = "lb";
    lb.hidden = true;
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", "Screenshot viewer");
    lb.innerHTML = '<figure class="frame lb-frame"><img class="lb-img" alt=""><figcaption class="lb-cap"><span class="lb-n"></span><span class="lb-t"></span></figcaption></figure>' +
      '<button class="lb-btn lb-x" type="button" aria-label="Close">\u2715</button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="Previous screenshot">\u2190</button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="Next screenshot">\u2192</button>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector(".lb-img"), lbN = lb.querySelector(".lb-n"), lbT = lb.querySelector(".lb-t");
    var lbX = lb.querySelector(".lb-x"), lbPrev = lb.querySelector(".lb-prev"), lbNext = lb.querySelector(".lb-next");
    var lbAt = -1, lbBack = null;
    if (shotLinks.length < 2) { lbPrev.hidden = true; lbNext.hidden = true; }
    var lbShow = function (i) {
      lbZReset(false);
      lbAt = (i + shotLinks.length) % shotLinks.length;
      var a = shotLinks[lbAt], img = a.querySelector("img"), cap = a.parentNode.querySelector("figcaption");
      lbImg.src = a.getAttribute("href");
      lbImg.alt = img.getAttribute("alt") || "";
      lbImg.width = img.getAttribute("width") || 0;
      lbImg.height = img.getAttribute("height") || 0;
      lbN.textContent = (lbAt + 1) + " / " + shotLinks.length;
      lbT.textContent = cap ? cap.textContent : (img.getAttribute("alt") || "");
    };
    var lbOpen = function (i) {
      lbBack = document.activeElement;
      lbShow(i);
      var sw = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty("--sbw", sw + "px");
      document.documentElement.classList.add("lb-on");
      lb.hidden = false;
      lbX.focus({ preventScroll: true });
    };
    var lbClose = function () {
      if (lb.hidden) return;
      lb.hidden = true;
      document.documentElement.classList.remove("lb-on");
      lbZReset(false);
      lbImg.removeAttribute("src");
      lbFrame.style.transition = lbFrame.style.transform = lbFrame.style.opacity = "";
      if (lbBack && lbBack.focus) lbBack.focus({ preventScroll: true });
      lbBack = null;
    };
    shotLinks.forEach(function (a, i) {
      a.addEventListener("click", function (ev) {
        if (ev.button || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
        ev.preventDefault();
        lbOpen(i);
      });
    });
    lbX.addEventListener("click", lbClose);
    lbPrev.addEventListener("click", function () { lbShow(lbAt - 1); });
    lbNext.addEventListener("click", function () { lbShow(lbAt + 1); });
    lb.addEventListener("click", function (ev) {
      if (ev.target === lb) lbClose();
    });
    window.addEventListener("keydown", function (ev) {
      if (lb.hidden) return;
      var k = ev.key;
      if (k === "Escape") { ev.preventDefault(); ev.stopPropagation(); lbClose(); }
      else if (k === "ArrowLeft" && shotLinks.length > 1) { ev.preventDefault(); ev.stopPropagation(); lbShow(lbAt - 1); }
      else if (k === "ArrowRight" && shotLinks.length > 1) { ev.preventDefault(); ev.stopPropagation(); lbShow(lbAt + 1); }
      else if (k === "Tab") {
        var f = [lbX, lbPrev, lbNext].filter(function (b) { return !b.hidden; });
        var at = f.indexOf(document.activeElement);
        ev.preventDefault();
        f[(at + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      } else {
        /* Keep the page cursor and its Esc/Backspace shortcuts quiet while the viewer is open. */
        if (k === "ArrowUp" || k === "ArrowDown" || k === "Backspace") ev.preventDefault();
        ev.stopPropagation();
      }
    }, true);
    document.addEventListener("focusin", function (ev) {
      if (!lb.hidden && !lb.contains(ev.target)) lbX.focus({ preventScroll: true });
    });

    /* Touch swipes: left/right steps (wrapping like the arrows), up/down closes. One finger only; a second
       finger cancels. The frame follows the finger and snaps back under the threshold, unless reduced motion. */
    var lbFrame = lb.querySelector(".lb-frame"), lbCalm = window.matchMedia("(prefers-reduced-motion: reduce)");
    var lbPtrs = {}, lbPtrN = 0, lbDrag = null, lbSwipedAt = 0;
    var lbMove = function (x, y, fade, ease) {
      if (lbCalm.matches) return;
      lbFrame.style.transition = ease ? "transform 160ms ease-out, opacity 160ms ease-out" : "none";
      lbFrame.style.transform = x || y ? "translate3d(" + x + "px," + y + "px,0)" : "";
      lbFrame.style.opacity = fade < 1 ? String(fade) : "";
    };
    var lbDragEnd = function (snap) {
      lbDrag = null;
      if (snap) lbMove(0, 0, 1, true); else lbMove(0, 0, 1, false);
    };
    lb.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse") return;
      lbPtrs[ev.pointerId] = 1; lbPtrN++;
      if (lbPtrN > 1) { if (lbDrag) lbDragEnd(true); return; }
      if (ev.target.closest && ev.target.closest(".lb-btn")) return;
      if (lbZ.s > 1) return;
      lbDrag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: ev.timeStamp, axis: "" };
    });
    lb.addEventListener("pointermove", function (ev) {
      if (!lbDrag || ev.pointerId !== lbDrag.id) return;
      var dx = ev.clientX - lbDrag.x, dy = ev.clientY - lbDrag.y;
      if (!lbDrag.axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        lbDrag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        try { lb.setPointerCapture(ev.pointerId); } catch (e) {}
      }
      if (lbDrag.axis === "x") lbMove(shotLinks.length > 1 ? dx * 0.6 : dx * 0.2, 0, 1, false);
      else if (lbDrag.axis === "y") lbMove(0, dy * 0.6, Math.max(0.35, 1 - Math.abs(dy) / 400), false);
    });
    var lbPtrUp = function (ev) {
      if (lbPtrs[ev.pointerId]) { delete lbPtrs[ev.pointerId]; lbPtrN = Math.max(0, lbPtrN - 1); }
      if (!lbDrag || ev.pointerId !== lbDrag.id) return;
      var d = lbDrag, dx = ev.clientX - d.x, dy = ev.clientY - d.y, ax = Math.abs(dx), ay = Math.abs(dy);
      var dt = Math.max(1, ev.timeStamp - d.t), flick = dt < 250;
      if (ev.type === "pointercancel" || !d.axis) { lbDragEnd(true); return; }
      lbSwipedAt = Date.now();
      if (d.axis === "x" && shotLinks.length > 1 && ax > ay * 1.5 && (ax >= 50 || (flick && ax >= 25))) {
        lbDragEnd(false);
        lbShow(lbAt + (dx < 0 ? 1 : -1));
      } else if (d.axis === "y" && ay > ax && (ay >= 80 || (flick && ay >= 40))) {
        lbDragEnd(false);
        lbClose();
      } else lbDragEnd(true);
    };
    lb.addEventListener("pointerup", lbPtrUp);
    lb.addEventListener("pointercancel", lbPtrUp);
    /* A drag is not a tap: swallow the click a swipe leaves behind so it can't close the viewer. */
    lb.addEventListener("click", function (ev) {
      if (Date.now() - lbSwipedAt < 400) { ev.stopPropagation(); ev.preventDefault(); }
    }, true);

    /* Zoom on the open shot only: two fingers pinch around their midpoint (1x to 5x), one finger pans while
       zoomed, a double-tap (or a mouse double-click) zooms in at that point or back out. Swipes step or close
       only at 1x. A slide change or closing resets to 1x. The image stays inside the screen edges. */
    lbImg.draggable = false;
    var lbZ = { s: 1, x: 0, y: 0 }, lbZP = {}, lbZG = null, lbZMulti = false, lbTap = null, lbTapZoomAt = 0;
    var lbZApply = function (ease) {
      lbImg.style.transition = ease && !lbCalm.matches ? "transform 200ms ease-out" : "none";
      lbImg.style.transform = lbZ.s > 1 ? "translate3d(" + lbZ.x + "px," + lbZ.y + "px,0) scale(" + lbZ.s + ")" : "";
      lb.classList.toggle("lb-zoomed", lbZ.s > 1);
    };
    var lbZReset = function (ease) {
      lbZ.s = 1; lbZ.x = 0; lbZ.y = 0; lbZP = {}; lbZG = null; lbZMulti = false; lbTap = null;
      lbZApply(ease);
    };
    var lbBase = function () {
      var r = lbImg.getBoundingClientRect();
      return { l: r.left - lbZ.x, t: r.top - lbZ.y, w: r.width / lbZ.s, h: r.height / lbZ.s };
    };
    var lbFit = function (pos, size, room) {
      return size > room ? Math.min(0, Math.max(room - size, pos)) : Math.min(room - size, Math.max(0, pos));
    };
    var lbClamp = function (b) {
      if (lbZ.s <= 1) { lbZ.s = 1; lbZ.x = 0; lbZ.y = 0; return; }
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      lbZ.x = lbFit(b.l + lbZ.x, b.w * lbZ.s, vw) - b.l;
      lbZ.y = lbFit(b.t + lbZ.y, b.h * lbZ.s, vh) - b.t;
    };
    /* Scale to s keeping the image point that sat under (cx, cy) at (mx, my), from the state in g. */
    var lbZTo = function (g, s, cx, cy, mx, my) {
      var px = (cx - g.b.l - g.x) / g.s, py = (cy - g.b.t - g.y) / g.s;
      lbZ.s = Math.max(1, Math.min(5, s));
      lbZ.x = mx - g.b.l - lbZ.s * px;
      lbZ.y = my - g.b.t - lbZ.s * py;
      lbClamp(g.b);
    };
    var lbZStart = function () {
      var ids = Object.keys(lbZP), b = lbBase();
      if (ids.length >= 2) {
        var p = lbZP[ids[0]], q = lbZP[ids[1]];
        lbZMulti = true;
        lbZG = { pinch: true, a: ids[0], c: ids[1], d: Math.max(1, Math.hypot(q.x - p.x, q.y - p.y)), mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2, s: lbZ.s, x: lbZ.x, y: lbZ.y, b: b };
      } else if (ids.length === 1 && lbZ.s > 1) {
        var o = lbZP[ids[0]];
        lbZG = { pinch: false, a: ids[0], px: o.x, py: o.y, s: lbZ.s, x: lbZ.x, y: lbZ.y, b: b };
      } else lbZG = null;
    };
    var lbZToggle = function (cx, cy) {
      if (lbZ.s > 1) { lbZ.s = 1; lbZ.x = 0; lbZ.y = 0; }
      else lbZTo({ s: 1, x: 0, y: 0, b: lbBase() }, 2.5, cx, cy, cx, cy);
      lbZApply(true);
    };
    lb.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" && (ev.button || lbZ.s <= 1)) return;
      if (ev.target.closest && ev.target.closest(".lb-btn")) return;
      lbZP[ev.pointerId] = { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, t0: ev.timeStamp };
      lbZStart();
      if (lbZG) { try { lb.setPointerCapture(ev.pointerId); } catch (e) {} }
    });
    lb.addEventListener("pointermove", function (ev) {
      var o = lbZP[ev.pointerId];
      if (!o) return;
      o.x = ev.clientX; o.y = ev.clientY;
      var g = lbZG;
      if (!g) return;
      if (g.pinch) {
        var p = lbZP[g.a], q = lbZP[g.c];
        if (!p || !q) return;
        lbZTo(g, g.s * Math.hypot(q.x - p.x, q.y - p.y) / g.d, g.mx, g.my, (p.x + q.x) / 2, (p.y + q.y) / 2);
      } else {
        lbZ.x = g.x + o.x - g.px; lbZ.y = g.y + o.y - g.py;
        lbClamp(g.b);
      }
      if (Math.abs(o.x - o.x0) > 6 || Math.abs(o.y - o.y0) > 6) lbSwipedAt = Date.now();
      lbZApply(false);
    });
    var lbZUp = function (ev) {
      var o = lbZP[ev.pointerId];
      if (!o) return;
      delete lbZP[ev.pointerId];
      var left = Object.keys(lbZP).length;
      if (ev.type === "pointerup" && ev.pointerType !== "mouse" && !lbZMulti && !left && ev.target === lbImg &&
          Math.abs(o.x - o.x0) < 10 && Math.abs(o.y - o.y0) < 10 && ev.timeStamp - o.t0 < 300) {
        if (lbTap && ev.timeStamp - lbTap.t < 320 && Math.abs(o.x - lbTap.x) < 30 && Math.abs(o.y - lbTap.y) < 30) {
          lbTap = null; lbTapZoomAt = Date.now();
          lbZToggle(o.x, o.y);
        } else lbTap = { t: ev.timeStamp, x: o.x, y: o.y };
      }
      if (!left) lbZMulti = false;
      if (lbZ.s < 1.05 && lbZ.s > 1) { lbZ.s = 1; lbZ.x = 0; lbZ.y = 0; lbZApply(true); }
      lbZStart();
    };
    lb.addEventListener("pointerup", lbZUp);
    lb.addEventListener("pointercancel", lbZUp);
    lbImg.addEventListener("dblclick", function (ev) {
      ev.preventDefault();
      if (Date.now() - lbTapZoomAt < 600) return;
      lbZToggle(ev.clientX, ev.clientY);
    });
  }

  /* No page zoom: the viewport meta covers most browsers, but iOS Safari ignores user-scalable, so its pinch
     gestures and any multi-finger move are cancelled here (the screenshot viewer zooms itself with pointer events).
     Images can't be dragged out or long-pressed to save. Deterrence only: a screenshot can't be blocked. */
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (t) {
    document.addEventListener(t, function (ev) { ev.preventDefault(); }, { passive: false });
  });
  document.addEventListener("touchmove", function (ev) { if (ev.touches && ev.touches.length > 1) ev.preventDefault(); }, { passive: false });
  /* Casual copy lockdown, site-wide: no text selection, copy, cut, long-press menu or drag. Links, buttons,
     keyboard steps and focus outlines are untouched. The install commands stay copyable (their COPY button and
     selecting inside the code block) because copying them is the point. */
  var inCode = function (n) {
    var el = n && (n.nodeType === 1 ? n : n.parentElement);
    return !!(el && el.closest && el.closest(".code pre"));
  };
  var noCopy = function (ev) {
    if (ev.type === "copy" || ev.type === "cut") {
      var sel = window.getSelection && window.getSelection();
      if (sel && sel.rangeCount && inCode(sel.anchorNode) && inCode(sel.focusNode)) return;
    } else if (ev.type === "contextmenu" && inCode(ev.target)) return;
    ev.preventDefault();
  };
  ["copy", "cut", "contextmenu", "dragstart"].forEach(function (t) { document.addEventListener(t, noCopy); });
  Array.prototype.forEach.call(document.querySelectorAll("img"), function (i) { i.draggable = false; });

  /* Kar Page live frame. Outside the app a thin jade tint covers it with an [ENTER] cap; Enter or a click lifts
     the tint and gives the keys to the app. The app is another origin (karpage.app), so once it has focus this
     page hears no keys at all, Esc included, and the app keeps Tab to itself. Ways back without touching the app:
     a click anywhere outside, or the CLICK cap beside it. If the app ever posts {type: "kp:escape"} to its parent, Esc works too and the tag says so. */
  Array.prototype.forEach.call(document.querySelectorAll(".live-phone"), function (v) {
    var f = v.querySelector("iframe");
    if (!f) return;
    var esc = false;
    var tint = document.createElement("div");
    tint.className = "live-tint";
    tint.innerHTML = KCAP([[["\u21b5"], "to enter"]], "lt-k");
    v.appendChild(tint);
    var tag = document.createElement("span");
    tag.className = "live-x";
    var tagText = function () {
      tag.innerHTML = esc ? KCAP([[["ESC"], "leave the app"]]) :
        '<p class="keys" aria-hidden="true"><span class="kg"><kbd class="w lv">CLICK</kbd><em>here or outside to leave</em></span></p>';
    };
    tagText();
    v.appendChild(tag);
    var on = false;
    var enter = function () { on = true; v.classList.add("in-app"); f.focus(); };
    var leave = function (refocus) {
      on = false; v.classList.remove("in-app");
      if (refocus) v.focus({ preventScroll: true });
    };
    tint.addEventListener("click", function (ev) { ev.stopPropagation(); enter(); });
    tag.addEventListener("click", function (ev) { ev.stopPropagation(); leave(true); });
    v.addEventListener("click", function (ev) { if (ev.target === v) enter(); });
    v.addEventListener("keydown", function (ev) {
      if (ev.target !== v || ev.key !== "Enter" || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      ev.preventDefault(); ev.stopPropagation(); enter();
    }, false);
    /* Focus moved into the frame some other way (Tab into it, a click on a tile through a gap): treat as entered. */
    window.addEventListener("blur", function () { window.setTimeout(function () { if (document.activeElement === f && !on) { on = true; v.classList.add("in-app"); } }, 0); });
    /* Any focus back on this page while inside means the user left: Tab/Shift+Tab out of the app, or a click elsewhere. */
    document.addEventListener("focusin", function (ev) {
      if (!on || ev.target === f) return;
      leave(false);
      if (ev.target === v || !v.contains(ev.target)) { if (ev.target !== document.body) v.focus({ preventScroll: true }); }
    });
    window.addEventListener("focus", function () { if (on && document.activeElement !== f) leave(true); });
    document.addEventListener("pointerdown", function (ev) { if (on && !v.contains(ev.target)) window.setTimeout(function () { leave(true); }, 0); });
    window.addEventListener("message", function (ev) {
      if (ev.origin !== "https://karpage.app" || ev.source !== f.contentWindow) return;
      var d = ev.data;
      if (d === "kp:escape" || (d && d.type === "kp:escape")) { if (!esc) { esc = true; tagText(); } leave(true); }
    });
  });
  /* OPEN FULL APP and OPEN KARPAGE.APP are links styled as buttons, so Space and Shift+Space press it too (Enter already does). */
  Array.prototype.forEach.call(document.querySelectorAll(".live-open, .btn-open"), function (a) {
    a.addEventListener("keydown", function (ev) {
      if (ev.key !== " " || ev.altKey || ev.ctrlKey || ev.metaKey || ev.repeat) return;
      ev.preventDefault();
      ev.stopPropagation();
      a.click();
    });
  });

  var home = document.body.classList.contains("home");
  var still = matchMedia("(prefers-reduced-motion: reduce)");

  /* Home quirks, all keyboard-discoverable (focus hints on the cursor) and clickable:
     the clock opens a big clock and month calendar, the title glitches, the prompt re-runs ls,
     and the corner ? cap opens the key map. ASCII only and monospace, so nothing changes size (zero layout shift). */
  if (home) (function () {
    var two = function (v) { return (v < 10 ? "0" : "") + v; };
    var mark = function (el, hint, at, labelled) {
      el.setAttribute("data-kf", "");
      el.setAttribute("data-khint", labelled ? hint : "\u21b5");
      el.setAttribute(labelled ? "data-khint-l" : "data-khint-q", "");
      el.setAttribute("data-khint-at", at);
    };

    /* 1. Clock -> big clock and month calendar. */
    var ck = document.querySelector(".mast .clock");
    if (ck) {
      ck.removeAttribute("aria-hidden");
      ck.setAttribute("role", "button");
      ck.setAttribute("aria-haspopup", "dialog");
      ck.setAttribute("aria-label", "Local time. Open the clock and calendar");
      ck.tabIndex = -1;
      mark(ck, "\u21b5 expand", "b");
      var DAY = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      var MON = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      var ov = document.createElement("div");
      ov.className = "ck";
      ov.hidden = true;
      ov.setAttribute("role", "dialog");
      ov.setAttribute("aria-modal", "true");
      ov.setAttribute("aria-label", "Local time and calendar");
      /* Mini Oma Year board: one row per month, days 1-31 across, like the Oma Year Planner. */
      var ybHTML = function () {
        var h = '<div class="yb-h" aria-hidden="true"><i></i>';
        for (var d = 1; d <= 31; d++) h += "<span>" + (d === 1 || d % 5 === 0 ? d : "") + "</span>";
        h += "</div>";
        for (var m = 0; m < 12; m++) {
          h += '<div class="yb-r" data-m="' + m + '"><b>' + MON[m].slice(0, 3) + "</b>";
          for (var dd = 1; dd <= 31; dd++) h += '<span class="yb-d" data-m="' + m + '" data-d="' + dd + '"></span>';
          h += "</div>";
        }
        return h;
      };
      var cells = "";
      for (var c = 0; c < 42; c++) cells += '<span class="ck-d" role="gridcell" id="ckd' + c + '"></span>';
      ov.innerHTML = '<div class="ck-box"><div class="ck-top"><span class="ck-l"><svg class="kpm-l" viewBox="0 0 2500 4172" width="16.8" height="28" aria-hidden="true" focusable="false"><use href="#kpm"/></svg><span class="ck-lt">WORLD CLOCK</span></span><div class="ck-cs"><span class="ck-csl" role="tablist" tabindex="0" aria-label="Cities. Left and Right switch city.">' + ["LOCAL", "NYC", "LDN", "SOF", "DXB", "TYO", "SYD"].map(function (c, i) { return '<button type="button" tabindex="-1" class="ck-cb" data-c="' + i + '">' + c + "</button>"; }).join("") + '</span></div><button class="ck-x" type="button" aria-label="Close">\u2715</button></div>' +
        '<div class="ck-face" tabindex="0" role="button" aria-label="Clock. Space or Enter shows the next world city."><p class="ck-time"><span class="ck-hm"></span><span class="ck-s"></span></p><p class="ck-date"></p><p class="ck-off"><span class="o1"></span><span class="o2"></span><span class="o3"></span><span class="o4"></span></p>' +
        '<span class="ck-hint">' + KCAP([[["SPACE"], "city"]], "ck-hi") + '</span></div>' +
        '<div class="ck-mh"><button class="ck-nav ck-prev" type="button" aria-label="Previous month">\u2190</button><span class="ck-yl">YEAR PLANNER</span><b class="ck-m" aria-live="polite"></b><span class="ck-dl2"></span><button class="ck-nav ck-next" type="button" aria-label="Next month">\u2192</button></div>' +
        '<div class="ck-wd" aria-hidden="true"><span>su</span><span>mo</span><span>tu</span><span>we</span><span>th</span><span>fr</span><span>sa</span></div>' +
        '<div class="ck-grid" role="grid" tabindex="0" aria-label="Month">' + cells + '</div>' +
        '<div class="ck-ms" role="group" aria-label="Months">' + MON.map(function (n, i) { return '<button type="button" class="ck-mb" data-m="' + i + '">' + n.slice(0, 3) + '</button>'; }).join("") + '</div>' +
        '<div class="ck-yb" role="grid" tabindex="0" aria-label="Year">' + ybHTML() + '</div>' +
        '<div class="ck-stat"><p class="ck-foot"></p><p class="ck-yr"><span class="ck-bar" aria-hidden="true"></span><b class="ck-pct"></b></p></div>' +
        '<dl class="ck-cells">' +
        '<div class="ck-c"><dt>MOON</dt><dd><svg class="ck-moon" viewBox="0 0 11 11" aria-hidden="true" focusable="false"></svg><span class="ck-mn"></span><small class="ck-mi"></small></dd></div>' +
        '<div class="ck-c"><dt>SUN <i class="ck-sq"></i></dt><dd><span class="ck-sun"></span><small class="ck-dl"></small></dd></div>' +
        '<div class="ck-c"><dt>LUNAR YEAR</dt><dd><span class="ck-zo"></span><small class="ck-zs"></small></dd></div>' +
        '<div class="ck-c"><dt class="ck-nsl">NEXT</dt><dd><span class="ck-ns"></span><small class="ck-nd"></small></dd></div>' +
        '<div class="ck-c"><dt>UNIX EPOCH</dt><dd><span class="ck-ep"></span><small>seconds since 1970</small></dd></div>' +
        '<div class="ck-c"><dt>EARTH \u2192 SUN</dt><dd><span class="ck-au"></span><small class="ck-km"></small></dd></div>' +
        '</dl>' + KCAP([[["\u2191", "\u2193"], "month"], [["\u2190", "\u2192"], "city"], [["PGUP", "PGDN"], "month"], [["T"], "today"], [["SPACE", "\u21b5"], "info / city"], [["ESC"], "close"]], "ck-kc ck-kw") + KCAP([[["\u2190", "\u2191", "\u2193", "\u2192"], "move"], [["PGUP", "PGDN"], "month"], [["T"], "today"], [["SPACE", "\u21b5"], "info / city"], [["ESC"], "close"]], "ck-kc ck-kn") + '</div>';
      document.body.appendChild(ov);
      /* Stat cells explain themselves: focus one (Tab from the calendar, then arrows), Enter/Space or a click flips it. */
      var WHY = [
        "Day of the year (the 'Julian' day count), week number and ISO week-date: year-Wweek-weekday, Mon = 1. Bar: share of the year gone.",
        "Moon phase and how much of it is lit, from the 29.53-day lunar cycle.",
        "Sunrise, sunset, daylight. \u2248 means estimated from your time zone; no location is used.",
        "Chinese zodiac year (element + animal). It changes at Lunar New Year, not 1 January.",
        "Time to the next solstice (longest/shortest day) or equinox (day = night).",
        "Seconds since 1 Jan 1970 UTC. How computers count time.",
        "Earth\u2013Sun distance today. 1 AU \u2248 149.6M km; closest in early Jan."
      ];
      var flipEls = [ov.querySelector(".ck-stat")].concat(Array.prototype.slice.call(ov.querySelectorAll(".ck-c")));
      flipEls.forEach(function (c, i) {
        c.tabIndex = 0;
        c.setAttribute("role", "button");
        c.setAttribute("aria-label", (c.querySelector("dt") ? c.querySelector("dt").textContent : "Year status") + ". Enter or Space explains it.");
        var w = document.createElement("p");
        w.className = "ck-why"; w.textContent = WHY[i]; w.setAttribute("aria-live", "polite");
        c.appendChild(w);
        var hn = document.createElement("span");
        hn.className = "ck-hint";
        hn.innerHTML = window.KCAP([[["SPACE"], "info"]], "ck-hi") + window.KCAP([[["SPACE"], "back"]], "ck-hb");
        c.appendChild(hn);
        c.addEventListener("click", function () { c.focus({ preventScroll: true }); c.classList.toggle("fl"); });
        c.addEventListener("focusout", function () { c.classList.remove("fl"); });
      });
      var flipNav = function (from, k) {
        var at = flipEls.indexOf(from);
        if (at === 0) return k === "ArrowDown" ? flipEls[1] : null;
        var cells = flipEls.slice(1), me = cells[at - 1].getBoundingClientRect(), best = null, bd = 1e9;
        cells.forEach(function (c) {
          var r = c.getBoundingClientRect(), dx = r.left - me.left, dy = r.top - me.top, d;
          if (k === "ArrowLeft" && Math.abs(dy) < 4 && dx < 0) d = -dx;
          else if (k === "ArrowRight" && Math.abs(dy) < 4 && dx > 0) d = dx;
          else if (k === "ArrowUp" && dy < -4) d = -dy * 10 + Math.abs(dx);
          else if (k === "ArrowDown" && dy > 4) d = dy * 10 + Math.abs(dx);
          if (d !== undefined && d < bd) { bd = d; best = c; }
        });
        if (!best && k === "ArrowUp") return flipEls[0];
        return best;
      };
      var q = function (s) { return ov.querySelector(s); };
      var oBox = q(".ck-box"), oHM = q(".ck-hm"), oS = q(".ck-s"), oDate = q(".ck-date"), oM = q(".ck-m"), oGrid = q(".ck-grid"), oFoot = q(".ck-foot");
      var oFace = q(".ck-face"), oLt = q(".ck-lt"), oOff = q(".ck-off"), oYb = q(".ck-yb"), ybCells = ov.querySelectorAll(".yb-d"), ybRows = ov.querySelectorAll(".yb-r"), mBtns = ov.querySelectorAll(".ck-mb"), cBtns = ov.querySelectorAll(".ck-cb"), oCs = q(".ck-csl");
      var wideMQ = window.matchMedia("(min-width: 760px)"), wide = function () { return wideMQ.matches; };
      var oCal = function () { return wide() ? oYb : oGrid; };
      /* World clock: Space/Enter/click on the face cycles cities. IANA zones, so DST is right. Resets to local on each open. */
      var CITIES = [null, ["NEW YORK", "America/New_York"], ["LONDON", "Europe/London"], ["SOFIA", "Europe/Sofia"], ["DUBAI", "Asia/Dubai"], ["TOKYO", "Asia/Tokyo"], ["SYDNEY", "Australia/Sydney"]];
      var city = 0;
      var zoneNow = function (tz, t) {
        var o = {};
        new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(t).forEach(function (p) { o[p.type] = p.value; });
        var y = +o.year, mo = +o.month - 1, d = +o.day, h = +o.hour % 24, mi = +o.minute, se = +o.second;
        var off = Math.round((Date.UTC(y, mo, d, h, mi, se) - Math.floor(t.getTime() / 1000) * 1000) / 6e4);
        return { y: y, mo: mo, d: d, h: h, mi: mi, se: se, off: off, wd: new Date(Date.UTC(y, mo, d)).getUTCDay() };
      };
      var fmtOff = function (m) { var a = Math.abs(m), h = Math.floor(a / 60), r = a % 60; return (m < 0 ? "\u2212" : "+") + h + (r ? ":" + two(r) : ""); };
      var faceNow = function (t) {
        if (!CITIES[city]) return { y: t.getFullYear(), mo: t.getMonth(), d: t.getDate(), h: t.getHours(), mi: t.getMinutes(), se: t.getSeconds(), wd: t.getDay(), off: -t.getTimezoneOffset() };
        return zoneNow(CITIES[city][1], t);
      };
      var drawFace = function (t) {
        var z = faceNow(t), c = CITIES[city];
        var o = oOff.children, dayT = z.h >= 6 && z.h < 18, lz = "";
        try { lz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "").split("/").pop().replace(/_/g, " "); } catch (e) {}
        o[0].textContent = c ? c[0] : "LOCAL";
        o[1].textContent = "UTC" + (z.off ? fmtOff(z.off) : "");
        if (c) {
          var diff = z.off + t.getTimezoneOffset(), dh = diff / 60;
          o[2].textContent = diff === 0 ? "SAME" : (diff > 0 ? "+" : "\u2212") + (Math.abs(dh) % 1 ? Math.abs(dh).toFixed(1) : Math.abs(dh)) + "H VS LOCAL";
        } else o[2].textContent = lz || "YOUR ZONE";
        o[3].textContent = (dayT ? "\u2600 DAY" : "\u263e NIGHT");
        o[3].className = "o4 " + (dayT ? "d" : "n");
        oFace.classList.toggle("city", !!c);
        for (var ci = 0; ci < cBtns.length; ci++) { cBtns[ci].classList.toggle("on", ci === city); cBtns[ci].setAttribute("aria-pressed", String(ci === city)); }
        return z;
      };
      var wall = function (el, k) { if (window.KWALL) window.KWALL(el, k); };
      var nextCity = function () { city = (city + 1) % CITIES.length; tickBig(); };
      var oX = q(".ck-x"), oPrev = q(".ck-prev"), oNext = q(".ck-next"), dCells = ov.querySelectorAll(".ck-d");
      var sel = null, oT = 0, oBack = null;
      var same = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
      var isoWeek = function (d) {
        var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var n = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - n);
        return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
      };
      /* Sky stats, all computed here (no network). Sun uses the location only if the visitor already granted it;
         otherwise longitude comes from the time-zone offset and latitude defaults to 40 deg, marked approx. Nothing about
         the place is ever shown. */
      var oYr = q(".ck-bar"), oPct = q(".ck-pct"), oEp = q(".ck-ep"), geo = null;
      var SEG = 32, segs = "";
      for (var s0 = 0; s0 < SEG; s0++) segs += "<i></i>";
      oYr.innerHTML = segs;
      var R = Math.PI / 180, JD = function (t) { return t / 864e5 + 2440587.5; };
      var SYN = 29.530588853, NM0 = Date.UTC(2000, 0, 6, 18, 14);
      var PH = ["new moon", "waxing crescent", "first quarter", "waxing gibbous", "full moon", "waning gibbous", "last quarter", "waning crescent"];
      var moonGlyph = function (age) {
        var k = Math.cos(2 * Math.PI * age / SYN), wax = age < SYN / 2, h = "";
        for (var yy = 0; yy < 11; yy++) for (var xx = 0; xx < 11; xx++) {
          var x = (xx - 5) / 5.5, y = (yy - 5) / 5.5;
          if (x * x + y * y > 1) continue;
          var w = Math.sqrt(1 - y * y), lit = wax ? x > k * w : x < -k * w;
          h += '<rect x="' + xx + '" y="' + yy + '" width=".86" height=".86" class="' + (lit ? "l" : "d") + '"/>';
        }
        return h;
      };
      /* NOAA-style sunrise/sunset for a given local day. Returns minutes after local midnight, or null (polar day/night). */
      var sunTimes = function (d, lat, lon) {
        var n = JD(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)) - 2451545;
        var L = (280.46 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) * R;
        var lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R, eps = (23.439 - 4e-7 * n) * R;
        var dec = Math.asin(Math.sin(eps) * Math.sin(lam));
        var ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / R;
        var eot = 4 * (((L - ra + 540) % 360) - 180);
        var c = (Math.cos(90.833 * R) - Math.sin(lat * R) * Math.sin(dec)) / (Math.cos(lat * R) * Math.cos(dec));
        if (c > 1 || c < -1) return { polar: c > 1 ? "night" : "day" };
        var ha = Math.acos(c) / R, noon = 720 - 4 * lon - eot - new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTimezoneOffset();
        return { rise: noon - 4 * ha, set: noon + 4 * ha };
      };
      var hm = function (m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return two(Math.floor(m / 60)) + ":" + two(m % 60); };
      /* Lunar New Year dates (Gregorian), so the zodiac flips on the right day. */
      var LNY = { 2020: "0125", 2021: "0212", 2022: "0201", 2023: "0122", 2024: "0210", 2025: "0129", 2026: "0217", 2027: "0206", 2028: "0126", 2029: "0213", 2030: "0203", 2031: "0123", 2032: "0211", 2033: "0131", 2034: "0219", 2035: "0208", 2036: "0128", 2037: "0215", 2038: "0204", 2039: "0124", 2040: "0212" };
      var ANI = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
      var ELE = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
      var zodiac = function (d) {
        var y = d.getFullYear(), s = LNY[y], ny = s ? new Date(y, +s.slice(0, 2) - 1, +s.slice(2)) : new Date(y, 1, 4);
        var zy = d < ny ? y - 1 : y, i = ((zy - 4) % 60 + 60) % 60;
        var nx = LNY[zy + 1], next = nx ? new Date(zy + 1, +nx.slice(0, 2) - 1, +nx.slice(2)) : null;
        return { name: ELE[i % 10] + " " + ANI[i % 12], next: next, y: zy };
      };
      /* Meeus mean equinox/solstice instants (JDE, good to a few minutes for this century). */
      var SEAS = [["mar equinox", [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057]], ["jun solstice", [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.0003]],
        ["sep equinox", [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078]], ["dec solstice", [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032]]];
      var season = function (now) {
        for (var y = now.getFullYear(); y <= now.getFullYear() + 1; y++) for (var j = 0; j < 4; j++) {
          var c = SEAS[j][1], Y = (y - 2000) / 1000, jde = c[0] + c[1] * Y + c[2] * Y * Y + c[3] * Y * Y * Y + c[4] * Y * Y * Y * Y;
          var t = (jde - 2440587.5) * 864e5 - 69e3;
          if (t > now) return { name: SEAS[j][0], t: t };
        }
      };
      var drawSky = function () {
        var now = new Date(), t = now.getTime();
        var age = (((t - NM0) / 864e5) % SYN + SYN) % SYN, ill = (1 - Math.cos(2 * Math.PI * age / SYN)) / 2;
        q(".ck-moon").innerHTML = moonGlyph(age);
        q(".ck-mn").textContent = PH[Math.floor((age / SYN) * 8 + 0.5) % 8];
        q(".ck-mi").textContent = Math.round(ill * 100) + "% lit";
        var jan = new Date(now.getFullYear(), 0, 1).getTimezoneOffset(), jul = new Date(now.getFullYear(), 6, 1).getTimezoneOffset();
        var lat = geo ? geo[0] : 40, lon = geo ? geo[1] : -Math.max(jan, jul) / 4;
        var st = sunTimes(now, lat, lon);
        q(".ck-sq").textContent = geo ? "" : "\u2248";
        q(".ck-sq").title = geo ? "" : "approximate, from your time zone";
        if (st.polar) { q(".ck-sun").textContent = "polar " + st.polar; q(".ck-dl").textContent = ""; }
        else {
          q(".ck-sun").textContent = "\u2191 " + hm(st.rise) + "  \u2193 " + hm(st.set);
          var len = st.set - st.rise;
          q(".ck-dl").textContent = Math.floor(len / 60) + "h " + two(Math.round(len % 60)) + "m of daylight";
        }
        var z = zodiac(now);
        q(".ck-zo").textContent = z.name;
        q(".ck-zs").textContent = z.next ? "until " + MON[z.next.getMonth()].slice(0, 3) + " " + z.next.getDate() + " " + z.next.getFullYear() : String(z.y);
        var se = season(now), gap = se.t - t;
        q(".ck-nsl").textContent = se.name.toUpperCase() + " IN";
        q(".ck-ns").textContent = Math.floor(gap / 864e5) + "d " + two(Math.floor(gap / 36e5) % 24) + "h " + two(Math.floor(gap / 6e4) % 60) + "m";
        var sd = new Date(se.t);
        q(".ck-nd").textContent = MON[sd.getMonth()].slice(0, 3) + " " + sd.getDate() + " \u00b7 " + two(sd.getHours()) + ":" + two(sd.getMinutes()) + " local";
        var gm = (357.529 + 0.98560028 * (JD(t) - 2451545)) * R, au = 1.00014 - 0.01671 * Math.cos(gm) - 0.00014 * Math.cos(2 * gm);
        q(".ck-au").textContent = au.toFixed(5) + " AU";
        q(".ck-km").textContent = (au * 149597870.7 / 1e6).toFixed(3) + " million km";
      };
      var drawCal = function () {
        var now = new Date(), y = sel.getFullYear(), m = sel.getMonth();
        var first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
        oM.textContent = wide() ? String(y) : MON[m].toUpperCase() + " " + y;
        var tdy0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), ny = new Date(now.getFullYear() + 1, 0, 1), dl = Math.ceil((ny - new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)) / 864e5);
        var onYb = document.activeElement === oYb && wide();
        if (onYb) {
          var mdays = new Date(y, m + 1, 0).getDate(), mst = new Date(y, m, 1), men = new Date(y, m + 1, 1);
          var mleft = tdy0 >= men ? 0 : tdy0 < mst ? mdays : Math.round((men - tdy0) / 864e5) - 1;
          q(".ck-dl2").textContent = MON[m].slice(0, 3).toUpperCase() + " \u00b7 " + mdays + " DAYS \u00b7 " + mleft + " LEFT";
        } else q(".ck-dl2").textContent = dl + " DAYS LEFT";
        var tdy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        for (var j = 0; j < ybCells.length; j++) {
          var yc = ybCells[j], ym = +yc.getAttribute("data-m"), ydn = +yc.getAttribute("data-d"), ydt = new Date(y, ym, ydn);
          if (ydt.getMonth() !== ym) { yc.className = "yb-d none"; yc.textContent = ""; yc.removeAttribute("aria-label"); continue; }
          var wk = ydt.getDay();
          yc.textContent = ydn;
          yc.className = "yb-d" + (wk === 0 || wk === 6 ? " we" : "") + (ydt < tdy ? " past" : "") + (same(ydt, tdy) ? " today" : "") + (same(ydt, sel) ? " sel" : "");
          yc.setAttribute("aria-label", DAY[wk] + " " + ydn + " " + MON[ym] + " " + y + (same(ydt, tdy) ? ", today" : ""));
        }
        for (var r = 0; r < 12; r++) {
          ybRows[r].classList.toggle("msel", onYb && r === m);
          ybRows[r].classList.toggle("cur", y === tdy.getFullYear() && r === tdy.getMonth());
          ybRows[r].classList.toggle("past", y < tdy.getFullYear() || (y === tdy.getFullYear() && r < tdy.getMonth()));
          mBtns[r].classList.toggle("on", r === m);
          mBtns[r].classList.toggle("cur", y === tdy.getFullYear() && r === tdy.getMonth());
          mBtns[r].setAttribute("aria-pressed", String(r === m));
        }
        for (var i = 0; i < 42; i++) {
          var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), el = dCells[i];
          el.textContent = d.getDate();
          el.className = "ck-d" + (d.getMonth() !== m ? " out" : "") + (same(d, now) ? " today" : "") + (same(d, sel) ? " sel" : "");
          el.setAttribute("aria-selected", String(same(d, sel)));
          el.setAttribute("aria-label", DAY[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear() + (same(d, now) ? ", today" : ""));
          el.setAttribute("data-i", String(i));
          if (same(d, sel)) oGrid.setAttribute("aria-activedescendant", el.id);
        }
        /* The status panel always describes today; the grid highlight is only a highlight. */
        var td = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        y = td.getFullYear();
        var y0 = new Date(y, 0, 1), doy = Math.round((td - y0) / 864e5) + 1;
        var len = Math.round((new Date(y + 1, 0, 1) - y0) / 864e5);
        oFoot.innerHTML = "";
        var wd = td.getDay() || 7, iy = new Date(y, td.getMonth(), td.getDate() + 4 - wd).getFullYear();
        [["DAY", doy + "/" + len], ["WEEK", two(isoWeek(td))], ["ISO", iy + "-W" + two(isoWeek(td)) + "-" + wd], ["", "today"]].forEach(function (p) {
          var e = document.createElement("span");
          if (p[0]) { var l = document.createElement("i"); l.textContent = p[0]; e.appendChild(l); }
          e.appendChild(document.createTextNode(p[1]));
          oFoot.appendChild(e);
        });
        var frac = (now - y0) / (len * 864e5);
        var on = Math.round(frac * SEG), bars = oYr.children;
        for (var b = 0; b < SEG; b++) bars[b].className = b < on ? "on" : "";
        oPct.textContent = (frac * 100).toFixed(1) + "% of " + y;
      };
      var tickBig = function () {
        var d = new Date(), z = drawFace(d);
        var cc = document.createElement("span");
        cc.className = "cc";
        cc.textContent = ":";
        cc.style.animationDelay = -d.getMilliseconds() + "ms";
        oHM.textContent = two(z.h);
        oHM.appendChild(cc);
        oHM.appendChild(document.createTextNode(two(z.mi)));
        oS.textContent = ":" + two(z.se);
        oEp.textContent = Math.floor(d.getTime() / 1000);
        if (d.getSeconds() === 0) drawSky();
        oDate.textContent = DAY[z.wd] + " \u00b7 " + z.d + " " + MON[z.mo] + " " + z.y;
        window.clearTimeout(oT);
        oT = window.setTimeout(tickBig, 1000 - d.getMilliseconds() + 20);
      };
      var shift = function (days, months) {
        var y = sel.getFullYear(), m = sel.getMonth() + (months || 0), dd = sel.getDate();
        if (months) dd = Math.min(dd, new Date(y, m + 1, 0).getDate());
        sel = new Date(y, m, dd + (days || 0));
        drawCal();
      };
      var ckOpen = function () {
        if (!ov.hidden) return;
        oBack = document.activeElement;
        var now = new Date();
        sel = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        city = 0;
        drawSky();
        tickBig();
        /* Use the precise sun only if location is already allowed; never prompt, never show it. */
        if (!geo && navigator.permissions && navigator.geolocation) navigator.permissions.query({ name: "geolocation" }).then(function (p) {
          if (p.state === "granted") navigator.geolocation.getCurrentPosition(function (pos) { geo = [pos.coords.latitude, pos.coords.longitude]; if (!ov.hidden) drawSky(); }, function () {}, { maximumAge: 36e5, timeout: 8000 });
        }).catch(function () {});
        drawCal();
        var sw = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty("--sbw", sw + "px");
        document.documentElement.classList.add("lb-on");
        ov.hidden = false;
        /* Pop out of the small clock: start at its spot and scale, then settle in the centre. */
        var a = ck.getBoundingClientRect(), b = oBox.getBoundingClientRect();
        oBox.style.setProperty("--ckx", Math.round(a.left + a.width / 2 - (b.left + b.width / 2)) + "px");
        oBox.style.setProperty("--cky", Math.round(a.top + a.height / 2 - (b.top + b.height / 2)) + "px");
        ov.classList.remove("in");
        void oBox.offsetWidth;
        if (!still.matches) ov.classList.add("in");
        oCal().focus({ preventScroll: true });
      };
      var ckClose = function () {
        if (ov.hidden) return;
        ov.hidden = true;
        ov.classList.remove("in");
        window.clearTimeout(oT);
        document.documentElement.classList.remove("lb-on");
        (oBack && oBack !== document.body && oBack.focus ? oBack : ck).focus({ preventScroll: true });
        oBack = null;
      };
      ck.addEventListener("click", ckOpen);
      oX.addEventListener("click", ckClose);
      oPrev.addEventListener("click", function () { shift(0, wide() ? -12 : -1); });
      oNext.addEventListener("click", function () { shift(0, wide() ? 12 : 1); });
      Array.prototype.forEach.call(cBtns, function (b) { b.addEventListener("click", function (e) { e.stopPropagation(); city = +b.getAttribute("data-c"); tickBig(); oFace.focus({ preventScroll: true }); }); });
      oFace.addEventListener("click", function () { oFace.focus({ preventScroll: true }); nextCity(); });
      Array.prototype.forEach.call(mBtns, function (b) { b.addEventListener("click", function () { shift(0, +b.getAttribute("data-m") - sel.getMonth()); }); });
      wideMQ.addEventListener("change", function () { if (!ov.hidden) { drawCal(); if (document.activeElement === oGrid || document.activeElement === oYb) oCal().focus({ preventScroll: true }); } });
      ov.addEventListener("click", function (ev) {
        if (ev.target === ov) { ckClose(); return; }
        var yd = ev.target.closest && ev.target.closest(".yb-d:not(.none)");
        if (yd) { sel = new Date(sel.getFullYear(), +yd.getAttribute("data-m"), +yd.getAttribute("data-d")); drawCal(); oYb.focus({ preventScroll: true }); return; }
        var d = ev.target.closest && ev.target.closest(".ck-d");
        if (d) {
          var y = sel.getFullYear(), m = sel.getMonth(), first = new Date(y, m, 1);
          sel = new Date(y, m, 1 - first.getDay() + Number(d.getAttribute("data-i")));
          drawCal();
          oGrid.focus({ preventScroll: true });
        }
      });
      window.addEventListener("keydown", function (ev) {
        if (ov.hidden) return;
        var k = ev.key, onBtn = document.activeElement && document.activeElement.tagName === "BUTTON";
        var STEP = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        ev.stopPropagation();
        var fc = flipEls.indexOf(document.activeElement) >= 0 ? document.activeElement : null;
        var onFace = document.activeElement === oFace, onCs = document.activeElement === oCs;
        if (k === "Escape") { ev.preventDefault(); if (fc && fc.classList.contains("fl")) fc.classList.remove("fl"); else if (onFace && city) { city = 0; tickBig(); } else ckClose(); }
        else if (onFace && (k === "Enter" || k === " ")) { ev.preventDefault(); nextCity(); }
        else if (onCs && STEP[k]) {
          /* City header: Left/Right switch city (stops at LOCAL and SYD), Down returns to the face. */
          ev.preventDefault();
          if (k === "ArrowDown") oFace.focus({ preventScroll: true });
          else if (k === "ArrowLeft" || k === "ArrowRight") { var nc = city + STEP[k]; if (nc >= 0 && nc < CITIES.length) { city = nc; tickBig(); } else wall(oCs, k); }
          else wall(oCs, k);
        }
        else if (onCs && (k === "Enter" || k === " ")) { ev.preventDefault(); oFace.focus({ preventScroll: true }); }
        else if (onFace && STEP[k]) {
          ev.preventDefault();
          if (k === "ArrowUp") oCs.focus({ preventScroll: true });
          else if (k !== "ArrowDown") wall(oFace, k);
          else { if (wide()) { var tn = new Date(); sel = new Date(tn.getFullYear(), tn.getMonth(), tn.getDate()); } oCal().focus({ preventScroll: true }); }
        }
        else if (fc && STEP[k]) { ev.preventDefault(); var nx = flipNav(fc, k); if (nx) nx.focus({ preventScroll: true }); else if (k === "ArrowUp") oCal().focus({ preventScroll: true }); else wall(fc, k); }
        else if (fc && (k === "Enter" || k === " ")) { ev.preventDefault(); fc.classList.toggle("fl"); }
        else if (STEP[k]) {
          /* Arrows stay inside the shown month; down past the last row leaves the grid for the stat cards. */
          ev.preventDefault();
          var last = new Date(sel.getFullYear(), sel.getMonth() + 1, 0).getDate(), nd = sel.getDate() + STEP[k], mo = sel.getMonth();
          if (wide()) {
            /* Board: Left/Right walk days (and into the next or previous month), Up/Down change month row.
               Up from January reaches the clock, Down from December leaves for the status box. */
            if (k === "ArrowUp" && mo === 0) oFace.focus({ preventScroll: true });
            else if (k === "ArrowDown" && mo === 11) flipEls[0].focus({ preventScroll: true });
            else if (k === "ArrowUp" || k === "ArrowDown") shift(0, k === "ArrowUp" ? -1 : 1);
            /* Left/Right do nothing on the board (rows are whole months): wall cue. */
            else wall(ybRows[mo], k);
          }
          else if (k === "ArrowDown" && nd > last) flipEls[0].focus({ preventScroll: true });
          else if (k === "ArrowUp" && nd < 1) oFace.focus({ preventScroll: true });
          else if (nd >= 1 && nd <= last) shift(STEP[k], 0);
          else wall(oGrid.querySelector(".ck-d.sel") || oGrid, k);
        }
        else if (k === "PageUp" || k === "PageDown") { ev.preventDefault(); shift(0, k === "PageUp" ? -1 : 1); }
        else if (k === "Home" || k === "t" || k === "T") { ev.preventDefault(); var n = new Date(); sel = new Date(n.getFullYear(), n.getMonth(), n.getDate()); drawCal(); }
        else if (k === "Tab") {
          ev.preventDefault();
          var f = [oX, oCs, oFace, oPrev, oCal(), oNext].concat(flipEls), at = f.indexOf(document.activeElement);
          f[(at + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        } else if ((k === "Enter" || k === " ") && !onBtn) ev.preventDefault();
      }, true);
      document.addEventListener("focusin", function (ev) {
        if (!ov.hidden && !ov.contains(ev.target)) oCal().focus({ preventScroll: true });
      });
      oYb.addEventListener("focus", drawCal);
      oYb.addEventListener("blur", drawCal);
      document.addEventListener("visibilitychange", function () { if (!ov.hidden && !document.hidden) tickBig(); });
    }

    /* 1b. Kar Page mark beside the clock -> a Kar Page preview card that pops out of the mark. */
    var kb = document.querySelector(".mast .kpbox");
    if (kb) {
      mark(kb, "\u21b5 kar page", "b");
      var kv = document.createElement("div");
      kv.className = "ck kpc";
      kv.hidden = true;
      kv.setAttribute("role", "dialog");
      kv.setAttribute("aria-modal", "true");
      kv.setAttribute("aria-labelledby", "kpc-h");
      kv.innerHTML = '<div class="ck-box"><div class="ck-top"><span class="ck-l"><svg class="kpm-l" viewBox="0 0 2500 4172" width="16.8" height="28" aria-hidden="true" focusable="false"><use href="#kpm"/></svg>KAR PAGE \u00b7 WEB APP</span><button class="ck-x" type="button" aria-label="Close">\u2715</button></div>' +
        '<div class="kpc-shots">' + [["kp-t1-grid", "Kar Page home grid of car spots"], ["kp-t2-porsche", "Kar Page post of a green 1956 Porsche"], ["kp-t3-m3", "Kar Page post of a red BMW M3"]].map(function (s) {
          return '<img draggable="false" src="img/' + s[0] + '.webp" srcset="img/' + s[0] + '.webp 1x, img/' + s[0] + '-2x.webp 2x" alt="' + s[1] + '" width="122" height="240" decoding="async">';
        }).join("") + '</div>' +
        '<h2 class="kpc-h" id="kpc-h">Your cars. Your story.</h2><p class="kpc-p">A web app for car enthusiasts.</p>' +
        '<p class="kpc-url">&gt; https://karpage.app</p>' +
        '<div class="kpc-go"><a class="kpc-b on" href="https://karpage.app" rel="noopener">OPEN KARPAGE.APP \u2197</a><a class="kpc-b" href="/kar-page">APP PAGE \u2192</a></div>' +
        KCAP([[["TAB"], "move"], [["\u21b5"], "open"], [["ESC"], "close"]], "ck-kc") + '</div>';
      document.body.appendChild(kv);
      var kBox = kv.querySelector(".ck-box"), kX = kv.querySelector(".ck-x"), kBack = null;
      var kFoc = function () { return [kX].concat([].slice.call(kv.querySelectorAll(".kpc-b"))); };
      var kOpen = function () {
        if (!kv.hidden) return;
        kBack = document.activeElement;
        document.documentElement.style.setProperty("--sbw", (window.innerWidth - document.documentElement.clientWidth) + "px");
        document.documentElement.classList.add("lb-on");
        kv.hidden = false;
        var a = kb.getBoundingClientRect(), b = kBox.getBoundingClientRect();
        kBox.style.setProperty("--ckx", Math.round(a.left + a.width / 2 - (b.left + b.width / 2)) + "px");
        kBox.style.setProperty("--cky", Math.round(a.top + a.height / 2 - (b.top + b.height / 2)) + "px");
        kv.classList.remove("in");
        void kBox.offsetWidth;
        if (!still.matches) kv.classList.add("in");
        kv.querySelector(".kpc-b").focus({ preventScroll: true });
      };
      var kClose = function () {
        if (kv.hidden) return;
        kv.hidden = true;
        kv.classList.remove("in");
        document.documentElement.classList.remove("lb-on");
        (kBack && kBack !== document.body && kBack.focus ? kBack : kb).focus({ preventScroll: true });
        kBack = null;
      };
      kb.addEventListener("click", kOpen);
      kX.addEventListener("click", kClose);
      kv.addEventListener("click", function (ev) { if (ev.target === kv) kClose(); });
      window.addEventListener("keydown", function (ev) {
        if (kv.hidden) return;
        ev.stopPropagation();
        if (ev.key === "Escape") { ev.preventDefault(); kClose(); }
        else if (ev.key === "Tab") {
          ev.preventDefault();
          var f = kFoc(), at = f.indexOf(document.activeElement);
          f[(at + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        }
      }, true);
      document.addEventListener("focusin", function (ev) { if (!kv.hidden && !kv.contains(ev.target)) kFoc()[1].focus({ preventScroll: true }); });
    }

    /* 2. Title: a quick terminal scramble that resolves back, left to right. */
    var h1 = document.querySelector(".mast h1");
    if (h1) {
      h1.tabIndex = -1;
      mark(h1, "\u21b5 glitch", "r");
      var orig = h1.textContent, gT = 0, G = "#%&*+<>/\\=_01$@!?";
      h1.addEventListener("click", function () {
        window.clearInterval(gT);
        h1.classList.remove("glitch", "flash");
        void h1.offsetWidth;
        if (still.matches) { h1.classList.add("flash"); return; }
        var f = 0, N = 16;
        h1.setAttribute("aria-label", orig);
        h1.classList.add("glitch");
        gT = window.setInterval(function () {
          f++;
          var s = "";
          for (var i = 0; i < orig.length; i++) {
            var ch = orig.charAt(i);
            s += ch === " " || i < (f / N) * orig.length - 1 ? ch : G.charAt((Math.random() * G.length) | 0);
          }
          h1.textContent = f >= N ? orig : s;
          if (f >= N) { window.clearInterval(gT); h1.classList.remove("glitch"); h1.removeAttribute("aria-label"); }
        }, 30);
      });
    }

    /* 3. Prompt: a tiny preset terminal window. One click or Enter plays the whole show fast (ls, uname -a,
       then a sudo that fails) in under a second; any key or click while it plays jumps to the end, and
       reduced motion shows the end at once. The ls folders are links to the apps. Esc, a click outside or
       leaving the row closes it. The window is an overlay below the prompt, so nothing on the page moves. */
    var pr = document.querySelector(".mast .prompt");
    if (pr) {
      pr.tabIndex = -1;
      mark(pr, "\u21b5 run", "r", true);
      var dollar = pr.querySelector("span"), sweepT = [], timers = [], script = [], idx = 0;
      var paint = function (el, typed, cursor) {
        while (el.firstChild) el.removeChild(el.firstChild);
        el.appendChild(document.createTextNode("~/apps "));
        el.appendChild(dollar.cloneNode(true));
        el.appendChild(document.createTextNode(" " + typed));
        if (cursor) { var cu = document.createElement("span"); cu.className = "pc"; el.appendChild(cu); }
      };
      var sweep = function () {
        sweepT.forEach(window.clearTimeout);
        sweepT = [];
        var ts = Array.prototype.filter.call(document.querySelectorAll("#grid > li:not([hidden]) .tile"), function (t) { return t.getClientRects().length; });
        ts.forEach(function (t, i) {
          var at = still.matches ? 0 : i * 40;
          sweepT.push(window.setTimeout(function () { t.classList.add("ls-hit"); }, at));
          sweepT.push(window.setTimeout(function () { t.classList.remove("ls-hit"); }, at + (still.matches ? 700 : 360)));
        });
      };
      var hrefs = Array.prototype.map.call(document.querySelectorAll("#grid .tile[href]"), function (t) { return t.getAttribute("href"); });
      var CMDS = [
        { c: "uname -a", out: [["KarPage apps 1.0-omarchy jade-on-ink x86_64 keyboard/Linux", ""]] },
        { c: "sudo rm -rf boredom", out: [["[sudo] password for guest: ********", "dim"], ["rm: cannot remove 'boredom': permission denied. nice try.", "err"]] }
      ];
      var term = document.createElement("div");
      term.className = "pterm";
      term.setAttribute("role", "region");
      term.setAttribute("aria-label", "Terminal easter egg");
      term.innerHTML = '<div class="pt-bar" aria-hidden="true"><i></i><i></i><i></i><span>guest@karpage: ~/apps</span></div>' +
        '<p class="pt-why">// a tiny terminal easter egg: these are the apps on this site. ' + (matchMedia("(hover: none), (pointer: coarse)").matches ? "tap a folder to open it, or tap close." : "click a folder to open it, or press ESC to close.") + '</p>' +
        '<div class="pterm-in" role="log" aria-live="polite"></div><div class="pt-foot"></div>';
      var tin = term.querySelector(".pterm-in"), foot = term.querySelector(".pt-foot");
      pr.parentNode.insertBefore(term, pr.nextSibling);
      var open = false, busy = false;
      var hint = function () {
        pr.setAttribute("data-khint", busy ? "any key skip" : open ? "\u21b5 replay|esc close" : "\u21b5 run");
        pr.setAttribute("data-term", busy ? "busy" : open ? "done" : "0");
        document.dispatchEvent(new Event("kp:hint"));
      };
      /* Width: up to the header's right edge, but never under the logo box or LOCAL clock beside it. */
      var size = function () {
        if (!open) return;
        term.style.width = "";
        var m = pr.parentNode.getBoundingClientRect(), tr = term.getBoundingClientRect(), max = m.right - tr.left;
        var ck = document.querySelector(".mast .ckrow");
        if (ck && ck.getClientRects().length) {
          var c = ck.getBoundingClientRect();
          if (c.bottom > tr.top + 2 && c.left > tr.left + 200) max = Math.min(max, c.left - tr.left - 20);
        }
        term.style.width = Math.round(Math.min(max, 780)) + "px";
      };
      var line = function (cls, text) {
        var d = document.createElement("div");
        d.className = cls;
        if (text != null) d.textContent = text;
        tin.appendChild(d);
        return d;
      };
      var lsLine = function () {
        var d = line("pt-o pt-ls");
        hrefs.forEach(function (h) {
          var a = document.createElement("a");
          a.href = h;
          a.textContent = h.replace(/^\/+|\/+$/g, "") + "/";
          d.appendChild(a);
        });
      };
      /* The whole show as [time ms, step]: ls output at 40 ms, ~10 ms a typed key, done by ~0.8 s. */
      var build = function () {
        var s = [], t = 40;
        s.push([t, function () { var p = line("pt-p"); paint(p, "ls", false); lsLine(); sweep(); }]);
        CMDS.forEach(function (cmd) {
          var p = null;
          t += 70;
          s.push([t, function () { p = line("pt-p"); paint(p, "", true); }]);
          for (var i = 1; i <= cmd.c.length; i++) (function (i) { t += 10; s.push([t, function () { paint(p, cmd.c.slice(0, i), true); }]); })(i);
          t += 50;
          s.push([t, function () { paint(p, cmd.c, false); }]);
          cmd.out.forEach(function (o, j) { t += j ? 110 : 20; s.push([t, function () { line("pt-o" + (o[1] ? " pt-" + o[1] : ""), o[0]); }]); });
        });
        t += 50;
        s.push([t, function () { paint(line("pt-p"), "", true); busy = false; hint(); }]);
        return s;
      };
      var clear = function () {
        timers.forEach(window.clearTimeout);
        timers = [];
        while (tin.firstChild) tin.removeChild(tin.firstChild);
      };
      var finish = function () {
        timers.forEach(window.clearTimeout);
        timers = [];
        while (idx < script.length) script[idx++][1]();
      };
      var run = function () {
        if (busy) { finish(); return; }
        clear();
        if (!foot.firstChild) foot.innerHTML = window.KCAP([[["ESC"], "close"], [["\u21b5"], "replay"]], "pt-kc");
        open = true;
        busy = true;
        term.classList.add("on");
        size();
        hint();
        script = build();
        idx = 0;
        if (still.matches) { finish(); return; }
        script.forEach(function (st, i) {
          timers.push(window.setTimeout(function () { idx = i + 1; st[1](); }, st[0]));
        });
      };
      var reset = function () {
        clear();
        script = [];
        idx = 0;
        open = busy = false;
        term.classList.remove("on");
        term.style.width = "";
        hint();
      };
      pr.addEventListener("click", run);
      /* Any key while it plays skips to the end (Enter / Space only skip, so they never restart it). Esc closes. */
      window.addEventListener("keydown", function (ev) {
        if (!open || document.documentElement.classList.contains("lb-on")) return;
        if (busy && !/^(Shift|Control|Alt|Meta)$/.test(ev.key)) {
          finish();
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); }
          return;
        }
        if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); reset(); }
      }, true);
      /* The caps under the output press like keys: same shared press and click, then the same action. */
      term.addEventListener("click", function (ev) {
        var g = ev.target.closest && ev.target.closest(".pt-kc .kg"), k = g && g.querySelector("kbd[data-key]");
        if (!k) return;
        var key = k.getAttribute("data-key"), was = busy;
        window.dispatchEvent(new KeyboardEvent("keydown", { key: key, bubbles: true }));
        window.setTimeout(function () { window.dispatchEvent(new KeyboardEvent("keyup", { key: key, bubbles: true })); }, 120);
        if (key === "Enter" && !was) run();
      });
      window.addEventListener("resize", size);
      /* Leaving the row (arrows, Esc, a click elsewhere) closes the terminal. */
      new MutationObserver(function () { if (!pr.hasAttribute("data-kcur") && open && !term.contains(document.activeElement)) reset(); }).observe(pr, { attributes: true, attributeFilter: ["data-kcur"] });
      document.addEventListener("pointerdown", function (ev) {
        if (!open || pr.contains(ev.target)) return;
        /* A click while it plays skips to the end; once done, a click outside the window closes it. */
        if (busy) { if (!(term.contains(ev.target) && ev.target.closest(".pt-kc .kg"))) finish(); return; }
        if (!term.contains(ev.target)) reset();
      });
      hint();
    }

    /* 4. Corner ? cap: Enter on it (or a click) opens the key map, like pressing ?. */
    var kr = document.querySelector(".mast .keys.qk");
    if (kr) {
      mark(kr, "\u21b5 keys", "b");
      kr.addEventListener("click", function () {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
        window.setTimeout(function () { window.dispatchEvent(new KeyboardEvent("keyup", { key: "?", bubbles: true })); }, 120);
      });
    }
  })();

  /* The home tip acknowledges the first arrow press, once. */
  (function () {
    /* A real key press means a keyboard is attached: show key caps even on touch screens. */
    var kb = function (ev) {
      if (!ev.isTrusted || /^(Shift|Control|Alt|Meta|Unidentified)$/.test(ev.key)) return;
      document.documentElement.classList.add("kb");
      document.removeEventListener("keydown", kb, true);
    };
    document.addEventListener("keydown", kb, true);
    var tip = document.querySelector(".ktip");
    if (!tip) return;
    var seen = function (ev) {
      if (/^(Shift|Control|Alt|Meta|Unidentified)$/.test(ev.key)) return;
      tip.classList.add("got");
      document.removeEventListener("keydown", seen, true);
    };
    document.addEventListener("keydown", seen, true);
  })();

  /* Press ? anywhere: a cheat sheet of every key on this page, in the clock's frame. Esc, ? or a click outside closes. */
  (function () {
    var eggsLive = null;
    var rows = [["\u2190 \u2191 \u2193 \u2192", "move the jade frame, row by row"], ["\u21b5 / SPACE", "open or play what is framed"], ["ESC", home ? "clear the filter, step back" : "back to all apps"]];
    if (!home) rows.push(["BACKSPACE", "back to all apps"]);
    if (document.querySelector(".live-phone")) eggsLive = ["CLICK", "outside the live app to leave it"];
    if (document.querySelector(".lb, .shots, .gallery, .hero-shot")) rows.push(["\u2190 \u2192 + / \u2212", "in the viewer: next shot, zoom"]);
    if (home) rows.push(["1 2 3 4", "light a bus: its apps power up"]);
    rows.push(["PGUP PGDN", "scroll; the next arrow starts on screen"], ["TAB", "plain tab order still works"], ["?", "this sheet"]);
    if (eggsLive) rows.push(eggsLive);
    var eggs = home ? [["CLOCK", "\u21b5 try it"], ["TITLE", "\u21b5 try it"], ["~/apps $", "\u21b5 try it"]] : [];
    var ov = document.createElement("div");
    ov.className = "ck kx";
    ov.hidden = true;
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Keyboard shortcuts");
    var dl = function (list, caps) {
      return '<dl class="kx-l">' + list.map(function (r) { return (caps ? '<dt class="keys">' + KCAPS(r[0]) : "<dt>" + r[0]) + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>";
    };
    ov.innerHTML = '<div class="ck-box"><div class="ck-top"><span>KEYBOARD</span><button class="ck-x" type="button" aria-label="Close">\u2715</button></div>' +
      '<p class="kx-p">~/apps <span>$</span> man keys</p>' + dl(rows, true) +
      (eggs.length ? '<p class="kx-h">// hidden in plain sight</p>' + dl(eggs) : "") +
      KCAP([[["ESC"], ""], [["?"], "close"]], "ck-kc") + '</div>';
    document.body.appendChild(ov);
    var x = ov.querySelector(".ck-x"), back = null;
    var open = function () {
      if (!ov.hidden || document.documentElement.classList.contains("lb-on")) return;
      back = document.activeElement;
      document.documentElement.style.setProperty("--sbw", (window.innerWidth - document.documentElement.clientWidth) + "px");
      document.documentElement.classList.add("lb-on");
      ov.hidden = false;
      ov.classList.remove("in");
      void ov.offsetWidth;
      if (!still.matches) ov.classList.add("in");
      x.focus({ preventScroll: true });
    };
    var close = function () {
      if (ov.hidden) return;
      ov.hidden = true;
      ov.classList.remove("in");
      document.documentElement.classList.remove("lb-on");
      if (back && back !== document.body && back.focus) back.focus({ preventScroll: true });
      back = null;
    };
    x.addEventListener("click", close);
    Array.prototype.forEach.call(document.querySelectorAll('.keys kbd[data-key="?"]'), function (k) {
      k.addEventListener("click", function (ev) {
        ev.stopPropagation();
        /* Same press as a real key: the shared cap handler lights it, clicks, and opens help. */
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
        window.setTimeout(function () { window.dispatchEvent(new KeyboardEvent("keyup", { key: "?", bubbles: true })); }, 120);
      });
    });
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    var isQ = function (ev) { return ev.key === "?" || (ev.code === "Slash" && ev.shiftKey); };
    window.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (ov.hidden) {
        if (isQ(ev) && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !(t && t.closest && t.closest("input, textarea, select, [contenteditable]"))) {
          ev.preventDefault();
          open();
        }
        return;
      }
      ev.stopPropagation();
      if (ev.key === "Escape" || isQ(ev)) { ev.preventDefault(); close(); }
      else if (ev.key === "Tab") { ev.preventDefault(); x.focus(); }
      else if (ev.key !== "Enter" && ev.key !== " ") ev.preventDefault();
    }, true);
    document.addEventListener("focusin", function (ev) { if (!ov.hidden && !ov.contains(ev.target)) x.focus({ preventScroll: true }); });
  })();

  /* Keyboard cursor: one jade frame that follows the arrow keys, the mouse and focus. Every row of every page
     is a stop. Rows are read from the layout (stops side by side form a row): Up/Down go to the row above or
     below, keeping the column; Left/Right go along the row, or to the nearest stop that way in the next row.
     Enter or Space activates a stop that has an action, Esc goes back. Text stops take focus (tabindex -1, so
     Tab order is unchanged and screen readers read them); decorative aria-hidden rows only move the frame. */
  var HOV = home
    ? ".pads .pad, #grid > li"
    : ".hero-shot, .reel-frame, .shots > figure, .gallery > figure, .acts > .act, section .feat, .code, .others > li, .live-phone, .live-open, .btn-open";
  var STOPS = (home
    ? [".mast .prompt", ".mast h1", ".mast .kact", ".mast .kpbox", ".mast .clock", ".mast .keys", ".pads .pad", "#probe .reset"]
    : [".bar .brand", ".bar nav a", ".hero .tag", ".hero .title-row", ".hero .tagline", ".hero .live-sub", ".hero .live-desc", ".hero .lede", ".hero .keys", ".act-note", "main section > h2", ".chips > li", "main .note", ".fine > p"]
  ).concat([HOV, ".foot-brand", ".foot-main > p:not(.foot-brand)", ".foot-note", ".foot-legal > span", ".foot-legal a"]);
  var TIGHT = ".prompt, .mast h1, .keys, .panel-h, .tag, .title-row, .tagline, .live-sub, .live-desc, .hero .lede, .act-note, section > h2, .note, .fine > p, .foot-brand, .foot-main > p, .foot-legal > span";
  var ROVE = { stat: ".pads .pad", tile: "#grid > li" };
  var groups = { stat: [], tile: [] }, all = [], cur = null, lastStat = null, stickyX = null;
  Array.prototype.forEach.call(document.querySelectorAll(STOPS.join(",")), function (box) {
    var act = box.matches("a[href], button, [data-kf]") ? box : box.querySelector("a[href], button, video[data-kf]");
    var virt = !!box.closest("[aria-hidden='true']");
    var f = virt ? null : act || box;
    var it = { box: box, f: f, act: !!act, virt: virt, g: null, hov: box.matches(HOV) || (!!act && !virt && box.tagName === "A"),
      tight: box.matches(TIGHT), bar: !!box.closest(".bar"), hint: box.getAttribute("data-khint"), at: box.getAttribute("data-khint-at") || "i", q: box.hasAttribute("data-khint-q") };
    if (!it.hint && box.matches("figure.frame") && act && act.tagName === "A") it.hint = "\u21b5 view";
    if (!it.hint && act && act.matches && act.matches("video[data-kf]")) it.hint = "\u21b5 play / pause";
    if (f) {
      f.setAttribute("data-k", "");
      if (!f.hasAttribute("tabindex") && !f.matches("a[href], button, video, iframe")) f.tabIndex = -1;
    }
    Object.keys(ROVE).forEach(function (g) {
      if (home && f && (box.matches(ROVE[g]) || f.matches(ROVE[g]))) { it.g = g; f.tabIndex = groups[g].length ? -1 : 0; groups[g].push(it); }
    });
    all.push(it);
  });
  if (!all.length) return;

  var box = document.createElement("div");
  box.className = "kcur";
  box.setAttribute("aria-hidden", "true");
  var hintEl = document.createElement("span");
  hintEl.className = "kcur-h";
  box.appendChild(hintEl);
  document.body.appendChild(box);
  document.documentElement.classList.add("kc");

  function shown(it) { return it.box.getClientRects().length > 0; }
  function firstShown(list) {
    for (var i = 0; i < list.length; i++) if (shown(list[i])) return list[i];
    return null;
  }
  function owner(node) {
    var best = null;
    for (var i = 0; i < all.length; i++) {
      var it = all[i];
      if (it.f === node) return it;
      if ((it.box === node || it.box.contains(node)) && (!best || best.box.contains(it.box))) best = it;
    }
    return best;
  }
  function rect(it) {
    if (it.tight) {
      var rg = document.createRange();
      rg.selectNodeContents(it.box);
      var r = rg.getBoundingClientRect();
      if (r.width && r.height) return r;
    }
    return it.box.getBoundingClientRect();
  }
  /* The live app frame has its own hairline, so the ring only joins it once the keyboard is in use. */
  var keyed = false, byKey = false;
  document.addEventListener("keydown", function () { byKey = true; if (!keyed) keyed = true; later(); }, true);
  var queued = 0;
  function place() {
    queued = 0;
    if (!cur || !shown(cur) || (!keyed && cur.box.classList.contains("live-phone"))) { box.classList.remove("on"); return; }
    var r = rect(cur), pad = cur.tight ? 7 : 5, fx = cur.bar, jump = !box.classList.contains("on") || fx !== box.classList.contains("fx");
    if (jump) box.classList.remove("go");
    box.classList.toggle("fx", fx);
    var ox = fx ? 0 : window.scrollX, oy = fx ? 0 : window.scrollY;
    box.style.transform = "translate(" + Math.round(r.left + ox - pad) + "px," + Math.round(r.top + oy - pad) + "px)";
    box.style.width = Math.round(r.width + pad * 2) + "px";
    box.style.height = Math.round(r.height + pad * 2) + "px";
    var hv = cur.box.getAttribute("data-khint") || "", lab = cur.box.hasAttribute("data-khint-l");
    while (hintEl.firstChild) hintEl.removeChild(hintEl.firstChild);
    if (lab) hv.split("|").forEach(function (c) { var b = document.createElement("b"); b.textContent = c; hintEl.appendChild(b); });
    else hintEl.textContent = hv;
    hintEl.setAttribute("data-at", cur.at);
    hintEl.classList.toggle("kq", !!cur.q);
    hintEl.classList.toggle("kl", lab);
    box.classList.toggle("hinted", !!hv && byKey);
    if (jump) { void box.offsetWidth; box.classList.add("go"); }
    box.classList.add("on");
  }
  function later() { if (!queued) queued = window.requestAnimationFrame(place); }
  document.addEventListener("kp:hint", later);
  function setCur(it, focus, how) {
    if (cur && cur !== it) cur.box.removeAttribute("data-kcur");
    cur = it;
    away = false;
    it.box.setAttribute("data-kcur", "");
    if (it.g === "stat") lastStat = it;
    if (it.g) groups[it.g].forEach(function (x) { x.f.tabIndex = x === it ? 0 : -1; });
    if (how !== "v") {
      var r = rect(it);
      stickyX = r.width > window.innerWidth * 0.5 ? r.left + 60 : (r.left + r.right) / 2;
    }
    if (focus) {
      if (it.f) { if (document.activeElement !== it.f) it.f.focus({ preventScroll: true }); }
      else if (document.activeElement && document.activeElement !== document.body && owner(document.activeElement)) document.activeElement.blur();
    }
    box.classList.remove("idle");
    place();
    document.dispatchEvent(new CustomEvent("kp:cur", { detail: it.box }));
  }
  function reveal(it) {
    if (it.bar) return;
    it.box.scrollIntoView({ block: home ? "nearest" : "center", inline: "nearest", behavior: still.matches ? "auto" : "smooth" });
    place();
  }
  function topEdge() { return home ? 0 : 56; }
  function inView(it) { var r = rect(it); return it.bar || (r.bottom > topEdge() + 8 && r.top < window.innerHeight - 8); }
  /* Spatial moves read from the layout. Up/Down: the nearest stop above or below, keeping the column the
     cursor was in (a sticky x, so a tall or wide stop in between does not drift it). Left/Right: the nearest
     stop that way on the same line, or on a line just above or below (ls and the title both reach the clock; never a line above). */
  function stopRects() {
    return all.filter(shown).map(function (it) {
      var r = rect(it), o = it.bar ? -1e6 : 0;
      return { it: it, t: r.top + o, b: r.bottom + o, l: r.left, r: r.right };
    });
  }
  function hd(x, c) { return x < c.l ? c.l - x : x > c.r ? x - c.r : 0; }
  function vd(a, c) { return c.b < a.t ? a.t - c.b : c.t > a.b ? c.t - a.b : 0; }
  var snapped = false;
  function move(from, dir) {
    /* Leaving a stat box: drop its panel preview first, so the panel's own rows are measured where they sit. */
    if (from.g === "stat" && dir === "d") document.dispatchEvent(new CustomEvent("kp:cur", { detail: null }));
    var list = stopRects(), me = null;
    list.forEach(function (x) { if (x.it === from) me = x; });
    if (!me) return null;
    if (from.bar && dir === "d") return fromScreen("d");
    var best = null, bd = Infinity;
    var x0 = stickyX === null ? (me.l + me.r) / 2 : stickyX;
    list.forEach(function (c) {
      if (c === me) return;
      var d;
      if (dir === "d" || dir === "u") {
        c.gap = dir === "d" ? c.t - me.b : me.t - c.b;
        if (c.gap < -2) return;
        if (c.gap < bd) bd = c.gap;
        return;
      }
      var hg = dir === "r" ? c.l - me.r : me.l - c.r;
      if (hg < -4) return;
      var v = vd(me, c);
      if (v > 0 && (c.t < me.t - 2 || v > 48)) return;
      d = (v > 0 ? 1e4 : 0) + hg + v * 3 + Math.abs((c.t + c.b) / 2 - (me.t + me.b) / 2) * 0.01;
      if (d < bd) { bd = d; best = c.it; }
    });
    if (dir === "d" || dir === "u") {
      /* the next line down (or up): every stop that starts within a few px of the nearest one */
      var lim = bd + 10, bx = Infinity;
      list.forEach(function (c) {
        if (c === me || c.gap === undefined || c.gap < -2 || c.gap > lim) return;
        var s = hd(x0, c) + Math.abs((c.l + c.r) / 2 - x0) * 0.001;
        if (s < bx) { bx = s; best = c.it; }
      });
    }
    snapped = false;
    if (best && best.g === "stat" && from.g !== "stat" && lastStat && shown(lastStat)) { snapped = true; return lastStat; }
    return best;
  }
  /* Scrolled away from the cursor (mouse wheel, Page Down): the next arrow starts from what is on screen. */
  function fromScreen(dir) {
    var top = topEdge(), best = null, bd = Infinity, x0 = stickyX || 0;
    stopRects().forEach(function (c) {
      if (c.it.bar) return;
      var d;
      if (dir === "d" || dir === "r") { if (c.b <= top + 8) return; d = c.t * 10 + hd(x0, c); }
      else { if (c.t >= window.innerHeight - 24) return; d = -c.b * 10 + hd(x0, c); }
      if (d < bd) { bd = d; best = c.it; }
    });
    return best;
  }
  function refresh() {
    Object.keys(groups).forEach(function (g) {
      var list = groups[g], on = null;
      list.forEach(function (x) { if (x.f.tabIndex === 0 && shown(x)) on = x; });
      on = on || firstShown(list);
      list.forEach(function (x) { x.f.tabIndex = x === on ? 0 : -1; });
    });
    if (cur && !shown(cur)) {
      var back = lastStat || firstShown(all);
      if (back) setCur(back, all.some(function (x) { return x.f === document.activeElement; }) || document.activeElement === document.body, "h");
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
    if (byKey) { byKey = false; box.classList.remove("hinted"); }
    var it = owner(ev.target);
    if (it && it.hov && it !== cur) setCur(it, true, "h");
  });
  document.addEventListener("focusin", function (ev) {
    var it = owner(ev.target);
    if (it && it.f === ev.target) { if (it !== cur) setCur(it, false, "h"); else box.classList.remove("idle"); }
    else box.classList.add("idle");
  });
  /* Section links in the top bar: the cursor follows to that section's heading. */
  Array.prototype.forEach.call(document.querySelectorAll(".bar nav a[href^='#']"), function (a) {
    a.addEventListener("click", function () {
      var sec = document.getElementById(a.getAttribute("href").slice(1));
      var h = sec && sec.querySelector("h2");
      var it = h && owner(h);
      if (it) window.requestAnimationFrame(function () { setCur(it, true, "h"); });
    });
  });

  /* Did the reader scroll on their own since the cursor last moved? (Our own smooth scroll does not count.) */
  var away = false;
  var leave = function () { away = true; };
  window.addEventListener("wheel", leave, { passive: true });
  window.addEventListener("touchmove", leave, { passive: true });
  document.addEventListener("keydown", function (ev) {
    if (/^(PageUp|PageDown|Home|End)$/.test(ev.key) || (ev.key === " " && !cur)) away = true;
  }, true);
  var DIRS = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d" };
  document.addEventListener("keydown", function (ev) {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.isComposing) return;
    var t = ev.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var k = ev.key, active = document.activeElement;
    var idle = !active || active === document.body || active === document.documentElement;
    if (!cur || !shown(cur)) cur = firstShown(all);
    if (!cur) return;
    if (DIRS[k]) {
      var d = DIRS[k], fresh = away && !inView(cur), nx = fresh ? fromScreen(d) : move(cur, d);
      if (!nx && !fresh && active !== cur.f && cur.f) nx = cur;
      if (!nx) { if (window.KWALL && cur.box && inView(cur)) window.KWALL([cur.box, box], k); return; }
      ev.preventDefault();
      setCur(nx, true, fresh || snapped || d === "l" || d === "r" ? "h" : "v");
      reveal(nx);
    } else if (k === "Escape") {
      ev.preventDefault();
      if (!home) { window.location.href = "/"; return; }
      var reset = document.querySelector(".reset");
      if (reset && !reset.hidden) reset.click();
      if (cur.g !== "stat") { var s = lastStat || groups.stat[0]; if (s) { setCur(s, true, "h"); reveal(s); } }
    } else if (k === "Backspace" && !home) {
      ev.preventDefault();
      window.location.href = "/";
    } else if (k === "Enter" || k === " ") {
      if (!cur.f) {
        /* Decorative row (no focus): Enter or Space runs its trick if it has one. */
        if (idle && cur.box.hasAttribute("data-kf")) { ev.preventDefault(); cur.box.click(); }
        else if (idle && k === " ") ev.preventDefault();
      } else if (!cur.act) {
        if (k === " " && (idle || active === cur.f)) ev.preventDefault();
      } else if (active === cur.f && cur.f.hasAttribute("data-kf")) {
        ev.preventDefault();
        cur.f.click();
      } else if ((k === "Enter" && idle) || (k === " " && (idle || (active === cur.f && cur.f.tagName === "A")))) {
        ev.preventDefault();
        setCur(cur, true, "h");
        cur.f.click();
      } else if (k === " " && active === cur.f && cur.f.tagName !== "BUTTON") {
        ev.preventDefault();
      }
    }
  });

  cur = home ? (groups.stat[0] || firstShown(all)) : (firstShown(all.filter(function (x) { return x.hov && !x.bar; })) || firstShown(all));
  if (cur) cur.box.setAttribute("data-kcur", "");
  if (cur && cur.g === "stat") lastStat = cur;
  place();
  window.requestAnimationFrame(function () { box.classList.add("go"); });
})();
