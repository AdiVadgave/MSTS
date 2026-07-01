import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/app/store";
import { cn } from "@/lib/utils";
import { AuthShell, DEMO } from "./AuthShell";

const LEN = 6;

export default function MfaPage() {
  const navigate = useNavigate();
  const { user, mfaVerified, verifyMfa } = useAppStore();
  // Pre-filled with the demo code so the prototype flow is one click.
  const [digits, setDigits] = React.useState<string[]>(
    Array.from({ length: LEN }, (_, i) => DEMO.mfaCode[i] ?? "")
  );
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  // Guard: must have completed step 1; don't repeat if already verified.
  if (!user) return <Navigate to="/login" replace />;
  if (mfaVerified) return <Navigate to="/launcher" replace />;

  const code = digits.join("");

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    setError(null);
    if (!clean) {
      setDigits((d) => d.map((x, idx) => (idx === i ? "" : x)));
      return;
    }
    setDigits((d) => {
      const next = [...d];
      // Support pasting the whole code into one box.
      clean.split("").forEach((ch, k) => {
        if (i + k < LEN) next[i + k] = ch;
      });
      return next;
    });
    const nextIdx = Math.min(i + clean.length, LEN - 1);
    refs.current[nextIdx]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== LEN) {
      setError("Enter all 6 digits.");
      return;
    }
    if (code !== DEMO.mfaCode) {
      setError("Incorrect code. Try the demo code below.");
      setDigits(Array(LEN).fill(""));
      refs.current[0]?.focus();
      return;
    }
    setBusy(true);
    window.setTimeout(() => {
      verifyMfa();
      navigate("/launcher");
    }, 550);
  };

  return (
    <AuthShell
      title="Verify it's you"
      subtitle={`Enter the 6-digit code sent to ${user.email}.`}
      footer={<>Didn't get it? Codes arrive within a few seconds.</>}
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoFocus={i === 0}
              maxLength={LEN}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              className={cn(
                "h-12 w-full rounded-lg border bg-white text-center font-display text-xl font-bold text-foreground outline-none transition-colors",
                "border-shell-asphalt-line focus:border-shell-yellow focus:ring-2 focus:ring-shell-yellow/40",
                error && "border-destructive"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="rounded-md bg-destructive/15 px-3 py-2 text-xs font-medium text-red-200">
            {error}
          </p>
        )}

        <Button type="submit" variant="brand" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          Verify & continue
        </Button>

        <button
          type="button"
          onClick={() => toast.success(`Verification code re-sent to ${user.email}`)}
          className="w-full text-center text-xs font-medium text-[#9a9184] underline-offset-4 hover:text-shell-paper hover:underline"
        >
          Resend code
        </button>
      </form>
    </AuthShell>
  );
}
