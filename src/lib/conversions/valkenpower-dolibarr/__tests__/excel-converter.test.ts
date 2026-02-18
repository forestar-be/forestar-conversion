import { describe, it, expect } from "vitest";
import {
  convertToExcel,
  DEFAULT_OPTIONS,
  ConversionOptions,
} from "../excel-converter";
import { ValkenProduct } from "../xml-parser";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<ValkenProduct> = {}): ValkenProduct {
  return {
    model: "CS50",
    barcode: "8720028050130",
    titleNL: "Titel NL",
    titleEN: "Title EN",
    titleDE: "Titel DE",
    titleFR: "",
    priceEXVAT: "100.00",
    priceINVAT: "121.00",
    specialpriceEXVAT: "90.00",
    descriptionNL: "Beschrijving NL",
    descriptionEN: "Description EN",
    descriptionDE: "Beschreibung DE",
    descriptionFR: "",
    stock: "50",
    mainimage: "https://example.com/img.jpg",
    prodWeight: 5.5,
    prodLength: 300,
    prodWidth: 200,
    prodHeight: 100,
    packWeight: 7.2,
    packLength: 400,
    packWidth: 300,
    packHeight: 200,
    ...overrides,
  };
}

function opts(overrides: Partial<ConversionOptions> = {}): ConversionOptions {
  return { ...DEFAULT_OPTIONS, ...overrides };
}

// ─── Structure ──────────────────────────────────────────────────────────────

describe("convertToExcel — structure", () => {
  it("returns headers and one row per product", async () => {
    const result = await convertToExcel([makeProduct()], opts());
    expect(result.headers.length).toBeGreaterThan(5);
    expect(result.rows.length).toBe(1);
  });

  it("returns totalProducts count", async () => {
    const products = [
      makeProduct({ model: "A" }),
      makeProduct({ model: "B", barcode: "111" }),
    ];
    const result = await convertToExcel(products, opts());
    expect(result.totalProducts).toBe(2);
  });

  it("handles empty products array", async () => {
    const result = await convertToExcel([], opts());
    expect(result.totalProducts).toBe(0);
    expect(result.rows.length).toBe(0);
  });

  it("returns a valid buffer", async () => {
    const result = await convertToExcel([makeProduct()], opts());
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });

  it("returns isZip false for small datasets", async () => {
    const result = await convertToExcel([makeProduct()], opts());
    expect(result.isZip).toBe(false);
    expect(result.fileCount).toBe(1);
  });
});

// ─── Required Headers ───────────────────────────────────────────────────────

describe("convertToExcel — Dolibarr headers", () => {
  it("always includes required Dolibarr fields", async () => {
    const result = await convertToExcel([makeProduct()], opts());
    expect(result.headers).toContain("Réf.* (p.ref)");
    expect(result.headers).toContain("Libellé* (p.label)");
    expect(result.headers).toContain("Type* (p.fk_product_type)");
    expect(result.headers).toContain("En vente* (p.tosell)");
    expect(result.headers).toContain("En achat* (p.tobuy)");
    expect(result.headers).toContain("Description (p.description)");
  });

  it("includes price columns always", async () => {
    const result = await convertToExcel([makeProduct()], opts());
    expect(result.headers).toContain("Prix de vente HT (p.price)");
    expect(result.headers).toContain("Prix de vente TTC (p.price_ttc)");
    expect(result.headers).toContain("Taux TVA (p.tva_tx)");
    expect(result.headers).toContain("PriceBaseType (p.price_base_type)");
  });
});

// ─── Optional Columns ───────────────────────────────────────────────────────

