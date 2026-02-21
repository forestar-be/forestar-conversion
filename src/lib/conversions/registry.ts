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
  {
    slug: "modification-prix",
    title: "Modification de prix",
    description:
      "Modifier des prix en masse (augmenter/réduire d'un montant fixe ou d'un pourcentage)",
    from: "Liste de prix",
    to: "Excel Dolibarr",
  },
  {
    slug: "fusion-excel",
    title: "Fusion de fichiers Excel",
    description:
      "Fusionner deux fichiers Excel en remplaçant des colonnes à partir d'un fichier source (titres, descriptions…)",
    from: "2 fichiers Excel",
    to: "Excel fusionné",
  },
  {
    slug: "excel-dolibarr",
    title: "Excel → Dolibarr",
    description:
      "Convertir un fichier Excel générique en format importable Dolibarr 22 avec mapping de colonnes",
    from: "Excel générique",
    to: "Excel Dolibarr 22",
  },
];
