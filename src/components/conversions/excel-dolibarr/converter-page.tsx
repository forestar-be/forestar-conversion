"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  parseExcel,
  ParsedExcel,
} from "@/lib/conversions/excel-dolibarr/excel-parser";
import {
  autoDetectMappings,
  ColumnMapping,
  updateMapping,
  DOLIBARR_COLUMNS,
  getMissingRequiredColumns,
  getAvailableTargetColumns,
} from "@/lib/conversions/excel-dolibarr/column-mapper";
import {
  convertToDolibarr,
  ConversionOptions,
  ConversionResult,
  DEFAULT_OPTIONS,
  MAX_ROWS_PER_FILE,
} from "@/lib/conversions/excel-dolibarr/excel-generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefOperationForm,
  RefOperationState,
  DEFAULT_REF_OPERATION_STATE,
  buildOperation,
} from "@/components/ui/ref-operation-form";
import {
  PriceOperationForm,
  PriceOperationState,
  DEFAULT_PRICE_OPERATION_STATE,
  buildPriceOperation,
} from "@/components/ui/price-operation-form";
import { useHeaderConfig } from "@/components/header-context";
import {
  Download,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Archive,
  Info,
  Upload,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ============================================================================
// File Drop Zone for Excel
// ============================================================================

interface ExcelDropZoneProps {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
  disabled?: boolean;
}

function ExcelDropZone({ onFileLoaded, disabled = false }: ExcelDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        onFileLoaded(buffer, file.name);
      };
      reader.readAsArrayBuffer(file);
    },
    [onFileLoaded, disabled],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <Card
      className={`relative border-2 border-dashed transition-colors cursor-pointer ${
        isDragOver
          ? "border-primary bg-primary/5"
          : fileName
            ? "border-green-500 bg-green-500/5"
            : "border-muted-foreground/25 hover:border-primary/50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
        <Upload
          className={`h-10 w-10 ${
            fileName ? "text-green-500" : "text-muted-foreground"
          }`}
        />
        {fileName ? (
          <p className="text-sm text-green-700 font-medium">{fileName}</p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Glisser-déposer un fichier Excel ici
            </p>
            <p className="text-xs text-muted-foreground/75 mt-1">
              ou cliquer pour sélectionner
            </p>
          </div>
        )}
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleInputChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={disabled}
          aria-label="Sélectionner un fichier Excel"
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Column Mapping Editor
// ============================================================================

interface ColumnMappingEditorProps {
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
  sourcePreview: (string | number | null)[][];
}

function ColumnMappingEditor({
  mappings,
  onMappingsChange,
  sourcePreview,
}: ColumnMappingEditorProps) {
  const availableTargets = useMemo(
    () => getAvailableTargetColumns(mappings),
    [mappings],
  );
  const missingRequired = useMemo(
    () => getMissingRequiredColumns(mappings),
    [mappings],
  );

  const handleMappingChange = useCallback(
    (sourceIndex: number, targetId: string | null) => {
      onMappingsChange(updateMapping(mappings, sourceIndex, targetId));
    },
    [mappings, onMappingsChange],
  );

  return (
    <div className="space-y-4">
      {missingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Colonnes obligatoires non mappées :{" "}
            {missingRequired.map((c) => c.label).join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Colonne source</TableHead>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[200px]">Colonne Dolibarr</TableHead>
              <TableHead>Aperçu (3 premières valeurs)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping, idx) => {
              const targetCol = DOLIBARR_COLUMNS.find(
                (c) => c.id === mapping.targetId,
              );
              const preview = sourcePreview
                .slice(0, 3)
                .map((row) => row[mapping.sourceIndex])
                .filter((v) => v !== null && v !== "")
                .map((v) => String(v).substring(0, 30))
                .join(" | ");

              return (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    {mapping.sourceHeader}
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.targetId || "__none__"}
                      onValueChange={(v) =>
                        handleMappingChange(
                          mapping.sourceIndex,
                          v === "__none__" ? null : v,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">
                            — Ignorer —
                          </span>
                        </SelectItem>
                        {targetCol && (
                          <SelectItem value={targetCol.id}>
                            {targetCol.label}
                            {targetCol.required && " *"}
                          </SelectItem>
                        )}
                        {availableTargets.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.label}
                            {col.required && " *"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                    {preview || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// Conversion Options Form
// ============================================================================

interface OptionsFormProps {
  options: ConversionOptions;
  onChange: (options: ConversionOptions) => void;
}

function OptionsForm({ options, onChange }: OptionsFormProps) {
  const [refModifyEnabled, setRefModifyEnabled] = useState(
    !!options.refOperation,
  );
  const [refOpState, setRefOpState] = useState<RefOperationState>(
    DEFAULT_REF_OPERATION_STATE,
  );
  const [priceModifyEnabled, setPriceModifyEnabled] = useState(
    !!options.priceOperation,
  );
  const [priceOpState, setPriceOpState] = useState<PriceOperationState>(
    DEFAULT_PRICE_OPERATION_STATE,
  );

  const handleRefModifyToggle = (enabled: boolean) => {
    setRefModifyEnabled(enabled);
    if (!enabled) {
      onChange({ ...options, refOperation: null });
    } else {
      onChange({ ...options, refOperation: buildOperation(refOpState) });
    }
  };

  const handleRefOpChange = (state: RefOperationState) => {
    setRefOpState(state);
    onChange({ ...options, refOperation: buildOperation(state) });
  };

  const handlePriceModifyToggle = (enabled: boolean) => {
    setPriceModifyEnabled(enabled);
    if (!enabled) {
      onChange({ ...options, priceOperation: null });
    } else {
      onChange({
        ...options,
        priceOperation: buildPriceOperation(priceOpState),
        priceTarget: priceOpState.target,
      });
    }
  };

  const handlePriceOpChange = (state: PriceOperationState) => {
    setPriceOpState(state);
    onChange({
      ...options,
      priceOperation: buildPriceOperation(state),
      priceTarget: state.target,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tvaRate">Taux TVA (%)</Label>
          <Select
            value={options.tvaRate.toFixed(1)}
            onValueChange={(v) =>
              onChange({ ...options, tvaRate: parseFloat(v) })
            }
          >
            <SelectTrigger id="tvaRate">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="21.0">21% (Belgique)</SelectItem>
              <SelectItem value="20.0">20% (France)</SelectItem>
              <SelectItem value="19.0">19%</SelectItem>
              <SelectItem value="6.0">6%</SelectItem>
              <SelectItem value="0.0">0%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priceBaseType">Base de prix</Label>
          <Select
            value={options.priceBaseType}
            onValueChange={(v: "HT" | "TTC") =>
              onChange({ ...options, priceBaseType: v })
            }
          >
            <SelectTrigger id="priceBaseType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HT">HT (hors taxes)</SelectItem>
              <SelectItem value="TTC">TTC (avec taxes)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="productType">Type de produit</Label>
          <Select
            value={options.productType.toString()}
            onValueChange={(v) =>
              onChange({ ...options, productType: parseInt(v) as 0 | 1 })
            }
          >
            <SelectTrigger id="productType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Produit</SelectItem>
              <SelectItem value="1">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="toSell">En vente</Label>
          <Switch
            id="toSell"
            checked={options.toSell}
            onCheckedChange={(v) => onChange({ ...options, toSell: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="toBuy">En achat</Label>
          <Switch
            id="toBuy"
            checked={options.toBuy}
            onCheckedChange={(v) => onChange({ ...options, toBuy: v })}
          />
        </div>

        {/* Ref modification */}
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sw-ref-modify">Modifier les références</Label>
            <Switch
              id="sw-ref-modify"
              checked={refModifyEnabled}
              onCheckedChange={handleRefModifyToggle}
            />
          </div>
          {refModifyEnabled && (
            <RefOperationForm
              state={refOpState}
              onChange={handleRefOpChange}
              idPrefix="ed-ref-op"
            />
          )}
        </div>

        {/* Price modification */}
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="sw-price-modify">Modifier les prix</Label>
            <Switch
              id="sw-price-modify"
              checked={priceModifyEnabled}
              onCheckedChange={handlePriceModifyToggle}
            />
          </div>
          {priceModifyEnabled && (
            <PriceOperationForm
              state={priceOpState}
              onChange={handlePriceOpChange}
              idPrefix="ed-price-op"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Excel Preview
// ============================================================================

interface ExcelPreviewProps {
  headers: string[];
  rows: string[][];
}

function ExcelPreview({ headers, rows }: ExcelPreviewProps) {
  const previewRows = rows.slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Aperçu du fichier de sortie ({rows.length} lignes)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h, i) => (
                  <TableHead key={i} className="whitespace-nowrap text-xs">
                    {h.split(" (")[0]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell
                      key={j}
                      className="whitespace-nowrap text-xs max-w-[200px] truncate"
                    >
                      {cell || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length > 10 && (
                <TableRow>
                  <TableCell
                    colSpan={headers.length}
                    className="text-center text-muted-foreground text-xs"
                  >
                    … et {rows.length - 10} lignes supplémentaires
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Warnings Panel
// ============================================================================

interface WarningsPanelProps {
  warnings: { type: string; row: number; message: string }[];
}

function WarningsPanel({ warnings }: WarningsPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const displayWarnings = expanded ? warnings : warnings.slice(0, 5);

  return (
    <Alert>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">
            {warnings.length} avertissement(s)
          </span>
          {warnings.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Réduire" : `Voir tout (${warnings.length})`}
            </Button>
          )}
        </div>
        <ul className="text-sm space-y-1">
          {displayWarnings.map((w, i) => (
            <li key={i}>{w.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Main Converter Page
// ============================================================================

export default function ConverterPage() {
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [options, setOptions] = useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const excelPreviewRef = useRef<HTMLDivElement>(null);
  const { setConfig } = useHeaderConfig();

  const handleReset = useCallback(() => {
    setParsed(null);
    setMappings([]);
    setResult(null);
    setFileName("");
    setError(null);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  useEffect(() => {
    setConfig({
      title: "Excel → Dolibarr",
      subtitle: "Excel générique → Excel Dolibarr 22",
      rightContent:
        parsed !== null ? (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        ) : undefined,
    });
    return () => setConfig({});
  }, [setConfig, parsed, handleReset]);

  const handleFileLoaded = useCallback((buffer: ArrayBuffer, name: string) => {
    setError(null);
    setResult(null);
    try {
      const parsedData = parseExcel(buffer);
      if (parsedData.rows.length === 0) {
        setError("Aucune donnée trouvée dans le fichier.");
        return;
      }
      setParsed(parsedData);
      setFileName(name);
      // Auto-detect mappings
      const detectedMappings = autoDetectMappings(parsedData.headers);
      setMappings(detectedMappings);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur lors du parsing du fichier.",
      );
    }
  }, []);

  const missingRequired = useMemo(
    () => getMissingRequiredColumns(mappings),
    [mappings],
  );

  const canConvert = parsed !== null && missingRequired.length === 0;

  const handleConvert = useCallback(async () => {
    if (!parsed || !canConvert) return;
    setError(null);
    setIsConverting(true);
    try {
      const convResult = await convertToDolibarr(parsed, mappings, options);
      setResult(convResult);
      setTimeout(() => {
        excelPreviewRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur lors de la conversion.",
      );
    } finally {
      setIsConverting(false);
    }
  }, [parsed, mappings, options, canConvert]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const baseName = fileName.replace(/\.xlsx?$/i, "");
    const isZip = result.isZip;

    const blob = new Blob([result.buffer as BlobPart], {
      type: isZip
        ? "application/zip"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}_dolibarr.${isZip ? "zip" : "xlsx"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, fileName]);

  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Step 1: File upload */}
        {parsed === null && (
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
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-lg font-semibold">
                  Importer un fichier Excel
                </h2>
                <p className="text-sm text-muted-foreground">
                  Le fichier sera lu localement dans votre navigateur. Aucune
                  donnée n&apos;est envoyée à un serveur.
                </p>
              </div>
              <ExcelDropZone onFileLoaded={handleFileLoaded} />
            </div>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 2: Configure mappings + Preview + Convert */}
        {parsed !== null && (
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
                {fileName}
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {parsed.totalRows} lignes
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {parsed.headers.length} colonnes
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                Feuille: {parsed.sheetName}
              </Badge>
              <Button
                onClick={handleConvert}
                size="sm"
                className="ml-auto"
                disabled={!canConvert || isConverting}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Convertir en Excel Dolibarr
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left: Options */}
              <div className="space-y-4">
                <OptionsForm options={options} onChange={setOptions} />
              </div>

              {/* Right: Column Mapping */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Mapping des colonnes
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Associez chaque colonne source à une colonne Dolibarr. Les
                      colonnes obligatoires sont marquées d&apos;un *.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ColumnMappingEditor
                      mappings={mappings}
                      onMappingsChange={setMappings}
                      sourcePreview={parsed.rows}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            {result && (
              <div ref={excelPreviewRef}>
                <ExcelPreview headers={result.headers} rows={result.rows} />
              </div>
            )}

            {/* Result section */}
            {result && (
              <>
                <Separator />

                <div className="space-y-4">
                  {result.warnings.length > 0 && (
                    <WarningsPanel warnings={result.warnings} />
                  )}

                  {result.isZip && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Le fichier contient plus de {MAX_ROWS_PER_FILE}{" "}
                        produits. Pour éviter les problèmes d&apos;import dans
                        Dolibarr, les données ont été divisées en{" "}
                        {result.fileCount} fichiers Excel regroupés dans une
                        archive ZIP.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Card className="border-green-500 bg-green-50">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">
                              Conversion terminée
                            </p>
                            <p className="text-sm text-green-700">
                              {result.totalProducts} produits •{" "}
                              {result.isZip
                                ? `${result.fileCount} fichiers Excel`
                                : `${(result.buffer.byteLength / 1024).toFixed(1)} Ko`}
                            </p>
                          </div>
                        </div>
                        <Button onClick={handleDownload} size="lg">
                          {result.isZip ? (
                            <Archive className="h-4 w-4 mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {result.isZip
                            ? "Télécharger le ZIP"
                            : "Télécharger le Excel"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Loading modal */}
      {isConverting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg p-6 flex flex-col items-center gap-3 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Conversion en cours…</p>
          </div>
        </div>
      )}
    </>
  );
}
