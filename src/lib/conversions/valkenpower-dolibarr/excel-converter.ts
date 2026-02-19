import * as XLSX from "xlsx";
import JSZip from "jszip";
import { ValkenProduct, htmlToPlainText } from "./xml-parser";
import {
  Operation,
  applyOperation,
} from "@/lib/conversions/modification-refs/ref-modifier";

/** Maximum rows per Excel file (Dolibarr struggles with large files) */
export const MAX_ROWS_PER_FILE = 800;

export type DescriptionLang = "FR" | "EN" | "NL" | "DE";
export type WeightSource = "product" | "package";
export type DimensionUnit = "mm" | "cm" | "m";

export interface ConversionOptions {
  /** Language for title and description */
  descriptionLang: DescriptionLang;
  /** Use product weight or package weight */
  weightSource: WeightSource;
  /** TVA rate for Belgium */
  tvaRate: number;
  /** Base price type: HT (sans taxes) or TTC (avec taxes) */
  priceBaseType: "HT" | "TTC";
  /** fk_product_type: 0 = product, 1 = service */
  productType: 0 | 1;
  /** En vente */
  toSell: boolean;
  /** En achat */
  toBuy: boolean;
  /** Include barcode column */
  includeBarcode: boolean;
  /** Include weight column */
  includeWeight: boolean;
  /** Include dimensions (length/width/height) */
  includeDimensions: boolean;
  /** Include public URL (mainimage) */
  includeUrl: boolean;
  /** Include price_min (specialpriceEXVAT) */
  includePriceMin: boolean;
  /** Unit for dimensions in XML (Valkenpower uses mm) */
  dimensionSourceUnit: DimensionUnit;
  /** Optional operation to transform refs during conversion */
  refOperation?: Operation | null;
}

export const DEFAULT_OPTIONS: ConversionOptions = {
  descriptionLang: "FR",
  weightSource: "package",
  tvaRate: 21.0,
  priceBaseType: "HT",
  productType: 0,
  toSell: true,
  toBuy: true,
  includeBarcode: true,
  includeWeight: true,
  includeDimensions: false,
  includeUrl: true,
  includePriceMin: true,
  dimensionSourceUnit: "mm",
  refOperation: null,
};

interface ExcelColumn {
  header: string;
  getValue: (product: ValkenProduct, options: ConversionOptions) => string;
}

function getTitle(product: ValkenProduct, lang: DescriptionLang): string {
  switch (lang) {
    case "FR":
      return product.titleFR || product.titleEN || product.titleNL;
    case "EN":
      return product.titleEN || product.titleNL;
    case "NL":
      return product.titleNL;
    case "DE":
      return product.titleDE || product.titleEN || product.titleNL;
  }
}

function getDescription(product: ValkenProduct, lang: DescriptionLang): string {
  let raw: string;
  switch (lang) {
    case "FR":
      raw =
        product.descriptionFR || product.descriptionEN || product.descriptionNL;
      break;
    case "EN":
      raw = product.descriptionEN || product.descriptionNL;
      break;
    case "NL":
      raw = product.descriptionNL;
      break;
    case "DE":
      raw =
        product.descriptionDE || product.descriptionEN || product.descriptionNL;
      break;
  }
  return htmlToPlainText(raw);
}

function getWeight(product: ValkenProduct, source: WeightSource): number {
  if (source === "product" && product.prodWeight > 0) {
    return product.prodWeight;
  }
  return product.packWeight;
}

/** Convert mm to the Dolibarr weight_units scale value.
 * Dolibarr stores weight_units as a power of 10 scale:
 * -6 = mg, -3 = g, 0 = kg, 3 = tonne
 * We output "kg" as the unit label for the import.
 */
function formatWeight(weightKg: number): string {
  return weightKg > 0 ? weightKg.toString() : "";
}

/**
 * Dimensions from Valkenpower are in mm.
 * Dolibarr length_units uses scale: -3 = mm, -2 = cm, -1 = dm, 0 = m
 * We convert to mm and use "mm" label.
 */
function formatDimension(valueInMm: number): string {
  if (valueInMm <= 0) return "";
  return valueInMm.toString();
}

