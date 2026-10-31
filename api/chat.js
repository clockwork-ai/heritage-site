// Built from server/chat.ts. Edit that, then npm run build:chat.

// server/chat.ts
import { isStepCount, streamText, tool } from "ai";
import { z } from "zod";

// lib/business.ts
var business = {
  name: "CALLUM.B",
  model: "openai/gpt-4.1-mini",
  voice: "Plain British English, the way the site talks to a man who is busy and a bit fed up with starting again. Short. Contractions are fine. No jargon, no American spelling, no emoji, no exclamation marks. Two or three short sentences, then stop. You are the site assistant, not Callum. Say Callum when you mean him.",
  rules: [
    "Answer only from the knowledge below. If it is not there, say you don't have that and point him to apply or the free guide.",
    "Never invent facts about Callum's personal life or history. If it is not written in the knowledge, you do not know it, so do not say it.",
    "Never make any statement about Callum's own use of steroids, anabolics, TRT, peptides or any other substance. Do not confirm it and do not deny it. Do not say that he does, does not, has, or has not. Do not say you don't have that information, and do not say you can't answer.",
    "If he asks about anabolics, steroids, a cycle, peptides, or whether Callum uses anything, lead with this and do not open with anything else: Callum has studied with J3 University (J3U), where coaching is applied to athletes who use anabolics, and he coaches men who've chosen that route. Then say he doesn't give doses, protocols or sourcing, and medical decisions stay with the person and their doctor. No judgement. Then point him to apply and end with [[apply]].",
    "The job is to get the right visitor to apply. Ask one question, or two at most, about his week. Reflect the problem back in plain words. Say how Callum's online coaching deals with that. Then point him to apply. Be steady, not pushy. Do not fake urgency, do not say places are limited, and do not use a countdown.",
    "Prices: say only the prices written in the knowledge, copied exactly. Never invent a discount, a sale, a code, or a price that is not listed. If you are not sure, send him to the coaching page.",
    "Never invent testimonials, client results, numbers, before and after claims or guarantees. Use a result only when it is written below, in those words, and say whose it is. Do not present it as his result. The example week and the example charts on the coaching page are illustrations, not clients. Do not quote them.",
    "No in-person training, sessions, gym meetups or local personal training, in Stockport or anywhere else. Callum is not qualified and insured for that yet. Everything is online. If he asks to train in person, say no, and offer online coaching.",
    "No medical advice. For TRT, GLP-1, medication, injuries, pain or any health condition, keep it general, tell him to speak to a GP or clinician, and still offer coaching where it fits. Do not tell him to start, stop or change a dose. Medication stays with his prescriber.",
    "No em dashes and no en dashes. For a range, write the word to. Use full stops, commas or colons. Do not say unlock, elevate, seamless, journey or game-changer.",
    "Never write a URL, a domain, or a path. Do not write /apply, /guide, /tdee-calculator, https, or a website address. Paths in the knowledge are for you only. In the reply, say apply, the free guide, or the TDEE calculator.",
    "When you point him to one of those, end the reply with a marker on its own line: [[apply]], [[guide]], or [[tdee]]. He does not see the marker. A button is added for you. Do not also write the path.",
    "Two or three short sentences, then stop. One thought each. No bullet list, no fourth sentence.",
    "Do not work out a calorie number, a macro split, a protein target, or a dose yourself. Send him to the TDEE calculator for calories.",
    "Do not claim a note was emailed. You may say Callum has it only when saveLead returns ok. The way to go ahead is still to apply.",
    "If he is not ready for 1:1, offer the free guide or the TDEE calculator. Do not hard sell."
  ],
  knowledge: `
Who. CALLUM.B is Callum Broadfoot, an online transformation coach in the United Kingdom. The site is for men 30 and over: busy, kids, a stressful job, a body that has drifted, diets that did not stick, energy and confidence, wanting to look and feel like himself again. He is a J3 University Level 1 certified coach, through a NASM-approved course provider. Callum has studied with J3 University (J3U), where coaching is applied to athletes who use anabolics. He coaches men who have chosen that route, around their training, nutrition, recovery and tracking. He gives no dosing, no protocols and no sourcing, and he does not prescribe or recommend substances. Medical decisions and bloodwork stay with the person and their doctor or clinician. Nothing in this knowledge says what Callum himself uses or does not use. Do not guess. It is him every week: every check-in, every video review, every WhatsApp answer. No assistants. Email callum@callumbcoaching.co.uk. The application can also go by WhatsApp on 07359 838866. Instagram is instagram.com/callum.transformation.coach. There is no published street address. Coaching is online only.

His own story, from the About page, kept short. An addictive personality. Drink took over: close to a litre of vodka most nights, twenty to thirty cigarettes a day. A photograph from November 2018. He stopped drinking, and stopped smoking a week later. Later years included a plant-based phase, then keto, then carnivore, then a balanced structured diet. January 2023: stage 2 hypertension, his monitor read 151/105, pulse 114. March 2024: the same monitor, same arm, 113/69, pulse 75, no medication. The About page shows systolic down 38, diastolic down 36, resting pulse down 39. The Results page says stage 2 hypertension to normal in fourteen months. These are his own readings, not medical advice. If a visitor's blood pressure looks high, he should see his GP, not a coach. He coaches the structure that replaced willpower, because willpower ran out and the structure did not.

What 1:1 coaching is. Online coaching, application only. The homepage line: results you can see in eight weeks, twelve months of one-to-one coaching to make them permanent, or start with twelve weeks. Not another six-week cut he gives back. Built around his real week: work, kids, shifts.

What he gets on every 1:1 plan. Calibrated macros: true maintenance, protein, carbs and fats set to the goal, plus steps and training frequency. A structured programme: three gym sessions a week and 10,000 steps a day as the baseline, with progressive overload. Weekly check-ins: food, training, steps, sleep and resting heart rate read together. Every Sunday Callum reads them and decides the one change for the week ahead. Video form feedback, back within 48 hours. WhatsApp questions answered within 24 hours. Bloods read with him. TRT-aware: coaching can sit around TRT, and decisions about medication stay between him and his prescriber. Planned diet breaks and refeeds, used with restraint. At the end he keeps the system and knows how to run it himself.

Four pillars, every week. Nutrition: full macros, weekdays and weekends, treats planned in. Training: every set logged, progressed week to week. Steps: the daily target. Check-ins: the weekly review. Together they make the structure score.

Structure Driven Results (SDR). One weekly score, 0 to 100%, averaged across the four pillars. It scores what he controls, not the scale. An example on the page (nutrition 6 of 7 days, training 3 of 3, steps 5 of 7, check-in on time) is an illustration of the score, not a client. Do not quote the 89% example as someone's result.

The 8-Week Progress Guarantee, on all 1:1 coaching. Hold 80% or more on the weekly SDR score for the first eight weeks. If nothing has improved, the next month is on Callum. A result is any one of: a drop on the scale, at the waist or in body measurements, or better sleep and eating habits, comparing week 8 with week 1. The score measures whether he did the work. If he hits 80% and nothing moves, the plan needs adjusting, and that is Callum's job. Monthly plans: if nothing has improved, month three is free of charge. Paid in full: a free month is added to the end, and a second free month if the score still holds and nothing has improved. Two free months is the maximum. It is free coaching time, not a refund. No data, no guarantee, because the check-in is what proves the work was done. Studies linked on the coaching page describe groups of people, not a promise for one person. Do not quote those study percentages unless he asks, and if he asks, say they are about groups, not a promise for him.

Who it is for. He wants a measurable system, not another crash diet. He will do weekly check-ins and honest data. He values structure and patience over quick fixes. He has restarted more than once. He has been reacting to the scale and is ready to stop. He is ready to be coached. It is not for him if he wants a six-week shred and then chaos, if he will not track what he eats, or if he wants motivation instead of a system. Beginners are fine: the system scales from a 3-day full-body foundation. He does not have to stop drinking. He does have to track it honestly, then Callum plans around it. A bad week is data. They read it, adjust one thing, and carry on. Time: three gym sessions a week, 10,000 steps a day, and logging food, built around his week.

How a week is coached. One variable at a time. Change one thing, watch a week, then decide. The daily scale number lies. The weekly average does not. First they find what he actually eats to stay the same, then they know how much to change. Treats and weekends are planned, not treated as failure. The homepage picture of the week: Sunday he means it, Monday he smashes it, Wednesday work runs late, Friday the wine and a takeaway, Saturday the weekend undoes it. None of that is a willpower problem. It is missing structure.

Plans and prices, from the coaching page and the coaching terms. Quote these when he asks what coaching costs. Do not add a from price, and do not use any other weekly figure.
- Structured Development, 12 months, marked best value. \xA367 a week. \xA33,500 paid in full, or 12 payments of \xA3324 (\xA33,888 total). Pay in full and save \xA3388. Includes everything in Transformation, a full year, the most review time, fat loss then muscle in planned phases, video feedback within 48 hours, WhatsApp within 24 hours.
- Transformation, 6 months. \xA385 a week. \xA32,200 paid in full, or 6 payments of \xA3405 (\xA32,430 total). Pay in full and save \xA3230. Includes everything in Foundation, planned phases, food and training checked every week, planned diet breaks, video feedback within 48 hours, WhatsApp within 24 hours.
- Foundation Phase, 12 weeks. \xA3100 a week. \xA31,200 paid in full, or 3 payments of \xA3450 (\xA31,350 total). Pay in full and save \xA3150. The system set up around his week, macros and training built for him, a full review every week, video feedback within 48 hours, WhatsApp within 24 hours.
The same system underpins all three. The difference is duration and how much oversight he gets. Foundation installs it. The 6 and 12 month plans carry him through the phases. Not sure which: Apply, and they decide together. Payment plans are monthly across the programme. The first payment secures the place. There is a 14-day cooling-off from purchase, less the value of coaching already delivered. He can stop. Coaching already delivered is not refunded. A secure payment link is sent only after he is accepted, with the terms in writing first. Full terms are on /terms-coaching.

Not ready for 1:1. Physique OS is the self-led app at \xA329 a month, and The Ninety is 90 guided days for \xA3297. Say that, then come back to Apply if 1:1 is actually what he wants.

The Ninety, at /the-ninety. \xA3297 for 90 days, single payment. Starts any time. No cohort, no subscription, no rebill. It is not 1:1. Up front Callum builds his macros from his stats and his goal. Then each month for three months: one call, just the two of them, and a personal written review of his logged data (weight trend, training, food) with an adjustment that is his, not a template. Full app access for the 90 days: recipes, training splits, lift and cardio tracking. He does not get WhatsApp, weekly check-ins, blood work, or a weekly call. The page says no application is needed: he requests a place and Callum sends a payment link. The page also says everything paid here credits toward premium coaching. For 1:1 itself, still send him to /apply.

Physique OS, at /start. The self-run system. The app his 1:1 clients use, the Framework (how to find maintenance, set macros, run the weekly review), recipe library, exercise library with video, lift and cardio tracking, progress as trends, and 14 step-by-step guides he keeps. Training ladder: Foundation is 3 days, full body. Upper / lower is 4 days. Push / pull / legs plus an extra upper and lower is 5 days. He starts on Foundation and moves up. It is not 1:1. He drives it. No coaching fees on top. Price: 7 days free, then \xA329/month, or \xA3249/year which works out at \xA320.75/month, billed yearly. The annual option says save \xA399. Card saved at sign-up, not charged during the trial. \xA3249/year or \xA329/month is taken when the trial ends, a week after he joins, unless he cancels first. Cancel before the trial ends (a day early is safest), by message or in the customer portal, and he is never charged. After that it renews monthly or yearly. Cancel any time to stop the next payment. No long-term contract. The page says every pound spent credits toward the level above. Login and the Framework arrive by email after payment, usually within a few minutes.

Keep the Muscle, at /muscle. The self-run system for keeping muscle while the weight drops, including when weight loss has medical support, and for holding the result when the loss stops. It is also for someone losing weight with no medication. Price matches Physique OS: 7 days free, then from \xA329/month, or \xA3249/year (\xA320.75/month billed yearly, save \xA399). What is inside: a protein system for low appetite, short joint-friendly resistance sessions, tracking protein, sessions, waist and strength rather than only the scale, an off-ramp for when the loss eases off, the Framework, the app, and the guide library. The page says: lose weight without a system and research shows roughly a quarter to nearly 40% of what comes off can be muscle. Enough protein plus the right training cuts that to around 15 to 20%. Most people regain around two-thirds within a year, and it can come back as fat. These are the page's research lines, not a promise for him. Nutrition and training guidance, not medical advice. Dosing, starting, stopping or switching medication stays with his prescriber. If he has a medical condition, speak to a GP or prescriber before changing diet or training. The free protein calculator is at /protein-calculator.

The Five Foundations, the free guide for busy men over 30. On the home page, the coaching page and the results page, for someone not ready to apply. Five things that fit round work and kids. Get them done most weeks and everything else gets easier. The five are: protein at every meal (a proper portion, roughly 30 to 40g, not a daily total chased at night), daily steps (build towards 10,000, and on a bad week beat last week's average by 1,000 to 2,000), three short full-body strength sessions a week (about 45 minutes, and two on a bad week), sleep (seven to nine hours, and the minimum is a set wake time plus a bedtime that gives 7 hours), and one weekly check-in (the 7-day average weight, and waist at the belly button). Each one has a target and a minimum. Hit the target when he can. Hit the minimum when the week goes sideways. Change one thing at a time, never five. Aim for most days, not every day. It is general guidance on training, nutrition and lifestyle, not medical advice. If he has a health condition or takes medication, he should speak to his GP before changing diet or training. He leaves a first name and email on the page. Free, instant download. He will hear from Callum by email now and then, and he can unsubscribe. Link: /#guide. The file is /guides/the-five-foundations.pdf. An old link at /guides/five-numbers.pdf opens this same guide. This is the free guide to offer. There is a separate free read at /guide about five signs a GLP-1 can work against muscle, energy and results. It is not medical advice. Do not use its short unnamed lines as client results. For what to do about muscle while losing weight, use Keep the Muscle and the protein calculator, and tell him to speak to his clinician about the medication.

Calculators. Do not invent a number.
- TDEE calculator, /tdee-calculator. Free. Maintenance calories and a starting macro split for lose fat, maintain, or build muscle. Metric or imperial. The page says it uses the Mifflin-St Jeor equation. Estimates only, not medical or dietary advice. If he has a health condition, is pregnant, or is unsure, he should check with a GP before changing his diet. Offer this when he wants numbers and is not ready to apply.
- Protein calculator, /protein-calculator. Free. He enters weight and how many meals he can hit. The page returns a daily protein target, protein per meal, and notes 2.5 to 3 g leucine per meal and 3 resistance sessions a week. The same research line as Keep the Muscle: roughly a quarter to nearly 40% of weight lost can be muscle, and protein plus resistance training can bring that to around 15 to 20%. Not medical advice. Protein needs vary. If he has a medical condition, he should check with a GP or prescriber.
- Offset calculator, /offset-calculator. Free. He adds up what current habits cost (meal deals, coffees, takeaways, drinks) and sees how that compares with coaching. Send him to the page. Do not quote the sample pound figures on that page, and do not work out a total. Those samples are an illustration. The coaching prices to quote are the ones on the coaching page.

Apply, at /apply. This is the main next step for 1:1. Free, about two minutes, private, and it commits him to nothing. Callum reads every application himself and replies within 24 hours. If he is not the right fit, he says so and points somewhere useful. The form asks: first name, age, WhatsApp number or email, what he wants (lose fat, build muscle, get his health back, energy and confidence, stop restarting), what has gone wrong before, what his week looks like, which plan he is leaning towards (12 months, 6 months, 12 weeks, or not sure), and how he wants the reply (WhatsApp, a quick call, or email). It comes straight to Callum. He can also send it on WhatsApp. An NDA is signed before they speak properly, not after he has paid. No before and after photos unless he asks for them. The one exception on the coaching page: if Callum ever believed his life was at risk, he would act on it and tell him.

What happens after he applies. 1. He applies. 2. Callum reads it himself and says straight if he can help. 3. A short call if it helps, to check the fit. No pitch. 4. He chooses a plan. Terms confirmed in writing, then a secure payment link. 5. Week one calibrates the baseline before anything changes. Applying does not commit him. If it is not the right fit, Callum says so rather than take the money.

Results, from the Results page only. Say they are individual, and his own result depends on where he starts and how consistently he follows the structure. Callum coaches online, so clients take their own measurements.
- Mark Penny, 44, dad, tiler, ex-strongman, Foundation phase, 9 weeks, photos 16 May to 19 July. He could barely eat 2,500 kcal on a maintenance of roughly 3,900. The first job was getting him to eat more, not cutting. Five sessions a week, every set logged, 10,000 steps, seven days out of seven. Waist 119 cm to 91 cm (down 28 cm), measured by Mark at the navel, same spot each week. Chest up 6 cm. Arms up 2.8 cm. Resting heart rate down 6 bpm. His words: "I used to judge progress purely by the scales. Callum taught me to track all the data. My strength is improving and I feel much better overall. Sustainable habits, not quick fixes."
- Colin, five months of 1:1, photos December 2025 and May 2026. His words: "He tweaked my training, then completely flipped it on its head, and I've seen results. He's shown me the value of nutrition too: what to eat, how to eat clean and still feel full, and the cravings have stopped." The results page also shows Callum and Colin at Colin's wedding, as a picture of one-to-one over months. No measurements are published for Colin.
- Jonny Gregg, current 1:1 client, 10 years of trying, 8 weeks in. His words: "I'd been trying for over 10 years to no avail. Callum got me on the right track straight away. His attention to detail is the biggest draw. I'm feeling and looking the best I ever have."
- Dale Ankrett, 10 weeks. His own readings, from his own post: blood pressure 180/126 in hospital, and 114/74 at 10 weeks. Weight 102kg to 93.3kg. He had been on blood pressure tablets for 12 years. His words: "I'd been on blood pressure tablets for 12 years, maxed on the dosage. After just two weeks with Callum I genuinely feel like a new man. No more takeaways, no more excuses, and finally living a good life again." The page says coaching supports lifestyle change. It is not medical treatment, and medication decisions stay with his GP.
- Callum Smith, 8 weeks of 1:1, from September 2025. His words: "The experience has been spot on. Can't fault him, always there to answer any questions and keep me on track. He created a tailored programme, helped me understand my calorie and macro targets, and gave straightforward nutrition advice that was easy to follow. His knowledge goes far beyond just handing out a training plan. He looks at the whole picture: metabolic health, hormones. Made up with the progress I've made within 8 weeks." No measurements are published for him.

Privacy. If he would rather nobody knew, nobody will. The NDA is standard. Data is used to coach him and is not sold. The terms say it is held in Everfit, the coaching app, and in the WhatsApp chat.
`.trim(),
  allowedPrices: [
    "\xA33,888",
    "\xA33,500",
    "\xA32,430",
    "\xA32,200",
    "\xA31,350",
    "\xA31,200",
    "\xA320.75/month",
    "\xA320.75",
    "\xA3249/year",
    "\xA3249",
    "\xA3100",
    "\xA399",
    "\xA385",
    "\xA367",
    "\xA3450",
    "\xA3405",
    "\xA3388",
    "\xA3324",
    "\xA3297",
    "\xA3230",
    "\xA3150",
    "\xA329/month",
    "\xA329"
  ],
  priceStandIn: "the price on the coaching page",
  links: {
    apply: "/apply",
    applyLabel: "Apply",
    guide: "/#guide",
    guideLabel: "Free guide",
    calculator: "/tdee-calculator",
    calculatorLabel: "TDEE calculator",
    email: "callum@callumbcoaching.co.uk",
    phone: "07359 838866",
    phoneHref: "tel:+447359838866",
    whatsapp: "https://wa.me/447359838866"
  },
  lead: {
    notifyName: "Callum Broadfoot",
    storagePrefix: "leads",
    webhookEnv: "LEAD_NOTIFY_URL"
  },
  limits: {
    windowMs: 10 * 60 * 1e3,
    maxRequests: 24,
    maxUserChars: 600,
    maxMessages: 12,
    maxAssistantChars: 1200
  },
  origins: ["https://callumbcoaching.co.uk", "https://www.callumbcoaching.co.uk"],
  pages: [
    "/",
    "/about",
    "/apply",
    "/book",
    "/coaching",
    "/free/framework",
    "/glp1-blueprint",
    "/glp1-nutrition",
    "/guide",
    "/is-online-personal-training-worth-it",
    "/links",
    "/magnum-opus",
    "/muscle",
    "/nutrition",
    "/offset-calculator",
    "/online-personal-trainer-cost",
    "/online-personal-trainer-stockport",
    "/online-vs-in-person-personal-trainer",
    "/os-setup",
    "/privacy",
    "/protein-calculator",
    "/results",
    "/start",
    "/supplements",
    "/tdee-calculator",
    "/terms",
    "/terms-coaching",
    "/the-inches-you-keep",
    "/the-ninety",
    "/trt-starter"
  ],
  nudge: {
    text: "Tried a few diets and none of them stuck? What's getting in the way?",
    delayMs: 22e3,
    scroll: 0.45,
    replies: [
      { label: "Nothing sticks", message: "I've tried everything and nothing sticks." },
      { label: "Busy week", message: "I've got kids and a busy job, and I can't stay consistent." },
      { label: "Which plan?", message: "Which plan is right for me?" }
    ]
  },
  widget: {
    title: "Ask CALLUM.B",
    launcherLabel: "Open the chat",
    greeting: "Hello. What's been getting in the way of sticking with it?",
    placeholder: "Tell me what's going on",
    suggestions: [
      "I've tried everything and nothing sticks",
      "Which plan is right for me?",
      "How does the coaching work?"
    ],
    formTitle: "Leave details",
    formSubmit: "Send to Callum"
  }
};

