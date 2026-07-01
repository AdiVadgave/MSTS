import type { SourcePortal } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<SourcePortal, string> = {
  MyTolls: "bg-blue-50 text-blue-700 ring-blue-200",
  MyMST: "bg-violet-50 text-violet-700 ring-violet-200",
  "Toll2.0": "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

/** Subtle chip marking which legacy portal a feature originated from. */
export function SourceTag({
  source,
  className,
}: {
  source: SourcePortal;
  className?: string;
}) {
  return (
    <span
      title={`Originated in ${source}`}
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        STYLE[source],
        className
      )}
    >
      {source}
    </span>
  );
}
