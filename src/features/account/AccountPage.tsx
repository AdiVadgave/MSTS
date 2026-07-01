import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Building, User as UserIcon, Lock, Bell, Save, Palette, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/common/Field";
import { Separator } from "@/components/ui/separator";
import {
  useEntities,
  useUpdateEntity,
  useProfile,
  useUpdateProfile,
  useSettings,
  useUpdateSettings,
  useResetDemoData,
} from "@/hooks/api";
import { useAppStore } from "@/app/store";
import type { Entity } from "@/lib/types";
import { toast } from "sonner";

const TABS = ["entity", "profile", "security", "prefs"];

export default function AccountPage() {
  const { data: entities } = useEntities();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { theme, toggleTheme, entity: activeEntity, setEntity } = useAppStore();
  const updateEntity = useUpdateEntity();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const resetDemo = useResetDemoData();

  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab") ?? "") ? params.get("tab")! : "entity";

  // The entity being edited = the active one (fallback to first).
  const entity = entities?.find((e) => e.id === activeEntity?.id) ?? entities?.[0];

  // ── Controlled form state, synced when data arrives ──
  const [company, setCompany] = React.useState<Partial<Entity>>({});
  React.useEffect(() => { if (entity) setCompany(entity); }, [entity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [prof, setProf] = React.useState({ name: "", email: "", phone: "", language: "" });
  React.useEffect(() => { if (profile) setProf(profile); }, [profile]);

  const [pwd, setPwd] = React.useState({ current: "", next: "", confirm: "" });

  const saveCompany = async () => {
    if (!entity) return;
    if (!company.name?.trim()) return toast.error("Company name is required");
    const updated = await updateEntity.mutateAsync({ id: entity.id, ...company });
    setEntity(updated); // keep the top-bar switcher in sync
    toast.success("Company details saved");
  };

  const saveProfile = async () => {
    if (!prof.name.trim()) return toast.error("Name is required");
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(prof.email)) return toast.error("Enter a valid email address");
    await updateProfile.mutateAsync(prof);
    toast.success("Profile updated");
  };

  const changePassword = () => {
    if (pwd.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (pwd.next !== pwd.confirm) return toast.error("New passwords don't match");
    setPwd({ current: "", next: "", confirm: "" });
    toast.success("Password updated"); // simulated — no real auth backend
  };

  const doReset = async () => {
    if (!window.confirm("Reset all demo data to its original seeded state? This cannot be undone.")) return;
    await resetDemo.mutateAsync();
    toast.success("Demo data reset to defaults");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account & Settings"
        description="Manage your company entity, profile, security and preferences."
        badge={<SourceTag source="MyTolls" />}
      />

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="entity"><Building /> My Entity</TabsTrigger>
          <TabsTrigger value="profile"><UserIcon /> Profile</TabsTrigger>
          <TabsTrigger value="security"><Lock /> Security</TabsTrigger>
          <TabsTrigger value="prefs"><Bell /> Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="entity">
          <Card>
            <CardHeader>
              <CardTitle>Company details</CardTitle>
              <CardDescription>Legal entity registered with MSTS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company name">
                  <Input value={company.name ?? ""} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
                </Field>
                <Field label="Entity ID"><Input value={company.displayId ?? ""} disabled /></Field>
                <Field label="VAT number">
                  <Input value={company.vatNumber ?? ""} onChange={(e) => setCompany({ ...company, vatNumber: e.target.value })} />
                </Field>
                <Field label="Country">
                  <Input value={company.country ?? ""} onChange={(e) => setCompany({ ...company, country: e.target.value as Entity["country"] })} />
                </Field>
                <Field label="Billing address" className="col-span-2">
                  <Input value={company.billingAddress ?? ""} onChange={(e) => setCompany({ ...company, billingAddress: e.target.value })} />
                </Field>
              </div>
              <Button onClick={saveCompany} disabled={updateEntity.isPending}>
                {updateEntity.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>My profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name"><Input value={prof.name} onChange={(e) => setProf({ ...prof, name: e.target.value })} /></Field>
                <Field label="Email"><Input value={prof.email} onChange={(e) => setProf({ ...prof, email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={prof.phone} onChange={(e) => setProf({ ...prof, phone: e.target.value })} /></Field>
                <Field label="Language"><Input value={prof.language} onChange={(e) => setProf({ ...prof, language: e.target.value })} /></Field>
              </div>
              <Button onClick={saveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? <Loader2 className="animate-spin" /> : <Save />} Save profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Use a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md space-y-4">
              <Field label="Current password"><Input type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} /></Field>
              <Field label="New password"><Input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
              <Field label="Confirm new password"><Input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
                </div>
                <Switch
                  checked={settings?.twoFactor ?? false}
                  onCheckedChange={(v) => {
                    updateSettings.mutate({ twoFactor: v });
                    toast.success(v ? "2FA enabled" : "2FA disabled");
                  }}
                />
              </div>
              <Button onClick={changePassword}><Lock /> Update password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prefs">
          <Card>
            <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <PrefRow
                icon={<Palette className="size-4" />}
                title="Dark mode"
                desc="Switch between light and dark themes."
                checked={theme === "dark"}
                onChange={toggleTheme}
              />
              <Separator />
              <PrefRow
                icon={<Bell className="size-4" />}
                title="Email notifications"
                desc="Invoices, alerts and shipment updates."
                checked={settings?.emailNotifications ?? false}
                onChange={(v) => {
                  updateSettings.mutate({ emailNotifications: v });
                  toast.success(v ? "Email notifications on" : "Email notifications off");
                }}
              />
              <Separator />
              <PrefRow
                icon={<Bell className="size-4" />}
                title="Weekly summary"
                desc="A digest of fleet activity every Monday."
                checked={settings?.weeklySummary ?? false}
                onChange={(v) => {
                  updateSettings.mutate({ weeklySummary: v });
                  toast.success(v ? "Weekly summary on" : "Weekly summary off");
                }}
              />
            </CardContent>
          </Card>

          {/* Danger zone — reset demo data */}
          <Card className="mt-4 border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" /> Demo data
              </CardTitle>
              <CardDescription>
                Restore all vehicles, devices, transactions, invoices and settings to their
                original seeded state. Your local changes will be lost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={doReset} disabled={resetDemo.isPending}>
                {resetDemo.isPending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reset demo data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PrefRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
