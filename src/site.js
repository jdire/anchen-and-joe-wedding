(function () {
  var toggle = document.querySelector('.menu-toggle');
  var navigation = document.querySelector('.site-navigation');

  if (toggle && navigation) {
    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      navigation.classList.toggle('is-open', !isOpen);
    });

    navigation.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        toggle.setAttribute('aria-expanded', 'false');
        navigation.classList.remove('is-open');
      }
    });
  }

  document.querySelectorAll('.reveal').forEach(function (element) {
    if (element.style.opacity === '0') {
      element.style.opacity = '1';
      element.style.transform = 'none';
    }
  });

  document.querySelectorAll('details.reveal').forEach(function (element) {
    element.open = false;
  });
})();