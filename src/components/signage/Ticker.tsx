import { cn } from "@/lib/utils";

export interface TickerSign {
  cc: string;
  label: string;
  live?: boolean;
}

/**
 * Motorway-signage ticker — asphalt band of scrolling country signs,
 * exactly like the landing hero. Duplicates the set for a seamless loop.
 */
export function Ticker({ signs, className }: { signs: TickerSign[]; className?: string }) {
  const set = signs.concat(signs);
  return (
    <div
      className={cn(
        "overflow-hidden border-y-[3px] border-shell-ink bg-shell-asphalt",
        className
      )}
      aria-hidden
    >
      <div className="flex w-max animate-ticker motion-reduce:animate-none">
        {set.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 whitespace-nowrap border-r border-shell-asphalt-line px-6 py-3.5"
          >
            <span
              className={cn(
                "size-[7px] rounded-full",
                s.live === false ? "bg-shell-grey" : "bg-shell-ok"
              )}
            />
            <span className="font-display text-lg font-black text-brand-accent">{s.cc}</span>
            <span className="font-mono text-[0.78rem] tracking-[0.05em] text-[#9a9184]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
