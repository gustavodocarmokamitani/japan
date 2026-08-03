import type { ManifestItem } from "@/lib/manifest";

// Where the bytes live. Set to the R2 bucket's public URL in production; when
// unset the local /api/media route serves them off ALBUM_MEDIA_DIR instead, so
// the gallery still runs before anything has been published.
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL?.replace(/\/+$/, "");

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

export function mediaUrl(bucket: "full" | "thumb", filename: string): string {
  return MEDIA_BASE_URL ? `${MEDIA_BASE_URL}/${bucket}/${filename}` : `/api/media/${bucket}/${filename}`;
}

export function toPhoto(item: ManifestItem): Photo {
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
