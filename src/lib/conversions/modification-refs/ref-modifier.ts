export type OperationType =
  | "add-prefix"
  | "add-suffix"
  | "remove-prefix"
  | "remove-suffix"
  | "find-replace"
  | "regex-replace";

export interface AddPrefixOperation {
  type: "add-prefix";
  prefix: string;
}

export interface AddSuffixOperation {
  type: "add-suffix";
  suffix: string;
}

export interface RemovePrefixOperation {
  type: "remove-prefix";
  prefix: string;
}

export interface RemoveSuffixOperation {
  type: "remove-suffix";
  suffix: string;
}

export interface FindReplaceOperation {
  type: "find-replace";
  search: string;
  replace: string;
}

export interface RegexReplaceOperation {
  type: "regex-replace";
  pattern: string;
  flags: string;
  replace: string;
}

export type Operation =
  | AddPrefixOperation
  | AddSuffixOperation
  | RemovePrefixOperation
  | RemoveSuffixOperation
  | FindReplaceOperation
  | RegexReplaceOperation;

export function applyOperation(ref: string, operation: Operation): string {
  switch (operation.type) {
    case "add-prefix":
      return operation.prefix + ref;

    case "add-suffix":
      return ref + operation.suffix;

    case "remove-prefix":
      return ref.startsWith(operation.prefix)
        ? ref.slice(operation.prefix.length)
        : ref;

    case "remove-suffix":
      return ref.endsWith(operation.suffix)
        ? ref.slice(0, -operation.suffix.length)
        : ref;

    case "find-replace":
      return ref.replaceAll(operation.search, operation.replace);

    case "regex-replace": {
      const regex = new RegExp(operation.pattern, operation.flags + "g");
      return ref.replace(regex, operation.replace);
    }
  }
}

export interface ModificationResult {
  original: string;
  modified: string;
  changed: boolean;
}

export function applyToRefs(
  refs: string[],
  operation: Operation,
): ModificationResult[] {
  return refs.map((ref) => {
    const modified = applyOperation(ref, operation);
    return { original: ref, modified, changed: ref !== modified };
  });
}
