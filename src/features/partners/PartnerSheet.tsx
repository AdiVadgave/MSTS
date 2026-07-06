import * as React from "react";
import { Loader2, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { useCreatePartner, useUpdatePartner, useEntities, usePartners } from "@/hooks/api";
import { PACKAGE_FEATURES, FEATURE_LABELS, monogram, onAccentHex, slugify } from "@/lib/brand";
import type { FeatureFlag, Partner, PartnerPackage, PartnerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SWATCHES = ["#2F7D4F", "#1B5FAA", "#7C3AED", "#C2410C", "#0F766E", "#BE185D", "#B45309", "#334155"];

const MAX_LOGO_BYTES = 200 * 1024;

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

interface FormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  logoDataUrl?: string;
  accentColor: string;
  package: PartnerPackage;
  features: FeatureFlag[];
  status: PartnerStatus;
  entityIds: string[];
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  accentColor: SWATCHES[1],
  package: "basic",
  features: PACKAGE_FEATURES.basic,
  status: "active",
  entityIds: [],
};

export function PartnerSheet({
  open,
  onOpenChange,
  partner,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partner: Partner | null;
}) {
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const { data: entities } = useEntities();
  const { data: partners } = usePartners();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // (Re)hydrate whenever the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    setForm(
      partner
        ? {
            name: partner.name,
            slug: partner.slug,
            slugTouched: true,
            logoDataUrl: partner.logoDataUrl,
            accentColor: partner.accentColor,
            package: partner.package,
            features: partner.features,
            status: partner.status,
            entityIds: partner.entityIds,
          }
        : EMPTY
    );
  }, [open, partner]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

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

  const pickPackage = (pkg: PartnerPackage) =>
    // Selecting a tier resets flags to its defaults; checkboxes below
    // then allow per-deal overrides.
    set({ package: pkg, features: PACKAGE_FEATURES[pkg] });

  const toggleFeature = (flag: FeatureFlag) =>
    set({
      features: form.features.includes(flag)
        ? form.features.filter((f) => f !== flag)
        : [...form.features, flag],
    });

  const toggleEntity = (id: string) =>
    set({
      entityIds: form.entityIds.includes(id)
        ? form.entityIds.filter((e) => e !== id)
        : [...form.entityIds, id],
    });

  /** The partner currently owning an entity (other than the one being edited). */
  const ownerOf = (entityId: string): Partner | undefined =>
    partners?.find((p) => p.id !== partner?.id && p.entityIds.includes(entityId));

  const busy = create.isPending || update.isPending;

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Partner name is required");
    if (!form.slug.trim()) return toast.error("Slug is required");
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      logoDataUrl: form.logoDataUrl ?? "",
      accentColor: form.accentColor,
      package: form.package,
      features: form.features,
      status: form.status,
      entityIds: form.entityIds,
    };
    try {
      if (partner) {
        await update.mutateAsync({ id: partner.id, ...body });
        toast.success(`${form.name} updated`);
      } else {
        await create.mutateAsync(body);
        toast.success(`${form.name} created`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save partner");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{partner ? `Edit ${partner.name}` : "New whitelabel partner"}</SheetTitle>
          <SheetDescription>
            Branding, package and customer tenants for this reseller.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="branding" className="mt-4 flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="branding" className="flex-1">Branding</TabsTrigger>
            <TabsTrigger value="package" className="flex-1">Package</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1">Customers</TabsTrigger>
          </TabsList>

          {/* ── Branding ── */}
          <TabsContent value="branding" className="space-y-4 pt-4">
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
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload /> Upload
                </Button>
                {form.logoDataUrl && (
                  <Button variant="ghost" size="sm" onClick={() => set({ logoDataUrl: undefined })}>
                    <X /> Remove
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Without a logo the portal shows a monogram in the accent color.
              </p>
            </Field>
            <Field label="Accent color">
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ accentColor: c })}
                    className={cn(
                      "size-8 rounded-md ring-offset-2 transition-transform hover:scale-110",
                      form.accentColor === c && "ring-2 ring-foreground"
                    )}
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
            {/* Live mini-preview */}
            <div className="rounded-xl border bg-shell-asphalt p-4">
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
                Preview
              </p>
              <div className="flex items-center gap-2.5">
                {form.logoDataUrl ? (
                  <img src={form.logoDataUrl} alt="" className="h-7 max-w-28 object-contain" />
                ) : (
                  <span
                    className="grid size-7 place-items-center rounded-md font-display text-sm font-black"
                    style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
                  >
                    {form.name ? monogram(form.name) : "?"}
                  </span>
                )}
                <span className="font-display font-black text-white">{form.name || "Partner name"}</span>
              </div>
              <div
                className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ background: `${form.accentColor}26`, color: "#fff", boxShadow: `inset 0 0 0 1px ${form.accentColor}66` }}
              >
                Active navigation item
              </div>
              <button
                className="mt-2 rounded-lg px-4 py-2 font-display text-sm font-semibold"
                style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
              >
                Primary action
              </button>
            </div>
          </TabsContent>

          {/* ── Package ── */}
          <TabsContent value="package" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => pickPackage(pkg.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors hover:bg-secondary",
                    form.package === pkg.id && "border-transparent ring-2 ring-brand-accent bg-brand-accent/10"
                  )}
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
            <div>
              <p className="mb-2 text-sm font-semibold">
                Feature flags
                <span className="ml-2 font-normal text-muted-foreground">
                  ({form.features.length}/{Object.keys(FEATURE_LABELS).length} enabled — override per deal)
                </span>
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((flag) => (
                  <label key={flag} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
                    <Checkbox
                      checked={form.features.includes(flag)}
                      onCheckedChange={() => toggleFeature(flag)}
                    />
                    {FEATURE_LABELS[flag]}
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Customers ── */}
          <TabsContent value="customers" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Tenant isolation: this partner's portal only ever shows the
              customer entities assigned here. An entity can belong to one
              partner at a time — assigning it moves it.
            </p>
            {(entities ?? []).map((e) => {
              const owner = ownerOf(e.id);
              return (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  <Checkbox
                    checked={form.entityIds.includes(e.id)}
                    onCheckedChange={() => toggleEntity(e.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.displayId}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.name} · {e.vatNumber}
                      {owner && <span className="text-warning"> · currently with {owner.name}</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 -mx-6 mt-6 flex justify-end gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />} {partner ? "Save changes" : "Create partner"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
