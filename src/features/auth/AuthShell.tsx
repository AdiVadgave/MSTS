import * as React from "react";
import { Logo } from "@/components/brand/Logo";

/** Shared branded frame for the login / MFA screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-shell-asphalt p-6 text-shell-paper">
      <div className="ruler-bg pointer-events-none fixed inset-0 opacity-30" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-7" />
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            One · Unified portal
          </span>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-shell-asphalt-line bg-shell-asphalt-2 p-8 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#FBCE07_0_44px,transparent_44px_84px)]" />
          <h1 className="font-display text-2xl font-black">{title}</h1>
          <p className="mt-1.5 text-sm text-[#9a9184]">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-4 text-center text-xs text-[#8f8778]">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Demo credentials — this prototype has no real auth backend. */
export const DEMO = {
  email: "demo@mstsone.eu",
  password: "msts1234",
  name: "Aman MSTS",
  mfaCode: "123456",
};
