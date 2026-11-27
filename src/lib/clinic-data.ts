import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BIOMATERIALS, type Drug, type Pathogen, type Sample, type WhoPriority } from "./clinical";
import type { Status } from "./amr";

const name = z.string().trim().min(2, "Минимум 2 символа").max(120);
export const pathogenSchema = z.object({ name, gram: z.enum(["+", "-", "?"]), who_priority: z.enum(["critical", "high", "medium", "none"]), family: z.string().trim().max(120), resistance_genes: z.string().trim().max(500) });
const bp = z.number().finite().nullable();
export const drugSchema = z.object({ name, drug_class: z.string().trim().max(120), disk_r: bp, disk_s: bp, mic_s: bp, mic_r: bp })
  .refine((d) => (d.disk_r == null) === (d.disk_s == null) && (d.disk_r == null || (d.disk_r >= 5 && d.disk_s! <= 50 && d.disk_r < d.disk_s!)), "Пороги диаметра: R < S, 5–50 мм")
  .refine((d) => (d.mic_s == null) === (d.mic_r == null) && (d.mic_s == null || (d.mic_s > 0 && d.mic_r! <= 1024 && d.mic_s <= d.mic_r!)), "Пороги МПК: S ≤ R, 0–1024 мг/л");
export const sampleSchema = z.object({
  city: z.string().trim().min(1).max(120), location: z.string().trim().min(1, "Укажите медучреждение").max(120),
  biomaterial: z.enum(BIOMATERIALS), bacteria: name, antibiotic: name, method: z.enum(["disk", "mic"]),
  diameter_mm: z.number().finite().min(6).max(50).nullable(), mic_mgl: z.number().finite().positive().max(1024).nullable(),
  mutation_summary: z.string().max(1000),
}).refine((s) => (s.method === "disk" ? s.diameter_mm != null : s.mic_mgl != null), "Введите значение измерения");

export async function loadPathogens(userId: string | undefined): Promise<Pathogen[]> {
  const { data, error } = await supabase.from("pathogens").select("id, user_id, name, gram, who_priority, family, resistance_genes").order("name");
  if (error) throw error;
  return data.map((p) => ({ ...p, gram: p.gram as Pathogen["gram"], who_priority: p.who_priority as WhoPriority, own: !!userId && p.user_id === userId }));
}
export async function loadDrugs(userId: string | undefined): Promise<Drug[]> {
  const { data, error } = await supabase.from("antibiotics").select("id, user_id, name, drug_class, disk_r, disk_s, mic_s, mic_r").order("name");
  if (error) throw error;
  return data.map((d) => ({ ...d, own: !!userId && d.user_id === userId }));
}
export async function addPathogen(input: z.input<typeof pathogenSchema>) {
  const { error } = await supabase.from("pathogens").insert(pathogenSchema.parse(input));
  if (error) throw new Error(error.code === "23505" ? "Такой микроорганизм уже есть в вашей базе" : "Не удалось сохранить микроорганизм");
}
export async function addDrug(input: z.input<typeof drugSchema>) {
  const { error } = await supabase.from("antibiotics").insert(drugSchema.parse(input));
  if (error) throw new Error(error.code === "23505" ? "Такой антибиотик уже есть в вашей базе" : "Не удалось сохранить антибиотик");
}
export async function removeRow(table: "pathogens" | "antibiotics" | "measurements", id: number) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function loadSamples(userId: string, signal?: AbortSignal): Promise<Sample[]> {
  const out: Sample[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from("measurements").select("id, created_at, city, location, biomaterial, bacteria, antibiotic, method, diameter_mm, mic_mgl, status, is_borderline, mutation_summary, photo_path").eq("user_id", userId).order("created_at", { ascending: false }).range(from, from + 499).abortSignal(signal ?? new AbortController().signal);
    if (error) throw error;
    for (const r of data) out.push({ id: String(r.id), date: r.created_at.slice(0, 10), city: r.city ?? "—", location: r.location, biomaterial: (r.biomaterial as Sample["biomaterial"]) ?? null, bacterium: r.bacteria, antibiotic: r.antibiotic, method: r.method === "mic" ? "mic" : "disk", diameter: r.diameter_mm, mic: r.mic_mgl, status: r.status as Status, borderline: r.is_borderline, mutation: r.mutation_summary, photo_path: r.photo_path, demo: false });
    if (data.length < 500) return out;
  }
}

export async function saveSample(userId: string, input: z.input<typeof sampleSchema>, photo: File | null) {
  const parsed = sampleSchema.parse(input);
  let photo_path: string | null = null;
  if (photo) {
    if (!photo.type.startsWith("image/") || photo.size > 10 * 1024 * 1024) throw new Error("Фото: только изображение до 10 МБ");
    const ext = (photo.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    photo_path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("plate-photos").upload(photo_path, photo, { contentType: photo.type });
    if (error) throw new Error("Не удалось загрузить фото чашки");
  }
  // status/is_borderline are placeholders: the database trigger recomputes them from the reference breakpoints.
  const { data, error } = await supabase.from("measurements").insert({ ...parsed, photo_path, status: "S", is_borderline: false }).select("id, status, is_borderline").single();
  if (error) { if (photo_path) await supabase.storage.from("plate-photos").remove([photo_path]); throw new Error("Не удалось сохранить пробу: проверьте возбудителя, антибиотик и пороги"); }
  return data;
}

export async function photoUrl(path: string) {
  const { data, error } = await supabase.storage.from("plate-photos").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
