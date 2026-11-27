import { z } from "zod";
import { ANTIBIOTICS, BACTERIA } from "./amr";

export const laboratorySchema = z.string().trim().min(1, "Укажите название лаборатории / пункта").max(120, "Название должно быть не длиннее 120 символов");
export const credentialsSchema = z.object({
  email: z.email("Введите корректный email").max(255),
  password: z.string().min(8, "Пароль должен содержать минимум 8 символов").max(128),
});
export const measurementSchema = z.object({
  location: laboratorySchema,
  bacteria: z.enum(BACTERIA),
  antibiotic: z.enum(ANTIBIOTICS),
  diameter_mm: z.number().finite().min(6).max(40),
  mutation_summary: z.string().max(1000),
});