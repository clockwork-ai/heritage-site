/* CALLUM.B · site interactions: mobile nav + scroll reveal */
(function () {
  // mobile nav toggle
  var toggle = document.querySelector('.nav__toggle');
  var links = document.querySelector('.nav__links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && els.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // hero slideshow: fade between slides, with clickable dots
  document.querySelectorAll('.slideshow').forEach(function (sw) {
    var slides = sw.querySelectorAll('.slide');
    if (slides.length < 2) return;
    var dotsWrap = sw.querySelector('.dots');
    var idx = 0, timer = null;
    var interval = parseInt(sw.getAttribute('data-interval'), 10) || 4500;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    slides.forEach(function (s, i) {
      if (!dotsWrap) return;
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Show slide ' + (i + 1));
      if (i === 0) b.className = 'active';
      b.addEventListener('click', function () { go(i); restart(); });
      dotsWrap.appendChild(b);
    });

    function go(n) {
      slides[idx].classList.remove('active');
      if (dotsWrap) dotsWrap.children[idx].classList.remove('active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('active');
      if (dotsWrap) dotsWrap.children[idx].classList.add('active');
    }
    function start() { if (!reduce) timer = setInterval(function () { go(idx + 1); }, interval); }
    function restart() { if (timer) clearInterval(timer); start(); }
    start();
  });

  // footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Pre-select the application package from ?plan= (set by "Apply" buttons elsewhere)
  var pkg = document.getElementById('package');
  if (pkg) {
    var plan = new URLSearchParams(location.search).get('plan');
    if (plan) {
      Array.prototype.forEach.call(pkg.options, function (o) {
        if (o.value === plan || o.text === plan) pkg.value = o.value;
      });
    }
  }

  // Formspree lead-magnet gate: on success, hide the form and reveal downloads.
  // Markup: <form data-formspree="FORM_ID" data-success="#selector"> … </form>
  document.querySelectorAll('form[data-formspree]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('[type=submit]');
      var origText = btn ? btn.textContent : '';
      var err = form.querySelector('.form-error');
      if (err) err.hidden = true;
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch('https://formspree.io/f/' + form.getAttribute('data-formspree'), {
        method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form)
      }).then(function (r) {
        if (!r.ok) throw new Error('bad');
        var consentBox = form.querySelector('input[name="marketing-consent"]');
        var optedIn = !!(consentBox && consentBox.checked);
        var s = document.querySelector(form.getAttribute('data-success'));
        form.hidden = true;
        if (s) {
          var inbox = s.querySelector('[data-inbox-copy]');
          if (inbox) inbox.hidden = !optedIn;
          s.hidden = false;
          s.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        try { if (optedIn && window.mlCapture) window.mlCapture(form); } catch (_) {}
      }).catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = origText || 'Try again'; }
        if (err) err.hidden = false;
      });
    });
  });
})();

/* Cookie consent, Google Analytics and the Meta Pixel live in
   /assets/js/consent.js so the same banner runs on every page. */

/* ---------- MailerLite capture ----------
   Dual-submit: after a successful Formspree post, the same lead is added to
   MailerLite so the matching nurture automation fires. One embedded-form
   endpoint per lead source (created 31 Jul 2026). Fire-and-forget. Never
   blocks or breaks the visitor-facing flow. */
(function () {
  var ML_ACCOUNT = '2490221';
  var FORMS = {
    leads:     '194528783630337600', // Leads (main / applications / TDEE)
    guide:     '194528835534849468', // Guide Leads (GLP-1 5-Signs, guide gate, glp1-intake)
    ktm:       '194528837141268420', // Keep the Muscle leads (protein calc, muscle page)
    trt:       '194528838488687781', // TRT leads
    bodyfat:   '194528840040580437', // Body-fat leads (tool not yet live)
    offset:    '194528841373321023', // Offset leads
    downloads: '194528842662021026'  // Download leads (Framework modal, free downloads)
  };
  function keyFor(form) {
    var override = form.getAttribute('data-ml');
    if (override && FORMS[override]) return override;
    var typeInput = form.querySelector('input[name="form-type"]');
    var t = (typeInput && typeInput.value || '').toLowerCase();
    if (t.indexOf('framework') > -1 || t.indexOf('download') > -1) return 'downloads';
    var p = location.pathname;
    if (p.indexOf('glp1') > -1 || p.indexOf('/guide') === 0) return 'guide';
    if (p.indexOf('trt') > -1) return 'trt';
    if (p.indexOf('protein') > -1 || p.indexOf('/muscle') === 0) return 'ktm';
    if (p.indexOf('offset') > -1) return 'offset';
    if (p.indexOf('body-fat') > -1 || p.indexOf('bodyfat') > -1) return 'bodyfat';
    return 'leads';
  }
  window.mlCapture = function (form) {
    try {
      var consentBox = form.querySelector('input[name="marketing-consent"]');
      if (!consentBox || !consentBox.checked) return;
      var emailInput = form.querySelector('input[type=email], input[name=email]');
      var email = emailInput && emailInput.value;
      if (!email) return;
      var nameInput = form.querySelector('input[name=name]');
      var body = new URLSearchParams();
      body.append('fields[email]', email);
      if (nameInput && nameInput.value) body.append('fields[name]', nameInput.value);
      body.append('ml-submit', '1');
      body.append('anticsrf', 'true');
      fetch('https://assets.mailerlite.com/jsonp/' + ML_ACCOUNT + '/forms/' + FORMS[keyFor(form)] + '/subscribe', {
        method: 'POST', body: body
      });
    } catch (_) {}
  };
})();
