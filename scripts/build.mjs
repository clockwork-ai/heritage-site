import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const publicDir = path.join(root, "public");

await rm(publicDir, { recursive: true, force: true });
await mkdir(path.join(root, "api"), { recursive: true });
await mkdir(publicDir, { recursive: true });

const bundle = {
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node22",
  legalComments: "none",
};

await build({
  ...bundle,
  entryPoints: ["server/chat.ts"],
  outfile: "api/chat.js",
  banner: { js: "// Built from server/chat.ts. Edit that, then npm run build:chat." },
});

await build({
  ...bundle,
  entryPoints: ["server/lead.ts"],
  outfile: "api/lead.js",
  banner: { js: "// Built from server/lead.ts. Edit that, then npm run build:chat." },
});

// Same handler on the .php path the cPanel form posts to, in case the rewrite
// is not what answers that URL.
await build({
  ...bundle,
  entryPoints: ["server/lead.ts"],
  outfile: "api/lead.php.js",
  banner: { js: "// Built from server/lead.ts. Same function as api/lead.js." },
});

await build({
  ...bundle,
  entryPoints: ["server/apply.ts"],
  outfile: "api/apply.js",
  banner: { js: "// Built from server/apply.ts. Edit that, then npm run build:chat." },
});

await build({
  ...bundle,
  entryPoints: ["server/bf.ts"],
  outfile: "api/bf.js",
  banner: { js: "// Built from server/bf.ts. Edit that, then npm run build:chat." },
});

const skip = new Set([
  "api",
  "lib",
  "server",
  "scripts",
  "node_modules",
  "public",
  "tests",
  "tools",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vercel.json",
  "playwright.config.mjs",
  "serve.mjs",
  "screenshot.mjs",
  "offsets.mjs",
  "playwright-report",
  "test-results",
  "deploy",
  "cpanel",
  "cpanel-upload.zip",
]);

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name.startsWith(".") || skip.has(entry.name) || entry.name.endsWith(".md")) continue;
  await cp(path.join(root, entry.name), path.join(publicDir, entry.name), { recursive: true });
}
