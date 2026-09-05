# Ce document ne décrit plus un outil en service

`conversion.forestar.be` ne convertit plus rien. Les cinq outils qu'il portait
sont repris dans Dolibarr depuis le **2026-09-05**, et le site n'affiche plus
qu'une page qui renvoie vers l'ERP.

Le mode d'emploi à jour vit désormais dans le dépôt `forestar-gestion` :

- `docs/supplier-import.md` — import de tarifs fournisseurs (staging, profils,
  moteur de prix, durée réelle d'un import)
- `docs/catalog-tools.md` — outils de catalogue : renommage de références,
  modification de prix en masse, reprise de champs depuis un fichier

## Correspondance avec les anciens outils

| Ancien outil | Où il vit maintenant |
| --- | --- |
| Valkenpower → Dolibarr | Import fournisseur, profil Valpower |
| Excel → Dolibarr | Import fournisseur, modèles + correspondance de colonnes |
| Modification de références | Outils de catalogue, onglet « Renommer des références » |
| Modification de prix | Outils de catalogue, onglet « Modifier des prix en masse » |
| Fusion de fichiers Excel | Outils de catalogue, onglet « Mettre à jour des champs depuis un fichier » |

## Ce qui a changé dans le fond

L'ancienne chaîne produisait un fichier Excel qu'il fallait ensuite réimporter
à la main dans Dolibarr. Les outils repris **écrivent directement au catalogue**,
avec le contrat de l'import fournisseur : on simule, on regarde ce qui va
changer, on applique — et on garde un rapport de ce qui a été écrit.

Un seul comportement diffère volontairement de l'original : un prix qui
tomberait à zéro ou en dessous est désormais **refusé**, là où l'ancien outil le
ramenait à zéro.

La version d'origine de ce document est dans l'historique Git, au commit
`b58ed83` et avant.