// lib/guard.ts
var buckets = /* @__PURE__ */ new Map();
function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : request.headers.get("x-real-ip");
  return ip || "unknown";
}
function takeRateLimit(key, now, windowMs, maxRequests) {
  const current = buckets.get(key);
  if (!current || now >= current.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (current.count >= maxRequests) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((current.reset - now) / 1e3)) };
  }
  current.count += 1;
  return { ok: true };
}
function sameOrigin(request, origins = []) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origins.includes(origin)) return true;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function corsHeaders(request, origins) {
  const origin = request.headers.get("origin");
  if (!origin || !origins.includes(origin)) return { vary: "origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin"
  };
}
function knownPage(page, pages) {
  if (typeof page !== "string") return void 0;
  const path = page.split("?")[0]?.split("#")[0] ?? "";
  return pages.includes(path) ? path : void 0;
}
function normaliseMessages(input, limits) {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  if (input.length > limits.maxMessages) {
    return {
      ok: false,
      status: 400,
      error: "That's as far as this chat goes. Apply and Callum will take it from there."
    };
  }
  const messages = [];
  for (const item of input) {
    if (!item || typeof item !== "object") {
      return { ok: false, status: 400, error: "I couldn't read that. Try again." };
    }
    const role = item.role;
    const content = item.content;
    if (role !== "user" && role !== "assistant" || typeof content !== "string") {
      return { ok: false, status: 400, error: "I couldn't read that. Try again." };
    }
    const text = content.replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (role === "user" && text.length > limits.maxUserChars) {
      return {
        ok: false,
        status: 400,
        error: "That message is a bit long. Try a shorter question."
      };
    }
    messages.push({
      role,
      content: role === "assistant" ? text.slice(0, limits.maxAssistantChars) : text
    });
  }
  if (!messages.some((message) => message.role === "user")) {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, status: 400, error: "Send a message and I'll answer." };
  }
  return { ok: true, messages };
}
var WORD_PRICE = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)(?:[\s-](?:and|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred))*\s+pounds?\b/gi;
var MONEY = /£\s?\d[\d,]*(?:\.\d+)?(?:\s*billion|\s*(?:\/|a |per )(?:month|mo))?|[$€]\s?\d[\d,]*(?:\.\d+)?(?:\s*(?:\/|a |per )(?:month|mo))?|\bgbp\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s*(?:pounds?|quid)\b|\b\d[\d,]*(?:\.\d+)?\s*(?:\/|a |per )(?:month|mo)\b/gi;
function scrubPrices(text, allowed, standIn) {
  const slots = [];
  let safe = text;
  const phrases = [...allowed].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exact = new RegExp(`${escaped}(?!(?:\\.\\d|,\\d|\\d))`, "g");
    safe = safe.replace(exact, (match) => {
      const index = slots.push(match) - 1;
      return `\0${index}\0`;
    });
  }
  safe = safe.replace(MONEY, standIn).replace(WORD_PRICE, standIn);
  return safe.replace(/\u0000(\d+)\u0000/g, (_match, index) => slots[Number(index)] ?? "");
}
function createPriceStream(allowed, standIn) {
  let held = "";
  const push = (chunk) => {
    held += chunk;
    const partial = held.match(/(?:£|\$|€|gbp\s?)\d[\d,]*(?:\.\d*)?$/i) ?? held.match(/(?:£|\$|€)$/) ?? held.match(/\d[\d,]{0,8}$/);
    const cut = partial?.index ?? held.length;
    const ready = held.slice(0, cut);
    held = held.slice(cut);
    return scrubPrices(ready, allowed, standIn);
  };
  const flush = () => {
    const rest = scrubPrices(held, allowed, standIn);
    held = "";
    return rest;
  };
  return { push, flush };
}
var CURRENCY_RANGE = /£\s?\d[\d,]*(?:\.\d+)?\s*[\u2013\u2014]\s*£\s?\d[\d,]*(?:\.\d+)?/g;
var NUMBER_RANGE = /(\d[\d,.]*%?)\s*[\u2013\u2014]\s*(\d[\d,.]*%?)/g;
function scrubDashes(text) {
  let out = text.replace(CURRENCY_RANGE, (match) => match.replace(/\s*[\u2013\u2014]\s*/, " to "));
  out = out.replace(NUMBER_RANGE, "$1 to $2");
  out = out.replace(/\s*\u2013\s*/g, " to ");
  out = out.replace(/\s*\u2014\s*/g, ", ");
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+,/g, ",");
}
function createDashStream() {
  let held = "";
  const push = (chunk) => {
    if (!chunk) return "";
    held += chunk;
    const partial = /\d[\d,.]*%?\s*[\u2013\u2014]$|[\u2013\u2014]$/.exec(held);
    const cut = partial?.index ?? held.length;
    const ready = held.slice(0, cut);
    held = held.slice(cut);
    return scrubDashes(ready);
  };
  const flush = () => {
    const rest = scrubDashes(held);
    held = "";
    return rest;
  };
  return { push, flush };
}
var MARKER = /\[\[(apply|guide|tdee|calculator)\]\]/gi;
var CTA_MARKER = /\[\[cta:([a-z,]*)\]\]/gi;
var URL_TOKEN = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
var BARE_HOST = /(?<!@)\b(?:[a-z0-9-]+\.)*(?:callumbcoaching\.co\.uk|wa\.me|instagram\.com)(?:\/[^\s<>"')\]]*)?/gi;
var SITE_PATH = /(^|[\s(])(\/(?:#[A-Za-z][\w-]*|[A-Za-z][\w/#-]*)+)/g;
var OWN_USE = /\b(?:Callum|he)\b(?:(?![.?!]).){0,70}?\b(?:does not|doesn't|isn't|is not|never|has never|has not|hasn't)\b(?:(?![.?!]).){0,40}?\b(?:use|using|used|take|taking|taken|run|running|on)\b(?:(?![.?!]).){0,40}?\b(?:steroids?|anabolics?|trt|peptides?|substances?)\b[^.?!]*[.?!]?/gi;
function actionForTarget(value) {
  const lower = value.toLowerCase();
  if (lower.includes("#guide") || /(^|\/)guide$/.test(lower.split("?")[0] ?? lower)) return "guide";
  if (lower.includes("tdee-calculator") || lower === "tdee" || lower === "calculator") return "calculator";
  if (/(^|\/)apply$/.test(lower.split(/[?#]/)[0] ?? lower) || lower === "apply") return "apply";
  return null;
}
function tidyReply(text) {
  return text.replace(/\s+\b(?:at|via|on)\b(?=\s*(?:[.,;:!?]|is\b|$))/gi, "").replace(/\(\s*\)/g, "").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([.,;:!?])/g, "$1").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function scrubLinks(text) {
  const actions = [];
  const add = (action) => {
    if (action && !actions.includes(action)) actions.push(action);
  };
  let out = text.replace(CTA_MARKER, (_match, list) => {
    for (const part of list.split(",")) add(actionForTarget(part.trim()));
    return " ";
  });
  out = out.replace(MARKER, (_match, name) => {
    add(actionForTarget(name));
    return " ";
  });
  const cutTrail = (match) => {
    const trail = /[.,;:!?]+$/.exec(match)?.[0] ?? "";
    const core = trail ? match.slice(0, -trail.length) : match;
    add(actionForTarget(core));
    return ` ${trail}`;
  };
  out = out.replace(URL_TOKEN, cutTrail);
  out = out.replace(BARE_HOST, cutTrail);
  out = out.replace(SITE_PATH, (_match, lead, path) => {
    add(actionForTarget(path));
    return lead;
  });
  return { text: tidyReply(out), actions };
}
function mentionActions(text) {
  const actions = [];
  if (/\bappl(?:y|ying|ication)\b/i.test(text)) actions.push("apply");
  if (/\bfree guide\b/i.test(text)) actions.push("guide");
  if (/\btdee\b/i.test(text)) actions.push("calculator");
  return actions;
}
var OWN_USE_FALLBACK = "He coaches men who have chosen that route, around training, nutrition, recovery and tracking. He doesn't give doses, protocols or sourcing, and medical decisions stay with you and your doctor. If you want that, apply.";
var SUBSTANCE_ASK = /\b(?:steroids?|anabolics?|peptides?|cycles?)\b|\bwhat dose should i run\b|\b(?:does|did)\s+callum\s+(?:use|take)\b/i;
var DODGE = /\b(?:i don't have that(?: information)?|i do not have that(?: information)?|i (?:can't|cannot) (?:say|answer)(?: that)?|that(?:'s| is) not something i (?:know|can say))\b[.!]?\s*/gi;
var J3_REPLY = "Callum has studied with J3 University (J3U), where coaching is applied to athletes who use anabolics, and he coaches men who've chosen that route. He doesn't give doses, protocols or sourcing, and medical decisions stay with you and your doctor. If you want that, apply.";
function ensureAnabolicReply(userText, reply2) {
  if (!SUBSTANCE_ASK.test(userText)) return reply2;
  const stripped = reply2.replace(DODGE, "").replace(/\s{2,}/g, " ").trim();
  if (/J3 University/i.test(stripped) && /\bJ3U\b/.test(stripped) && stripped.length > 80) {
    return /\bappl/i.test(stripped) ? stripped : `${stripped} If you want that, apply.`;
  }
  return J3_REPLY;
}
function scrubOwnUse(text) {
  if (!OWN_USE.test(text)) return text;
  OWN_USE.lastIndex = 0;
  const removed = tidyReply(text.replace(OWN_USE, " "));
  OWN_USE.lastIndex = 0;
  if (removed.length < 40) return OWN_USE_FALLBACK;
  return removed;
}
function formatReply(text) {
  const cleaned = scrubLinks(scrubOwnUse(text));
  const actions = [...cleaned.actions];
  for (const action of mentionActions(cleaned.text)) {
    if (!actions.includes(action)) actions.push(action);
  }
  const body = cleaned.text;
  if (!actions.length) return body;
  return `${body}
[[cta:${actions.join(",")}]]`;
}
function isValidEmail(value) {
  const text = value.trim();
  if (text.length < 6 || text.length > 120) return false;
  if (text.split("@").length !== 2) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}
function cleanLine(value, max) {
  return value.replace(/[\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// lib/leads.ts
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";

// lib/alerts.ts
var FORM_ID = /^[A-Za-z0-9]{4,32}$/;
function formspreeId(env = process.env) {
  const value = (env.CHATBOT_ALERT_FORMSPREE_ID || "").trim();
  return FORM_ID.test(value) ? value : "";
}
async function postChatbotAlert(input, fetchImpl = fetch) {
  if (!FORM_ID.test(input.formId)) return { ok: false, status: 0 };
  try {
    const response = await fetchImpl(`https://formspree.io/f/${input.formId}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        goal: input.goal,
        page: input.page || "",
        source: "chatbot",
        _subject: `Chatbot lead: ${input.name}`
      }),
      signal: AbortSignal.timeout(4e3)
    });
    return { ok: response.ok, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

// lib/mailerlite.ts
var SUBSCRIBERS = "https://connect.mailerlite.com/api/subscribers";
var noteFieldRejected = false;
function optionalGroup(name, env = process.env) {
  const value = (env[name] || "").trim();
  return /^\d{1,30}$/.test(value) ? value : "";
}
function fieldSet(input, mode) {
  const fields = {};
  if (input.name) fields.name = input.name;
  if (mode !== "safe" && input.phone) fields.phone = input.phone;
  if (input.source) fields.signup_source = input.source;
  if (mode === "full" && input.note && !noteFieldRejected) fields.note = input.note.slice(0, 500);
  return fields;
}
async function postSubscriber(key, input, fields, fetchImpl) {
  const payload = { email: input.email };
  if (Object.keys(fields).length) payload.fields = fields;
  if (input.group) payload.groups = [input.group];
  let response;
  try {
    response = await fetchImpl(SUBSCRIBERS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8e3)
    });
  } catch {
    return { ok: false, status: 0, detail: "" };
  }
  if (response.ok) {
    let id = "";
    try {
      const body = await response.json();
      if (body?.data?.id != null) id = String(body.data.id);
    } catch {
      id = "";
    }
    return { ok: true, id };
  }
  let detail = "";
  try {
    detail = (await response.text()).slice(0, 500);
  } catch {
    detail = "";
  }
  return { ok: false, status: response.status, detail };
}
async function subscribe(key, input, fetchImpl = fetch) {
  const attempts = ["full"];
  if (input.note || input.phone) attempts.push("no-note");
  if (input.phone) attempts.push("safe");
  let last = 0;
  for (const mode of attempts) {
    const fields = fieldSet(input, mode);
    const result = await postSubscriber(key, input, fields, fetchImpl);
    if (result.ok) return { ok: true, id: result.id };
    last = result.status;
    if (result.status !== 422) return { ok: false, status: result.status };
    if (mode === "full" && input.note && /note/i.test(result.detail)) noteFieldRejected = true;
    if (mode === "no-note" && !input.phone) break;
  }
  return { ok: false, status: last || 422 };
}

// lib/leads.ts
function validateLead(input, source, knownPage2) {
  const name = cleanLine(typeof input.name === "string" ? input.name : "", 80);
  const email = cleanLine(typeof input.email === "string" ? input.email : "", 120);
  const goal = cleanLine(typeof input.goal === "string" ? input.goal : "", 400);
  if (name.length < 2) return { ok: false, error: "I need a name." };
  if (!isValidEmail(email)) return { ok: false, error: "I need an email address." };
  if (goal.length < 2) return { ok: false, error: "I need a line about what they want." };
  return {
    ok: true,
    lead: { name, email, goal, page: knownPage2, source }
  };
}
function pathname(prefix, lead) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const hash = createHash("sha256").update(`${lead.email.toLowerCase()}
${lead.goal.toLowerCase()}`).digest("hex").slice(0, 16);
  return `${prefix}/${day}/${hash}.json`;
}
async function notify(config, lead) {
  const url = process.env[config.lead.webhookEnv];
  if (!url) return false;
  let target;
  try {
    target = new URL(url);
  } catch {
    console.error("lead notify: LEAD_NOTIFY_URL is not a URL");
    return false;
  }
  if (target.protocol !== "https:") {
    console.error("lead notify: LEAD_NOTIFY_URL must be https");
    return false;
  }
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        to: config.lead.notifyName,
        notifyEmail: config.links.email,
        ...lead,
        receivedAt: (/* @__PURE__ */ new Date()).toISOString()
      }),
      signal: AbortSignal.timeout(4e3)
    });
    if (!response.ok) {
      console.error(`lead notify: webhook responded ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("lead notify: webhook failed", error instanceof Error ? error.name : "error");
    return false;
  }
}
async function subscribeChatbot(lead) {
  const group = optionalGroup("MAILERLITE_GROUP_CHATBOT");
  if (!group) {
    console.info("chatbot mailerlite skipped: MAILERLITE_GROUP_CHATBOT unset");
    return "skipped";
  }
  const key = (process.env.MAILERLITE_API_KEY || "").trim();
  if (!key) {
    console.error("chatbot mailerlite skipped: MAILERLITE_API_KEY is not set");
    return "skipped";
  }
  const note = [`Goal: ${lead.goal}`, lead.page ? `Page: ${lead.page}` : ""].filter(Boolean).join(". ");
  try {
    const result = await subscribe(key, {
      email: lead.email,
      name: lead.name,
      source: "chatbot",
      group,
      note
    });
    if (!result.ok) {
      console.error("chatbot mailerlite failed", result.status);
      return "failed";
    }
    console.info("chatbot mailerlite added");
    return "added";
  } catch (error) {
    console.error("chatbot mailerlite failed", error instanceof Error ? error.name : "error");
    return "failed";
  }
}
async function alertChatbot(lead) {
  const formId = formspreeId();
  if (!formId) {
    if ((process.env.CHATBOT_ALERT_FORMSPREE_ID || "").trim()) {
      console.error("chatbot alert skipped: CHATBOT_ALERT_FORMSPREE_ID is not a form id");
    } else {
      console.info("chatbot alert skipped: CHATBOT_ALERT_FORMSPREE_ID unset");
    }
    return false;
  }
  const result = await postChatbotAlert({
    formId,
    name: lead.name,
    email: lead.email,
    goal: lead.goal,
    page: lead.page
  });
  if (!result.ok) {
    console.error("chatbot alert failed", result.status);
    return false;
  }
  console.info("chatbot alert sent");
  return true;
}
async function deliverLead(config, lead) {
  const [mailerlite, alerted, webhook] = await Promise.all([
    subscribeChatbot(lead),
    alertChatbot(lead),
    notify(config, lead)
  ]);
  return { notified: alerted || webhook, mailerlite };
}
async function saveLead(config, lead, write = async (pathname2, body) => {
  await put(pathname2, body, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });
}) {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    console.error("lead storage: Blob is not connected");
    return { ok: false, error: "storage-not-configured" };
  }
  const record = {
    ...lead,
    notifyName: config.lead.notifyName,
    savedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await write(pathname(config.lead.storagePrefix, lead), JSON.stringify(record));
  } catch (error) {
    console.error("lead storage: put failed", error instanceof Error ? error.name : "error");
    return { ok: false, error: "storage-failed" };
  }
  let notified = false;
  let mailerlite = "skipped";
  try {
    const delivered = await deliverLead(config, lead);
    notified = delivered.notified;
    mailerlite = delivered.mailerlite;
  } catch (error) {
    console.error("lead delivery failed", error instanceof Error ? error.name : "error");
  }
  console.info(`lead stored source=${lead.source} notified=${notified} mailerlite=${mailerlite}`);
  return { ok: true, notified };
}

// lib/prompt.ts
function buildInstructions(config, page) {
  const rules = config.rules.map((rule) => `- ${rule}`).join("\n");
  const where = page ? `The visitor is reading ${page}.` : "You do not know which page they are on.";
  return [
    `You are the website assistant for ${config.name}.`,
    "The visitor sees every word you write. Answer them directly. Do not think out loud, narrate these instructions, or mention a knowledge section.",
    `Voice: ${config.voice}`,
    where,
    `Rules:
${rules}`,
    `Knowledge, and only this knowledge:
${config.knowledge}`,
    [
      "Lead capture.",
      "Your main job is to help the right person apply. Ask one question at a time, two at most, so you understand their week. Reflect the problem in their words, say how Callum's online coaching fits, then point them to apply.",
      "Do not ask for their details before you have answered them. If they are only asking a question, answer it.",
      "If they give a name, an email and a line about their goal, call saveLead before you confirm. Do not call it with blanks or guesses. Do not say Callum has their note unless saveLead returns ok. Never say it was emailed.",
      "After a successful save, say Callum has the note, and that applying is still the way to go ahead. End with [[apply]].",
      "If saveLead fails, do not say the details were saved. Tell them to apply, and end with [[apply]].",
      "Never write a path or a URL. Say apply, the free guide, or the TDEE calculator, then the matching marker."
    ].join(" "),
    `If a price slips out that is not published, it will be replaced with: "${config.priceStandIn}". Prefer to quote a published price yourself, exactly as written in the knowledge.`,
    [
      "Next step.",
      "The main call to action is apply. Say so in plain words. End that reply with [[apply]] on its own line.",
      "If they are not ready, offer the free guide and end with [[guide]], or the TDEE calculator and end with [[tdee]]. Do not push, and do not invent urgency.",
      "Do not calculate calories, macros, a protein number, or a dose. For calories, send them to the TDEE calculator.",
      "Two or three short sentences, then stop.",
      "For a range, write the word to. Never use an em dash or an en dash.",
      "Never write a path, a domain, or a URL in the reply."
    ].join(" ")
  ].join("\n\n");
}
function publicWidget(config) {
  return {
    title: config.widget.title,
    launcherLabel: config.widget.launcherLabel,
    greeting: config.widget.greeting,
    placeholder: config.widget.placeholder,
    suggestions: config.widget.suggestions.slice(0, 3),
    formTitle: config.widget.formTitle,
    formSubmit: config.widget.formSubmit,
    applyHref: config.links.apply,
    applyLabel: config.links.applyLabel,
    guideHref: config.links.guide,
    guideLabel: config.links.guideLabel,
    calculatorHref: config.links.calculator,
    calculatorLabel: config.links.calculatorLabel,
    nudge: {
      text: config.nudge.text,
      delayMs: config.nudge.delayMs,
      scroll: config.nudge.scroll,
      replies: config.nudge.replies.slice(0, 3)
    }
  };
}

// server/chat.ts
var maxDuration = 30;
var leadSchema = z.object({
  name: z.string().describe("The visitor's name"),
  email: z.string().describe("The email address they gave"),
  goal: z.string().describe("What they want, in their words")
});
function reply(body, status = 200, extra) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...extra }
  });
}
function limited(retryAfter, cors) {
  return reply(
    { error: "You've sent quite a few messages. Give it a minute, or apply and Callum will read it himself." },
    429,
    { "retry-after": String(retryAfter), ...cors }
  );
}
function cleanReply(text, userText = "") {
  const priced = scrubOwnUse(scrubDashes(scrubPrices(text, business.allowedPrices, business.priceStandIn)));
  return formatReply(ensureAnabolicReply(userText, priced));
}
function GET(request) {
  return Response.json(publicWidget(business), {
    headers: { "cache-control": "public, max-age=300", ...corsHeaders(request, business.origins) }
  });
}
function OPTIONS(request) {
  return new Response(null, { status: 204, headers: corsHeaders(request, business.origins) });
}
async function POST(request) {
  const cors = corsHeaders(request, business.origins);
  const json = (body2, status = 200, extra) => reply(body2, status, { ...cors, ...extra });
  if (!sameOrigin(request, business.origins)) {
    return json({ error: "Open the chat on the site and try again." }, 403);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 24e3) {
    return json({ error: "That message is a bit long. Try a shorter question." }, 413);
  }
  const limit = takeRateLimit(
    clientKey(request),
    Date.now(),
    business.limits.windowMs,
    business.limits.maxRequests
  );
  if (!limit.ok) return limited(limit.retryAfter, cors);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "I couldn't read that. Try again." }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ error: "I couldn't read that. Try again." }, 400);
  }
  const page = knownPage(body.page, business.pages);
  const leadBody = body.lead;
  if (leadBody && typeof leadBody === "object") {
    const parsed = validateLead(leadBody, "chat-form", page);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const saved = await saveLead(business, parsed.lead);
    if (!saved.ok) {
      return json(
        {
          error: "I couldn't save that just now. Apply and it comes straight to Callum."
        },
        503
      );
    }
    return json({
      ok: true,
      notified: saved.notified,
      actions: ["apply"],
      message: `${parsed.lead.name}, that's with Callum. The next step is still to apply. He reads it himself.`
    });
  }
  const messages = normaliseMessages(body.messages, business.limits);
  if (!messages.ok) return json({ error: messages.error }, messages.status);
  const latestUser = [...messages.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const model = process.env.AI_GATEWAY_MODEL || business.model;
  let savedLead = false;
  const result = streamText({
    model,
    instructions: buildInstructions(business, page),
    messages: messages.messages,
    maxOutputTokens: 120,
    temperature: 0.2,
    reasoning: "none",
    stopWhen: isStepCount(4),
    tools: {
      saveLead: tool({
        description: "Save a note for Callum once the visitor has given their name, email, and a line about their goal. Call this before confirming. Do not say it was emailed.",
        inputSchema: leadSchema,
        execute: async (input) => {
          const parsed = validateLead(input, "chat-tool", page);
          if (!parsed.ok) return { ok: false, error: parsed.error };
          const saved = await saveLead(business, parsed.lead);
          savedLead = saved.ok;
          if (!saved.ok) {
            return {
              ok: false,
              error: "The details could not be stored. Ask them to apply."
            };
          }
          return {
            ok: true,
            notified: saved.notified,
            note: "Stored for Callum. Do not say it was emailed. The next step is still to apply. End with [[apply]]."
          };
        }
      })
    },
    onError({ error }) {
      console.error("chat model error", error instanceof Error ? error.name : "error");
    }
  });
  const prices = createPriceStream(business.allowedPrices, business.priceStandIn);
  const dashes = createDashStream();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let raw = "";
      try {
        for await (const delta of result.textStream) raw += delta;
        const joined = dashes.push(prices.push(raw)) + dashes.push(prices.flush()) + dashes.flush();
        const fallback = savedLead ? "Thanks. That's with Callum. Applying is still the way to go ahead. He reads it himself." : "Sorry, I missed that. Ask me about the coaching, or apply and Callum will read it himself.";
        controller.enqueue(encoder.encode(cleanReply(joined.trim() ? joined : fallback, latestUser)));
      } catch (error) {
        console.error("chat stream error", error instanceof Error ? error.name : "error");
        controller.enqueue(
          encoder.encode(
            cleanReply("Sorry, I can't answer just now. You can still apply, and Callum will read it himself.")
          )
        );
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      ...cors
    }
  });
}
export {
  GET,
  OPTIONS,
  POST,
  maxDuration
};