describe("convertToExcel — optional columns", () => {
  it("includes barcode column when includeBarcode is true", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includeBarcode: true }),
    );
    expect(result.headers).toContain("Code-barres (p.barcode)");
  });

  it("excludes barcode column when includeBarcode is false", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includeBarcode: false }),
    );
    expect(result.headers).not.toContain("Code-barres (p.barcode)");
  });

  it("includes weight columns when includeWeight is true", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includeWeight: true }),
    );
    expect(result.headers).toContain("Weight (p.weight)");
    expect(result.headers).toContain("Unité de poids (p.weight_units)");
  });

  it("excludes weight columns when includeWeight is false", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includeWeight: false }),
    );
    expect(result.headers).not.toContain("Weight (p.weight)");
  });

  it("includes URL column when includeUrl is true", async () => {
    const result = await convertToExcel([makeProduct()], opts({ includeUrl: true }));
    expect(result.headers).toContain("URL publique (p.url)");
  });

  it("excludes URL column when includeUrl is false", async () => {
    const result = await convertToExcel([makeProduct()], opts({ includeUrl: false }));
    expect(result.headers).not.toContain("URL publique (p.url)");
  });

  it("includes price_min column when includePriceMin is true", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includePriceMin: true }),
    );
    expect(result.headers).toContain("Prix de vente min. (p.price_min)");
  });

  it("excludes price_min column when includePriceMin is false", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includePriceMin: false }),
    );
    expect(result.headers).not.toContain("Prix de vente min. (p.price_min)");
  });

  it("includes dimension columns when includeDimensions is true", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includeDimensions: true }),
    );
    expect(result.headers).toContain("Longueur (p.length)");
    expect(result.headers).toContain("Largeur (p.width)");
    expect(result.headers).toContain("Hauteur (p.height)");
  });

  it("excludes dimension columns when includeDimensions is false", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ includeDimensions: false }),
    );
    expect(result.headers).not.toContain("Longueur (p.length)");
  });
});

// ─── Data Values ────────────────────────────────────────────────────────────

describe("convertToExcel — data values", () => {
  it("outputs model as ref", async () => {
    const result = await convertToExcel([makeProduct({ model: "GEN3000" })], opts());
    expect(result.rows[0][0]).toBe("GEN3000");
  });

  it("outputs product type 0 for products", async () => {
    const result = await convertToExcel([makeProduct()], opts({ productType: 0 }));
    expect(result.rows[0][2]).toBe("0");
  });

  it("outputs product type 1 for services", async () => {
    const result = await convertToExcel([makeProduct()], opts({ productType: 1 }));
    expect(result.rows[0][2]).toBe("1");
  });

  it("outputs tosell and tobuy as 1/0", async () => {
    const r1 = await convertToExcel(
      [makeProduct()],
      opts({ toSell: true, toBuy: true }),
    );
    expect(r1.rows[0][3]).toBe("1");
    expect(r1.rows[0][4]).toBe("1");

    const r2 = await convertToExcel(
      [makeProduct()],
      opts({ toSell: false, toBuy: false }),
    );
    expect(r2.rows[0][3]).toBe("0");
    expect(r2.rows[0][4]).toBe("0");
  });

  it("outputs TVA rate with one decimal", async () => {
    const result = await convertToExcel([makeProduct()], opts({ tvaRate: 21.0 }));
    expect(result.rows[0]).toContain("21.0");
  });

  it("outputs TVA rate 6% correctly", async () => {
    const result = await convertToExcel([makeProduct()], opts({ tvaRate: 6.0 }));
    expect(result.rows[0]).toContain("6.0");
  });

  it("outputs price base type HT", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ priceBaseType: "HT" }),
    );
    expect(result.rows[0]).toContain("HT");
  });

  it("outputs price base type TTC", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({ priceBaseType: "TTC" }),
    );
    expect(result.rows[0]).toContain("TTC");
  });

  it("outputs barcode value", async () => {
    const result = await convertToExcel(
      [makeProduct({ barcode: "8720028050130" })],
      opts({ includeBarcode: true }),
    );
    expect(result.rows[0]).toContain("8720028050130");
  });

  it("preserves full EAN-13 barcode digits (no scientific notation)", async () => {
    const result = await convertToExcel(
      [makeProduct({ barcode: "8720028050130" })],
      opts({ includeBarcode: true }),
    );
    const barcodeField = result.rows[0][result.rows[0].length - 1];
    expect(barcodeField).toBe("8720028050130");
    expect(barcodeField).not.toMatch(/[eE]/);
  });

  it("outputs prices correctly", async () => {
    const result = await convertToExcel(
      [
        makeProduct({
          priceEXVAT: "250.00",
          priceINVAT: "302.50",
          specialpriceEXVAT: "200.00",
        }),
      ],
      opts({ includePriceMin: true }),
    );
    expect(result.rows[0]).toContain("250.00");
    expect(result.rows[0]).toContain("302.50");
    expect(result.rows[0]).toContain("200.00");
  });

  it("outputs empty string for missing prices", async () => {
    const result = await convertToExcel(
      [makeProduct({ priceEXVAT: "", priceINVAT: "", specialpriceEXVAT: "" })],
      opts(),
    );
    expect(result.rows[0].join(";")).not.toContain("undefined");
    expect(result.rows[0].join(";")).not.toContain("null");
  });

  it("outputs mainimage as URL", async () => {
    const result = await convertToExcel(
      [makeProduct({ mainimage: "https://cdn.valkenpower.com/img.jpg" })],
      opts({ includeUrl: true }),
    );
    expect(result.rows[0]).toContain("https://cdn.valkenpower.com/img.jpg");
  });

  it("handles special characters in fields without escaping", async () => {
    const p = makeProduct({ titleEN: "Generator; 3000W" });
    const result = await convertToExcel([p], opts({ descriptionLang: "EN" }));
    expect(result.rows[0][1]).toBe("Generator; 3000W");
  });
});

