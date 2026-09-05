# Forestar — Conversion (retiré du service)

Ce dépôt hébergeait cinq outils de conversion de fichiers pour préparer des
imports Dolibarr. **Ils sont tous repris dans Dolibarr depuis le 2026-09-05.**

Il ne reste ici qu'une page statique qui le dit et renvoie vers l'ERP.

## Où sont passés les outils

| Outil d'origine | Repris par |
| --- | --- |
| Valkenpower → Dolibarr | Import fournisseur, profil Valpower |
| Excel → Dolibarr | Import fournisseur, modèles et écran de correspondance de colonnes |
| Modification de références | Outils de catalogue, onglet « Renommer des références » |
| Modification de prix | Outils de catalogue, onglet « Modifier des prix en masse » |
| Fusion de fichiers Excel | Outils de catalogue, onglet « Mettre à jour des champs depuis un fichier » |

Ce n'est pas un simple portage : les outils **écrivent maintenant au catalogue**
au lieu de produire un Excel à réimporter, avec le même contrat que l'import
fournisseur — simuler, montrer ce qui va changer, appliquer.

Le code des cinq outils reste dans l'historique Git, au commit `b58ed83` et
avant, si jamais il fallait s'y référer.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000.

## Scripts

| Commande        | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Serveur de développement |
| `npm run build` | Build de production      |
| `npm run start` | Serveur de production    |
| `npm run lint`  | Linter                   |
