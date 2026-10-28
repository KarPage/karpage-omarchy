(function () {
  var root = document.getElementById("apps");
  var live = document.getElementById("copy-status");
  root.setAttribute("aria-busy", "true");

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

  function localImage(value) {
    if (typeof value !== "string" || value === "") return "";
    if (value.charAt(0) === "/" || value.indexOf("\\") !== -1) return "";
    if (value.split("/").indexOf("..") !== -1) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "";
    return value;
  }

  function commandText(value) {
    if (typeof value !== "string") return "";
    var text = value.trim();
    if (text === "" || /[\r\n]/.test(text)) return "";
    return text;
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

  function renderApp(app, index) {
    if (!app || typeof app.name !== "string" || app.name.trim() === "") return null;

    var article = document.createElement("article");
    article.className = "app";
    var titleId = "app-" + index + "-title";
    article.setAttribute("aria-labelledby", titleId);

    var head = document.createElement("div");
    head.className = "head";
    var title = document.createElement("h2");
    title.id = titleId;
    title.textContent = app.name.trim();
    head.appendChild(title);
    if (typeof app.status === "string" && app.status.trim() !== "") {
      var badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = app.status.trim();
      head.appendChild(badge);
    }
    article.appendChild(head);

    if (typeof app.description === "string" && app.description.trim() !== "") {
      var desc = document.createElement("p");
      desc.className = "desc";
      desc.textContent = app.description.trim();
      article.appendChild(desc);
    }

    var image = localImage(app.image);
    if (image) {
      var img = document.createElement("img");
      img.src = image;
      img.width = 800;
      img.height = 500;
      img.alt = typeof app.imageAlt === "string" && app.imageAlt.trim() !== ""
        ? app.imageAlt.trim()
        : app.name.trim();
      article.appendChild(img);
    }

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
      copy.setAttribute("aria-label", "Copy " + label.toLowerCase() + " command for " + app.name.trim());
      copy.focus();
      say(label + " command for " + app.name.trim() + ". " + command);
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
      copyText(current, app.name.trim(), currentLabel, code, copy);
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

  function fail() {
    var message = document.createElement("p");
    message.className = "error";
    message.textContent = "Could not load apps.json.";
    root.appendChild(message);
    root.setAttribute("aria-busy", "false");
  }

  fetch("apps.json")
    .then(function (response) {
      if (!response.ok) throw new Error("status");
      return response.json();
    })
    .then(function (apps) {
      if (!Array.isArray(apps)) {
        fail();
        return;
      }
      apps.forEach(function (app, index) {
        var article = renderApp(app, index);
        if (article) root.appendChild(article);
      });
      root.setAttribute("aria-busy", "false");
    })
    .catch(fail);
})();
