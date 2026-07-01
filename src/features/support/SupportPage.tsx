import * as React from "react";
import {
  LifeBuoy,
  BookOpen,
  Download,
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  Globe2,
  Search,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/common/Field";
import { COUNTRIES } from "@/mocks/catalog";
import { toast } from "sonner";

const RESOURCES = [
  { icon: BookOpen, title: "Product help", desc: "Guides for MST Card, OBUs, vignettes & more." },
  { icon: Globe2, title: "Country tolls", desc: "Requirements & coverage by country." },
  { icon: Download, title: "User manuals", desc: "Download PDF manuals for every product." },
  { icon: MessageSquare, title: "Give feedback", desc: "Tell us how we can improve MSTS One." },
];

export default function SupportPage() {
  const [q, setQ] = React.useState("");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Help · Resources"
        title="Help Center"
        description="Product help, country tolls, manuals and support — all in one place."
        badge={<SourceTag source="Toll2.0" />}
      />

      {/* Hero search */}
      <Card className="relative overflow-hidden border-0 bg-shell-asphalt text-shell-paper">
        <div className="ruler-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#FBCE07_0_44px,transparent_44px_84px)]" />
        <CardContent className="relative flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-shell-yellow text-shell-ink">
            <LifeBuoy className="size-6" />
          </div>
          <h2 className="font-display text-2xl font-extrabold">How can we help?</h2>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search help articles…"
              className="bg-white pl-9 text-foreground"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RESOURCES.map((r) => (
          <Card key={r.title} className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <r.icon className="size-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Contact support</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Subject"><Input placeholder="Briefly describe your issue" /></Field>
              <Field label="Related product"><Input placeholder="e.g. Satellic OBU" /></Field>
            </div>
            <Field label="Message"><Textarea rows={4} placeholder="How can we help?" /></Field>
            <Button onClick={() => toast.success("Support ticket submitted — we'll reply within 1 business day")}>
              <MessageSquare /> Submit ticket
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Reach us</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> +31 70 3199 000</p>
            <p className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> support@mststolls.com</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" /> Rotterdam, NL</p>
            <p className="text-xs text-muted-foreground">Customer support 08:00–17:00 CET</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {COUNTRIES.slice(0, 8).map((c) => (
                <span key={c.code} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {c.code}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
