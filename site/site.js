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
    };
    Array.prototype.forEach.call(boxes, function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-filter");
        var on = b.getAttribute("aria-pressed") === "true";
        pick(on ? "" : key);
        if (!on && key === "all") panel.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    });
    reset.addEventListener("click", function () { pick(""); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && board.classList.contains("has-active")) pick("");
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
})();
