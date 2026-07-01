import * as React from "react";
import { Building, User as UserIcon, Lock, Bell, Save, Palette } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/common/Field";
import { Separator } from "@/components/ui/separator";
import { useEntities } from "@/hooks/api";
import { useAppStore } from "@/app/store";
import { toast } from "sonner";

export default function AccountPage() {
  const { data: entities } = useEntities();
  const { theme, toggleTheme } = useAppStore();
  const entity = entities?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account & Settings"
        description="Manage your company entity, profile, security and preferences."
        badge={<SourceTag source="MyTolls" />}
      />

      <Tabs defaultValue="entity">
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
                <Field label="Company name"><Input defaultValue={entity?.name} /></Field>
                <Field label="Entity ID"><Input defaultValue={entity?.displayId} disabled /></Field>
                <Field label="VAT number"><Input defaultValue={entity?.vatNumber} /></Field>
                <Field label="Country"><Input defaultValue={entity?.country} /></Field>
                <Field label="Billing address" className="col-span-2"><Input defaultValue="Havenweg 12, 3011 Rotterdam, NL" /></Field>
              </div>
              <Button onClick={() => toast.success("Company details saved")}><Save /> Save changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>My profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name"><Input defaultValue="Aman MSTS" /></Field>
                <Field label="Email"><Input defaultValue="aman@nvd-transport.nl" /></Field>
                <Field label="Phone"><Input defaultValue="+31 6 1234 5678" /></Field>
                <Field label="Language"><Input defaultValue="English" /></Field>
              </div>
              <Button onClick={() => toast.success("Profile updated")}><Save /> Save profile</Button>
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
              <Field label="Current password"><Input type="password" /></Field>
              <Field label="New password"><Input type="password" /></Field>
              <Field label="Confirm new password"><Input type="password" /></Field>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
                </div>
                <Switch defaultChecked onCheckedChange={(v) => toast.success(v ? "2FA enabled" : "2FA disabled")} />
              </div>
              <Button onClick={() => toast.success("Password updated")}><Lock /> Update password</Button>
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
              <PrefRow icon={<Bell className="size-4" />} title="Email notifications" desc="Invoices, alerts and shipment updates." checked onChange={() => {}} />
              <Separator />
              <PrefRow icon={<Bell className="size-4" />} title="Weekly summary" desc="A digest of fleet activity every Monday." onChange={() => {}} />
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
