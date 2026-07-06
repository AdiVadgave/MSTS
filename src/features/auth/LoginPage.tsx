import * as React from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, LogIn, Mail, Lock, Info, Globe2, ChevronDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { useAppStore } from "@/app/store";
import { AuthShell, DEMO } from "./AuthShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePartners } from "@/hooks/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, mfaVerified, login } = useAppStore();
  // Pre-filled with demo credentials so the prototype opens in one click.
  const [email, setEmail] = React.useState(DEMO.email);
  const [password, setPassword] = React.useState(DEMO.password);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [params, setParams] = useSearchParams();
  const { activeBrand, setActiveBrand } = useAppStore();
  const { data: partners } = usePartners();
  const slug = params.get("partner");
  const activePartners = React.useMemo(
    () => (partners ?? []).filter((p) => p.status === "active"),
    [partners]
  );
  // A slug that points at a missing/draft/suspended partner = dead domain.
  const unavailable = Boolean(slug && partners && !activePartners.some((p) => p.slug === slug));

  // Resolve the simulated partner domain → active brand.
  React.useEffect(() => {
    if (!partners) return;
    setActiveBrand(activePartners.find((p) => p.slug === slug) ?? null);
  }, [partners, activePartners, slug, setActiveBrand]);

  // Already signed in → skip ahead.
  if (user) return <Navigate to={mfaVerified ? "/" : "/mfa"} replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      email.trim().toLowerCase() !== DEMO.email ||
      password !== DEMO.password
    ) {
      setError("Invalid credentials. Use the demo login shown below.");
      return;
    }
    setBusy(true);
    // Small delay to feel like a real sign-in round-trip.
    window.setTimeout(() => {
      login({ name: DEMO.name, email: DEMO.email });
      navigate("/mfa");
    }, 550);
  };

  const domainBar = (
    <div className="mb-4 flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-white/80 transition-colors hover:bg-white/10">
            <Globe2 className="size-3.5" />
            {activeBrand ? `tolls.${activeBrand.slug}.com` : slug && unavailable ? `tolls.${slug}.com` : "portal.mststolls.eu"}
            <ChevronDown className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          <DropdownMenuLabel>Simulate partner domain</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setParams({})}>
            <span className="font-mono text-xs">portal.mststolls.eu</span>
            <span className="ml-auto text-xs text-muted-foreground">MSTS</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {activePartners.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => setParams({ partner: p.slug })}>
              <span className="font-mono text-xs">tolls.{p.slug}.com</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">{p.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <AuthShell
      title="Sign in"
      subtitle={
        activeBrand
          ? `Access your ${activeBrand.name} tolling account.`
          : "Access your unified MSTS tolling cockpit."
      }
      beforeCard={domainBar}
      footer={
        activeBrand ? (
          <>Powered by MSTS Tolls · whitelabel partner portal</>
        ) : (
          <>Protected by two-factor authentication · MSTS One prototype</>
        )
      }
    >
      {unavailable ? (
        <div className="space-y-4 text-center">
          <ShieldAlert className="mx-auto size-8 text-shell-paper/60" />
          <p className="text-sm font-semibold">This partner portal is unavailable</p>
          <p className="text-xs text-[#9a9184]">
            The portal at this address is inactive or does not exist. Contact
            your provider, or continue to the MSTS portal.
          </p>
          <Button variant="brand" className="w-full" onClick={() => setParams({})}>
            Go to MSTS sign-in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          {/* autoComplete off so the browser doesn't override/obscure the
              pre-filled, editable demo values with its own autofill. */}
          <Field label="Email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                autoFocus
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.eu"
                className="bg-white pl-9 text-shell-ink placeholder:text-slate-400"
              />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-white pl-9 text-shell-ink placeholder:text-slate-400"
              />
            </div>
          </Field>

          {error && (
            <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs font-medium text-red-200">
              {error}
            </p>
          )}

          <Button type="submit" variant="brand" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Sign in
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
