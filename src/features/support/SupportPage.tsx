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
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/common/Field";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useCreateTicket, useTickets, useDomains } from "@/hooks/api";
import { PRODUCTS, COUNTRIES } from "@/mocks/catalog";
import { downloadTablePDF } from "@/lib/download";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type DialogKind = "product-help" | "country-tolls" | null;

export default function SupportPage() {
  const [q, setQ] = React.useState("");
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const { data: tickets } = useTickets();
  const { data: domains } = useDomains();
  const createTicket = useCreateTicket();

  const [form, setForm] = React.useState({ subject: "", product: "", message: "" });

  const RESOURCES = [
    {
      key: "product-help",
      icon: BookOpen,
      title: "Product help",
      desc: "Guides for MST Card, OBUs, vignettes & more.",
      action: () => setDialog("product-help"),
    },
    {
      key: "country-tolls",
      icon: Globe2,
      title: "Country tolls",
      desc: "Requirements & coverage by country.",
      action: () => setDialog("country-tolls"),
    },
    {
      key: "manuals",
      icon: Download,
      title: "User manuals",
      desc: "Download a PDF manual index for every product.",
      action: () => {
        downloadTablePDF(
          "msts-one-product-manuals.pdf",
          "Product manuals",
          ["Product", "Category", "Countries", "Deposit (EUR)"],
          PRODUCTS.map((p) => ({
            Product: p.name,
            Category: p.category,
            Countries: p.countries.join(", "),
            "Deposit (EUR)": p.deposit,
          })),
          "MSTS Tolls One — product manual index"
        );
        toast.success("Manual index downloaded", { description: "msts-one-product-manuals.pdf" });
      },
    },
    {
      key: "feedback",
      icon: MessageSquare,
      title: "Give feedback",
      desc: "Tell us how we can improve MSTS Tolls One.",
      action: () => {
        document.getElementById("support-contact")?.scrollIntoView({ behavior: "smooth" });
        toast.info("Share your feedback below");
      },
    },
  ];

  const query = q.trim().toLowerCase();
  const resources = query
    ? RESOURCES.filter((r) => r.title.toLowerCase().includes(query) || r.desc.toLowerCase().includes(query))
    : RESOURCES;

  const submitTicket = async () => {
    if (!form.subject.trim()) return toast.error("Please add a subject");
    if (!form.message.trim()) return toast.error("Please describe your issue");
    const t = await createTicket.mutateAsync({
      subject: form.subject,
      product: form.product || "General",
      message: form.message,
    });
    setForm({ subject: "", product: "", message: "" });
    toast.success(`Ticket ${t.reference} submitted`, { description: "We'll reply within 1 business day." });
  };

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
        <div className="absolute inset-x-0 top-0 h-1 bg-signage-dash" />
        <CardContent className="relative flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid size-12 place-items-center rounded-xl bg-brand-accent text-brand-on-accent">
            <LifeBuoy className="size-6" />
          </div>
          <h2 className="font-display text-2xl font-extrabold">How can we help?</h2>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search help articles…"
              className="bg-white pl-9 text-shell-ink placeholder:text-slate-400"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {resources.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No help resources match “{q}”.
          </p>
        )}
        {resources.map((r) => (
          <Card
            key={r.key}
            role="button"
            tabIndex={0}
            onClick={r.action}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                r.action();
              }
            }}
            className="group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
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
        <Card id="support-contact" className="lg:col-span-2">
          <CardHeader><CardTitle>Contact support</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Subject">
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Briefly describe your issue"
                />
              </Field>
              <Field label="Related product">
                <Input
                  value={form.product}
                  onChange={(e) => setForm({ ...form, product: e.target.value })}
                  placeholder="e.g. Satellic OBU"
                />
              </Field>
            </div>
            <Field label="Message">
              <Textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="How can we help?"
              />
            </Field>
            <Button onClick={submitTicket} disabled={createTicket.isPending}>
              {createTicket.isPending ? <Loader2 className="animate-spin" /> : <MessageSquare />} Submit ticket
            </Button>

            {/* Persisted tickets */}
            {tickets && tickets.length > 0 && (
              <div className="mt-4 space-y-2 border-t pt-4">
                <p className="text-sm font-semibold">Your tickets</p>
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-2.5">
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.reference} · {t.product} · {formatDate(t.createdAt, true)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
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

      {/* Product help dialog */}
      <Dialog open={dialog === "product-help"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Product help</DialogTitle>
            <DialogDescription>Quick reference for every tolling product in your catalogue.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {PRODUCTS.map((p) => (
              <div key={p.code} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <Badge variant="secondary">{p.category}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Available in: {p.countries.join(", ")}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Country tolls dialog */}
      <Dialog open={dialog === "country-tolls"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Country toll coverage</DialogTitle>
            <DialogDescription>Toll schemes and technology per country.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {(domains ?? []).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.provider} · {d.tech} · {d.rate}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
