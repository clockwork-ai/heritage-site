/* Decides whether the Christmas skin is on, then loads its stylesheet.
   Runs from the head while the page is still parsing. */
(function () {
  var cfg = window.CALLUM_SEASONAL || {};
  var q = "";
  try {
    q = (new URLSearchParams(location.search).get("season") || "").toLowerCase();
  } catch (e) {
    q = "";
  }

  function londonDate(now) {
    var parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: cfg.timeZone || "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(now);
    var y = "", m = "", d = "";
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === "year") y = parts[i].value;
      if (parts[i].type === "month") m = parts[i].value;
      if (parts[i].type === "day") d = parts[i].value;
    }
    return y + "-" + m + "-" + d;
  }

  function inWindow(now) {
    var today = londonDate(now);
    var start = String(cfg.windowStart || "2026-12-01").slice(0, 10);
    var end = String(cfg.windowEnd || "2027-01-06").slice(0, 10);
    return today >= start && today <= end;
  }

  function previewHost() {
    if (!cfg.showOnPreviewHosts) return false;
    var host = location.hostname;
    if (host === "callumb-coaching.vercel.app") return false;
    if (host === "callumbcoaching.co.uk" || host === "www.callumbcoaching.co.uk") return false;
    return /\.vercel\.app$/.test(host);
  }

  var theme = String(cfg.theme || "off").toLowerCase();
  var on = false;
  if (q === "off" || q === "0") on = false;
  else if (q === "christmas" || q === "on") on = true;
  else if (theme === "christmas" || theme === "auto") {
    on = inWindow(new Date());
    if (theme === "christmas" && (cfg.preview === true || previewHost())) on = true;
    if (theme === "auto") on = inWindow(new Date());
  }

  if (!on) return;
  document.documentElement.classList.add("season-christmas");
  var href = "/seasonal/christmas.css";
  var home = location.pathname === "/" || location.pathname === "/index.html";
  var preload = "";
  if (home) {
    preload += '<link rel="preload" as="image" type="image/avif" href="/seasonal/img/hero-desktop-1280.avif" imagesrcset="/seasonal/img/hero-desktop-960.avif 960w, /seasonal/img/hero-desktop-1280.avif 1280w" imagesizes="100vw" media="(min-width: 700px)">';
    preload += '<link rel="preload" as="image" type="image/avif" href="/seasonal/img/hero-mobile-720.avif" imagesrcset="/seasonal/img/hero-mobile-480.avif 480w, /seasonal/img/hero-mobile-720.avif 720w" imagesizes="100vw" media="(max-width: 699px)">';
  }
  if (document.readyState === "loading") {
    document.write(preload + '<link rel="stylesheet" href="' + href + '">');
  } else {
    if (home) document.head.insertAdjacentHTML("beforeend", preload);
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function heroPlate() {
    if (!home || document.querySelector(".season-hero")) return;
    var hero = document.getElementById("promise");
    if (!hero) return;
    var pic = document.createElement("picture");
    pic.className = "season-hero";
    pic.setAttribute("aria-hidden", "true");
    var sources = [
      ["(max-width: 699px)", "image/avif", "/seasonal/img/hero-mobile-480.avif 480w, /seasonal/img/hero-mobile-720.avif 720w"],
      ["(max-width: 699px)", "image/webp", "/seasonal/img/hero-mobile-480.webp 480w, /seasonal/img/hero-mobile-720.webp 720w"],
      ["(max-width: 699px)", "image/jpeg", "/seasonal/img/hero-mobile-480.jpg 480w, /seasonal/img/hero-mobile-720.jpg 720w"],
      ["(min-width: 700px)", "image/avif", "/seasonal/img/hero-desktop-960.avif 960w, /seasonal/img/hero-desktop-1280.avif 1280w"],
      ["(min-width: 700px)", "image/webp", "/seasonal/img/hero-desktop-960.webp 960w, /seasonal/img/hero-desktop-1280.webp 1280w"],
      ["(min-width: 700px)", "image/jpeg", "/seasonal/img/hero-desktop-960.jpg 960w, /seasonal/img/hero-desktop-1280.jpg 1280w"]
    ];
    for (var i = 0; i < sources.length; i++) {
      var source = document.createElement("source");
      source.media = sources[i][0];
      source.type = sources[i][1];
      source.srcset = sources[i][2];
      source.sizes = "100vw";
      pic.appendChild(source);
    }
    var img = document.createElement("img");
    img.src = "/seasonal/img/hero-desktop-1280.jpg";
    img.alt = "";
    img.width = 1280;
    img.height = 720;
    img.decoding = "async";
    img.setAttribute("fetchpriority", "high");
    pic.appendChild(img);
    hero.insertBefore(pic, hero.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", heroPlate);
  else heroPlate();

  function mount() {
    if (document.querySelector("script[data-season-mount]")) return;
    var s = document.createElement("script");
    s.src = "/seasonal/mount.js";
    s.defer = true;
    s.setAttribute("data-season-mount", "");
    document.body.appendChild(s);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
