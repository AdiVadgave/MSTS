import * as React from "react";
import {
  BarChart3,
  FileText,
  Download,
  Loader2,
  CalendarClock,
  Truck,
  Landmark,
  Receipt,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { SourceTag } from "@/components/common/SourceTag";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useReports, useRunReport } from "@/hooks/api";
import type { ReportDef } from "@/lib/types";
import { toast } from "sonner";

const CAT_ICON: Record<string, typeof FileText> = {
  Transactions: Receipt,
  Financial: Landmark,
  Fleet: Truck,
  Toll: BarChart3,
  Custom: Sparkles,
};

export default function ReportsPage() {
  const { data: reports, isLoading } = useReports();
  const run = useRunReport();
  const [cat, setCat] = React.useState("all");
  const [runningId, setRunningId] = React.useState<string | null>(null);

  const categories = ["all", "Transactions", "Financial", "Fleet", "Toll"];
  const filtered = reports?.filter((r) => cat === "all" || r.category === cat) ?? [];

  const doRun = async (r: ReportDef, format: string) => {
    setRunningId(r.id + format);
    try {
      const res = await run.mutateAsync({ id: r.id, format });
      toast.success(`${r.name} ready`, {
        description: `${res.fileName} · ${res.rows.toLocaleString()} rows`,
      });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data · Reporting"
        title="Reports & Analytics"
        description="Standard, custom and scheduled reports. Export to CSV, PDF or Excel."
        badge={<SourceTag source="MyMST" />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              toast.info("No scheduled reports yet", {
                description: "Run a report and choose a cadence to schedule automatic exports.",
              })
            }
          >
            <CalendarClock /> Scheduled reports
          </Button>
        }
      />

      <Tabs value={cat} onValueChange={setCat}>
        <TabsList>
          {categories.map((c) => (
            <TabsTrigger key={c} value={c} className="capitalize">
              {c === "all" ? "All reports" : c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          : filtered.map((r) => {
              const Icon = CAT_ICON[r.category] ?? FileText;
              const busy = run.isPending && runningId?.startsWith(r.id);
              return (
                <Card key={r.id} className="flex h-full flex-col">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <Badge variant="secondary">{r.category}</Badge>
                    </div>
                    <h3 className="mt-3 font-semibold">{r.name}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.description}</p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <div className="flex gap-1">
                        {r.formats.map((f) => (
                          <span key={f} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {f}
                          </span>
                        ))}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                            Run
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {r.formats.map((f) => (
                            <DropdownMenuItem key={f} onClick={() => doRun(r, f)}>
                              <Download /> Export as {f}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>
    </div>
  );
}
