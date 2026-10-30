(function () {
  var NS = "http://www.w3.org/2000/svg";
  var SUBTITLE = "open tools for people who drive their computers";
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
    var s = svgEl("svg", { viewBox: "0 0 512 512", fill: "currentColor" });
    var g = svgEl("g", { transform: "translate(0,512) scale(0.1,-0.1)" });
    g.appendChild(svgEl("path", { d: "M840 4159 c0 -637 3 -958 10 -954 5 3 10 12 10 19 0 28 153 315 210 394 l60 83 0 710 0 709 -145 0 -145 0 0 -961z M1420 4560 c0 -308 2 -560 5 -560 3 0 29 18 58 39 65 48 201 131 216 131 8 0 11 130 11 475 l0 475 -145 0 -145 0 0 -560z M2310 4264 c-623 -99 -1128 -505 -1354 -1091 -40 -103 -68 -209 -93 -348 -19 -109 -18 36 -14 -1977 l1 -848 140 0 139 0 4 1388 c3 1287 4 1392 21 1462 68 291 193 524 386 721 192 196 451 336 730 396 67 14 130 18 300 18 200 0 222 -2 320 -27 587 -149 991 -585 1091 -1178 7 -41 13 -140 13 -220 -1 -238 -44 -423 -149 -635 -311 -627 -1021 -934 -1697 -734 -57 17 -145 50 -197 75 -51 24 -98 44 -103 44 -7 0 -6 -273 1 -297 3 -10 116 -57 208 -87 186 -60 268 -71 518 -71 188 1 234 4 320 23 374 81 709 275 948 547 464 529 565 1261 262 1890 -198 411 -567 733 -1005 879 -183 61 -282 77 -500 81 -142 3 -221 0 -290 -11z M2366 3684 c-464 -84 -814 -426 -923 -904 -16 -68 -17 -170 -18 -1125 0 -577 1 -1186 3 -1352 l3 -303 133 0 133 0 7 37 c3 21 6 620 6 1331 0 1431 -3 1368 65 1525 18 43 48 103 67 134 78 131 269 293 344 293 32 0 34 -2 34 -34 0 -19 -7 -39 -17 -47 -9 -8 -24 -32 -34 -54 -17 -37 -19 -82 -19 -667 l0 -628 33 0 c43 1 105 30 143 68 55 54 65 91 71 244 l6 139 33 -3 c28 -3 70 -39 268 -231 l236 -229 0 -43 0 -43 -72 -26 c-187 -68 -376 -74 -553 -19 -82 25 -185 75 -185 89 0 8 -9 14 -21 14 -40 0 -143 91 -248 220 l-20 25 0 -205 -1 -205 42 -30 c134 -97 264 -157 426 -197 73 -19 115 -22 262 -22 159 0 184 3 275 28 202 55 409 177 543 321 467 499 396 1284 -151 1691 -244 182 -577 261 -871 208z m419 -294 c44 -12 119 -42 167 -67 85 -44 88 -46 88 -80 l0 -36 -67 7 c-125 12 -143 1 -338 -194 -150 -151 -174 -170 -202 -170 l-33 0 0 236 c0 227 -1 236 -20 241 -15 4 -20 14 -20 38 0 33 0 34 58 40 31 4 62 8 67 11 25 10 227 -7 300 -26z m429 -271 c94 -105 164 -253 191 -404 19 -111 19 -189 0 -301 -31 -176 -115 -333 -248 -461 -66 -64 -79 -73 -112 -73 l-38 0 8 53 c13 90 10 159 -10 197 -10 19 -105 123 -211 231 -175 176 -194 198 -194 229 0 37 -26 8 353 397 81 83 147 159 147 167 0 11 10 16 34 16 28 0 42 -9 80 -51z" }));
    s.appendChild(g);
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

  function markRaptor() {
    var s = svgRoot();
    s.appendChild(svgEl("path", {
      d: "M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6",
      stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "square"
    }));
    s.appendChild(svgEl("path", {
      d: "M16 8v5M16 19v5M8 16h5M19 16h5",
      stroke: "currentColor", "stroke-width": "1.4", "stroke-linecap": "square"
    }));
    s.appendChild(svgEl("rect", { x: "14.6", y: "14.6", width: "2.8", height: "2.8", fill: "currentColor" }));
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
    raptor: markRaptor,
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

  var heroAssigned = false;
  var galleries = [];
  var toastNode = null;
  var toastTimer = 0;

  function iconSvg(children) {
    var svg = svgEl("svg", {
      viewBox: "0 0 16 16",
      width: "16",
      height: "16",
      fill: "none",
      "aria-hidden": "true",
      focusable: "false"
    });
    children.forEach(function (child) { svg.appendChild(child); });
    return svg;
  }

  function iconDownload() {
    return iconSvg([
      svgEl("path", {
        d: "M8 1.6v8.2M4.7 6.7 8 10l3.3-3.3M2.6 13.4h10.8",
        stroke: "currentColor",
        "stroke-width": "1.6",
        "stroke-linecap": "square",
        "stroke-linejoin": "miter"
      })
    ]);
  }

  function iconPlay() {
    return iconSvg([
      svgEl("path", { d: "M5 2.8v10.4l8.2-5.2z", fill: "currentColor" })
    ]);
  }

  function iconExternal() {
    return iconSvg([
      svgEl("path", {
        d: "M6.2 3H3.2v9.6h9.6V9.6M8.4 3H13v4.6M12.8 3.2 7.2 8.8",
        stroke: "currentColor",
        "stroke-width": "1.6",
        "stroke-linecap": "square",
        "stroke-linejoin": "miter"
      })
    ]);
  }

  function iconGithub() {
    return iconSvg([
      svgEl("path", {
        fill: "currentColor",
        d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      })
    ]);
  }

  function iconChevron(dir) {
    return iconSvg([
      svgEl("path", {
        d: dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5",
        stroke: "currentColor",
        "stroke-width": "1.6",
        "stroke-linecap": "square",
        "stroke-linejoin": "miter"
      })
    ]);
  }

  function say(message) {
    live.textContent = "";
    window.setTimeout(function () {
      live.textContent = message;
    }, 20);
  }

  function showCopied() {
    if (!toastNode) {
      toastNode = document.createElement("p");
      toastNode.className = "toast";
      toastNode.setAttribute("role", "status");
      document.body.appendChild(toastNode);
    }
    toastNode.textContent = "copied \u2713";
    toastNode.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastNode.classList.remove("show");
      toastNode.textContent = "";
    }, 1700);
  }

  function selectText(node) {
    var range = document.createRange();
    range.selectNodeContents(node);
    var selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function copyText(value, onOk, onFail) {
    function done(ok) {
      if (ok) onOk();
      else onFail();
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

  function shotRecord(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = shotId(raw.id);
    if (!id) return null;
    var w = Number(raw.w);
    var h = Number(raw.h);
    return {
      id: id,
      alt: typeof raw.alt === "string" ? raw.alt.trim() : "",
      w: w > 0 && w < 8000 ? Math.round(w) : 0,
      h: h > 0 && h < 8000 ? Math.round(h) : 0,
      x2: raw.x2 === true,
      avif: raw.avif === true
    };
  }

  function shotList(rawList) {
    if (!Array.isArray(rawList)) return [];
    var listed = [];
    rawList.forEach(function (raw) {
      var shot = shotRecord(raw);
      if (shot) listed.push(shot);
    });
    return listed;
  }

  function shotsFrom(app) {
    if (Array.isArray(app.shots)) return shotList(app.shots);
    var id = shotId(app.shot);
    if (!id) return [];
    return [{
      id: id,
      alt: typeof app.shotAlt === "string" ? app.shotAlt.trim() : "",
      w: 1280,
      h: 800,
      x2: false
    }];
  }

  function frameKind(app, shots) {
    if (app.frame === "phone" || app.frame === "wide") return app.frame;
    if (shots[0] && shots[0].h > shots[0].w) return "phone";
    return "wide";
  }

  function pictureFor(shot, name, eager) {
    var picture = document.createElement("picture");
    var base = "img/" + shot.id;
    if (shot.avif) {
      var avif = document.createElement("source");
      avif.type = "image/avif";
      avif.srcset = shot.x2 ? base + ".avif 1x, " + base + "-2x.avif 2x" : base + ".avif";
      picture.appendChild(avif);
    }
    var source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = shot.x2 ? base + ".webp 1x, " + base + "-2x.webp 2x" : base + ".webp";
    var img = document.createElement("img");
    img.src = base + ".png";
    img.alt = shot.alt || name;
    img.decoding = "async";
    img.width = shot.w || 1280;
    img.height = shot.h || 800;
    if (eager && !heroAssigned) {
      heroAssigned = true;
      img.loading = "eager";
      img.setAttribute("fetchpriority", "high");
    } else {
      img.loading = "lazy";
    }
    picture.appendChild(source);
    picture.appendChild(img);
    return picture;
  }

  function windowFrame(name, shot, eager) {
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
    title.textContent = name;
    caption.appendChild(dots);
    caption.appendChild(title);
    var screen = document.createElement("div");
    screen.className = "screen";
    if (shot.w && shot.h) screen.style.aspectRatio = shot.w + " / " + shot.h;
    screen.appendChild(pictureFor(shot, name, eager));
    figure.appendChild(caption);
    figure.appendChild(screen);
    return figure;
  }

  function markGallery(gallery, index) {
    var dots = gallery.querySelectorAll(".gal-dot");
    var count = dots.length;
    Array.prototype.forEach.call(dots, function (dot, i) {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    var prev = gallery.querySelector(".gal-prev");
    var next = gallery.querySelector(".gal-next");
    if (prev) prev.disabled = index <= 0;
    if (next) next.disabled = index >= count - 1;
  }

  function layoutGallery(gallery) {
    var scroller = gallery.querySelector(".gal-scroller");
    var slides = gallery.querySelectorAll(".gal-slide");
    if (!scroller || !slides.length) return;
    var mid = scroller.scrollLeft + scroller.clientWidth / 2;
    var closest = 0;
    var closestDist = Infinity;
    Array.prototype.forEach.call(slides, function (slide, i) {
      var center = slide.offsetLeft + slide.offsetWidth / 2;
      var dist = Math.abs(center - mid);
      var span = Math.max(slide.offsetWidth, 1);
      var amount = Math.min(1, dist / (span * 0.92));
      var win = slide.querySelector(".window");
      if (win) {
        win.style.setProperty("--p", amount.toFixed(3));
        win.style.setProperty("--side", center < mid ? "-1" : "1");
      }
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    var target = Number(gallery.dataset.index || "0");
    if (gallery.dataset.lock === "1" && closest !== target) return;
    gallery.dataset.lock = "";
    gallery.dataset.index = String(closest);
    markGallery(gallery, closest);
  }

  function goTo(gallery, index) {
    var scroller = gallery.querySelector(".gal-scroller");
    var slides = gallery.querySelectorAll(".gal-slide");
    var count = slides.length;
    if (!count || !scroller) return;
    if (index < 0) index = 0;
    if (index > count - 1) index = count - 1;
    var slide = slides[index];
    var left = Math.max(0, slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2);
    gallery.dataset.index = String(index);
    gallery.dataset.lock = Math.abs(scroller.scrollLeft - left) < 2 ? "" : "1";
    markGallery(gallery, index);
    scroller.scrollTo({
      left: left,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  }

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    return el.isContentEditable;
  }

  function mostVisibleGallery() {
    var best = null;
    var bestRatio = 0;
    var viewH = window.innerHeight || document.documentElement.clientHeight;
    galleries.forEach(function (gallery) {
      var rect = gallery.getBoundingClientRect();
      var visible = Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
      if (visible <= 0) return;
      var ratio = visible / Math.max(rect.height, 1);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = gallery;
      }
    });
    return best;
  }

  function onGalleryKey(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    var active = document.activeElement;
    if (isEditable(active) && !(active.closest && active.closest("[data-gallery]"))) return;
    var gallery = active && active.closest ? active.closest("[data-gallery]") : null;
    if (!gallery) gallery = document.querySelector("[data-gallery]:hover");
    if (!gallery) gallery = mostVisibleGallery();
    if (!gallery) return;
    event.preventDefault();
    var index = Number(gallery.dataset.index || "0");
    goTo(gallery, index + (event.key === "ArrowRight" ? 1 : -1));
  }

  function bindGalleryKeys() {
    if (bindGalleryKeys.done) return;
    bindGalleryKeys.done = true;
    document.addEventListener("keydown", onGalleryKey);
    window.addEventListener("resize", function () {
      galleries.forEach(layoutGallery);
    });
  }

  function bindGallery(gallery) {
    var scroller = gallery.querySelector(".gal-scroller");
    var ticking = false;
    galleries.push(gallery);
    gallery.dataset.index = "0";
    markGallery(gallery, 0);
    scroller.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        layoutGallery(gallery);
      });
    }, { passive: true });
    bindGalleryKeys();
    window.requestAnimationFrame(function () { layoutGallery(gallery); });
  }

  function galleryFor(name, shots) {
    var gallery = document.createElement("div");
    gallery.className = "gallery";
    gallery.setAttribute("data-gallery", "");
    gallery.dataset.frame = frameKind({ frame: shots.frame }, shots);
    var scroller = document.createElement("div");
    scroller.className = "gal-scroller";
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-roledescription", "carousel");
    scroller.setAttribute("aria-label", "Screenshots of " + name);
    shots.forEach(function (shot, index) {
      var slide = document.createElement("div");
      slide.className = "gal-slide";
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", (index + 1) + " of " + shots.length);
      slide.appendChild(windowFrame(name, shot, index === 0));
      scroller.appendChild(slide);
    });
    var controls = document.createElement("div");
    controls.className = "gal-controls";
    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "gal-nav gal-prev";
    prev.setAttribute("aria-label", "Previous " + name + " screenshot");
    prev.appendChild(iconChevron(-1));
    var dots = document.createElement("div");
    dots.className = "gal-dots";
    shots.forEach(function (shot, index) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gal-dot";
      dot.setAttribute("aria-label", "Screenshot " + (index + 1) + " of " + shots.length);
      dot.appendChild(document.createElement("span"));
      dot.addEventListener("click", function () { goTo(gallery, index); });
      dots.appendChild(dot);
    });
    var next = document.createElement("button");
    next.type = "button";
    next.className = "gal-nav gal-next";
    next.setAttribute("aria-label", "Next " + name + " screenshot");
    next.appendChild(iconChevron(1));
    prev.addEventListener("click", function () {
      goTo(gallery, Number(gallery.dataset.index || "0") - 1);
    });
    next.addEventListener("click", function () {
      goTo(gallery, Number(gallery.dataset.index || "0") + 1);
    });
    controls.appendChild(prev);
    controls.appendChild(dots);
    controls.appendChild(next);
    gallery.appendChild(scroller);
    gallery.appendChild(controls);
    bindGallery(gallery);
    return gallery;
  }

  function mainMedia(app, name, shots) {
    if (!shots.length) return null;
    if (shots.length === 1) {
      var figure = windowFrame(name, shots[0], true);
      if (frameKind(app, shots) === "phone") figure.classList.add("frame-phone");
      return figure;
    }
    shots.frame = frameKind(app, shots);
    return galleryFor(name, shots);
  }

  function mountMedia(app, name, article) {
    var shots = shotsFrom(app);
    var railShots = shotList(app.rail);
    if (!shots.length && !railShots.length) return;
    var main = mainMedia(app, name, shots);
    if (!railShots.length) {
      if (main) article.appendChild(main);
      return;
    }
    var row = document.createElement("div");
    row.className = "media-row";
    if (main) row.appendChild(main);
    var rail = document.createElement("div");
    rail.className = "rail";
    railShots.forEach(function (shot) {
      rail.appendChild(windowFrame(name, shot, false));
    });
    row.appendChild(rail);
    article.appendChild(row);
  }

  function showCommand(box, command) {
    var code = box.querySelector("code");
    code.textContent = command;
    box.hidden = false;
    selectText(code);
  }

  function appendFine(article, app) {
    if (!Array.isArray(app.fine)) return article;
    var box = document.createElement("div");
    box.className = "fine";
    app.fine.forEach(function (raw) {
      if (typeof raw !== "string" || raw.trim() === "") return;
      var line = document.createElement("p");
      line.textContent = raw.trim();
      box.appendChild(line);
    });
    if (box.childNodes.length) article.appendChild(box);
    return article;
  }

  function renderApp(app, index) {
    if (!app || typeof app.name !== "string" || app.name.trim() === "") return null;
    var name = app.name.trim();
    var article = document.createElement("article");
    article.className = "app";
    article.id = slugFor(name);
    var titleId = "app-" + index + "-title";
    article.setAttribute("aria-labelledby", titleId);

    var identity = document.createElement("div");
    identity.className = "identity";
    identity.appendChild(logoFor(app));
    var idText = document.createElement("div");
    idText.className = "id-text";
    var head = document.createElement("div");
    head.className = "head";
    var num = document.createElement("span");
    num.className = "num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = String(index + 1).padStart(2, "0");
    head.appendChild(num);
    var title = document.createElement("h2");
    title.id = titleId;
    title.textContent = name;
    head.appendChild(title);
    if (typeof app.status === "string" && app.status.trim() !== "") {
      var badge = document.createElement("span");
      badge.className = "badge state-" + slugFor(app.status);
      badge.textContent = app.status.trim();
      head.appendChild(badge);
    }
    idText.appendChild(head);
    if (typeof app.tagline === "string" && app.tagline.trim() !== "") {
      var tag = document.createElement("p");
      tag.className = "tagline";
      tag.textContent = app.tagline.trim();
      idText.appendChild(tag);
    }
    if (typeof app.description === "string" && app.description.trim() !== "") {
      var desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = app.description.trim();
      idText.appendChild(desc);
    }
    if (Array.isArray(app.notes)) {
      app.notes.forEach(function (raw) {
        if (typeof raw !== "string" || raw.trim() === "") return;
        var note = document.createElement("p");
        note.className = "note";
        note.textContent = raw.trim();
        idText.appendChild(note);
      });
    }
    if (Array.isArray(app.points)) {
      var list = document.createElement("ul");
      list.className = "points";
      app.points.forEach(function (raw) {
        if (typeof raw !== "string" || raw.trim() === "") return;
        var li = document.createElement("li");
        li.textContent = raw.trim();
        list.appendChild(li);
      });
      if (list.childNodes.length) idText.appendChild(list);
    }
    identity.appendChild(idText);
    article.appendChild(identity);
    mountMedia(app, name, article);

    var items = [];
    var openUrl = httpsUrl(app.open);
    if (openUrl) items.push({ kind: "open", href: openUrl });
    var site = httpsUrl(app.site);
    if (site) items.push({ kind: "site", href: site });
    var install = commandText(app.install);
    if (install) items.push({ kind: "install", command: install });
    var launch = commandText(app.launch);
    if (launch) items.push({ kind: "launch", command: launch });
    var source = httpsUrl(app.source);
    if (source) items.push({ kind: "source", href: source });
    if (!items.length) return appendFine(article, app);

    var primary = "launch";
    var i;
    for (i = 0; i < items.length; i += 1) {
      if (items[i].kind === "open") primary = "open";
    }
    if (primary !== "open") {
      for (i = 0; i < items.length; i += 1) {
        if (items[i].kind === "install") primary = "install";
      }
    }

    var actions = document.createElement("div");
    actions.className = "actions";
    var fallback = document.createElement("p");
    fallback.className = "command-fallback";
    fallback.hidden = true;
    var prompt = document.createElement("span");
    prompt.className = "prompt";
    prompt.setAttribute("aria-hidden", "true");
    prompt.textContent = "$";
    var code = document.createElement("code");
    fallback.appendChild(prompt);
    fallback.appendChild(code);
    var hasCommand = false;

    items.forEach(function (item) {
      var el;
      var label = document.createElement("span");
      if (item.kind === "open") {
        el = document.createElement("a");
        el.href = item.href;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
        el.setAttribute("aria-label", "Open " + name);
        el.appendChild(iconExternal());
        label.textContent = "open";
      } else if (item.kind === "site") {
        el = document.createElement("a");
        el.href = item.href;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
        el.setAttribute("aria-label", "Website for " + name);
        el.appendChild(iconExternal());
        label.textContent = "website";
      } else if (item.kind === "source") {
        el = document.createElement("a");
        el.href = item.href;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
        el.setAttribute("aria-label", "Source for " + name);
        el.appendChild(iconGithub());
        label.textContent = "source";
      } else if (item.kind === "install") {
        el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", "Copy install command for " + name);
        el.appendChild(iconDownload());
        label.textContent = "install";
        hasCommand = true;
        el.addEventListener("click", function () {
          copyText(item.command, function () {
            fallback.hidden = true;
            showCopied();
          }, function () {
            showCommand(fallback, item.command);
            say("Could not copy.");
          });
        });
      } else if (item.kind === "launch") {
        el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", "Copy launch command for " + name);
        el.appendChild(iconPlay());
        label.textContent = "launch";
        hasCommand = true;
        el.addEventListener("click", function () {
          copyText(item.command, function () {
            fallback.hidden = true;
            showCopied();
          }, function () {
            showCommand(fallback, item.command);
            say("Could not copy.");
          });
        });
      } else {
        return;
      }
      el.className = "btn" + (item.kind === primary ? " primary" : "");
      el.appendChild(label);
      actions.appendChild(el);
    });

    article.appendChild(actions);
    if (hasCommand) article.appendChild(fallback);
    return appendFine(article, app);
  }

  function statusOf(app) {
    return typeof app.status === "string" ? app.status.trim().toLowerCase() : "";
  }

  function renderStats(apps) {
    var counts = { total: 0, open: 0, listed: 0, review: 0, soon: 0 };
    apps.forEach(function (app) {
      if (!app || typeof app.name !== "string" || app.name.trim() === "") return;
      counts.total += 1;
      if (typeof app.license === "string" && app.license.trim() !== "" && httpsUrl(app.source)) counts.open += 1;
      var status = statusOf(app);
      if (status === "marketplace") counts.listed += 1;
      else if (status === "in review") counts.review += 1;
      else if (status === "coming soon") counts.soon += 1;
    });
    [
      ["apps", counts.total],
      ["open source · MIT", counts.open],
      ["on omarchy marketplace", counts.listed],
      ["marketplace review", counts.review],
      ["coming soon", counts.soon]
    ].forEach(function (tile) {
      if (!tile[1]) return;
      var wrap = document.createElement("div");
      wrap.className = "stat";
      var dt = document.createElement("dt");
      dt.textContent = tile[0];
      var dd = document.createElement("dd");
      dd.textContent = String(tile[1]);
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      stats.appendChild(wrap);
    });
    stats.style.setProperty("--tiles", String(stats.children.length));
    stats.setAttribute("aria-busy", "false");
  }

  function slugFor(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function renderIndex(apps) {
    var nav = document.getElementById("index");
    if (!nav) return;
    apps.forEach(function (app, index) {
      if (!app || typeof app.name !== "string" || app.name.trim() === "") return;
      var a = document.createElement("a");
      a.href = "#" + slugFor(app.name.trim());
      var num = document.createElement("span");
      num.className = "num";
      num.textContent = String(index + 1).padStart(2, "0");
      a.appendChild(num);
      a.appendChild(document.createTextNode(app.name.trim()));
      nav.appendChild(a);
    });
  }

  function normalize(data) {
    if (Array.isArray(data)) return { apps: data };
    if (data && Array.isArray(data.apps)) {
      return { apps: data.apps };
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
      renderStats(pack.apps);
      renderIndex(pack.apps);
      pack.apps.forEach(function (app, index) {
        var article = renderApp(app, index);
        if (article) root.appendChild(article);
      });
      root.setAttribute("aria-busy", "false");
    })
    .catch(fail);
})();
