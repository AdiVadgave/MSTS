import * as React from "react";
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBulkVehicles } from "@/hooks/api";
import type { Vehicle } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ── Column schema ────────────────────────────────────────────────────────
// Each field declares the header aliases it accepts (so the CSV columns can
// arrive in ANY order, or be named loosely) and a strict validity check.
// `norm` normalises a raw cell before it is validated / imported.
interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  aliases: string[];
  norm: (v: string) => string;
  validate: (v: string) => string | null; // → error message, or null when valid
}

const COUNTRIES = ["NL", "DE", "BE", "FR", "IT", "AT", "PL", "CZ", "HU", "BG", "ES"];
const TYPES = ["Truck", "Trailer", "Bus", "Van"];
const EURONORMS = ["EURO 3", "EURO 4", "EURO 5", "EURO 6"];

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const normEuronorm = (v: string) => {
  const digit = v.replace(/[^0-9]/g, "");
  return digit ? `EURO ${digit}` : v.trim().toUpperCase();
};
const normType = (v: string) => {
  const t = v.trim().toLowerCase();
  return TYPES.find((x) => x.toLowerCase() === t) ?? v.trim();
};

const FIELDS: FieldDef[] = [
  {
    key: "plate",
    label: "Plate",
    placeholder: "12-ABC-3",
    aliases: ["plate", "licenseplate", "numberplate", "registration", "reg", "kenteken"],
    norm: (v) => v.trim().toUpperCase(),
    validate: (v) => {
      const s = v.trim();
      if (!s) return "Plate is required";
      if (!/^[A-Z0-9]{1,4}[- ]?[A-Z0-9]{1,4}[- ]?[A-Z0-9]{0,4}$/i.test(s))
        return "Invalid plate — use 4–12 letters/digits, e.g. 12-ABC-3";
      return null;
    },
  },
  {
    key: "country",
    label: "Country",
    placeholder: "NL",
    aliases: ["country", "countrycode", "land", "cc"],
    norm: (v) => v.trim().toUpperCase(),
    validate: (v) => {
      const s = v.trim().toUpperCase();
      if (!s) return "Country is required";
      if (!COUNTRIES.includes(s)) return `Unknown country — use one of ${COUNTRIES.join(", ")}`;
      return null;
    },
  },
  {
    key: "type",
    label: "Type",
    placeholder: "Truck",
    aliases: ["type", "vehicletype", "category"],
    norm: normType,
    validate: (v) => {
      if (!v.trim()) return "Type is required";
      if (!TYPES.includes(normType(v))) return `Type must be one of ${TYPES.join(", ")}`;
      return null;
    },
  },
  {
    key: "euronorm",
    label: "Euronorm",
    placeholder: "EURO 6",
    aliases: ["euronorm", "euro", "euroclass", "emissionclass", "norm"],
    norm: normEuronorm,
    validate: (v) => {
      if (!v.trim()) return "Euronorm is required";
      if (!EURONORMS.includes(normEuronorm(v))) return "Euronorm must be EURO 3, 4, 5 or 6";
      return null;
    },
  },
  {
    key: "axles",
    label: "Axles",
    placeholder: "4",
    aliases: ["axles", "totalaxles", "numberofaxles", "axlecount"],
    norm: (v) => v.trim(),
    validate: (v) => {
      const s = v.trim();
      if (!s) return "Axles is required";
      if (!/^\d+$/.test(s)) return "Axles must be a whole number";
      const n = Number(s);
      if (n < 2 || n > 10) return "Axles must be between 2 and 10";
      return null;
    },
  },
  {
    key: "weight",
    label: "Weight (kg)",
    placeholder: "26000",
    aliases: ["weight", "totalweight", "totalweightkg", "grossweight", "gvw", "kg"],
    norm: (v) => v.trim(),
    validate: (v) => {
      const s = v.trim().replace(/[,\s]/g, "");
      if (!s) return "Weight is required";
      if (!/^\d+$/.test(s)) return "Weight must be a number in kilograms";
      const n = Number(s);
      if (n < 1000 || n > 60000) return "Weight must be 1,000–60,000 kg";
      return null;
    },
  },
];

// Canonical schema. Column order/names are flexible — the parser maps by
// header — but this mirrors the standard export the team uploads.
const SAMPLE = `plate,country,type,euronorm,axles,weight
12-ABC-3,NL,Truck,EURO 6,4,26000
B XY 4421,DE,Truck,EURO 5,5,40000
99-KLM-2,NL,Trailer,EURO 6,2,12000`;

// ── CSV parsing (schema-order independent) ─────────────────────────────────
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

interface ParseResult {
  rows: Record<string, string>[];
  mapped: Record<string, string | undefined>; // fieldKey → matched header label
  missing: FieldDef[]; // required columns not found in the header
  unrecognised: string[]; // header columns that matched no field
}

function parseCsv(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 1) return { rows: [], mapped: {}, missing: FIELDS, unrecognised: [] };

  const headers = splitLine(lines[0]);
  const headerKeys = headers.map(normKey);

  // Map each field to a column index by matching header aliases (any order).
  const colIndex: Record<string, number> = {};
  const mapped: Record<string, string | undefined> = {};
  FIELDS.forEach((f) => {
    const idx = headerKeys.findIndex((h) => f.aliases.includes(h));
    if (idx >= 0) {
      colIndex[f.key] = idx;
      mapped[f.key] = headers[idx];
    }
  });

  const matchedCols = new Set(Object.values(colIndex));
  const unrecognised = headers.filter((_, i) => !matchedCols.has(i)).filter(Boolean);
  const missing = FIELDS.filter((f) => colIndex[f.key] === undefined);

  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    FIELDS.forEach((f) => {
      const idx = colIndex[f.key];
      row[f.key] = idx === undefined ? "" : cells[idx] ?? "";
    });
    return row;
  });

  return { rows, mapped, missing, unrecognised };
}

