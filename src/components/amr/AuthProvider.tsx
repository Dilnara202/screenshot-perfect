import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = async () => {
      const current = ++revision;
      try {
        const { data } = await supabase.auth.getUser();
        if (active && current === revision) { setUser(data.user); setReady(true); }
      } catch { if (active && current === revision) { setUser(null); setReady(true); } }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") { revision++; setUser(null); setReady(true); }
      else queueMicrotask(() => { void refresh(); void queryClient.invalidateQueries(); });
      void router.invalidate();
    });
    void refresh();
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient, router]);
  return <AuthContext.Provider value={{ user, ready }}>{children}</AuthContext.Provider>;
}

export function useAmrAuth() { return useContext(AuthContext); }