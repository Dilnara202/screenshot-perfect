import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Database, Activity, AlertTriangle, BrainCircuit, ClipboardList, Dna, FlaskConical, Info, Save, LogIn, LogOut, UserPlus, LoaderCircle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { loadMeasurements, saveMeasurement } from "@/lib/cloud-measurements";
import { useAmrAuth } from "./AuthProvider";
import { AuthDialog, type AuthMode } from "./AuthDialog";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ANTIBIOTICS, BACTERIA, BREAKPOINTS, MONTHS, REFERENCE, SCENARIOS, SEED_RECORDS, SITES,
  analyze, classify, compareGenes, isBorderline,
  type Antibiotic, type Bacterium, type RecordRow,
} from "@/lib/amr";
import { cn } from "@/lib/utils";
import { Card, Field, StatusBadge, selectCls } from "./ui";

const ALL = "all";

export function Dashboard({ initialAuth = false }: { initialAuth?: boolean }) {
  const { user, ready } = useAmrAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode | null>(initialAuth ? "login" : null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const { data: profile, error: profileError } = useQuery({
    queryKey: ["profile", user?.id], enabled: ready && !!user,
    queryFn: async ({ signal }) => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("laboratory_name").eq("id", user.id).abortSignal(signal).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: cloudRows = [], error: cloudError, isFetching, refetch } = useQuery({
    queryKey: ["measurements", user?.id], enabled: ready && !!user,
    queryFn: ({ signal }) => user ? loadMeasurements(user.id, signal) : Promise.resolve([]),
  });
  const records = user ? [...SEED_RECORDS, ...cloudRows.map((row) => ({ ...row, id: row.id + SEED_RECORDS.length }))] : SEED_RECORDS;
  const sites = [...new Set([...SITES, ...(profile ? [profile.laboratory_name] : []), ...records.map((row) => row.site)])];
  useEffect(() => { if (user) setAuthMode(null); }, [user]);
  useEffect(() => { setSiteF(ALL); }, [user?.id]);
  const signOut = async () => {
    setSigningOut(true); setAccountError("");
    try {
      await queryClient.cancelQueries(); queryClient.clear();
      const { error } = await supabase.auth.signOut();
      if (error) { setAccountError("Не удалось выйти. Попробуйте снова"); return; }
      await navigate({ to: "/auth", replace: true });
    } catch { setAccountError("Не удалось выйти. Попробуйте снова"); }
    finally { setSigningOut(false); }
  };
  const [siteF, setSiteF] = useState<string>(ALL);
  const [bactF, setBactF] = useState<string>(ALL);
  const [lastMutation, setLastMutation] = useState("—");

  const filtered = useMemo(
    () => records.filter((r) => (siteF === ALL || r.site === siteF) && (bactF === ALL || r.bacterium === bactF)),
    [records, siteF, bactF],
  );

  const [view, setView] = useState<ModuleId | null>(null);
  const current = MODULES.find((m) => m.id === view);
  const showFilters = view === "charts" || view === "insights" || view === "journal";

  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 sm:px-6">
          <button type="button" onClick={() => setView(null)} className="flex min-w-0 items-center gap-3 text-left">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Activity className="size-5" /></span>
            <span className="min-w-0">
              <span className="block truncate text-xl font-bold tracking-tight text-foreground">АМР-Радар</span>
              <span className="hidden truncate text-sm text-muted-foreground sm:block">Мониторинг антибиотикорезистентности</span>
            </span>
          </button>
          <div className="flex items-center justify-end gap-2">
            {!ready ? <span className="text-sm text-muted-foreground">Проверка аккаунта…</span> : user ? <>
              <div className="hidden min-w-0 max-w-[260px] text-right text-sm sm:block"><p className="truncate font-medium">{user.email}</p><p className="truncate text-muted-foreground">{profile?.laboratory_name ?? (profileError ? "Не удалось загрузить лабораторию" : "Загрузка лаборатории…")}</p></div>
              <Button variant="outline" disabled={signingOut} onClick={signOut}><LogOut />Выйти</Button>
            </> : <><Button variant="outline" onClick={() => setAuthMode("login")}><LogIn />Войти</Button><Button onClick={() => setAuthMode("register")}><UserPlus /><span className="hidden sm:inline">Регистрация</span></Button></>}
          </div>
        </div>
        {accountError && <p role="alert" className="mx-auto max-w-7xl px-4 pb-2 text-sm text-danger sm:px-6">{accountError}</p>}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!current ? <>
          <section className="animate-rise rounded-3xl border border-primary/15 bg-linear-to-br from-primary/10 via-card/60 to-card/30 p-6 shadow-[var(--shadow-card)] sm:p-10">
            <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">Система эпидемиологической и лабораторной аналитики устойчивости бактерий к антибиотикам</h1>
            <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">АМР-Радар объединяет диско-диффузионный метод, генетический анализ, визуальную аналитику трендов и автоматические рекомендации в едином рабочем пространстве для лабораторий и эпидемиологов.</p>
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground/85">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Аналитический инструмент поддержки решений и мониторинга данных (не является медицинским изделием и не ставит диагнозы)</span>
            </div>
          </section>
          <h2 className="mt-10 mb-4 text-sm font-semibold tracking-wider text-muted-foreground uppercase">Модули системы</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <button key={m.id} type="button" onClick={() => setView(m.id)} className={cn("animate-rise group flex min-h-56 flex-col rounded-3xl border p-6 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring outline-hidden", m.tone)}>
                <span className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-background/60 text-primary">{m.icon}</span>
                  <span className="min-w-0 text-right text-sm font-medium text-muted-foreground">{m.tag}</span>
                </span>
                <span className="mt-5 text-lg font-bold text-foreground">{m.title}</span>
                <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.text}</span>
              </button>
            ))}
          </div>
        </> : <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Button variant="ghost" size="sm" onClick={() => setView(null)} className="-ml-2 mb-2"><ArrowLeft />Все модули</Button>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{current.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{current.tag}</p>
            </div>
            {showFilters && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[480px]">
              <Field label="Пункт / Район">
                <select aria-label="Фильтр: пункт" className={selectCls} value={siteF} onChange={(e) => setSiteF(e.target.value)}>
                  <option value={ALL}>Все пункты</option>
                  {sites.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Бактерия">
                <select aria-label="Фильтр: бактерия" className={selectCls} value={bactF} onChange={(e) => setBactF(e.target.value)}>
                  <option value={ALL}>Все бактерии</option>
                  {BACTERIA.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>}
          </div>
          <div className="max-w-5xl">
            {view === "measure" && <MeasureForm
              key={user?.id ?? "guest"}
              laboratory={profile?.laboratory_name}
              canSave={ready && !!user}
              onLogin={() => setAuthMode("login")}
              onSave={async (row) => {
                if (!user) throw new Error("Sign in required");
                await saveMeasurement({ ...row, mutation: lastMutation });
                await queryClient.invalidateQueries({ queryKey: ["measurements", user.id] });
              }}
            />}
            {view === "gene" && <GeneCompare onChange={setLastMutation} />}
            {view === "charts" && <Charts rows={filtered} />}
            {view === "insights" && <Insights rows={filtered} />}
            {view === "journal" && <>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>Демонстрационные записи: {SEED_RECORDS.length}{user ? ` · Ваши замеры: ${cloudRows.length}` : ""}</span>
                {user && isFetching && <span>Загрузка замеров…</span>}
                {user && cloudError && <><span role="alert" className="text-danger">Не удалось загрузить ваши замеры</span><Button variant="outline" size="sm" onClick={() => { void refetch(); }}>Повторить</Button></>}
              </div>
              <Journal rows={filtered} />
            </>}
            {view === "reference" && <Reference />}
          </div>
        </>}
      </main>
      <AuthDialog mode={authMode} onModeChange={setAuthMode} />
    </div>
  );
}

