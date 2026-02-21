# Mise à jour des produits via import Dolibarr 22

## Vue d'ensemble

**[conversion.forestar.be](https://conversion.forestar.be)** est un outil web permettant de préparer et transformer des fichiers en vue de l'import ou de la mise à jour de produits dans Dolibarr.

`[SCREENSHOT — page d'accueil avec les 4 tuiles de conversion]`

L'outil propose quatre conversions :

| Conversion                 | Entrée                             | Sortie            |
| -------------------------- | ---------------------------------- | ----------------- |
| Valkenpower → Dolibarr     | XML Valkenpower                    | Excel Dolibarr 22 |
| Excel → Dolibarr           | Excel générique                    | Excel Dolibarr 22 |
| Modification de références | Liste de refs (texte ou Excel/ZIP) | Excel Dolibarr    |
| Modification de prix       | Liste de prix (texte ou Excel/ZIP) | Excel Dolibarr    |
| Fusion de fichiers Excel   | 2 fichiers Excel                   | Excel fusionné    |

---

## 1. Valkenpower → Dolibarr

Convertit un fichier XML Valkenpower en fichier Excel compatible avec l'import produits de Dolibarr 22.

### Étape 1 — Importer le fichier XML

Glisser-déposer le fichier `.xml` Valkenpower dans la zone prévue, ou cliquer pour le sélectionner.

`[SCREENSHOT — zone de dépôt de fichier XML]`

Une fois le fichier chargé, un aperçu des produits détectés s'affiche (référence, titre EN, code-barres, prix HT, poids). Un champ de recherche permet de filtrer par référence, titre ou code-barres.

`[SCREENSHOT — tableau d'aperçu des produits avec pagination]`

Des badges récapitulatifs indiquent le nombre total de produits, le nombre avec code-barres et le nombre avec prix.

### Étape 2 — Configurer les options de conversion

`[SCREENSHOT — panneau d'options de conversion]`

#### Langue des libellés

Langue utilisée pour les colonnes _Libellé_ et _Description_ dans l'Excel généré. Options : **Français**, **English**, **Nederlands**, **Deutsch**. En cas de champ vide dans la langue choisie, l'outil utilise automatiquement la prochaine langue disponible (FR → EN → NL).

#### Taux TVA

Taux appliqué pour calculer le prix TTC à partir du prix HT (et inversement). Options : **21 %** (standard Belgique), 12 %, 6 %, 0 %.

#### Base de prix

Indique à Dolibarr comment interpréter le prix saisi : **HT** (hors taxes) ou **TTC** (toutes taxes comprises). Correspond à la colonne `PriceBaseType (p.price_base_type)` du fichier Excel.

#### Source du poids

Valkenpower fournit deux poids : le poids du produit (`ProdWeight`) et le poids du colis (`PackWeight`). Choisir la source à utiliser pour la colonne _Weight_ de l'Excel.

#### Colonnes à inclure

| Option                 | Colonne Excel générée                                                         |
| ---------------------- | ----------------------------------------------------------------------------- |
| Code-barres            | `Code-barres (p.barcode)`                                                     |
| Poids                  | `Weight (p.weight)` + `Unité de poids (p.weight_units)`                       |
| Dimensions (L × l × H) | `Longueur`, `Largeur`, `Hauteur` (en mm) + unités                             |
| URL publique (image)   | `URL publique (p.url)` — URL de l'image principale                            |
| Prix minimum           | `Prix de vente min. (p.price_min)` — correspond au `specialpriceEXVAT` du XML |
| En vente               | `En vente* (p.tosell)`                                                        |
| En achat               | `En achat* (p.tobuy)`                                                         |

#### Modifier les références (optionnel)

`[SCREENSHOT — formulaire de modification de référence activé]`

Activez ce switch pour transformer les références à la volée pendant la conversion. Les mêmes opérations que la conversion _Modification de références_ sont disponibles (voir section 2).

#### Modifier les prix (optionnel)

`[SCREENSHOT — formulaire de modification de prix activé]`

Activez ce switch pour appliquer une opération sur les prix pendant la conversion. Les mêmes opérations que la conversion _Modification de prix_ sont disponibles (voir section 3). Il est possible de cibler le prix HT ou le prix TTC.

### Étape 3 — Convertir et télécharger

Cliquer sur **Convertir en Excel**. Un aperçu des 10 premières lignes du fichier généré s'affiche.

`[SCREENSHOT — aperçu Excel (10 premières lignes)]`

#### Avertissements

Si des anomalies sont détectées dans les données, un panneau d'avertissements s'affiche avec le détail par produit :

| Type                 | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| Code-barres manquant | Le produit n'a pas de code-barres                                     |
| Titre manquant       | Le libellé est vide dans la langue choisie                            |
| Prix manquant        | Aucun prix HT ni TTC                                                  |
| Code-barres dupliqué | Deux produits partagent le même code-barres                           |
| Référence dupliquée  | Deux produits ont la même référence (après éventuelle transformation) |

`[SCREENSHOT — panneau d'avertissements]`

#### Fichier de sortie

- Si le nombre de produits est **≤ 800** : un seul fichier `.xlsx` est généré.
- Si le nombre de produits est **> 800** : les données sont découpées en tranches de 800 lignes et regroupées dans une archive `.zip`. Chaque fichier Excel du ZIP doit être importé séparément dans Dolibarr.

`[SCREENSHOT — bandeau de succès avec bouton de téléchargement ZIP]`

---

## 2. Excel → Dolibarr

Convertit un fichier Excel générique (tarif fournisseur, export ERP, catalogue…) en fichier Excel compatible avec l'import produits de Dolibarr 22. Contrairement à la conversion Valkenpower, cette conversion accepte n'importe quel format de tableur et laisse l'utilisateur choisir la correspondance entre les colonnes sources et les colonnes Dolibarr.

### Étape 1 — Importer le fichier Excel

Glisser-déposer le fichier `.xlsx` ou `.xls` dans la zone prévue, ou cliquer pour le sélectionner.

`[SCREENSHOT — zone de dépôt de fichier Excel]`

L'outil détecte automatiquement la ligne d'en-têtes (en ignorant les éventuelles lignes d'entête de société en haut du fichier). Des badges récapitulatifs indiquent le nombre de lignes et de colonnes détectées, ainsi que le nom de la feuille utilisée.

### Étape 2 — Mapping des colonnes

Une fois le fichier chargé, l'outil tente d'associer automatiquement chaque colonne source à une colonne Dolibarr connue, en comparant les noms (insensible à la casse, sans accents). Les colonnes non reconnues ou ambiguës sont laissées à « Ignorer ».

`[SCREENSHOT — tableau de mapping des colonnes avec selects]`

Pour chaque colonne source, un menu déroulant permet de choisir la colonne Dolibarr cible, ou de l'ignorer. Un aperçu des 3 premières valeurs de la colonne est affiché pour faciliter l'identification.

Si des **colonnes obligatoires** (`Référence`, `Libellé`) ne sont pas mappées, une alerte s'affiche et la conversion est bloquée jusqu'à résolution.

#### Colonnes Dolibarr disponibles

| Colonne Dolibarr                              | Obligatoire | Notes                                              |
| --------------------------------------------- | :---------: | -------------------------------------------------- |
| Référence `(p.ref)`                           | ✓           |                                                    |
| Libellé `(p.label)`                           | ✓           |                                                    |
| Type produit `(p.fk_product_type)`            | ✓           | Défaut : `0` (produit)                             |
| En vente `(p.tosell)`                         | ✓           | Défaut : `1`                                       |
| En achat `(p.tobuy)`                          | ✓           | Défaut : `1`                                       |
| Description `(p.description)`                 |             |                                                    |
| Prix HT `(p.price)`                           |             | Calculé depuis TTC si seul TTC est mappé           |
| Prix min `(p.price_min)`                      |             |                                                    |
| Prix TTC `(p.price_ttc)`                      |             | Calculé depuis HT si seul HT est mappé             |
| Taux TVA `(p.tva_tx)`                         |             | Ajouté automatiquement si un prix est mappé        |
| PriceBaseType `(p.price_base_type)`           |             | Ajouté automatiquement si un prix est mappé        |
| Code-barres `(p.barcode)`                     |             |                                                    |
| Poids `(p.weight)` + unité                   |             | Unité fixée à `kg`                                 |
| URL publique `(p.url)`                        |             |                                                    |

#### Formats de prix acceptés

La colonne prix est parsée de manière flexible :

- `€ 123.45`, `123.45€`, `123.45 EUR`
- Format français : `123,45` ou `1 234,56` (virgule = décimale)
- Format européen : `1.234,56` (point = milliers, virgule = décimale)
- Valeur numérique brute

### Étape 3 — Configurer les options

`[SCREENSHOT — panneau d'options]`

#### Taux TVA

Taux appliqué pour calculer automatiquement le prix TTC depuis le HT (ou inversement si seul le TTC est mappé). Options : **21 %** (Belgique), 20 % (France), 19 %, 6 %, 0 %.

#### Base de prix

Valeur de la colonne `PriceBaseType (p.price_base_type)` dans l'Excel généré : **HT** ou **TTC**.

#### Type de produit

`0` = produit physique, `1` = service. S'applique à toutes les lignes (pas de mapping colonne possible).

#### En vente / En achat

Valeur des colonnes `En vente* (p.tosell)` et `En achat* (p.tobuy)`. S'applique à toutes les lignes.

#### Modifier les références (optionnel)

Activez ce switch pour transformer les références à la volée pendant la conversion (préfixe, suffixe, chercher/remplacer, regex). Voir section _3. Modification de références_ pour le détail des opérations.

`[SCREENSHOT — formulaire de modification de référence activé]`

#### Modifier les prix (optionnel)

Activez ce switch pour appliquer une opération sur les prix pendant la conversion. Voir section _4. Modification de prix_ pour le détail des opérations. Il est possible de cibler le prix HT ou le prix TTC ; le prix complémentaire est recalculé automatiquement via le taux TVA.

`[SCREENSHOT — formulaire de modification de prix activé]`

### Étape 4 — Convertir et télécharger

Cliquer sur **Convertir en Excel Dolibarr**. Un aperçu des 10 premières lignes du fichier généré s'affiche.

`[SCREENSHOT — aperçu Excel (10 premières lignes)]`

#### Avertissements

| Type                | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| Référence manquante | La valeur dans la colonne référence est vide                          |
| Libellé manquant    | La valeur dans la colonne libellé est vide                            |
| Référence dupliquée | Deux lignes ont la même référence (après éventuelle transformation)   |

#### Fichier de sortie

- Si le nombre de lignes est **≤ 800** : un seul fichier `.xlsx`.
- Si le nombre de lignes est **> 800** : archive `.zip` découpée en tranches de 800 lignes.

`[SCREENSHOT — bandeau de succès avec bouton de téléchargement]`

---

## 3. Modification de références

Modifie en masse des références produit et génère un fichier Excel Dolibarr prêt à importer (seule la colonne `Réf.` est modifiée).

### Entrée

Deux modes d'entrée disponibles via des onglets :

**Mode texte** — Coller une liste de références, une par ligne. Les lignes vides sont ignorées.

```
REF001
REF002
VP-12345
```

`[SCREENSHOT — onglet saisie texte avec textarea]`

**Mode fichier** — Importer un fichier `.xlsx` ou une archive `.zip` contenant plusieurs `.xlsx` (format Dolibarr). L'outil extrait automatiquement la colonne de références.

`[SCREENSHOT — onglet import fichier]`

### Opération

`[SCREENSHOT — formulaire d'opération sur les références]`

| Opération            | Description                                  | Paramètre                            |
| -------------------- | -------------------------------------------- | ------------------------------------ |
| Ajouter un préfixe   | Ajoute du texte au début de chaque ref       | Texte du préfixe                     |
| Ajouter un suffixe   | Ajoute du texte à la fin de chaque ref       | Texte du suffixe                     |
| Supprimer un préfixe | Retire le texte du début (si présent)        | Texte à supprimer                    |
| Supprimer un suffixe | Retire le texte de la fin (si présent)       | Texte à supprimer                    |
| Chercher / Remplacer | Remplace toutes les occurrences d'une chaîne | Chaîne recherchée + remplacement     |
| Regex                | Remplace via une expression régulière        | Pattern regex + flags + remplacement |

### Aperçu et résultats

Un tableau affiche en temps réel les références avant/après transformation. Les références modifiées sont mises en évidence.

`[SCREENSHOT — tableau avant/après avec refs modifiées en évidence]`

### Sortie

Fichier `.xlsx` au format Dolibarr (colonne `Réf.* (p.ref)`) à importer dans Dolibarr en mode _mise à jour_.

---

## 4. Modification de prix

Modifie en masse des prix produit et génère un fichier Excel Dolibarr prêt à importer.

### Entrée

**Mode texte** — Coller des paires référence + prix séparées par une tabulation, une paire par ligne :

```
REF001	12.50
REF002	34.00
```

En mode texte, il faut également configurer le **taux TVA** et la **base de prix** (HT ou TTC) qui seront appliqués à toutes les lignes dans le fichier de sortie.

`[SCREENSHOT — onglet saisie texte prix avec champs TVA et base de prix]`

**Mode fichier** — Importer un fichier `.xlsx` ou une archive `.zip` au format Dolibarr. L'outil reconnaît automatiquement les colonnes Prix HT, Prix TTC, Prix min., Taux TVA et PriceBaseType.

`[SCREENSHOT — onglet import fichier prix]`

### Opération

`[SCREENSHOT — formulaire d'opération sur les prix]`

| Opération                   | Description                       | Paramètre       |
| --------------------------- | --------------------------------- | --------------- |
| Augmenter d'un montant fixe | Ajoute un montant en euros        | Montant (€)     |
| Diminuer d'un montant fixe  | Soustrait un montant en euros     | Montant (€)     |
| Augmenter d'un pourcentage  | Multiplie le prix par (1 + X/100) | Pourcentage (%) |
| Diminuer d'un pourcentage   | Multiplie le prix par (1 - X/100) | Pourcentage (%) |

**Cible de l'opération** :

- **HT** : l'opération est appliquée sur le prix HT (et le prix minimum). Le prix TTC est recalculé à partir du nouveau HT et du taux TVA.
- **TTC** : l'opération est appliquée sur le prix TTC. Le prix HT est recalculé à partir du nouveau TTC et du taux TVA.

Les prix négatifs sont automatiquement ramenés à zéro. Les résultats sont arrondis à 2 décimales.

### Aperçu et résultats

Un tableau affiche les prix originaux et les nouveaux prix côte à côte, avec mise en évidence des lignes modifiées. Un champ de recherche permet de filtrer par référence.

`[SCREENSHOT — tableau de prévisualisation des prix avec colonnes avant/après]`

### Sortie

Fichier `.xlsx` au format Dolibarr avec les colonnes :

```
Réf.* (p.ref) | Prix de vente HT (p.price) | Prix de vente min. (p.price_min) | Prix de vente TTC (p.price_ttc) | Taux TVA (p.tva_tx) | PriceBaseType (p.price_base_type)
```

---

## 5. Fusion de fichiers Excel

Fusionne deux fichiers Excel en remplaçant des colonnes du fichier de base par des valeurs provenant d'un fichier source, en les faisant correspondre par une colonne clé (typiquement la référence produit).

**Cas d'usage typique** : mettre à jour les titres et descriptions dans un Excel Dolibarr à partir d'un fichier exporté d'une autre source.

**Exemple concret** : après avoir converti un XML Valkenpower en Excel (conversion 1) ou un Excel générique (conversion 2), les libellés et descriptions sont en anglais ou en néerlandais. Il est possible de faire traduire cet Excel en français (via un fichier traduit manuellement ou par un autre outil), puis d'utiliser la fusion pour injecter les traductions françaises dans l'Excel Dolibarr, en faisant correspondre les lignes par référence produit.

### Entrée

Importer deux fichiers `.xlsx` :

- **Fichier de base** : le fichier à mettre à jour (ex. export Dolibarr existant)
- **Fichier source** : le fichier contenant les nouvelles valeurs

`[SCREENSHOT — zone d'import des deux fichiers avec indicateurs de chargement]`

### Configuration

`[SCREENSHOT — panneau de configuration colonne clé et mappings]`

**Colonne clé** : sélectionner la colonne utilisée pour faire correspondre les lignes entre les deux fichiers (ex. `Réf.* (p.ref)`). La correspondance est insensible à la casse et ignore les espaces en début/fin.

**Mappings de colonnes** : pour chaque colonne du fichier de base à remplacer, sélectionner la colonne source correspondante. Seules les colonnes explicitement mappées sont modifiées. Si la valeur source est vide, la valeur du fichier de base est conservée.

### Aperçu et résultats

Un tableau affiche le résultat de la fusion avec des badges indiquant :

- le nombre de lignes mises à jour (correspondance trouvée)
- le nombre de lignes non modifiées (aucune correspondance)

Les références sans correspondance dans le fichier source sont listées.

`[SCREENSHOT — tableau de résultat de fusion avec badges de statistiques]`

### Sortie

- Si le fichier de base est au format Dolibarr et contient **≤ 800 lignes** : un seul fichier `.xlsx`.
- Si le fichier de base est au format Dolibarr et contient **> 800 lignes** : une archive `.zip` découpée en tranches de 800 lignes.
- Si le fichier n'est pas au format Dolibarr : un seul fichier `.xlsx` sans découpage.

`[SCREENSHOT — bouton de téléchargement avec indication ZIP ou XLSX]`

---

## Importer dans Dolibarr 22

### Import produits (Valkenpower → Dolibarr, Excel → Dolibarr, Modification de prix, Fusion Excel)

1. Dans Dolibarr, aller dans **Outils → Import de données**.
2. Sélectionner le profil d'import **Produits** (correspondant aux colonnes `p.xxx`).
3. Importer le fichier `.xlsx` généré.
4. Si une archive `.zip` a été téléchargée, répéter l'opération pour chaque fichier Excel contenu dans le ZIP.
5. Choisir le mode **Mise à jour** si les produits existent déjà, ou **Création** pour les nouveaux produits.
6. Dans le champ **Clé à utiliser pour mettre à jour les données**, sélectionner **Réf.** (correspondance sur la référence produit).

> ℹ️ La limite de 800 lignes par fichier est imposée pour éviter les problèmes de performance et de timeout lors de l'import dans Dolibarr.

### Import des modifications de références (module custom)

La modification de références utilise un module personnalisé installé dans Dolibarr, distinct du module d'import standard.

1. Dans Dolibarr, aller dans **Outils → Mise à jour des références**.
2. Importer le fichier `.xlsx` généré par la conversion _Modification de références_.

`[SCREENSHOT — interface Mise à jour des références dans Dolibarr]`
