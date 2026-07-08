import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PACKAGE_FEATURES, FEATURE_LABELS } from "@/lib/brand";
import type { FeatureFlag, PartnerPackage } from "@/lib/types";
import { aiRecommendSolution, type SolutionSuggestion } from "./ai";
import type { StepProps } from "./useBuilderState";

const PACKAGES: { id: PartnerPackage; name: string; blurb: string; bullets: string[] }[] = [
  {
    id: "basic",
    name: "Basic",
    blurb: "Cost-effective entry point for small resellers",
    bullets: ["Core fleet & tolling modules", "Standard communication templates", "Support via ticketing"],
  },
  {
    id: "professional",
    name: "Professional",
    blurb: "Balanced feature set for mid-sized resellers",
    bullets: ["Everything in Basic", "Transactions, reports & exports", "Branded invoicing & scheduled reports"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Full customization for large reseller networks",
    bullets: ["Everything in Professional", "Finance, users & onboarding", "Whitelabeled API-first access"],
  },
];

export function StepFeatures({ form, set }: StepProps) {
  const [aiBusy, setAiBusy] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<SolutionSuggestion | null>(null);

  const pickPackage = (pkg: PartnerPackage) =>
    // A tier is a starting point: it resets the checklist, which stays
    // freely editable afterwards.
    set({ package: pkg, features: [...PACKAGE_FEATURES[pkg]] });

  const toggleFeature = (flag: FeatureFlag) =>
    set({
      features: form.features.includes(flag)
        ? form.features.filter((f) => f !== flag)
        : [...form.features, flag],
    });

  const recommend = async () => {
    if (form.businessDescription.trim().length < 12) {
      return toast.error("Describe the partner's business in a sentence or two first");
    }
    setAiBusy(true);
    setSuggestion(null);
    try {
      setSuggestion(await aiRecommendSolution(form.businessDescription.trim()));
    } catch {
      toast.error("Recommendation failed — pick modules manually");
    } finally {
      setAiBusy(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    set({ package: suggestion.package, features: [...suggestion.modules] });
    toast.success("Recommended solution applied — adjust freely below");
  };

  return (
    <div className="space-y-6">
      {/* AI recommendation */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Describe the partner's business — AI proposes the solution</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={form.businessDescription}
            onChange={(e) => set({ businessDescription: e.target.value })}
            placeholder="e.g. Norwegian freight forwarder, 400 trucks across Scandinavia and Germany, has its own CRM, needs consolidated invoicing…"
            className="min-h-16 flex-1"
          />
          <Button variant="outline" disabled={aiBusy} onClick={recommend} className="sm:self-end">
            {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Recommend
          </Button>
        </div>
        {suggestion && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Badge>{suggestion.package.charAt(0).toUpperCase() + suggestion.package.slice(1)}</Badge>
              <span className="text-xs text-muted-foreground">{suggestion.modules.length} modules</span>
              <Badge variant="outline">{suggestion.source === "azure-openai" ? "GPT-4o" : "Mock"}</Badge>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {suggestion.reasoning.slice(0, 6).map((r) => (
                <li key={r.module}>
                  <span className="font-semibold text-foreground">{FEATURE_LABELS[r.module as FeatureFlag] ?? r.module}:</span>{" "}
                  {r.why}
                </li>
              ))}
            </ul>
            <Button size="sm" onClick={applySuggestion}>Apply recommendation</Button>
          </div>
        )}
      </div>

      {/* Package cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => pickPackage(pkg.id)}
            className={
              "rounded-xl border p-4 text-left transition-colors hover:bg-secondary" +
              (form.package === pkg.id ? " border-transparent bg-brand-accent/10 ring-2 ring-brand-accent" : "")
            }
          >
            <p className="font-display font-black">{pkg.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{pkg.blurb}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {pkg.bullets.map((b) => (
                <li key={b} className="flex gap-1.5">
                  <span className="text-brand-accent-deep">•</span> {b}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Feature checklist */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          Modules in this solution
          <span className="ml-2 font-normal text-muted-foreground">
            ({form.features.length}/{Object.keys(FEATURE_LABELS).length} — package is a starting point, edit freely)
          </span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((flag) => (
            <label key={flag} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
              <Checkbox checked={form.features.includes(flag)} onCheckedChange={() => toggleFeature(flag)} />
              {FEATURE_LABELS[flag]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