type ModuleId = "measure" | "gene" | "charts" | "insights" | "journal" | "reference";
const MODULES: { id: ModuleId; title: string; tag: string; text: string; icon: ReactNode; tone: string }[] = [
  { id: "measure", title: "Диско-диффузионный метод", tag: "Ввод и проверка замера", text: "Введите диаметр зоны подавления роста — система мгновенно классифицирует результат (S/I/R) и проверит пограничные значения.", icon: <FlaskConical className="size-5" />, tone: "border-primary/20 bg-linear-to-br from-primary/12 to-card/40" },
  { id: "gene", title: "Сравнение гена с эталоном", tag: "Поиск мутаций", text: "Сравните нуклеотидную последовательность образца с эталоном и найдите мутации-маркеры устойчивости.", icon: <Dna className="size-5" />, tone: "border-chart-5/25 bg-linear-to-br from-chart-5/12 to-card/40" },
  { id: "charts", title: "Визуальная аналитика и тренды", tag: "Графики и статистика", text: "Динамика устойчивости по месяцам, распределение по статусам S/I/R, выявление трендов.", icon: <Activity className="size-5" />, tone: "border-success/20 bg-linear-to-br from-success/10 to-card/40" },
  { id: "insights", title: "Автоматический вывод", tag: "Причина и решения", text: "Система анализирует данные и формирует вероятную причину тренда + рекомендуемые действия.", icon: <BrainCircuit className="size-5" />, tone: "border-warning/20 bg-linear-to-br from-warning/8 to-card/40" },
  { id: "journal", title: "Журнал наблюдений", tag: "История замеров", text: "Полная таблица всех замеров с фильтрами по пункту и бактерии, статусами и мутациями.", icon: <ClipboardList className="size-5" />, tone: "border-warning/20 bg-linear-to-br from-warning/8 to-card/40" },
  { id: "reference", title: "Справочник бактерий и антибиотиков", tag: "База данных", text: "Просмотр пороговых значений зон подавления для бактерий и антибиотиков.", icon: <Database className="size-5" />, tone: "border-primary/20 bg-linear-to-br from-primary/10 to-card/40" },
];

