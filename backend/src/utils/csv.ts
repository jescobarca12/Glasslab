/** Serializa filas a CSV con escape RFC 4180 (comillas, comas, saltos de línea). */
type Cell = string | number | boolean | null | undefined;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // BOM para que Excel reconozca UTF-8 (acentos).
  return "﻿" + lines.join("\r\n") + "\r\n";
}
