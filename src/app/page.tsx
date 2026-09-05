import { ArrowUpRight } from "lucide-react";

const ERP_URL = "https://gestion.forestar.be";

export default function Home() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">
          Ces outils sont maintenant dans Dolibarr
        </h1>
        <p className="text-muted-foreground">
          Les conversions de fichiers qui vivaient ici ont été reprises
          directement dans l&apos;ERP. Il n&apos;y a plus de fichier
          intermédiaire à produire puis à réimporter : on dépose le fichier dans
          Dolibarr, on regarde ce qui va changer, et on applique.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">Où aller maintenant</p>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>
            Les tarifs fournisseurs — Valkenpower compris — passent par
            l&apos;import fournisseur.
          </li>
          <li>
            Les modifications de références et de prix en masse, ainsi que la
            reprise de champs depuis un fichier, sont des onglets des outils de
            catalogue.
          </li>
        </ul>
        <a
          href={ERP_URL}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Ouvrir Dolibarr
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <p className="text-xs text-muted-foreground">
        Cette page ne fait plus rien d&apos;autre que vous rediriger. Si vous
        cherchiez un outil qui n&apos;est pas listé ci-dessus, demandez — il
        n&apos;a pas été oublié, il a simplement changé de nom.
      </p>
    </div>
  );
}
