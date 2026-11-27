import { BREAKPOINTS, MONTHS, SEED_RECORDS, type Status } from "./amr";

export const CITIES = ["Усть-Каменогорск", "Алматы", "Астана", "Шымкент", "Караганда", "Павлодар", "Актобе", "Семей"] as const;
export const BIOMATERIALS = ["Кровь", "Мокрота", "Моча", "Раневое отделяемое", "Ликвор"] as const;
export type Biomaterial = (typeof BIOMATERIALS)[number];
export type Method = "disk" | "mic";
export type WhoPriority = "critical" | "high" | "medium" | "none";
export const WHO_LABEL: Record<WhoPriority, string> = { critical: "Критический приоритет ВОЗ", high: "Высокий приоритет ВОЗ", medium: "Средний приоритет ВОЗ", none: "Вне списка ВОЗ BPPL" };
export const CATEGORY_LABEL: Record<Status, string> = { S: "S — Чувствителен", I: "I — Увеличенная экспозиция", R: "R — Резистентен" };

export type Pathogen = { id?: number; name: string; gram: "+" | "-" | "?"; who_priority: WhoPriority; family: string; resistance_genes: string; own?: boolean };
export type Drug = { id?: number; name: string; drug_class: string; disk_r: number | null; disk_s: number | null; mic_s: number | null; mic_r: number | null; own?: boolean };
export type Sample = {
  id: string; date: string; city: string; location: string; biomaterial: Biomaterial | null;
  bacterium: string; antibiotic: string; method: Method; diameter: number | null; mic: number | null;
  status: Status; borderline: boolean; mutation: string; photo_path: string | null; demo: boolean;
};

export const DEFAULT_PATHOGENS: Pathogen[] = [
  { name: "Escherichia coli", gram: "-", who_priority: "critical", family: "Enterobacteriaceae", resistance_genes: "CTX-M (БЛРС), NDM, OXA-48, mcr-1" },
  { name: "Klebsiella pneumoniae", gram: "-", who_priority: "critical", family: "Enterobacteriaceae", resistance_genes: "CTX-M, SHV, KPC, NDM, OXA-48" },
  { name: "Acinetobacter baumannii", gram: "-", who_priority: "critical", family: "Moraxellaceae", resistance_genes: "OXA-23, OXA-24/40, NDM" },
  { name: "Pseudomonas aeruginosa", gram: "-", who_priority: "high", family: "Pseudomonadaceae", resistance_genes: "VIM, IMP, MexAB-OprM, OprD" },
  { name: "Staphylococcus aureus", gram: "+", who_priority: "high", family: "Staphylococcaceae", resistance_genes: "mecA (PBP2a), blaZ, vanA" },
  { name: "Enterococcus faecium", gram: "+", who_priority: "high", family: "Enterococcaceae", resistance_genes: "vanA, vanB" },
  { name: "Serratia marcescens", gram: "-", who_priority: "critical", family: "Yersiniaceae", resistance_genes: "AmpC, SME, KPC" },
  { name: "Enterobacter cloacae", gram: "-", who_priority: "critical", family: "Enterobacteriaceae", resistance_genes: "AmpC, CTX-M, NDM" },
  { name: "Streptococcus pneumoniae", gram: "+", who_priority: "medium", family: "Streptococcaceae", resistance_genes: "PBP мутации, ermB, mefA" },
  { name: "Salmonella enterica", gram: "-", who_priority: "high", family: "Enterobacteriaceae", resistance_genes: "CTX-M, qnr, gyrA" },
];

export const DEFAULT_DRUGS: Drug[] = [
  ["Амоксициллин", "Аминопенициллины", 13, 17, 8, 8], ["Цефтриаксон", "Цефалоспорины III", 19, 23, 1, 2],
  ["Цефепим", "Цефалоспорины IV", 23, 27, 1, 4], ["Пиперациллин/тазобактам", "Ингибиторозащищённые пенициллины", 19, 20, 8, 8],
  ["Меропенем", "Карбапенемы", 15, 22, 2, 8], ["Имипенем", "Карбапенемы", 18, 22, 2, 4],
  ["Ципрофлоксацин", "Фторхинолоны", 21, 26, 0.25, 0.5], ["Левофлоксацин", "Фторхинолоны", 18, 23, 0.5, 1],
  ["Гентамицин", "Аминогликозиды", 16, 17, 2, 2], ["Амикацин", "Аминогликозиды", 17, 18, 8, 8],
  ["Колистин", "Полимиксины", null, null, 2, 2], ["Ванкомицин", "Гликопептиды", null, null, 2, 2],
  ["Линезолид", "Оксазолидиноны", 20, 21, 4, 4],
].map(([name, drug_class, disk_r, disk_s, mic_s, mic_r]) => ({ name, drug_class, disk_r, disk_s, mic_s, mic_r }) as Drug);

