/* One cookie banner for every page.
   Plausible is already in the page. Its script sets no cookie and writes
   nothing to the device, so it is allowed to run before a choice.
   Google Analytics and the Meta Pixel stay off until Accept.
   Removing those two tags is a separate decision. The IDs are unchanged. */
(function () {
  if (window.__cbConsent) return;
  window.__cbConsent = 1;

  var KEY = "cb-consent";
  var PIXEL_ID = "1778009826073109";
  var GA_ID = "G-092ML2YGQ2";
  var MAX_AGE = 60 * 60 * 24 * 180;

  function readCookie() {
    var raw = document.cookie || "";
    var bits = raw.split(";");
    for (var i = 0; i < bits.length; i++) {
      var bit = bits[i].replace(/^\s+/, "");
      if (bit.indexOf(KEY + "=") === 0) return decodeURIComponent(bit.slice(KEY.length + 1));
    }
    return "";
  }

  function writeCookie(value) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = KEY + "=" + encodeURIComponent(value) + "; Path=/; Max-Age=" + MAX_AGE + "; SameSite=Lax" + secure;
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function choice() {
    var current = readCookie();
    if (current === "granted" || current === "denied") return current;
    var legacy = "";
    try { legacy = localStorage.getItem(KEY) || ""; } catch (e) {}
    if (legacy === "granted" || legacy === "denied") {
      writeCookie(legacy);
      return legacy;
    }
    return "";
  }

  function loadPixel() {
    if (!PIXEL_ID || window.__cbPixel) return;
    window.__cbPixel = 1;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");
  }

  function loadGA() {
    if (!GA_ID || window.__cbGA) return;
    window.__cbGA = 1;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA_ID);
  }

  function enable() {
    window["ga-disable-" + GA_ID] = false;
    loadPixel();
    loadGA();
  }

  function clearTrackerCookies() {
    var names = [];
    (document.cookie || "").split(";").forEach(function (part) {
      var name = part.split("=")[0].replace(/^\s+|\s+$/g, "");
      if (name === "_ga" || name === "_fbp" || name.indexOf("_ga_") === 0) names.push(name);
    });
    var host = location.hostname;
    var domains = [host, "." + host];
    var bits = host.split(".");
    for (var i = 1; i < bits.length - 1; i++) domains.push("." + bits.slice(i).join("."));
    var expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    var secure = location.protocol === "https:" ? "; Secure" : "";
    names.forEach(function (name) {
      document.cookie = name + "=; Path=/; Expires=" + expires + "; Max-Age=0; SameSite=Lax" + secure;
      domains.forEach(function (domain) {
        document.cookie = name + "=; Path=/; Expires=" + expires + "; Max-Age=0; SameSite=Lax; Domain=" + domain + secure;
      });
    });
  }

  function allow() {
    writeCookie("granted");
    if (window.fbq) {
      try { window.fbq("consent", "grant"); } catch (e) {}
    }
    enable();
  }

  function refuse() {
    window["ga-disable-" + GA_ID] = true;
    writeCookie("denied");
    if (window.fbq) {
      try { window.fbq("consent", "revoke"); } catch (e) {}
    }
    clearTrackerCookies();
    setTimeout(clearTrackerCookies, 500);
  }

  function banner() {
    if (document.querySelector("[data-cb-consent]")) return;
    var bar = document.createElement("div");
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.setAttribute("data-cb-consent", "");
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;justify-content:center;padding:16px;box-sizing:border-box;pointer-events:none;";

    var card = document.createElement("div");
    card.style.cssText = "pointer-events:auto;width:100%;max-width:680px;box-sizing:border-box;background:#0B1A13;color:#F3EAD6;border:1px solid rgba(201,169,110,.45);padding:15px 18px;font-family:Inter,system-ui,sans-serif;font-size:13.5px;line-height:1.5;box-shadow:0 22px 55px -22px rgba(0,0,0,.7);display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;";

    var txt = document.createElement("p");
    txt.style.cssText = "flex:1;min-width:230px;margin:0;";
    txt.appendChild(document.createTextNode("I only set analytics and ad cookies if you accept. Decline leaves them off. "));
    var link = document.createElement("a");
    link.href = "/privacy";
    link.textContent = "Privacy policy";
    link.style.cssText = "color:#C9A96E;text-decoration:underline;";
    txt.appendChild(link);
    txt.appendChild(document.createTextNode("."));

    var wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:8px;flex:1 1 220px;";

    function button(label, fill) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "flex:1 1 0;min-width:0;min-height:40px;font-family:\"JetBrains Mono\",ui-monospace,monospace;font-weight:500;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:9px 17px;cursor:pointer;border:1px solid #C9A96E;background:" + (fill ? "#C9A96E" : "transparent") + ";color:" + (fill ? "#09150F" : "#F3EAD6") + ";";
      return b;
    }

    var decline = button("Decline", false);
    var accept = button("Accept", true);
    decline.addEventListener("click", function () {
      refuse();
      bar.remove();
    });
    accept.addEventListener("click", function () {
      allow();
      bar.remove();
    });

    wrap.appendChild(decline);
    wrap.appendChild(accept);
    card.appendChild(txt);
    card.appendChild(wrap);
    bar.appendChild(card);
    document.body.appendChild(bar);
  }

  function mountSettings() {
    if (document.querySelector("[data-cookie-settings]")) return;
    var footer = document.querySelector("footer");
    var host = footer || document.body;
    var link = document.createElement("a");
    link.href = "#cookie-settings";
    link.setAttribute("data-cookie-settings", "");
    link.textContent = "Cookie settings";
    link.style.cssText = "color:#C9A96E;font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.4;text-decoration:underline;text-underline-offset:2px;";
    link.addEventListener("click", function (event) {
      event.preventDefault();
      banner();
    });
    var base = host.querySelector(".foot__base");
    if (base) {
      var slot = document.createElement("span");
      slot.style.cssText = "flex:1 1 100%;";
      slot.appendChild(link);
      base.appendChild(slot);
    } else {
      var row = document.createElement("p");
      row.style.cssText = "margin:10px 0 0;";
      row.appendChild(link);
      host.appendChild(row);
    }
  }

  function start() {
    mountSettings();
    var current = choice();
    if (current === "granted") enable();
    else if (current !== "denied") banner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
