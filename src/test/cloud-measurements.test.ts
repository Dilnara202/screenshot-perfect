import { describe, expect, it, vi, beforeEach } from "vitest";
import { measurementSchema, laboratorySchema } from "@/lib/measurement-validation";

const { insert, select, eq, order, range, abortSignal } = vi.hoisted(() => ({ insert: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert, select }) } }));
import { loadMeasurements, saveMeasurement } from "@/lib/cloud-measurements";

describe("Облачные замеры", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("сохраняет все поля замера, оставляя владельца и дату базе", async () => {
    insert.mockResolvedValue({ error: null });
    await saveMeasurement({ site: "Лаборатория Север", bacterium: "E. coli", antibiotic: "Амоксициллин", diameter: 14, mutation: "Поз. 8 C→G" });
    expect(insert).toHaveBeenCalledWith({ location: "Лаборатория Север", bacteria: "E. coli", antibiotic: "Амоксициллин", diameter_mm: 14, status: "I", is_borderline: true, mutation_summary: "Поз. 8 C→G" });
  });
  it("читает сохранённые замеры только выбранного пользователя", async () => {
    const chain = { eq, order, range, abortSignal };
    select.mockReturnValue(chain); eq.mockReturnValue(chain); order.mockReturnValue(chain);
    range.mockResolvedValue({ data: [{ id: 8, created_at: "2026-11-27T16:00:00Z", location: "Лаборатория Север", bacteria: "E. coli", antibiotic: "Амоксициллин", diameter_mm: 14, mutation_summary: "—" }], error: null });
    const rows = await loadMeasurements("owner-123");
    expect(eq).toHaveBeenCalledWith("user_id", "owner-123");
    expect(rows[0]).toEqual({ id: 8, date: "2026-11-27", site: "Лаборатория Север", bacterium: "E. coli", antibiotic: "Амоксициллин", diameter: 14, mutation: "—" });
  });
  it("не принимает недопустимый диаметр и неизвестную бактерию", () => {
    const row = { location: "Лаборатория", bacteria: "E. coli", antibiotic: "Амоксициллин", diameter_mm: 14, mutation_summary: "—" };
    expect(measurementSchema.safeParse({ ...row, diameter_mm: 5 }).success).toBe(false);
    expect(measurementSchema.safeParse({ ...row, bacteria: "unknown" }).success).toBe(false);
  });
  it("требует название лаборатории", () => {
    expect(laboratorySchema.safeParse(" ").success).toBe(false);
    expect(laboratorySchema.parse(" Лаборатория Север ")).toBe("Лаборатория Север");
  });
});