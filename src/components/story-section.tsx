"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { GradedImage } from "@/components/graded-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Photo } from "@/lib/photo";

export interface ResolvedStoryChapter {
  id: string;
  title: string;
  dateLabel?: string;
  text: string;
  photos: Photo[];
}

export function StorySection({ chapters }: { chapters: ResolvedStoryChapter[] }) {
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? null,
    [chapters, activeChapterId],
  );
  const activePhotos = activeChapter?.photos ?? [];
  const activeIndex = activePhotoId ? activePhotos.findIndex((p) => p.id === activePhotoId) : -1;
  const active = activeIndex !== -1 ? activePhotos[activeIndex] : null;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex !== -1 && activeIndex < activePhotos.length - 1;

  const openPhoto = useCallback((chapterId: string, photoId: string) => {
    setActiveChapterId(chapterId);
    setActivePhotoId(photoId);
  }, []);

  const goToPrev = useCallback(() => {
    setActivePhotoId((current) => {
      const idx = activePhotos.findIndex((p) => p.id === current);
      return idx > 0 ? activePhotos[idx - 1].id : current;
    });
  }, [activePhotos]);

  const goToNext = useCallback(() => {
    setActivePhotoId((current) => {
      const idx = activePhotos.findIndex((p) => p.id === current);
      return idx !== -1 && idx < activePhotos.length - 1 ? activePhotos[idx + 1].id : current;
    });
  }, [activePhotos]);

  useEffect(() => {
    if (!activePhotoId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePhotoId, goToPrev, goToNext]);

  if (chapters.length === 0) return null;

  return (
    <section className="mb-16 flex flex-col gap-16 sm:gap-24">
      {chapters.map((chapter, i) => (
        <article
          key={chapter.id}
          className={cn(
            "flex flex-col gap-6 sm:items-center sm:gap-10",
            i % 2 === 1 ? "sm:flex-row-reverse" : "sm:flex-row",
          )}
        >
          <div className="sm:flex-1">
            <h2 className="text-xl font-light tracking-wide text-white sm:text-2xl">{chapter.title}</h2>
            {chapter.dateLabel && (
              <p className="mt-1 text-xs font-light tracking-wide text-zinc-500 capitalize">
                {chapter.dateLabel}
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed font-light text-zinc-300">{chapter.text}</p>
          </div>

          <div
            className={cn(
              "grid flex-1 gap-2 sm:gap-3",
              chapter.photos.length >= 5 ? "grid-cols-3" : "grid-cols-2",
            )}
          >
            {chapter.photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => openPhoto(chapter.id, photo.id)}
                className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-[#121212]"
              >
                <GradedImage
                  src={photo.thumbUrl}
                  alt={chapter.title ? `Foto de ${chapter.title}` : "Foto da viagem"}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="transform-gpu object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  wrapperClassName="block h-full w-full"
                  loading="lazy"
                />
                {photo.isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
                      <Play size={14} className="ml-0.5 fill-white text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </article>
      ))}

      <a
        href="#gallery"
        className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-xs font-light tracking-wide text-zinc-300 transition-colors hover:border-white/30 hover:text-white"
      >
        Ver todas as fotos ↓
      </a>

      <Dialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActivePhotoId(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[95vw] border-none bg-transparent p-0 ring-0 sm:max-w-[90vw]"
        >
          <DialogTitle className="sr-only">
            {activeChapter ? `Foto de ${activeChapter.title}` : "Foto da viagem"}
          </DialogTitle>
          {active && (
            <div className="flex max-h-[90vh] w-full items-center justify-center">
              {active.isVideo ? (
                <video
                  key={active.id}
                  src={active.url}
                  poster={active.thumbUrl}
                  controls
                  className="max-h-[90vh] w-auto rounded-lg"
                />
              ) : (
                <GradedImage
                  src={active.url}
                  alt={activeChapter ? `Foto de ${activeChapter.title}` : "Foto da viagem"}
                  width={active.width}
                  height={active.height}
                  sizes="95vw"
                  className="max-h-[90vh] w-auto object-contain"
                  wrapperClassName="max-h-[90vh] overflow-hidden rounded-lg"
                  priority
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {active && hasPrev && (
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Foto anterior"
          className="fixed top-1/2 left-0 z-[60] flex h-32 w-16 -translate-y-1/2 items-center justify-start pl-2 sm:w-24 sm:pl-4"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
            <ChevronLeft size={20} />
          </span>
        </button>
      )}
      {active && hasNext && (
        <button
          type="button"
          onClick={goToNext}
          aria-label="Próxima foto"
          className="fixed top-1/2 right-0 z-[60] flex h-32 w-16 -translate-y-1/2 items-center justify-end pr-2 sm:w-24 sm:pr-4"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
            <ChevronRight size={20} />
          </span>
        </button>
      )}
    </section>
  );
}
