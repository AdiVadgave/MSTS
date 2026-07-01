import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAppStore } from "@/app/store";
import { PORTAL_LIST, type PortalDef } from "@/app/portals";
import { cn } from "@/lib/utils";

export default function PortalLauncher() {
  const navigate = useNavigate();
  const { user, mfaVerified, selectPortal, signOut } = useAppStore();

  // Guards.
  if (!user) return <Navigate to="/login" replace />;
  if (!mfaVerified) return <Navigate to="/mfa" replace />;

  const open = (p: PortalDef) => {
    selectPortal(p.id);
    navigate(p.home);
  };

  return (
    <div className="relative min-h-dvh bg-shell-asphalt px-6 py-10 text-shell-paper">
      <div className="ruler-bg pointer-events-none fixed inset-0 opacity-25" />

      <div className="relative mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Logo className="h-6" />
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs font-medium text-[#9a9184] transition-colors hover:text-shell-paper"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </header>

        <div className="mt-14 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-shell-yellow">
            Welcome back, {user.name.split(" ")[0]}
          </p>
          <h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">
            Choose your portal
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[#9a9184]">
            Three portals, one platform. Pick where you want to work — you can
            switch anytime from the top bar without signing in again.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {PORTAL_LIST.map((p, i) => (
            <motion.button
              key={p.id}
              onClick={() => open(p)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border border-shell-asphalt-line bg-gradient-to-b p-6 text-left ring-1 ring-inset transition-all hover:-translate-y-1 hover:shadow-[0_30px_60px_-24px_rgba(0,0,0,0.6)]",
                p.cardClass
              )}
            >
              <span
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: p.accent }}
              />
              <div
                className="grid size-12 place-items-center rounded-xl text-white"
                style={{ background: p.accent }}
              >
                <p.icon className="size-6" />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <h2 className="font-display text-xl font-black">{p.name}</h2>
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                    p.chipClass
                  )}
                >
                  Portal
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-shell-paper/90">
                {p.tagline}
              </p>
              <p className="mt-2 flex-1 text-sm text-[#9a9184]">{p.blurb}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-shell-paper/80"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-shell-yellow">
                Open portal
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
