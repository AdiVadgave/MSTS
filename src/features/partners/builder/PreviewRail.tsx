import { monogram, onAccentHex, DESIGN_TEMPLATES } from "@/lib/brand";
import type { BuilderState } from "./useBuilderState";

/** Per-template preview surfaces (mirrors the CSS token blocks). */
const SURFACES: Record<
  BuilderState["designTemplate"],
  { page: string; sidebar: string; card: string; text: string; sidebarText: string; radius: number }
> = {
  signage: { page: "#FAF7F0", sidebar: "#161310", card: "#FDFCF9", text: "#1A1712", sidebarText: "#CFC9BE", radius: 10 },
  executive: { page: "#F5F6F8", sidebar: "#20293A", card: "#FFFFFF", text: "#161B26", sidebarText: "#C3CAD6", radius: 14 },
  carbon: { page: "#0E1113", sidebar: "#08090B", card: "#16191C", text: "#DFE3E6", sidebarText: "#AEB4B9", radius: 5 },
};

/** Live mini-portal rendered from the wizard state. */
export function PreviewRail({ form }: { form: BuilderState }) {
  const s = SURFACES[form.designTemplate];
  const on = onAccentHex(form.accentColor);
  const templateName =
    DESIGN_TEMPLATES.find((t) => t.id === form.designTemplate)?.name ?? "";
  const portalName = form.portalName.trim() || (form.name ? `${form.name} Tolls` : "Partner portal");

  return (
    <div className="sticky top-20 hidden w-72 shrink-0 xl:block">
      <p className="eyebrow mb-2">Live preview · {templateName}</p>
      <div
        className="overflow-hidden border shadow-card"
        style={{ background: s.page, borderRadius: s.radius + 4 }}
      >
        <div className="flex">
          {/* Sidebar */}
          <div className="w-24 shrink-0 space-y-2 p-2.5" style={{ background: s.sidebar }}>
            <div className="flex items-center gap-1.5">
              {form.logoDataUrl ? (
                <img src={form.logoDataUrl} alt="" className="h-4 max-w-16 object-contain" />
              ) : (
                <span
                  className="grid size-4 shrink-0 place-items-center rounded text-[7px] font-black"
                  style={{ background: form.accentColor, color: on }}
                >
                  {form.name ? monogram(form.name) : "?"}
                </span>
              )}
            </div>
            <p className="truncate text-[7px] font-bold uppercase tracking-wider" style={{ color: s.sidebarText }}>
              {portalName}
            </p>
            <div
              className="px-1.5 py-1 text-[8px] font-semibold text-white"
              style={{ background: `${form.accentColor}33`, borderRadius: s.radius / 2, boxShadow: `inset 0 0 0 1px ${form.accentColor}66` }}
            >
              Dashboard
            </div>
            {["Vehicles", "Reports", "Support"].map((m) => (
              <p key={m} className="px-1.5 text-[8px]" style={{ color: s.sidebarText }}>
                {m}
              </p>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 space-y-2 p-2.5">
            <p className="text-[9px] font-black" style={{ color: s.text }}>
              {form.tagline.trim() || "Fleet overview"}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-9 border p-1.5" style={{ background: s.card, borderRadius: s.radius / 2, borderColor: `${s.text}14` }}>
                  <div className="h-1.5 w-8 rounded-sm" style={{ background: form.accentColor }} />
                  <div className="mt-1 h-1 w-12 rounded-sm" style={{ background: `${s.text}22` }} />
                </div>
              ))}
            </div>
            <button
              className="w-full py-1 text-[8px] font-bold"
              style={{ background: form.accentColor, color: on, borderRadius: s.radius / 2 }}
            >
              Primary action
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Approximation — use "Preview portal" after saving for the real thing.
      </p>
    </div>
  );
}
