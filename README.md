# Forestar — Conversions

Outils internes de conversion de fichiers pour Forestar. L'application tourne entièrement côté client — aucune donnée n'est envoyée à un serveur.

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Vitest (tests)

## Démarrage

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000.

## Scripts

| Commande         | Description                |
| ---------------- | -------------------------- |
| `npm run dev`    | Serveur de développement   |
| `npm run build`  | Build de production        |
| `npm run start`  | Serveur de production      |
| `npm run test`   | Lancer les tests           |
| `npm run lint`   | Linter                     |

## Structure

```
src/
  app/
    page.tsx                              # Homepage — liste des conversions
    conversions/
      <slug>/
        page.tsx                          # Page de la conversion
  components/
    ui/                                   # Composants UI partagés (shadcn)
    conversions/
      <slug>/                             # Composants spécifiques à une conversion
  lib/
    conversions/
      registry.ts                         # Registre des conversions disponibles
      <slug>/                             # Logique métier d'une conversion
        __tests__/                        # Tests unitaires
```

## Ajouter une nouvelle conversion

### 1. Déclarer la conversion dans le registre

Dans `src/lib/conversions/registry.ts`, ajouter une entrée au tableau `CONVERSIONS` :

```ts
{
  slug: "mon-outil",
  title: "Source → Destination",
  description: "Description courte de la conversion",
  from: "Format source",
  to: "Format destination",
}
```

Le `slug` détermine l'URL (`/conversions/mon-outil`) et les noms de dossiers.

### 2. Créer la logique métier

Créer le dossier `src/lib/conversions/mon-outil/` avec les fichiers nécessaires (parser, convertisseur, types…). Ajouter les tests dans `__tests__/`.

### 3. Créer les composants

Créer le dossier `src/components/conversions/mon-outil/` avec les composants React de la conversion. Le composant principal est la page complète (upload, options, aperçu, téléchargement).

### 4. Créer la route

Créer `src/app/conversions/mon-outil/page.tsx` qui importe et affiche le composant principal :

```tsx
import MonOutilPage from "@/components/conversions/mon-outil/mon-outil-page";

export default function Page() {
  return <MonOutilPage />;
}
```

La homepage affichera automatiquement la nouvelle conversion grâce au registre.

## Conversions existantes

- **Valkenpower → Dolibarr** (`valkenpower-dolibarr`) : convertit les exports XML Valkenpower en Excel importable dans Dolibarr 22. Inclut des options de modification de références et de prix (HT/TTC) avec recalcul automatique via le taux TVA.
- **Modification de références** (`modification-refs`) : modifie des références produit en masse (préfixe, suffixe, chercher/remplacer, regex) et génère un Excel avec Ref / Nouvelle Ref pour import Dolibarr.
- **Modification de prix** (`modification-prix`) : modifie des prix en masse à partir d'un fichier Excel Dolibarr ou d'un collé texte (ref + prix). Supporte les opérations fixe et pourcentage, le choix de la cible HT ou TTC avec recalcul automatique du prix complémentaire via le taux TVA. Génère un Excel au format Dolibarr (Ref, Prix HT, Prix min, Prix TTC, Taux TVA, PriceBaseType).