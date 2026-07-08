// ── Solution-builder AI assists ─────────────────────────────────
// Thin client over the /api/ai/* proxy endpoints. Every response is
// validated and clamped here: invalid AI output degrades to "no
// suggestion", never to a broken form.

import { api } from "@/lib/api";
import type { DesignTemplate, FeatureFlag, PartnerPackage } from "@/lib/types";
import { FEATURE_LABELS } from "@/lib/brand";

export type AiSource = "azure-openai" | "mock";

export interface BrandSuggestion {
  palette: string[];
  suggestedAccent: string | null;
  suggestedTemplate: DesignTemplate | null;
  rationale: string;
  source: AiSource;
}

export interface SolutionSuggestion {
  package: PartnerPackage;
  modules: FeatureFlag[];
  reasoning: { module: string; why: string }[];
  source: AiSource;
}

export interface CopySuggestion {
  portalName: string;
  tagline: string;
  welcomeText: string;
  source: AiSource;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const TEMPLATES: DesignTemplate[] = ["signage", "executive", "carbon"];
const PACKAGES: PartnerPackage[] = ["basic", "professional", "enterprise"];
const KNOWN_FLAGS = Object.keys(FEATURE_LABELS) as FeatureFlag[];

const sourceOf = (v: unknown): AiSource => (v === "azure-openai" ? "azure-openai" : "mock");
const cleanHex = (v: unknown): string | null =>
  typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : null;

export async function aiBrandFromLogo(imageDataUrl: string): Promise<BrandSuggestion> {
  const raw = await api.post<Record<string, unknown>>("/api/ai/brand-from-logo", {
    imageBase64: imageDataUrl,
  });
  const palette = (Array.isArray(raw.palette) ? raw.palette : [])
    .map(cleanHex)
    .filter((c): c is string => c !== null)
    .slice(0, 5);
  const template = TEMPLATES.includes(raw.suggestedTemplate as DesignTemplate)
    ? (raw.suggestedTemplate as DesignTemplate)
    : null;
  return {
    palette,
    suggestedAccent: cleanHex(raw.suggestedAccent) ?? palette[0] ?? null,
    suggestedTemplate: template,
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    source: sourceOf(raw.source),
  };
}

export async function aiRecommendSolution(description: string): Promise<SolutionSuggestion> {
  const raw = await api.post<Record<string, unknown>>("/api/ai/recommend-solution", {
    description,
  });
  const modules = (Array.isArray(raw.modules) ? raw.modules : []).filter(
    (m): m is FeatureFlag => KNOWN_FLAGS.includes(m as FeatureFlag)
  );
  return {
    package: PACKAGES.includes(raw.package as PartnerPackage)
      ? (raw.package as PartnerPackage)
      : "professional",
    modules,
    reasoning: (Array.isArray(raw.reasoning) ? raw.reasoning : [])
      .filter(
        (r): r is { module: string; why: string } =>
          !!r && typeof (r as { module?: unknown }).module === "string" &&
          typeof (r as { why?: unknown }).why === "string"
      )
      .slice(0, 14),
    source: sourceOf(raw.source),
  };
}

export async function aiPortalCopy(
  companyName: string,
  description?: string
): Promise<CopySuggestion> {
  const raw = await api.post<Record<string, unknown>>("/api/ai/portal-copy", {
    companyName,
    description,
  });
  const str = (v: unknown, max: number): string =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  return {
    portalName: str(raw.portalName, 40),
    tagline: str(raw.tagline, 80),
    welcomeText: str(raw.welcomeText, 140),
    source: sourceOf(raw.source),
  };
}
