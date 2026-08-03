import { NextResponse } from "next/server";
import { loadManifest, type ManifestItem } from "@/lib/manifest";
import { getRemovedIds } from "@/lib/r2";

// Where the bytes live. Set to the R2 bucket's public URL in production; when
// unset the local /api/media route serves them off ALBUM_MEDIA_DIR instead, so
// the gallery still runs before anything has been published.
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL?.replace(/\/+$/, "");

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

function dayKeyOf(takenAt: string | null): string | null {
  return takenAt ? dayKeyFormatter.format(new Date(takenAt)) : null;
}

function mediaUrl(bucket: "full" | "thumb", filename: string): string {
  return MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/${bucket}/${filename}` : `/api/media/${bucket}/${filename}`;
}

function toPhoto(item: ManifestItem): Photo {
  return {
    id: item.id,
    url: mediaUrl("full", `${item.id}.${item.isVideo ? "mp4" : "jpg"}`),
    thumbUrl: mediaUrl("thumb", `${item.id}.jpg`),
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
// Google Takeout export converted to web-friendly JPEG/MP4), then published to
// R2 by scripts/publish-r2.mjs. This route only reads the manifest index — no
// live scraping, no network calls.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const requestedPage = parsePositiveInt(url.searchParams.get("page"), 1, Number.MAX_SAFE_INTEGER);
  const day = url.searchParams.get("day");
  const city = url.searchParams.get("city");

  const rawManifest = loadManifest();
  if (!rawManifest || rawManifest.length === 0) return emptyResponse("empty", pageSize);

  // Removed photos stay in the manifest and in R2 — only this block list
  // (kept in R2 alongside the media, see src/lib/r2.ts) says they shouldn't
  // be served. A failure here should not take the whole gallery down, so a
  // removed photo staying visible briefly is preferable to a broken page.
  let removedIds: Set<string>;
  try {
    removedIds = await getRemovedIds();
  } catch (error) {
    console.error("[api/photos] Failed to load removed-photo list:", error);
    removedIds = new Set();
  }
  const manifest: ManifestItem[] = removedIds.size
    ? rawManifest.filter((item) => !removedIds.has(item.id))
    : rawManifest;

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
    source: "album",
  });
}
