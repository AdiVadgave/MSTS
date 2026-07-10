import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { ArrowUpRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAppStore } from "./store";
import NotFoundPage from "@/features/misc/NotFoundPage";

/**
 * Partner Solution Studio — Shell/MSTS-internal whitelabel configuration.
 * Deliberately OUTSIDE the customer portal product: its own minimal shell
 * (no sidebar, no entity scope), entered from the login screen.
 */
export function StudioLayout() {
  const { user, mfaVerified, activeBrand, signOut } = useAppStore();
  const navigate = useNavigate();

  if (!user) return <Navigate to="/login" replace />;
  if (!mfaVerified) return <Navigate to="/mfa" replace />;
  // The studio is never part of a partner's whitelabeled solution.
  if (activeBrand) return <NotFoundPage />;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-shell-asphalt-line bg-shell-asphalt text-shell-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo className="h-5" />
          <span className="rounded bg-brand-accent px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-on-accent">
            Solution Studio
          </span>
          <span className="hidden text-[11px] text-[#9a9184] sm:block">
            Whitelabel tolling configuration · internal
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="text-shell-paper hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/")}
            >
              Open portal <ArrowUpRight className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-shell-paper hover:bg-white/10 hover:text-white"
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
        Solution Studio · <span className="font-semibold text-foreground">Shell MSTS</span> internal tool
      </footer>
    </div>
  );
}