const LEGACY_ALIAS: Record<string, keyof typeof BREAKPOINTS> = { "E. coli": "E. coli", "S. aureus": "S. aureus", "K. pneumoniae": "K. pneumoniae" };

/** Mirrors the database trigger: legacy demo pairs keep their per-species breakpoints, everything else uses the antibiotic reference. */
export function interpret(bacterium: string, drug: Drug | undefined, method: Method, value: number): { status: Status; borderline: boolean } | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const legacy = LEGACY_ALIAS[bacterium];
  const legacyBp = legacy && drug ? (BREAKPOINTS[legacy] as Record<string, { r: number; s: number }>)[drug.name] : undefined;
  if (method === "disk") {
    const r = legacyBp?.r ?? drug?.disk_r; const s = legacyBp?.s ?? drug?.disk_s;
    if (r == null || s == null) return null;
    return { status: value <= r ? "R" : value >= s ? "S" : "I", borderline: Math.abs(value - r) <= 1.5 || Math.abs(value - s) <= 1.5 };
  }
  if (!drug || drug.mic_s == null || drug.mic_r == null) return null;
  const l = Math.log2(value);
  return { status: value <= drug.mic_s ? "S" : value > drug.mic_r ? "R" : "I", borderline: Math.abs(l - Math.log2(drug.mic_s)) <= 1 || Math.abs(l - Math.log2(drug.mic_r)) <= 1 };
}

export function findDrug(drugs: Drug[], name: string) {
  const n = name.toLowerCase();
  return drugs.filter((d) => d.name.toLowerCase() === n).sort((a, b) => Number(!!b.own) - Number(!!a.own))[0];
}

