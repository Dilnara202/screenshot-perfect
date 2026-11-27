export type Taxonomy = { status: string; rank: string; scientificName: string; levels: Array<{ label: string; value: string }>; confidence: number; matchType: string } | null;
export type Publication = { id: string; title: string; authors: string; journal: string; year: string; url: string };
export type WikiSummary = { title: string; extract: string; image: string | null; url: string } | null;

export async function gbifMatch(name: string, signal?: AbortSignal): Promise<Taxonomy> {
  const res = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}`, { signal: signal ?? null });
  if (!res.ok) throw new Error("GBIF недоступен");
  const d = await res.json() as Record<string, string | number | undefined>;
  if (d["matchType"] === "NONE") return null;
  const L = [["Царство", "kingdom"], ["Тип", "phylum"], ["Класс", "class"], ["Порядок", "order"], ["Семейство", "family"], ["Род", "genus"], ["Вид", "species"]] as const;
  return { status: String(d["status"] ?? "—"), rank: String(d["rank"] ?? "—"), scientificName: String(d["scientificName"] ?? name), confidence: Number(d["confidence"] ?? 0), matchType: String(d["matchType"] ?? ""), levels: L.map(([label, k]) => ({ label, value: String(d[k] ?? "—") })) };
}

export async function pubmed(name: string, signal?: AbortSignal): Promise<Publication[]> {
  const term = `"${name}"[Title/Abstract] AND (antimicrobial resistance OR drug resistance OR antibiotic resistance)`;
  const base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const s = await fetch(`${base}/esearch.fcgi?db=pubmed&retmode=json&sort=pub_date&retmax=5&term=${encodeURIComponent(term)}`, { signal: signal ?? null });
  if (!s.ok) throw new Error("PubMed недоступен");
  const ids = ((await s.json()) as { esearchresult?: { idlist?: string[] } }).esearchresult?.idlist ?? [];
  if (!ids.length) return [];
  const r = await fetch(`${base}/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`, { signal: signal ?? null });
  if (!r.ok) throw new Error("PubMed недоступен");
  const result = ((await r.json()) as { result?: Record<string, { title?: string; authors?: Array<{ name: string }>; fulljournalname?: string; source?: string; pubdate?: string }> }).result ?? {};
  return ids.flatMap((id) => { const x = result[id]; if (!x) return []; const a = x.authors ?? []; return [{ id, title: x.title ?? "", authors: a.slice(0, 3).map((y) => y.name).join(", ") + (a.length > 3 ? " и др." : ""), journal: x.fulljournalname ?? x.source ?? "", year: (x.pubdate ?? "").slice(0, 4), url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` }]; });
}

export async function wiki(name: string, signal?: AbortSignal): Promise<WikiSummary> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name.trim().replaceAll(" ", "_"))}`, { signal: signal ?? null });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Wikipedia недоступна");
  const d = await res.json() as { title: string; extract?: string; thumbnail?: { source: string }; originalimage?: { source: string }; content_urls?: { desktop?: { page?: string } } };
  return { title: d.title, extract: d.extract ?? "", image: d.originalimage?.source ?? d.thumbnail?.source ?? null, url: d.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}` };
}
