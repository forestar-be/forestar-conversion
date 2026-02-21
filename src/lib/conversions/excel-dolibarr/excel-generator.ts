import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  ColumnMapping,
  DOLIBARR_COLUMNS,
  DolibarrColumn,
  getMappedColumns,
} from "./column-mapper";
import { ParsedExcel } from "./excel-parser";
import {
  Operation,
  applyOperation,
} from "@/lib/conversions/modification-refs/ref-modifier";
import {
  PriceOperation,
  PriceTarget,
  applyPriceOperationToString,
  recomputePrice,
} from "@/lib/conversions/modification-prix/price-modifier";

/** Maximum rows per Excel file (Dolibarr struggles with large files) */
export const MAX_ROWS_PER_FILE = 800;

export interface ConversionOptions {
  /** TVA rate for price calculations */
  tvaRate: number;
  /** Base price type: HT or TTC */
  priceBaseType: "HT" | "TTC";
  /** Product type: 0 = product, 1 = service */
  productType: 0 | 1;
  /** En vente */
  toSell: boolean;
  /** En achat */
  toBuy: boolean;
  /** Optional operation to transform refs during conversion */
  refOperation?: Operation | null;
  /** Optional operation to transform prices during conversion */
  priceOperation?: PriceOperation | null;
  /** Which price to apply the price operation to */
  priceTarget?: PriceTarget;
}

export const DEFAULT_OPTIONS: ConversionOptions = {
  tvaRate: 21.0,
  priceBaseType: "HT",
  productType: 0,
  toSell: true,
  toBuy: true,
  refOperation: null,
  priceOperation: null,
  priceTarget: "HT",
};

export interface ConversionWarning {
  type:
    | "missing_ref"
    | "missing_label"
    | "missing_price"
    | "duplicate_ref"
    | "parse_error";
  row: number;
  message: string;
}

export interface ConversionResult {
  /** Output buffer (Excel or ZIP) */
  buffer: Uint8Array;
  /** True if output is ZIP with multiple files */
  isZip: boolean;
  /** Number of Excel files generated */
  fileCount: number;
  /** Headers in output */
  headers: string[];
  /** Output rows for preview */
  rows: string[][];
  /** Total products converted */
  totalProducts: number;
  /** Warnings generated during conversion */
  warnings: ConversionWarning[];
}

interface OutputColumn {
  column: DolibarrColumn;
  sourceIndex: number | null;
}

/**
 * Calculate TTC from HT or vice versa
 */
function calculatePriceFromHT(priceHT: string, tvaRate: number): string {
  if (!priceHT) return "";
  const ht = parseFloat(priceHT);
  if (isNaN(ht)) return "";
  return (ht * (1 + tvaRate / 100)).toFixed(2);
}

function calculatePriceFromTTC(priceTTC: string, tvaRate: number): string {
  if (!priceTTC) return "";
  const ttc = parseFloat(priceTTC);
  if (isNaN(ttc)) return "";
  return (ttc / (1 + tvaRate / 100)).toFixed(2);
}

/**
 * Convert parsed Excel to Dolibarr format
 */
