import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Numbered step with an outlined (text-stroke) Archivo numeral and a
 * top rule — as used in the landing "How it works" section.
 */
export function Step({
  no,
  title,
  children,
  className,
}: {
  no: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-t-4 border-shell-ink pt-5", className)}>
      <div
        className="font-display text-[3rem] font-black leading-none text-shell-yellow"
        style={{ WebkitTextStroke: "2px #1A1712" }}
      >
        {no}
      </div>
      <h3 className="mt-3 font-display text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm text-shell-grey">{children}</p>
    </div>
  );
}
