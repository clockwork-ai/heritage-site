# Uploading CALLUM.B to cPanel

Until the domain points at Vercel, callumbcoaching.co.uk is served from the LayerIP cPanel host (Apache and PHP) behind Cloudflare. This pack is the static site plus `.htaccess`. It does not include the Node functions, and it does not include any keys.

## Build the pack

From the repo root:

```
npm run build:cpanel
```

That writes a `cpanel/` folder and `cpanel-upload.zip`. In cPanel File Manager, open `public_html`, upload the zip, and extract it there so `index.html` and `.htaccess` sit in `public_html`, not in a subfolder.

Upload the domain root only. Do not upload `node_modules`, `api/`, `lib/`, `server/`, or a `.env` file. Do not change DNS or MX records. Email stays on LayerIP.

## Chat and the free guide, with no key on cPanel

The chat widget and the free-guide form look at the page hostname. On `callumbcoaching.co.uk` and `www.callumbcoaching.co.uk` they call `https://callumb-coaching.vercel.app`. On any other host, including a Vercel preview and localhost, they call the same origin.

Chat uses `/api/chat`. The form uses `/api/lead.php`. The same signup function also answers `/api/lead`. An OPTIONS preflight from `https://callumbcoaching.co.uk` or `https://www.callumbcoaching.co.uk` is allowed on both paths.

The MailerLite key stays on the Vercel project `callumb-coaching`, as `MAILERLITE_API_KEY`. You do not put that key, or `MAILERLITE_GROUP_ID`, on cPanel.

`https://callumb-coaching.vercel.app/api/chat` and `/api/lead.php` have to be public. Vercel Authentication should protect preview deployments only, not the production `*.vercel.app` URL.

## Clean URLs and the old guide

`.htaccess` serves `/about` from `about.html`, and `/start/` from `start/index.html`.

`/guides/five-numbers.pdf` redirects to `/guides/the-five-foundations.pdf`. The file at the old path is the same PDF, so the new guide still downloads if the rewrite is not applied. New signups get the new file from the thank-you button and from the lead API.

## After the domain points at Vercel

Stop uploading this pack. The Vercel project serves the pages. Leave the MX records where they are. While the hostname is still `callumbcoaching.co.uk`, chat and the guide form keep calling `callumb-coaching.vercel.app`, and that origin is allowed.
