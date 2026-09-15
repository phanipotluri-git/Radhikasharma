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
      var chosen = dv ? new Date(dv + 'T00:00:00') : null;
      var midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      var past = chosen && chosen < midnight;
      var sunday = chosen && chosen.getDay() === 0;
      var dateMsg = 'Please choose a date.';
      if (past) dateMsg = 'That date has already passed — please pick a day from today onwards.';
      else if (sunday) dateMsg = 'The clinic is closed on Sundays — please pick another day.';
      check(date, !!dv && !past && !sunday, dateMsg);

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

  /* ---------------- allergy self-check ----------------
     A sorting tool, not a diagnostic one. It scores the PATTERN of symptoms
     against the pattern allergy usually takes, and says only whether testing
     is likely to be worthwhile. It never names a condition and never tells
     anyone they do or do not have allergy. Runs entirely in the browser;
     nothing is recorded or transmitted. */
  var checkform = document.getElementById('checkform');
  if (checkform) {
    var QUESTIONS = [
      { q: 'Does your nose or do your eyes <b>itch</b>?',
        help: 'Itch is the single most useful clue. Infections rarely itch.',
        yes: 2 },
      { q: 'Do you sneeze in <b>runs</b> — five, ten, fifteen in a row?',
        help: 'Rather than an occasional one-off sneeze.',
        yes: 2 },
      { q: 'Is the discharge from your nose <b>clear and watery</b>?',
        help: 'As opposed to thick, yellow or green.',
        yes: 1, no: -1 },
      { q: 'Do symptoms reliably start in a <b>particular place, season or situation</b>?',
        help: 'The first hour after waking, while cleaning, outdoors, near an animal, in the monsoon.',
        yes: 2 },
      { q: 'Have symptoms been going on <b>more than six weeks</b>, or do they keep coming back?',
        help: 'Allergy recurs. A single cold resolves and does not return the same way.',
        yes: 1 },
      { q: 'Does anyone in your family have <b>allergy, asthma or eczema</b>?',
        help: 'Allergic conditions run strongly in families.',
        yes: 1 },
      { q: 'Have you had a <b>fever</b> with these symptoms?',
        help: 'Fever points towards infection, not allergy.',
        yes: -2 }
    ];

    var list = document.getElementById('q-list');
    QUESTIONS.forEach(function (item, i) {
      var f = document.createElement('fieldset');
      f.className = 'slots question';
      f.innerHTML =
        '<legend>' + (i + 1) + '. ' + item.q + '</legend>' +
        '<p class="hint" style="margin:0 0 12px">' + item.help + '</p>' +
        '<div class="slotgrid answers">' +
        '<label class="slot"><input type="radio" name="q' + i + '" value="yes"><span>Yes</span></label>' +
        '<label class="slot"><input type="radio" name="q' + i + '" value="no"><span>No</span></label>' +
        '<label class="slot"><input type="radio" name="q' + i + '" value="unsure"><span>Not sure</span></label>' +
        '</div>';
      list.appendChild(f);
    });

    var result = document.getElementById('result');

    checkform.addEventListener('submit', function (e) {
      e.preventDefault();

      var score = 0, answered = 0;
      QUESTIONS.forEach(function (item, i) {
        var picked = checkform.querySelector('input[name=q' + i + ']:checked');
        if (!picked) return;
        answered++;
        if (picked.value === 'yes') score += (item.yes || 0);
        else if (picked.value === 'no') score += (item.no || 0);
      });

      if (answered < QUESTIONS.length) {
        result.hidden = false;
        result.className = 'nutshell';
        result.innerHTML = '<span class="eyebrow">Almost there</span>' +
          '<p style="margin-top:10px">Please answer all ' + QUESTIONS.length +
          ' questions — "Not sure" counts as an answer.</p>';
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var head, body;
      if (score >= 6) {
        head = 'This has the shape of allergy';
        body = '<p>Itch, sneezing in runs, clear discharge and a symptom pattern tied to a place or a season together describe allergic rhinitis more often than anything else. That does not mean you have it — but it does mean <strong>testing is likely to tell you something useful</strong>, because there is a specific question for it to answer.</p>' +
               '<p>The next step is a consultation with skin prick testing, which is read and explained in the same visit.</p>';
      } else if (score >= 2) {
        head = 'Genuinely unclear from the pattern alone';
        body = '<p>Some of what you describe fits allergy and some of it does not. This is the commonest result, and it is exactly the situation a consultation is for — the history is more diagnostic than any single test, and a test ordered without one usually produces a list of positives that mean nothing.</p>' +
               '<p>Worth being seen. Whether you need testing at all is part of what gets decided.</p>';
      } else {
        head = 'This looks less like allergy';
        body = '<p>Fever, thick coloured discharge, no itch and no repeating pattern point away from allergy and towards infection, non-allergic rhinitis, or irritation from dust, smoke or pollution — none of which show up on an allergy test or respond to allergy treatment.</p>' +
               '<p>That is worth knowing, because it saves you paying for testing that would not have helped. If symptoms are persistent or troubling, they still deserve a proper look — they just may not be an allergy problem.</p>';
      }

      result.hidden = false;
      result.className = 'nutshell';
      result.innerHTML =
        '<span class="eyebrow">What this suggests</span>' +
        '<h3 style="margin:10px 0 14px;font-size:1.35rem">' + head + '</h3>' +
        body +
        '<p style="margin-top:16px;font-size:14px;color:var(--muted)"><strong>This is not a diagnosis and not medical advice.</strong> It is a description of how closely your answers match a typical pattern. Only a consultation can tell you what is actually going on.</p>' +
        '<div class="cta-row" style="margin-top:20px">' +
        '<a class="btn" href="/book/">Book an appointment</a>' +
        '<a class="btn ghost" href="/allergy-testing/">How testing works</a>' +
        '</div>';
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
