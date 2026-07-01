import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, LogIn, Mail, Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { useAppStore } from "@/app/store";
import { AuthShell, DEMO } from "./AuthShell";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, mfaVerified, login } = useAppStore();
  // Pre-filled with demo credentials so the prototype opens in one click.
  const [email, setEmail] = React.useState(DEMO.email);
  const [password, setPassword] = React.useState(DEMO.password);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Already signed in → skip ahead.
  if (user) return <Navigate to={mfaVerified ? "/launcher" : "/mfa"} replace />;

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

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your unified MSTS tolling cockpit."
      footer={
        <>Protected by two-factor authentication · MSTS One prototype</>
      }
    >
      {/* autoComplete off so the browser doesn't override/obscure the
          pre-filled, editable demo values with its own autofill. */}
      <form onSubmit={submit} className="space-y-4" autoComplete="off">
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
    </AuthShell>
  );
}