// ---------- Knowledge base ----------
export type Kb = { ru: string; morphology: string; intrinsic: string; genes: string[]; firstLine: string[]; reserve: string[]; avoid: Array<{ drug: string; why: string }>; ic: string[] };
const GN_IC = ["Контактные меры предосторожности, отдельная палата или когортирование.", "Скрининг ректальных мазков у контактных пациентов на носительство.", "Гигиена рук по 5 моментам ВОЗ, дезинфекция поверхностей хлорсодержащими средствами."];
export const KB: Record<string, Kb> = {
  "escherichia coli": { ru: "Кишечная палочка", morphology: "Грамотрицательная палочка, факультативный анаэроб", intrinsic: "Природная устойчивость к ванкомицину, линезолиду (внешняя мембрана).", genes: ["CTX-M (БЛРС)", "NDM-1", "OXA-48", "mcr-1"], firstLine: ["Цефтриаксон", "Пиперациллин/тазобактам", "Амикацин"], reserve: ["Меропенем", "Цефтазидим/авибактам", "Колистин"], avoid: [{ drug: "Амоксициллин", why: "Продукция TEM-1 β-лактамаз и БЛРС гидролизует аминопенициллины." }, { drug: "Ципрофлоксацин", why: "Мутации gyrA/parC и плазмидные qnr-гены снижают аффинность к ДНК-гиразе." }], ic: GN_IC },
  "klebsiella pneumoniae": { ru: "Клебсиелла пневмонии", morphology: "Грамотрицательная капсульная палочка", intrinsic: "Природная устойчивость к ампициллину/амоксициллину (хромосомная SHV-1).", genes: ["CTX-M-15", "KPC", "NDM-1", "OXA-48", "SHV"], firstLine: ["Пиперациллин/тазобактам", "Амикацин", "Цефепим"], reserve: ["Меропенем", "Цефтазидим/авибактам", "Колистин"], avoid: [{ drug: "Амоксициллин", why: "Хромосомная β-лактамаза SHV-1 — природная резистентность." }, { drug: "Цефтриаксон", why: "Высокая частота БЛРС CTX-M-15 гидролизует цефалоспорины III." }], ic: GN_IC },
  "acinetobacter baumannii": { ru: "Ацинетобактер Бауманна", morphology: "Грамотрицательная коккобацилла, строгий аэроб", intrinsic: "Природная устойчивость к амоксициллину, цефалоспоринам I–II, эртапенему.", genes: ["OXA-23", "OXA-24/40", "OXA-51", "NDM-1", "AdeABC"], firstLine: ["Ампициллин/сульбактам", "Меропенем"], reserve: ["Колистин", "Цефидерокол", "Тигециклин"], avoid: [{ drug: "Цефтриаксон", why: "Хромосомная ADC (AmpC) и эффлюкс AdeABC." }, { drug: "Имипенем", why: "Карбапенемазы класса D (OXA-23) широко распространены." }], ic: [...GN_IC, "Строгая изоляция в ОРИТ, контроль контаминации оборудования ИВЛ."] },
  "pseudomonas aeruginosa": { ru: "Синегнойная палочка", morphology: "Грамотрицательная неферментирующая палочка", intrinsic: "Природная устойчивость к амоксициллину, цефтриаксону, эртапенему (AmpC, эффлюкс MexAB-OprM, низкая проницаемость).", genes: ["VIM", "IMP", "MexAB-OprM", "Потеря OprD"], firstLine: ["Пиперациллин/тазобактам", "Цефепим", "Амикацин"], reserve: ["Меропенем", "Цефтолозан/тазобактам", "Колистин"], avoid: [{ drug: "Цефтриаксон", why: "Природная резистентность: индуцибельная AmpC и эффлюкс-насосы MexAB-OprM." }, { drug: "Имипенем", why: "Утрата порина OprD снижает проникновение карбапенемов." }], ic: [...GN_IC, "Контроль водных резервуаров, сифонов и раковин в отделениях."] },
  "staphylococcus aureus": { ru: "Золотистый стафилококк", morphology: "Грамположительный кокк, гроздья", intrinsic: "Природная устойчивость к колистину и азтреонаму.", genes: ["mecA (PBP2a)", "blaZ", "vanA", "erm"], firstLine: ["Цефазолин (MSSA)", "Ванкомицин (MRSA)"], reserve: ["Линезолид", "Даптомицин", "Цефтаролин"], avoid: [{ drug: "Амоксициллин", why: "Пенициллиназа blaZ у >80% штаммов." }, { drug: "Цефтриаксон", why: "При MRSA модификация PBP2a (mecA) делает неэффективными все β-лактамы, кроме цефтаролина." }], ic: ["Скрининг на MRSA при поступлении в ОРИТ.", "Деколонизация носителей мупироцином и хлоргексидином.", "Контактные меры предосторожности."] },
  "enterococcus faecium": { ru: "Энтерококк фэциум", morphology: "Грамположительный кокк, пары и цепочки", intrinsic: "Природная устойчивость к цефалоспоринам, низкий уровень к аминогликозидам.", genes: ["vanA", "vanB", "pbp5"], firstLine: ["Ванкомицин", "Ампициллин (если чувствителен)"], reserve: ["Линезолид", "Даптомицин"], avoid: [{ drug: "Цефтриаксон", why: "Низкая аффинность PBP5 — природная резистентность к цефалоспоринам." }, { drug: "Ванкомицин", why: "При VRE оперон vanA заменяет D-Ala-D-Ala на D-Ala-D-Lac." }], ic: ["Скрининг на VRE в отделениях гематологии и ОРИТ.", "Контактные меры, выделенное оборудование."] },
  "serratia marcescens": { ru: "Серрация марцесценс", morphology: "Грамотрицательная палочка, пигмент продигиозин", intrinsic: "Природная устойчивость к колистину, амоксициллину, цефуроксиму, тетрациклинам.", genes: ["AmpC (хромосомная)", "SME", "KPC"], firstLine: ["Цефепим", "Ципрофлоксацин", "Амикацин"], reserve: ["Меропенем"], avoid: [{ drug: "Колистин", why: "Природная резистентность — модификация липида A." }, { drug: "Амоксициллин", why: "Индуцибельная AmpC β-лактамаза." }], ic: [...GN_IC, "Особый контроль в неонатальных отделениях."] },
  "enterobacter cloacae": { ru: "Энтеробактер клоака", morphology: "Грамотрицательная палочка", intrinsic: "Природная устойчивость к амоксициллину, цефуроксиму (AmpC).", genes: ["AmpC", "CTX-M", "NDM", "VIM"], firstLine: ["Цефепим", "Амикацин"], reserve: ["Меропенем", "Цефтазидим/авибактам"], avoid: [{ drug: "Цефтриаксон", why: "Риск селекции дерепрессированных мутантов AmpC в ходе терапии." }], ic: GN_IC },
  "streptococcus pneumoniae": { ru: "Пневмококк", morphology: "Грамположительный ланцетовидный диплококк", intrinsic: "Природная устойчивость к аминогликозидам (низкий уровень).", genes: ["Мозаичные PBP", "ermB", "mefA"], firstLine: ["Амоксициллин", "Цефтриаксон"], reserve: ["Левофлоксацин", "Ванкомицин", "Линезолид"], avoid: [{ drug: "Гентамицин", why: "Анаэробный метаболизм ограничивает транспорт аминогликозидов." }], ic: ["Капельные меры предосторожности в первые 24 ч терапии.", "Вакцинация групп риска (PCV, PPSV23)."] },
  "salmonella enterica": { ru: "Сальмонелла", morphology: "Грамотрицательная подвижная палочка", intrinsic: "Аминогликозиды клинически неэффективны (внутриклеточная локализация).", genes: ["CTX-M", "qnrS", "gyrA"], firstLine: ["Цефтриаксон", "Азитромицин"], reserve: ["Меропенем"], avoid: [{ drug: "Гентамицин", why: "Внутриклеточный патоген — клиническая неэффективность аминогликозидов." }], ic: ["Энтеральные меры предосторожности, контроль пищеблока."] },
  "mycobacterium tuberculosis": { ru: "Микобактерия туберкулёза", morphology: "Кислотоустойчивая палочка, окраска по Цилю–Нильсену", intrinsic: "Природная устойчивость к большинству β-лактамов (BlaC) и макролидам (erm(37)).", genes: ["rpoB (рифампицин)", "katG/inhA (изониазид)", "gyrA (фторхинолоны)"], firstLine: ["Изониазид", "Рифампицин", "Пиразинамид", "Этамбутол"], reserve: ["Бедаквилин", "Линезолид", "Претоманид"], avoid: [{ drug: "Амоксициллин", why: "β-лактамаза BlaC широкого спектра." }], ic: ["Воздушно-капельная изоляция, палаты с отрицательным давлением, респираторы FFP3."] },
};
export const kbFor = (name: string) => KB[name.trim().toLowerCase()];

