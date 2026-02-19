import { describe, it, expect } from "vitest";
import { applyOperation, applyToRefs, Operation } from "../ref-modifier";

// ─── add-prefix ─────────────────────────────────────────────────────────────

describe("applyOperation — add-prefix", () => {
  const op: Operation = { type: "add-prefix", prefix: "PFX-" };

  it("adds prefix to a ref", () => {
    expect(applyOperation("ABC123", op)).toBe("PFX-ABC123");
  });

  it("adds prefix to empty string", () => {
    expect(applyOperation("", op)).toBe("PFX-");
  });

  it("adds prefix even if ref already starts with it", () => {
    expect(applyOperation("PFX-ABC", op)).toBe("PFX-PFX-ABC");
  });
});

// ─── add-suffix ─────────────────────────────────────────────────────────────

describe("applyOperation — add-suffix", () => {
  const op: Operation = { type: "add-suffix", suffix: "-V2" };

  it("adds suffix to a ref", () => {
    expect(applyOperation("ABC123", op)).toBe("ABC123-V2");
  });

  it("adds suffix to empty string", () => {
    expect(applyOperation("", op)).toBe("-V2");
  });
});

// ─── remove-prefix ──────────────────────────────────────────────────────────

describe("applyOperation — remove-prefix", () => {
  const op: Operation = { type: "remove-prefix", prefix: "OLD-" };

  it("removes matching prefix", () => {
    expect(applyOperation("OLD-ABC123", op)).toBe("ABC123");
  });

  it("returns ref unchanged if prefix does not match", () => {
    expect(applyOperation("NEW-ABC123", op)).toBe("NEW-ABC123");
  });

  it("is case-sensitive", () => {
    expect(applyOperation("old-ABC123", op)).toBe("old-ABC123");
  });

  it("removes prefix only from the start", () => {
    expect(applyOperation("XOLD-ABC", op)).toBe("XOLD-ABC");
  });
});

// ─── remove-suffix ──────────────────────────────────────────────────────────

describe("applyOperation — remove-suffix", () => {
  const op: Operation = { type: "remove-suffix", suffix: "-OLD" };

  it("removes matching suffix", () => {
    expect(applyOperation("ABC123-OLD", op)).toBe("ABC123");
  });

  it("returns ref unchanged if suffix does not match", () => {
    expect(applyOperation("ABC123-NEW", op)).toBe("ABC123-NEW");
  });

  it("removes suffix only from the end", () => {
    expect(applyOperation("ABC-OLDX", op)).toBe("ABC-OLDX");
  });
});

// ─── find-replace ───────────────────────────────────────────────────────────

describe("applyOperation — find-replace", () => {
  it("replaces all occurrences", () => {
    const op: Operation = { type: "find-replace", search: "-", replace: "_" };
    expect(applyOperation("A-B-C", op)).toBe("A_B_C");
  });

  it("returns ref unchanged if search not found", () => {
    const op: Operation = { type: "find-replace", search: "XYZ", replace: "!" };
    expect(applyOperation("ABC123", op)).toBe("ABC123");
  });

  it("handles replacing with empty string (deletion)", () => {
    const op: Operation = { type: "find-replace", search: "-V1", replace: "" };
    expect(applyOperation("PROD-V1", op)).toBe("PROD");
  });

  it("handles replacing empty search (inserts between every char)", () => {
    const op: Operation = { type: "find-replace", search: "", replace: "-" };
    // replaceAll with empty string inserts between every character
    expect(applyOperation("AB", op)).toBe("-A-B-");
  });
});

// ─── regex-replace ──────────────────────────────────────────────────────────

describe("applyOperation — regex-replace", () => {
  it("applies regex replacement", () => {
    const op: Operation = {
      type: "regex-replace",
      pattern: "\\d+",
      flags: "",
      replace: "NUM",
    };
    expect(applyOperation("ABC123DEF456", op)).toBe("ABCNUMDEFNUM");
  });

  it("supports capture groups", () => {
    const op: Operation = {
      type: "regex-replace",
      pattern: "^(\\w+)-(\\w+)$",
      flags: "",
      replace: "$2-$1",
    };
    expect(applyOperation("PREFIX-SUFFIX", op)).toBe("SUFFIX-PREFIX");
  });

  it("supports case-insensitive flag", () => {
    const op: Operation = {
      type: "regex-replace",
      pattern: "abc",
      flags: "i",
      replace: "XYZ",
    };
    expect(applyOperation("ABC123", op)).toBe("XYZ123");
  });

  it("returns ref unchanged if pattern does not match", () => {
    const op: Operation = {
      type: "regex-replace",
      pattern: "^ZZZ",
      flags: "",
      replace: "AAA",
    };
    expect(applyOperation("ABC123", op)).toBe("ABC123");
  });
});

// ─── applyToRefs ────────────────────────────────────────────────────────────

describe("applyToRefs", () => {
  it("applies operation to all refs", () => {
    const refs = ["A", "B", "C"];
    const op: Operation = { type: "add-prefix", prefix: "X-" };
    const results = applyToRefs(refs, op);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      original: "A",
      modified: "X-A",
      changed: true,
    });
    expect(results[1]).toEqual({
      original: "B",
      modified: "X-B",
      changed: true,
    });
    expect(results[2]).toEqual({
      original: "C",
      modified: "X-C",
      changed: true,
    });
  });

  it("marks unchanged refs correctly", () => {
    const refs = ["PFX-A", "B", "PFX-C"];
    const op: Operation = { type: "remove-prefix", prefix: "PFX-" };
    const results = applyToRefs(refs, op);
    expect(results[0].changed).toBe(true);
    expect(results[1].changed).toBe(false);
    expect(results[2].changed).toBe(true);
  });

  it("handles empty refs array", () => {
    const results = applyToRefs([], { type: "add-prefix", prefix: "X" });
    expect(results).toHaveLength(0);
  });
});
