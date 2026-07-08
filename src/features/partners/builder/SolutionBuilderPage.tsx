import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/app/store";
import { useCreatePartner, usePartners, useUpdatePartner } from "@/hooks/api";
import { slugify } from "@/lib/brand";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { useBuilderState } from "./useBuilderState";
import { PreviewRail } from "./PreviewRail";
import { StepBrand } from "./StepBrand";
import { StepFeatures } from "./StepFeatures";
import { StepDesign } from "./StepDesign";
import { StepReview } from "./StepReview";

const STEPS = [
  { id: "brand", label: "Company & Brand" },
  { id: "features", label: "Package & Features" },
  { id: "design", label: "Design" },
  { id: "review", label: "Review & Launch" },
] as const;

export default function SolutionBuilderPage() {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const { activeBrand } = useAppStore();
  const { data: partners } = usePartners();
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const partner = React.useMemo(
    () => partners?.find((p) => p.id === partnerId) ?? null,
    [partners, partnerId]
  );
  const { form, set } = useBuilderState(partner);
  const [step, setStep] = React.useState(0);

  // The builder is MSTS-internal — partners never see it.
  if (activeBrand) return <NotFoundPage />;
  // Deep link to an unknown partner id (after partners loaded).
  if (partnerId && partners && !partner) return <NotFoundPage />;

  const busy = create.isPending || update.isPending;

  const slugTaken = Boolean(
    partners?.some(
      (p) => p.id !== partner?.id && p.slug === slugify(form.slug)
    ) && form.slug.trim()
  );

  const stepValid =
    step !== 0 ||
    (form.name.trim().length > 0 && form.slug.trim().length > 0 && !slugTaken);

  const save = async (thenPreview: boolean) => {
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      logoDataUrl: form.logoDataUrl ?? "",
      accentColor: form.accentColor,
      designTemplate: form.designTemplate,
      portalName: form.portalName.trim(),
      tagline: form.tagline.trim(),
      welcomeText: form.welcomeText.trim(),
      package: form.package,
      features: form.features,
      status: form.status,
      entityIds: form.entityIds,
    };
    try {
      const saved = partner
        ? await update.mutateAsync({ id: partner.id, ...body })
        : await create.mutateAsync(body);
      toast.success(partner ? `${saved.name} updated` : `${saved.name} launched`);
      if (thenPreview) window.open(`/login?partner=${saved.slug}`, "_blank", "noopener");
      navigate("/studio");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the solution");
    }
  };

  const stepProps = { form, set, partner };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Solution Studio · Whitelabel"
        title={partner ? `Edit solution — ${partner.name}` : "New partner solution"}
        description="Configure the brand, the feature set and the design template this partner's portal ships with."
        actions={
          <Button variant="outline" onClick={() => navigate("/studio")}>
            <ArrowLeft /> Back to partners
          </Button>
        }
      />

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors " +
                (i === step
                  ? "border-transparent bg-brand-accent text-brand-on-accent"
                  : i < step
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    : "text-muted-foreground")
              }
            >
              <span className="grid size-5 place-items-center rounded-full border text-[11px] font-bold">
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-8">
        <div className="min-w-0 flex-1 space-y-6">
          {step === 0 && <StepBrand {...stepProps} />}
          {step === 1 && <StepFeatures {...stepProps} />}
          {step === 2 && <StepDesign {...stepProps} />}
          {step === 3 && <StepReview {...stepProps} />}

          {step === 0 && slugTaken && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              The domain slug &ldquo;{slugify(form.slug)}&rdquo; is already used by another
              partner — pick a different one.
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy} onClick={() => save(false)}>
                  {busy ? <Loader2 className="animate-spin" /> : <Check />} Save
                </Button>
                <Button disabled={busy} onClick={() => save(true)}>
                  {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
                  {partner ? "Save & preview" : "Create & preview portal"}
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <PreviewRail form={form} />
      </div>
    </div>
  );
}
