import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Truck,
  RadioTower,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  BadgeCheck,
  PartyPopper,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/common/Field";
import { useValidateVat } from "@/hooks/api";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "vehicles", label: "Vehicles", icon: Truck },
  { key: "devices", label: "Devices", icon: RadioTower },
  { key: "users", label: "Users", icon: UserPlus },
  { key: "review", label: "Review", icon: BadgeCheck },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const validateVat = useValidateVat();
  const [vatResult, setVatResult] = React.useState<{ valid: boolean; company: string | null; address: string | null } | null>(null);

  const [form, setForm] = React.useState({
    company: "",
    vat: "",
    country: "NL",
    vehicles: "12",
    devices: "8",
    adminEmail: "",
  });

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const runVat = async () => {
    const res = await validateVat.mutateAsync(form.vat);
    setVatResult(res);
    if (res.valid) {
      toast.success("VAT validated");
      if (res.company) setForm((f) => ({ ...f, company: res.company! }));
    } else {
      toast.error("VAT could not be validated");
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post("/api/onboarding/submit", form);
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-success/12 text-success">
                <PartyPopper className="size-8" />
              </div>
              <h2 className="text-xl font-bold">You're all set!</h2>
              <p className="text-muted-foreground">
                {form.company || "Your company"} is onboarded. Vehicles and devices are queued
                for activation, and an admin invite was sent to {form.adminEmail || "your admin"}.
              </p>
              <Button onClick={() => navigate("/")}>Go to dashboard</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Onboarding · Self-service"
        title="Guided Onboarding"
        description="Self-service registration with automated VAT & business validation."
        badge={<SourceTag source="Toll2.0" />}
      />

      {/* Stepper */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "grid size-10 place-items-center rounded-full border-2 transition-colors",
                  i < step && "border-success bg-success text-white",
                  i === step && "border-primary bg-primary text-white",
                  i > step && "border-border bg-card text-muted-foreground"
                )}
              >
                {i < step ? <CheckCircle2 className="size-5" /> : <s.icon className="size-5" />}
              </div>
              <span className={cn("text-xs font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-1 h-0.5 flex-1 rounded", i < step ? "bg-success" : "bg-border")} />
            )}
          </React.Fragment>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {step === 0 && (
                <>
                  <h3 className="font-semibold">Company registration</h3>
                  <Field label="VAT number" required hint="We validate against the EU VIES registry.">
                    <div className="flex gap-2">
                      <Input value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} placeholder="NL812345678B01" />
                      <Button variant="outline" onClick={runVat} disabled={validateVat.isPending || !form.vat}>
                        {validateVat.isPending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                        Validate
                      </Button>
                    </div>
                  </Field>
                  {vatResult?.valid && (
                    <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
                      <p className="flex items-center gap-1.5 font-medium text-success">
                        <CheckCircle2 className="size-4" /> Verified
                      </p>
                      <p className="text-muted-foreground">{vatResult.company} · {vatResult.address}</p>
                    </div>
                  )}
                  <Field label="Company name" required>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <h3 className="font-semibold">Vehicle upload</h3>
                  <p className="text-sm text-muted-foreground">
                    Import your fleet now, or add vehicles later. You can bulk-upload a CSV or extract from RC cards.
                  </p>
                  <Field label="Approx. number of vehicles">
                    <Input type="number" value={form.vehicles} onChange={(e) => setForm({ ...form, vehicles: e.target.value })} />
                  </Field>
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Drag a CSV here or continue and import from the Vehicles module.
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="font-semibold">OBU / device setup</h3>
                  <Field label="Devices to provision">
                    <Input type="number" value={form.devices} onChange={(e) => setForm({ ...form, devices: e.target.value })} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {["Satellic OBU", "Go-Box", "Telepass", "HU-GO OBU"].map((d) => (
                      <Badge key={d} variant="secondary">{d}</Badge>
                    ))}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h3 className="font-semibold">Create admin user</h3>
                  <Field label="Admin email" required>
                    <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
                  </Field>
                  <p className="text-sm text-muted-foreground">
                    This person will manage users, roles and permissions for the account.
                  </p>
                </>
              )}

              {step === 4 && (
                <>
                  <h3 className="font-semibold">Review & submit</h3>
                  <dl className="grid grid-cols-2 gap-3">
                    {[
                      ["Company", form.company || "—"],
                      ["VAT", form.vat || "—"],
                      ["Vehicles", form.vehicles],
                      ["Devices", form.devices],
                      ["Admin", form.adminEmail || "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg border bg-card p-3">
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                        <dd className="mt-0.5 truncate text-sm font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>Continue <ArrowRight /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Complete onboarding
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
