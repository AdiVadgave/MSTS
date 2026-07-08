import * as React from "react";
import type {
  DesignTemplate,
  FeatureFlag,
  Partner,
  PartnerPackage,
  PartnerStatus,
} from "@/lib/types";
import { PACKAGE_FEATURES } from "@/lib/brand";

export interface BuilderState {
  name: string;
  slug: string;
  slugTouched: boolean;
  logoDataUrl?: string;
  accentColor: string;
  package: PartnerPackage;
  features: FeatureFlag[];
  status: PartnerStatus;
  entityIds: string[];
  designTemplate: DesignTemplate;
  portalName: string;
  tagline: string;
  welcomeText: string;
  /** AI-assist input only — not a Partner field, never persisted. */
  businessDescription: string;
}

export interface StepProps {
  form: BuilderState;
  set: (patch: Partial<BuilderState>) => void;
  partner: Partner | null;
}

export const EMPTY_BUILDER: BuilderState = {
  name: "",
  slug: "",
  slugTouched: false,
  accentColor: "#1B5FAA",
  package: "basic",
  features: [...PACKAGE_FEATURES.basic],
  status: "active",
  entityIds: [],
  designTemplate: "signage",
  portalName: "",
  tagline: "",
  welcomeText: "",
  businessDescription: "",
};

function fromPartner(p: Partner): BuilderState {
  return {
    name: p.name,
    slug: p.slug,
    slugTouched: true,
    logoDataUrl: p.logoDataUrl,
    accentColor: p.accentColor,
    package: p.package,
    features: [...p.features],
    status: p.status,
    entityIds: [...p.entityIds],
    designTemplate: p.designTemplate,
    portalName: p.portalName ?? "",
    tagline: p.tagline ?? "",
    welcomeText: p.welcomeText ?? "",
    // Wizard-session-only — not persisted on Partner, always starts empty on edit.
    businessDescription: "",
  };
}

/** Single wizard form object; rehydrates when the edited partner changes. */
export function useBuilderState(partner: Partner | null) {
  const [form, setForm] = React.useState<BuilderState>(
    partner ? fromPartner(partner) : EMPTY_BUILDER
  );
  React.useEffect(() => {
    setForm(partner ? fromPartner(partner) : EMPTY_BUILDER);
  }, [partner]);
  const set = React.useCallback(
    (patch: Partial<BuilderState>) => setForm((f) => ({ ...f, ...patch })),
    []
  );
  return { form, set };
}
