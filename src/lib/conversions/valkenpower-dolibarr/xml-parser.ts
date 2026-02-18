export interface ValkenProduct {
  model: string;
  barcode: string;
  titleNL: string;
  titleEN: string;
  titleDE: string;
  titleFR: string;
  priceEXVAT: string;
  priceINVAT: string;
  specialpriceEXVAT: string;
  descriptionNL: string;
  descriptionEN: string;
  descriptionDE: string;
  descriptionFR: string;
  stock: string;
  mainimage: string;
  prodWeight: number;
  prodLength: number;
  prodWidth: number;
  prodHeight: number;
  packWeight: number;
  packLength: number;
  packWidth: number;
  packHeight: number;
}

function getTextContent(element: Element, tagName: string): string {
  const el = element.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() ?? "";
}

function getNumericContent(element: Element, tagName: string): number {
  const text = getTextContent(element, tagName);
  const num = parseFloat(text);
  return isNaN(num) ? 0 : num;
}

/**
 * Decode HTML entities commonly found in Valkenpower XML descriptions.
 */
function decodeHtmlEntities(text: string): string {
  const textarea =
    typeof document !== "undefined" ? document.createElement("textarea") : null;

  if (textarea) {
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Server-side fallback
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Convert HTML description to plain text with pipe separators (Dolibarr convention).
 */
export function htmlToPlainText(html: string): string {
  const decoded = decodeHtmlEntities(html);
  return decoded
    .replace(/<br\s*\/?>/gi, " | ")
    .replace(/<\/p>\s*<p>/gi, " | ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*\|\s*/, "")
    .replace(/\s*\|\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseValkenXml(xmlContent: string): ValkenProduct[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Erreur de parsing XML: ${parseError.textContent}`);
  }

  const productElements = doc.getElementsByTagName("product");
  const products: ValkenProduct[] = [];

  for (let i = 0; i < productElements.length; i++) {
    const el = productElements[i];
    products.push({
      model: getTextContent(el, "model"),
      barcode: getTextContent(el, "barcode"),
      titleNL: getTextContent(el, "titleNL"),
      titleEN: getTextContent(el, "titleEN"),
      titleDE: getTextContent(el, "titleDE"),
      titleFR: getTextContent(el, "titleFR"),
      priceEXVAT: getTextContent(el, "priceEXVAT"),
      priceINVAT: getTextContent(el, "priceINVAT"),
      specialpriceEXVAT: getTextContent(el, "specialpriceEXVAT"),
      descriptionNL: getTextContent(el, "descriptionNL"),
      descriptionEN: getTextContent(el, "descriptionEN"),
      descriptionDE: getTextContent(el, "descriptionDE"),
      descriptionFR: getTextContent(el, "descriptionFR"),
      stock: getTextContent(el, "stock"),
      mainimage: getTextContent(el, "mainimage"),
      prodWeight: getNumericContent(el, "ProdWeight"),
      prodLength: getNumericContent(el, "ProdLength"),
      prodWidth: getNumericContent(el, "ProdWidth"),
      prodHeight: getNumericContent(el, "ProdHeight"),
      packWeight: getNumericContent(el, "PackWeight"),
      packLength: getNumericContent(el, "PackLength"),
      packWidth: getNumericContent(el, "PackWidth"),
      packHeight: getNumericContent(el, "PackHeight"),
    });
  }

  return products;
}
