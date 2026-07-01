import { cn } from "@/lib/utils";

/**
 * EU-style license plate — a signature "highway signage" motif.
 * Blue EU strip on the left, mono plate number on a light field.
 */
export function Plate({
  value,
  country,
  className,
  size = "md",
}: {
  value: string;
  country?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-stretch overflow-hidden rounded-md border border-shell-ink/25 bg-white font-mono font-semibold text-shell-ink shadow-sm",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
    >
      <span className="flex flex-col items-center justify-center bg-shell-sign px-1 py-0.5 text-[8px] font-bold leading-none text-shell-yellow">
        <span aria-hidden>★</span>
        {country && <span className="mt-0.5">{country}</span>}
      </span>
      <span className={cn("flex items-center tracking-wider", size === "sm" ? "px-1.5" : "px-2 py-1")}>
        {value}
      </span>
    </span>
  );
}

/** Country-code signage chip (Archivo, yellow-on-asphalt). */
export function CountrySign({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid min-w-6 place-items-center rounded bg-shell-ink px-1.5 py-0.5 font-display text-xs font-black text-shell-yellow",
        className
      )}
    >
      {code}
    </span>
  );
}