function Reference() {
  return (
    <Card title="Пороговые значения (диаметр зоны, мм)" icon={<Database className="size-4" />}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 pr-3 font-medium">Бактерия</th><th className="py-2 pr-3 font-medium">Антибиотик</th><th className="py-2 pr-3 font-medium">S, ≥</th><th className="py-2 font-medium">R, ≤</th></tr></thead>
          <tbody>
            {BACTERIA.flatMap((b) => ANTIBIOTICS.map((a) => (
              <tr key={b + a} className="border-b last:border-0">
                <td className="py-2 pr-3 italic">{b}</td><td className="py-2 pr-3">{a}</td>
                <td className="py-2 pr-3 tabular-nums text-success">{BREAKPOINTS[b][a].s}</td>
                <td className="py-2 tabular-nums text-danger">{BREAKPOINTS[b][a].r}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Ориентировочные значения для демонстрации; сверяйтесь с актуальными таблицами EUCAST.</p>
    </Card>
  );
}

function MeasureForm({ onSave, laboratory, canSave, onLogin }: { onSave: (r: Omit<RecordRow, "id" | "mutation" | "date">) => Promise<void>; laboratory: string | undefined; canSave: boolean; onLogin: () => void }) {
  const [site, setSite] = useState<string>(SITES[0]);
  const sites = [...new Set([...SITES, ...(laboratory ? [laboratory] : [])])];
  useEffect(() => { if (laboratory) setSite(laboratory); }, [laboratory]);
  const [bact, setBact] = useState<Bacterium>(BACTERIA[0]);
  const [abx, setAbx] = useState<Antibiotic>(ANTIBIOTICS[0]);
  const [raw, setRaw] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const d = Number(raw);
  const valid = raw !== "" && Number.isFinite(d) && d >= 6 && d <= 40;
  const status = valid ? classify(bact, abx, d) : null;
  const border = valid && isBorderline(bact, abx, d);

  return (
    <Card title="Ввод и проверка замера (диско-диффузионный метод)" icon={<FlaskConical className="size-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Пункт / Район">
          <select disabled={saving} className={selectCls} value={site} onChange={(e) => { setSite(e.target.value); setSaved(false); }}>
            {sites.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Бактерия">
          <select disabled={saving} className={selectCls} value={bact} onChange={(e) => { setBact(e.target.value as Bacterium); setSaved(false); }}>
            {BACTERIA.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Антибиотик">
          <select disabled={saving} className={selectCls} value={abx} onChange={(e) => { setAbx(e.target.value as Antibiotic); setSaved(false); }}>
            {ANTIBIOTICS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Диаметр зоны подавления, мм">
          <input disabled={saving} type="number" min={6} max={40} step={0.5} placeholder="6–40" className={selectCls} value={raw}
            onChange={(e) => { setRaw(e.target.value); setSaved(false); }} />
        </Field>
      </div>

      <div className="mt-4 flex min-h-14 flex-wrap items-center gap-3 rounded-xl bg-muted/60 p-3">
        {status ? <StatusBadge status={status} large /> : (
          <span className="text-sm text-muted-foreground">{raw === "" ? "Введите диаметр — результат появится сразу" : "Допустимый диапазон: 6–40 мм"}</span>
        )}
      </div>
      {border && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          Пограничное значение — высок риск погрешности ручного замера, рекомендуется повторная проверка
        </div>
      )}

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-primary">Справочная таблица порогов (мм)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground"><tr><th className="py-1.5 pr-2">Бактерия</th><th className="pr-2">Антибиотик</th><th className="pr-2 text-danger">R ≤</th><th className="pr-2 text-warning">I</th><th className="text-success">S ≥</th></tr></thead>
            <tbody>
              {BACTERIA.flatMap((b) => ANTIBIOTICS.map((a) => {
                const { r, s } = BREAKPOINTS[b][a];
                const active = b === bact && a === abx;
                return (
                  <tr key={b + a} className={cn("border-t", active && "bg-primary/10 font-semibold")}>
                    <td className="py-1.5 pr-2 italic">{b}</td><td className="pr-2">{a}</td><td className="pr-2">{r}</td><td className="pr-2">{r + 1}–{s - 1}</td><td>{s}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </details>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={saving || (canSave && !valid)} onClick={async () => {
          if (!canSave) { onLogin(); return; }
          if (!valid || saving) return;
          setSaving(true); setSaved(false); setSaveError("");
          try {
            await onSave({ site, bacterium: bact, antibiotic: abx, diameter: d });
            setRaw(""); setSaved(true);
          } catch { setSaveError("Не удалось сохранить замер. Проверьте соединение и попробуйте снова"); }
          finally { setSaving(false); }
        }}
          className="h-auto min-h-10 whitespace-normal text-left">
          {saving ? <LoaderCircle className="animate-spin" /> : canSave ? <Save /> : <LogIn />}{saving ? "Сохранение…" : canSave ? "Сохранить замер в систему" : "Войти, чтобы сохранить замер"}
        </Button>
        {saved && <span role="status" className="text-sm text-success">Замер сохранён в облаке и добавлен в журнал</span>}
        {saveError && <span role="alert" className="text-sm text-danger">{saveError}</span>}
      </div>
    </Card>
  );
}

const ntCls: Record<string, string> = { A: "bg-nt-a", T: "bg-nt-t", G: "bg-nt-g", C: "bg-nt-c" };

function Strand({ seq, mismatches }: { seq: string; mismatches?: Set<number> }) {
  return (
    <div className="grid grid-cols-12 gap-0.5 sm:grid-cols-[repeat(24,minmax(0,1fr))]">
      {Array.from({ length: 24 }, (_, i) => {
        const ch = seq[i] ?? "·";
        const bad = mismatches?.has(i + 1);
        return (
          <div key={i} title={`Позиция ${i + 1}`}
            className={cn("grid h-8 place-items-center rounded-[4px] font-mono text-sm font-bold text-foreground",
              bad ? "bg-danger text-primary-foreground ring-2 ring-danger/40" : ntCls[ch] ?? "bg-muted")}>
            {ch}
          </div>
        );
      })}
    </div>
  );
}

function GeneCompare({ onChange }: { onChange: (m: string) => void }) {
  const [scenario, setScenario] = useState<string>(SCENARIOS[0].id);
  const [sample, setSample] = useState<string>(SCENARIOS[0].seq);
  const muts = compareGenes(REFERENCE, sample);
  const set = new Set(muts.map((m) => m.pos));

  const update = (seq: string) => {
    setSample(seq);
    const m = compareGenes(REFERENCE, seq);
    onChange(m.length ? m.map((x) => `Поз. ${x.pos} ${x.from}→${x.to}`).join(", ") : "—");
  };

  return (
    <Card title="Сравнение гена с эталоном (поиск мутаций)" icon={<Dna className="size-4" />}>
      <Field label="Тестовый сценарий">
        <select className={selectCls} value={scenario} onChange={(e) => {
          setScenario(e.target.value);
          const selected = SCENARIOS.find((s) => s.id === e.target.value);
          if (selected) update(selected.seq);
        }}>
          {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </Field>
      <div className="mt-4 space-y-3">
        <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Эталон из базы</p><Strand seq={REFERENCE} /></div>
        <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Проверяемый образец</p><Strand seq={sample} mismatches={set} /></div>
        <Field label="Редактировать образец вручную (A, T, G, C)">
          <input className={cn(selectCls, "font-mono tracking-widest uppercase")} maxLength={24} value={sample}
            onChange={(e) => update(e.target.value.toUpperCase().replace(/[^ATGC]/g, "").slice(0, 24))} />
        </Field>
      </div>
      <div className="mt-4">
        {sample.length < 24 && <p className="mb-2 text-xs text-warning">Длина образца {sample.length} из 24 — недостающие позиции считаются заменами.</p>}
        {muts.length === 0 ? (
          <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Расхождений с эталоном не обнаружено — мутаций нет.</p>
        ) : (
          <ul className="space-y-2">
            {muts.map((m) => (
              <li key={m.pos} className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm">
                <span className="font-semibold text-danger">Позиция {m.pos}: {m.from} → {m.to}</span>
                <span className="block text-foreground/80">{m.risk}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Найденные мутации прикрепляются к следующему сохранённому замеру.</p>
      </div>
    </Card>
  );
}

const C_S = "var(--success)", C_I = "var(--warning)", C_R = "var(--danger)";

function Charts({ rows }: { rows: RecordRow[] }) {
  const months = [...new Set([...MONTHS.map((_m, i) => `2026-${String(i + 1).padStart(2, "0")}`), ...rows.map((r) => r.date.slice(0, 7))])].sort();
  const monthly = months.map((month) => {
    const rs = rows.filter((r) => r.date.startsWith(month));
    const n = rs.length || 1;
    return {
      month: new Intl.DateTimeFormat("ru", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`)),
      "Устойчивые": Math.round((rs.filter((r) => classify(r.bacterium, r.antibiotic, r.diameter) === "R").length / n) * 100),
      "Пограничные": Math.round((rs.filter((r) => isBorderline(r.bacterium, r.antibiotic, r.diameter)).length / n) * 100),
    };
  });
  const counts = { S: 0, I: 0, R: 0 };
  rows.forEach((r) => {
    const st = classify(r.bacterium, r.antibiotic, r.diameter);
    counts[st]++;
  });
  const total = rows.length || 1;
  const pie = [
    { name: "Чувствителен", value: counts.S, color: C_S },
    { name: "Пограничный", value: counts.I, color: C_I },
    { name: "Устойчив", value: counts.R, color: C_R },
  ];

  return (
    <Card title="Визуальная аналитика и тренды" icon={<Activity className="size-4" />}>
      <p className="mb-2 text-sm font-medium text-foreground">Доля устойчивых и пограничных проб, %</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" unit="%" domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Устойчивые" fill={C_R} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Пограничные" fill={C_I} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-5 mb-2 text-sm font-medium text-foreground">Соотношение записей по статусам</p>
      <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pie} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pie.map((p) => <Cell key={p.name} fill={p.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-sm">
          {pie.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
              <span className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: p.color }} />{p.name}</span>
              <span className="font-semibold">{p.value} · {Math.round((p.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Insights({ rows }: { rows: RecordRow[] }) {
  const { cause, actions } = analyze(rows);
  return (
    <Card title="Автоматический вывод: причина и решения" icon={<BrainCircuit className="size-4" />}>
      <div className="rounded-xl border-l-4 border-primary bg-primary/5 p-4">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">Вероятная причина сбоя / тренда</p>
        <p className="mt-1.5 text-sm text-foreground">{cause}</p>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Рекомендуемые управленческие и лабораторные решения</p>
        <ol className="mt-2 space-y-2">
          {actions.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <span className="min-w-0 pt-0.5">{a}</span>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function Journal({ rows, className }: { rows: RecordRow[]; className?: string }) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return (
    <Card title="Журнал наблюдений" icon={<ClipboardList className="size-4" />} className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs text-muted-foreground uppercase">
            <tr className="border-b">
              {["Дата", "Пункт", "Бактерия", "Антибиотик", "Диаметр (мм)", "Статус", "Точность", "Мутация"].map((h) => <th key={h} className="px-2 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const border = isBorderline(r.bacterium, r.antibiotic, r.diameter);
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-2 py-2.5 whitespace-nowrap">{r.date.split("-").reverse().join(".")}</td>
                  <td className="px-2">{r.site}</td>
                  <td className="px-2 italic">{r.bacterium}</td>
                  <td className="px-2">{r.antibiotic}</td>
                  <td className="px-2 font-mono">{r.diameter}</td>
                  <td className="px-2"><StatusBadge status={classify(r.bacterium, r.antibiotic, r.diameter)} /></td>
                  <td className={cn("px-2", border ? "font-medium text-warning" : "text-muted-foreground")}>{border ? "Погранично" : "Норма"}</td>
                  <td className={cn("px-2 whitespace-nowrap", r.mutation !== "—" && "font-medium text-danger")}>{r.mutation}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Нет записей по выбранным фильтрам</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