function buildColumns(options: ConversionOptions): ExcelColumn[] {
  const columns: ExcelColumn[] = [
    {
      header: "Réf.* (p.ref)",
      getValue: (p) =>
        options.refOperation
          ? applyOperation(p.model, options.refOperation)
          : p.model,
    },
    {
      header: "Libellé* (p.label)",
      getValue: (p) => getTitle(p, options.descriptionLang),
    },
    {
      header: "Type* (p.fk_product_type)",
      getValue: () => options.productType.toString(),
    },
    {
      header: "En vente* (p.tosell)",
      getValue: () => (options.toSell ? "1" : "0"),
    },
    {
      header: "En achat* (p.tobuy)",
      getValue: () => (options.toBuy ? "1" : "0"),
    },
    {
      header: "Description (p.description)",
      getValue: (p) => getDescription(p, options.descriptionLang),
    },
  ];

  if (options.includeUrl) {
    columns.push({
      header: "URL publique (p.url)",
      getValue: (p) => p.mainimage,
    });
  }

  if (options.includeWeight) {
    columns.push(
      {
        header: "Weight (p.weight)",
        getValue: (p) => formatWeight(getWeight(p, options.weightSource)),
      },
      {
        header: "Unité de poids (p.weight_units)",
        // Dolibarr import resolves via CUnits::fetch('','', $short_label, $unit_type)
        getValue: (p) => (getWeight(p, options.weightSource) > 0 ? "kg" : ""),
      },
    );
  }

  if (options.includeDimensions) {
    columns.push(
      {
        header: "Longueur (p.length)",
        getValue: (p) =>
          formatDimension(p.prodLength > 0 ? p.prodLength : p.packLength),
      },
      {
        header: "Unité de longueur (p.length_units)",
        // Dolibarr import resolves via CUnits::fetch('','', $short_label, $unit_type)
        getValue: (p) => (p.prodLength > 0 || p.packLength > 0 ? "mm" : ""),
      },
      {
        header: "Largeur (p.width)",
        getValue: (p) =>
          formatDimension(p.prodWidth > 0 ? p.prodWidth : p.packWidth),
      },
      {
        header: "Unité de largeur (p.width_units)",
        // Dolibarr import resolves via CUnits::fetch('','', $short_label, $unit_type)
        getValue: (p) => (p.prodWidth > 0 || p.packWidth > 0 ? "mm" : ""),
      },
      {
        header: "Hauteur (p.height)",
        getValue: (p) =>
          formatDimension(p.prodHeight > 0 ? p.prodHeight : p.packHeight),
      },
      {
        header: "Unité de hauteur (p.height_units)",
        // Dolibarr import resolves via CUnits::fetch('','', $short_label, $unit_type)
        getValue: (p) => (p.prodHeight > 0 || p.packHeight > 0 ? "mm" : ""),
      },
    );
  }

  // Price columns
  columns.push({
    header: "Prix de vente HT (p.price)",
    getValue: (p) => p.priceEXVAT || "",
  });

  if (options.includePriceMin) {
    columns.push({
      header: "Prix de vente min. (p.price_min)",
      getValue: (p) => p.specialpriceEXVAT || "",
    });
  }

  columns.push(
    {
      header: "Prix de vente TTC (p.price_ttc)",
      getValue: (p) => p.priceINVAT || "",
    },
    {
      header: "Taux TVA (p.tva_tx)",
      getValue: () => options.tvaRate.toFixed(1),
    },
    {
      header: "PriceBaseType (p.price_base_type)",
      getValue: () => options.priceBaseType,
    },
  );

  if (options.includeBarcode) {
    columns.push({
      header: "Code-barres (p.barcode)",
      getValue: (p) => p.barcode,
    });
  }

  return columns;
}

export interface ConversionResult {
  /** Output buffer (Excel or ZIP depending on isZip flag) */
  buffer: Uint8Array;
  /** True if the output is a ZIP containing multiple Excel files */
  isZip: boolean;
  /** Number of Excel files generated */
  fileCount: number;
  headers: string[];
  rows: string[][];
  totalProducts: number;
  warnings: ConversionWarning[];
}

export interface ConversionWarning {
  type:
    | "missing_barcode"
    | "missing_title"
    | "missing_price"
    | "duplicate_barcode"
    | "duplicate_ref";
  model: string;
  message: string;
}

export async function convertToExcel(
  products: ValkenProduct[],
  options: ConversionOptions,
): Promise<ConversionResult> {
  const columns = buildColumns(options);
  const warnings: ConversionWarning[] = [];

  const headers = columns.map((c) => c.header);

  // Track duplicates
  const seenBarcodes = new Map<string, string>();
  const seenRefs = new Map<string, number>();

  // Build data rows
  const rows: string[][] = [];
  for (const product of products) {
    const outputRef = options.refOperation
      ? applyOperation(product.model, options.refOperation)
      : product.model;

    // Validation warnings
    if (options.includeBarcode && !product.barcode) {
      warnings.push({
        type: "missing_barcode",
        model: product.model,
        message: `Pas de code-barres pour ${product.model}`,
      });
    }

    if (options.includeBarcode && product.barcode) {
      const existing = seenBarcodes.get(product.barcode);
      if (existing) {
        warnings.push({
          type: "duplicate_barcode",
          model: product.model,
          message: `Code-barres "${product.barcode}" dupliqué (déjà utilisé par ${existing})`,
        });
      } else {
        seenBarcodes.set(product.barcode, product.model);
      }
    }

    const refCount = (seenRefs.get(outputRef) ?? 0) + 1;
    seenRefs.set(outputRef, refCount);
    if (refCount > 1) {
      warnings.push({
        type: "duplicate_ref",
        model: product.model,
        message: `Référence "${outputRef}" dupliquée (occurrence #${refCount})`,
      });
    }

    const title = getTitle(product, options.descriptionLang);
    if (!title) {
      warnings.push({
        type: "missing_title",
        model: product.model,
        message: `Pas de titre en ${options.descriptionLang} pour ${product.model}`,
      });
    }

    if (!product.priceEXVAT && !product.priceINVAT) {
      warnings.push({
        type: "missing_price",
        model: product.model,
        message: `Pas de prix pour ${product.model}`,
      });
    }

    const row = columns.map((col) => col.getValue(product, options));
    rows.push(row);
  }

  // Single file case
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
      totalProducts: products.length,
      warnings,
    };
  }

  // Multiple files case: split into chunks and create ZIP
  const chunks: string[][][] = [];
  for (let i = 0; i < rows.length; i += MAX_ROWS_PER_FILE) {
    chunks.push(rows.slice(i, i + MAX_ROWS_PER_FILE));
  }

  const zip = new JSZip();
  const fileCount = chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    const wsData = [headers, ...chunks[i]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produits");
    const excelBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    zip.file(`produits_${i + 1}.xlsx`, excelBuffer);
  }

  // Generate ZIP synchronously using the internal generateInternalStream
  const zipBuffer = await zip.generateAsync({ type: "uint8array" });

  return {
    buffer: zipBuffer,
    isZip: true,
    fileCount,
    headers,
    rows,
    totalProducts: products.length,
    warnings,
  };
}
