/* page components: turn scene, video feedback, research row. Each guards for its element. */
(() => {
  // video feedback: a 14s simulated playback lights each timestamped note in turn (uses the real clip once one is added)
  const vf = document.querySelector(".vf");
  if (vf) {
    const notesEl = [...vf.querySelectorAll(".vf__notes li")], clock = vf.querySelector(".vf__clock"), vid = vf.querySelector("video");
    const D = 40, reduce = false; // the feedback clip is the content itself, so it plays with Reduce Motion on too
    let t0 = null, seen = false;
    new IntersectionObserver(es => {
      seen = es[0].isIntersecting;
      if (vid && !reduce) seen ? vid.play().catch(() => {}) : vid.pause();
    }, { threshold: .3 }).observe(vf);
    if (vid && reduce) vid.controls = true;
    const loop = now => {
      if (seen && !reduce) {
        if (t0 === null) t0 = now;
        const t = vid && vid.duration ? vid.currentTime : ((now - t0) / 1000) % D, dur = vid && vid.duration ? vid.duration : D;
        vf.style.setProperty("--vp", (t / dur).toFixed(4));
        clock.textContent = "0:" + String(Math.floor(t)).padStart(2, "0");
        let cur = -1;
        notesEl.forEach((li, i) => { const on = t >= +li.dataset.t; li.classList.toggle("on", on); if (on) cur = i; });
        notesEl.forEach((li, i) => li.classList.toggle("now", i === cur));
        vf.className = "vf" + (cur >= 0 ? " n" + cur : "");
      }
      requestAnimationFrame(loop);
    };
    if (reduce) notesEl.forEach(li => li.classList.add("on")); else requestAnimationFrame(loop);
  }
  // research row: a tap pauses it so a card can be read, tapping outside resumes
  const evg = document.querySelector(".evgrid");
  if (evg) {
    evg.addEventListener("touchstart", () => evg.classList.add("touched"), { passive: true });
    document.addEventListener("touchstart", e => { if (!evg.contains(e.target)) evg.classList.remove("touched"); }, { passive: true });
  }
  // the flat turn: strike "motivation" and show the beats once it's on screen
  document.querySelectorAll(".turn--flat").forEach(turn => new IntersectionObserver((es, o) => {
    if (es[0].isIntersecting) { turn.dataset.step = 1; setTimeout(() => turn.dataset.step = 3, 500); o.disconnect(); }
  }, { threshold: .45 }).observe(turn));
  // the turn: three beats across each sticky turn scene
  document.querySelectorAll(".turn").forEach(turn => turn.addEventListener("scene", e => {
    const t = e.detail, s = t < .12 ? 0 : t < .4 ? 1 : t < .7 ? 2 : 3;
    if (turn.dataset.step != s) turn.dataset.step = s;
  }));
  // client app phone: tabs switch screens; auto-advance every 4.5s while in view, stops once the visitor picks a tab
  const cli = document.querySelector(".cli");
  if (cli) {
    const screen = cli.querySelector(".cli__screen"), tabs = [...cli.querySelectorAll(".cli__tabs button")], navs = [...cli.querySelectorAll(".cli__nav span")];
    let i = 0, auto = true, seen = false;
    const show = n => {
      i = n; screen.dataset.s = n;
      tabs.forEach((t, k) => t.setAttribute("aria-selected", k === n ? "true" : "false"));
      navs.forEach((t, k) => t.classList.toggle("on", k === n));
    };
    tabs.forEach((t, k) => t.addEventListener("click", () => { auto = false; show(k); }));
    new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: .4 }).observe(cli);
    // screens cross-fade (no slide with Reduce Motion), so auto-advance stays on for everyone
    setInterval(() => { if (auto && seen) show((i + 1) % tabs.length); }, 4500);
  }
})();

/* ---------- lead tracking (Plausible custom events) ---------- */
function campaignProps() {
  const props = {};
  const q = new URLSearchParams(location.search);
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const raw = q.get(key);
    if (!raw) continue;
    const value = raw.replace(/[^\w.+~-]/g, "").slice(0, 80);
    if (value) props[key] = value;
  }
  return props;
}
window.track = (name, props) => { try { window.plausible && window.plausible(name, props ? { props } : undefined); } catch (e) {} };
document.addEventListener("click", e => {
  const a = e.target.closest("a, button"); if (!a) return;
  const href = a.getAttribute("href") || "";
  const sec = a.closest("section[id]");
  const where = a.closest(".cw-chat") ? "chat" : sec ? sec.id : a.closest(".nav") ? "nav" : a.closest(".mnav") ? "menu" : a.closest("footer") ? "footer" : "page";
  const campaign = campaignProps();
  if (a.dataset.ev) track(a.dataset.ev, { page: location.pathname, ...campaign });
  else if (/^\/apply(\b|$|#|\?)/.test(href) && location.pathname !== "/apply") track("Apply click", { page: location.pathname, from: where, ...campaign });
  else if (href.startsWith("https://wa.me") && !a.id) track("WhatsApp click", { page: location.pathname, from: where, ...campaign });
}, { capture: true });

/* ---------- free guide signup -> /api/lead.php -> MailerLite ---------- */
// Same hostname rule as the chat widget. cPanel has no API of its own.
const leadUrl = /(^|\.)callumbcoaching\.co\.uk$/.test(location.hostname)
  ? "https://callumb-coaching.vercel.app/api/lead.php"
  : "/api/lead.php";
document.querySelectorAll(".leadf").forEach(f => {
  const box = f.parentElement, ok = box.querySelector(".leadok"), msg = f.querySelector(".leadf__msg"), btn = f.querySelector("button");
  const note = msg.innerHTML;
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f)); d.src = f.dataset.src || "site";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((d.email || "").trim())) { msg.textContent = "That email doesn't look right. Check it and try again."; msg.classList.add("bad"); f.querySelector("[name=email]").focus(); return; }
    btn.disabled = true; msg.classList.remove("bad"); msg.textContent = "Sending...";
    try {
      const r = await fetch(leadUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.ok === false) throw new Error(r.status);
      const link = ok.querySelector('a[data-ev="Guide download"]');
      if (link && typeof data.download === "string" && /^\/guides\/[a-z0-9-]+\.pdf$/.test(data.download)) link.href = data.download;
      track("Guide signup", { page: location.pathname, src: String(d.src || "site").slice(0, 40), ...campaignProps() });
      f.hidden = true; ok.hidden = false;
    } catch (err) {
      btn.disabled = false; msg.classList.add("bad");
      msg.innerHTML = 'Something went wrong on my side. <a class="tlink" href="/guides/the-five-foundations.pdf" target="_blank" rel="noopener">Download the guide here</a>, and try again later to join the list.';
    }
  });
});
