import { jsPDF } from "jspdf";
import type { ExportBrand } from "./brand";
import { hexToChannels } from "./brand";

/** [r,g,b] tuple for jsPDF color setters. */
function rgbOf(hex: string): [number, number, number] {
  const [r, g, b] = hexToChannels(hex).split(" ").map(Number);
  return [r, g, b];
}

/** jsPDF can embed PNG/JPEG only; other uploads fall back to name text. */
function pdfLogo(
  brand?: ExportBrand
): { dataUrl: string; format: "PNG" | "JPEG" } | null {
  const url = brand?.logoDataUrl;
  if (!url) return null;
  if (/^data:image\/png/i.test(url)) return { dataUrl: url, format: "PNG" };
  if (/^data:image\/jpe?g/i.test(url)) return { dataUrl: url, format: "JPEG" };
  return null;
}

/**
 * Document header, shared by all PDF exports.
 * - Partner with an embeddable logo → clean white header: the uploaded
 *   logo top-left (logos are designed for light grounds), title in ink.
 * - Partner without a raster logo → asphalt band with the partner name
 *   in its accent color.
 * - No brand (MSTS default) → asphalt band, "MSTS One" in Shell yellow.
 * All variants end with a 1.5pt accent rule under the band.
 */
function drawPdfHeader(
  doc: jsPDF,
  pageW: number,
  margin: number,
  bandH: number,
  title: string,
  brand?: ExportBrand
): void {
  const accent = brand ? rgbOf(brand.accentColor) : ([251, 206, 7] as [number, number, number]);
  const big = bandH >= 26;
  const baseline = big ? 16 : 14;

  const logo = pdfLogo(brand);
  if (logo) {
    try {
      const props = doc.getImageProperties(logo.dataUrl);
      const h = bandH - 9;
      const w = Math.min((props.width / props.height) * h, 64);
      doc.addImage(logo.dataUrl, logo.format, margin, 4.5, w, h);
      doc.setTextColor(26, 23, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(big ? 11 : 10);
      doc.text(title, pageW - margin, baseline, { align: "right" });
      doc.setFillColor(...accent);
      doc.rect(0, bandH, pageW, 1.5, "F");
      return;
    } catch {
      /* unreadable image data — fall through to the name-text header */
    }
  }

  doc.setFillColor(22, 19, 16); // asphalt
  doc.rect(0, 0, pageW, bandH, "F");
  doc.setFillColor(...accent);
  doc.rect(0, bandH, pageW, 1.5, "F");
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(big ? 16 : 14);
  doc.text(brand ? brand.name : "MSTS One", margin, baseline);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(big ? 11 : 10);
  doc.text(title, pageW - margin, baseline, { align: "right" });
}

/** Trigger a browser download for a Blob. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Row = Record<string, unknown>;

function toCells(columns: string[], rows: Row[]): string[][] {
  return rows.map((r) => columns.map((c) => String(r[c] ?? "")));
}

/** Real CSV file from columns + rows. */
export function downloadCSV(filename: string, columns: string[], rows: Row[], brand?: ExportBrand) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ...(brand ? [`# ${brand.name} — tolling data export`] : []),
    columns.map(esc).join(","),
    ...toCells(columns, rows).map((cells) => cells.map(esc).join(",")),
  ];
  saveBlob(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), filename);
}

/** Real JSON file. */
export function downloadJSON(filename: string, data: unknown) {
  saveBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename
  );
}

/**
 * Excel-openable file. Emits an HTML table with the .xls extension — Excel
 * and LibreOffice open this natively as a real spreadsheet.
 */
export function downloadXLS(filename: string, columns: string[], rows: Row[]) {
  const head = `<tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const body = toCells(columns, rows)
    .map((cells) => `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`;
  saveBlob(new Blob([html], { type: "application/vnd.ms-excel" }), filename);
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Real, multi-page PDF table with an MSTS-branded header. */
export function downloadTablePDF(
  filename: string,
  title: string,
  columns: string[],
  rows: Row[],
  subtitle?: string,
  brand?: ExportBrand
) {
  const doc = new jsPDF({ orientation: columns.length > 6 ? "landscape" : "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Branded header (partner logo/name when licensed, else MSTS)
  drawPdfHeader(doc, pageW, margin, 22, title, brand);

  let y = 34;
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (subtitle) {
    doc.text(subtitle, margin, y);
    y += 6;
  }
  doc.text(`Generated ${new Date().toLocaleString("en-GB")} · ${rows.length} rows`, margin, y);
  y += 6;

  const usableW = pageW - margin * 2;
  const colW = usableW / columns.length;

  const drawHeader = () => {
    doc.setFillColor(241, 236, 224);
    doc.rect(margin, y, usableW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 23, 18);
    doc.setFontSize(8);
    columns.forEach((c, i) =>
      doc.text(String(c).slice(0, 18), margin + i * colW + 1.5, y + 5)
    );
    y += 7;
    doc.setFont("helvetica", "normal");
  };
  drawHeader();

  const cells = toCells(columns, rows);
  cells.forEach((row, idx) => {
    if (y > pageH - 14) {
      doc.addPage();
      y = 18;
      drawHeader();
    }
    if (idx % 2 === 1) {
      doc.setFillColor(250, 247, 240);
      doc.rect(margin, y, usableW, 6, "F");
    }
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    row.forEach((cell, i) =>
      doc.text(String(cell).slice(0, 22), margin + i * colW + 1.5, y + 4.2)
    );
    y += 6;
  });

  doc.save(filename);
}

/** A branded single-document PDF (e.g. an invoice or statement). */
export function downloadDocumentPDF(
  filename: string,
  opts: {
    title: string;
    meta: [string, string][];
    lineItems: { label: string; value: string }[];
    total?: { label: string; value: string };
    brand?: ExportBrand;
  }
) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;

  // Branded header (partner logo/name when licensed, else MSTS)
  drawPdfHeader(doc, pageW, margin, 26, opts.title, opts.brand);

  let y = 38;
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  opts.meta.forEach(([k, v]) => {
    doc.text(`${k}:`, margin, y);
    doc.setTextColor(26, 23, 18);
    doc.text(v, margin + 40, y);
    doc.setTextColor(90, 90, 90);
    y += 6;
  });

  y += 4;
  doc.setDrawColor(26, 23, 18);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setFontSize(10);
  opts.lineItems.forEach((li) => {
    doc.setTextColor(40, 40, 40);
    doc.text(li.label, margin, y);
    doc.text(li.value, pageW - margin, y, { align: "right" });
    y += 7;
    doc.setDrawColor(230, 226, 218);
    doc.line(margin, y - 2.5, pageW - margin, y - 2.5);
  });

  if (opts.total) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(26, 23, 18);
    doc.text(opts.total.label, margin, y);
    doc.setTextColor(221, 29, 33); // shell red
    doc.text(opts.total.value, pageW - margin, y, { align: "right" });
  }

  doc.save(filename);
}
