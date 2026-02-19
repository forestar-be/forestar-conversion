import { describe, it, expect } from "vitest";
import { parseValkenXml, htmlToPlainText } from "../xml-parser";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeXml(products: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><products>${products}</products>`;
}

function makeProduct(fields: Record<string, string | number> = {}): string {
  const defaults: Record<string, string | number> = {
    model: "TEST01",
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
    ProdWeight: 5.5,
    ProdLength: 300,
    ProdWidth: 200,
    ProdHeight: 100,
    PackWeight: 7.2,
    PackLength: 400,
    PackWidth: 300,
    PackHeight: 200,
  };
  const merged = { ...defaults, ...fields };
  return (
    "<product>" +
    Object.entries(merged)
      .map(([k, v]) => `<${k}>${v}</${k}>`)
      .join("") +
    "</product>"
  );
}

// ─── parseValkenXml ─────────────────────────────────────────────────────────

describe("parseValkenXml", () => {
  it("parses a single product with all fields", () => {
    const xml = makeXml(makeProduct());
    const products = parseValkenXml(xml);

    expect(products).toHaveLength(1);
    const p = products[0];
    expect(p.model).toBe("TEST01");
    expect(p.barcode).toBe("8720028050130");
    expect(p.titleNL).toBe("Titel NL");
    expect(p.titleEN).toBe("Title EN");
    expect(p.titleDE).toBe("Titel DE");
    expect(p.titleFR).toBe("");
    expect(p.priceEXVAT).toBe("100.00");
    expect(p.priceINVAT).toBe("121.00");
    expect(p.specialpriceEXVAT).toBe("90.00");
    expect(p.descriptionEN).toBe("Description EN");
    expect(p.stock).toBe("50");
    expect(p.mainimage).toBe("https://example.com/img.jpg");
    expect(p.prodWeight).toBe(5.5);
    expect(p.prodLength).toBe(300);
    expect(p.prodWidth).toBe(200);
    expect(p.prodHeight).toBe(100);
    expect(p.packWeight).toBe(7.2);
    expect(p.packLength).toBe(400);
    expect(p.packWidth).toBe(300);
    expect(p.packHeight).toBe(200);
  });

  it("parses multiple products", () => {
    const xml = makeXml(
      makeProduct({ model: "A01" }) +
        makeProduct({ model: "B02" }) +
        makeProduct({ model: "C03" }),
    );
    const products = parseValkenXml(xml);
    expect(products).toHaveLength(3);
    expect(products.map((p) => p.model)).toEqual(["A01", "B02", "C03"]);
  });

  it("returns empty array for XML with no products", () => {
    const xml = makeXml("");
    const products = parseValkenXml(xml);
    expect(products).toHaveLength(0);
  });

  it("handles missing optional fields gracefully", () => {
    const xml = makeXml("<product><model>MINIMAL</model></product>");
    const products = parseValkenXml(xml);

    expect(products).toHaveLength(1);
    const p = products[0];
    expect(p.model).toBe("MINIMAL");
    expect(p.barcode).toBe("");
    expect(p.titleNL).toBe("");
    expect(p.titleEN).toBe("");
    expect(p.priceEXVAT).toBe("");
    expect(p.priceINVAT).toBe("");
    expect(p.prodWeight).toBe(0);
    expect(p.packWeight).toBe(0);
    expect(p.prodLength).toBe(0);
  });

  it("trims whitespace from text content", () => {
    const xml = makeXml(
      "<product><model>  SPACED  </model><titleEN>  Title with spaces  </titleEN></product>",
    );
    const products = parseValkenXml(xml);
    expect(products[0].model).toBe("SPACED");
    expect(products[0].titleEN).toBe("Title with spaces");
  });

  it("handles numeric fields with non-numeric values as 0", () => {
    const xml = makeXml(
      makeProduct({ ProdWeight: "not-a-number", PackLength: "" }),
    );
    const products = parseValkenXml(xml);
    expect(products[0].prodWeight).toBe(0);
    expect(products[0].packLength).toBe(0);
  });

  it("handles negative numeric values", () => {
    const xml = makeXml(makeProduct({ ProdWeight: -3.5 }));
    const products = parseValkenXml(xml);
    expect(products[0].prodWeight).toBe(-3.5);
  });

  it("handles decimal prices as strings", () => {
    const xml = makeXml(
      makeProduct({ priceEXVAT: "1234.56", priceINVAT: "1493.81" }),
    );
    const products = parseValkenXml(xml);
    expect(products[0].priceEXVAT).toBe("1234.56");
    expect(products[0].priceINVAT).toBe("1493.81");
  });

  it("throws on invalid XML", () => {
    expect(() => parseValkenXml("<broken><unclosed>")).toThrow(
      "Erreur de parsing XML",
    );
  });

  it("preserves EAN-13 barcodes without scientific notation corruption", () => {
    const xml = makeXml(makeProduct({ barcode: "8720028050130" }));
    const products = parseValkenXml(xml);
    expect(products[0].barcode).toBe("8720028050130");
    expect(products[0].barcode).toHaveLength(13);
  });

  it("handles XML with CDATA sections in descriptions", () => {
    const xml = makeXml(
      `<product>
        <model>CDATA01</model>
        <descriptionEN><![CDATA[<p>Bold <b>text</b></p>]]></descriptionEN>
      </product>`,
    );
    const products = parseValkenXml(xml);
    expect(products[0].descriptionEN).toBe("<p>Bold <b>text</b></p>");
  });

  it("handles XML with special characters in text", () => {
    const xml = makeXml(
      makeProduct({ titleEN: "Pump 1/2&quot; &amp; 3/4&quot;" }),
    );
    const products = parseValkenXml(xml);
    expect(products[0].titleEN).toBe('Pump 1/2" & 3/4"');
  });
});

// ─── htmlToPlainText ────────────────────────────────────────────────────────

describe("htmlToPlainText", () => {
  it("returns empty string for empty input", () => {
    expect(htmlToPlainText("")).toBe("");
  });

  it("returns plain text as-is", () => {
    expect(htmlToPlainText("Simple text")).toBe("Simple text");
  });

  it("converts <br> tags to pipe separators", () => {
    expect(htmlToPlainText("Line 1<br>Line 2")).toBe("Line 1 | Line 2");
    expect(htmlToPlainText("Line 1<br/>Line 2")).toBe("Line 1 | Line 2");
    expect(htmlToPlainText("Line 1<br />Line 2")).toBe("Line 1 | Line 2");
  });

  it("converts </p><p> transitions to pipe separators", () => {
    expect(htmlToPlainText("<p>Para 1</p><p>Para 2</p>")).toBe(
      "Para 1 | Para 2",
    );
  });

  it("strips remaining HTML tags", () => {
    expect(htmlToPlainText("<b>Bold</b> <i>Italic</i>")).toBe("Bold Italic");
  });

  it("removes leading/trailing pipe separators", () => {
    expect(htmlToPlainText("<br>Content<br>")).toBe("Content");
  });

  it("collapses consecutive pipe separators", () => {
    expect(htmlToPlainText("A<br><br>B")).toBe("A | B");
  });

  it("collapses multiple whitespace", () => {
    expect(htmlToPlainText("Too   many   spaces")).toBe("Too many spaces");
  });

  it("decodes HTML entities", () => {
    expect(htmlToPlainText("&amp;")).toBe("&");
    expect(htmlToPlainText("&quot;")).toBe('"');
    expect(htmlToPlainText("&#39;")).toBe("'");
    // &lt; and &gt; are decoded to < and > which are then stripped as HTML tags
    expect(htmlToPlainText("A &lt;b&gt;bold&lt;/b&gt; text")).toBe(
      "A bold text",
    );
  });

  it("handles complex Valkenpower-style descriptions", () => {
    const html =
      "&lt;p&gt;Powerful generator&lt;/p&gt;&lt;p&gt;Max output: 3000W&lt;br /&gt;Weight: 25kg&lt;/p&gt;";
    const result = htmlToPlainText(html);
    expect(result).toContain("Powerful generator");
    expect(result).toContain("Max output: 3000W");
    expect(result).toContain("Weight: 25kg");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });

  it("handles nested tags", () => {
    // List items are separated with pipes to avoid Dolibarr WAF false positives
    // (e.g., "tonwheels =" being detected as XSS "onwheels=")
    expect(
      htmlToPlainText("<div><ul><li>Item 1</li><li>Item 2</li></ul></div>"),
    ).toBe("Item 1 | Item 2");
  });
});
