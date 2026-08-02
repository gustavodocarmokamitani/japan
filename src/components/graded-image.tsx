import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

/**
 * `next/image` under the film grade defined by `.photo-grade` in globals.css.
 *
 * The overlays sit on the wrapper instead of on the <img> itself so a hover
 * zoom scales the photo underneath a vignette and grain that stay pinned to
 * the frame — which is how the effect reads on a real print, and also what
 * keeps the grain from visibly growing on hover.
 */
export function GradedImage({
  className,
  wrapperClassName,
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  return (
    <span className={cn("photo-grade", wrapperClassName)}>
      <Image className={className} {...props} />
      <span className="photo-grade-grain" aria-hidden="true" />
    </span>
  );
}
