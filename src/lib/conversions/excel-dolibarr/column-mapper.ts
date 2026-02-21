/**
 * Dolibarr columns available for import
 */
export interface DolibarrColumn {
  /** Unique identifier */
  id: string;
  /** Dolibarr column header format */
  header: string;
  /** Short display label */
  label: string;
  /** Is this column mandatory? */
  required: boolean;
  /** Aliases to match against source column names */
  aliases: string[];
  /** Default value if no source column mapped */
  defaultValue?: string | ((row: (string | number | null)[]) => string);
  /** Transform function for the value */
  transform?: (value: string | number | null) => string;
}

/**
 * All supported Dolibarr output columns
 */
export const DOLIBARR_COLUMNS: DolibarrColumn[] = [
  {
    id: "ref",
    header: "Réf.* (p.ref)",
    label: "Référence",
    required: true,
    aliases: [
      "ref",
      "référence",
      "referentie",
      "reference",
      "sku",
      "article",
      "product_code",
      "code_article",
    ],
  },
  {
    id: "label",
    header: "Libellé* (p.label)",
    label: "Libellé",
    required: true,
    aliases: [
      "label",
      "libellé",
      "libelle",
      "désignation",
      "designation",
      "benaming",
      "name",
      "nom",
      "title",
      "titre",
      "product_name",
      "nom_produit",
      "intitulé",
      "intitule",
    ],
  },
  {
    id: "fk_product_type",
    header: "Type* (p.fk_product_type)",
    label: "Type produit",
    required: true,
    aliases: ["type", "product_type", "type_produit"],
    defaultValue: "0",
  },
  {
    id: "tosell",
    header: "En vente* (p.tosell)",
    label: "En vente",
    required: true,
    aliases: ["tosell", "en_vente", "vente", "sellable", "a_vendre"],
    defaultValue: "1",
  },
  {
    id: "tobuy",
    header: "En achat* (p.tobuy)",
    label: "En achat",
    required: true,
    aliases: ["tobuy", "en_achat", "achat", "buyable", "a_acheter"],
    defaultValue: "1",
  },
  {
    id: "description",
    header: "Description (p.description)",
    label: "Description",
    required: false,
    aliases: [
      "description",
      "desc",
      "détail",
      "detail",
      "details",
      "product_description",
    ],
  },
  {
    id: "price",
    header: "Prix de vente HT (p.price)",
    label: "Prix HT",
    required: false,
    aliases: [
      "prix",
      "price",
      "prijs",
      "prix_ht",
      "price_ht",
      "prix_vente",
      "selling_price",
      "pvht",
      "prix_hors_taxe",
      "prix de vente",
    ],
    transform: parsePrice,
  },
  {
    id: "price_min",
    header: "Prix de vente min. (p.price_min)",
    label: "Prix min",
    required: false,
    aliases: [
      "prix_min",
      "price_min",
      "prix_minimum",
      "min_price",
      "prix_mini",
    ],
    transform: parsePrice,
  },
  {
    id: "price_ttc",
    header: "Prix de vente TTC (p.price_ttc)",
    label: "Prix TTC",
    required: false,
    aliases: [
      "prix_ttc",
      "price_ttc",
      "prix_vente_ttc",
      "price_incl_vat",
      "prix_avec_taxes",
      "pvttc",
    ],
    transform: parsePrice,
  },
  {
    id: "tva_tx",
    header: "Taux TVA (p.tva_tx)",
    label: "TVA",
    required: false,
    aliases: ["tva", "vat", "btw", "tva_tx", "taux_tva", "vat_rate"],
    defaultValue: "21.0",
  },
  {
    id: "price_base_type",
    header: "PriceBaseType (p.price_base_type)",
    label: "Base prix",
    required: false,
    aliases: ["price_base_type", "base_price", "type_prix"],
    defaultValue: "HT",
  },
  {
    id: "barcode",
    header: "Code-barres (p.barcode)",
    label: "Code-barres",
    required: false,
    aliases: [
      "ean",
      "barcode",
      "code_barre",
      "code-barres",
      "codebarre",
      "upc",
      "gtin",
      "ean13",
      "ean-13",
    ],
  },
  {
    id: "weight",
    header: "Weight (p.weight)",
    label: "Poids",
    required: false,
    aliases: ["poids", "weight", "gewicht", "masse"],
  },
  {
    id: "weight_units",
    header: "Unité de poids (p.weight_units)",
    label: "Unité poids",
    required: false,
    aliases: ["weight_unit", "unité_poids", "unite_poids"],
    defaultValue: "kg",
  },
  {
    id: "url",
    header: "URL publique (p.url)",
    label: "URL",
    required: false,
    aliases: ["url", "lien", "link", "website", "image", "image_url"],
  },
];

