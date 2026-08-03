import fs from "node:fs";
import path from "node:path";
import bundledManifest from "@/data/album-manifest.json";

const MEDIA_DIR = process.env.ALBUM_MEDIA_DIR;

export interface ManifestItem {
  id: string;
  isVideo: boolean;
  takenAt: string | null;
  width: number | null;
  height: number | null;
  lat: number | null;
  lon: number | null;
  city?: string | null;
}

// The manifest grows to a few thousand entries, and it is re-read on every
// gallery page change. Cache the parsed array and invalidate on mtime so a
// still-running ingest still shows up without a server restart.
let cache: { mtimeMs: number; items: ManifestItem[] } | null = null;

// Chronological, with undated items last. The ingest script already writes the
// manifest in this order, but paging makes the order load-bearing — a photo
// landing on the wrong page is not something the viewer can scroll past — so
// callers sort rather than trusting the file they were handed.
function byTakenAt(a: ManifestItem, b: ManifestItem): number {
  if (!a.takenAt) return b.takenAt ? 1 : a.id.localeCompare(b.id);
  if (!b.takenAt) return -1;
  return a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id);
}

// Two sources, in priority order:
//   1. ALBUM_MEDIA_DIR/manifest.json — present in local dev, and refreshed by
//      every ingest run, so newly converted media appears without republishing.
//   2. src/data/album-manifest.json — committed, bundled into the deployment.
//      This is what production reads; Vercel has no media directory.
export function loadManifest(): ManifestItem[] | null {
  const manifestPath = MEDIA_DIR ? path.join(MEDIA_DIR, "manifest.json") : null;

  if (manifestPath && fs.existsSync(manifestPath)) {
    const { mtimeMs } = fs.statSync(manifestPath);
    if (cache && cache.mtimeMs === mtimeMs) return cache.items;
    try {
      const items: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      items.sort(byTakenAt);
      cache = { mtimeMs, items };
      return items;
    } catch (error) {
      console.error("[manifest] Failed to parse manifest.json, using bundled copy:", error);
    }
  }

  if (cache && cache.mtimeMs === 0) return cache.items;
  const items = [...(bundledManifest as ManifestItem[])].sort(byTakenAt);
  cache = { mtimeMs: 0, items };
  return items;
}
