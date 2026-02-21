import * as XLSX from "xlsx";

export interface ParsedExcel {
  /** Sheet name used */
  sheetName: string;
  /** All sheet names in the workbook */
  sheetNames: string[];
  /** Row index (0-based) where headers were found */
  headerRow: number;
  /** Headers (column names) from the header row */
  headers: string[];
  /** Data rows as arrays of cell values */
  rows: (string | number | null)[][];
  /** Total rows parsed (excluding header) */
  totalRows: number;
}

export interface ParseOptions {
  /** Sheet name or index to use (defaults to first sheet) */
  sheet?: string | number;
  /** Row index (0-based) to use as header. If not set, auto-detect */
  headerRow?: number;
}

/**
 * Detects header row by finding the first row with multiple non-empty cells
 * that look like column names (not data starting with numbers, not addresses, etc.)
 */
function detectHeaderRow(
  sheet: XLSX.WorkSheet,
  maxRows: number = 20,
): number | null {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");

  for (let r = range.s.r; r <= Math.min(range.e.r, maxRows); r++) {
    let filledCells = 0;
    let totalCells = 0;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      totalCells++;

      if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
        filledCells++;
      }
    }

    // Consider it a header row if more than half the cells have values
    // and at least 2 cells are filled
    if (filledCells >= 2 && filledCells / totalCells > 0.4) {
      return r;
    }
  }

  return null;
}

/**
 * Parses an Excel file buffer and extracts headers and data rows
 */
export function parseExcel(
  buffer: ArrayBuffer,
  options: ParseOptions = {},
): ParsedExcel {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new Error("Le fichier Excel ne contient aucune feuille");
  }

  // Select sheet
  let sheetName: string;
  if (options.sheet === undefined) {
    sheetName = sheetNames[0];
  } else if (typeof options.sheet === "number") {
    if (options.sheet < 0 || options.sheet >= sheetNames.length) {
      throw new Error(`Feuille ${options.sheet} introuvable`);
    }
    sheetName = sheetNames[options.sheet];
  } else {
    if (!sheetNames.includes(options.sheet)) {
      throw new Error(`Feuille "${options.sheet}" introuvable`);
    }
    sheetName = options.sheet;
  }

  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");

  // Detect or use provided header row
  const headerRow = options.headerRow ?? detectHeaderRow(sheet);
  if (headerRow === null) {
    throw new Error(
      "Impossible de détecter la ligne d'en-tête. Veuillez la spécifier manuellement.",
    );
  }

  // Extract headers
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRow, c });
    const cell = sheet[addr];
    const value = cell?.v?.toString().trim() || `Colonne ${c + 1}`;
    headers.push(value);
  }

  // Extract data rows
  const rows: (string | number | null)[][] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const row: (string | number | null)[] = [];
    let hasValue = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];

      if (cell === undefined || cell.v === undefined || cell.v === null) {
        row.push(null);
      } else {
        hasValue = true;
        row.push(cell.v);
      }
    }

    // Skip completely empty rows
    if (hasValue) {
      rows.push(row);
    }
  }

  return {
    sheetName,
    sheetNames,
    headerRow,
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Extracts a single column from parsed Excel data
 */
export function getColumnValues(
  parsed: ParsedExcel,
  columnIndex: number,
): (string | number | null)[] {
  return parsed.rows.map((row) => row[columnIndex] ?? null);
}

/**
 * Gets column index by header name (case-insensitive)
 */
export function getColumnIndex(
  parsed: ParsedExcel,
  headerName: string,
): number | null {
  const lower = headerName.toLowerCase();
  const idx = parsed.headers.findIndex((h) => h.toLowerCase() === lower);
  return idx >= 0 ? idx : null;
}
