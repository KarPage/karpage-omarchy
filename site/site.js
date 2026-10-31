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
    var TYPE = 80, DEL = 40, HOLD = 2800, GAP = 450;
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
        if (n >= seq[idx].length) { phase = "hold"; tw.classList.remove("k"); wait = HOLD; } else { wait = TYPE; }
      } else if (phase === "hold") {
        phase = "del";
        tw.classList.add("k");
        wait = DEL;
      } else {
        n--;
        draw();
        if (n <= 0) {
          phase = "type";
          idx = (idx + 1) % seq.length;
          wait = GAP;
        } else {
          wait = DEL;
        }
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

    /* A tap on the preview panel (not on a link or button in it) hints at the boxes above: one short jade
       pulse runs across them in order. Reduced motion gets one brief static highlight instead. */
    var pulseT = 0;
    panel.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest("a, button")) return;
      board.classList.remove("pulse");
      void board.offsetWidth;
      board.classList.add("pulse");
      window.clearTimeout(pulseT);
      pulseT = window.setTimeout(function () { board.classList.remove("pulse"); }, 1150);
    });

    /* Selection over a stat box previews it in the panel text; Enter, Space or a click commits. */
    var hint = panel.querySelector(".panel-hint");
    var hinted = null;
    var showHint = function (b) {
      if (b === hinted) return;
      hinted = b;
      if (!b) { panel.classList.remove("hinting"); hint.hidden = true; return; }
      var t = b.getAttribute("data-hint");
      var act = b.getAttribute("aria-pressed") === "true" ? "enter to clear" : b.getAttribute("data-filter") === "all" ? "enter to list" : "enter to filter";
      hint.textContent = t + " ";
      var dim = document.createElement("span");
      dim.textContent = act;
      hint.appendChild(dim);
      hint.hidden = false;
      hint.style.animation = "none";
      void hint.offsetWidth;
      hint.style.animation = "";
      panel.classList.add("hinting");
    };
    document.addEventListener("kp:cur", function (ev) {
      var el = ev.detail;
      showHint(el && el.classList.contains("stat") && board.contains(el) ? el : null);
    });
    document.addEventListener("kp:filter", function () { var b = hinted; hinted = null; if (b) showHint(b); });
  }

  /* Keycap hints light up while their real key is held. */
  var caps = document.querySelectorAll(".keys kbd[data-key]");
  if (caps.length) {
    var lit = function (key, on) {
      Array.prototype.forEach.call(caps, function (k) { if (k.getAttribute("data-key") === key) k.classList.toggle("hit", on); });
    };
    document.addEventListener("keydown", function (ev) { lit(ev.key, true); });
    document.addEventListener("keyup", function (ev) { lit(ev.key, false); });
    window.addEventListener("blur", function () { Array.prototype.forEach.call(caps, function (k) { k.classList.remove("hit"); }); });
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

  /* Kar Page live frame: the frame is one cursor stop; Enter (or a click on its edge) moves focus into the app. */
  Array.prototype.forEach.call(document.querySelectorAll(".live-phone"), function (v) {
    var f = v.querySelector("iframe");
    v.addEventListener("click", function (ev) { if (f && ev.target === v) f.focus(); });
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

  /* Selection cursor: one box that follows the mouse and the arrow keys. */
  var home = document.body.classList.contains("home");
  var SPEC = home
    ? [".board .stat", "#panel .rows > li", "#grid > li"]
    : [".hero-shot, .reel-frame, .shots > figure, .gallery > figure, .acts > .act, .grid > .feat, section > .feat, .code, .others > li, .live-phone, .live-open, .btn-open"];
  var groups = [], all = [], cur = null, lastStat = null;
  SPEC.forEach(function (sel, g) {
    var list = [];
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (box) {
      var f = box.matches("a[href], button, [data-kf]") ? box : box.querySelector("a[href], button, input, video[data-kf]");
      if (!f && !home) { f = box; f.tabIndex = -1; }
      if (!f) return;
      f.setAttribute("data-k", "");
      if (home) f.tabIndex = list.length ? -1 : 0;
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
  /* The live app frame has its own hairline, so the ring only joins it once the keyboard is in use. */
  var keyed = false;
  document.addEventListener("keydown", function () { if (!keyed) { keyed = true; later(); } }, true);
  var queued = 0;
  function place() {
    queued = 0;
    if (!cur || !shown(cur) || (!keyed && cur.box.classList.contains("live-phone"))) { box.classList.remove("on"); return; }
    var r = cur.box.getBoundingClientRect(), pad = 5, jump = !box.classList.contains("on");
    if (jump) box.classList.remove("go");
    box.style.transform = "translate(" + Math.round(r.left + window.scrollX - pad) + "px," + Math.round(r.top + window.scrollY - pad) + "px)";
    box.style.width = Math.round(r.width + pad * 2) + "px";
    box.style.height = Math.round(r.height + pad * 2) + "px";
    if (jump) { void box.offsetWidth; box.classList.add("go"); }
    box.classList.add("on");
  }
  function later() { if (!queued) queued = window.requestAnimationFrame(place); }
  function setCur(it, focus) {
    cur = it;
    if (home && it.g === 0) lastStat = it;
    if (home) groups[it.g].forEach(function (x) { x.f.tabIndex = x === it ? 0 : -1; });
    if (focus && document.activeElement !== it.f) it.f.focus({ preventScroll: true });
    box.classList.remove("idle");
    place();
    document.dispatchEvent(new CustomEvent("kp:cur", { detail: it.box }));
  }
  function reveal(it) {
    if (!home) it.box.scrollIntoView({ block: "center", inline: "nearest", behavior: still.matches ? "auto" : "smooth" });
    else it.box.scrollIntoView({ block: "nearest", inline: "nearest", behavior: still.matches ? "auto" : "instant" });
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
  /* App pages step in reading order: Down/Up walk every stop one by one (hero, reel, each screenshot, the cards,
     features...), Left/Right only move to a neighbour in the same visual row. Not engaged yet: start at the screen. */
  function step(from, dir, engaged) {
    var list = all.filter(shown), i = list.indexOf(from);
    if (!engaged || i < 0) {
      var top = 56, bot = window.innerHeight;
      if (dir === "d" || dir === "r") { for (i = 0; i < list.length; i++) if (list[i].box.getBoundingClientRect().bottom > top + 24) return list[i]; return list[list.length - 1]; }
      for (i = list.length - 1; i >= 0; i--) if (list[i].box.getBoundingClientRect().top < bot - 24) return list[i];
      return list[0];
    }
    if (dir === "d") return list[i + 1] || null;
    if (dir === "u") return list[i - 1] || null;
    var n = list[i + (dir === "r" ? 1 : -1)];
    if (!n || n.box.parentNode !== from.box.parentNode) return null;
    var a = from.box.getBoundingClientRect(), b = n.box.getBoundingClientRect();
    return gap(a.top, a.bottom, b.top, b.bottom) > 0 ? null : n;
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
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    var k = ev.key, active = document.activeElement;
    var idle = !active || active === document.body || active === document.documentElement;
    if (!cur || !shown(cur)) cur = firstShown(all);
    if (!cur) return;
    if (DIRS[k] && !home) {
      var on = active === cur.f, nx = step(cur, DIRS[k], on);
      if (!nx) return;
      ev.preventDefault();
      setCur(nx, true);
      reveal(nx);
    } else if (DIRS[k]) {
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
    } else if (k === " " && !home && active === cur.f && cur.f.tagName !== "BUTTON") {
      ev.preventDefault();
    }
  });

  cur = firstShown(all);
  if (home && cur && cur.g === 0) lastStat = cur;
  place();
  window.requestAnimationFrame(function () { box.classList.add("go"); });
})();
