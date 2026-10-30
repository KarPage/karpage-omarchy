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

  /* Demo player: a recreated OmaRaptor HUD around YouTube's embedded player (IFrame Player API).
     Nothing loads from YouTube until the visitor presses play. Nothing is drawn over the player itself:
     YouTube's API terms forbid overlays in front of an embedded player. */
  var screen = document.querySelector(".demo-screen");
  if (screen) {
    var q = function (s) { return screen.querySelector(s); };
    var urlIn = document.getElementById("demo-url");
    var msg = document.querySelector(".demo-msg");
    var stateEl = q(".demo-state"), wordEl = q(".hud-word"), idEl = q(".demo-id"), resEl = q(".hud-res"), modeEl = q(".hud-mode");
    var runs = screen.querySelectorAll(".demo-run span");
    var view = q(".hud-view"), elpEl = q(".hud-elp"), remEl = q(".hud-rem");
    var scrub = q(".hud-scrub"), fill = q(".hud-fill"), headEl = q(".hud-head"), labs = screen.querySelectorAll(".hud-lab span");
    var vol = q(".hud-vol"), segs = screen.querySelectorAll(".hud-seg i"), volN = q(".hud-vn"), muteB = q(".hud-mute");
    var ppB = q(".hud-pp"), spdB = q(".hud-spd"), fsB = q(".hud-fs");
    var reduce = matchMedia("(prefers-reduced-motion: reduce)");
    var VID = /^[A-Za-z0-9_-]{11}$/;
    var YTH = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
    var RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
    var QUAL = { hd2160: "2160P", hd1440: "1440P", hd1080: "1080P", hd720: "720P", large: "480P", medium: "360P", small: "240P", tiny: "144P" };
    var player = null, ready = false, apiState = 0, timer = 0, dur = 0, want = null, volume = 80, muted = false, rate = 1, title = screen.getAttribute("data-title");
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
      } else if (YTH.indexOf(h) >= 0) {
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
    var say = function (text, bad) { msg.textContent = text; msg.classList.toggle("bad", !!bad); };
    var two = function (n) { return (n < 10 ? "0" : "") + n; };
    var clock = function (t) {
      t = Math.max(0, t || 0);
      var h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = Math.floor(t) % 60;
      return (h ? h + ":" : "") + two(m) + ":" + two(s);
    };
    var setClock = function (el, prefix, t) {
      el.firstChild.nodeValue = prefix + clock(t);
      el.lastChild.textContent = "." + Math.floor((Math.max(0, t) % 1) * 10);
    };
    var setTitle = function (t) {
      title = t;
      var line = "";
      for (var i = 0; i < 8; i++) line += t + "  //  ";
      Array.prototype.forEach.call(runs, function (r) { r.textContent = line; });
    };
    var setWord = function (w) {
      stateEl.textContent = w;
      wordEl.textContent = w;
      screen.classList.toggle("is-playing", w === "PLAYING");
      screen.classList.toggle("is-paused", w === "PAUSED" || w === "ENDED");
      var on = w === "PLAYING" || w === "BUFFER";
      ppB.textContent = on ? "❚❚" : "▶";
      ppB.setAttribute("aria-label", on ? "Pause" : "Play");
    };
    var now = function () { return player && ready ? player.getCurrentTime() || 0 : 0; };
    var paint = function () {
      var t = now();
      if (ready) dur = player.getDuration() || dur;
      var f = dur ? Math.min(1, t / dur) : 0;
      fill.style.transform = "scaleX(" + f + ")";
      headEl.style.left = (f * 100) + "%";
      setClock(elpEl, "", t);
      setClock(remEl, "T-", dur ? dur - t : 0);
      scrub.setAttribute("aria-valuemax", String(Math.floor(dur)));
      scrub.setAttribute("aria-valuenow", String(Math.floor(t)));
      scrub.setAttribute("aria-valuetext", clock(t) + " of " + clock(dur));
      if (dur) Array.prototype.forEach.call(labs, function (l, i) { l.textContent = clock(dur * i / (labs.length - 1)); });
      if (ready && player.getPlaybackQuality) resEl.textContent = QUAL[player.getPlaybackQuality()] || "AUTO";
    };
    var tick = function (on) {
      clearInterval(timer);
      timer = on ? setInterval(paint, 100) : 0;
      paint();
    };
    var paintVol = function () {
      var lit = muted ? 0 : Math.round(volume / 100 * segs.length);
      Array.prototype.forEach.call(segs, function (s, i) { s.classList.toggle("on", i < lit); });
      volN.textContent = muted ? "MUT" : ("00" + volume).slice(-3);
      vol.setAttribute("aria-valuenow", String(volume));
      vol.setAttribute("aria-valuetext", muted ? "muted, " + volume + " percent" : volume + " percent");
      muteB.setAttribute("aria-pressed", String(muted));
      muteB.textContent = muted ? "UNMUTE" : "MUTE";
      muteB.setAttribute("aria-label", muted ? "Unmute" : "Mute");
      screen.classList.toggle("is-muted", muted);
    };
    var applyVol = function () {
      paintVol();
      if (!ready) return;
      player.setVolume(volume);
      if (muted) player.mute(); else player.unMute();
    };
    var setVol = function (v) { volume = Math.max(0, Math.min(100, Math.round(v))); if (volume > 0) muted = false; applyVol(); };
    var seekTo = function (t) {
      if (!ready) return;
      dur = player.getDuration() || dur;
      t = Math.max(0, Math.min(dur ? dur - 0.5 : t, t));
      player.seekTo(t, true);
      paint();
    };
    var jump = function (d) { seekTo(now() + d); };
    var setRate = function (r) {
      rate = r;
      spdB.lastChild.textContent = r.toFixed(2) + "x";
      spdB.setAttribute("aria-label", "Playback speed " + r + "x");
      if (ready) player.setPlaybackRate(r);
    };
    var onState = function (ev) {
      apiState = ev.data;
      var S = window.YT.PlayerState;
      var w = { "-1": "LOADING", 0: "ENDED", 1: "PLAYING", 2: "PAUSED", 3: "BUFFER", 5: "CUED" }[ev.data] || "READY";
      setWord(w);
      tick(ev.data === S.PLAYING || ev.data === S.BUFFERING);
      if (ev.data === S.PLAYING) {
        say("");
        var vd = player.getVideoData && player.getVideoData();
        if (vd && vd.title && idEl.textContent !== screen.getAttribute("data-id")) setTitle(vd.title);
      }
    };
    var ERR = { 2: "That video ID isn't valid.", 5: "This video can't play in the web player.", 100: "That video is private or was removed.", 101: "The owner doesn't allow this video in embeds.", 150: "The owner doesn't allow this video in embeds." };
    var build = function (id, start) {
      screen.classList.add("live");
      var f = document.createElement("iframe");
      var p = new URLSearchParams({ enablejsapi: "1", origin: location.origin, widget_referrer: location.href, autoplay: "1", controls: "0", modestbranding: "1", rel: "0", playsinline: "1", iv_load_policy: "3", disablekb: "1", fs: "0" });
      if (start) p.set("start", String(start));
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?" + p.toString();
      f.id = "demo-yt";
      f.title = "YouTube video player: " + title;
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.referrerPolicy = "strict-origin-when-cross-origin";
      f.tabIndex = -1;
      view.replaceChildren(f);
      player = new window.YT.Player(f, {
        host: "https://www.youtube-nocookie.com",
        events: {
          onReady: function () {
            ready = true;
            applyVol();
            if (rate !== 1) player.setPlaybackRate(rate);
            if (want) { var w = want; want = null; load(w.id, w.start); return; }
            player.playVideo();
            paint();
            setTimeout(function () { if (ready && (apiState === -1 || apiState === 5)) say("Press ▶ or tap the video to start."); }, 4000);
          },
          onStateChange: onState,
          onPlaybackQualityChange: paint,
          onError: function (ev) { setWord("ERROR"); tick(false); say(ERR[ev.data] || "YouTube couldn't play that video.", true); }
        }
      });
    };
    var api = null;
    var withApi = function (fn) {
      if (window.YT && window.YT.Player) { fn(); return; }
      if (!api) {
        api = [];
        window.onYouTubeIframeAPIReady = function () { var l = api; api = []; l.forEach(function (g) { g(); }); };
        var s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.async = true;
        s.onerror = function () { setWord("ERROR"); say("Couldn't reach YouTube. Check the connection and try again.", true); api = null; };
        document.head.appendChild(s);
      }
      api.push(fn);
    };
    var load = function (id, start) {
      idEl.textContent = id;
      dur = 0;
      if (id === screen.getAttribute("data-id")) setTitle(screen.getAttribute("data-title"));
      else setTitle("youtu.be/" + id);
      if (player && ready) { player.loadVideoById({ videoId: id, startSeconds: start || 0 }); setWord("LOADING"); return; }
      if (player) { want = { id: id, start: start }; return; }
      setWord("LOADING");
      withApi(function () { if (!player) build(id, start); });
    };
    var start = function () {
      if (player) return;
      var r = parseLink(urlIn.value);
      if (r.err) { r = { id: screen.getAttribute("data-id"), start: 0 }; urlIn.value = "https://www.youtube.com/watch?v=" + r.id; }
      say("");
      load(r.id, r.start);
    };
    var toggle = function () {
      if (!player) { start(); return; }
      if (!ready) return;
      if (apiState === 1 || apiState === 3) player.pauseVideo(); else player.playVideo();
    };
    var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
    var paintFs = function () {
      var on = fsEl() === screen || screen.classList.contains("max");
      screen.classList.toggle("is-fs", on);
      modeEl.textContent = on ? "FULL" : "WINDOW";
      fsB.setAttribute("aria-pressed", String(on));
      fsB.setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
    };
    var fullscreen = function () {
      if (fsEl() === screen) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if (screen.classList.contains("max")) { screen.classList.remove("max"); document.documentElement.classList.remove("demo-max"); paintFs(); return; }
      var req = screen.requestFullscreen || screen.webkitRequestFullscreen;
      var fallback = function () { screen.classList.add("max"); document.documentElement.classList.add("demo-max"); paintFs(); };
      if (!req) { fallback(); return; }
      try { var pr = req.call(screen); if (pr && pr.catch) pr.catch(fallback); } catch (x) { fallback(); }
    };
    document.addEventListener("fullscreenchange", paintFs);
    document.addEventListener("webkitfullscreenchange", paintFs);

    /* drag sliders: pointer for mouse and touch */
    var drag = function (el, onFrac) {
      var frac = function (ev) {
        var r = (el.querySelector(".hud-rail") || el.querySelector(".hud-seg")).getBoundingClientRect();
        return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      };
      el.addEventListener("pointerdown", function (ev) {
        if (ev.button !== 0) return;
        ev.preventDefault();
        el.focus({ preventScroll: true });
        if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);
        el.classList.add("drag");
        onFrac(frac(ev), false);
        var mv = function (e2) { onFrac(frac(e2), false); };
        var up = function (e2) {
          el.removeEventListener("pointermove", mv);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
          el.classList.remove("drag");
          if (e2.type === "pointerup") onFrac(frac(e2), true);
        };
        el.addEventListener("pointermove", mv);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
      });
    };
    drag(scrub, function (f, done) {
      if (!ready || !dur) return;
      var t = f * dur;
      fill.style.transform = "scaleX(" + f + ")";
      headEl.style.left = (f * 100) + "%";
      setClock(elpEl, "", t);
      setClock(remEl, "T-", dur - t);
      player.seekTo(t, done);
    });
    drag(vol, function (f) { setVol(f * 100); });

    var hit = function (b) {
      if (reduce.matches) return;
      b.classList.add("hit");
      setTimeout(function () { b.classList.remove("hit"); }, 140);
    };
    q(".hud-poster").addEventListener("click", start);
    ppB.addEventListener("click", toggle);
    q(".hud-back").addEventListener("click", function () { jump(-10); });
    q(".hud-fwd").addEventListener("click", function () { jump(10); });
    muteB.addEventListener("click", function () { muted = !muted; applyVol(); });
    spdB.addEventListener("click", function () { var i = RATES.indexOf(rate); setRate(RATES[(i + 1) % RATES.length]); });
    fsB.addEventListener("click", fullscreen);

    screen.addEventListener("keydown", function (ev) {
      if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.isComposing) return;
      var k = ev.key, live = !!player, t = ev.target, onSlider = t === scrub || t === vol;
      var btn = t !== screen && t.tagName === "BUTTON";
      var act = null;
      if (k === " " || k === "k" || k === "K") act = function () { toggle(); hit(ppB); };
      else if (k === "Enter" && !btn) act = function () { toggle(); hit(ppB); };
      else if (k === "j" || k === "J") act = function () { jump(-10); hit(q(".hud-back")); };
      else if (k === "l" || k === "L") act = function () { jump(10); hit(q(".hud-fwd")); };
      else if (k === "m" || k === "M") act = function () { muted = !muted; applyVol(); hit(muteB); };
      else if (k === "f" || k === "F") act = function () { fullscreen(); hit(fsB); };
      else if (k === "Escape" && screen.classList.contains("max")) act = fullscreen;
      else if ((live || onSlider) && !ev.shiftKey) {
        if (k === "ArrowLeft") act = t === vol ? function () { setVol(volume - 5); } : function () { jump(-5); };
        else if (k === "ArrowRight") act = t === vol ? function () { setVol(volume + 5); } : function () { jump(5); };
        else if (k === "ArrowUp") act = t === scrub ? function () { jump(5); } : function () { setVol(volume + 5); };
        else if (k === "ArrowDown") act = t === scrub ? function () { jump(-5); } : function () { setVol(volume - 5); };
        else if (k === "Home" && onSlider) act = t === vol ? function () { setVol(0); } : function () { seekTo(0); };
        else if (k === "End" && onSlider) act = t === vol ? function () { setVol(100); } : function () { seekTo(dur); };
      }
      if (!act) return;
      ev.preventDefault();
      ev.stopPropagation();
      act();
    });
    /* a click on the video itself hands focus to YouTube's frame; take it back so the shortcuts keep working */
    window.addEventListener("blur", function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (a && a.tagName === "IFRAME" && screen.contains(a)) screen.focus({ preventScroll: true });
      }, 0);
    });

    var fromInput = function () {
      var r = parseLink(urlIn.value);
      if (r.err) { say(r.err, true); return; }
      say("");
      load(r.id, r.start);
      screen.focus({ preventScroll: true });
    };
    document.querySelector(".demo-go").addEventListener("click", fromInput);
    urlIn.addEventListener("keydown", function (ev) {
      if (ev.isComposing) return;
      if (ev.key === "Enter") { ev.preventDefault(); fromInput(); }
      else if (ev.key === "Escape") { ev.preventDefault(); urlIn.blur(); }
    });
    paintVol();
    paint();
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
    document.dispatchEvent(new CustomEvent("kp:cur", { detail: it.box }));
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
