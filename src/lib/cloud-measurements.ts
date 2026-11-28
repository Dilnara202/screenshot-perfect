import { supabase } from "@/integrations/supabase/client";
import { classify, isBorderline, type RecordRow } from "./amr";
import { measurementSchema } from "./measurement-validation";

export async function loadMeasurements(userId: string, signal?: AbortSignal): Promise<RecordRow[]> {
  const rows: RecordRow[] = [];
  for (let from = 0; ; from += 500) {
    let query = supabase.from("measurements").select("id, created_at, location, bacteria, antibiotic, diameter_mm, mutation_summary, photo_path").eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, from + 499);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data) {
      const parsed = measurementSchema.parse({ location: row.location, bacteria: row.bacteria, antibiotic: row.antibiotic, diameter_mm: row.diameter_mm, mutation_summary: row.mutation_summary });
      rows.push({ id: row.id, date: row.created_at.slice(0, 10), site: parsed.location, bacterium: parsed.bacteria, antibiotic: parsed.antibiotic, diameter: parsed.diameter_mm, mutation: parsed.mutation_summary, photo: row.photo_path });
    }
    if (data.length < 500) return rows;
  }
}

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function saveMeasurement(row: Omit<RecordRow, "id" | "date">, userId?: string, photo?: File | null) {
  const input = measurementSchema.parse({ location: row.site, bacteria: row.bacterium, antibiotic: row.antibiotic, diameter_mm: row.diameter, mutation_summary: row.mutation });
  let photo_path: string | null = null;
  if (photo && userId) {
    if (!PHOTO_TYPES.includes(photo.type) || photo.size > 10 * 1024 * 1024) throw new Error("photo");
    photo_path = `${userId}/${crypto.randomUUID()}.${photo.type.split("/")[1]}`;
    const up = await supabase.storage.from("plate-photos").upload(photo_path, photo, { contentType: photo.type });
    if (up.error) throw up.error;
  }
  const { error } = await supabase.from("measurements").insert({ ...input, photo_path, status: classify(input.bacteria, input.antibiotic, input.diameter_mm), is_borderline: isBorderline(input.bacteria, input.antibiotic, input.diameter_mm) });
  if (error) { if (photo_path) await supabase.storage.from("plate-photos").remove([photo_path]); throw error; }
}

export async function signedPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from("plate-photos").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}