// ─── Language Selection ─────────────────────────────────────────────────────

describe("convertToExcel — language selection", () => {
  const product = makeProduct({
    titleFR: "Titre FR",
    titleEN: "Title EN",
    titleNL: "Titel NL",
    titleDE: "Titel DE",
    descriptionFR: "Desc FR",
    descriptionEN: "Desc EN",
    descriptionNL: "Desc NL",
    descriptionDE: "Desc DE",
  });

  it("uses FR title when descriptionLang is FR", async () => {
    const result = await convertToExcel([product], opts({ descriptionLang: "FR" }));
    expect(result.rows[0][1]).toBe("Titre FR");
  });

  it("uses EN title when descriptionLang is EN", async () => {
    const result = await convertToExcel([product], opts({ descriptionLang: "EN" }));
    expect(result.rows[0][1]).toBe("Title EN");
  });

  it("uses NL title when descriptionLang is NL", async () => {
    const result = await convertToExcel([product], opts({ descriptionLang: "NL" }));
    expect(result.rows[0][1]).toBe("Titel NL");
  });

  it("uses DE title when descriptionLang is DE", async () => {
    const result = await convertToExcel([product], opts({ descriptionLang: "DE" }));
    expect(result.rows[0][1]).toBe("Titel DE");
  });

  it("falls back FR → EN → NL when FR title is missing", async () => {
    const p = makeProduct({
      titleFR: "",
      titleEN: "Fallback EN",
      titleNL: "Fallback NL",
    });
    const result = await convertToExcel([p], opts({ descriptionLang: "FR" }));
    expect(result.rows[0][1]).toBe("Fallback EN");
  });

  it("falls back FR → EN → NL when both FR and EN are missing", async () => {
    const p = makeProduct({ titleFR: "", titleEN: "", titleNL: "Fallback NL" });
    const result = await convertToExcel([p], opts({ descriptionLang: "FR" }));
    expect(result.rows[0][1]).toBe("Fallback NL");
  });

  it("falls back EN → NL when EN title is missing", async () => {
    const p = makeProduct({ titleEN: "", titleNL: "Fallback NL" });
    const result = await convertToExcel([p], opts({ descriptionLang: "EN" }));
    expect(result.rows[0][1]).toBe("Fallback NL");
  });

  it("falls back DE → EN → NL when DE title is missing", async () => {
    const p = makeProduct({ titleDE: "", titleEN: "Fallback EN" });
    const result = await convertToExcel([p], opts({ descriptionLang: "DE" }));
    expect(result.rows[0][1]).toBe("Fallback EN");
  });

  it("uses correct description language in output", async () => {
    const result = await convertToExcel([product], opts({ descriptionLang: "EN" }));
    expect(result.rows[0][5]).toBe("Desc EN");
  });
});

