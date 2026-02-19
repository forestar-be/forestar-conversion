"use client";

import { useMemo } from "react";
import {
  Operation,
  OperationType,
} from "@/lib/conversions/modification-refs/ref-modifier";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPERATION_LABELS: Record<OperationType, string> = {
  "add-prefix": "Ajouter un préfixe",
  "add-suffix": "Ajouter un suffixe",
  "remove-prefix": "Supprimer un préfixe",
  "remove-suffix": "Supprimer un suffixe",
  "find-replace": "Chercher / Remplacer",
  "regex-replace": "Regex (rechercher / remplacer)",
};

const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring";

export interface RefOperationState {
  operationType: OperationType;
  paramA: string;
  paramB: string;
  regexFlags: string;
}

export const DEFAULT_REF_OPERATION_STATE: RefOperationState = {
  operationType: "add-prefix",
  paramA: "",
  paramB: "",
  regexFlags: "",
};

export function buildOperation(state: RefOperationState): Operation | null {
  const { operationType, paramA, paramB, regexFlags } = state;
  switch (operationType) {
    case "add-prefix":
      return paramA ? { type: "add-prefix", prefix: paramA } : null;
    case "add-suffix":
      return paramA ? { type: "add-suffix", suffix: paramA } : null;
    case "remove-prefix":
      return paramA ? { type: "remove-prefix", prefix: paramA } : null;
    case "remove-suffix":
      return paramA ? { type: "remove-suffix", suffix: paramA } : null;
    case "find-replace":
      return paramA
        ? { type: "find-replace", search: paramA, replace: paramB }
        : null;
    case "regex-replace": {
      if (!paramA) return null;
      try {
        new RegExp(paramA, regexFlags + "g");
      } catch {
        return null;
      }
      return {
        type: "regex-replace",
        pattern: paramA,
        flags: regexFlags,
        replace: paramB,
      };
    }
  }
}

export function useRefOperation(state: RefOperationState): Operation | null {
  return useMemo(() => buildOperation(state), [state]);
}

interface RefOperationFormProps {
  state: RefOperationState;
  onChange: (state: RefOperationState) => void;
  /** Optional prefix for input ids to avoid conflicts when used multiple times */
  idPrefix?: string;
}

export function RefOperationForm({
  state,
  onChange,
  idPrefix = "ref-op",
}: RefOperationFormProps) {
  const { operationType, paramA, paramB, regexFlags } = state;

  const updateField = <K extends keyof RefOperationState>(
    key: K,
    value: RefOperationState[K],
  ) => {
    onChange({ ...state, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-type`}>Type</Label>
        <Select
          value={operationType}
          onValueChange={(v) => {
            onChange({
              operationType: v as OperationType,
              paramA: "",
              paramB: "",
              regexFlags: "",
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

      {(operationType === "add-prefix" ||
        operationType === "remove-prefix") && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-prefix`}>Préfixe</Label>
          <input
            id={`${idPrefix}-prefix`}
            type="text"
            value={paramA}
            onChange={(e) => updateField("paramA", e.target.value)}
            placeholder="ex: PFX-"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {(operationType === "add-suffix" ||
        operationType === "remove-suffix") && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-suffix`}>Suffixe</Label>
          <input
            id={`${idPrefix}-suffix`}
            type="text"
            value={paramA}
            onChange={(e) => updateField("paramA", e.target.value)}
            placeholder="ex: -V2"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {(operationType === "find-replace" ||
        operationType === "regex-replace") && (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-search`}>
              {operationType === "regex-replace"
                ? "Pattern (regex)"
                : "Chercher"}
            </Label>
            <input
              id={`${idPrefix}-search`}
              type="text"
              value={paramA}
              onChange={(e) => updateField("paramA", e.target.value)}
              placeholder={
                operationType === "regex-replace"
                  ? "ex: ^(\\w+)-(\\d+)$"
                  : "ex: OLD"
              }
              className={INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-replace`}>Remplacer par</Label>
            <input
              id={`${idPrefix}-replace`}
              type="text"
              value={paramB}
              onChange={(e) => updateField("paramB", e.target.value)}
              placeholder={
                operationType === "regex-replace" ? "ex: $2-$1" : "ex: NEW"
              }
              className={INPUT_CLASS}
            />
          </div>
          {operationType === "regex-replace" && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-flags`}>Flags</Label>
              <input
                id={`${idPrefix}-flags`}
                type="text"
                value={regexFlags}
                onChange={(e) => updateField("regexFlags", e.target.value)}
                placeholder="ex: i"
                className={INPUT_CLASS}
              />
              <p className="text-xs text-muted-foreground">
                i = insensible à la casse. Le flag g est ajouté automatiquement.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