const CLASS_MECH: Record<string, { mech: string; cross: string }> = {
  "Аминопенициллины": { mech: "гидролиз β-лактамного кольца β-лактамазами (TEM, SHV, БЛРС)", cross: "Ожидается перекрёстная устойчивость к ампициллину и пиперациллину без ингибитора." },
  "Цефалоспорины III": { mech: "продукция БЛРС (CTX-M) или гиперпродукция AmpC", cross: "Вероятна перекрёстная устойчивость ко всем оксиимино-цефалоспоринам и азтреонаму." },
  "Цефалоспорины IV": { mech: "БЛРС/карбапенемазы, снижение проницаемости", cross: "Высок риск устойчивости к цефалоспоринам III поколения." },
  "Ингибиторозащищённые пенициллины": { mech: "гиперпродукция β-лактамаз, OXA-1, AmpC", cross: "Возможна сниженная активность амоксициллина/клавуланата." },
  "Карбапенемы": { mech: "карбапенемазы (KPC, NDM, OXA-48) или утрата пориновых каналов в сочетании с AmpC/БЛРС", cross: "Перекрёстная устойчивость к меропенему, имипенему и эртапенему; карбапенемазы NDM гидролизуют все β-лактамы, кроме азтреонама." },
  "Фторхинолоны": { mech: "точечные мутации QRDR в gyrA/parC, плазмидные qnr, эффлюкс", cross: "Перекрёстная устойчивость ко всем фторхинолонам класса." },
  "Аминогликозиды": { mech: "аминогликозид-модифицирующие ферменты (AAC, ANT, APH) или 16S рРНК-метилазы", cross: "Возможна устойчивость к тобрамицину; амикацин может сохранять активность." },
  "Полимиксины": { mech: "модификация липида A (mcr-1, мутации mgrB/pmrAB)", cross: "Полная перекрёстная устойчивость к полимиксину B." },
  "Гликопептиды": { mech: "опероны vanA/vanB, утолщение клеточной стенки (VISA)", cross: "При vanA — перекрёстная устойчивость к тейкопланину." },
  "Оксазолидиноны": { mech: "мутации 23S рРНК, ген cfr", cross: "Возможна сниженная активность тедизолида." },
};
export const mechanismFor = (cls: string) => CLASS_MECH[cls] ?? { mech: "механизм требует уточнения молекулярными методами", cross: "Оцените активность других препаратов класса по антибиотикограмме." };

