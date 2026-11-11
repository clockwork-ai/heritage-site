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
  if (document.readyState === "loading") {
    document.write('<link rel="stylesheet" href="' + href + '">');
  } else {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

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
