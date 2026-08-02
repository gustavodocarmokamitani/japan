import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import convertHeic from "heic-convert";
import ffmpegPath from "ffmpeg-static";

const execFileAsync = promisify(execFile);

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
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

const SOURCE_DIR = process.env.ALBUM_SOURCE_DIR;
const MEDIA_DIR = process.env.ALBUM_MEDIA_DIR;
if (!SOURCE_DIR || !MEDIA_DIR) {
  console.error("Missing ALBUM_SOURCE_DIR or ALBUM_MEDIA_DIR in .env.local");
  process.exit(1);
}

const FULL_DIR = path.join(MEDIA_DIR, "full");
const THUMB_DIR = path.join(MEDIA_DIR, "thumb");
const MANIFEST_PATH = path.join(MEDIA_DIR, "manifest.json");

fs.mkdirSync(FULL_DIR, { recursive: true });
fs.mkdirSync(THUMB_DIR, { recursive: true });

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const HEIC_EXTS = new Set([".heic"]);
const VIDEO_EXTS = new Set([".mov", ".mp4"]);

const LIMIT = process.env.INGEST_LIMIT ? Number(process.env.INGEST_LIMIT) : Infinity;
const CONCURRENCY = process.env.INGEST_CONCURRENCY ? Number(process.env.INGEST_CONCURRENCY) : 4;

// A run killed mid-encode leaves behind zero-byte outputs. Treating those as
// "already converted" would cache the breakage permanently, so the resume
// check requires real bytes, not just a directory entry.
function hasContent(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
}

function stableId(filename) {
  return crypto.createHash("sha1").update(filename).digest("hex").slice(0, 16);
}

// Takeout dedupes a repeated media name as `IMG_0384(1).JPG`, but the counter
// on its sidecar goes at the *end* of the name rather than next to the media
// name: `IMG_0384.JPG.supplemental-metadata(1).json`. Looking only for
// `${mediaFilename}.supplemental-metadata.json` misses every duplicate, and
// those items then land in the manifest with takenAt: null.
function sidecarNames(mediaFilename) {
  const names = [`${mediaFilename}.supplemental-metadata.json`];
  const duplicate = mediaFilename.match(/^(.*)\((\d+)\)(\.[^.]*)$/);
  if (duplicate) {
    const [, base, counter, ext] = duplicate;
    names.push(`${base}${ext}.supplemental-metadata(${counter}).json`);
  }
  return names;
}

function tryReadSidecar(mediaFilename) {
  for (const name of sidecarNames(mediaFilename)) {
    const jsonPath = path.join(SOURCE_DIR, name);
    if (!fs.existsSync(jsonPath)) continue;
    try {
      return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    } catch {
      // corrupt sidecar — keep trying the other spellings
    }
  }
  return null;
}

function readJsonSidecar(mediaFilename, allFilesSet) {
  const own = tryReadSidecar(mediaFilename);
  if (own) return own;

  // Live Photos export as an image + a video sharing the same base name, but
  // Takeout only attaches one .supplemental-metadata.json to the pair — fall
  // back to whichever sibling has it.
  const base = mediaFilename.slice(0, mediaFilename.lastIndexOf("."));
  for (const candidate of allFilesSet) {
    if (candidate === mediaFilename) continue;
    if (!candidate.startsWith(base + ".")) continue;
    const sibling = tryReadSidecar(candidate);
    if (sibling) return sibling;
  }
  return null;
}

async function probeInfoText(filePath) {
  try {
    await execFileAsync(ffmpegPath, ["-i", filePath], { windowsHide: true });
    return "";
  } catch (err) {
    return err.stderr ?? "";
  }
}

// Takeout hands out the odd plain JPEG under a .HEIC name (Apple's "_Original"
// exports), which heic-convert rejects outright. The container brand in the
// ftyp box is authoritative where the extension is not.
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

function isHeicBuffer(buffer) {
  return (
    buffer.length > 12 &&
    buffer.toString("ascii", 4, 8) === "ftyp" &&
    HEIC_BRANDS.has(buffer.toString("ascii", 8, 12))
  );
}

async function convertImage(srcPath, id) {
  const fullOut = path.join(FULL_DIR, `${id}.jpg`);
  const thumbOut = path.join(THUMB_DIR, `${id}.jpg`);
  if (hasContent(fullOut) && hasContent(thumbOut)) {
    const meta = await sharp(fullOut).metadata();
    return { width: meta.width, height: meta.height, skipped: true };
  }

  const raw = fs.readFileSync(srcPath);
  const inputBuffer = isHeicBuffer(raw)
    ? await convertHeic({ buffer: raw, format: "JPEG", quality: 0.9 })
    : raw;

  const oriented = await sharp(inputBuffer).rotate().toBuffer();

  const fullBuffer = await sharp(oriented)
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  fs.writeFileSync(fullOut, fullBuffer);

  const thumbBuffer = await sharp(oriented)
    .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  fs.writeFileSync(thumbOut, thumbBuffer);

  const meta = await sharp(fullBuffer).metadata();
  return { width: meta.width, height: meta.height };
}