export function conclusion(s: Pick<Sample, "bacterium" | "antibiotic" | "status" | "borderline" | "method" | "diameter" | "mic" | "biomaterial" | "city" | "location">, drug: Drug | undefined): string {
  const kb = kbFor(s.bacterium); const m = mechanismFor(drug?.drug_class ?? "");
  const value = s.method === "disk" ? `диаметр зоны подавления роста ${s.diameter} мм (диско-диффузионный метод)` : `МПК ${s.mic} мг/л (метод серийных разведений)`;
  const verdict = s.status === "R" ? "РЕЗИСТЕНТЕН (R)" : s.status === "I" ? "ЧУВСТВИТЕЛЕН ПРИ УВЕЛИЧЕННОЙ ЭКСПОЗИЦИИ (I)" : "ЧУВСТВИТЕЛЕН (S)";
  const lines = [
    "ЗАКЛЮЧЕНИЕ ВРАЧА-МИКРОБИОЛОГА",
    `Учреждение: ${s.location}${s.city ? `, ${s.city}` : ""}. Биоматериал: ${s.biomaterial ?? "не указан"}.`,
    `Выделен: ${s.bacterium}${kb ? ` (${kb.ru}; ${kb.morphology.toLowerCase()})` : ""}.`,
    `Антибиотик: ${s.antibiotic}${drug?.drug_class ? ` (${drug.drug_class})` : ""}; ${value}.`,
    `Интерпретация по критериям EUCAST/CLSI: ${verdict}.`,
  ];
  if (s.borderline) lines.push("Значение находится в зоне технической неопределённости (ATU) — рекомендован повторный тест или подтверждение альтернативным методом.");
  if (s.status === "R") lines.push(`Вероятный механизм: ${m.mech}.`, `Перекрёстная устойчивость: ${m.cross}`);
  if (s.status === "I") lines.push("Препарат может применяться в повышенной дозе или с продлённой инфузией для достижения целевой экспозиции.");
  if (kb) {
    lines.push(`Природная резистентность вида: ${kb.intrinsic}`);
    lines.push(s.status === "S" ? `Терапия: ${s.antibiotic} может быть рекомендован как препарат таргетной терапии.` : `Препараты выбора: ${kb.firstLine.join(", ")}. Резерв: ${kb.reserve.join(", ")}.`);
  }
  lines.push("Заключение носит справочно-аналитический характер; окончательное решение принимает лечащий врач.");
  return lines.join("\n");
}

// ---------- Demo dataset ----------
function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const CITY_RISK: Record<string, number> = { "Шымкент": 0.35, "Алматы": 0.22, "Астана": 0.15, "Усть-Каменогорск": 0.25, "Караганда": 0.12, "Павлодар": 0.08, "Актобе": 0.1, "Семей": 0.18 };

