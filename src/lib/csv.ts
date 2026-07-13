// ── CSV bulk-upload machinery ───────────────────────────────────
// Shared by the bulk-load dialogs (vehicles, hauliers): header-mapped,
// order-independent parsing with per-field validation schemas. The UI
// stays in each feature's dialog; this module is pure parsing.

export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  /** Header aliases accepted for this column (normalised, any order). */
  aliases: string[];
  /** Normalise a raw cell before it is validated / imported. */
  norm: (v: string) => string;
  /** → error message, or null when valid. */
  validate: (v: string) => string | null;
}

export const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Split one CSV line, honouring double-quoted cells and "" escapes. */
export function splitLine(line: string): string[] {
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

export interface ParseResult {
  rows: Record<string, string>[];
  mapped: Record<string, string | undefined>; // fieldKey → matched header label
  missing: FieldDef[]; // required columns not found in the header
  unrecognised: string[]; // header columns that matched no field
}

/** Parse a CSV against a field schema; columns map by header, any order. */
export function parseCsv(text: string, fields: FieldDef[]): ParseResult {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 1) return { rows: [], mapped: {}, missing: fields, unrecognised: [] };

  const headers = splitLine(lines[0]);
  const headerKeys = headers.map(normKey);

  // Map each field to a column index by matching header aliases (any order).
  const colIndex: Record<string, number> = {};
  const mapped: Record<string, string | undefined> = {};
  fields.forEach((f) => {
    const idx = headerKeys.findIndex((h) => f.aliases.includes(h));
    if (idx >= 0) {
      colIndex[f.key] = idx;
      mapped[f.key] = headers[idx];
    }
  });

  const matchedCols = new Set(Object.values(colIndex));
  const unrecognised = headers.filter((_, i) => !matchedCols.has(i)).filter(Boolean);
  const missing = fields.filter((f) => colIndex[f.key] === undefined);

  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    fields.forEach((f) => {
      const idx = colIndex[f.key];
      row[f.key] = idx === undefined ? "" : cells[idx] ?? "";
    });
    return row;
  });

  return { rows, mapped, missing, unrecognised };
}
