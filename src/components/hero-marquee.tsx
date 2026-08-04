import { heroTiles } from "@/data/hero-tiles";

// Split round-robin (not by original row) so each strip mixes photos from
// across the whole collage instead of replaying one contiguous chunk of it.
const ROW_A = heroTiles.filter((_, i) => i % 2 === 0);
const ROW_B = heroTiles.filter((_, i) => i % 2 === 1);

function MarqueeRow({ tiles }: { tiles: typeof heroTiles }) {
  return (
    <div className="w-full overflow-hidden h-[159px] sm:h-[177px]">
      <div className="hero-marquee-track flex h-full w-max gap-2">
        {[...tiles, ...tiles].map((tile, i) => (
          <img
            key={`${tile.src}-${i}`}
            src={tile.src}
            alt=""
            width={tile.width}
            height={tile.height}
            loading="eager"
            decoding="async"
            className="h-full w-auto flex-none rounded-sm"
          />
        ))}
      </div>
    </div>
  );
}

export function HeroMarquee() {
  return (
    <div aria-hidden="true" className="flex w-full flex-col gap-2">
      <MarqueeRow tiles={ROW_A} />
      <MarqueeRow tiles={ROW_B} />
    </div>
  );
}
