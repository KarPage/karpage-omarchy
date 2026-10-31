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
    var at = {};
    var lit = function (key, on) {
      Array.prototype.forEach.call(caps, function (k) {
        if (k.getAttribute("data-key") !== key) return;
        if (on) { at[key] = Date.now(); k.classList.add("hit"); return; }
        window.setTimeout(function () { k.classList.remove("hit"); }, Math.max(0, 160 - (Date.now() - (at[key] || 0))));
      });
    };
    /* The ENTER / SPACE cap shows whichever of the two was pressed last (ENTER until then). */
    var sw = document.querySelectorAll(".keys .ksw");
    var typing = function (t) { return t && t.closest && t.closest("input, textarea, select, [contenteditable]"); };
    document.addEventListener("keydown", function (ev) {
      if ((ev.key === " " || ev.key === "Enter") && !typing(ev.target)) {
        Array.prototype.forEach.call(sw, function (w) { w.classList.toggle("sp", ev.key === " "); });
      }
      lit(ev.key, true);
    });
    document.addEventListener("keyup", function (ev) { lit(ev.key, false); });
    window.addEventListener("keydown", function (ev) { if (ev.key === "?") lit("?", true); }, true);
    window.addEventListener("keyup", function (ev) { if (ev.key === "?") lit("?", false); }, true);
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
    if (!f) return;
    /* The app is another origin, so its key presses never reach this page and Tab only walks the app's own
       controls. While it has focus a small tag says how to leave: a click outside it. Once the app posts
       {type: "kp:escape"} to its parent, Esc lands back on this frame and the tag says ESC from then on. */
    var tag = document.createElement("span");
    tag.className = "live-x";
    tag.setAttribute("aria-hidden", "true");
    tag.innerHTML = "<kbd>CLICK</kbd> outside to leave the app";
    v.appendChild(tag);
    var inside = function () { v.classList.toggle("in-app", document.activeElement === f); };
    window.addEventListener("blur", function () { window.setTimeout(inside, 0); });
    /* A click on empty page space after using the app lands back on this frame, so the arrows carry on from it. */
    var back = function () {
      var was = v.classList.contains("in-app");
      inside();
      if (was && document.activeElement === document.body) v.focus({ preventScroll: true });
    };
    window.addEventListener("focus", back);
    document.addEventListener("pointerdown", function () { if (v.classList.contains("in-app")) window.setTimeout(back, 0); });
    document.addEventListener("focusin", inside);
    window.addEventListener("message", function (ev) {
      if (ev.origin !== "https://karpage.app" || ev.source !== f.contentWindow) return;
      var d = ev.data;
      if (d === "kp:escape" || (d && d.type === "kp:escape")) {
        tag.innerHTML = "<kbd>ESC</kbd> back to the page";
        v.focus({ preventScroll: true }); inside();
      }
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
     and the key row demos itself. ASCII only and monospace, so nothing changes size (zero layout shift). */
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
      var cells = "";
      for (var c = 0; c < 42; c++) cells += '<span class="ck-d" role="gridcell" id="ckd' + c + '"></span>';
      ov.innerHTML = '<div class="ck-box"><div class="ck-top"><span class="ck-l"><svg class="kpm-l" viewBox="60 60 392 392" width="26" height="26" fill="none" stroke-linecap="square" aria-hidden="true" focusable="false"><path stroke="#00a86b" vector-effect="non-scaling-stroke" d="M64 160V64h96M352 64h96v96M448 352v96h-96M160 448H64v-96"/><path stroke="#3fe0a4" vector-effect="non-scaling-stroke" d="M170 120V392M204 120V196A88 88 0 1 1 268 344H204V392M246 214V300M304 214L250 258L306 300"/></svg>LOCAL TIME</span><button class="ck-x" type="button" aria-label="Close">\u2715</button></div>' +
        '<p class="ck-time"><span class="ck-hm"></span><span class="ck-s"></span></p><p class="ck-date"></p>' +
        '<div class="ck-mh"><button class="ck-nav ck-prev" type="button" aria-label="Previous month">\u2190</button><b class="ck-m" aria-live="polite"></b><button class="ck-nav ck-next" type="button" aria-label="Next month">\u2192</button></div>' +
        '<div class="ck-wd" aria-hidden="true"><span>su</span><span>mo</span><span>tu</span><span>we</span><span>th</span><span>fr</span><span>sa</span></div>' +
        '<div class="ck-grid" role="grid" tabindex="0" aria-label="Month">' + cells + '</div>' +
        '<p class="ck-foot"></p><p class="ck-keys" aria-hidden="true">\u2190\u2191\u2193\u2192 day \u00b7 PGUP PGDN month \u00b7 T today \u00b7 ESC close</p></div>';
      document.body.appendChild(ov);
      var q = function (s) { return ov.querySelector(s); };
      var oBox = q(".ck-box"), oHM = q(".ck-hm"), oS = q(".ck-s"), oDate = q(".ck-date"), oM = q(".ck-m"), oGrid = q(".ck-grid"), oFoot = q(".ck-foot");
      var oX = q(".ck-x"), oPrev = q(".ck-prev"), oNext = q(".ck-next"), dCells = ov.querySelectorAll(".ck-d");
      var sel = null, oT = 0, oBack = null;
      var same = function (a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); };
      var isoWeek = function (d) {
        var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        var n = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - n);
        return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
      };
      var drawCal = function () {
        var now = new Date(), y = sel.getFullYear(), m = sel.getMonth();
        var first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
        oM.textContent = MON[m].toUpperCase() + " " + y;
        for (var i = 0; i < 42; i++) {
          var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), el = dCells[i];
          el.textContent = d.getDate();
          el.className = "ck-d" + (d.getMonth() !== m ? " out" : "") + (same(d, now) ? " today" : "") + (same(d, sel) ? " sel" : "");
          el.setAttribute("aria-selected", String(same(d, sel)));
          el.setAttribute("aria-label", DAY[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear() + (same(d, now) ? ", today" : ""));
          el.setAttribute("data-i", String(i));
          if (same(d, sel)) oGrid.setAttribute("aria-activedescendant", el.id);
        }
        var y0 = new Date(y, 0, 1), doy = Math.round((new Date(y, m, sel.getDate()) - y0) / 864e5) + 1;
        var len = Math.round((new Date(y + 1, 0, 1) - y0) / 864e5);
        var gap = Math.round((new Date(y, m, sel.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
        oFoot.textContent = "> day " + doy + " of " + len + " \u00b7 week " + isoWeek(sel) + " \u00b7 " +
          (gap === 0 ? "today" : gap > 0 ? "in " + gap + (gap === 1 ? " day" : " days") : -gap + (gap === -1 ? " day ago" : " days ago"));
      };
      var tickBig = function () {
        var d = new Date();
        var cc = document.createElement("span");
        cc.className = "cc";
        cc.textContent = ":";
        oHM.textContent = two(d.getHours());
        oHM.appendChild(cc);
        oHM.appendChild(document.createTextNode(two(d.getMinutes())));
        oS.textContent = ":" + two(d.getSeconds());
        oDate.textContent = DAY[d.getDay()] + " \u00b7 " + d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear();
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
        tickBig();
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
        oGrid.focus({ preventScroll: true });
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
      oPrev.addEventListener("click", function () { shift(0, -1); });
      oNext.addEventListener("click", function () { shift(0, 1); });
      ov.addEventListener("click", function (ev) {
        if (ev.target === ov) { ckClose(); return; }
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
        if (k === "Escape") { ev.preventDefault(); ckClose(); }
        else if (STEP[k]) { ev.preventDefault(); shift(STEP[k], 0); }
        else if (k === "PageUp" || k === "PageDown") { ev.preventDefault(); shift(0, k === "PageUp" ? -1 : 1); }
        else if (k === "Home" || k === "t" || k === "T") { ev.preventDefault(); var n = new Date(); sel = new Date(n.getFullYear(), n.getMonth(), n.getDate()); drawCal(); }
        else if (k === "Tab") {
          ev.preventDefault();
          var f = [oX, oPrev, oGrid, oNext], at = f.indexOf(document.activeElement);
          f[(at + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus();
        } else if ((k === "Enter" || k === " ") && !onBtn) ev.preventDefault();
      }, true);
      document.addEventListener("focusin", function (ev) {
        if (!ov.hidden && !ov.contains(ev.target)) oGrid.focus({ preventScroll: true });
      });
      document.addEventListener("visibilitychange", function () { if (!ov.hidden && !document.hidden) tickBig(); });
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

    /* 3. Prompt: a tiny preset terminal. Enter runs the next command (ls, uname -a, then a sudo that fails),
       Backspace erases them one step at a time, Esc (or leaving the row) closes it. The output is an
       overlay below the prompt, so nothing on the page moves (zero layout shift). */
    var pr = document.querySelector(".mast .prompt");
    if (pr) {
      pr.tabIndex = -1;
      mark(pr, "\u21b5 run", "r", true);
      var dollar = pr.querySelector("span"), sweepT = [], timers = [];
      var paint = function (el, typed, cursor) {
        /* Fresh nodes each frame, so the moving cursor never counts as a layout shift. */
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
          var at = still.matches ? 0 : i * 80;
          sweepT.push(window.setTimeout(function () { t.classList.add("ls-hit"); }, at));
          sweepT.push(window.setTimeout(function () { t.classList.remove("ls-hit"); }, at + (still.matches ? 700 : 420)));
        });
      };
      var apps = Array.prototype.map.call(document.querySelectorAll("#grid .tile[href]"), function (t) {
        return t.getAttribute("href").replace(/^\/+|\/+$/g, "") + "/";
      }).join("  ");
      var CMDS = [
        { c: "ls", out: [[apps, ""]] },
        { c: "uname -a", out: [["KarPage apps 1.0-omarchy #1 SMP PREEMPT jade-on-ink x86_64 keyboard/Linux", ""]] },
        { c: "sudo rm -rf boredom", out: [["[sudo] password for guest: ********", "dim"], ["rm: cannot remove 'boredom': permission denied. nice try.", "err"]] }
      ];
      var term = document.createElement("div");
      term.className = "pterm";
      term.setAttribute("role", "log");
      term.setAttribute("aria-live", "polite");
      term.setAttribute("aria-label", "Terminal output");
      var tin = document.createElement("div");
      tin.className = "pterm-in";
      term.appendChild(tin);
      pr.parentNode.insertBefore(term, pr.nextSibling);
      var n = 0, busy = false, queue = [], idleLine = null;
      var hint = function () {
        var h = n >= CMDS.length ? "\u232b delete|esc exit" : n ? "\u21b5 run again|\u232b delete|esc exit" : "\u21b5 run";
        pr.setAttribute("data-khint", h);
        pr.setAttribute("data-term", String(n));
        document.dispatchEvent(new Event("kp:hint"));
      };
      var fit = function () {
        term.style.height = tin.children.length ? tin.offsetHeight + "px" : "0px";
        term.classList.toggle("on", tin.children.length > 0);
      };
      var wait = function (ms, fn) { timers.push(window.setTimeout(fn, still.matches ? 0 : ms)); };
      var typeInto = function (el, word, done) {
        if (still.matches) { paint(el, word, false); done(); return; }
        var i = 0;
        paint(el, "", true);
        var step = function () {
          i++;
          paint(el, word.slice(0, i), true);
          if (i < word.length) wait(i === 1 ? 90 : 55 + Math.random() * 45, step);
          else wait(200, function () { paint(el, word, false); done(); });
        };
        wait(160, step);
      };
      var eraseFrom = function (el, word, done) {
        if (still.matches) { paint(el, "", true); done(); return; }
        var i = word.length;
        var step = function () {
          i--;
          paint(el, word.slice(0, i), true);
          if (i > 0) wait(28, step); else wait(90, done);
        };
        step();
      };
      var outLines = function (k) {
        return CMDS[k].out.map(function (o) {
          var d = document.createElement("div");
          d.className = "pt-o" + (o[1] ? " pt-" + o[1] : "");
          d.setAttribute("data-step", String(k + 1));
          d.textContent = o[0];
          return d;
        });
      };
      var newIdle = function () {
        idleLine = document.createElement("div");
        idleLine.className = "pt-p";
        paint(idleLine, "", true);
        tin.appendChild(idleLine);
      };
      var forward = function (done) {
        if (n >= CMDS.length) { done(); return; }
        var k = n, line = k ? idleLine : pr;
        typeInto(line, CMDS[k].c, function () {
          if (k) line.setAttribute("data-step", String(k + 1));
          else { sweep(); pr.removeAttribute("aria-label"); }
          var os = outLines(k), j = 0;
          idleLine = null;
          var add = function () {
            tin.appendChild(os[j++]);
            fit();
            if (j < os.length) wait(320, add);
            else { n = k + 1; newIdle(); fit(); hint(); done(); }
          };
          add();
        });
      };
      var back = function (done) {
        if (n <= 0) { done(); return; }
        var k = n - 1;
        Array.prototype.forEach.call(tin.querySelectorAll('.pt-o[data-step="' + (k + 1) + '"]'), function (o) { tin.removeChild(o); });
        if (idleLine && idleLine.parentNode) tin.removeChild(idleLine);
        idleLine = null;
        fit();
        if (k === 0) { n = 0; paint(pr, "ls", false); hint(); done(); return; }
        var line = tin.querySelector('.pt-p[data-step="' + (k + 1) + '"]');
        line.removeAttribute("data-step");
        eraseFrom(line, CMDS[k].c, function () { idleLine = line; n = k; fit(); hint(); done(); });
      };
      var pump = function () {
        if (busy || !queue.length) return;
        busy = true;
        var fn = queue.shift();
        fn(function () { busy = false; pump(); });
      };
      var reset = function () {
        timers.forEach(window.clearTimeout);
        timers = [];
        queue = [];
        busy = false;
        n = 0;
        idleLine = null;
        while (tin.firstChild) tin.removeChild(tin.firstChild);
        paint(pr, "ls", false);
        fit();
        hint();
      };
      pr.addEventListener("click", function () {
        if (queue.length < 3) queue.push(forward);
        pump();
      });
      document.addEventListener("keydown", function (ev) {
        if (ev.key !== "Backspace" || ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
        var t = ev.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (!pr.hasAttribute("data-kcur") || (!n && !busy && !queue.length)) return;
        ev.preventDefault();
        if (queue.length < 3) queue.push(back);
        pump();
      });
      /* Leaving the row (arrows, Esc, a click elsewhere) closes the terminal. */
      new MutationObserver(function () { if (!pr.hasAttribute("data-kcur") && (n || busy)) reset(); }).observe(pr, { attributes: true, attributeFilter: ["data-kcur"] });
      document.addEventListener("pointerdown", function (ev) { if ((n || busy) && !pr.contains(ev.target) && !term.contains(ev.target)) reset(); });
      hint();
    }

    /* 4. Key row: lights its own keycaps in order. */
    var kr = document.querySelector(".mast .keys");
    if (kr) {
      mark(kr, "\u21b5 demo", "r");
      var kT = [];
      kr.addEventListener("click", function () {
        kT.forEach(window.clearTimeout);
        kT = [];
        var ks = kr.querySelectorAll("kbd");
        Array.prototype.forEach.call(ks, function (k, i) {
          var at = still.matches ? 0 : i * 120;
          kT.push(window.setTimeout(function () { k.classList.add("hit"); }, at));
          kT.push(window.setTimeout(function () { k.classList.remove("hit"); }, at + (still.matches ? 600 : 220)));
        });
      });
    }
  })();

  /* The home tip acknowledges the first arrow press, once. */
  (function () {
    var tip = document.querySelector(".ktip");
    if (!tip) return;
    var seen = function (ev) {
      if (!/^Arrow/.test(ev.key)) return;
      tip.classList.add("got");
      document.removeEventListener("keydown", seen, true);
    };
    document.addEventListener("keydown", seen, true);
  })();

  /* Press ? anywhere: a cheat sheet of every key on this page, in the clock's frame. Esc, ? or a click outside closes. */
  (function () {
    var rows = [["\u2190 \u2191 \u2193 \u2192", "move the jade frame, row by row"], ["\u21b5 / SPACE", "open or play what is framed"], ["ESC", home ? "clear the filter, step back" : "back to all apps"]];
    if (!home) rows.push(["BACKSPACE", "back to all apps"]);
    if (document.querySelector(".live-phone")) rows.push(["CLICK", "outside the live app to leave it"]);
    if (document.querySelector(".lb, .shots, .gallery, .hero-shot")) rows.push(["\u2190 \u2192 + / \u2212", "in the viewer: next shot, zoom"]);
    rows.push(["PGUP PGDN", "scroll; the next arrow starts on screen"], ["TAB", "plain tab order still works"], ["?", "this sheet"]);
    var eggs = home ? [["CLOCK", "\u21b5 try it"], ["TITLE", "\u21b5 try it"], ["~/apps $", "\u21b5 try it"], ["KEY ROW", "\u21b5 try it"]] : [];
    var ov = document.createElement("div");
    ov.className = "ck kx";
    ov.hidden = true;
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("aria-label", "Keyboard shortcuts");
    var dl = function (list) {
      return '<dl class="kx-l">' + list.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>";
    };
    ov.innerHTML = '<div class="ck-box"><div class="ck-top"><span>KEYBOARD</span><button class="ck-x" type="button" aria-label="Close">\u2715</button></div>' +
      '<p class="kx-p">~/apps <span>$</span> man keys</p>' + dl(rows) +
      (eggs.length ? '<p class="kx-h">// hidden in plain sight</p>' + dl(eggs) : "") +
      '<p class="ck-keys" aria-hidden="true">ESC or ? to close</p></div>';
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
        k.classList.add("hit");
        window.setTimeout(function () { k.classList.remove("hit"); }, 160);
        open();
      });
    });
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    window.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (ov.hidden) {
        if (ev.key === "?" && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !(t && t.closest && t.closest("input, textarea, select, [contenteditable]"))) {
          ev.preventDefault();
          open();
        }
        return;
      }
      ev.stopPropagation();
      if (ev.key === "Escape" || ev.key === "?") { ev.preventDefault(); close(); }
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
    ? ".board .stat, #panel .rows > li > a, #grid > li"
    : ".hero-shot, .reel-frame, .shots > figure, .gallery > figure, .acts > .act, section .feat, .code, .others > li, .live-phone, .live-open, .btn-open";
  var STOPS = (home
    ? [".mast .prompt", ".mast h1", ".mast .clock", ".mast .lede", ".mast .keys", ".board .stat", "#panel .reset", "#panel .panel-body > .panel-h", "#panel .rows > li > a"]
    : [".bar .brand", ".bar nav a", ".hero .tag", ".hero .title-row", ".hero .tagline", ".hero .live-sub", ".hero .live-desc", ".hero .lede", ".hero .keys", ".act-note", "main section > h2", ".chips > li", "main .note", ".fine > p"]
  ).concat([HOV, ".foot-brand", ".foot-main > p:not(.foot-brand)", ".foot-note", ".foot-legal > span", ".foot-legal a"]);
  var TIGHT = ".prompt, .mast h1, .keys, .panel-h, .tag, .title-row, .tagline, .live-sub, .live-desc, .hero .lede, .act-note, section > h2, .note, .fine > p, .foot-brand, .foot-main > p, .foot-legal > span";
  var ROVE = { stat: ".board .stat", row: "#panel .rows > li > a.row-app", tile: "#grid > li" };
  var groups = { stat: [], row: [], tile: [] }, all = [], cur = null, lastStat = null, stickyX = null;
  if (home) Array.prototype.forEach.call(document.querySelectorAll("#panel .panel-body > .panel-h"), function (p) { p.setAttribute("data-kf", ""); });
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
      if (!nx) return;
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
