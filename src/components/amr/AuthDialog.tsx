import { useState, type FormEvent } from "react";
import { Building2, LoaderCircle, LogIn, Mail, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { credentialsSchema, laboratorySchema } from "@/lib/measurement-validation";
import { Field, selectCls } from "./ui";

export type AuthMode = "login" | "register" | "forgot";

export function authError(error: { message: string; code?: string | undefined }) {
  if (error.code === "invalid_credentials") return "Неверный email или пароль";
  if (error.code === "email_not_confirmed") return "Подтвердите email по ссылке в письме, затем войдите";
  if (error.code === "user_already_exists") return "Этот email уже зарегистрирован. Войдите в аккаунт";
  if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return "Слишком много попыток. Попробуйте позже";
  if (error.code === "weak_password") return "Выберите более надёжный пароль";
  return "Не удалось выполнить запрос. Проверьте соединение и попробуйте снова";
}

export function AuthDialog({ mode, onModeChange }: { mode: AuthMode | null; onModeChange: (mode: AuthMode | null) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const change = (next: AuthMode | null) => { setError(""); setNotice(""); setPassword(""); onModeChange(next); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    const parsed = mode === "forgot" ? credentialsSchema.shape.email.safeParse(email.trim()) : credentialsSchema.safeParse({ email: email.trim(), password });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Проверьте поля"); return; }
    const lab = laboratorySchema.safeParse(laboratory);
    if (mode === "register" && !lab.success) { setError(lab.error.issues[0]?.message ?? "Укажите лабораторию"); return; }
    setBusy(true);
    try {
      if (mode === "register" && lab.success) {
        const { data, error: failure } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { laboratory_name: lab.data }, emailRedirectTo: window.location.origin } });
        if (failure) { setError(authError(failure)); return; }
        setPassword("");
        if (data.session) change(null);
        else setNotice("Проверьте почту: подтвердите email по ссылке в письме, затем войдите в аккаунт.");
      } else if (mode === "forgot") {
        const { error: failure } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (failure) setError(authError(failure));
        else setNotice("Если аккаунт существует, письмо со ссылкой для сброса пароля отправлено. Проверьте почту.");
      } else {
        const { error: failure } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (failure) setError(authError(failure)); else change(null);
      }
    } catch { setError("Нет соединения. Попробуйте снова"); }
    finally { setBusy(false); }
  };
  return <Dialog open={mode !== null} onOpenChange={(open) => { if (!open && !busy) change(null); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg">
      <DialogHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">{mode === "register" ? <Building2 /> : <LogIn />}</div>
        <DialogTitle>{mode === "register" ? "Регистрация" : mode === "forgot" ? "Восстановление пароля" : "Войти в АМР-Радар"}</DialogTitle>
        <DialogDescription>{mode === "register" ? "Аккаунт лаборатории" : mode === "forgot" ? "Ссылка для сброса пароля придёт на ваш email" : "Аккаунт лаборатории / пункта"}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><input required type="email" autoComplete="email" maxLength={255} className={selectCls} value={email} disabled={busy} onChange={(e) => setEmail(e.target.value)} /></Field>
        {mode !== "forgot" && <Field label="Пароль"><input required type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={128} className={selectCls} value={password} disabled={busy} onChange={(e) => setPassword(e.target.value)} /></Field>}
        {mode === "register" && <Field label="Название лаборатории / пункта"><input required autoComplete="organization" maxLength={120} className={selectCls} value={laboratory} disabled={busy} onChange={(e) => setLaboratory(e.target.value)} /></Field>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-foreground">{notice}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : mode === "register" ? <UserPlus /> : mode === "forgot" ? <Mail /> : <LogIn />}{mode === "register" ? "Зарегистрироваться" : mode === "forgot" ? "Отправить ссылку" : "Войти"}</Button>
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="link" className="h-auto px-0" disabled={busy} onClick={() => change(mode === "register" || mode === "forgot" ? "login" : "register")}>{mode === "register" || mode === "forgot" ? "Уже есть аккаунт? Войти" : "Регистрация"}</Button>
          {mode === "login" && <Button type="button" variant="link" className="h-auto px-0" disabled={busy} onClick={() => change("forgot")}>Забыли пароль?</Button>}
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}