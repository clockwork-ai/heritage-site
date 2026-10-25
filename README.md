# CALLUM.B heritage site

The heritage green-and-gold redesign of callumbcoaching.co.uk.

- `index.html`: Home page
- `heritage.css` / `heritage.js`: shared design system and motion
- `brand_assets/`, `assets/photos/`: lion crest and photos

Preview locally: `node serve.mjs`, then open http://localhost:3000

## Source of truth

The committed HTML is the source of truth. It was mirrored from https://callumbcoaching.co.uk on 24 Oct 2026 (the live upload from 21 Oct, which is ahead of this repo's templates). Do not run `npm run build` until `tools/build_pages.py` is re-synced with that HTML. The build script regenerates pages from the templates and would overwrite the mirrored pages.

`tools/build_pages.py` generates `about.html`, `coaching.html`, `results.html`, `apply.html`, and `terms-coaching.html` by slicing markers in `index.html`. Those markers are not in the mirrored homepage, so a fresh build stops with `ValueError: substring not found` and cannot recreate any of those five pages. All five now diverge from the templates. `index.html` is the template input, not a generated page.

## Free-guide signup

The free guide is The Five Foundations: `guides/the-five-foundations.pdf`. `guides/five-numbers.pdf` is the same file, and `/guides/five-numbers.pdf` redirects to the new name.

`components.js` posts JSON to `/api/lead.php`. On `callumbcoaching.co.uk` that post goes to `https://callumb-coaching.vercel.app/api/lead.php`. Elsewhere it stays on the same origin. `api/lead.js` and `api/lead.php.js` are the same Vercel function (built from `server/lead.ts`), and `vercel.json` also rewrites `/api/lead.php` to `/api/lead`. Both paths answer OPTIONS from the public site. A successful signup answers with `download` set to `/guides/the-five-foundations.pdf`.

Set these on the Vercel project (Settings → Environment Variables). Do not commit them.

- `MAILERLITE_API_KEY` (required). MailerLite → Integrations → API → Generate new token. This is a Connect API token for `connect.mailerlite.com`, not a legacy v2 key.
- `MAILERLITE_GROUP_ID` (optional). MailerLite → Subscribers → Groups → open the group. The group ID is the long number in the URL. If it is unset, the subscriber is created and not added to a group. The group name is not stored in this repo.

On the cPanel upload, the form posts to the Vercel function instead. There is no key to add on cPanel. See `CPANEL.md`.
