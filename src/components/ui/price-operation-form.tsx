"use client";

import { useMemo } from "react";
import {
  PriceOperation,
  PriceOperationType,
  PriceTarget,
} from "@/lib/conversions/modification-prix/price-modifier";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPERATION_LABELS: Record<PriceOperationType, string> = {
  "increase-fixed": "Augmenter (montant fixe)",
  "decrease-fixed": "Réduire (montant fixe)",
  "increase-percent": "Augmenter (pourcentage)",
  "decrease-percent": "Réduire (pourcentage)",
};

const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring";

export interface PriceOperationState {
  operationType: PriceOperationType;
  value: string;
  target: PriceTarget;
}

export const DEFAULT_PRICE_OPERATION_STATE: PriceOperationState = {
  operationType: "increase-percent",
  value: "",
  target: "HT",
};

export function buildPriceOperation(
  state: PriceOperationState,
): PriceOperation | null {
  const num = parseFloat(state.value);
  if (isNaN(num) || num < 0) return null;

  switch (state.operationType) {
    case "increase-fixed":
      return { type: "increase-fixed", amount: num };
    case "decrease-fixed":
      return { type: "decrease-fixed", amount: num };
    case "increase-percent":
      return { type: "increase-percent", percent: num };
    case "decrease-percent":
      return { type: "decrease-percent", percent: num };
  }
}

export function usePriceOperation(
  state: PriceOperationState,
): PriceOperation | null {
  return useMemo(() => buildPriceOperation(state), [state]);
}

interface PriceOperationFormProps {
  state: PriceOperationState;
  onChange: (state: PriceOperationState) => void;
  idPrefix?: string;
}

export function PriceOperationForm({
  state,
  onChange,
  idPrefix = "price-op",
}: PriceOperationFormProps) {
  const { operationType, value, target } = state;
  const isPercent =
    operationType === "increase-percent" ||
    operationType === "decrease-percent";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-target`}>Prix cible</Label>
        <Select
          value={target}
          onValueChange={(v) =>
            onChange({ ...state, target: v as PriceTarget })
          }
        >
          <SelectTrigger id={`${idPrefix}-target`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HT">HT (hors taxes)</SelectItem>
            <SelectItem value="TTC">TTC (taxes comprises)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <Select
          value={operationType}
          onValueChange={(v) => {
            onChange({
              operationType: v as PriceOperationType,
              value: "",
              target,
            });
          }}
        >
          <SelectTrigger id={`${idPrefix}-type`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OPERATION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-value`}>
          {isPercent ? "Pourcentage (%)" : "Montant (€)"}
        </Label>
        <input
          id={`${idPrefix}-value`}
          type="number"
          min="0"
          step={isPercent ? "0.1" : "0.01"}
          value={value}
          onChange={(e) => onChange({ ...state, value: e.target.value })}
          placeholder={isPercent ? "ex: 10" : "ex: 5.00"}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}