// ─── Weight Source ───────────────────────────────────────────────────────────

describe("convertToExcel — weight source", () => {
  it("uses package weight by default", async () => {
    const p = makeProduct({ prodWeight: 5.5, packWeight: 7.2 });
    const result = await convertToExcel(
      [p],
      opts({ weightSource: "package", includeWeight: true }),
    );
    expect(result.rows[0]).toContain("7.2");
  });

  it("uses product weight when weightSource is product", async () => {
    const p = makeProduct({ prodWeight: 5.5, packWeight: 7.2 });
    const result = await convertToExcel(
      [p],
      opts({ weightSource: "product", includeWeight: true }),
    );
    expect(result.rows[0]).toContain("5.5");
  });

  it("falls back to package weight when product weight is 0", async () => {
    const p = makeProduct({ prodWeight: 0, packWeight: 7.2 });
    const result = await convertToExcel(
      [p],
      opts({ weightSource: "product", includeWeight: true }),
    );
    expect(result.rows[0]).toContain("7.2");
  });

  it("outputs weight unit 'KG' when weight > 0", async () => {
    const p = makeProduct({ packWeight: 7.2 });
    const result = await convertToExcel([p], opts({ includeWeight: true }));
    expect(result.rows[0]).toContain("KG");
  });

  it("outputs empty weight unit when weight is 0", async () => {
    const p = makeProduct({ prodWeight: 0, packWeight: 0 });
    const result = await convertToExcel([p], opts({ includeWeight: true }));
    const weightUnitIdx = result.headers.findIndex((h) =>
      h.includes("p.weight_units"),
    );
    expect(result.rows[0][weightUnitIdx]).toBe("");
  });
});

// ─── Dimensions ──────────────────────────────────────────────────────────────

describe("convertToExcel — dimensions", () => {
  it("outputs product dimensions when available", async () => {
    const p = makeProduct({ prodLength: 300, prodWidth: 200, prodHeight: 100 });
    const result = await convertToExcel([p], opts({ includeDimensions: true }));
    expect(result.rows[0]).toContain("300");
    expect(result.rows[0]).toContain("200");
    expect(result.rows[0]).toContain("100");
  });

  it("falls back to pack dimensions when product dimensions are 0", async () => {
    const p = makeProduct({
      prodLength: 0,
      prodWidth: 0,
      prodHeight: 0,
      packLength: 400,
      packWidth: 300,
      packHeight: 200,
    });
    const result = await convertToExcel([p], opts({ includeDimensions: true }));
    expect(result.rows[0]).toContain("400");
    expect(result.rows[0]).toContain("300");
    expect(result.rows[0]).toContain("200");
  });

  it("outputs 'MM' as dimension unit when dimension > 0", async () => {
    const p = makeProduct({ prodLength: 300 });
    const result = await convertToExcel([p], opts({ includeDimensions: true }));
    expect(result.rows[0]).toContain("MM");
  });

  it("outputs empty dimension values when all dimensions are 0", async () => {
    const p = makeProduct({
      prodLength: 0,
      prodWidth: 0,
      prodHeight: 0,
      packLength: 0,
      packWidth: 0,
      packHeight: 0,
    });
    const result = await convertToExcel([p], opts({ includeDimensions: true }));
    const lengthIdx = result.headers.findIndex((h) => h.includes("p.length)"));
    expect(result.rows[0][lengthIdx]).toBe("");
  });
});

// ─── Warnings ────────────────────────────────────────────────────────────────

