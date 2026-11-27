import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadDrugs, loadPathogens, loadSamples } from "@/lib/clinic-data";
import { DEFAULT_DRUGS, DEFAULT_PATHOGENS, demoSamples } from "@/lib/clinical";
import { useAmrAuth } from "./AuthProvider";

export function useClinic() {
  const { user, ready } = useAmrAuth();
  const uid = user?.id;
  const profile = useQuery({
    queryKey: ["profile", uid], enabled: ready && !!uid,
    queryFn: async ({ signal }) => { const { data, error } = await supabase.from("profiles").select("laboratory_name").eq("id", uid!).abortSignal(signal).single(); if (error) throw error; return data; },
  });
  const pathogens = useQuery({ queryKey: ["pathogens", uid], enabled: ready, queryFn: () => loadPathogens(uid) });
  const drugs = useQuery({ queryKey: ["antibiotics", uid], enabled: ready, queryFn: () => loadDrugs(uid) });
  const cloud = useQuery({ queryKey: ["samples", uid], enabled: ready && !!uid, queryFn: ({ signal }) => loadSamples(uid!, signal) });
  const drugList = drugs.data?.length ? drugs.data : DEFAULT_DRUGS;
  const demo = useMemo(() => demoSamples(drugList), [drugList]);
  const samples = useMemo(() => [...(cloud.data ?? []), ...demo], [cloud.data, demo]);
  return { user, ready, profile, pathogens: pathogens.data?.length ? pathogens.data : DEFAULT_PATHOGENS, drugs: drugList, samples, cloud, refError: pathogens.error ?? drugs.error };
}
export type Clinic = ReturnType<typeof useClinic>;
