"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { GradedImage } from "@/components/graded-image";
import { GalleryPagination } from "@/components/gallery-pagination";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

interface GalleryPhoto {
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

interface PhotosResponse {
  photos: GalleryPhoto[];
  page: number;
  totalPages: number;
  total: number;
  days: { key: string; label: string }[];
  cities: string[];
  source: string;
}

const FALLBACK_PHOTOS: GalleryPhoto[] = [
  { id: "fallback-1", url: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=800&q=80", width: 1200, height: 1500, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-2", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80", width: 1600, height: 1067, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-3", url: "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?w=800&q=80", width: 1200, height: 1600, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-4", url: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80", width: 1600, height: 1200, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-5", url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", width: 1200, height: 1500, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-6", url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&q=80", width: 1600, height: 1067, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-7", url: "https://images.unsplash.com/photo-1511300636408-a63a89df3482?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1511300636408-a63a89df3482?w=800&q=80", width: 1200, height: 1600, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-8", url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80", width: 1600, height: 1200, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
  { id: "fallback-9", url: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=1600&q=80", thumbUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80", width: 1200, height: 1500, takenAt: null, isVideo: false, lat: null, lon: null, city: null },
];

// The trip happened in Japan, so "day" boundaries are computed in Asia/Tokyo
// time regardless of the viewer's own timezone — otherwise two friends
// browsing from different countries (or a shift right around UTC midnight)
// would see photos grouped into different days, or the same day rendered
// under two different-looking labels.
const TRIP_TIME_ZONE = "Asia/Tokyo";
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: TRIP_TIME_ZONE });
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TRIP_TIME_ZONE,
});

function formatTakenAt(takenAt: string | null): string | null {
  if (!takenAt) return null;
  return dateFormatter.format(new Date(takenAt));
}

function dayKeyOf(takenAt: string | null): string | null {
  return takenAt ? dayKeyFormatter.format(new Date(takenAt)) : null;
}

// CSS multi-column masonry fills one column top-to-bottom before moving to
// the next, so reading left-to-right does not follow chronological order.
// We instead distribute items round-robin across a fixed number of columns
// (tracked here to match Tailwind's sm/lg/xl breakpoints) so each row reads
// chronologically left-to-right, then render every column as its own flex
// stack.
function useColumnCount() {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const queries = [
      window.matchMedia("(min-width: 1280px)"),
      window.matchMedia("(min-width: 1024px)"),
      window.matchMedia("(min-width: 640px)"),
    ];

    function update() {
      if (queries[0].matches) setColumns(4);
      else if (queries[1].matches) setColumns(3);
      else if (queries[2].matches) setColumns(2);
      else setColumns(1);
    }

    update();
    queries.forEach((mq) => mq.addEventListener("change", update));
    return () => queries.forEach((mq) => mq.removeEventListener("change", update));
  }, []);

  return columns;
}

function SkeletonGrid() {
  const heights = ["h-72", "h-96", "h-64", "h-80", "h-[28rem]", "h-72", "h-96", "h-64", "h-80"];
  return (
    <div className="columns-1 gap-6 space-y-6 sm:columns-2 lg:columns-3 xl:columns-4">
      {heights.map((h, i) => (
        <Skeleton key={i} className={`w-full break-inside-avoid rounded-lg bg-white/5 ${h}`} />
      ))}
    </div>
  );
}

const FALLBACK_RESPONSE: PhotosResponse = {
  photos: FALLBACK_PHOTOS,
  page: 1,
  totalPages: 1,
  total: FALLBACK_PHOTOS.length,
  days: [],
  cities: [],
  source: "fallback",
};

