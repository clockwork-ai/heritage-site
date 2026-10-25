(() => {
  // The cPanel copy of the site has no API of its own, so it calls the Vercel deployment.
  const api = /(^|\.)callumbcoaching\.co\.uk$/.test(location.hostname)
    ? "https://callumb-coaching.vercel.app/api/chat"
    : "/api/chat";
  const track = (name) => {
    try { window.plausible && window.plausible(name, { props: { page: location.pathname } }); } catch {}
  };
  const defaults = {
    title: "Ask CALLUM.B",
    launcherLabel: "Open the chat",
    greeting: "Hello. What's been getting in the way of sticking with it?",
    placeholder: "Tell me what's going on",
    suggestions: [
      "I've tried everything and nothing sticks",
      "Which plan is right for me?",
      "How does the coaching work?",
    ],
    formTitle: "Leave details",
    formSubmit: "Send to Callum",
    applyHref: "/apply",
    applyLabel: "Apply",
    guideHref: "/#guide",
    guideLabel: "Free guide",
    calculatorHref: "/tdee-calculator",
    calculatorLabel: "TDEE calculator",
    nudge: {
      text: "Tried a few diets and none of them stuck? What's getting in the way?",
      delayMs: 22000,
      scroll: 0.45,
      replies: [
        { label: "Nothing sticks", message: "I've tried everything and nothing sticks." },
        { label: "Busy week", message: "I've got kids and a busy job, and I can't stay consistent." },
        { label: "Which plan?", message: "Which plan is right for me?" },
      ],
    },
  };

  const root = document.createElement("div");
  root.className = "cw-chat";
  root.innerHTML = `
    <div class="cw-nudge" hidden>
      <button class="cw-nudge__dismiss" type="button" aria-label="Dismiss this question">×</button>
      <button class="cw-nudge__open" type="button"></button>
    </div>
    <button class="cw-launch" type="button" aria-expanded="false" aria-controls="cw-panel">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 16.5V7.8A2.3 2.3 0 0 1 7.3 5.5h9.4A2.3 2.3 0 0 1 19 7.8v6.2a2.3 2.3 0 0 1-2.3 2.3H9.2L5 19.5v-3z"></path>
      </svg>
      <span class="sr">Open the chat</span>
    </button>
    <section class="cw-panel" id="cw-panel" role="dialog" aria-labelledby="cw-title" hidden>
      <header class="cw-head">
        <h2 id="cw-title">Ask CALLUM.B</h2>
        <button class="cw-close" type="button" aria-label="Close chat">×</button>
      </header>
      <div class="cw-log" aria-live="polite"></div>
      <div class="cw-chips"></div>
      <form class="cw-form" hidden>
        <input class="cw-field" name="name" autocomplete="name" maxlength="80" required placeholder="Name">
        <input class="cw-field" name="email" type="email" autocomplete="email" maxlength="120" required placeholder="Email">
        <input class="cw-field" name="goal" maxlength="400" required placeholder="Your goal, in a line">
        <button class="cw-send" type="submit">Send to Callum</button>
      </form>
      <form class="cw-composer">
        <label class="sr" for="cw-input">Message</label>
        <textarea class="cw-input" id="cw-input" rows="1" maxlength="600" placeholder="Tell me what's going on"></textarea>
        <button class="cw-send" type="submit">Send</button>
      </form>
      <div class="cw-foot">
        <button class="cw-form-toggle" type="button" hidden>Leave details</button>
        <a class="cw-apply" href="/apply">Apply</a>
        <a class="cw-guide" href="/#guide">Free guide</a>
        <a class="cw-calc" href="/tdee-calculator">TDEE calculator</a>
      </div>
    </section>
  `;
  document.body.appendChild(root);

  const nudge = root.querySelector(".cw-nudge");
  const nudgeDismiss = root.querySelector(".cw-nudge__dismiss");
  const nudgeOpen = root.querySelector(".cw-nudge__open");
  const launch = root.querySelector(".cw-launch");
  const panel = root.querySelector(".cw-panel");
  const close = root.querySelector(".cw-close");
  const log = root.querySelector(".cw-log");
  const chips = root.querySelector(".cw-chips");
  const formToggle = root.querySelector(".cw-form-toggle");
  const form = root.querySelector(".cw-form");
  const composer = root.querySelector(".cw-composer");
  const input = root.querySelector(".cw-input");
  const send = composer.querySelector("button");
  const title = root.querySelector("#cw-title");
  const apply = root.querySelector(".cw-apply");
  const guide = root.querySelector(".cw-guide");
  const calc = root.querySelector(".cw-calc");
  const sr = root.querySelector(".sr");

  const messages = [];
  let busy = false;
  let config = null;
  let nudgeArmed = false;
  let nudgeMode = false;
  let started = false;
  let engaged = false;
  const seenKey = "cb-nudge-seen";

  function seenNudge() {
    try { return sessionStorage.getItem(seenKey) === "1"; } catch { return true; }
  }

  function markNudge() {
    try { sessionStorage.setItem(seenKey, "1"); } catch { /* private mode */ }
  }

  function safeHref(href, fallback) {
    try {
      const url = new URL(href, location.origin);
      if (url.origin === location.origin || url.protocol === "https:") return url.href;
    } catch { /* keep fallback */ }
    return fallback;
  }

  function actionFor(value) {
    const lower = String(value || "").toLowerCase();
    if (lower.includes("#guide") || /(^|\/)guide$/.test(lower.split("?")[0])) return "guide";
    if (lower.includes("tdee") || lower === "calculator") return "calculator";
    if (/(^|\/)apply$/.test(lower.split(/[?#]/)[0]) || lower === "apply") return "apply";
    return "";
  }

  function tidy(text) {
    return text
      .replace(/\s+\b(?:at|via|on)\b(?=\s*(?:[.,;:!?]|is\b|$))/gi, "")
      .replace(/\(\s*\)/g, "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/[ \t]+([.,;:!?])/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function present(raw) {
    const actions = [];
    const addAction = (id) => {
      if (id && actions.indexOf(id) === -1) actions.push(id);
    };
    let text = String(raw || "");
    text = text.replace(/\[\[cta:([a-z,]*)\]\]/gi, (_match, list) => {
      list.split(",").forEach((part) => addAction(actionFor(part.trim())));
      return " ";
    });
    text = text.replace(/\[\[(apply|guide|tdee|calculator)\]\]/gi, (_match, name) => {
      addAction(actionFor(name));
      return " ";
    });
    const cutTrail = (match) => {
      const trail = /[.,;:!?]+$/.exec(match);
      const core = trail ? match.slice(0, -trail[0].length) : match;
      addAction(actionFor(core));
      return " " + (trail ? trail[0] : "");
    };
    text = text.replace(/\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi, cutTrail);
    text = text.replace(/(?<!@)\b(?:[a-z0-9-]+\.)*(?:callumbcoaching\.co\.uk|wa\.me|instagram\.com)(?:\/[^\s<>"')\]]*)?/gi, cutTrail);
    text = text.replace(/(^|[\s(])(\/(?:#[A-Za-z][\w-]*|[A-Za-z][\w/#-]*)+)/g, (_match, lead, path) => {
      addAction(actionFor(path));
      return lead;
    });
    text = tidy(text);
    if (/\bappl(?:y|ying|ication)\b/i.test(text)) addAction("apply");
    if (/\bfree guide\b/i.test(text)) addAction("guide");
    if (/\btdee\b/i.test(text)) addAction("calculator");
    return { text, actions };
  }

  function actionLink(id) {
    const hrefs = {
      apply: [config && config.applyHref, "/apply", config && config.applyLabel, "Apply"],
      guide: [config && config.guideHref, "/#guide", config && config.guideLabel, "Free guide"],
      calculator: [config && config.calculatorHref, "/tdee-calculator", config && config.calculatorLabel, "TDEE calculator"],
    };
    const spec = hrefs[id] || hrefs.apply;
    const link = document.createElement("a");
    link.className = "cw-action" + (id === "apply" ? " cw-action--apply" : "");
    link.href = safeHref(spec[0] || spec[1], spec[1]);
    link.textContent = spec[2] || spec[3];
    return link;
  }

  function showActions(bubble, actions) {
    const next = bubble.nextElementSibling;
    if (next && next.classList.contains("cw-actions")) next.remove();
    if (!actions.length) return;
    const row = document.createElement("div");
    row.className = "cw-actions";
    actions.forEach((id) => row.appendChild(actionLink(id)));
    bubble.after(row);
  }

  function paint(bubble, raw) {
    const shown = present(raw);
    bubble.textContent = shown.text || "Sorry, I missed that.";
    showActions(bubble, shown.actions);
    log.scrollTop = log.scrollHeight;
    return shown.text;
  }

  function add(role, text) {
    const p = document.createElement("p");
    p.className = role === "user" ? "cw-msg cw-msg--user" : role === "note" ? "cw-msg cw-msg--note" : "cw-msg cw-msg--bot";
    log.appendChild(p);
    if (role === "assistant") paint(p, text);
    else p.textContent = text;
    log.scrollTop = log.scrollHeight;
    return p;
  }

  function fitPanel() {
    const narrow = window.matchMedia("(max-width: 860px)").matches;
    if (!narrow || !root.classList.contains("is-open")) {
      panel.style.top = "";
      panel.style.left = "";
      panel.style.right = "";
      panel.style.bottom = "";
      panel.style.width = "";
      panel.style.height = "";
      return;
    }
    const vv = window.visualViewport;
    const frame = root._frame
      ? root._frame()
      : {
          top: vv ? vv.offsetTop : 0,
          left: vv ? vv.offsetLeft : 0,
          width: vv ? vv.width : window.innerWidth,
          height: vv ? vv.height : window.innerHeight,
        };
    const margin = 8;
    const keyboard = window.innerHeight - frame.height > 120;
    const dock = !keyboard && document.querySelector(".sticky") && window.matchMedia("(max-width: 760px)").matches ? 88 : 0;
    panel.style.top = Math.round(frame.top + margin) + "px";
    panel.style.left = Math.round(frame.left + margin) + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.width = Math.round(Math.max(240, frame.width - margin * 2)) + "px";
    panel.style.height = Math.round(Math.max(220, frame.height - margin * 2 - dock)) + "px";
    log.scrollTop = log.scrollHeight;
  }

  function pagePath() {
    const path = location.pathname || "/";
    return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
  }

  function three(list) {
    return (list || []).slice(0, 3);
  }

  function hideChips() {
    started = true;
    nudgeMode = false;
    chips.replaceChildren();
    chips.hidden = true;
  }

  function showDetailsLink() {
    formToggle.hidden = false;
  }

  function renderSuggestions(list) {
    chips.replaceChildren();
    if (started) {
      chips.hidden = true;
      return;
    }
    chips.hidden = false;
    three(list).forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cw-chip";
      button.textContent = label;
      button.addEventListener("click", () => ask(label));
      chips.appendChild(button);
    });
  }

  function showNudgeReplies() {
    if (started) return;
    nudgeMode = true;
    chips.replaceChildren();
    chips.hidden = false;
    const replies = three((config && config.nudge && config.nudge.replies) || defaults.nudge.replies);
    replies.forEach((reply) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cw-chip";
      button.textContent = reply.label;
      button.addEventListener("click", () => ask(reply.message));
      chips.appendChild(button);
    });
  }

  function applyConfig(next) {
    config = Object.assign({}, defaults, next || {});
    title.textContent = config.title || title.textContent;
    sr.textContent = config.launcherLabel || sr.textContent;
    launch.setAttribute("aria-label", config.launcherLabel || "Open the chat");
    input.placeholder = config.placeholder || input.placeholder;
    formToggle.textContent = config.formTitle || formToggle.textContent;
    form.querySelector("button").textContent = config.formSubmit || "Send";
    apply.href = safeHref(config.applyHref, "/apply");
    apply.textContent = config.applyLabel || "Apply";
    guide.href = safeHref(config.guideHref, "/#guide");
    guide.textContent = config.guideLabel || "Free guide";
    calc.href = safeHref(config.calculatorHref, "/tdee-calculator");
    calc.textContent = config.calculatorLabel || "TDEE calculator";
    if (config.nudge && config.nudge.text) nudgeOpen.textContent = config.nudge.text;
    if (!nudgeMode) renderSuggestions(config.suggestions);
    if (!nudgeArmed) {
      nudgeArmed = true;
      armNudge(config.nudge || defaults.nudge);
    }
    if (!messages.length && config.greeting) {
      messages.push({ role: "assistant", content: config.greeting });
      add("assistant", config.greeting);
    }
  }

  function hideNudge() {
    nudge.hidden = true;
  }

  function scrolledFar(amount) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 80) return false;
    return window.scrollY / max >= amount;
  }

  function armNudge(settings) {
    if (seenNudge()) return;
    const delay = Number(settings.delayMs) || 22000;
    const amount = Number(settings.scroll) || 0.45;
    let timer = 0;
    const stop = () => {
      clearTimeout(timer);
      removeEventListener("scroll", onScroll);
    };
    const tryShow = () => {
      if (seenNudge() || engaged || root.classList.contains("is-open") || !nudgeOpen.textContent) return;
      nudge.hidden = false;
      markNudge();
      stop();
    };
    const onScroll = () => { if (scrolledFar(amount)) tryShow(); };
    timer = setTimeout(tryShow, delay);
    addEventListener("scroll", onScroll, { passive: true });
    if (scrolledFar(amount)) tryShow();
  }

  function openFromNudge() {
    engaged = true;
    hideNudge();
    markNudge();
    const question = nudgeOpen.textContent;
    setOpen(true);
    if (question && !messages.some((message) => message.content === question)) {
      messages.push({ role: "assistant", content: question });
      add("assistant", question);
    }
    showNudgeReplies();
  }

  function openForm() {
    form.hidden = false;
    form.classList.add("is-open");
    formToggle.setAttribute("aria-expanded", "true");
    showDetailsLink();
    const first = form.querySelector("input");
    if (first) first.focus();
  }

  function setOpen(open) {
    if (open && !root.classList.contains("is-open")) track("Chat open");
    root.classList.toggle("is-open", open);
    panel.hidden = !open;
    launch.setAttribute("aria-expanded", open ? "true" : "false");
    fitPanel();
    if (open) input.focus();
    else launch.focus();
  }

  async function loadConfig() {
    try {
      const response = await fetch(api);
      if (!response.ok) throw new Error(String(response.status));
      applyConfig(await response.json());
    } catch {
      applyConfig(defaults);
    }
  }

  function wantsDetails(text) {
    return /your name|email|leave your details|leave details|line about/i.test(text);
  }

  async function ask(text) {
    const content = text.replace(/\s+/g, " ").trim();
    if (!content || busy) return;
    busy = true;
    send.disabled = true;
    hideChips();
    messages.push({ role: "user", content });
    if (messages.filter((message) => message.role === "user").length === 1) track("Chat message");
    add("user", content);
    input.value = "";
    const bubble = add("assistant", "...");
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, page: pagePath() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        bubble.className = "cw-msg cw-msg--note";
        bubble.textContent = data.error || "Sorry, try again in a moment.";
        messages.pop();
        return;
      }
      const reader = response.body && response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      if (reader) {
        while (true) {
          const step = await reader.read();
          if (step.done) break;
          acc += decoder.decode(step.value, { stream: true });
          const partial = acc.replace(/\[\[[a-z:,]*$/i, "");
          paint(bubble, partial);
        }
        acc += decoder.decode();
      } else {
        acc = await response.text();
      }
      const visible = paint(bubble, acc);
      messages.push({ role: "assistant", content: visible });
      if (wantsDetails(visible)) showDetailsLink();
      fitPanel();
    } catch {
      bubble.className = "cw-msg cw-msg--note";
      bubble.textContent = "Sorry, the chat didn't connect. You can still apply below.";
      messages.pop();
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  }

  launch.addEventListener("click", () => {
    engaged = true;
    hideNudge();
    markNudge();
    setOpen(true);
  });
  nudgeDismiss.addEventListener("click", (event) => {
    event.stopPropagation();
    hideNudge();
    markNudge();
  });
  nudgeOpen.addEventListener("click", openFromNudge);
  close.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) setOpen(false);
  });
  formToggle.addEventListener("click", () => {
    const open = form.hidden;
    form.hidden = !open;
    form.classList.toggle("is-open", open);
    formToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) form.querySelector("input").focus();
  });
  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask(input.value);
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lead: data, page: pagePath() }),
      });
      const payload = await response.json().catch(() => ({}));
      const line = payload.message || payload.error || "Sorry, that didn't send.";
      add(response.ok ? "assistant" : "note", response.ok ? line : line);
      if (response.ok) {
        track("Chat lead");
        form.reset();
        form.hidden = true;
        form.classList.remove("is-open");
      }
    } catch {
      add("note", "Sorry, that didn't send. You can still apply below.");
    } finally {
      button.disabled = false;
    }
  });

  if (window.visualViewport) {
    visualViewport.addEventListener("resize", fitPanel);
    visualViewport.addEventListener("scroll", fitPanel);
  }
  addEventListener("resize", fitPanel);
  input.addEventListener("focus", () => {
    setTimeout(fitPanel, 50);
    setTimeout(fitPanel, 350);
    setTimeout(fitPanel, 700);
  });

  const ready = loadConfig();
  launch.addEventListener("click", () => { ready.then(() => input.focus()); }, { once: true });
})();