export function demoSamples(drugs: Drug[] = DEFAULT_DRUGS): Sample[] {
  const rand = rng(20260601); const out: Sample[] = [];
  const pathogens = DEFAULT_PATHOGENS.slice(0, 8).map((p) => p.name);
  const discDrugs = drugs.filter((d) => d.disk_r != null && DEFAULT_DRUGS.some((x) => x.name === d.name));
  for (let i = 0; i < 360; i++) {
    const city = CITIES[Math.floor(rand() * CITIES.length)]!;
    const month = Math.floor(rand() * 6);
    const bacterium = pathogens[Math.floor(rand() * pathogens.length)]!;
    const drug = discDrugs[Math.floor(rand() * discDrugs.length)]!;
    const carba = drug.drug_class === "Карбапенемы";
    const critical = ["Klebsiella pneumoniae", "Acinetobacter baumannii"].includes(bacterium);
    let risk = (CITY_RISK[city] ?? 0.15) + (critical ? 0.15 : 0) + month * 0.025;
    if (carba && critical && (city === "Шымкент" || city === "Алматы")) risk += month * 0.07;
    if (carba && !critical) risk -= 0.12;
    const r = drug.disk_r!, s = drug.disk_s!;
    const roll = rand();
    const diameter = roll < risk ? Math.max(6, r - Math.floor(rand() * 6)) : roll < risk + 0.1 ? Math.round((r + s) / 2) : s + Math.floor(rand() * 8);
    const res = interpret(bacterium, drug, "disk", diameter)!;
    const day = String(1 + Math.floor(rand() * 27)).padStart(2, "0");
    out.push({ id: `demo-${i}`, date: `2026-0${month + 1}-${day}`, city, location: `${city}: ${["ОКБ", "Городская больница №1", "Центр СЭК", "Детская больница"][Math.floor(rand() * 4)]}`, biomaterial: BIOMATERIALS[Math.floor(rand() * 5)]!, bacterium, antibiotic: drug.name, method: "disk", diameter, mic: null, status: res.status, borderline: res.borderline, mutation: res.status === "R" && carba && critical ? "blaOXA-48 / blaNDM (ПЦР)" : "—", photo_path: null, demo: true });
  }
  SEED_RECORDS.forEach((r) => {
    const st = interpret(r.bacterium, findDrug(drugs, r.antibiotic) ?? DEFAULT_DRUGS.find((d) => d.name === r.antibiotic), "disk", r.diameter)!;
    out.push({ id: `seed-${r.id}`, date: r.date, city: "Усть-Каменогорск", location: r.site, biomaterial: null, bacterium: r.bacterium, antibiotic: r.antibiotic, method: "disk", diameter: r.diameter, mic: null, status: st.status, borderline: st.borderline, mutation: r.mutation, photo_path: null, demo: true });
  });
  return out;
}

// ---------- Analytics ----------
export const monthOf = (date: string) => Number(date.slice(5, 7)) - 1;
export const rShare = (rows: Sample[]) => (rows.length ? rows.filter((r) => r.status === "R").length / rows.length : 0);
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const classOf = (drugs: Drug[], name: string) => findDrug(drugs, name)?.drug_class || "Прочие";

export function monthlyTrend(rows: Sample[]) {
  return MONTHS.map((m, i) => { const sub = rows.filter((r) => monthOf(r.date) === i); return { month: m, R: Math.round(rShare(sub) * 100), n: sub.length }; });
}
export function topResistant(rows: Sample[], k = 5) {
  const by = new Map<string, Sample[]>(); rows.forEach((r) => by.set(r.bacterium, [...(by.get(r.bacterium) ?? []), r]));
  return [...by.entries()].filter(([, v]) => v.length >= 3).map(([name, v]) => ({ name, R: Math.round(rShare(v) * 100), n: v.length })).sort((a, b) => b.R - a.R).slice(0, k);
}
export function classEfficacy(rows: Sample[], drugs: Drug[]) {
  const by = new Map<string, Sample[]>(); rows.forEach((r) => { const c = classOf(drugs, r.antibiotic); by.set(c, [...(by.get(c) ?? []), r]); });
  return [...by.entries()].map(([cls, v]) => ({ cls, S: Math.round((v.filter((x) => x.status === "S").length / v.length) * 100), n: v.length })).sort((a, b) => b.S - a.S);
}
export function cityRisk(rows: Sample[]) {
  return CITIES.map((city) => { const sub = rows.filter((r) => r.city === city); const share = rShare(sub); return { city, n: sub.length, share, level: share >= 0.35 ? "high" : share >= 0.2 ? "medium" : "low" } as const; });
}