export async function convertToDolibarr(
  parsed: ParsedExcel,
  mappings: ColumnMapping[],
  options: ConversionOptions,
): Promise<ConversionResult> {
  const warnings: ConversionWarning[] = [];
  const seenRefs = new Map<string, number>();

  // Determine which columns to include in output
  const mappedCols = getMappedColumns(mappings);
  const mappedIds = new Set(mappedCols.map((m) => m.column.id));

  // Build output columns: mapped columns + required columns with defaults
  const outputColumns: OutputColumn[] = [];

  // Add all Dolibarr columns in order, but only if mapped or has default
  for (const col of DOLIBARR_COLUMNS) {
    const mapped = mappedCols.find((m) => m.column.id === col.id);
    if (mapped) {
      outputColumns.push({
        column: col,
        sourceIndex: mapped.mapping.sourceIndex,
      });
    } else if (col.required && col.defaultValue !== undefined) {
      // Required with default value
      outputColumns.push({
        column: col,
        sourceIndex: null,
      });
    } else if (col.id === "tva_tx" && mappedIds.has("price")) {
      // Include TVA if price is mapped
      outputColumns.push({
        column: col,
        sourceIndex: null,
      });
    } else if (col.id === "price_base_type" && mappedIds.has("price")) {
      // Include price_base_type if price is mapped
      outputColumns.push({
        column: col,
        sourceIndex: null,
      });
    } else if (col.id === "weight_units" && mappedIds.has("weight")) {
      // Include weight_units if weight is mapped
      outputColumns.push({
        column: col,
        sourceIndex: null,
      });
    }
  }

  // Calculate TTC from HT or vice versa if only one is mapped
  const hasPriceHT = outputColumns.some((c) => c.column.id === "price");
  const hasPriceTTC = outputColumns.some((c) => c.column.id === "price_ttc");
  const needsCalculatedTTC = hasPriceHT && !hasPriceTTC;
  const needsCalculatedHT = hasPriceTTC && !hasPriceHT;

  // Add calculated TTC column if needed
  if (needsCalculatedTTC) {
    const ttcCol = DOLIBARR_COLUMNS.find((c) => c.id === "price_ttc")!;
    outputColumns.push({ column: ttcCol, sourceIndex: null });
  }
  if (needsCalculatedHT) {
    const htCol = DOLIBARR_COLUMNS.find((c) => c.id === "price")!;
    // Insert at correct position (before price_ttc)
    const ttcIdx = outputColumns.findIndex((c) => c.column.id === "price_ttc");
    outputColumns.splice(ttcIdx, 0, { column: htCol, sourceIndex: null });
  }

  const headers = outputColumns.map((c) => c.column.header);

  // Build data rows
  const rows: string[][] = [];
  const refColIdx = outputColumns.findIndex((c) => c.column.id === "ref");
  const priceHTIdx = outputColumns.findIndex((c) => c.column.id === "price");
  const priceTTCIdx = outputColumns.findIndex(
    (c) => c.column.id === "price_ttc",
  );

  for (let rowIdx = 0; rowIdx < parsed.rows.length; rowIdx++) {
    const sourceRow = parsed.rows[rowIdx];
    const outputRow: string[] = [];

    let priceHTValue = "";

    for (const { column, sourceIndex } of outputColumns) {
      let value = "";

      if (sourceIndex !== null) {
        const raw = sourceRow[sourceIndex];
        if (column.transform) {
          value = column.transform(raw);
        } else if (raw !== null && raw !== undefined) {
          value = String(raw).trim();
        }
      } else {
        // Use default value
        const def = column.defaultValue;
        if (typeof def === "function") {
          value = def(sourceRow);
        } else if (def !== undefined) {
          value = def;
        }

        // Handle calculated columns
        if (column.id === "tva_tx") {
          value = options.tvaRate.toFixed(1);
        } else if (column.id === "price_base_type") {
          value = options.priceBaseType;
        } else if (column.id === "fk_product_type") {
          value = options.productType.toString();
        } else if (column.id === "tosell") {
          value = options.toSell ? "1" : "0";
        } else if (column.id === "tobuy") {
          value = options.toBuy ? "1" : "0";
        }
      }

      // Apply ref operation
      if (column.id === "ref" && options.refOperation && value) {
        value = applyOperation(value, options.refOperation);
      }

      // Track HT price for TTC calculation
      if (column.id === "price") {
        priceHTValue = value;
      }

      outputRow.push(value);
    }

    // Apply price operation and calculate TTC/HT
    if (options.priceOperation) {
      const target = options.priceTarget ?? "HT";
      const tvaRateStr = options.tvaRate.toFixed(1);

      if (target === "HT" && priceHTIdx >= 0 && outputRow[priceHTIdx]) {
        // Apply to HT, recalculate TTC
        outputRow[priceHTIdx] = applyPriceOperationToString(
          outputRow[priceHTIdx],
          options.priceOperation,
        );
        if (priceTTCIdx >= 0) {
          outputRow[priceTTCIdx] =
            recomputePrice(outputRow[priceHTIdx], tvaRateStr, "toTTC") || "";
        }
      } else if (
        target === "TTC" &&
        priceTTCIdx >= 0 &&
        outputRow[priceTTCIdx]
      ) {
        // Apply to TTC, recalculate HT
        outputRow[priceTTCIdx] = applyPriceOperationToString(
          outputRow[priceTTCIdx],
          options.priceOperation,
        );
        if (priceHTIdx >= 0) {
          outputRow[priceHTIdx] =
            recomputePrice(outputRow[priceTTCIdx], tvaRateStr, "toHT") || "";
        }
      }
    } else {
      // No price operation: just calculate TTC from HT or vice versa
      if (needsCalculatedTTC && priceTTCIdx >= 0 && priceHTValue) {
        outputRow[priceTTCIdx] = calculatePriceFromHT(
          priceHTValue,
          options.tvaRate,
        );
      }
      if (needsCalculatedHT && priceHTIdx >= 0 && priceTTCIdx >= 0) {
        const ttcValue = outputRow[priceTTCIdx];
        outputRow[priceHTIdx] = calculatePriceFromTTC(
          ttcValue,
          options.tvaRate,
        );
      }
    }

    // Validate
    const ref = refColIdx >= 0 ? outputRow[refColIdx] : "";
    if (!ref) {
      warnings.push({
        type: "missing_ref",
        row: rowIdx + 1,
        message: `Ligne ${rowIdx + 1}: référence manquante`,
      });
    } else {
      const count = (seenRefs.get(ref) ?? 0) + 1;
      seenRefs.set(ref, count);
      if (count > 1) {
        warnings.push({
          type: "duplicate_ref",
          row: rowIdx + 1,
          message: `Ligne ${rowIdx + 1}: référence "${ref}" dupliquée (occurrence #${count})`,
        });
      }
    }

    const labelColIdx = outputColumns.findIndex((c) => c.column.id === "label");
    if (labelColIdx >= 0 && !outputRow[labelColIdx]) {
      warnings.push({
        type: "missing_label",
        row: rowIdx + 1,
        message: `Ligne ${rowIdx + 1}: libellé manquant`,
      });
    }

    rows.push(outputRow);
  }

  // Generate Excel file(s)
  if (rows.length <= MAX_ROWS_PER_FILE) {
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    const buffer = new Uint8Array(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }),
    );

    return {
      buffer,
      isZip: false,
      fileCount: 1,
      headers,
      rows,
      totalProducts: rows.length,
      warnings,
    };
  }

  // Split into multiple files
  const chunks: string[][][] = [];
  for (let i = 0; i < rows.length; i += MAX_ROWS_PER_FILE) {
    chunks.push(rows.slice(i, i + MAX_ROWS_PER_FILE));
  }

  const zip = new JSZip();
  for (let i = 0; i < chunks.length; i++) {
    const wsData = [headers, ...chunks[i]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    const excelBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    zip.file(`produits_${i + 1}.xlsx`, excelBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "uint8array" });

  return {
    buffer: zipBuffer,
    isZip: true,
    fileCount: chunks.length,
    headers,
    rows,
    totalProducts: rows.length,
    warnings,
  };
}
