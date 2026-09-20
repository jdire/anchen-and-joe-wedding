(function () {
  var toggle = document.querySelector(".menu-toggle");
  var navigation = document.querySelector(".site-navigation");
  var main = document.getElementById("main-content");

  function applyRoleNavigation(principal) {
    var authControl = document.getElementById("auth-control");
    var isAuthenticated = Boolean(principal && principal.authenticated);
    var roles = isAuthenticated
      ? principal.role === "day"
        ? ["ceremony"]
        : ["evening"]
      : [];
    if (authControl) {
      authControl.hidden = !isAuthenticated;
    }
    document.querySelectorAll("[data-required-role]").forEach(function (item) {
      var requiredRole = item.getAttribute("data-required-role");
      var visible = roles.indexOf(requiredRole) !== -1;
      item.hidden = !visible;
      item.setAttribute("aria-hidden", String(!visible));
    });
  }

  // The role check only ever needs to run once — the header persists across
  // client-side page swaps below, so it never has to re-fetch or re-render.
  fetch("/auth/me", { credentials: "same-origin" })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(applyRoleNavigation)
    .catch(function () {
      applyRoleNavigation(null);
    });

  function closeMobileMenu() {
    if (toggle && navigation) {
      toggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    }
  }

  if (toggle && navigation) {
    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
    });
  }

  // innerHTML-injected <script> tags never execute, so each per-page script
  // (reveal animations, embeds, the mini-game canvas, etc.) must be re-created.
  function runPageScripts(container) {
    container.querySelectorAll("script").forEach(function (oldScript) {
      var newScript = document.createElement("script");
      for (var i = 0; i < oldScript.attributes.length; i++) {
        var attribute = oldScript.attributes[i];
        newScript.setAttribute(attribute.name, attribute.value);
      }
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });
  }

  function finishContentSwap(container) {
    runPageScripts(container);
    applyRevealFallback(container);
  }

  function applyRevealFallback(container) {
    container.querySelectorAll(".reveal").forEach(function (element) {
      if (element.style.opacity === "0") {
        element.style.opacity = "1";
        element.style.transform = "none";
      }
    });
    container.querySelectorAll("details.reveal").forEach(function (element) {
      element.open = false;
    });
  }

  // The scripts inside main already ran natively during the initial page
  // parse, so only the reveal/accordion fallback needs to run here.
  applyRevealFallback(main);

  var canSoftNavigate =
    "fetch" in window && window.history && "pushState" in window.history;

  function syncHomeStyle(parsedDocument) {
    var currentStyle = document.getElementById("home-inline-style");
    var nextStyle = parsedDocument.getElementById("home-inline-style");
    if (!nextStyle) {
      if (currentStyle) currentStyle.remove();
      return;
    }
    if (!currentStyle) {
      currentStyle = document.createElement("style");
      currentStyle.id = "home-inline-style";
      document.head.appendChild(currentStyle);
    }
    currentStyle.textContent = nextStyle.textContent;
  }

  function isSoftNavigableLink(link) {
    if (!link) return false;
    var href = link.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    if (link.target && link.target !== "_self") return false;
    if (link.hasAttribute("download")) return false;
    if (href.indexOf("/logout") === 0 || href.indexOf("/auth/") === 0)
      return false;
    var url;
    try {
      url = new URL(href, window.location.href);
    } catch (error) {
      return false;
    }
    return url.origin === window.location.origin;
  }

  function clearTrackedTimers() {
    if (window.__activeTimers) {
      window.__activeTimers.splice(0).forEach(function (id) {
        clearInterval(id);
      });
    }
  }

  function loadPage(url, pushHistory) {
    fetch(url, { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("Navigation failed");
        return response.text().then(function (html) {
          return { html: html, finalUrl: response.url };
        });
      })
      .then(function (result) {
        var parsed = new DOMParser().parseFromString(result.html, "text/html");
        var newMain = parsed.getElementById("main-content");
        if (!newMain) throw new Error("Unrecognised page content");
        clearTrackedTimers();
        main.innerHTML = newMain.innerHTML;
        document.title = parsed.title;
        syncHomeStyle(parsed);
        if (pushHistory) {
          window.history.pushState({ softNav: true }, "", result.finalUrl);
        }
        closeMobileMenu();
        window.scrollTo(0, 0);
        finishContentSwap(main);
      })
      .catch(function () {
        window.location.href = url;
      });
  }

  if (canSoftNavigate) {
    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      var link = event.target.closest("a");
      if (!isSoftNavigableLink(link)) return;
      var url = new URL(link.getAttribute("href"), window.location.href);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        closeMobileMenu();
        return;
      }
      event.preventDefault();
      loadPage(url.href, true);
    });

    window.addEventListener("popstate", function () {
      loadPage(window.location.href, false);
    });
  }
})();

