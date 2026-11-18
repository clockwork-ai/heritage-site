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
    loadPixel();
    loadGA();
  }

  function banner() {
    if (document.querySelector("[data-cb-consent]")) return;
    var bar = document.createElement("div");
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie consent");
    bar.setAttribute("data-cb-consent", "");
    bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;justify-content:center;padding:16px;box-sizing:border-box;pointer-events:none;";

    var card = document.createElement("div");
    card.style.cssText = "pointer-events:auto;width:100%;max-width:680px;box-sizing:border-box;background:#0C1C14;color:#F3EAD6;border:1px solid rgba(201,169,110,.45);padding:15px 18px;font-family:Inter,system-ui,sans-serif;font-size:13.5px;line-height:1.5;box-shadow:0 22px 55px -22px rgba(0,0,0,.7);display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;";

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
      writeCookie("denied");
      bar.remove();
    });
    accept.addEventListener("click", function () {
      writeCookie("granted");
      bar.remove();
      enable();
    });

    wrap.appendChild(decline);
    wrap.appendChild(accept);
    card.appendChild(txt);
    card.appendChild(wrap);
    bar.appendChild(card);
    document.body.appendChild(bar);
  }

  function start() {
    var current = choice();
    if (current === "granted") enable();
    else if (current === "denied") return;
    else banner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
