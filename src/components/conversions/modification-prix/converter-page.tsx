"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  applyToPrices,
  PriceModificationResult,
  PriceRow,
} from "@/lib/conversions/modification-prix/price-modifier";
import {
  parsePricesFromText,
  parsePricesFromExcel,
  parsePricesFromZip,
  TextPricePair,
} from "@/lib/conversions/modification-prix/price-input-parser";
import { generateExcel } from "@/lib/conversions/modification-prix/excel-generator";
import { useHeaderConfig } from "@/components/header-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PriceOperationForm,
  PriceOperationState,
  DEFAULT_PRICE_OPERATION_STATE,
  buildPriceOperation,
} from "@/components/ui/price-operation-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  DollarSign,
  FileSpreadsheet,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 20;

export default function ConverterPage() {
  // Input state
  const [textPairs, setTextPairs] = useState<TextPricePair[]>([]);
  const [fileRows, setFileRows] = useState<PriceRow[]>([]);
  const [inputMode, setInputMode] = useState<"text" | "file" | null>(null);
  const [textInput, setTextInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings for text mode (file mode reads these from the data)
  const [tvaRate, setTvaRate] = useState("21.0");
  const [priceBaseType, setPriceBaseType] = useState<"HT" | "TTC">("HT");

  // Operation + UI state
  const [priceOpState, setPriceOpState] = useState<PriceOperationState>(
    DEFAULT_PRICE_OPERATION_STATE,
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { setConfig } = useHeaderConfig();

  // Derive PriceRow[] from input mode
  const priceRows: PriceRow[] = useMemo(() => {
    if (inputMode === "file") return fileRows;
    if (inputMode === "text") {
      return textPairs.map((p) => ({
        ref: p.ref,
        priceHT: priceOpState.target === "HT" ? p.price : "",
        priceTTC: priceOpState.target === "TTC" ? p.price : "",
        priceMin: "",
        tvaRate,
        priceBaseType,
      }));
    }
    return [];
  }, [
    inputMode,
    fileRows,
    textPairs,
    priceOpState.target,
    tvaRate,
    priceBaseType,
  ]);

  const hasData = priceRows.length > 0;

  const handleReset = useCallback(() => {
    setTextPairs([]);
    setFileRows([]);
    setInputMode(null);
    setTextInput("");
    setFileName(null);
    setError(null);
    setPriceOpState(DEFAULT_PRICE_OPERATION_STATE);
    setSearch("");
    setPage(0);
  }, []);

  useEffect(() => {
    setConfig({
      title: "Modification de prix",
      subtitle: "Modifier des prix en masse",
      rightContent: hasData ? (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Recommencer
        </Button>
      ) : undefined,
    });
    return () => setConfig({});
  }, [setConfig, hasData, handleReset]);

  const operation = useMemo(
    () => buildPriceOperation(priceOpState),
    [priceOpState],
  );

  const results: PriceModificationResult[] = useMemo(() => {
    if (priceRows.length === 0 || !operation) return [];
    return applyToPrices(priceRows, operation, priceOpState.target);
  }, [priceRows, operation, priceOpState.target]);

  const changedCount = results.filter((r) => r.changed).length;

  const filtered = useMemo(() => {
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter((r) => r.ref.toLowerCase().includes(q));
  }, [results, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const displayed = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  const handleTextSubmit = useCallback(() => {
    setError(null);
    const parsed = parsePricesFromText(textInput);
    if (parsed.length === 0) {
      setError(
        "Aucune donnée trouvée. Format attendu : une ligne par produit avec REF<tab>PRIX.",
      );
      return;
    }
    setTextPairs(parsed);
    setInputMode("text");
    setFileName(null);
  }, [textInput]);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      let parsed: PriceRow[];

      if (file.name.endsWith(".zip")) {
        parsed = await parsePricesFromZip(buffer);
      } else {
        parsed = parsePricesFromExcel(buffer);
      }

      if (parsed.length === 0) {
        setError(
          "Aucune donnée trouvée. Vérifiez que le fichier contient une colonne « Ref » et au moins une colonne prix.",
        );
        return;
      }
      setFileRows(parsed);
      setInputMode("file");
      setFileName(file.name);
    } catch {
      setError("Erreur lors de la lecture du fichier.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload],
  );

  const handleDownload = useCallback(() => {
    if (results.length === 0) return;
    const buffer = generateExcel(results);
    const blob = new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modification_prix.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  // Determine which price columns have data
  const hasHT = priceRows.some((r) => r.priceHT !== "");
  const hasTTC = priceRows.some((r) => r.priceTTC !== "");
  const hasMin = priceRows.some((r) => r.priceMin !== "");

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Step 1: Input */}
      {!hasData && (
        <>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>

          <div className="max-w-xl mx-auto space-y-4">
            <div className="text-center space-y-2">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">Importer des prix</h2>
              <p className="text-sm text-muted-foreground">
                Collez des lignes REF + Prix (séparés par tabulation) ou
                importez un fichier Excel / ZIP Dolibarr.
              </p>
            </div>

            <Tabs defaultValue="paste">
              <TabsList className="w-full">
                <TabsTrigger value="paste" className="flex-1">
                  <DollarSign className="h-4 w-4 mr-1.5" />
                  Coller
                </TabsTrigger>
                <TabsTrigger value="file" className="flex-1">
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                  Fichier
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-3 mt-3">
                <Textarea
                  placeholder={
                    "REF001\t100.00\nREF002\t200.50\nREF003\t50.00\n…"
                  }
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-full"
                >
                  Charger les données
                </Button>
              </TabsContent>

              <TabsContent value="file" className="mt-3">
                <Card
                  className="relative border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Glisser-déposer un fichier Excel (.xlsx) ou ZIP
                      </p>
                      <p className="text-xs text-muted-foreground/75 mt-1">
                        Compatible avec l&apos;export Valkenpower → Dolibarr
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.zip"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 2: Configure + Preview */}
      {hasData && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
            {fileName && (
              <Badge variant="outline" className="text-sm py-1 px-3">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                {fileName}
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm py-1 px-3">
              {priceRows.length} produit{priceRows.length > 1 ? "s" : ""}
            </Badge>
            {operation && (
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {changedCount} modifié{changedCount > 1 ? "s" : ""}
              </Badge>
            )}
            {operation && results.length > 0 && (
              <Button onClick={handleDownload} size="sm" className="ml-auto">
                <Download className="h-4 w-4 mr-2" />
                Télécharger Excel
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Opération</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PriceOperationForm
                  state={priceOpState}
                  onChange={setPriceOpState}
                />

                {/* Text mode: TVA + PriceBaseType settings */}
                {inputMode === "text" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="mp-tva">Taux TVA (%)</Label>
                      <Select value={tvaRate} onValueChange={setTvaRate}>
                        <SelectTrigger id="mp-tva">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="21.0">21%</SelectItem>
                          <SelectItem value="12.0">12%</SelectItem>
                          <SelectItem value="6.0">6%</SelectItem>
                          <SelectItem value="0.0">0%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mp-base">Base de prix</Label>
                      <Select
                        value={priceBaseType}
                        onValueChange={(v) =>
                          setPriceBaseType(v as "HT" | "TTC")
                        }
                      >
                        <SelectTrigger id="mp-base">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HT">HT</SelectItem>
                          <SelectItem value="TTC">TTC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {!operation && priceOpState.value === "" && (
                  <p className="text-xs text-muted-foreground">
                    Renseignez la valeur pour voir l&apos;aperçu.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="text-lg">
                    Aperçu
                    <Badge variant="secondary" className="ml-2">
                      {filtered.length !== results.length
                        ? `${filtered.length} / ${results.length}`
                        : results.length}
                    </Badge>
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filtrer…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(0);
                      }}
                      className="h-8 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1 min-h-0">
                <div className="overflow-auto flex-1 min-h-0 rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref</TableHead>
                        {hasHT && (
                          <TableHead className="text-right">Prix HT</TableHead>
                        )}
                        {hasMin && (
                          <TableHead className="text-right">Prix Min</TableHead>
                        )}
                        {hasTTC && (
                          <TableHead className="text-right">Prix TTC</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayed.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              1 +
                              (hasHT ? 1 : 0) +
                              (hasMin ? 1 : 0) +
                              (hasTTC ? 1 : 0)
                            }
                            className="text-center text-muted-foreground py-8"
                          >
                            {!operation
                              ? "Configurez une opération pour voir l'aperçu"
                              : "Aucun résultat"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayed.map((r, i) => (
                          <TableRow key={`${r.ref}-${safePage}-${i}`}>
                            <TableCell className="font-mono text-xs">
                              {r.ref}
                            </TableCell>
                            {hasHT && (
                              <TableCell
                                className={`font-mono text-xs text-right ${r.priceHT !== r.originalPriceHT ? "text-green-700 font-medium" : ""}`}
                              >
                                {r.priceHT}
                              </TableCell>
                            )}
                            {hasMin && (
                              <TableCell
                                className={`font-mono text-xs text-right ${r.priceMin !== r.originalPriceMin ? "text-green-700 font-medium" : ""}`}
                              >
                                {r.priceMin}
                              </TableCell>
                            )}
                            {hasTTC && (
                              <TableCell
                                className={`font-mono text-xs text-right ${r.priceTTC !== r.originalPriceTTC ? "text-green-700 font-medium" : ""}`}
                              >
                                {r.priceTTC}
                              </TableCell>
                            )}
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
                      {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}{" "}
                      sur {filtered.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(safePage - 1)}
                        disabled={safePage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-2 text-muted-foreground">
                        {safePage + 1} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(safePage + 1)}
                        disabled={safePage >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
