import * as React from "react";
import type { FeatureFlag } from "@/lib/types";
import { featureEnabled } from "@/lib/brand";
import { useAppStore } from "@/app/store";
import { brandModuleLabel } from "@/app/nav";
import { UpgradeState } from "./UpgradeState";

/** Route wrapper: renders the module only when the active brand's
 *  package includes it; otherwise a polished upgrade prompt. */
export function FeatureGate({
  feature,
  moduleName,
  children,
}: {
  feature: FeatureFlag;
  moduleName: string;
  children: React.ReactNode;
}) {
  const { activeBrand } = useAppStore();
  if (!featureEnabled(activeBrand, feature)) {
    return (
      <UpgradeState
        moduleName={activeBrand ? brandModuleLabel(feature) : moduleName}
      />
    );
  }
  return <>{children}</>;
}
