import { supabase } from "@/integrations/supabase/client";
import { classify, isBorderline, type RecordRow } from "./amr";
import { measurementSchema } from "./measurement-validation";

export async function loadMeasurements(userId: string, signal?: AbortSignal): Promise<RecordRow[]> {
  const rows: RecordRow[] = [];
  for (let from = 0; ; from += 500) {
    let query = supabase.from("measurements").select("id, created_at, location, bacteria, antibiotic, diameter_mm, mutation_summary").eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + 499);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      const parsed = measurementSchema.parse({ location: row.location, bacteria: row.bacteria, antibiotic: row.antibiotic, diameter_mm: row.diameter_mm, mutation_summary: row.mutation_summary });
      rows.push({ id: row.id, date: row.created_at.slice(0, 10), site: parsed.location, bacterium: parsed.bacteria, antibiotic: parsed.antibiotic, diameter: parsed.diameter_mm, mutation: parsed.mutation_summary });
    }
    if (data.length < 500) return rows;
  }
}

export async function saveMeasurement(row: Omit<RecordRow, "id" | "date">) {
  const input = measurementSchema.parse({ location: row.site, bacteria: row.bacterium, antibiotic: row.antibiotic, diameter_mm: row.diameter, mutation_summary: row.mutation });
  const { error } = await supabase.from("measurements").insert({ ...input, status: classify(input.bacteria, input.antibiotic, input.diameter_mm), is_borderline: isBorderline(input.bacteria, input.antibiotic, input.diameter_mm) });
  if (error) throw error;
}