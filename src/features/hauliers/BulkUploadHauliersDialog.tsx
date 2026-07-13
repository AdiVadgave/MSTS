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
import { useBulkHauliers } from "@/hooks/api";
import { parseCsv, type FieldDef } from "@/lib/csv";
import { COUNTRIES } from "@/mocks/catalog";
import type { Haulier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ── Column schema ────────────────────────────────────────────────────────
// Header aliases keep the columns order-independent and loosely named;
// every cell is validated and problems are flagged in red inline.

const COUNTRY_CODES: string[] = COUNTRIES.map((c) => c.code);

const FIELDS: FieldDef[] = [
  {
    key: "name",
    label: "Haulier",
    placeholder: "Van Dijk Transport",
    aliases: ["name", "haulier", "company", "companyname", "carrier"],
    norm: (v) => v.trim(),
    validate: (v) => {
      const s = v.trim();
      if (!s) return "Company name is required";
      if (s.length < 2) return "Name must be at least 2 characters";
      return null;
    },
  },
  {
    key: "vatNumber",
    label: "VAT number",
    placeholder: "NL812345678",
    aliases: ["vat", "vatnumber", "vatno", "vatid", "taxid", "btw"],
    norm: (v) => v.trim().toUpperCase().replace(/\s+/g, ""),
    validate: (v) => {
      const s = v.trim().toUpperCase().replace(/\s+/g, "");
      if (!s) return "VAT number is required";
      if (!/^[A-Z]{2}[A-Z0-9.\-]{6,14}$/.test(s))
        return "VAT must start with a 2-letter country code, e.g. NL812345678";
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
      if (!COUNTRY_CODES.includes(s))
        return `Unknown country — use one of ${COUNTRY_CODES.join(", ")}`;
      return null;
    },
  },
  {
    key: "contactEmail",
    label: "Contact email",
    placeholder: "ops@haulier.eu",
    aliases: ["email", "contactemail", "mail", "contact"],
    norm: (v) => v.trim().toLowerCase(),
    validate: (v) => {
      const s = v.trim();
      if (!s) return "Contact email is required";
      if (!/^\S+@\S+\.\S+$/.test(s)) return "Enter a valid email address";
      return null;
    },
  },
  {
    key: "contactPhone",
    label: "Phone (optional)",
    placeholder: "+31 10 123 4567",
    aliases: ["phone", "contactphone", "tel", "telephone", "mobile"],
    norm: (v) => v.trim(),
    validate: (v) => {
      const s = v.trim();
      if (!s) return null; // optional
      if (!/^[+0-9][0-9 ()\-./]{5,19}$/.test(s))
        return "Phone may contain digits, spaces and + ( ) - only";
      return null;
    },
  },
  {
    key: "fleetSize",
    label: "Fleet size",
    placeholder: "42",
    aliases: ["fleetsize", "fleet", "vehicles", "trucks", "size"],
    norm: (v) => v.trim(),
    validate: (v) => {
      const s = v.trim();
      if (!s) return "Fleet size is required";
      if (!/^\d+$/.test(s)) return "Fleet size must be a whole number";
      const n = Number(s);
      if (n < 1 || n > 5000) return "Fleet size must be between 1 and 5,000";
      return null;
    },
  },
];

// Canonical schema. Column order/names are flexible — the parser maps by
// header — but this mirrors the standard export the team uploads.
const SAMPLE = `name,vat,country,email,phone,fleetsize
Van Dijk Transport,NL812345678,NL,ops@vandijk.nl,+31 10 123 4567,42
Hansen Spedition,DE811223344,DE,dispatch@hansen-sped.de,+49 40 555 1212,88
Baltique Fret,FR76543210987,FR,contact@baltique-fret.fr,,17`;

export function BulkUploadHauliersDialog({ open, onOpenChange }: Props) {
  const [text, setText] = React.useState(SAMPLE);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const bulk = useBulkHauliers();

  const parsed = React.useMemo(() => parseCsv(text, FIELDS), [text]);

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
    const payload: Partial<Haulier>[] = validRows.map((r) => ({
      name: r.name.trim(),
      vatNumber: FIELDS[1].norm(r.vatNumber) as Haulier["vatNumber"],
      country: r.country.trim().toUpperCase() as Haulier["country"],
      contactEmail: r.contactEmail.trim().toLowerCase(),
      contactPhone: r.contactPhone.trim(),
      fleetSize: Number(r.fleetSize),
    }));
    const res = await bulk.mutateAsync(payload);
    toast.success(
      `${res.created} hauliers imported` +
        (invalidCount ? ` · ${invalidCount} invalid row${invalidCount === 1 ? "" : "s"} skipped` : "")
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Pinned header/footer with a single scrollable body — same pattern
          as the vehicles bulk dialog, viewport-safe on small screens. */}
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" /> Bulk load hauliers
          </DialogTitle>
          <DialogDescription>
            Upload or paste a CSV of carrier companies. Columns can be in{" "}
            <span className="font-medium">any order</span> and loosely named — the parser maps
            them by header. Every field is validated; problems are flagged in red inline.
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
                {header && header.toLowerCase() !== f.key.toLowerCase() ? ` ← ${header}` : ""}
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

        {/* Editable, validated preview — thead sticks to the body scroll */}
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
              Import {validCount} haulier{validCount === 1 ? "" : "s"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
