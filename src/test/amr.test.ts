import { describe, expect, it } from "vitest";
import { classify, isBorderline, compareGenes, REFERENCE, SCENARIOS } from "@/lib/amr";

describe("АМР правила", () => {
  it("классифицирует по порогам", () => {
    expect(classify("E. coli", "Амоксициллин", 13)).toBe("R");
    expect(classify("E. coli", "Амоксициллин", 15)).toBe("I");
    expect(classify("E. coli", "Амоксициллин", 17)).toBe("S");
  });
  it("пограничное ±1.5 мм", () => {
    expect(isBorderline("E. coli", "Цефтриаксон", 20.5)).toBe(true);
    expect(isBorderline("E. coli", "Цефтриаксон", 30)).toBe(false);
  });
  it("находит мутацию в позиции 8", () => {
    const m = compareGenes(REFERENCE, SCENARIOS[1].seq);
    expect(m).toEqual([expect.objectContaining({ pos: 8, from: "C", to: "G" })]);
  });
});