async function convertVideo(srcPath, id) {
  const outPath = path.join(FULL_DIR, `${id}.mp4`);
  const posterPath = path.join(THUMB_DIR, `${id}.jpg`);

  if (hasContent(outPath) && hasContent(posterPath)) {
    const meta = await sharp(posterPath).metadata();
    return { width: meta.width, height: meta.height, skipped: true };
  }

  const probeText = await probeInfoText(srcPath);
  const isHDR = /arib-std-b67|smpte2084/i.test(probeText);

  const scaleFilter =
    "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2";
  const vf = isHDR
    ? `zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,${scaleFilter}`
    : `${scaleFilter},format=yuv420p`;

  await execFileAsync(
    ffmpegPath,
    [
      "-y",
      "-i",
      srcPath,
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "24",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outPath,
    ],
    { windowsHide: true, maxBuffer: 1024 * 1024 * 20 },
  );

  // `+faststart` makes ffmpeg rewrite the whole file to move the moov atom to
  // the front as its very last step. On Windows, with several encodes running
  // at once over multi-hundred-MB sources, reading the mp4 straight afterwards
  // can still hit the pre-rewrite bytes and fail with "moov atom not found",
  // so give it a couple of retries before treating the file as broken.
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1000 * attempt));
    try {
      await execFileAsync(
        ffmpegPath,
        [
          "-y",
          "-ss",
          "0.3",
          "-i",
          outPath,
          "-frames:v",
          "1",
          "-vf",
          "scale='min(800,iw)':'min(800,ih)':force_original_aspect_ratio=decrease",
          posterPath,
        ],
        { windowsHide: true, maxBuffer: 1024 * 1024 * 20 },
      );
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;

  const meta = await sharp(posterPath).metadata();
  return { width: meta.width, height: meta.height };
}

// The manifest is keyed by id and merged with whatever is already on disk, so
// an interrupted run (this takes ~45min over ~800 files) resumes instead of
// truncating the manifest down to the handful of items the new run got to.
// It also preserves fields added by later passes, e.g. `city` from
// scripts/geocode-manifest.mjs.
function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return new Map();
  try {
    const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    return new Map(existing.map((item) => [item.id, item]));
  } catch {
    console.warn("Existing manifest.json is unreadable — starting a fresh one");
    return new Map();
  }
}

// Written via a temp file + rename so a run killed mid-write leaves the
// previous manifest intact rather than a half-flushed, unparseable one.
// Chronological, with undated items last — sorting them as "" would park
// everything Takeout gave no timestamp for at the very top of the gallery.
function byTakenAt(a, b) {
  if (!a.takenAt) return b.takenAt ? 1 : a.id.localeCompare(b.id);
  if (!b.takenAt) return -1;
  return a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id);
}

function writeManifest(manifest) {
  const sorted = [...manifest.values()].sort(byTakenAt);
  const tmpPath = `${MANIFEST_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(sorted, null, 2));
  fs.renameSync(tmpPath, MANIFEST_PATH);
}

async function main() {
  const allFiles = fs.readdirSync(SOURCE_DIR);
  const allFilesSet = new Set(allFiles);
  let mediaFiles = allFiles.filter((f) => !f.endsWith(".json") && !f.startsWith("."));
  mediaFiles = mediaFiles.slice(0, LIMIT);
  console.log(`Found ${mediaFiles.length} media files (limit=${LIMIT === Infinity ? "none" : LIMIT})`);

  const manifest = loadManifest();
  console.log(`Manifest already has ${manifest.size} items — resuming`);

  let processed = 0;
  let failed = 0;
  let index = 0;

  async function worker() {
    while (index < mediaFiles.length) {
      const i = index++;
      const filename = mediaFiles[i];
      const ext = path.extname(filename).toLowerCase();
      const srcPath = path.join(SOURCE_DIR, filename);
      const id = stableId(filename);

      try {
        const sidecar = readJsonSidecar(filename, allFilesSet);
        const takenAtSec = sidecar?.photoTakenTime?.timestamp ? Number(sidecar.photoTakenTime.timestamp) : null;
        const takenAt = takenAtSec ? new Date(takenAtSec * 1000).toISOString() : null;
        const lat = sidecar?.geoData?.latitude ?? null;
        const lon = sidecar?.geoData?.longitude ?? null;
        const hasGeo = lat !== null && lon !== null && !(lat === 0 && lon === 0);

        let result;
        let isVideo = false;

        if (HEIC_EXTS.has(ext) || IMAGE_EXTS.has(ext)) {
          result = await convertImage(srcPath, id);
        } else if (VIDEO_EXTS.has(ext)) {
          isVideo = true;
          result = await convertVideo(srcPath, id);
        } else {
          console.log(`SKIP unknown ext: ${filename}`);
          continue;
        }

        manifest.set(id, {
          ...manifest.get(id),
          id,
          isVideo,
          takenAt,
          width: result.width ?? null,
          height: result.height ?? null,
          lat: hasGeo ? lat : null,
          lon: hasGeo ? lon : null,
        });

        processed++;
        console.log(
          `[${processed}/${mediaFiles.length}]${result.skipped ? " (cached)" : ""} ${filename}`,
        );

        // Write after every item (not just at the end) so the site can show
        // real photos as they're converted instead of sitting on the
        // Unsplash fallback for the whole ~45min run.
        writeManifest(manifest);
      } catch (err) {
        failed++;
        console.error(`FAILED: ${filename}:`, err.message);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  writeManifest(manifest);
  console.log(`\nDone. ${manifest.size} items in manifest, ${failed} failed.`);
}

main();
