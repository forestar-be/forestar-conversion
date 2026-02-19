import * as XLSX from "xlsx";
import { ModificationResult } from "./ref-modifier";

export function generateExcel(results: ModificationResult[]): Uint8Array {
  const headers = ["Ref", "Nouvelle Ref"];
  const rows = results.map((r) => [r.original, r.modified]);

  const wsData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(wsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Modifications");

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Uint8Array(buffer);
}
