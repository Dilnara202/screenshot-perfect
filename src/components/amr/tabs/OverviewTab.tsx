import { useMemo, useState } from "react";
import { Activity, AlertTriangle, Biohazard, MapPin, Radar, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTHS } from "@/lib/amr";
import { BIOMATERIALS, cityRisk, classEfficacy, classOf, detectSignals, kbFor, monthlyTrend, monthOf, pct, rShare, topResistant } from "@/lib/clinical";
import { cn } from "@/lib/utils";
import type { Clinic } from "../useClinic";
import { Card, Field, Kpi, selectCls } from "../ui";

const ALL = "all";
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }, labelStyle: { color: "var(--foreground)" } };
const levelCls = { high: "border-danger/50 bg-danger-soft text-danger", medium: "border-warning/50 bg-warning-soft text-warning", low: "border-success/40 bg-success-soft text-success" } as const;
const levelLabel = { high: "Высокий риск", medium: "Умеренный", low: "Низкий" } as const;

export function OverviewTab({ clinic }: { clinic: Clinic }) {
  const { samples, drugs, pathogens } = clinic;
  const [city, setCity] = useState(ALL); const [bact, setBact] = useState(ALL); const [drug, setDrug] = useState(ALL); const [bio, setBio] = useState(ALL);
  const [from, setFrom] = useState(0); const [to, setTo] = useState(5);
  const base = useMemo(() => samples.filter((r) => (bact === ALL || r.bacterium === bact) && (drug === ALL || r.antibiotic === drug) && (bio === ALL || r.biomaterial === bio) && monthOf(r.date) >= Math.min(from, to) && monthOf(r.date) <= Math.max(from, to)), [samples, bact, drug, bio, from, to]);
  const rows = useMemo(() => base.filter((r) => city === ALL || r.city === city), [base, city]);
  const bactOptions = [...new Set(samples.map((s) => s.bacterium))].sort();
  const critical = new Set(rows.filter((r) => (pathogens.find((p) => p.name === r.bacterium)?.who_priority ?? "") === "critical").map((r) => r.bacterium));
  const signals = useMemo(() => detectSignals(rows, drugs), [rows, drugs]);
  const risk = cityRisk(base);
  const trend = monthlyTrend(rows).slice(Math.min(from, to), Math.max(from, to) + 1);
  const top = topResistant(rows);
  const eff = classEfficacy(rows, drugs);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 rounded-2xl border bg-card/60 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Регион"><select aria-label="Фильтр: регион" className={selectCls} value={city} onChange={(e) => setCity(e.target.value)}><option value={ALL}>Все регионы</option>{risk.map((c) => <option key={c.city}>{c.city}</option>)}</select></Field>
        <Field label="Возбудитель"><select aria-label="Фильтр: возбудитель" className={selectCls} value={bact} onChange={(e) => setBact(e.target.value)}><option value={ALL}>Все возбудители</option>{bactOptions.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Антибиотик"><select aria-label="Фильтр: антибиотик" className={selectCls} value={drug} onChange={(e) => setDrug(e.target.value)}><option value={ALL}>Все препараты</option>{drugs.map((d) => <option key={`${d.name}${d.own}`}>{d.name}</option>)}</select></Field>
        <Field label="Биоматериал"><select aria-label="Фильтр: биоматериал" className={selectCls} value={bio} onChange={(e) => setBio(e.target.value)}><option value={ALL}>Любой</option>{BIOMATERIALS.map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field label="Период с"><select aria-label="Период с" className={selectCls} value={from} onChange={(e) => setFrom(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i}>{m} 2026</option>)}</select></Field>
        <Field label="по"><select aria-label="Период по" className={selectCls} value={to} onChange={(e) => setTo(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i}>{m} 2026</option>)}</select></Field>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Всего исследовано изолятов" value={rows.length} hint={`${rows.filter((r) => !r.demo).length} из вашей лаборатории`} icon={<Activity className="size-5" />} />
        <Kpi label="Индекс резистентности (R %)" value={pct(rShare(rows))} hint={`${rows.filter((r) => r.status === "R").length} резистентных изолятов`} icon={<ShieldAlert className="size-5" />} tone={rShare(rows) >= 0.3 ? "danger" : "warning"} />
        <Kpi label="Критические патогены ВОЗ" value={critical.size} hint={[...critical].slice(0, 2).join(", ") || "не выявлены"} icon={<Biohazard className="size-5" />} tone="danger" />
        <Kpi label="Активные пункты мониторинга" value={new Set(rows.map((r) => r.location)).size} hint={`${new Set(rows.map((r) => r.city)).size} регионов`} icon={<MapPin className="size-5" />} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Региональная карта риска вспышек" icon={<Radar className="size-4" />}>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {risk.map((c) => (
              <button key={c.city} type="button" onClick={() => setCity(city === c.city ? ALL : c.city)} className={cn("min-w-0 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5", levelCls[c.level], city === c.city && "shadow-glow")}>
                <p className="truncate text-sm font-semibold">{c.city}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{c.n ? pct(c.share) : "—"}</p>
                <p className="text-xs opacity-80">{levelLabel[c.level]} · {c.n} изол.</p>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Оперативные сигналы эпиднадзора" icon={<AlertTriangle className="size-4" />}>
          {signals.length === 0 ? <p className="text-sm text-muted-foreground">Аномального роста устойчивости за выбранный период не выявлено.</p> : (
            <ul className="space-y-3">{signals.map((s) => (
              <li key={s.title} className={cn("rounded-xl border p-3", s.level === "critical" ? "border-danger/40 bg-danger-soft" : "border-warning/40 bg-warning-soft")}>
                <p className={cn("text-sm font-semibold", s.level === "critical" ? "text-danger" : "text-warning")}>{s.level === "critical" ? "● Критический сигнал" : "● Предупреждение"}: {s.title}</p>
                <p className="mt-1 text-xs text-foreground/80">{s.detail}</p>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Динамика резистентности, R %" className="lg:col-span-1">
          <div className="h-64"><ResponsiveContainer><LineChart data={trend}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} /><YAxis stroke="var(--muted-foreground)" fontSize={12} unit="%" /><Tooltip {...tip} /><Line type="monotone" dataKey="R" name="R %" stroke="var(--chart-4)" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
        </Card>
        <Card title="Топ-5 устойчивых патогенов">
          <div className="h-64"><ResponsiveContainer><BarChart data={top} layout="vertical" margin={{ left: 10 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis type="number" unit="%" stroke="var(--muted-foreground)" fontSize={12} /><YAxis type="category" dataKey="name" width={130} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v: string) => v.replace(/^(\w)\w+ /, "$1. ")} /><Tooltip {...tip} /><Bar dataKey="R" name="R %" radius={[0, 6, 6, 0]}>{top.map((t) => <Cell key={t.name} fill={t.R >= 40 ? "var(--chart-4)" : t.R >= 25 ? "var(--chart-3)" : "var(--chart-2)"} />)}</Bar></BarChart></ResponsiveContainer></div>
        </Card>
        <Card title="Эффективность классов антибиотиков, S %">
          <div className="h-64"><ResponsiveContainer><BarChart data={eff}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="cls" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-25} textAnchor="end" height={70} /><YAxis unit="%" stroke="var(--muted-foreground)" fontSize={12} /><Tooltip {...tip} /><Bar dataKey="S" name="Чувствительны, %" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">Демонстрационная выборка: {samples.filter((s) => s.demo).length} изолятов по 8 регионам Казахстана; ваши облачные пробы учитываются автоматически. {bact !== ALL && kbFor(bact) ? `${bact}: ${kbFor(bact)!.ru}, класс риска — ${classOf(drugs, drug === ALL ? "" : drug)}.` : ""}</p>
    </div>
  );
}