export function BulkUploadDialog({ open, onOpenChange }: Props) {
  const [text, setText] = React.useState(SAMPLE);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const bulk = useBulkVehicles();

  const parsed = React.useMemo(() => parseCsv(text), [text]);

  // Re-seed the editable preview whenever the source CSV changes.
  React.useEffect(() => {
    setRows(parsed.rows);
  }, [parsed]);

  // Per-cell errors for the current (possibly edited) rows.
  const rowErrors = React.useMemo(
    () =>
      rows.map((row) => {
        const errs: Record<string, string | null> = {};
        FIELDS.forEach((f) => (errs[f.key] = f.validate(row[f.key] ?? "")));
        return errs;
      }),
    [rows]
  );

  const invalidCount = rowErrors.filter((e) => Object.values(e).some(Boolean)).length;
  const validCount = rows.length - invalidCount;

  const setCell = (rowIdx: number, key: string, value: string) =>
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));

  const readFile = (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    const validRows = rows.filter((_, i) => !Object.values(rowErrors[i]).some(Boolean));
    if (!validRows.length) {
      toast.error("No valid rows to import — fix the errors flagged in red.");
      return;
    }
    const payload: Partial<Vehicle>[] = validRows.map((r) => ({
      plate: FIELDS[0].norm(r.plate) as Vehicle["plate"],
      country: r.country.trim().toUpperCase() as Vehicle["country"],
      type: normType(r.type) as Vehicle["type"],
      euronorm: normEuronorm(r.euronorm) as Vehicle["euronorm"],
      totalAxles: Number(r.axles),
      totalWeightKg: Number(r.weight.replace(/[,\s]/g, "")),
    }));
    const res = await bulk.mutateAsync(payload);
    toast.success(
      `${res.created} vehicles queued for onboarding` +
        (invalidCount ? ` · ${invalidCount} invalid row${invalidCount === 1 ? "" : "s"} skipped` : "")
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Pinned header/footer with a single scrollable body: the dialog
          never grows past the viewport, so the action buttons stay visible
          on small screens. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" /> Bulk load / update vehicles
          </DialogTitle>
          <DialogDescription>
            Upload or paste a CSV. Columns can be in <span className="font-medium">any order</span> and
            loosely named — the parser maps them by header. Every field is validated; problems are
            flagged in red inline.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">

        {/* Upload CSV — always visible */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) readFile(file);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-muted/30 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <Upload className="size-8 text-primary" />
          <div>
            <p className="text-sm font-medium">
              {fileName ? `Loaded ${fileName}` : "Drag & drop a .csv file here"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Header row required · columns matched by name, order-independent
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
          >
            <Upload className="size-4" /> Upload CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Or paste CSV text */}
        <details className="group rounded-lg border bg-card">
          <summary className="flex cursor-pointer items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground marker:content-none hover:text-foreground">
            <ClipboardPaste className="size-3.5" /> or paste CSV text
          </summary>
          <div className="px-3 pb-3">
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName(null);
              }}
              rows={7}
              className="font-mono text-xs"
            />
          </div>
        </details>

        {/* Detected schema mapping */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Detected columns:</span>
          {FIELDS.map((f) => {
            const header = parsed.mapped[f.key];
            return (
              <span
                key={f.key}
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset",
                  header
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-red-50 text-red-700 ring-red-200"
                )}
                title={header ? `Mapped from "${header}"` : "Missing — no matching column"}
              >
                {f.label}
                {header && header.toLowerCase() !== f.key ? ` ← ${header}` : ""}
                {!header ? " (missing)" : ""}
              </span>
            );
          })}
        </div>
        {parsed.missing.length > 0 && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
            Missing required column{parsed.missing.length === 1 ? "" : "s"}:{" "}
            {parsed.missing.map((f) => f.label).join(", ")}. Add {parsed.missing.length === 1 ? "it" : "them"} to
            the header — cells below are flagged red until then.
          </p>
        )}
        {parsed.unrecognised.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Ignored column{parsed.unrecognised.length === 1 ? "" : "s"}: {parsed.unrecognised.join(", ")}
          </p>
        )}

        {/* Editable, validated preview — scrolls with the dialog body;
            the thead sticks to the top of that scroll area. */}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-muted-foreground">#</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-2 text-left font-semibold">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const errs = rowErrors[i];
                  const rowInvalid = Object.values(errs).some(Boolean);
                  return (
                    <tr key={i} className={cn("border-t align-top", rowInvalid && "bg-red-50/40")}>
                      <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                      {FIELDS.map((f) => {
                        const err = errs[f.key];
                        return (
                          <td key={f.key} className="px-2 py-2">
                            <Input
                              value={row[f.key] ?? ""}
                              placeholder={f.placeholder}
                              onChange={(e) => setCell(i, f.key, e.target.value)}
                              aria-invalid={!!err}
                              className={cn(
                                "h-8 text-xs",
                                err && "border-red-500 focus-visible:ring-red-500"
                              )}
                            />
                            {/* error flagged in red, right below the box */}
                            {err && (
                              <p className="mt-1 flex items-start gap-1 text-[11px] font-medium leading-tight text-red-600">
                                <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                {err}
                              </p>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        </div>

        {/* Pinned footer: validation summary + actions always in view */}
        <DialogFooter className="shrink-0 border-t pt-4 sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <CheckCircle2 className="size-4" /> {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="inline-flex items-center gap-1.5 font-medium text-red-600">
                <AlertTriangle className="size-4" /> {invalidCount} with errors (skipped)
              </span>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={bulk.isPending || validCount === 0}>
              {bulk.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Import {validCount} vehicle{validCount === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