/**
 * Parse price from various formats (€ XX.XX, XX,XX €, etc.)
 */
export function parsePrice(value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number") {
    return value.toString();
  }

  // Remove currency symbols and extra spaces
  let cleaned = value
    .replace(/€/g, "")
    .replace(/EUR/gi, "")
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .trim();

  // Handle French format (1 234,56 -> 1234.56)
  // Check if comma is used as decimal separator
  if (cleaned.includes(",")) {
    // If there's a period before comma, it's thousands separator (1.234,56)
    if (cleaned.indexOf(".") < cleaned.indexOf(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (!cleaned.includes(".")) {
      // No period, comma is decimal (1234,56)
      cleaned = cleaned.replace(",", ".");
    }
    // Otherwise comma might be thousands separator (1,234.56) - keep as is
  }

  // Remove any remaining non-numeric except decimal point
  cleaned = cleaned.replace(/[^\d.-]/g, "");

  const num = parseFloat(cleaned);
  return isNaN(num) ? "" : num.toString();
}

/**
 * A mapping from source column index to Dolibarr column ID
 */
export interface ColumnMapping {
  /** Source column index */
  sourceIndex: number;
  /** Source column header name */
  sourceHeader: string;
  /** Target Dolibarr column ID (or null if not mapped) */
  targetId: string | null;
}

/**
 * Auto-detect mappings between source headers and Dolibarr columns
 */
export function autoDetectMappings(sourceHeaders: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();

  for (let i = 0; i < sourceHeaders.length; i++) {
    const header = sourceHeaders[i];
    const normalizedHeader = normalizeString(header);

    let matchedTarget: string | null = null;

    // Try to match against aliases
    for (const col of DOLIBARR_COLUMNS) {
      if (usedTargets.has(col.id)) continue;

      for (const alias of col.aliases) {
        if (normalizeString(alias) === normalizedHeader) {
          matchedTarget = col.id;
          break;
        }

        // Also check if header contains the alias
        if (normalizedHeader.includes(normalizeString(alias))) {
          matchedTarget = col.id;
          break;
        }
      }

      if (matchedTarget) break;
    }

    if (matchedTarget) {
      usedTargets.add(matchedTarget);
    }

    mappings.push({
      sourceIndex: i,
      sourceHeader: header,
      targetId: matchedTarget,
    });
  }

  return mappings;
}

/**
 * Normalize string for comparison (lowercase, remove accents, etc.)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]/g, ""); // Keep only alphanumeric
}

/**
 * Get list of unmapped required Dolibarr columns
 */
export function getMissingRequiredColumns(
  mappings: ColumnMapping[],
): DolibarrColumn[] {
  const mappedIds = new Set(mappings.map((m) => m.targetId).filter(Boolean));

  return DOLIBARR_COLUMNS.filter(
    (col) =>
      col.required && !mappedIds.has(col.id) && col.defaultValue === undefined,
  );
}

/**
 * Get all columns that are mapped
 */
export function getMappedColumns(
  mappings: ColumnMapping[],
): { mapping: ColumnMapping; column: DolibarrColumn }[] {
  return mappings
    .filter((m) => m.targetId !== null)
    .map((m) => ({
      mapping: m,
      column: DOLIBARR_COLUMNS.find((c) => c.id === m.targetId)!,
    }));
}

/**
 * Get all unmapped source columns
 */
export function getUnmappedSourceColumns(
  mappings: ColumnMapping[],
): ColumnMapping[] {
  return mappings.filter((m) => m.targetId === null);
}

/**
 * Get Dolibarr columns that haven't been mapped yet
 */
export function getAvailableTargetColumns(
  mappings: ColumnMapping[],
): DolibarrColumn[] {
  const mappedIds = new Set(mappings.map((m) => m.targetId).filter(Boolean));
  return DOLIBARR_COLUMNS.filter((col) => !mappedIds.has(col.id));
}

/**
 * Update a mapping to point to a different target
 */
export function updateMapping(
  mappings: ColumnMapping[],
  sourceIndex: number,
  newTargetId: string | null,
): ColumnMapping[] {
  // If another mapping already has this target, clear it first
  return mappings.map((m) => {
    if (m.sourceIndex === sourceIndex) {
      return { ...m, targetId: newTargetId };
    }
    if (newTargetId && m.targetId === newTargetId) {
      return { ...m, targetId: null };
    }
    return m;
  });
}
