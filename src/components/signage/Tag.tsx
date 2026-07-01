import { cn } from "@/lib/utils";

type TagKind = "gnss" | "dsrc" | "live" | "neutral";

const STYLE: Record<TagKind, string> = {
  gnss: "bg-shell-ok/15 text-[#5fd6a3]",
  dsrc: "bg-shell-yellow/15 text-shell-yellow-deep",
  live: "bg-shell-ok/15 text-[#5fd6a3]",
  neutral: "bg-shell-ink/10 text-shell-grey",
};

/** Mono signage tag — e.g. GNSS / DSRC tolling technology. */
export function Tag({
  children,
  kind = "neutral",
  className,
}: {
  children: React.ReactNode;
  kind?: TagKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-[5px] px-2 py-0.5 font-mono text-[0.72rem] font-bold",
        STYLE[kind],
        className
      )}
    >
      {children}
    </span>
  );
}
