import * as React from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { DESIGN_TEMPLATES } from "@/lib/brand";
import { aiPortalCopy } from "./ai";
import type { StepProps } from "./useBuilderState";

export function StepDesign({ form, set }: StepProps) {
  const [aiBusy, setAiBusy] = React.useState(false);
  const [copySource, setCopySource] = React.useState<string | null>(null);

  const generateCopy = async () => {
    if (!form.name.trim()) return toast.error("Set the partner name first (step 1)");
    setAiBusy(true);
    try {
      const copy = await aiPortalCopy(form.name.trim(), form.businessDescription.trim() || undefined);
      set({
        portalName: copy.portalName || form.portalName,
        tagline: copy.tagline || form.tagline,
        welcomeText: copy.welcomeText || form.welcomeText,
      });
      setCopySource(copy.source);
      toast.success("Portal copy generated — edit freely");
    } catch {
      toast.error("Copy generation failed — write it manually");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template picker */}
      <div className="grid gap-3 sm:grid-cols-3">
        {DESIGN_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => set({ designTemplate: t.id })}
            className={
              "rounded-xl border p-4 text-left transition-colors hover:bg-secondary" +
              (form.designTemplate === t.id ? " border-transparent bg-brand-accent/10 ring-2 ring-brand-accent" : "")
            }
          >
            <div className="flex items-center justify-between">
              <p className="font-display font-black">{t.name}</p>
              {form.designTemplate === t.id && <Check className="size-4 text-brand-accent-deep" />}
            </div>
            {/* Swatch strip: page / sidebar / card */}
            <div className="mt-2 flex h-10 overflow-hidden rounded-lg border">
              {t.swatches.map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
            {t.defaultDark && <Badge variant="outline" className="mt-2">Dark-first</Badge>}
          </button>
        ))}
      </div>

      {/* Portal copy */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Portal copy</p>
          <div className="flex items-center gap-2">
            {copySource && (
              <Badge variant="outline">{copySource === "azure-openai" ? "GPT-4o" : "Mock"}</Badge>
            )}
            <Button size="sm" variant="outline" disabled={aiBusy} onClick={generateCopy}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate with AI
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          <Field label="Portal name (sidebar chip)">
            <Input
              value={form.portalName}
              onChange={(e) => set({ portalName: e.target.value })}
              placeholder={form.name ? `${form.name} Tolls` : "Partner Tolls"}
            />
          </Field>
          <Field label="Tagline (sidebar identity bar)">
            <Input
              value={form.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
              placeholder="Every toll, one place."
            />
          </Field>
          <Field label="Welcome text (login & dashboard greeting)">
            <Input
              value={form.welcomeText}
              onChange={(e) => set({ welcomeText: e.target.value })}
              placeholder="Welcome to your tolling cockpit."
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
