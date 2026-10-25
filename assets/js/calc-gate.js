/* Calculator breakdown gate. Same lead post as the free guide in components.js. */
(function () {
  var leadUrl = /(^|\.)callumbcoaching\.co\.uk$/.test(location.hostname)
    ? "https://callumb-coaching.vercel.app/api/lead.php"
    : "/api/lead.php";
  var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  function cleanToken(value) {
    return String(value || "").replace(/[^\w.+~-]/g, "").slice(0, 80);
  }

  function campaignProps() {
    var props = {};
    var q = new URLSearchParams(location.search);
    utmKeys.forEach(function (key) {
      var value = cleanToken(q.get(key));
      if (value) props[key] = value;
    });
    return props;
  }

  function track(name, props) {
    try {
      window.plausible && window.plausible(name, props ? { props: props } : undefined);
    } catch (e) {}
  }

  document.querySelectorAll(".calc-gate").forEach(function (gate) {
    var form = gate.querySelector("form.leadf");
    var detail = gate.querySelector(".calc-detail");
    var locked = gate.querySelector(".calc-gate__locked");
    var lead = gate.querySelector(".calc-gate__lead");
    var openBtn = gate.querySelector("[data-calc-open]");
    var closeBtn = gate.querySelector("[data-calc-close]");
    if (!form || !detail || !locked || !lead || !openBtn || !closeBtn) return;

    var src = form.getAttribute("data-src") || "site";
    var store = "cb-calc-" + src;
    var eventName = gate.getAttribute("data-event") || "Calculator";
    var msg = form.querySelector(".leadf__msg");
    var btn = form.querySelector("button[type=submit]");
    var note = msg ? msg.innerHTML : "";
    var btnLabel = btn ? btn.textContent : "Show my breakdown";

    function saved() {
      try { return localStorage.getItem(store) === "1"; } catch (e) { return false; }
    }

    function resetMsg() {
      if (!msg) return;
      msg.classList.remove("bad");
      msg.innerHTML = note;
    }

    function showOpen() {
      lead.hidden = true;
      locked.hidden = true;
      form.hidden = true;
      detail.hidden = false;
      openBtn.setAttribute("aria-expanded", "false");
    }

    function showForm() {
      lead.hidden = false;
      locked.hidden = true;
      form.hidden = false;
      detail.hidden = true;
      openBtn.setAttribute("aria-expanded", "true");
      resetMsg();
      var name = form.querySelector("[name=name]");
      if (name) name.focus();
    }

    function showLocked() {
      lead.hidden = false;
      locked.hidden = false;
      form.hidden = true;
      detail.hidden = true;
      openBtn.setAttribute("aria-expanded", "false");
      resetMsg();
    }

    if (saved()) showOpen();
    else showLocked();

    openBtn.addEventListener("click", function () {
      if (saved()) { showOpen(); return; }
      showForm();
      track(eventName + " unlock", Object.assign({ page: location.pathname, src: src }, campaignProps()));
    });

    closeBtn.addEventListener("click", function () {
      showLocked();
      openBtn.focus();
    });

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!msg || !btn) return;
      var nameInput = form.querySelector("[name=name]");
      var emailInput = form.querySelector("[name=email]");
      var websiteInput = form.querySelector("[name=website]");
      var name = nameInput ? nameInput.value.trim() : "";
      var email = emailInput ? emailInput.value.trim() : "";
      var payload = {
        name: name,
        email: email,
        website: websiteInput ? websiteInput.value : "",
        src: src,
      };
      var campaign = campaignProps();
      utmKeys.forEach(function (key) {
        if (campaign[key]) payload[key] = campaign[key];
      });

      msg.classList.remove("bad");
      if (!name) {
        msg.textContent = "Add your first name.";
        msg.classList.add("bad");
        if (nameInput) nameInput.focus();
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.textContent = "That email doesn't look right. Check it and try again.";
        msg.classList.add("bad");
        if (emailInput) emailInput.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = "Sending...";
      try {
        var r = await fetch(leadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        var data = await r.json().catch(function () { return {}; });
        if (!r.ok || data.ok === false) throw new Error("bad");
        var link = detail.querySelector("a.calc-guide");
        if (link && typeof data.download === "string" && /^\/guides\/[a-z0-9-]+\.pdf$/.test(data.download)) {
          link.href = data.download;
        }
        try { localStorage.setItem(store, "1"); } catch (err) {}
        showOpen();
        track(eventName + " submit", Object.assign({ page: location.pathname, src: src }, campaign));
        var heading = detail.querySelector("h3");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = btnLabel;
        msg.classList.add("bad");
        msg.innerHTML = 'Something went wrong on my side. <a class="tlink" href="/guides/the-five-foundations.pdf" target="_blank" rel="noopener">Download the guide here</a>, and try again later to join the list.';
      }
    });
  });
})();
