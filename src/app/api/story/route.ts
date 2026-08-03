import { NextResponse } from "next/server";
import { loadManifest, type ManifestItem } from "@/lib/manifest";
import { getRemovedIds } from "@/lib/r2";
import { toPhoto, type Photo } from "@/lib/photo";
import { storyChapters, type StoryChapter } from "@/data/story";

export interface ResolvedStoryChapter extends Omit<StoryChapter, "photoIds"> {
  photos: Photo[];
}

// The story is a hand-curated subset of the same manifest the main gallery
// reads — no separate data source, so a photo removed via the trash button
// in the lightbox (src/app/api/photos/remove/route.ts) disappears from here
// too instead of leaving a broken chapter behind.
export async function GET() {
  const manifest = loadManifest();
  if (!manifest || manifest.length === 0) {
    return NextResponse.json({ chapters: [] });
  }

  let removedIds: Set<string>;
  try {
    removedIds = await getRemovedIds();
  } catch (error) {
    console.error("[api/story] Failed to load removed-photo list:", error);
    removedIds = new Set();
  }

  const byId = new Map<string, ManifestItem>();
  for (const item of manifest) {
    if (!removedIds.has(item.id)) byId.set(item.id, item);
  }

  const chapters: ResolvedStoryChapter[] = storyChapters
    .map(({ photoIds, ...chapter }) => ({
      ...chapter,
      photos: photoIds.map((id) => byId.get(id)).filter((item): item is ManifestItem => !!item).map(toPhoto),
    }))
    .filter((chapter) => chapter.photos.length > 0);

  return NextResponse.json({ chapters });
}
