import * as React from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { ArrowUpRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import zensarLogo from "@/assets/zensar-logo.svg";
import { Button } from "@/components/ui/button";
import { useAppStore } from "./store";
import NotFoundPage from "@/features/misc/NotFoundPage";

/**
 * Partner Solution Studio — the whitelabel configuration tool, branded as
 * ZENSAR (the delivery partner), not Shell/MSTS: the studio is Zensar's
 * solution for operating whitelabel tolling portals. Deliberately OUTSIDE
 * the customer portal product: its own minimal shell (no sidebar, no entity
 * scope), entered from the login screen.
 */

/** Zensar studio accent (deep corporate blue) as HSL channels. */
const ZENSAR_BLUE = "208 82% 39%";

export function StudioLayout() {
  const { user, mfaVerified, activeBrand, signOut } = useAppStore();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (!mfaVerified) return <Navigate to="/mfa" replace />;
  // The studio is never part of a partner's whitelabeled solution.
  if (activeBrand) return <NotFoundPage />;

  return (
    <div
      className="flex min-h-dvh flex-col bg-background"
      // Studio-scoped identity: Zensar blue replaces the Shell-red action
      // color for everything rendered inside the studio shell.
      style={
        {
          "--primary": ZENSAR_BLUE,
          "--ring": ZENSAR_BLUE,
          "--primary-foreground": "0 0% 100%",
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <img
            src={zensarLogo}
            alt="Zensar Technologies"
            className="h-9 w-auto select-none"
            draggable={false}
          />
          <span className="rounded bg-[hsl(208_82%_39%)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
            Solution Studio
          </span>
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            Whitelabel tolling configuration
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Open portal <ArrowUpRight className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                signOut();
                toast.success("You've been signed out");
                navigate("/login");
              }}
            >
              <LogOut className="size-3.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Solution Studio · a <span className="font-semibold text-foreground">Zensar Technologies</span> solution
        — An RPG Company · internal tool
      </footer>
    </div>
  );
}
