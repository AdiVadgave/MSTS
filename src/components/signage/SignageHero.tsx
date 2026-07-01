import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shell "signage" hero band — yellow field with 78/80px gridline stripes,
 * mono eyebrow, heavy Archivo headline. Mirrors the landing hero/CTA.
 */
export function SignageHero({
  eyebrow,
  title,
  lede,
  actions,
  tone = "yellow",
  className,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: string;
  actions?: React.ReactNode;
  tone?: "yellow" | "asphalt";
  className?: string;
  children?: React.ReactNode;
}) {
  const asphalt = tone === "asphalt";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        asphalt
          ? "border-shell-asphalt-line bg-shell-asphalt text-shell-paper"
          : "border-shell-yellow-deep/40 bg-shell-yellow text-shell-ink",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-signage-stripes",
          asphalt ? "opacity-[0.12]" : "opacity-50"
        )}
      />
      {asphalt && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-signage-dash" />
      )}
      <div className="relative z-[1] p-7 sm:p-9">
        {eyebrow && (
          <p
            className={cn(
              "eyebrow",
              asphalt ? "text-shell-yellow" : "text-[#4a3f22]"
            )}
          >
            {eyebrow}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1
              className={cn(
                "font-display font-black leading-[0.98] tracking-tight",
                "text-[clamp(2rem,4vw,3rem)]",
                asphalt ? "text-shell-paper" : "text-shell-ink"
              )}
            >
              {title}
            </h1>
            {lede && (
              <p
                className={cn(
                  "mt-3 max-w-2xl text-[1.02rem] font-medium",
                  asphalt ? "text-[#a79f92]" : "text-[#4a3f22]"
                )}
              >
                {lede}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