describe("convertToExcel — warnings", () => {
  it("warns about missing barcodes when includeBarcode is true", async () => {
    const p = makeProduct({ model: "NOBC", barcode: "" });
    const result = await convertToExcel([p], opts({ includeBarcode: true }));
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ type: "missing_barcode", model: "NOBC" }),
    );
  });

  it("does not warn about missing barcodes when includeBarcode is false", async () => {
    const p = makeProduct({ model: "NOBC", barcode: "" });
    const result = await convertToExcel([p], opts({ includeBarcode: false }));
    expect(
      result.warnings.filter((w) => w.type === "missing_barcode"),
    ).toHaveLength(0);
  });

  it("warns about duplicate barcodes", async () => {
    const products = [
      makeProduct({ model: "A01", barcode: "1234567890123" }),
      makeProduct({ model: "B02", barcode: "1234567890123" }),
    ];
    const result = await convertToExcel(products, opts({ includeBarcode: true }));
    const dupWarnings = result.warnings.filter(
      (w) => w.type === "duplicate_barcode",
    );
    expect(dupWarnings).toHaveLength(1);
    expect(dupWarnings[0].model).toBe("B02");
    expect(dupWarnings[0].message).toContain("A01");
  });

  it("does not warn about duplicate barcodes when includeBarcode is false", async () => {
    const products = [
      makeProduct({ model: "A01", barcode: "1234567890123" }),
      makeProduct({ model: "B02", barcode: "1234567890123" }),
    ];
    const result = await convertToExcel(products, opts({ includeBarcode: false }));
    expect(
      result.warnings.filter((w) => w.type === "duplicate_barcode"),
    ).toHaveLength(0);
  });

  it("warns about duplicate refs", async () => {
    const products = [
      makeProduct({ model: "DUP", barcode: "111" }),
      makeProduct({ model: "DUP", barcode: "222" }),
    ];
    const result = await convertToExcel(products, opts());
    const dupWarnings = result.warnings.filter(
      (w) => w.type === "duplicate_ref",
    );
    expect(dupWarnings).toHaveLength(1);
    expect(dupWarnings[0].model).toBe("DUP");
  });

  it("warns about missing title", async () => {
    const p = makeProduct({
      model: "NOTITLE",
      titleFR: "",
      titleEN: "",
      titleNL: "",
      titleDE: "",
    });
    const result = await convertToExcel([p], opts({ descriptionLang: "FR" }));
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ type: "missing_title", model: "NOTITLE" }),
    );
  });

  it("does not warn when title exists in fallback language", async () => {
    const p = makeProduct({ titleFR: "", titleEN: "Has EN title" });
    const result = await convertToExcel([p], opts({ descriptionLang: "FR" }));
    expect(
      result.warnings.filter((w) => w.type === "missing_title"),
    ).toHaveLength(0);
  });

  it("warns about missing price", async () => {
    const p = makeProduct({ model: "NOPRICE", priceEXVAT: "", priceINVAT: "" });
    const result = await convertToExcel([p], opts());
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ type: "missing_price", model: "NOPRICE" }),
    );
  });

  it("does not warn when at least one price is present", async () => {
    const p1 = makeProduct({ priceEXVAT: "100.00", priceINVAT: "" });
    const p2 = makeProduct({
      model: "B",
      barcode: "222",
      priceEXVAT: "",
      priceINVAT: "121.00",
    });
    const result = await convertToExcel([p1, p2], opts());
    expect(
      result.warnings.filter((w) => w.type === "missing_price"),
    ).toHaveLength(0);
  });

  it("returns no warnings for a valid product", async () => {
    const p = makeProduct({ titleEN: "Valid", barcode: "1234567890123" });
    const result = await convertToExcel([p], opts({ descriptionLang: "EN" }));
    expect(result.warnings).toHaveLength(0);
  });

  it("accumulates multiple warnings across products", async () => {
    const products = [
      makeProduct({
        model: "A",
        barcode: "",
        titleEN: "",
        titleFR: "",
        titleNL: "",
        titleDE: "",
        priceEXVAT: "",
        priceINVAT: "",
      }),
      makeProduct({ model: "B", barcode: "", titleEN: "OK", priceEXVAT: "10" }),
    ];
    const result = await convertToExcel(products, opts({ descriptionLang: "EN" }));
    expect(result.warnings.length).toBe(4);
  });
});

