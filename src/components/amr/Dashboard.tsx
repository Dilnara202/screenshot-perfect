import { useMemo, useState } from "react";
import { Activity, AlertTriangle, BrainCircuit, ClipboardList, Dna, FlaskConical, Info, Save } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ANTIBIOTICS, BACTERIA, BREAKPOINTS, MONTHS, REFERENCE, SCENARIOS, SEED_RECORDS, SITES,
  analyze, classify, compareGenes, isBorderline, monthIndex,
  type Antibiotic, type Bacterium, type RecordRow, type Site,
} from "@/lib/amr";
import { cn } from "@/lib/utils";
import { Card, Field, StatusBadge, selectCls } from "./ui";

const ALL = "all";

export function Dashboard() {
  const [records, setRecords] = useState<RecordRow[]>(SEED_RECORDS);
  const [siteF, setSiteF] = useState<string>(ALL);
  const [bactF, setBactF] = useState<string>(ALL);
  const [lastMutation, setLastMutation] = useState("—");

  const filtered = useMemo(
    () => records.filter((r) => (siteF === ALL || r.site === siteF) && (bactF === ALL || r.bacterium === bactF)),
    [records, siteF, bactF],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Activity className="size-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">АМР-Радар</h1>
                <p className="text-sm text-muted-foreground">Система эпидемиологической и лабораторной аналитики</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[480px]">
              <Field label="Пункт / Район">
                <select aria-label="Фильтр: пункт" className={selectCls} value={siteF} onChange={(e) => setSiteF(e.target.value)}>
                  <option value={ALL}>Все пункты</option>
                  {SITES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Бактерия">
                <select aria-label="Фильтр: бактерия" className={selectCls} value={bactF} onChange={(e) => setBactF(e.target.value)}>
                  <option value={ALL}>Все бактерии</option>
                  {BACTERIA.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground/80">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Аналитический инструмент поддержки решений и мониторинга данных (не является медицинским изделием и не ставит диагнозы)</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <MeasureForm
            onSave={(row) => setRecords((prev) => [...prev, { ...row, id: prev.length + 1, mutation: lastMutation }])}
          />
          <GeneCompare onChange={setLastMutation} />
        </div>
        <div className="flex flex-col gap-6">
          <Charts rows={filtered} />
          <Insights rows={filtered} />
        </div>
        <Journal rows={filtered} className="lg:col-span-2" />
      </main>
    </div>
  );
}

function MeasureForm({ onSave }: { onSave: (r: Omit<RecordRow, "id" | "mutation">) => void }) {
  const [site, setSite] = useState<Site>(SITES[0]);
  const [bact, setBact] = useState<Bacterium>(BACTERIA[0]);
  const [abx, setAbx] = useState<Antibiotic>(ANTIBIOTICS[0]);
  const [raw, setRaw] = useState("");
  const [saved, setSaved] = useState(false);
  const d = Number(raw);
  const valid = raw !== "" && Number.isFinite(d) && d >= 6 && d <= 40;
  const status = valid ? classify(bact, abx, d) : null;
  const border = valid && isBorderline(bact, abx, d);

  return (
    <Card title="Ввод и проверка замера (диско-диффузионный метод)" icon={<FlaskConical className="size-4" />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Пункт / Район">
          <select className={selectCls} value={site} onChange={(e) => setSite(e.target.value as Site)}>
            {SITES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Бактерия">
          <select className={selectCls} value={bact} onChange={(e) => setBact(e.target.value as Bacterium)}>
            {BACTERIA.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Антибиотик">
          <select className={selectCls} value={abx} onChange={(e) => setAbx(e.target.value as Antibiotic)}>
            {ANTIBIOTICS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Диаметр зоны подавления, мм">
          <input type="number" min={6} max={40} step={0.5} placeholder="6–40" className={selectCls} value={raw}
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
        <button disabled={!valid} onClick={() => {
          onSave({ date: new Date().toISOString().slice(0, 10).replace(/^\d{4}-(\d{2})/, (_m, mm) => Number(mm) > 6 ? "2026-06" : `2026-${mm}`), site, bacterium: bact, antibiotic: abx, diameter: d });
          setRaw(""); setSaved(true);
        }}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          <Save className="size-4" /> Сохранить замер в систему
        </button>
        {saved && <span className="text-sm text-success">Замер сохранён и добавлен в журнал</span>}
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
          update(SCENARIOS.find((s) => s.id === e.target.value)!.seq);
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
  const monthly = MONTHS.map((m, i) => {
    const rs = rows.filter((r) => monthIndex(r.date) === i);
    const n = rs.length || 1;
    return {
      month: m,
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
