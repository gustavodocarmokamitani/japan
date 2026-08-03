import fs from "node:fs";
import path from "node:path";

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

const MEDIA_DIR = process.env.ALBUM_MEDIA_DIR;
if (!MEDIA_DIR) {
  console.error("Missing ALBUM_MEDIA_DIR in .env.local");
  process.exit(1);
}

const MANIFEST_PATH = path.join(MEDIA_DIR, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));

// Round to ~1.1km so photos taken minutes apart at the same spot share one
// geocoding lookup instead of one per photo.
function clusterKey(lat, lon) {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

const clusters = new Map();
for (const item of manifest) {
  if (item.lat == null || item.lon == null) continue;
  const key = clusterKey(item.lat, item.lon);
  if (!clusters.has(key)) clusters.set(key, { lat: item.lat, lon: item.lon });
}

console.log(`${clusters.size} unique location clusters to geocode (from ${manifest.length} items)`);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function reverseGeocode(lat, lon) {
  // Falls back to English (romanized) instead of the local script when a
  // Portuguese name isn't available, so small JP municipalities don't show
  // up as kanji among the Portuguese/English city names.
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&accept-language=pt-BR,en`;
  const res = await fetch(url, {
    headers: { "User-Agent": "japan-trip-gallery/1.0 (personal project, single-run geocoding script)" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  const addr = data.address ?? {};
  const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || null;
  const country = addr.country || null;
  return { city, country };
}

async function main() {
  const results = new Map();
  let i = 0;
  for (const [key, { lat, lon }] of clusters) {
    i++;
    try {
      const { city, country } = await reverseGeocode(lat, lon);
      results.set(key, city);
      console.log(`[${i}/${clusters.size}] ${key} -> ${city ?? "?"}, ${country ?? "?"}`);
    } catch (err) {
      console.error(`[${i}/${clusters.size}] ${key} FAILED:`, err.message);
      results.set(key, null);
    }
    if (i < clusters.size) await sleep(1100); // respect Nominatim's 1 req/sec policy
  }

  let updated = 0;
  for (const item of manifest) {
    if (item.lat == null || item.lon == null) continue;
    const key = clusterKey(item.lat, item.lon);
    const city = results.get(key);
    if (city) {
      item.city = city;
      updated++;
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. ${updated} items tagged with a city.`);
}

main();
