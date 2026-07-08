import * as React from "react";
import { Sparkles, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/common/Field";
import { useEntities, usePartners } from "@/hooks/api";
import { slugify, monogram, onAccentHex } from "@/lib/brand";
import type { Partner, PartnerStatus } from "@/lib/types";
import { aiBrandFromLogo, type BrandSuggestion } from "./ai";
import type { StepProps } from "./useBuilderState";

const SWATCHES = ["#2F7D4F", "#1B5FAA", "#7C3AED", "#C2410C", "#0F766E", "#BE185D", "#B45309", "#334155"];
const MAX_LOGO_BYTES = 200 * 1024;

export function StepBrand({ form, set, partner }: StepProps) {
  const { data: entities } = useEntities();
  const { data: partners } = usePartners();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<BrandSuggestion | null>(null);

  const onName = (name: string) =>
    set({ name, ...(form.slugTouched ? {} : { slug: slugify(name) }) });

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_LOGO_BYTES) return toast.error("Logo must be 200 KB or smaller");
    const reader = new FileReader();
    reader.onload = () => set({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const analyseLogo = async () => {
    if (!form.logoDataUrl) return toast.error("Upload a logo first");
    setAiBusy(true);
    setSuggestion(null);
    try {
      setSuggestion(await aiBrandFromLogo(form.logoDataUrl));
    } catch {
      toast.error("Brand analysis failed — pick the accent manually");
    } finally {
      setAiBusy(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    set({
      ...(suggestion.suggestedAccent ? { accentColor: suggestion.suggestedAccent } : {}),
      ...(suggestion.suggestedTemplate ? { designTemplate: suggestion.suggestedTemplate } : {}),
    });
    toast.success("Brand suggestion applied");
  };

  const ownerOf = (entityId: string): Partner | undefined =>
    partners?.find((p) => p.id !== partner?.id && p.entityIds.includes(entityId));

  const toggleEntity = (id: string) =>
    set({
      entityIds: form.entityIds.includes(id)
        ? form.entityIds.filter((e) => e !== id)
        : [...form.entityIds, id],
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="Partner name" required>
          <Input value={form.name} onChange={(e) => onName(e.target.value)} placeholder="Alpine Fleet Services" />
        </Field>
        <Field label="Simulated domain" required>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">tolls.</span>
            <Input
              value={form.slug}
              onChange={(e) => set({ slug: slugify(e.target.value), slugTouched: true })}
              placeholder="alpine"
              className="font-mono"
            />
            <span className="font-mono text-sm text-muted-foreground">.com</span>
          </div>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set({ status: v as PartnerStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active — portal reachable</SelectItem>
              <SelectItem value="draft">Draft — hidden from login</SelectItem>
              <SelectItem value="suspended">Suspended — portal blocked</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Customer entities (tenant isolation)">
          <div className="space-y-2">
            {(entities ?? []).map((e) => {
              const owner = ownerOf(e.id);
              return (
                <label key={e.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm hover:bg-secondary">
                  <Checkbox
                    checked={form.entityIds.includes(e.id)}
                    onCheckedChange={() => toggleEntity(e.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.displayId}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.name}
                      {owner && <span className="text-warning"> · currently with {owner.name}</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="space-y-4">
        <Field label="Logo (optional, ≤ 200 KB)">
          <div className="flex items-center gap-3">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt="logo" className="h-10 max-w-32 rounded-md border object-contain p-1" />
            ) : (
              <span
                className="grid size-10 place-items-center rounded-md font-display text-sm font-black"
                style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
              >
                {form.name ? monogram(form.name) : "?"}
              </span>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> Upload
            </Button>
            {form.logoDataUrl && (
              <Button variant="ghost" size="sm" onClick={() => { set({ logoDataUrl: undefined }); setSuggestion(null); }}>
                <X /> Remove
              </Button>
            )}
          </div>
        </Field>

        {/* AI brand analysis */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">AI brand analysis</p>
            <Button size="sm" variant="outline" disabled={aiBusy || !form.logoDataUrl} onClick={analyseLogo}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Extract brand from logo
            </Button>
          </div>
          {suggestion && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-1.5">
                {suggestion.palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => set({ accentColor: c })}
                    className="size-7 rounded-md ring-offset-1 transition-transform hover:scale-110"
                    style={{ background: c }}
                    aria-label={`Use ${c} as accent`}
                  />
                ))}
                <Badge className="ml-2">{suggestion.source === "azure-openai" ? "GPT-4o" : "Mock"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
              <Button size="sm" onClick={applySuggestion}>
                Apply accent{suggestion.suggestedTemplate ? " + template" : ""}
              </Button>
            </div>
          )}
        </div>

        <Field label="Accent color">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ accentColor: c })}
                className={
                  "size-8 rounded-md ring-offset-2 transition-transform hover:scale-110" +
                  (form.accentColor === c ? " ring-2 ring-foreground" : "")
                }
                style={{ background: c }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={form.accentColor}
              onChange={(e) => set({ accentColor: e.target.value })}
              className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5"
              aria-label="Custom accent color"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}
