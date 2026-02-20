import * as XLSX from "xlsx";
import JSZip from "jszip";
import { ParsedSheet } from "./excel-parser";

/** Maximum rows per Excel file (Dolibarr struggles with large files) */
export const MAX_ROWS_PER_FILE = 800;

export interface ColumnMapping {
  /** Index of the column in the base file to replace */
  baseColIndex: number;
  /** Index of the column in the source file to take values from */
  sourceColIndex: number;
}

export interface MergeOptions {
  /** Column index used as the matching key in the base file */
  baseKeyCol: number;
  /** Column index used as the matching key in the source file */
  sourceKeyCol: number;
  /** Column mappings: which source columns replace which base columns */
  mappings: ColumnMapping[];
}

export interface MergeResult {
  headers: string[];
  rows: string[][];
  /** Number of base rows that were matched and updated */
  matchedCount: number;
  /** Number of base rows with no match in the source */
  unmatchedCount: number;
  /** Total rows in output */
  totalRows: number;
  /** Refs from the base file that had no match */
  unmatchedRefs: string[];
}

/**
 * Merge two parsed Excel sheets. For each row in the base sheet,
 * look up the matching row in the source sheet (by key column value).
 * Replace mapped columns with source values. Unmatched rows keep originals.
 */
export function mergeSheets(
  base: ParsedSheet,
  source: ParsedSheet,
  options: MergeOptions,
): MergeResult {
  const { baseKeyCol, sourceKeyCol, mappings } = options;

  // Build a lookup map from source: normalized key → row
  const sourceMap = new Map<string, string[]>();
  for (const row of source.rows) {
    const key = normalizeKey(row[sourceKeyCol] ?? "");
    if (key) {
      // First occurrence wins (in case of duplicates)
      if (!sourceMap.has(key)) {
        sourceMap.set(key, row);
      }
    }
  }

  const mergedRows: string[][] = [];
  let matchedCount = 0;
  const unmatchedRefs: string[] = [];

  for (const baseRow of base.rows) {
    const key = normalizeKey(baseRow[baseKeyCol] ?? "");
    const sourceRow = key ? sourceMap.get(key) : undefined;

    if (sourceRow) {
      // Clone base row and replace mapped columns
      const merged = [...baseRow];
      for (const mapping of mappings) {
        const sourceValue = (sourceRow[mapping.sourceColIndex] ?? "").trim();
        // Only replace if the source value is non-empty; keep original otherwise
        if (sourceValue !== "") {
          merged[mapping.baseColIndex] =
            sourceRow[mapping.sourceColIndex] ?? "";
        }
      }
      mergedRows.push(merged);
      matchedCount++;
    } else {
      // Keep original row unchanged
      mergedRows.push([...baseRow]);
      if (key) unmatchedRefs.push(baseRow[baseKeyCol]);
    }
  }

  return {
    headers: base.headers,
    rows: mergedRows,
    matchedCount,
    unmatchedCount: base.rows.length - matchedCount,
    totalRows: mergedRows.length,
    unmatchedRefs,
  };
}

/**
 * Normalize a key value for matching: trim whitespace, lowercase.
 */
function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Detect if headers look like a Dolibarr import format.
 * Dolibarr headers typically contain "(p.xxx)" patterns.
 */
export function isDolibarrFormat(headers: string[]): boolean {
  return headers.some((h) => /\(p\.[a-z_]+\)/i.test(h));
}

export interface GenerateResult {
  buffer: Uint8Array;
  isZip: boolean;
  fileCount: number;
}

/**
 * Generate Excel output from the merge result.
 * If the base file has Dolibarr headers and exceeds MAX_ROWS_PER_FILE,
 * splits into multiple Excel files inside a ZIP.
 */
export async function generateExcel(
  result: MergeResult,
): Promise<GenerateResult> {
  const needsSplit =
    isDolibarrFormat(result.headers) && result.rows.length > MAX_ROWS_PER_FILE;

  if (!needsSplit) {
    const wsData = [result.headers, ...result.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fusion");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    return { buffer: new Uint8Array(buffer), isZip: false, fileCount: 1 };
  }

  // Split into chunks and create ZIP
  const chunks: string[][][] = [];
  for (let i = 0; i < result.rows.length; i += MAX_ROWS_PER_FILE) {
    chunks.push(result.rows.slice(i, i + MAX_ROWS_PER_FILE));
  }

  const zip = new JSZip();
  for (let i = 0; i < chunks.length; i++) {
    const wsData = [result.headers, ...chunks[i]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fusion");
    const excelBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    zip.file(`fusion_${i + 1}.xlsx`, excelBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });
  return { buffer: zipBuffer, isZip: true, fileCount: chunks.length };
}
