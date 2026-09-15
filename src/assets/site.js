(function () {
  'use strict';

  /* ---------------- mobile menu ---------------- */
  var panel = document.getElementById('panel');
  var menubtn = document.getElementById('menubtn');
  var closebtn = document.getElementById('closebtn');
  var lastFocus = null;

  function focusable() {
    return Array.prototype.slice.call(
      panel.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (el) { return el.offsetParent !== null; });
  }

  function openPanel() {
    lastFocus = document.activeElement;
    panel.classList.add('open');
    menubtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    var f = focusable();
    if (f.length) f[0].focus();
  }

  function closePanel() {
    if (!panel.classList.contains('open')) return;
    panel.classList.remove('open');
    menubtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  if (menubtn && panel) {
    menubtn.addEventListener('click', openPanel);
    closebtn.addEventListener('click', closePanel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closePanel(); return; }
      if (e.key !== 'Tab' || !panel.classList.contains('open')) return;
      // keep tabbing inside the open menu
      var f = focusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------------- knowledge category filter ---------------- */
  var pills = document.getElementById('pills');
  if (pills) {
    pills.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cat]');
      if (!a) return;
      e.preventDefault();
      var cat = a.getAttribute('data-cat');
      pills.querySelectorAll('a').forEach(function (x) { x.classList.toggle('on', x === a); });
      var shown = 0;
      document.querySelectorAll('#cards .card, .feature[data-cat]').forEach(function (c) {
        var cats = (c.getAttribute('data-cat') || '').split(' ');
        var hit = (cat === 'all') || cats.indexOf(cat) > -1;
        c.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      document.getElementById('nocards').style.display = shown ? 'none' : 'block';
    });

    var reset = document.querySelector('[data-cat-reset]');
    if (reset) reset.addEventListener('click', function (e) {
      e.preventDefault();
      pills.querySelector('a[data-cat="all"]').click();
    });
  }

  /* ---------------- booking form ----------------
     Deliberately has no server side. The form builds a WhatsApp message and
     hands it to the patient's own WhatsApp to send, so nothing typed here is
     ever transmitted to, or stored by, this site. The chosen time is a
     REQUEST -- the clinic diary is not online, so availability is not checked
     and the appointment exists only once the clinic replies. */
  var bookform = document.getElementById('bookform');
  if (bookform) {
    var CLINIC_NUMBER = '919701864848';
    var date = document.getElementById('bf-date');

    // no past dates, and nothing more than three months out
    var today = new Date();
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    date.min = iso(today);
    var horizon = new Date(today.getTime());
    horizon.setMonth(horizon.getMonth() + 3);
    date.max = iso(horizon);

    function fieldError(el, show, message) {
      var msg = el.closest('.field').querySelector('.err');
      if (msg) {
        if (message) msg.textContent = message;
        msg.hidden = !show;
      }
      if (show) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      return !show;
    }

    // clear an error as soon as the field is touched
    ['bf-name', 'bf-age', 'bf-mobile', 'bf-date'].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener('input', function () { fieldError(el, false); });
    });
    bookform.addEventListener('change', function (e) {
      if (e.target.name === 'slot') document.getElementById('err-slot').hidden = true;
    });

    bookform.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('bf-name');
      var age = document.getElementById('bf-age');
      var mobile = document.getElementById('bf-mobile');
      var slot = bookform.querySelector('input[name=slot]:checked');
      var firstBad = null;
      var ok = true;

      function check(el, valid, message) {
        if (!fieldError(el, !valid, message)) {
          ok = false;
          if (!firstBad) firstBad = el;
        }
      }

      check(name, name.value.trim() !== '');
      check(age, age.value !== '' && +age.value >= 0 && +age.value <= 120);
      // Indian mobile numbers are ten digits; tolerate spaces, dashes and +91
      check(mobile, /^\+?9?1?[\s-]?[6-9]\d{4}[\s-]?\d{5}$/.test(mobile.value.replace(/\s|-/g, '')),
            'Please give a ten-digit mobile number.');

      var dv = date.value;
      var sunday = dv && new Date(dv + 'T00:00:00').getDay() === 0;
      check(date, !!dv && !sunday,
            sunday ? 'The clinic is closed on Sundays — please pick another day.'
                   : 'Please choose a date.');

      if (!slot) {
        document.getElementById('err-slot').hidden = false;
        ok = false;
        if (!firstBad) firstBad = bookform.querySelector('input[name=slot]');
      }

      if (!ok) {
        if (firstBad) firstBad.focus();
        return;
      }

      var val = function (id) { return document.getElementById(id).value.trim(); };
      var pretty = new Date(dv + 'T00:00:00').toLocaleDateString('en-GB',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

      var lines = [
        "Appointment request — Dr. Radhika's Allergy & Lung Clinic",
        '',
        'Patient: ' + name.value.trim() + ', age ' + age.value.trim(),
        'For: ' + val('bf-who'),
        'Mobile: ' + mobile.value.trim()
      ];
      if (val('bf-city')) lines.push('Area: ' + val('bf-city'));
      lines.push('', 'Preferred: ' + pretty + ', ' + slot.value, '', 'About: ' + val('bf-about'));
      if (val('bf-note')) lines.push('Note: ' + val('bf-note'));

      window.open('https://wa.me/' + CLINIC_NUMBER + '?text=' +
                  encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    });
  }

  /* ---------------- legacy #/hash URLs -> real paths ----------------
     The first version of this site was a single page with hash routes.
     Anything already shared on WhatsApp still points at #/immunotherapy
     and friends, so honour those links instead of dropping people home. */
  var LEGACY = {
    '#/': '/',
    '#/allergy-testing': '/allergy-testing/',
    '#/lung-tests': '/lung-tests/',
    '#/immunotherapy': '/immunotherapy/',
    '#/asthma-lung': '/asthma-lung/',
    '#/smoking-cessation': '/smoking-cessation/',
    '#/first-visit': '/first-visit/',
    '#/knowledge': '/knowledge/',
    '#/knowledge/dust-allergy': '/knowledge/dust-allergy/',
    '#/knowledge/igg-tests': '/knowledge/igg-tests/',
    '#/knowledge/homeopathy': '/knowledge/homeopathy/',
    '#/knowledge/post-tb': '/knowledge/post-tb/',
    '#/knowledge/child-nebuliser': '/knowledge/child-nebuliser/',
    '#/knowledge/parthenium': '/knowledge/parthenium/',
    '#/knowledge/monsoon-asthma': '/knowledge/monsoon-asthma/'
  };
  var target = LEGACY[location.hash];
  if (target && target !== location.pathname) location.replace(target);
})();
