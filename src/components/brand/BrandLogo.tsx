import { Logo } from "./Logo";
import { useAppStore } from "@/app/store";
import { monogram, onAccentHex } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Active-brand logo for dark grounds (sidebar, auth screens): the
 * partner's uploaded logo, else an accent monogram + wordmark, else
 * the MSTS wordmark.
 */
export function BrandLogo({ className }: { className?: string }) {
  const { activeBrand } = useAppStore();
  if (!activeBrand) return <Logo className={className} />;
  if (activeBrand.logoDataUrl) {
    return (
      <img
        src={activeBrand.logoDataUrl}
        alt={activeBrand.name}
        className={cn("h-7 w-auto select-none", className)}
        draggable={false}
      />
    );
  }
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md font-display text-sm font-black"
        style={{
          background: activeBrand.accentColor,
          color: onAccentHex(activeBrand.accentColor),
        }}
      >
        {monogram(activeBrand.name)}
      </span>
      <span className="truncate font-display text-base font-black text-white">
        {activeBrand.name}
      </span>
    </span>
  );
}
