import { createClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// Run against the temporary test account only, never a real user's credentials.
const session = process.env["AMR_TEST_SESSION"];
describe.skipIf(!session)("Правила доступа к облачным замерам", () => {
  const url = process.env["SUPABASE_URL"] ?? "";
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  const makeClient = () => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  let owner: ReturnType<typeof makeClient>;
  let guest: ReturnType<typeof makeClient>;
  let ownerId = "";
  const input = { location: "Проверка доступа", bacteria: "E. coli", antibiotic: "Амоксициллин", diameter_mm: 14, status: "S", is_borderline: false, mutation_summary: "—" };
  beforeAll(async () => {
    if (!session) throw new Error("Temporary test session required");
    owner = makeClient(); guest = makeClient();
    const credentials = JSON.parse(session) as { access_token: string; refresh_token: string };
    const { error } = await owner.auth.setSession(credentials);
    if (error) throw error;
    const { data, error: failure } = await owner.auth.getUser();
    if (failure || !data.user) throw new Error("Test session invalid");
    ownerId = data.user.id;
  });
  it("сохраняет владельца и рассчитывает результат в базе", async () => {
    const { data, error } = await owner.from("measurements").insert(input).select().single();
    expect(error).toBeNull();
    expect(data).toMatchObject({ user_id: ownerId, diameter_mm: 14, status: "I", is_borderline: true });
  });
  it("не позволяет подменить владельца", async () => {
    const { error } = await owner.from("measurements").insert({ ...input, user_id: "00000000-0000-0000-0000-000000000001" });
    expect(error?.code).toBe("42501");
  });
  it("не раскрывает личные записи гостю", async () => {
    const { data, error } = await guest.from("measurements").select();
    expect(error !== null || data?.length === 0).toBe(true);
  });
  it("запрещает гостевое сохранение", async () => {
    const { error } = await guest.from("measurements").insert(input);
    expect(error?.code).toBe("42501");
  });
  it("проверяет допустимый диаметр на стороне базы", async () => {
    const { error } = await owner.from("measurements").insert({ ...input, diameter_mm: 5 });
    expect(error?.code).toBe("23514");
  });
});