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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { DateRangeDialog, type DateRangeValue } from "@/components/common/DateRangeDialog";
import { useReports, useRunReportData } from "@/hooks/api";
import { downloadCSV, downloadTablePDF, downloadXLS, downloadJSON } from "@/lib/download";
import { formatDate } from "@/lib/utils";
import type { ReportDef } from "@/lib/types";
import { toast } from "sonner";
import { ScheduledReportsDialog } from "./ScheduledReportsDialog";
import { featureEnabled, exportBrandOf } from "@/lib/brand";
import { useAppStore } from "@/app/store";

const CAT_ICON: Record<string, typeof FileText> = {
  Transactions: Receipt,
  Financial: Landmark,
  Fleet: Truck,
  Toll: BarChart3,
  Custom: Sparkles,
};

export default function ReportsPage() {
  const { activeBrand } = useAppStore();
  const exportBrand = exportBrandOf(activeBrand);
  const { data: reports, isLoading } = useReports();
  const run = useRunReportData();
  const [cat, setCat] = React.useState("all");
  const [runningId, setRunningId] = React.useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  // Report currently being configured in the parameters dialog.
  const [paramReport, setParamReport] = React.useState<ReportDef | null>(null);
  const [paramFormat, setParamFormat] = React.useState("CSV");

  const categories = ["all", "Transactions", "Financial", "Fleet", "Toll"];
  const filtered = reports?.filter((r) => cat === "all" || r.category === cat) ?? [];

  const doRun = async (r: ReportDef, format: string, range: DateRangeValue) => {
    setRunningId(r.id + format);
    try {
      // The chosen period is a REAL parameter: the backend bounds the
      // dataset to it (not just a filename stamp).
      const res = await run.mutateAsync({ id: r.id, format, from: range.from, to: range.to });
      const base = res.fileName.replace(/\.[^.]+$/, "");
      const stamped = `${base}_${range.from}_to_${range.to}`;
      const period = `${formatDate(range.from)} – ${formatDate(range.to)}`;
      // Produce a real file from the returned rows, stamped with the period.
      if (format === "CSV") downloadCSV(`${stamped}.csv`, res.columns, res.rows, exportBrand);
      else if (format === "XLSX") downloadXLS(`${stamped}.xls`, res.columns, res.rows);
      else if (format === "PDF")
        downloadTablePDF(`${stamped}.pdf`, r.name, res.columns, res.rows, `Period: ${period} · ${r.description}`, exportBrand);
      else downloadJSON(`${stamped}.json`, res.rows);
      toast.success(`${r.name} exported`, {
        description: `${period} · ${res.count.toLocaleString()} rows · ${format}`,
      });
    } catch {
      toast.error("Export failed. Please try again.");
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
          featureEnabled(activeBrand, "scheduled-reports") ? (
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              <CalendarClock /> Scheduled reports
            </Button>
          ) : undefined
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
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setParamReport(r);
                          setParamFormat(r.formats[0]);
                        }}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                        Run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <ScheduledReportsDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />

      <DateRangeDialog
        open={!!paramReport}
        onOpenChange={(v) => { if (!v) setParamReport(null); }}
        title="Report parameters"
        description={paramReport ? `Choose the reporting period for “${paramReport.name}”.` : undefined}
        confirmLabel="Run & export"
        confirmIcon={<Download className="size-4" />}
        busy={run.isPending}
        onConfirm={async (range) => {
          const r = paramReport;
          if (!r) return;
          await doRun(r, paramFormat, range);
          setParamReport(null);
        }}
      >
        <Field label="Format">
          <Select value={paramFormat} onValueChange={setParamFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {paramReport?.formats.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </DateRangeDialog>
    </div>
  );
}
