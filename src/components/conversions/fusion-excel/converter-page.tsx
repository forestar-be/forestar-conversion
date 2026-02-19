"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  parseFile,
  ParsedSheet,
} from "@/lib/conversions/fusion-excel/excel-parser";
import {
  mergeSheets,
  generateExcel,
  MergeResult,
  ColumnMapping,
  GenerateResult,
  isDolibarrFormat,
  MAX_ROWS_PER_FILE,
} from "@/lib/conversions/fusion-excel/excel-merger";
import { useHeaderConfig } from "@/components/header-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  RotateCcw,
  ArrowLeft,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Merge,
  AlertTriangle,
  Archive,
  Info,
} from "lucide-react";
import Link from "next/link";

const PAGE_SIZE = 20;
const UNMAPPED = "__none__";

export default function ConverterPage() {
  // Files
  const [baseData, setBaseData] = useState<ParsedSheet | null>(null);
  const [sourceData, setSourceData] = useState<ParsedSheet | null>(null);
  const [baseFileName, setBaseFileName] = useState<string>("");
  const [sourceFileName, setSourceFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Config
  const [baseKeyCol, setBaseKeyCol] = useState<number>(0);
  const [sourceKeyCol, setSourceKeyCol] = useState<number>(0);
  /** Map of base column index → source column index (or UNMAPPED) */
  const [columnMap, setColumnMap] = useState<Record<number, string>>({});

  // Output
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(
    null,
  );

  // UI
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);
  const { setConfig } = useHeaderConfig();

  const hasData = baseData !== null && sourceData !== null;

  const handleReset = useCallback(() => {
    setBaseData(null);
    setSourceData(null);
    setBaseFileName("");
    setSourceFileName("");
    setError(null);
    setBaseKeyCol(0);
    setSourceKeyCol(0);
    setColumnMap({});
    setGenerateResult(null);
    setSearch("");
    setPage(0);
    setShowSplitConfirm(false);
  }, []);

  useEffect(() => {
    setConfig({
      title: "Fusion de fichiers Excel",
      subtitle: "Remplacer des colonnes depuis un autre fichier",
      rightContent: hasData ? (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Recommencer
        </Button>
      ) : undefined,
    });
    return () => setConfig({});
  }, [setConfig, hasData, handleReset]);

  // Auto-detect likely key columns when files are loaded
  const detectKeyCol = useCallback((headers: string[]): number => {
    const refPatterns = [/\(p\.ref\)/i, /^réf/i, /^ref/i];
    for (const p of refPatterns) {
      const idx = headers.findIndex((h) => p.test(h));
      if (idx !== -1) return idx;
    }
    return 0;
  }, []);

  const handleBaseFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const parsed = await parseFile(buffer, file.name);
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setError("Le fichier de base ne contient aucune donnée.");
          return;
        }
        setBaseData(parsed);
        setBaseFileName(file.name);
        setBaseKeyCol(detectKeyCol(parsed.headers));
        setColumnMap({});
      } catch {
        setError("Erreur lors de la lecture du fichier de base.");
      }
    },
    [detectKeyCol],
  );

  const handleSourceFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const parsed = await parseFile(buffer, file.name);
        if (parsed.headers.length === 0 || parsed.rows.length === 0) {
          setError("Le fichier source ne contient aucune donnée.");
          return;
        }
        setSourceData(parsed);
        setSourceFileName(file.name);
        setSourceKeyCol(detectKeyCol(parsed.headers));
        setColumnMap({});
      } catch {
        setError("Erreur lors de la lecture du fichier source.");
      }
    },
    [detectKeyCol],
  );

  // Build mappings from UI state
  const mappings: ColumnMapping[] = useMemo(() => {
    return Object.entries(columnMap)
      .filter(([, v]) => v !== UNMAPPED)
      .map(([baseIdx, sourceIdx]) => ({
        baseColIndex: Number(baseIdx),
        sourceColIndex: Number(sourceIdx),
      }));
  }, [columnMap]);

  // Live merge result
  const mergeResult: MergeResult | null = useMemo(() => {
    if (!baseData || !sourceData || mappings.length === 0) return null;
    return mergeSheets(baseData, sourceData, {
      baseKeyCol,
      sourceKeyCol,
      mappings,
    });
  }, [baseData, sourceData, baseKeyCol, sourceKeyCol, mappings]);

  // For preview: use merge result if available, otherwise base data
  const previewHeaders = mergeResult?.headers ?? baseData?.headers ?? [];
  const previewRows = mergeResult?.rows ?? baseData?.rows ?? [];

  // Filter + paginate
  const filtered = useMemo(() => {
    if (!search.trim()) return previewRows;
    const q = search.toLowerCase();
    return previewRows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q)),
    );
  }, [previewRows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const displayed = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );

  // Detect if the base file uses Dolibarr headers
  const isDolibarr = useMemo(
    () => (baseData ? isDolibarrFormat(baseData.headers) : false),
    [baseData],
  );

  // Whether the result needs splitting
  const needsSplit =
    isDolibarr && (mergeResult?.totalRows ?? 0) > MAX_ROWS_PER_FILE;

  const doGenerate = useCallback(async () => {
    if (!mergeResult) return;
    const result = await generateExcel(mergeResult);
    setGenerateResult(result);

    // Auto-download
    const baseName = baseFileName.replace(/\.(xlsx|zip)$/i, "");
    const blob = new Blob([result.buffer as BlobPart], {
      type: result.isZip
        ? "application/zip"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_fusion.${result.isZip ? "zip" : "xlsx"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mergeResult, baseFileName]);

  const handleDownload = useCallback(() => {
    if (!mergeResult) return;
    if (needsSplit && !generateResult) {
      setShowSplitConfirm(true);
      return;
    }
    doGenerate();
  }, [mergeResult, needsSplit, generateResult, doGenerate]);

  const handleConfirmSplit = useCallback(() => {
    setShowSplitConfirm(false);
    doGenerate();
  }, [doGenerate]);

  // Set which base columns are mapped
  const mappedBaseCols = new Set(mappings.map((m) => m.baseColIndex));

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Step 1: File uploads */}
      {!hasData && (
        <>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>

          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <Merge className="h-12 w-12 mx-auto text-muted-foreground" />
              <h2 className="text-lg font-semibold">
                Fusionner deux fichiers Excel
              </h2>
              <p className="text-sm text-muted-foreground">
                Importez un fichier de base (à modifier) et un fichier source
                (contenant les nouvelles valeurs).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Base file */}
              <FileUploadCard
                title="Fichier de base"
                description="Le fichier Excel/ZIP à modifier (ex: export Dolibarr)"
                fileName={baseFileName}
                onFile={handleBaseFile}
                accept=".xlsx,.zip"
                loaded={baseData !== null}
                rowCount={baseData?.rows.length}
                colCount={baseData?.headers.length}
              />

              {/* Source file */}
              <FileUploadCard
                title="Fichier source"
                description="Le fichier contenant les valeurs de remplacement"
                fileName={sourceFileName}
                onFile={handleSourceFile}
                accept=".xlsx,.zip"
                loaded={sourceData !== null}
                rowCount={sourceData?.rows.length}
                colCount={sourceData?.headers.length}
              />
            </div>
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
          {/* Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
            <Badge variant="outline" className="text-sm py-1 px-3">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              {baseFileName}
            </Badge>
            <Badge variant="outline" className="text-sm py-1 px-3">
              ← {sourceFileName}
            </Badge>
            <Badge variant="secondary" className="text-sm py-1 px-3">
              {baseData!.rows.length} lignes
            </Badge>
            {mergeResult && (
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {mergeResult.matchedCount} correspondance
                {mergeResult.matchedCount > 1 ? "s" : ""}
              </Badge>
            )}
            {mergeResult && mergeResult.unmatchedCount > 0 && (
              <Badge
                variant="secondary"
                className="text-sm py-1 px-3 text-amber-600"
              >
                {mergeResult.unmatchedCount} sans correspondance
              </Badge>
            )}
            {mergeResult && (
              <Button onClick={handleDownload} size="sm" className="ml-auto">
                {generateResult?.isZip ? (
                  <Archive className="h-4 w-4 mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger {generateResult?.isZip ? "ZIP" : "Excel"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Left: Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Key column selectors */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Colonne de référence</h3>
                  <div className="space-y-2">
                    <Label htmlFor="base-key" className="text-xs">
                      Dans le fichier de base
                    </Label>
                    <Select
                      value={String(baseKeyCol)}
                      onValueChange={(v) => setBaseKeyCol(Number(v))}
                    >
                      <SelectTrigger id="base-key">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {baseData!.headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {h || `Colonne ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-key" className="text-xs">
                      Dans le fichier source
                    </Label>
                    <Select
                      value={String(sourceKeyCol)}
                      onValueChange={(v) => setSourceKeyCol(Number(v))}
                    >
                      <SelectTrigger id="source-key">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceData!.headers.map((h, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {h || `Colonne ${i + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Column mappings */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Colonnes à remplacer</h3>
                  <p className="text-xs text-muted-foreground">
                    Pour chaque colonne du fichier de base, choisissez quelle
                    colonne source doit la remplacer.
                  </p>
                  <div className="space-y-2">
                    {baseData!.headers.map((header, baseIdx) => (
                      <div
                        key={baseIdx}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-1/2 truncate font-mono"
                          title={header}
                        >
                          {header || `Col ${baseIdx + 1}`}
                        </span>
                        <span className="text-muted-foreground">←</span>
                        <Select
                          value={columnMap[baseIdx] ?? UNMAPPED}
                          onValueChange={(v) =>
                            setColumnMap((prev) => ({ ...prev, [baseIdx]: v }))
                          }
                        >
                          <SelectTrigger className="h-7 text-xs flex-1 min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNMAPPED}>
                              — ne pas remplacer —
                            </SelectItem>
                            {sourceData!.headers.map((sh, si) => (
                              <SelectItem key={si} value={String(si)}>
                                {sh || `Col ${si + 1}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>

                {mappings.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sélectionnez au moins une colonne à remplacer pour lancer la
                    fusion.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Right: Preview */}
            <Card className="lg:col-span-3 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <CardTitle className="text-lg">
                    Aperçu
                    <Badge variant="secondary" className="ml-2">
                      {filtered.length !== previewRows.length
                        ? `${filtered.length} / ${previewRows.length}`
                        : previewRows.length}
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
                <ScrollArea className="flex-1 min-h-0">
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewHeaders.map((h, i) => (
                            <TableHead
                              key={i}
                              className={`whitespace-nowrap text-xs ${mappedBaseCols.has(i) ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                            >
                              {h || `Col ${i + 1}`}
                              {mappedBaseCols.has(i) && (
                                <span className="ml-1 text-blue-500">●</span>
                              )}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayed.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={previewHeaders.length}
                              className="text-center text-muted-foreground py-8"
                            >
                              Aucun résultat
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayed.map((row, ri) => {
                            // Check if this row was modified
                            const baseRow =
                              baseData?.rows[previewRows.indexOf(row)];
                            return (
                              <TableRow key={`${safePage}-${ri}`}>
                                {previewHeaders.map((_, ci) => {
                                  const wasModified =
                                    mappedBaseCols.has(ci) &&
                                    baseRow &&
                                    row[ci] !== baseRow[ci];
                                  return (
                                    <TableCell
                                      key={ci}
                                      className={`font-mono text-xs whitespace-nowrap max-w-[200px] truncate ${wasModified ? "text-green-700 dark:text-green-400 font-medium" : ""}`}
                                      title={row[ci] ?? ""}
                                    >
                                      {row[ci] ?? ""}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>

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

          {/* Unmatched refs warning */}
          {mergeResult &&
            mergeResult.unmatchedRefs.length > 0 &&
            mergeResult.unmatchedRefs.length <= 50 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">
                    {mergeResult.unmatchedRefs.length} référence
                    {mergeResult.unmatchedRefs.length > 1 ? "s" : ""} sans
                    correspondance
                  </span>{" "}
                  (valeurs originales conservées) :{" "}
                  <span className="font-mono text-xs">
                    {mergeResult.unmatchedRefs.slice(0, 20).join(", ")}
                    {mergeResult.unmatchedRefs.length > 20 ? "…" : ""}
                  </span>
                </AlertDescription>
              </Alert>
            )}

          {/* ZIP split info */}
          {generateResult?.isZip && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Le fichier contient plus de {MAX_ROWS_PER_FILE} lignes. Pour
                éviter les problèmes d&apos;import dans Dolibarr, les données
                ont été divisées en {generateResult.fileCount} fichiers Excel
                regroupés dans une archive ZIP. Importez chaque fichier
                séparément dans Dolibarr.
              </AlertDescription>
            </Alert>
          )}

          {/* Split confirmation modal */}
          <Dialog open={showSplitConfirm} onOpenChange={setShowSplitConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Fichier trop volumineux pour Dolibarr
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2 pt-2">
                    <p>
                      Le fichier contient{" "}
                      <span className="font-medium text-foreground">
                        {mergeResult?.totalRows} lignes
                      </span>{" "}
                      avec des colonnes Dolibarr. Les fichiers Excel trop
                      volumineux posent des problèmes à l&apos;import.
                    </p>
                    <p>
                      Le résultat sera découpé en{" "}
                      <span className="font-medium text-foreground">
                        {Math.ceil(
                          (mergeResult?.totalRows ?? 0) / MAX_ROWS_PER_FILE,
                        )}{" "}
                        fichiers
                      </span>{" "}
                      de {MAX_ROWS_PER_FILE} lignes max, regroupés dans une
                      archive ZIP. Vous devrez importer chaque fichier
                      séparément dans Dolibarr.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowSplitConfirm(false)}
                >
                  Annuler
                </Button>
                <Button onClick={handleConfirmSplit}>
                  <Archive className="h-4 w-4 mr-2" />
                  Télécharger le ZIP
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

// ─── FileUploadCard ─────────────────────────────────────────────────────────

interface FileUploadCardProps {
  title: string;
  description: string;
  fileName: string;
  onFile: (file: File) => void;
  accept: string;
  loaded: boolean;
  rowCount?: number;
  colCount?: number;
}

function FileUploadCard({
  title,
  description,
  fileName,
  onFile,
  accept,
  loaded,
  rowCount,
  colCount,
}: FileUploadCardProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <Card
      className={`relative border-2 transition-colors ${loaded ? "border-green-500/50 bg-green-50/30 dark:bg-green-950/10" : "border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer"}`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <CardContent className="flex flex-col items-center justify-center py-8 gap-3">
        {loaded ? (
          <>
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div className="text-center">
              <p className="text-sm font-medium">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {rowCount} lignes · {colCount} colonnes
              </p>
            </div>
            <Button variant="outline" size="sm" className="relative">
              Changer de fichier
              <input
                type="file"
                accept={accept}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Button>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            </div>
            <input
              type="file"
              accept={accept}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFile(file);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