export type Signal = { level: "critical" | "warning"; title: string; detail: string };
/** Flags pathogen × drug-class pairs whose R share in the last two months grew ≥15 p.p. over the first four. */
export function detectSignals(rows: Sample[], drugs: Drug[]): Signal[] {
  const groups = new Map<string, Sample[]>();
  rows.forEach((r) => { const k = `${r.bacterium}|${classOf(drugs, r.antibiotic)}`; groups.set(k, [...(groups.get(k) ?? []), r]); });
  const out: Array<Signal & { delta: number }> = [];
  for (const [k, v] of groups) {
    const [bact, cls] = k.split("|") as [string, string];
    const early = v.filter((r) => monthOf(r.date) <= 3), late = v.filter((r) => monthOf(r.date) >= 4);
    if (early.length < 3 || late.length < 3) continue;
    const delta = rShare(late) - rShare(early);
    if (delta < 0.15) continue;
    const carba = cls === "Карбапенемы";
    out.push({ delta, level: carba || delta >= 0.3 ? "critical" : "warning", title: carba ? `Рост карбапенеморезистентности ${bact}` : `Рост устойчивости ${bact} к классу «${cls}»`, detail: `R: ${pct(rShare(early))} → ${pct(rShare(late))} (+${Math.round(delta * 100)} п.п.), ${v.length} изолятов. ${carba ? "Требуется ПЦР-скрининг карбапенемаз (KPC, NDM, OXA-48)." : "Проверьте расход препаратов класса и внутренний контроль качества."}` });
  }
  return out.sort((a, b) => b.delta - a.delta).slice(0, 6);
}

export type Recommendation = { drug: string; share: number | null; n: number; note: string };
export function recommend(bacterium: string, cityRows: Sample[]) {
  const kb = kbFor(bacterium);
  const stat = (drug: string) => { const v = cityRows.filter((r) => r.bacterium === bacterium && r.antibiotic === drug); return { share: v.length ? 1 - rShare(v) : null, n: v.length }; };
  const all = [...new Set(cityRows.filter((r) => r.bacterium === bacterium).map((r) => r.antibiotic))].map((drug) => ({ drug, ...stat(drug) }));
  const effective = all.filter((x) => x.n >= 2 && (x.share ?? 0) >= 0.8).sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const risky = all.filter((x) => x.n >= 2 && (x.share ?? 1) < 0.7).sort((a, b) => (a.share ?? 0) - (b.share ?? 0));
  return { kb, effective, risky };
}

export function toCsv(rows: Sample[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const head = ["Дата", "Город", "Учреждение", "Биоматериал", "Возбудитель", "Антибиотик", "Метод", "Диаметр, мм", "МПК, мг/л", "Категория", "ATU", "Мутации"];
  return "\uFEFF" + [head, ...rows.map((r) => [r.date, r.city, r.location, r.biomaterial, r.bacterium, r.antibiotic, r.method === "disk" ? "Диско-диффузия" : "МПК", r.diameter, r.mic, r.status, r.borderline ? "да" : "нет", r.mutation])].map((l) => l.map(esc).join(";")).join("\n");
}

// ---------- Genetics ----------
export const PLASMID_MARKERS = [
  { gene: "blaNDM-1", motif: "GGCGGAATGGCTCATCACGA", meaning: "Металло-β-лактамаза NDM — гидролиз карбапенемов" },
  { gene: "blaKPC", motif: "TCTGGACCGCTGGGAGCTGG", meaning: "Сериновая карбапенемаза KPC" },
  { gene: "blaOXA-48", motif: "GCGTGGTTAAGGATGAACAC", meaning: "Карбапенемаза класса D OXA-48" },
  { gene: "mecA", motif: "AAAATCGATGGTAAAGGTTGGC", meaning: "PBP2a — метициллинорезистентность (MRSA)" },
  { gene: "vanA", motif: "CATGAATAGAATAAAAGTTGCAATA", meaning: "Лигаза D-Ala-D-Lac — резистентность к ванкомицину" },
  { gene: "mcr-1", motif: "CGGTCAGTCCGTTTGTTCTTGTGG", meaning: "Фосфоэтаноламин-трансфераза — резистентность к колистину" },
];
export function detectPlasmids(seq: string) { const s = seq.toUpperCase().replace(/[^ACGT]/g, ""); return PLASMID_MARKERS.filter((m) => s.includes(m.motif)); }
