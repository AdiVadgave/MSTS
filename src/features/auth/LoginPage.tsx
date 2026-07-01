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
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
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
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.eu"
              className="bg-white pl-9 text-foreground"
            />
          </div>
        </Field>
        <Field label="Password">
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-white pl-9 text-foreground"
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

      <div className="mt-5 flex items-start gap-2 rounded-lg border border-shell-asphalt-line bg-shell-asphalt p-3 text-xs text-[#b7ae9f]">
        <Info className="mt-0.5 size-3.5 shrink-0 text-shell-yellow" />
        <span>
          Demo login — email <span className="font-mono text-shell-paper">{DEMO.email}</span>,
          password <span className="font-mono text-shell-paper">{DEMO.password}</span>.
        </span>
      </div>
    </AuthShell>
  );
}
