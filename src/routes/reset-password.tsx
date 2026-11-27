import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, selectCls } from "@/components/amr/ui";
import { credentialsSchema } from "@/lib/measurement-validation";
import { authError } from "@/components/amr/AuthDialog";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Новый пароль — АМР-Радар" },
    { name: "description", content: "Безопасное восстановление пароля аккаунта лаборатории АМР-Радар." },
    { property: "og:title", content: "Новый пароль — АМР-Радар" },
    { property: "og:description", content: "Восстановление доступа к аккаунту лаборатории." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => { setRecovery(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery"); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!recovery) return;
    const parsed = credentialsSchema.shape.password.safeParse(password);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Проверьте пароль"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.updateUser({ password: parsed.data });
      if (failure) setError(authError(failure)); else { setDone(true); setPassword(""); setConfirm(""); }
    } catch { setError("Не удалось изменить пароль. Попробуйте снова"); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-4 py-16">
    <h1 className="mb-6 text-2xl font-bold">АМР-Радар · Новый пароль</h1>
    {done ? <p role="status" className="text-success">Пароль изменён</p> : recovery ? <form onSubmit={submit} className="space-y-4">
      <Field label="Новый пароль"><input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className={selectCls} /></Field>
      <Field label="Повторите пароль"><input required type="password" autoComplete="new-password" maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={selectCls} /></Field>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button disabled={busy} type="submit">Сохранить пароль</Button>
    </form> : <p className="text-muted-foreground">Откройте ссылку из письма для восстановления пароля.</p>}
    <Button asChild variant="link" className="mt-4 px-0"><Link to="/">Вернуться к замерам</Link></Button>
  </main>;
}