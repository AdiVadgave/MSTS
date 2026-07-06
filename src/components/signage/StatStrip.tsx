import * as React from "react";
import { cn } from "@/lib/utils";

export interface StripStat {
  num: React.ReactNode;
  label: string;
  onClick?: () => void;
}

/**
 * Asphalt statistics strip — big yellow Archivo numbers on dark, split by
 * hairline dividers. Mirrors the landing ".stats" band.
 */
export function StatStrip({ stats, className }: { stats: StripStat[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-2xl border border-shell-asphalt-line bg-shell-asphalt",
        "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {stats.map((s, i) => (
        <button
          key={i}
          onClick={s.onClick}
          disabled={!s.onClick}
          className={cn(
            "border-shell-asphalt-line p-6 text-left transition-colors",
            "border-b lg:border-b-0",
            i % 2 === 0 && "border-r",
            "lg:[&:not(:last-child)]:border-r",
            s.onClick && "hover:bg-white/5"
          )}
        >
          <div className="font-display text-[2.4rem] font-black leading-none text-brand-accent">
            {s.num}
          </div>
          <div className="mt-2 text-sm text-[#a79f92]">{s.label}</div>
        </button>
      ))}
    </div>
  );
}
