"use client";

import {
  ConversionOptions,
  DEFAULT_OPTIONS,
  DescriptionLang,
  WeightSource,
} from "@/lib/conversions/valkenpower-dolibarr/excel-converter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ConversionOptionsFormProps {
  options: ConversionOptions;
  onChange: (options: ConversionOptions) => void;
  className?: string;
}

export function ConversionOptionsForm({
  options,
  onChange,
  className,
}: ConversionOptionsFormProps) {
  const update = <K extends keyof ConversionOptions>(
    key: K,
    value: ConversionOptions[K],
  ) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-lg">Options de conversion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="lang">Langue des libellés</Label>
          <Select
            value={options.descriptionLang}
            onValueChange={(v) =>
              update("descriptionLang", v as DescriptionLang)
            }
          >
            <SelectTrigger id="lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FR">Français</SelectItem>
              <SelectItem value="EN">English</SelectItem>
              <SelectItem value="NL">Nederlands</SelectItem>
              <SelectItem value="DE">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TVA */}
        <div className="space-y-2">
          <Label htmlFor="tva">Taux TVA (%)</Label>
          <Select
            value={options.tvaRate.toString()}
            onValueChange={(v) => update("tvaRate", parseFloat(v))}
          >
            <SelectTrigger id="tva">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="21">21% (standard BE)</SelectItem>
              <SelectItem value="12">12%</SelectItem>
              <SelectItem value="6">6%</SelectItem>
              <SelectItem value="0">0%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price base */}
        <div className="space-y-2">
          <Label htmlFor="priceBase">Base de prix</Label>
          <Select
            value={options.priceBaseType}
            onValueChange={(v) => update("priceBaseType", v as "HT" | "TTC")}
          >
            <SelectTrigger id="priceBase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HT">HT (hors taxes)</SelectItem>
              <SelectItem value="TTC">TTC (taxes comprises)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight">Source du poids</Label>
          <Select
            value={options.weightSource}
            onValueChange={(v) => update("weightSource", v as WeightSource)}
          >
            <SelectTrigger id="weight">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="package">Poids colis (PackWeight)</SelectItem>
              <SelectItem value="product">
                Poids produit (ProdWeight)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle switches */}
        <div className="space-y-3 pt-2">
          <p className="text-sm font-medium text-muted-foreground">
            Colonnes à inclure
          </p>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-barcode">Code-barres</Label>
            <Switch
              id="sw-barcode"
              checked={options.includeBarcode}
              onCheckedChange={(v) => update("includeBarcode", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-weight">Poids</Label>
            <Switch
              id="sw-weight"
              checked={options.includeWeight}
              onCheckedChange={(v) => update("includeWeight", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-dimensions">Dimensions (L x l x H)</Label>
            <Switch
              id="sw-dimensions"
              checked={options.includeDimensions}
              onCheckedChange={(v) => update("includeDimensions", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-url">URL publique (image)</Label>
            <Switch
              id="sw-url"
              checked={options.includeUrl}
              onCheckedChange={(v) => update("includeUrl", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-pricemin">Prix minimum</Label>
            <Switch
              id="sw-pricemin"
              checked={options.includePriceMin}
              onCheckedChange={(v) => update("includePriceMin", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-sell">En vente</Label>
            <Switch
              id="sw-sell"
              checked={options.toSell}
              onCheckedChange={(v) => update("toSell", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sw-buy">En achat</Label>
            <Switch
              id="sw-buy"
              checked={options.toBuy}
              onCheckedChange={(v) => update("toBuy", v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { DEFAULT_OPTIONS };
