export const SITES = ["Пункт Север", "Пункт Юг", "Пункт Восток", "Центральная лаборатория"] as const;
export const BACTERIA = ["E. coli", "S. aureus", "K. pneumoniae"] as const;
export const ANTIBIOTICS = ["Амоксициллин", "Ципрофлоксацин", "Цефтриаксон"] as const;
export const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн"] as const;

export type Site = (typeof SITES)[number];
export type Bacterium = (typeof BACTERIA)[number];
export type Antibiotic = (typeof ANTIBIOTICS)[number];
export type Status = "S" | "I" | "R";

/** Пороги (мм): диаметр ≤ r → Устойчив, ≥ s → Чувствителен, между — Промежуточный. */
export const BREAKPOINTS: Record<Bacterium, Record<Antibiotic, { r: number; s: number }>> = {
  "E. coli": { Амоксициллин: { r: 13, s: 17 }, Ципрофлоксацин: { r: 21, s: 26 }, Цефтриаксон: { r: 19, s: 23 } },
  "S. aureus": { Амоксициллин: { r: 20, s: 29 }, Ципрофлоксацин: { r: 15, s: 21 }, Цефтриаксон: { r: 13, s: 21 } },
  "K. pneumoniae": { Амоксициллин: { r: 13, s: 17 }, Ципрофлоксацин: { r: 21, s: 26 }, Цефтриаксон: { r: 19, s: 23 } },
};

export function classify(b: Bacterium, a: Antibiotic, d: number): Status {
  const { r, s } = BREAKPOINTS[b][a];
  if (d <= r) return "R";
  if (d >= s) return "S";
  return "I";
}

export function isBorderline(b: Bacterium, a: Antibiotic, d: number): boolean {
  const { r, s } = BREAKPOINTS[b][a];
  return Math.abs(d - r) <= 1.5 || Math.abs(d - s) <= 1.5;
}

export const STATUS_LABEL: Record<Status, string> = {
  S: "Чувствителен (S)",
  I: "Промежуточный (I)",
  R: "Устойчив (R)",
};

// Гены
export const REFERENCE = "ATGGCTACGTTAGCAATCGGTACA";
export const SCENARIOS = [
  { id: "none", label: "Без мутаций (норма)", seq: REFERENCE },
  { id: "p8", label: "Мутация в позиции 8 (C -> G) — маркер устойчивости к бета-лактамам", seq: mutate(REFERENCE, 8, "G") },
  { id: "p16", label: "Мутация в позиции 16 (A -> T) — высокий риск устойчивости к фторхинолонам", seq: mutate(REFERENCE, 16, "T") },
] as const;

function mutate(seq: string, pos: number, to: string) {
  return seq.slice(0, pos - 1) + to + seq.slice(pos);
}

export type Mutation = { pos: number; from: string; to: string; risk: string };

export function riskFor(pos: number): string {
  if (pos === 8) return "Маркер устойчивости к бета-лактамам (амоксициллин, цефтриаксон).";
  if (pos === 16) return "Высокий риск устойчивости к фторхинолонам (ципрофлоксацин).";
  return "Замена вне известных маркерных позиций — клиническая значимость не установлена, требуется уточнение.";
}

export function compareGenes(ref: string, sample: string): Mutation[] {
  const out: Mutation[] = [];
  for (let i = 0; i < ref.length; i++) {
    const s = sample[i] ?? "-";
    if (s !== ref[i]) out.push({ pos: i + 1, from: ref[i]!, to: s, risk: riskFor(i + 1) });
  }
  return out;
}

// Записи
export type RecordRow = {
  id: number;
  date: string; // YYYY-MM-DD
  site: Site;
  bacterium: Bacterium;
  antibiotic: Antibiotic;
  diameter: number;
  mutation: string; // "—" если нет
};

export function monthIndex(date: string) {
  return Number(date.slice(5, 7)) - 1;
}

