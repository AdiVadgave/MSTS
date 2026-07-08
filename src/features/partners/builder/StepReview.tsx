import { Badge } from "@/components/ui/badge";
import { DESIGN_TEMPLATES, FEATURE_LABELS, monogram, onAccentHex } from "@/lib/brand";
import { brandModuleLabel } from "@/app/nav";
import { useEntities } from "@/hooks/api";
import type { FeatureFlag } from "@/lib/types";
import type { StepProps } from "./useBuilderState";

const MODULE_FLAGS: FeatureFlag[] = [
  "dashboard", "vehicles", "obu", "hauliers", "products", "domains",
  "transactions", "reports", "finance", "users", "onboarding",
];

export function StepReview({ form }: StepProps) {
  const { data: entities } = useEntities();
  const template = DESIGN_TEMPLATES.find((t) => t.id === form.designTemplate);
  const modules = form.features.filter((f): f is FeatureFlag => MODULE_FLAGS.includes(f));
  const capabilities = form.features.filter((f) => !MODULE_FLAGS.includes(f as FeatureFlag));
  const assigned = (entities ?? []).filter((e) => form.entityIds.includes(e.id));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Brand</p>
        <div className="mt-2 flex items-center gap-3">
          {form.logoDataUrl ? (
            <img src={form.logoDataUrl} alt="" className="h-9 max-w-28 object-contain" />
          ) : (
            <span
              className="grid size-9 place-items-center rounded-md font-display text-sm font-black"
              style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
            >
              {form.name ? monogram(form.name) : "?"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{form.name || "—"}</p>
            <p className="font-mono text-xs text-muted-foreground">tolls.{form.slug || "—"}.com</p>
          </div>
          <span className="ml-auto size-6 rounded-md border" style={{ background: form.accentColor }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {form.portalName.trim() || `${form.name || "Partner"} Tolls`}
          {form.tagline.trim() ? ` · ${form.tagline.trim()}` : ""}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Design & package</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge>{template?.name ?? "Signage"}</Badge>
          <Badge variant="outline">
            {form.package.charAt(0).toUpperCase() + form.package.slice(1)} package
          </Badge>
          <Badge variant="outline">{form.status}</Badge>
        </div>
        {template && (
          <div className="mt-3 flex h-8 overflow-hidden rounded-lg border">
            {template.swatches.map((c, i) => (
              <span key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Modules ({modules.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {modules.map((m) => (
            <Badge key={m} variant="outline">{brandModuleLabel(m)}</Badge>
          ))}
        </div>
        {capabilities.length > 0 && (
          <>
            <p className="eyebrow mt-3">Capabilities</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {capabilities.map((c) => (
                <Badge key={c} variant="outline">{FEATURE_LABELS[c as FeatureFlag] ?? c}</Badge>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Customers ({assigned.length})</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {assigned.length ? (
            assigned.map((e) => (
              <li key={e.id} className="truncate">
                <span className="font-medium">{e.displayId}</span>
                <span className="text-muted-foreground"> · {e.name}</span>
              </li>
            ))
          ) : (
            <li className="text-warning">
              No customers assigned — the portal will show no tenant data until
              entities are assigned.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
