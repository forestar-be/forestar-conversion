"use client";

import { ConversionWarning } from "@/lib/conversions/valkenpower-dolibarr/excel-converter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";

interface WarningsPanelProps {
  warnings: ConversionWarning[];
}

const WARNING_LABELS: Record<ConversionWarning["type"], string> = {
  missing_barcode: "Code-barres manquant",
  missing_title: "Titre manquant",
  missing_price: "Prix manquant",
  duplicate_barcode: "Code-barres dupliqué",
  duplicate_ref: "Référence dupliquée",
};

const WARNING_COLORS: Record<ConversionWarning["type"], string> = {
  missing_barcode: "bg-yellow-100 text-yellow-800",
  missing_title: "bg-orange-100 text-orange-800",
  missing_price: "bg-red-100 text-red-800",
  duplicate_barcode: "bg-red-100 text-red-800",
  duplicate_ref: "bg-red-100 text-red-800",
};

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  // Group by type
  const grouped = warnings.reduce(
    (acc, w) => {
      if (!acc[w.type]) acc[w.type] = [];
      acc[w.type].push(w);
      return acc;
    },
    {} as Record<string, ConversionWarning[]>,
  );

  return (
    <Alert
      variant="destructive"
      className="border-yellow-500 bg-yellow-50 text-yellow-900"
    >
      <AlertTriangle className="h-4 w-4 !text-yellow-600" />
      <AlertTitle className="text-yellow-800">
        {warnings.length} avertissement{warnings.length > 1 ? "s" : ""}
      </AlertTitle>
      <AlertDescription>
        <div className="flex gap-2 mt-2 flex-wrap">
          {Object.entries(grouped).map(([type, items]) => (
            <Badge
              key={type}
              variant="secondary"
              className={WARNING_COLORS[type as ConversionWarning["type"]]}
            >
              {WARNING_LABELS[type as ConversionWarning["type"]]}:{" "}
              {items.length}
            </Badge>
          ))}
        </div>
        <ScrollArea className="mt-3 max-h-48">
          <ul className="text-xs space-y-1">
            {warnings.slice(0, 100).map((w, i) => (
              <li key={i} className="text-yellow-800">
                <span className="font-mono font-medium">{w.model}</span> —{" "}
                {w.message}
              </li>
            ))}
            {warnings.length > 100 && (
              <li className="text-yellow-600 italic">
                … et {warnings.length - 100} autres
              </li>
            )}
          </ul>
        </ScrollArea>
      </AlertDescription>
    </Alert>
  );
}
