// Pack the static site for the LayerIP cPanel host.
// No Node functions, no node_modules, no secrets.
import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const out = path.join(root, "cpanel");
const zipPath = path.join(root, "cpanel-upload.zip");

const skip = new Set([
  "api",
  "lib",
  "server",
  "scripts",
  "node_modules",
  "public",
  "tests",
  "tools",
  "cpanel",
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
  "cpanel-upload.zip",
  ".git",
  ".vercel",
  ".gitignore",
  ".vercelignore",
]);

function skipped(name) {
  // The live cPanel .htaccess is larger than this repo file. Extracting the
  // zip must not replace it. The repo copy stays in git for the Vercel host
  // and for the guide redirect Callum can add by hand. See CPANEL.md.
  if (name === ".htaccess") return true;
  if (name.startsWith(".")) return true;
  if (skip.has(name)) return true;
  if (name.endsWith(".md") || name.endsWith(".zip")) return true;
  if (name.startsWith(".env")) return true;
  return false;
}

async function copyTree(src, dest) {
  await mkdir(dest, { recursive: true });
  for (const entry of await readdir(src, { withFileTypes: true })) {
    if (skipped(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await cp(from, to);
  }
}

async function walk(dir, visit) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, visit);
    else if (entry.isFile()) await visit(full);
  }
}

await rm(out, { recursive: true, force: true });
await copyTree(root, out);

const oldPdf = path.join(out, "guides", "five-numbers.pdf");
const newPdf = path.join(out, "guides", "the-five-foundations.pdf");
const oldBytes = await readFile(oldPdf);
const newBytes = await readFile(newPdf);
if (!oldBytes.equals(newBytes)) {
  throw new Error("guides/five-numbers.pdf is not a copy of the new guide");
}
if (!oldBytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
  throw new Error("the guide is not a PDF");
}

let htmlCount = 0;
await walk(out, async (full) => {
  if (full.endsWith(".html")) htmlCount += 1;
});

const packedNames = await readdir(out);
if (packedNames.includes(".htaccess")) throw new Error("cPanel pack must not include .htaccess");
const sourceHt = await readFile(path.join(root, ".htaccess"), "utf8");
if (!sourceHt.includes("the-five-foundations.pdf")) throw new Error("repo .htaccess is missing the guide redirect");

const banned = ["node_modules", "api", "lib", "server", "scripts"];
for (const name of banned) {
  const found = await readdir(out).then((names) => names.includes(name));
  if (found) throw new Error(`cPanel pack must not include ${name}`);
}

await rm(zipPath, { force: true });
const zip = spawnSync("zip", ["-r", "-X", zipPath, "."], { cwd: out, stdio: "inherit" });
if (zip.status !== 0) process.exit(zip.status ?? 1);

const artifactDir = process.env.CPANEL_ARTIFACT_DIR || "/opt/cursor/artifacts";
await mkdir(artifactDir, { recursive: true });
const artifact = path.join(artifactDir, "cpanel-upload.zip");
const named = path.join(artifactDir, "cpanel-upload-with-start.zip");
await cp(zipPath, artifact);
await cp(zipPath, named);

console.log(`cPanel folder: ${out}`);
console.log(`HTML files: ${htmlCount}`);
console.log(`Zip: ${zipPath}`);
console.log(`Artifact: ${artifact}`);
console.log(`Artifact: ${named}`);
