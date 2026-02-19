export interface ConversionDefinition {
  /** URL slug, e.g. "valkenpower-dolibarr" */
  slug: string;
  /** Display name */
  title: string;
  /** Short description */
  description: string;
  /** Source format */
  from: string;
  /** Target format */
  to: string;
}

export const CONVERSIONS: ConversionDefinition[] = [
  {
    slug: "valkenpower-dolibarr",
    title: "Valkenpower → Dolibarr",
    description:
      "Convertir les fichiers XML Valkenpower en Excel compatible Dolibarr 22",
    from: "XML Valkenpower",
    to: "Excel Dolibarr 22",
  },
  {
    slug: "modification-refs",
    title: "Modification de références",
    description:
      "Modifier des références produit en masse (préfixe, suffixe, chercher/remplacer…)",
    from: "Liste de références",
    to: "Excel Dolibarr",
  },
];