export default function GalleryPage() {
  const [data, setData] = useState<PhotosResponse | null>(null);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const columns = useColumnCount();
  const gridRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // The page and the two filters all map to one request, so they are tracked
  // as a single key: `loading` is then just "what's on screen isn't what was
  // asked for yet", with no separate boolean to keep in sync.
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (selectedDay) params.set("day", selectedDay);
  if (selectedCity) params.set("city", selectedCity);
  const query = params.toString();
  const loading = loadedQuery !== query;

  useEffect(() => {
    let cancelled = false;

    async function loadPhotos() {
      try {
        const res = await fetch(`/api/photos?${query}`);
        const json: PhotosResponse = await res.json();
        if (cancelled) return;
        // Only stand in for a missing/unconfigured album — a filter that
        // legitimately matches nothing should say so, not show stock photos.
        setData(json.source === "local" ? json : FALLBACK_RESPONSE);
      } catch {
        if (cancelled) return;
        setData(FALLBACK_RESPONSE);
      }
      setLoadedQuery(query);
    }

    loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Paging keeps the grid mounted, so without this the viewer stays scrolled
  // deep into the previous page's photos when the new batch swaps in.
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const changeFilter = useCallback((apply: () => void) => {
    apply();
    setPage(1);
  }, []);

  const items = useMemo(
    () =>
      (data?.photos ?? []).map((photo) => ({
        ...photo,
        dateLabel: formatTakenAt(photo.takenAt),
        dayKey: dayKeyOf(photo.takenAt),
      })),
    [data],
  );

  const days = data?.days ?? [];
  const cities = data?.cities ?? [];

  const columnItems = useMemo(() => {
    const cols: (typeof items)[] = Array.from({ length: columns }, () => []);
    items.forEach((item, i) => cols[i % columns].push(item));
    return cols;
  }, [items, columns]);

  const selected = selectedPhotoId ? items.find((item) => item.id === selectedPhotoId) ?? null : null;

  return (
    <div className="mx-auto max-w-[1800px] px-6 py-10 sm:px-10 sm:py-14 lg:px-16">
      <header className="mb-8">
        <h1 className="text-2xl font-light tracking-wide text-white sm:text-3xl">
          Viagem ao Japão 🇯🇵
        </h1>
        <p className="mt-2 text-sm font-light text-zinc-500">
          Fotos da nossa viagem, para relembrar e compartilhar com a galera.
        </p>
      </header>

      {days.length > 1 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changeFilter(() => setSelectedDay(null))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-light tracking-wide transition-colors",
              selectedDay === null
                ? "border-white bg-white text-black"
                : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white",
            )}
          >
            Todas
          </button>
          {days.map((day) => (
            <button
              key={day.key}
              type="button"
              onClick={() => changeFilter(() => setSelectedDay(day.key))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-light tracking-wide capitalize transition-colors",
                selectedDay === day.key
                  ? "border-white bg-white text-black"
                  : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white",
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}

      {cities.length > 1 && (
        <div className="mb-10 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changeFilter(() => setSelectedCity(null))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-light tracking-wide transition-colors",
              selectedCity === null
                ? "border-white bg-white text-black"
                : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white",
            )}
          >
            Todos os lugares
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => changeFilter(() => setSelectedCity(city))}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-light tracking-wide transition-colors",
                selectedCity === city
                  ? "border-white bg-white text-black"
                  : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white",
              )}
            >
              {city}
            </button>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <p className="mb-4 text-xs font-light tracking-wide text-zinc-500">
          {data.total} {data.total === 1 ? "item" : "itens"}
          {data.totalPages > 1 && ` — página ${data.page} de ${data.totalPages}`}
        </p>
      )}

      <div ref={gridRef} className="scroll-mt-10">
        {data === null ? (
          <SkeletonGrid />
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-sm font-light text-zinc-500">
            Nenhuma foto para esse filtro.
          </p>
        ) : (
          <div className={cn("flex gap-6 transition-opacity duration-200", loading && "opacity-40")}>
            {columnItems.map((col, columnIndex) => (
              <div key={columnIndex} className="flex flex-1 flex-col gap-6">
                {col.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className="group relative block w-full overflow-hidden rounded-lg bg-[#121212] text-left"
                  >
                    <GradedImage
                      src={photo.thumbUrl}
                      alt={photo.dateLabel ? `Foto de ${photo.dateLabel}` : "Foto da viagem"}
                      width={photo.width}
                      height={photo.height}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="h-auto w-full transform-gpu object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      loading="lazy"
                    />

                    {photo.isVideo && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/30">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-transform group-hover:scale-110">
                            <Play size={18} className="ml-0.5 fill-white text-white" />
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="absolute top-3 right-3 border-white/10 bg-black/60 text-[10px] font-light tracking-wide text-zinc-100"
                        >
                          Vídeo
                        </Badge>
                      </>
                    )}

                    {photo.dateLabel && (
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/0 to-black/0 p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <Badge
                          variant="secondary"
                          className="w-fit border-white/10 bg-white/10 text-[11px] font-light tracking-wide text-zinc-200"
                        >
                          {photo.dateLabel}
                        </Badge>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <GalleryPagination
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        disabled={loading}
      />

      <Dialog
        open={selectedPhotoId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPhotoId(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-w-[95vw] border-none bg-transparent p-0 ring-0 sm:max-w-[90vw]"
        >
          <DialogTitle className="sr-only">
            {selected?.dateLabel ? `Foto de ${selected.dateLabel}` : "Foto da viagem"}
          </DialogTitle>
          {selected && (
            <div className="flex max-h-[90vh] w-full items-center justify-center">
              {selected.isVideo ? (
                <video
                  key={selected.id}
                  src={selected.url}
                  poster={selected.thumbUrl}
                  controls
                  className="max-h-[90vh] w-auto rounded-lg"
                />
              ) : (
                <GradedImage
                  src={selected.url}
                  alt={selected.dateLabel ? `Foto de ${selected.dateLabel}` : "Foto da viagem"}
                  width={selected.width}
                  height={selected.height}
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
    </div>
  );
}