const seed: Array<[string, Site, Bacterium, Antibiotic, number, string]> = [
  ["2026-01-12", "Пункт Север", "E. coli", "Амоксициллин", 19, "—"],
  ["2026-01-18", "Пункт Юг", "K. pneumoniae", "Цефтриаксон", 25, "—"],
  ["2026-01-22", "Пункт Восток", "S. aureus", "Ципрофлоксацин", 23, "—"],
  ["2026-01-27", "Центральная лаборатория", "E. coli", "Ципрофлоксацин", 28, "—"],
  ["2026-02-05", "Пункт Север", "S. aureus", "Цефтриаксон", 22, "—"],
  ["2026-02-11", "Пункт Юг", "E. coli", "Амоксициллин", 16, "—"],
  ["2026-02-19", "Пункт Восток", "K. pneumoniae", "Ципрофлоксацин", 27, "—"],
  ["2026-02-24", "Центральная лаборатория", "S. aureus", "Амоксициллин", 30, "—"],
  ["2026-03-04", "Пункт Север", "K. pneumoniae", "Амоксициллин", 18, "—"],
  ["2026-03-10", "Пункт Юг", "E. coli", "Цефтриаксон", 20, "—"],
  ["2026-03-17", "Пункт Восток", "E. coli", "Амоксициллин", 15, "—"],
  ["2026-03-25", "Центральная лаборатория", "K. pneumoniae", "Цефтриаксон", 24, "—"],
  ["2026-04-03", "Пункт Север", "E. coli", "Ципрофлоксацин", 27, "—"],
  ["2026-04-09", "Пункт Юг", "K. pneumoniae", "Амоксициллин", 12, "Поз. 8 C→G"],
  ["2026-04-16", "Пункт Восток", "S. aureus", "Цефтриаксон", 21, "—"],
  ["2026-04-28", "Центральная лаборатория", "E. coli", "Амоксициллин", 18, "—"],
  ["2026-05-06", "Пункт Север", "S. aureus", "Ципрофлоксацин", 20, "—"],
  ["2026-05-13", "Пункт Юг", "E. coli", "Ципрофлоксацин", 19, "Поз. 16 A→T"],
  ["2026-05-20", "Пункт Восток", "K. pneumoniae", "Цефтриаксон", 23, "—"],
  ["2026-05-27", "Центральная лаборатория", "S. aureus", "Цефтриаксон", 25, "—"],
  ["2026-06-02", "Пункт Север", "E. coli", "Цефтриаксон", 24, "—"],
  ["2026-06-08", "Пункт Юг", "K. pneumoniae", "Цефтриаксон", 17, "Поз. 8 C→G"],
  ["2026-06-15", "Пункт Восток", "E. coli", "Ципрофлоксацин", 22, "—"],
  ["2026-06-22", "Центральная лаборатория", "K. pneumoniae", "Ципрофлоксацин", 29, "—"],
];

export const SEED_RECORDS: RecordRow[] = seed.map(([date, site, bacterium, antibiotic, diameter, mutation], i) => ({
  id: i + 1, date, site, bacterium, antibiotic, diameter, mutation,
}));

export type Insight = { cause: string; actions: string[] };

export function analyze(rows: RecordRow[]): Insight {
  if (rows.length === 0) return { cause: "Нет данных по выбранным фильтрам.", actions: ["Расширьте фильтры или внесите новые замеры."] };
  const n = rows.length;
  const r = rows.filter((x) => classify(x.bacterium, x.antibiotic, x.diameter) === "R");
  const border = rows.filter((x) => isBorderline(x.bacterium, x.antibiotic, x.diameter));
  const rShare = r.length / n;
  const bShare = border.length / n;
  const bySite = new Map<string, number>();
  r.forEach((x) => bySite.set(x.site, (bySite.get(x.site) ?? 0) + 1));
  const topSite = [...bySite.entries()].sort((a, b) => b[1] - a[1])[0];
  const withMut = r.filter((x) => x.mutation !== "—").length;
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  if (rShare >= 0.15 && topSite) {
    const abx = [...new Set(r.map((x) => x.antibiotic))].join(", ");
    return {
      cause: `Доля устойчивых проб — ${pct(rShare)}. Резистентные штаммы сосредоточены в «${topSite[0]}» (${topSite[1]} из ${r.length}).${withMut ? ` В ${withMut} из них выявлены мутации-маркеры — фенотип совпадает с генотипом, вероятна циркуляция устойчивого штамма.` : ""}`,
      actions: [
        `Направить образцы из «${topSite[0]}» в референс-центр на секвенирование.`,
        `Взять на контроль расход препаратов группы риска: ${abx}.`,
        bShare > 0 ? `Перепроверить ${border.length} пограничных чашек повторным замером.` : "Усилить эпиднадзор и частоту отбора проб в пункте.",
      ],
    };
  }
  if (bShare >= 0.25) {
    return {
      cause: `Пограничные значения — ${pct(bShare)} записей. Вероятна погрешность ручных измерений на местах (качество среды, толщина агара, калибровка линейки).`,
      actions: [
        "Перепроверить пограничные чашки повторным замером вторым специалистом.",
        "Провести внутренний контроль качества с эталонными штаммами ATCC.",
        "Проверить партии дисков и сред, провести обучение персонала.",
      ],
    };
  }
  return {
    cause: `Ситуация стабильна: устойчивых — ${pct(rShare)}, пограничных — ${pct(bShare)}. Выраженных трендов не выявлено.`,
    actions: [
      "Продолжить плановый мониторинг в текущем режиме.",
      bShare > 0 ? "Выборочно перепроверить пограничные чашки." : "Поддерживать регулярный внутренний контроль качества.",
      "Ежемесячно сверять данные с референс-центром.",
    ],
  };
}
