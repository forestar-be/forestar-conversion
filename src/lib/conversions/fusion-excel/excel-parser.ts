import * as XLSX from "xlsx";
import JSZip from "jszip";

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

/**
 * Parse a single Excel buffer into headers + rows (all as strings).
 * If the workbook has multiple sheets, rows from all sheets with the same
 * header structure are concatenated.
 */
export function parseExcel(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  let headers: string[] = [];
  const allRows: string[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    if (raw.length < 2) continue;

    const sheetHeaders = (raw[0] as unknown[]).map((h) =>
      String(h ?? "").trim(),
    );

    if (headers.length === 0) {
      headers = sheetHeaders;
    } else if (sheetHeaders.join("|") !== headers.join("|")) {
      // Different header structure — skip this sheet
      continue;
    }

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const strRow = headers.map((_, ci) => String(row[ci] ?? "").trim());
      // Skip completely empty rows
      if (strRow.every((c) => c === "")) continue;
      allRows.push(strRow);
    }
  }

  return { headers, rows: allRows };
}

/**
 * Parse a ZIP containing Excel files. All .xlsx files are read and their
 * rows concatenated (assuming identical headers).
 */
export async function parseZip(buffer: ArrayBuffer): Promise<ParsedSheet> {
  const zip = await JSZip.loadAsync(buffer);
  const xlsxFiles = Object.keys(zip.files).filter(
    (name) => name.endsWith(".xlsx") && !name.startsWith("__MACOSX"),
  );

  let headers: string[] = [];
  const allRows: string[][] = [];

  for (const fileName of xlsxFiles) {
    const fileData = await zip.files[fileName].async("arraybuffer");
    const parsed = parseExcel(fileData);
    if (parsed.headers.length === 0) continue;

    if (headers.length === 0) {
      headers = parsed.headers;
    }
    allRows.push(...parsed.rows);
  }

  return { headers, rows: allRows };
}

/**
 * Parse either an Excel or ZIP file based on the file name.
 */
export async function parseFile(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<ParsedSheet> {
  if (fileName.endsWith(".zip")) {
    return parseZip(buffer);
  }
  return parseExcel(buffer);
}
