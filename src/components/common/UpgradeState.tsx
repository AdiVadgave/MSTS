import { Lock, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/app/store";

/** Shown when a whitelabel partner's package doesn't include a module. */
export function UpgradeState({ moduleName }: { moduleName: string }) {
  const { activeBrand } = useAppStore();
  const navigate = useNavigate();
  return (
    <div className="grid min-h-[60vh] place-items-center animate-fade-in">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-accent text-brand-on-accent">
          <Lock className="size-5" />
        </span>
        <p className="eyebrow mt-5">Package upgrade required</p>
        <h2 className="mt-1 font-display text-xl font-black">
          {moduleName} is not in your package
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeBrand
            ? `The ${activeBrand.package} package for ${activeBrand.name} doesn't include this module. Contact MSTS to upgrade your whitelabel plan.`
            : "This module is not available."}
        </p>
        <Button className="mt-5" onClick={() => navigate("/support")}>
          Contact MSTS <ArrowUpRight />
        </Button>
      </div>
    </div>
  );
}
