import * as XLSX from "xlsx";
import JSZip from "jszip";

/**
 * Parse refs from a newline-separated text (e.g. pasted from Excel column).
 * Filters out empty lines.
 */
export function parseRefsFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Find the ref column in an Excel sheet by looking for known header patterns.
 * Returns the column index (0-based) or -1 if not found.
 */
function findRefColumnIndex(headers: unknown[]): number {
  const patterns = [
    /^réf/i,
    /^ref/i,
    /\(p\.ref\)/i,
    /^référence/i,
    /^reference/i,
  ];

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? "").trim();
    if (patterns.some((p) => p.test(header))) return i;
  }
  return -1;
}

/**
 * Extract refs from a single Excel workbook buffer.
 */
export function parseRefsFromExcel(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const refs: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    if (rows.length < 2) continue;

    const headerRow = rows[0] as unknown[];
    const colIndex = findRefColumnIndex(headerRow);
    if (colIndex === -1) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const val = String(row[colIndex] ?? "").trim();
      if (val.length > 0) refs.push(val);
    }
  }

  return refs;
}

/**
 * Extract refs from a ZIP file containing Excel files (e.g. valkenpower-dolibarr export).
 */
export async function parseRefsFromZip(buffer: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const refs: string[] = [];

  const xlsxFiles = Object.keys(zip.files).filter((name) =>
    name.endsWith(".xlsx"),
  );

  for (const fileName of xlsxFiles) {
    const fileData = await zip.files[fileName].async("arraybuffer");
    const fileRefs = parseRefsFromExcel(fileData);
    refs.push(...fileRefs);
  }

  return refs;
}
