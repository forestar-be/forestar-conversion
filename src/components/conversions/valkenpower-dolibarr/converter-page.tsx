"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  parseValkenXml,
  ValkenProduct,
} from "@/lib/conversions/valkenpower-dolibarr/xml-parser";
import {
  convertToExcel,
  ConversionOptions,
  ConversionResult,
  DEFAULT_OPTIONS,
  MAX_ROWS_PER_FILE,
} from "@/lib/conversions/valkenpower-dolibarr/excel-converter";
import { FileDropZone } from "@/components/conversions/valkenpower-dolibarr/file-drop-zone";
import { ConversionOptionsForm } from "@/components/conversions/valkenpower-dolibarr/conversion-options-form";
import { ProductPreview } from "@/components/conversions/valkenpower-dolibarr/product-preview";
import { ExcelPreview } from "@/components/conversions/valkenpower-dolibarr/excel-preview";
import { WarningsPanel } from "@/components/conversions/valkenpower-dolibarr/warnings-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import Link from "next/link";

export default function ConverterPage() {
  const [products, setProducts] = useState<ValkenProduct[]>([]);
  const [options, setOptions] = useState<ConversionOptions>(DEFAULT_OPTIONS);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [xmlFileName, setXmlFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const excelPreviewRef = useRef<HTMLDivElement>(null);
  const { setConfig } = useHeaderConfig();

  const handleReset = useCallback(() => {
    setProducts([]);
    setResult(null);
    setXmlFileName("");
    setError(null);
    setOptions(DEFAULT_OPTIONS);
  }, []);

  useEffect(() => {
    setConfig({
      title: "Valkenpower → Dolibarr",
      subtitle: "XML → Excel Dolibarr 22",
      rightContent:
        products.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        ) : undefined,
    });
    return () => setConfig({});
  }, [setConfig, products.length, handleReset]);

  const handleFileLoaded = useCallback((content: string, fileName: string) => {
    setError(null);
    setResult(null);
    try {
      const parsed = parseValkenXml(content);
      if (parsed.length === 0) {
        setError("Aucun produit trouvé dans le XML.");
        return;
      }
      setProducts(parsed);
      setXmlFileName(fileName);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erreur lors du parsing du XML.",
      );
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (products.length === 0) return;
    setError(null);
    setIsConverting(true);
    try {
      const convResult = await convertToExcel(products, options);
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
  }, [products, options]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const baseName = xmlFileName.replace(/\.xml$/i, "");

    if (result.isZip) {
      const blob = new Blob([result.buffer.buffer as ArrayBuffer], {
        type: "application/zip",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}_dolibarr.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([result.buffer.buffer as ArrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}_dolibarr.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [result, xmlFileName]);

  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Step 1: File upload */}
        {products.length === 0 && (
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
                  Importer un fichier XML Valkenpower
                </h2>
                <p className="text-sm text-muted-foreground">
                  Le fichier sera lu localement dans votre navigateur. Aucune
                  donnée n&apos;est envoyée à un serveur.
                </p>
              </div>
              <FileDropZone onFileLoaded={handleFileLoaded} />
            </div>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 2: Configure + Preview + Convert */}
        {products.length > 0 && (
          <div className="space-y-6">
            {/* Toolbar: back + stats + convert */}
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
                {xmlFileName}
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {products.length} produits
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {products.filter((p) => p.barcode).length} avec code-barres
              </Badge>
              <Badge variant="secondary" className="text-sm py-1 px-3">
                {products.filter((p) => p.priceEXVAT).length} avec prix
              </Badge>
              <Button onClick={handleConvert} size="sm" className="ml-auto">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Convertir en Excel
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
              {/* Left: Options */}
              <div className="flex flex-col gap-4">
                <ConversionOptionsForm
                  options={options}
                  onChange={setOptions}
                  className="flex-1"
                />
              </div>

              {/* Right: Preview */}
              <div className="lg:col-span-3 min-w-0">
                <ProductPreview products={products} className="h-full" />
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
                        archive ZIP. Importez chaque fichier séparément dans
                        Dolibarr.
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
