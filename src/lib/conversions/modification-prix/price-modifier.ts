export type PriceOperationType =
  | "increase-fixed"
  | "decrease-fixed"
  | "increase-percent"
  | "decrease-percent";

export interface IncreaseFixedOperation {
  type: "increase-fixed";
  amount: number;
}

export interface DecreaseFixedOperation {
  type: "decrease-fixed";
  amount: number;
}

export interface IncreasePercentOperation {
  type: "increase-percent";
  percent: number;
}

export interface DecreasePercentOperation {
  type: "decrease-percent";
  percent: number;
}

export type PriceOperation =
  | IncreaseFixedOperation
  | DecreaseFixedOperation
  | IncreasePercentOperation
  | DecreasePercentOperation;

/** Round to 2 decimal places (standard for prices). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Apply a price operation to a single price value.
 * Returns the new price rounded to 2 decimal places.
 * Negative results are clamped to 0.
 */
export function applyPriceOperation(
  price: number,
  operation: PriceOperation,
): number {
  let result: number;
  switch (operation.type) {
    case "increase-fixed":
      result = price + operation.amount;
      break;
    case "decrease-fixed":
      result = price - operation.amount;
      break;
    case "increase-percent":
      result = price * (1 + operation.percent / 100);
      break;
    case "decrease-percent":
      result = price * (1 - operation.percent / 100);
      break;
  }
  return round2(Math.max(0, result));
}

/**
 * Apply a price operation to a price string (as stored in Valkenpower data).
 * Returns the modified price as a string with 2 decimal places.
 * Returns empty string for empty/invalid input.
 */
export function applyPriceOperationToString(
  priceStr: string,
  operation: PriceOperation,
): string {
  if (!priceStr) return "";
  const price = parseFloat(priceStr);
  if (isNaN(price)) return priceStr;
  return applyPriceOperation(price, operation).toFixed(2);
}

export type PriceTarget = "HT" | "TTC";

export interface PriceRow {
  ref: string;
  priceHT: string;
  priceTTC: string;
  priceMin: string;
  tvaRate: string;
  priceBaseType: string;
}

export interface PriceModificationResult {
  ref: string;
  priceHT: string;
  priceTTC: string;
  priceMin: string;
  originalPriceHT: string;
  originalPriceTTC: string;
  originalPriceMin: string;
  tvaRate: string;
  priceBaseType: string;
  changed: boolean;
}

/**
 * Recalculate the counterpart price using TVA rate.
 * Returns empty string if input is empty/invalid or tvaRate is missing.
 */
export function recomputePrice(
  price: string,
  tvaRate: string,
  direction: "toTTC" | "toHT",
): string {
  if (!price) return "";
  if (!tvaRate) return "";
  const p = parseFloat(price);
  const tva = parseFloat(tvaRate);
  if (isNaN(p) || isNaN(tva)) return "";
  const factor = 1 + tva / 100;
  const result = direction === "toTTC" ? p * factor : p / factor;
  return round2(result).toFixed(2);
}

/**
 * Apply a price operation to a list of price rows.
 * Target "HT": modifies priceHT and priceMin, then recalculates priceTTC from newHT.
 * Target "TTC": modifies priceTTC, then recalculates priceHT from newTTC.
 */
export function applyToPrices(
  rows: PriceRow[],
  operation: PriceOperation,
  target: PriceTarget,
): PriceModificationResult[] {
  return rows.map((row) => {
    let newHT: string;
    let newTTC: string;
    let newMin: string;

    if (target === "HT") {
      newHT = applyPriceOperationToString(row.priceHT, operation);
      newMin = applyPriceOperationToString(row.priceMin, operation);
      newTTC = recomputePrice(newHT, row.tvaRate, "toTTC") || row.priceTTC;
    } else {
      newTTC = applyPriceOperationToString(row.priceTTC, operation);
      newHT = recomputePrice(newTTC, row.tvaRate, "toHT") || row.priceHT;
      newMin = row.priceMin;
    }

    return {
      ref: row.ref,
      priceHT: newHT,
      priceTTC: newTTC,
      priceMin: newMin,
      originalPriceHT: row.priceHT,
      originalPriceTTC: row.priceTTC,
      originalPriceMin: row.priceMin,
      tvaRate: row.tvaRate,
      priceBaseType: row.priceBaseType,
      changed:
        newHT !== row.priceHT ||
        newTTC !== row.priceTTC ||
        newMin !== row.priceMin,
    };
  });
}
