import logoUrl from "@/assets/msts-logo.svg";
import { cn } from "@/lib/utils";

/**
 * MSTS (Shell) wordmark. The source SVG paints the wordmark in white +
 * brand colors, so it is designed to sit on the dark sidebar.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="MSTS"
      className={cn("h-7 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** Compact pecten-only mark for collapsed states / favicons. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid size-8 place-items-center rounded-lg bg-white/10",
        className
      )}
    >
      <img src="/favicon.svg" alt="MSTS" className="size-6" draggable={false} />
    </div>
  );
}
