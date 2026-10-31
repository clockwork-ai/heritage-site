# Uploading CALLUM.B to cPanel

Until the domain points at Vercel, callumbcoaching.co.uk is served from the LayerIP cPanel host (Apache and PHP) behind Cloudflare. This pack is the static site. It does not include `.htaccess`, the Node functions, or any keys.

## Build the pack

From the repo root:

```
npm run build:cpanel
```

That writes a `cpanel/` folder and `cpanel-upload.zip`. In cPanel File Manager, open `public_html`, upload the zip, and extract it there so `index.html` sits in `public_html`, not in a subfolder. Leave the `.htaccess` that is already in `public_html` where it is.

Upload the domain root only. Do not upload `node_modules`, `api/`, `lib/`, `server/`, or a `.env` file. Do not change DNS or MX records. Email stays on LayerIP.

## Chat and the free guide, with no key on cPanel

The chat widget and the free-guide form look at the page hostname. On `callumbcoaching.co.uk` and `www.callumbcoaching.co.uk` they call `https://callumb-coaching.vercel.app`. On any other host, including a Vercel preview and localhost, they call the same origin.

Chat uses `/api/chat`. The form uses `/api/lead.php`. The same signup function also answers `/api/lead`. An OPTIONS preflight from `https://callumbcoaching.co.uk` or `https://www.callumbcoaching.co.uk` is allowed on both paths.

The MailerLite key stays on the Vercel project `callumb-coaching`, as `MAILERLITE_API_KEY`. You do not put that key, or any `MAILERLITE_GROUP_*` variable, or `CHATBOT_ALERT_FORMSPREE_ID`, on cPanel.

The apply form's MailerLite copy posts to `/api/apply`, and the photo body-fat step posts to `/api/bf`. On `callumbcoaching.co.uk` and `www.callumbcoaching.co.uk` those posts go to `https://callumb-coaching.vercel.app`. On any other host they stay on the same origin. `/bf-api.php` on Vercel rewrites to `/api/bf`.

`https://callumb-coaching.vercel.app/api/chat` and `/api/lead.php` have to be public. Vercel Authentication should protect preview deployments only, not the production `*.vercel.app` URL.

## Clean URLs and the old guide

The repo `.htaccess` serves `/about` from `about.html`, and `/start/` from `start/index.html`.

`/guides/five-numbers.pdf` redirects to `/guides/the-five-foundations.pdf` on Vercel. The file at the old path is the same PDF, so the new guide still downloads if the rewrite is not applied. New signups get the new file from the thank-you button and from the lead API.

## Do not replace the live .htaccess

This pack does not include `.htaccess`. Extracting the zip over `public_html` leaves the file that is already there.

The live file is 1.72 KB. A request for `https://callumbcoaching.co.uk/.htaccess` returns 403, so the extra rules in that file could not be read or merged. The repo copy is 824 bytes. Uploading it would replace the live file and drop whatever those extra bytes are.

What the repo file contains, and what the live site was doing on 25 October 2026:

- Directory indexes off, follow symlinks, `DirectoryIndex index.html`. Not confirmed from the live file body.
- `/coaching.html` already redirects to `/coaching` on the live site. `/links` already redirects to `/links/`.
- `/about/` currently returns 200 on the live site. The repo file would redirect `/about/` to `/about` when `about.html` exists and `/about` is not a directory.
- `/guides/five-numbers.pdf` currently returns 200 on the live site. The repo file would redirect it. The pack still uploads the new PDF at both `guides/the-five-foundations.pdf` and `guides/five-numbers.pdf`, so the old address keeps working without that redirect.

Add this to the live file by hand if you want the redirect. Put it with the other rewrite rules:

```
RewriteRule ^guides/five-numbers\.pdf$ /guides/the-five-foundations.pdf [R=301,L]
```

Live folders that are not in this repo, including `dl/`, `partners/`, and the PHP files `bf-api.php`, `inches-config.php` and `inches-webhook.php`, are not in the zip. Extracting the zip does not delete them. It does overwrite any file that is in both places. `start/index.html` in this pack is still the Physique OS page. `links/index.html` is the content-loop page.

## After the domain points at Vercel

Stop uploading this pack. The Vercel project serves the pages. Leave the MX records where they are. While the hostname is still `callumbcoaching.co.uk`, chat and the guide form keep calling `callumb-coaching.vercel.app`, and that origin is allowed.
