"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

// Renders at most `1 … n-1 n n+1 … last`, so the control stays a fixed width
// whether the album has 3 pages or 30.
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, page]);
  if (page > 1) pages.add(page - 1);
  if (page < totalPages) pages.add(page + 1);
  // Keep the control from collapsing when the current page sits at either end.
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

const stepClasses =
  "flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-zinc-400 transition-colors hover:border-white/30 hover:text-white disabled:pointer-events-none disabled:opacity-30";

export function GalleryPagination({ page, totalPages, onPageChange, disabled }: GalleryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação das fotos" className="mt-12 flex items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Página anterior"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={stepClasses}
      >
        <ChevronLeft size={16} />
      </button>

      {pageWindow(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-xs font-light text-zinc-600">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`Página ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            disabled={disabled}
            onClick={() => onPageChange(entry)}
            className={cn(
              "h-8 min-w-8 rounded-full border px-2 text-xs font-light tracking-wide transition-colors disabled:pointer-events-none",
              entry === page
                ? "border-white bg-white text-black"
                : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white",
            )}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label="Próxima página"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={stepClasses}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
