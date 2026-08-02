import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const MEDIA_DIR = process.env.ALBUM_MEDIA_DIR;

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

// The trip happened in Japan, so "day" buckets are computed in Asia/Tokyo time
// on the server too — the client filters by the same keys, so both sides have
// to agree on where a day starts.
const TRIP_TIME_ZONE = "Asia/Tokyo";
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TRIP_TIME_ZONE,
});
const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: TRIP_TIME_ZONE,
});

export interface Photo {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  takenAt: string | null;
  isVideo: boolean;
  lat: number | null;
  lon: number | null;
  city: string | null;
}

interface ManifestItem {
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
// the API sorts rather than trusting the file it was handed.
function byTakenAt(a: ManifestItem, b: ManifestItem): number {
  if (!a.takenAt) return b.takenAt ? 1 : a.id.localeCompare(b.id);
  if (!b.takenAt) return -1;
  return a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id);
}

function readManifest(manifestPath: string): ManifestItem[] | null {
  const { mtimeMs } = fs.statSync(manifestPath);
  if (cache && cache.mtimeMs === mtimeMs) return cache.items;

  try {
    const items: ManifestItem[] = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    items.sort(byTakenAt);
    cache = { mtimeMs, items };
    return items;
  } catch (error) {
    console.error("[api/photos] Failed to parse manifest.json:", error);
    return null;
  }
}

function dayKeyOf(takenAt: string | null): string | null {
  return takenAt ? dayKeyFormatter.format(new Date(takenAt)) : null;
}

function toPhoto(item: ManifestItem): Photo {
  return {
    id: item.id,
    url: `/api/media/full/${item.id}.${item.isVideo ? "mp4" : "jpg"}`,
    thumbUrl: `/api/media/thumb/${item.id}.jpg`,
    width: item.width ?? 1000,
    height: item.height ?? 1000,
    takenAt: item.takenAt,
    isVideo: item.isVideo,
    lat: item.lat,
    lon: item.lon,
    city: item.city ?? null,
  };
}

function emptyResponse(source: string, pageSize: number) {
  return NextResponse.json({
    photos: [],
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
    hasMore: false,
    days: [],
    cities: [],
    source,
  });
}

function parsePositiveInt(raw: string | null, fallback: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

// Media is pre-processed offline by scripts/ingest-album.mjs (HEIC/MOV from a
// Google Takeout export converted to web-friendly JPEG/MP4) into
// ALBUM_MEDIA_DIR, alongside a manifest.json index. This route just reads
// that manifest — no live scraping, no network calls.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const requestedPage = parsePositiveInt(url.searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER);
  const day = url.searchParams.get("day");
  const city = url.searchParams.get("city");

  if (!MEDIA_DIR) return emptyResponse("not-configured", pageSize);

  const manifestPath = path.join(MEDIA_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) return emptyResponse("empty", pageSize);

  const manifest = readManifest(manifestPath);
  if (!manifest) return emptyResponse("error", pageSize);

  // Filter chips are built from the whole manifest, not just the current page —
  // otherwise the available days/cities would change as you page through.
  const dayMap = new Map<string, string>();
  const citySet = new Set<string>();
  for (const item of manifest) {
    const key = dayKeyOf(item.takenAt);
    if (key && !dayMap.has(key)) {
      dayMap.set(key, dayLabelFormatter.format(new Date(item.takenAt as string)));
    }
    if (item.city) citySet.add(item.city);
  }
  const days = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, label]) => ({ key, label }));

  const filtered = manifest.filter(
    (item) => (!day || dayKeyOf(item.takenAt) === day) && (!city || item.city === city),
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * pageSize;
  const photos = filtered.slice(start, start + pageSize).map(toPhoto);

  return NextResponse.json({
    photos,
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
    days,
    cities: Array.from(citySet),
    source: "local",
  });
}
