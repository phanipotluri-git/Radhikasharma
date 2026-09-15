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
     hands it to the patient's own WhatsApp to send, so no name, number or
     reason for visiting is ever transmitted to, or stored by, this site. */
  var bookform = document.getElementById('bookform');
  if (bookform) {
    var CLINIC_NUMBER = '919701864848';

    bookform.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('bf-name');
      var err = document.getElementById('err-name');
      if (!name.value.trim()) {
        err.hidden = false;
        name.setAttribute('aria-invalid', 'true');
        name.focus();
        return;
      }
      err.hidden = true;
      name.removeAttribute('aria-invalid');

      var val = function (id) { return document.getElementById(id).value.trim(); };
      var lines = [
        "Appointment request — Dr. Radhika's Allergy & Lung Clinic",
        '',
        'Name: ' + name.value.trim(),
        'For: ' + val('bf-who'),
        'About: ' + val('bf-about'),
        'Preferred: ' + val('bf-when')
      ];
      var note = val('bf-note');
      if (note) lines.push('Note: ' + note);

      window.open('https://wa.me/' + CLINIC_NUMBER + '?text=' +
                  encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
    });

    // clear the error as soon as they start typing
    document.getElementById('bf-name').addEventListener('input', function () {
      document.getElementById('err-name').hidden = true;
      this.removeAttribute('aria-invalid');
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
