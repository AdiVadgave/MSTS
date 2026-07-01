import * as React from "react";
import { CheckCircle2, Ban, Clock, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tag } from "@/components/signage/Tag";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDomains, useUpdateDomain } from "@/hooks/api";
import type { TollDomain } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function DomainsPage() {
  const { data: domains, isLoading } = useDomains();
  const update = useUpdateDomain();
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const active = domains?.find((d) => d.id === activeId) ?? domains?.[0] ?? null;

  const setStatus = async (status: string) => {
    if (!active) return;
    await update.mutateAsync({ id: active.id, status });
    toast.success(`${active.name} · ${status}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coverage explorer"
        title="Toll Domains"
        description="Pick a domain to see exactly what the box handles — technology, charging basis and live settlement."
        badge={<SourceTag source="Toll2.0" />}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* Plate grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[92px] rounded-lg" />
              ))
            : domains?.map((d) => {
                const isActive = active?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    className={cn(
                      "relative overflow-hidden rounded-lg border p-3 pl-4 text-center transition-all",
                      isActive
                        ? "border-shell-yellow bg-shell-yellow"
                        : "border-shell-asphalt-line bg-shell-asphalt-2 hover:-translate-y-0.5 hover:border-[#6b6252]"
                    )}
                  >
                    <span className="absolute inset-y-0 left-0 w-2 bg-shell-sign" />
                    <span
                      className={cn(
                        "block font-display text-2xl font-black leading-none",
                        isActive ? "text-shell-ink" : "text-shell-paper"
                      )}
                    >
                      {d.country}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 block truncate text-[0.62rem] uppercase tracking-wide",
                        isActive ? "text-[#5c4e12]" : "text-[#8f8778]"
                      )}
                    >
                      {d.provider}
                    </span>
                  </button>
                );
              })}
        </div>

        {/* Detail panel */}
        <div className="lg:sticky lg:top-6">
          {active && <DetailPanel domain={active} onStatus={setStatus} busy={update.isPending} />}
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  domain: d,
  onStatus,
  busy,
}: {
  domain: TollDomain;
  onStatus: (s: string) => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-2xl border border-shell-asphalt-line bg-shell-asphalt-2 p-6 text-shell-paper sm:p-7">
      <div className="mb-5 flex items-center gap-3.5">
        <span className="rounded-lg bg-shell-yellow px-3.5 py-1.5 font-display text-2xl font-black leading-none text-shell-ink">
          {d.country}
        </span>
        <div>
          <div className="font-display text-xl font-extrabold">{d.name.split(" · ")[0]}</div>
          <div className="text-[0.82rem] text-[#9a9184]">{d.provider}</div>
        </div>
        <div className="ml-auto">
          <StatusBadge status={d.status} />
        </div>
      </div>

      <DRow label="Technology">
        <Tag kind={d.tech === "GNSS" ? "gnss" : "dsrc"}>{d.tech}</Tag>{" "}
        <span className="text-[#9a9184]">
          · {d.tech === "GNSS" ? "Satellite / distance" : "Microwave gantry"}
        </span>
      </DRow>
      <DRow label="Charging basis">{d.basis}</DRow>
      <DRow label="Applies to">{d.appliesTo}</DRow>
      <DRow label="Typical rate">{d.rate}</DRow>
      <DRow label="Main corridors">{d.corridors}</DRow>
      <DRow label="Assignments">
        {d.assignedVehicles} vehicles · {d.assignedObus} OBUs
      </DRow>
      <DRow label="Updated">{formatDate(d.updatedAt)}</DRow>

      {/* Live settlement readout */}
      <div className="mt-5 rounded-[10px] bg-shell-asphalt p-4 font-mono text-[0.78rem] leading-relaxed text-[#b7ae9f]">
        <span className="text-shell-ok">●</span> LIVE &nbsp; {d.country}-toll matched
        <br />
        plate <span className="text-shell-yellow">MSTS·4471·07</span> → invoice FLEET-4471
        <br />
        mode <span className="text-shell-yellow">{d.tech}</span> · settled automatically
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="brand" size="sm" onClick={() => onStatus("active")} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Activate
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-shell-paper shadow-[inset_0_0_0_2px_#332D25] hover:shadow-[inset_0_0_0_2px_#6b6252]"
          onClick={() => onStatus("pending")}
          disabled={busy}
        >
          <Clock className="size-4" /> Pending
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onStatus("blocked")} disabled={busy}>
          <Ban className="size-4" /> Block
        </Button>
      </div>
    </div>
  );
}

function DRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-shell-asphalt-line py-3 text-[0.92rem]">
      <span className="text-[#9a9184]">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  );
}
