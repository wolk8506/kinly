import { describe, expect, it } from "vitest";
import {
  hashFragmentAt,
  hashReplaceRange,
  normalizeHashAlias,
  valueFromEditableRaw,
} from "../../src/components/hashtagEditableDom.js";

describe("hashFragmentAt", () => {
  it("finds # at end when caret reports 0", () => {
    expect(hashFragmentAt("#", 0)).toBe("#");
    expect(hashFragmentAt("привет #", 0)).toBe("#");
  });

  it("filters by prefix", () => {
    expect(hashFragmentAt("текст #се", 9)).toBe("#се");
  });

  it("normalizes № alias", () => {
    expect(normalizeHashAlias("№семья")).toBe("#семья");
    expect(hashFragmentAt("№", 0)).toBe("#");
  });

  it("replace range for caret at 0", () => {
    expect(hashReplaceRange("#", 0)).toEqual({ start: 0, end: 1, fragment: "#" });
  });

  it("keeps lone hash in valueFromEditableRaw", () => {
    expect(valueFromEditableRaw("#")).toBe("#");
    expect(valueFromEditableRaw("\n")).toBe("");
  });
});