import * as React from "react";
import {
  CalendarClock, Plus, Play, Pause, Trash2, Download, Loader2, Repeat,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useReports, useScheduledReports, useCreateSchedule, useUpdateSchedule,
  useRunSchedule, useDeleteSchedule, useRunReportData,
} from "@/hooks/api";
import { downloadCSV, downloadXLS, downloadTablePDF } from "@/lib/download";
import { formatDate } from "@/lib/utils";
import type { Cadence, ScheduledReport } from "@/lib/types";
import { toast } from "sonner";

const CADENCES: { value: Cadence; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function ScheduledReportsDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: reports } = useReports();
  const { data: schedules, isLoading } = useScheduledReports();
  const create = useCreateSchedule();
  const update = useUpdateSchedule();
  const run = useRunSchedule();
  const runData = useRunReportData();
  const del = useDeleteSchedule();

  const [reportId, setReportId] = React.useState("");
  const [format, setFormat] = React.useState("CSV");
  const [cadence, setCadence] = React.useState<Cadence>("monthly");
  const [busyRun, setBusyRun] = React.useState<string | null>(null);

  const selectedReport = reports?.find((r) => r.id === reportId) ?? reports?.[0];
  React.useEffect(() => {
    if (reports?.length && !reportId) {
      setReportId(reports[0].id);
      setFormat(reports[0].formats[0]);
    }
  }, [reports, reportId]);
  // keep format valid for the chosen report
  React.useEffect(() => {
    if (selectedReport && !selectedReport.formats.includes(format as never)) {
      setFormat(selectedReport.formats[0]);
    }
  }, [selectedReport, format]);

  const addSchedule = async () => {
    if (!selectedReport) return;
    await create.mutateAsync({
      reportId: selectedReport.id,
      reportName: selectedReport.name,
      format,
      cadence,
    });
    toast.success(`${selectedReport.name} scheduled ${cadence}`, {
      description: `Auto-exports as ${format}.`,
    });
  };

  // "Run now" — generate the real file immediately and stamp last-run.
  const runNow = async (s: ScheduledReport) => {
    setBusyRun(s.id);
    try {
      const res = await runData.mutateAsync({ id: s.reportId, format: s.format });
      const base = res.fileName.replace(/\.[^.]+$/, "");
      if (s.format === "CSV") downloadCSV(`${base}.csv`, res.columns, res.rows);
      else if (s.format === "XLSX") downloadXLS(`${base}.xls`, res.columns, res.rows);
      else downloadTablePDF(`${base}.pdf`, s.reportName, res.columns, res.rows);
      await run.mutateAsync(s.id);
      toast.success(`${s.reportName} generated`, { description: `${res.count.toLocaleString()} rows · ${s.format}` });
    } catch {
      toast.error("Couldn't generate the report. Try again.");
    } finally {
      setBusyRun(null);
    }
  };

  const toggle = (s: ScheduledReport) => {
    const status = s.status === "active" ? "paused" : "active";
    update.mutate({ id: s.id, status });
    toast.success(status === "active" ? "Schedule resumed" : "Schedule paused");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" /> Scheduled reports
          </DialogTitle>
          <DialogDescription>
            Automate a report to export on a recurring cadence. Run any schedule now to download it immediately.
          </DialogDescription>
        </DialogHeader>

        {/* New schedule */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-secondary/30 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <Field label="Report">
            <Select value={reportId} onValueChange={setReportId}>
              <SelectTrigger><SelectValue placeholder="Select report" /></SelectTrigger>
              <SelectContent>
                {reports?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Format">
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-[92px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {selectedReport?.formats.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cadence">
            <Select value={cadence} onValueChange={(v) => setCadence(v as Cadence)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CADENCES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button onClick={addSchedule} disabled={create.isPending || !selectedReport}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Schedule
            </Button>
          </div>
        </div>

        {/* Existing schedules */}
        <div className="max-h-[46vh] overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : !schedules?.length ? (
            <EmptyState icon={CalendarClock} title="No scheduled reports" description="Create one above to automate recurring exports." />
          ) : (
            <div className="divide-y rounded-xl border">
              {schedules.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Repeat className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.reportName}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {s.format} · {s.cadence} · next {formatDate(s.nextRunAt)} ·{" "}
                      {s.lastRunAt ? `last ${formatDate(s.lastRunAt)}` : "never run"}
                    </p>
                  </div>
                  <Badge variant={s.status === "active" ? "success" : "muted"} className="shrink-0">
                    {s.status === "active" ? "Active" : "Paused"}
                  </Badge>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => runNow(s)} disabled={busyRun === s.id}>
                      {busyRun === s.id ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                      Run now
                    </Button>
                    <Button variant="ghost" size="icon-sm" title={s.status === "active" ? "Pause" : "Resume"} onClick={() => toggle(s)}>
                      {s.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" title="Delete"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { del.mutate(s.id); toast.success("Schedule deleted"); }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