// ─── Multiple Products ──────────────────────────────────────────────────────

describe("convertToExcel — multiple products", () => {
  it("outputs one data row per product", async () => {
    const products = [
      makeProduct({ model: "P1", barcode: "111" }),
      makeProduct({ model: "P2", barcode: "222" }),
      makeProduct({ model: "P3", barcode: "333" }),
    ];
    const result = await convertToExcel(products, opts());
    expect(result.rows.length).toBe(3);
  });

  it("preserves product order in output", async () => {
    const products = [
      makeProduct({ model: "ZZZ", barcode: "111" }),
      makeProduct({ model: "AAA", barcode: "222" }),
      makeProduct({ model: "MMM", barcode: "333" }),
    ];
    const result = await convertToExcel(products, opts());
    expect(result.rows[0][0]).toBe("ZZZ");
    expect(result.rows[1][0]).toBe("AAA");
    expect(result.rows[2][0]).toBe("MMM");
  });
});

// ─── DEFAULT_OPTIONS ─────────────────────────────────────────────────────────

describe("DEFAULT_OPTIONS", () => {
  it("has sensible Belgian defaults", () => {
    expect(DEFAULT_OPTIONS.descriptionLang).toBe("FR");
    expect(DEFAULT_OPTIONS.tvaRate).toBe(21.0);
    expect(DEFAULT_OPTIONS.priceBaseType).toBe("HT");
    expect(DEFAULT_OPTIONS.productType).toBe(0);
    expect(DEFAULT_OPTIONS.toSell).toBe(true);
    expect(DEFAULT_OPTIONS.toBuy).toBe(true);
    expect(DEFAULT_OPTIONS.includeBarcode).toBe(true);
    expect(DEFAULT_OPTIONS.includeWeight).toBe(true);
    expect(DEFAULT_OPTIONS.includeDimensions).toBe(false);
    expect(DEFAULT_OPTIONS.includeUrl).toBe(true);
    expect(DEFAULT_OPTIONS.includePriceMin).toBe(true);
    expect(DEFAULT_OPTIONS.weightSource).toBe("package");
  });
});

// ─── Column Count Consistency ────────────────────────────────────────────────

describe("convertToExcel — column consistency", () => {
  it("has same number of columns in header and each data row", async () => {
    const products = [
      makeProduct({ model: "A", barcode: "111", titleEN: "With; semicolon" }),
      makeProduct({
        model: "B",
        barcode: "222",
        descriptionEN: 'Has "quotes"',
      }),
      makeProduct({ model: "C", barcode: "333" }),
    ];
    const result = await convertToExcel(
      products,
      opts({
        includeBarcode: true,
        includeWeight: true,
        includeDimensions: true,
        includeUrl: true,
        includePriceMin: true,
      }),
    );
    for (const row of result.rows) {
      expect(row.length).toBe(result.headers.length);
    }
  });

  it("has consistent column count with minimal options", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({
        includeBarcode: false,
        includeWeight: false,
        includeDimensions: false,
        includeUrl: false,
        includePriceMin: false,
      }),
    );
    expect(result.rows[0].length).toBe(result.headers.length);
    // Minimal: ref, label, type, tosell, tobuy, description, price_ht, price_ttc, tva, pricebasetype = 10
    expect(result.headers.length).toBe(10);
  });

  it("has correct column count with all options enabled", async () => {
    const result = await convertToExcel(
      [makeProduct()],
      opts({
        includeBarcode: true,
        includeWeight: true,
        includeDimensions: true,
        includeUrl: true,
        includePriceMin: true,
      }),
    );
    // 10 base + 1 url + 2 weight + 6 dims + 1 price_min + 1 barcode = 21
    expect(result.headers.length).toBe(21);
  });
});
