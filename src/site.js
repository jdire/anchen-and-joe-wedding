(function () {
  var toggle = document.querySelector(".menu-toggle");
  var navigation = document.querySelector(".site-navigation");

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

  fetch("/auth/me", { credentials: "same-origin" })
    .then(function (response) {
      return response.ok ? response.json() : null;
    })
    .then(applyRoleNavigation)
    .catch(function () {
      applyRoleNavigation(null);
    });

  if (toggle && navigation) {
    toggle.addEventListener("click", function () {
      var isOpen = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!isOpen));
      navigation.classList.toggle("is-open", !isOpen);
    });

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        toggle.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
      }
    });
  }

  document.querySelectorAll(".reveal").forEach(function (element) {
    if (element.style.opacity === "0") {
      element.style.opacity = "1";
      element.style.transform = "none";
    }
  });

  document.querySelectorAll("details.reveal").forEach(function (element) {
    element.open = false;
  });
})();
