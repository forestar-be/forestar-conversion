"use client";

import { ValkenProduct } from "@/lib/conversions/valkenpower-dolibarr/xml-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

interface ProductPreviewProps {
  products: ValkenProduct[];
  className?: string;
}

export function ProductPreview({ products, className }: ProductPreviewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.model?.toLowerCase().includes(q) ||
        p.titleEN?.toLowerCase().includes(q) ||
        p.titleNL?.toLowerCase().includes(q) ||
        p.titleFR?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const displayed = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg">
            Aperçu des produits
            <Badge variant="secondary" className="ml-2">
              {filtered.length !== products.length
                ? `${filtered.length} / ${products.length}`
                : products.length}
            </Badge>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrer par réf, titre, code-barres…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 w-64 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1 min-h-0">
        <div className="overflow-auto flex-1 min-h-0 rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Réf</TableHead>
                <TableHead>Titre (EN)</TableHead>
                <TableHead className="w-[120px]">Code-barres</TableHead>
                <TableHead className="text-right w-[80px]">Prix HT</TableHead>
                <TableHead className="text-right w-[80px]">Poids</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map((p, i) => (
                  <TableRow key={`${p.model}-${safePage}-${i}`}>
                    <TableCell className="font-mono text-xs">
                      {p.model}
                    </TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate">
                      {p.titleEN || p.titleNL}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.barcode || <span className="text-destructive">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.priceEXVAT ? `€${p.priceEXVAT}` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {p.packWeight > 0
                        ? `${p.packWeight}kg`
                        : p.prodWeight > 0
                          ? `${p.prodWeight}kg`
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {safePage * PAGE_SIZE + 1}–
              {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} sur{" "}
              {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 0}
              >
                <ChevronLeft />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(
                  (i) =>
                    i === 0 ||
                    i === totalPages - 1 ||
                    Math.abs(i - safePage) <= 1,
                )
                .reduce<(number | "ellipsis")[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1)
                    acc.push("ellipsis");
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`e-${idx}`}
                      className="px-1 text-muted-foreground"
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === safePage ? "default" : "outline"}
                      size="icon-xs"
                      onClick={() => setPage(item)}
                    >
                      {item + 1}
                    </Button>
                  ),
                )}
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
