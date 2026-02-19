import * as XLSX from "xlsx";
import { PriceModificationResult } from "./price-modifier";

export function generateExcel(results: PriceModificationResult[]): Uint8Array {
  const headers = [
    "Réf.* (p.ref)",
    "Prix de vente HT (p.price)",
    "Prix de vente min. (p.price_min)",
    "Prix de vente TTC (p.price_ttc)",
    "Taux TVA (p.tva_tx)",
    "PriceBaseType (p.price_base_type)",
  ];
  const rows = results.map((r) => [
    r.ref,
    r.priceHT,
    r.priceMin,
    r.priceTTC,
    r.tvaRate,
    r.priceBaseType,
  ]);

  const wsData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modifications");

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buffer);
}
