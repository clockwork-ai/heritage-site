# CALLUM.B site rules

`CLAUDE.md` and `AGENTS.md` are the same rules. If you change one, change the other in the same commit. This is https://callumbcoaching.co.uk, repo `clockwork-ai/heritage-site`.

## Workflow

Start from the latest `main` on GitHub. Do not edit an old local copy, and do not upload files straight to Cloudflare or Vercel.

Work on a branch, open a pull request, and check the Vercel preview. Never push to `main`. Never merge unless Callum has approved it.

The committed HTML is the source of truth. Do not run `npm run build`. `tools/build_pages.py` is behind the live pages and would overwrite them.

## Hosting

The site is the Vercel project `callumb-coaching` on team `clockwork-ai1`. `vercel.json` uses clean URLs, so a page is served at `/about`.

Until the domain points at Vercel, the same files can be uploaded to the cPanel host. `npm run build:cpanel` builds that pack. The steps are in `CPANEL.md`. Do not put the MailerLite key on cPanel.

The domain and DNS stay on Cloudflare. Do not change DNS records. Email for callum@callumbcoaching.co.uk is on layerip, so do not touch the MX records.

## Style

Use the Heritage palette: deep green canvas (`#09150F`), cream (`#F3EAD6`), gold (`#C9A96E`). Shared styles live in `heritage.css` and `components.css`.

The old black and acid green theme is retired. Do not bring back `#A4E84B`, `styles.css`, or `brand.css`.

## Writing

Write in Callum's voice: plain British English, first person. No AI buzzwords. Do not invent testimonials, results, or stats.

No em dashes (U+2014) and no en dashes (U+2013), including the HTML entities for those characters. That covers visible copy, titles, meta descriptions, og and twitter text, alt text, JSON-LD, scripts, and comments. In a title, use a pipe: `Keep the Muscle | CALLUM.B`. For a range, use "to": `3 to 5`. Do not substitute a double hyphen. Keep a normal hyphen in a compound word such as `first-person`.

## Offers

Coaching is online only. Do not add in-person training until Callum is qualified and insured.

Do not change prices or Stripe links unless Callum asks. Those links live in `assets/js/payment-links-v2.js` and must stay in step with the `plan=` values on the pages.

## Guide signup

The free guide is The Five Foundations, at `/guides/the-five-foundations.pdf`. `/guides/five-numbers.pdf` redirects there. The file at the old path is the same PDF.

`components.js` posts the free-guide form to `/api/lead.php`. On `callumbcoaching.co.uk` and `www.callumbcoaching.co.uk` that post goes to `https://callumb-coaching.vercel.app/api/lead.php`. On any other host it stays on the same origin. `vercel.json` rewrites `/api/lead.php` to `/api/lead`, and `npm run build:chat` also writes `api/lead.php.js`, so both paths answer. OPTIONS from those two origins is allowed on both. The MailerLite key stays on Vercel. See `CPANEL.md`.

Set these on the Vercel project. Do not commit them.

- `MAILERLITE_API_KEY` (required)
- `MAILERLITE_GROUP_ID` (optional; if it is unset, the subscriber is created and not added to a group)
- `MAILERLITE_GROUP_APPLICATIONS` (optional). Group id for the Applications group. `/apply` still posts to Formspree `mvzjlroq`. After that post is accepted, the page also posts to `/api/apply`, which adds the person with `signup_source` set to `apply`. If this variable is unset or blank, that copy is skipped. A MailerLite error never changes the visitor's success message. Name and email are sent. Phone is sent when the contact includes a phone number. A short summary is sent in the `note` field when that text field already exists. If MailerLite rejects `note`, the subscriber is still added, and the full application stays in the Formspree email. A phone number with no email cannot be added, because MailerLite needs an email.
- `MAILERLITE_GROUP_CHATBOT` (optional). Group id for chatbot leads. Each lead stored from the chat is added with `signup_source` set to `chatbot`. If this variable is unset or blank, that step is skipped. The goal and page go in the `note` field when that field exists.

The group id is a number. The group name is not in this repo. Do not change the MailerLite account from here. Do not create the `note` field from this repo. If you want the summary stored on the subscriber, create a text field in MailerLite whose key is `note`.

## Calculators

The TDEE, protein, offset, and Physique OS calculators must keep returning the same numbers. A wording or layout change is not a reason to change the maths.

The photo body-fat step on `/tdee-calculator` posts to `/api/bf`. `/bf-api.php` rewrites to that function. It uses the same AI Gateway model as the chat (`AI_GATEWAY_MODEL`, or `openai/gpt-4.1-mini`). The photo is not stored. If the photo cannot be read, and age, height, weight and sex are present, the response uses the Deurenberg 1991 formula and says so. That fallback is not the TDEE maths.

## Chatbot

The coaching chat is on the site. Its wording and rules live in `lib/business.ts`. Edit the assistant there, then run `npm run build:chat` so `api/chat.js`, `api/lead.js`, `api/lead.php.js`, `api/apply.js`, and `api/bf.js` match. The widget calls `https://callumb-coaching.vercel.app/api/chat` when the hostname is `callumbcoaching.co.uk` or `www.callumbcoaching.co.uk`, and `/api/chat` on any other host. See `CPANEL.md`.

Chatbot leads are still stored in the private Blob. After that, the server adds the person to `MAILERLITE_GROUP_CHATBOT` when that variable is set, and posts name, email, goal and page to Formspree when `CHATBOT_ALERT_FORMSPREE_ID` is set, so Formspree emails Callum. There is no other email service. If either variable is unset, that step is skipped and the Blob copy still stands. `LEAD_NOTIFY_URL` still works if you set it. Set `CHATBOT_ALERT_FORMSPREE_ID` and `MAILERLITE_GROUP_CHATBOT` on Preview and on Production. Do not commit the values.

## Tests

From the repo root, with Chrome installed:

```
npm install
npm test
```

`npm test` runs the Playwright checks in `tests/site.spec.mjs` on desktop (1440 wide) and on a phone size. It starts `node serve.mjs` at http://localhost:3000 unless that server is already running.

- Desktop only: `npm run test:desktop`
- Phone only: `npm run test:phone`
- The live site: `npm run test:live`
- A preview: `BASE_URL=https://the-preview-url npm test`

To look at a page yourself, run `npm run serve` and open http://localhost:3000. For a screenshot, run `node screenshot.mjs http://localhost:3000`. Do not screenshot a `file://` URL.
