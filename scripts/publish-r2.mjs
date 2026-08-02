import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const PROJECT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const envPath = path.join(PROJECT_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const MEDIA_DIR = process.env.ALBUM_MEDIA_DIR;
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

const missing = Object.entries({
  ALBUM_MEDIA_DIR: MEDIA_DIR,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  console.error("See README-R2.md for how to create the bucket and token.");
  process.exit(1);
}

const MANIFEST_PATH = path.join(MEDIA_DIR, "manifest.json");
// Committed to the repo so the deployed app has the index without needing the
// media directory — Vercel gets the manifest from the bundle and the bytes
// from R2.
const BUNDLED_MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "data", "album-manifest.json");

const CONCURRENCY = process.env.R2_CONCURRENCY ? Number(process.env.R2_CONCURRENCY) : 8;
const CONTENT_TYPES = { ".jpg": "image/jpeg", ".mp4": "video/mp4" };

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

// Keys are content-addressed by the ingest script's stable id, so an object
// that is already there with the same byte count is the same object — no need
// to re-upload 1.7 GB every run.
async function alreadyUploaded(key, size) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return head.ContentLength === size;
  } catch {
    return false;
  }
}

async function upload(localPath, key) {
  const { size } = fs.statSync(localPath);
  if (await alreadyUploaded(key, size)) return { skipped: true, size };

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fs.createReadStream(localPath),
      ContentLength: size,
      ContentType: CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream",
      // Ids never change for a given source file, so the objects are immutable.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { skipped: false, size };
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`No manifest at ${MANIFEST_PATH} — run scripts/ingest-album.mjs first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

  const jobs = [];
  for (const item of manifest) {
    const fullName = `${item.id}.${item.isVideo ? "mp4" : "jpg"}`;
    jobs.push({ local: path.join(MEDIA_DIR, "full", fullName), key: `full/${fullName}` });
    jobs.push({ local: path.join(MEDIA_DIR, "thumb", `${item.id}.jpg`), key: `thumb/${item.id}.jpg` });
  }

  const present = jobs.filter((j) => fs.existsSync(j.local));
  const totalBytes = present.reduce((sum, j) => sum + fs.statSync(j.local).size, 0);
  console.log(
    `${manifest.length} items -> ${present.length} objects (${(totalBytes / 1024 ** 3).toFixed(2)} GB)` +
      (present.length < jobs.length ? `, ${jobs.length - present.length} missing locally` : ""),
  );

  let done = 0;
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let index = 0;

  async function worker() {
    while (index < present.length) {
      const job = present[index++];
      try {
        const res = await upload(job.local, job.key);
        if (res.skipped) skipped++;
        else uploaded++;
        done++;
        if (done % 25 === 0 || done === present.length) {
          console.log(`[${done}/${present.length}] uploaded=${uploaded} cached=${skipped} failed=${failed}`);
        }
      } catch (err) {
        failed++;
        done++;
        console.error(`FAILED ${job.key}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  fs.mkdirSync(path.dirname(BUNDLED_MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(BUNDLED_MANIFEST_PATH, JSON.stringify(manifest));
  console.log(`\nWrote ${BUNDLED_MANIFEST_PATH} (${manifest.length} items) — commit this file.`);

  if (failed) {
    console.error(`\n${failed} objects failed. Re-run to retry just those.`);
    process.exit(1);
  }
  console.log(`Done. ${uploaded} uploaded, ${skipped} already present.`);
}

main();
