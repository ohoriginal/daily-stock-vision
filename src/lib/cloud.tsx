import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  KEYS,
  SYNCED_STORES,
  clearLocalStores,
  getStoreValue,
  setStoreFromRemote,
  type StoreKey,
} from "@/lib/storage";

type CloudStatus = "loading" | "signed-out" | "signed-in";

type CloudContextValue = {
  status: CloudStatus;
  email: string | null;
  syncing: boolean;
  lastSync: string | null;
  signOut: () => Promise<void>;
};

const CloudContext = createContext<CloudContextValue>({
  status: "loading",
  email: null,
  syncing: false,
  lastSync: null,
  signOut: async () => {},
});

const keyToStore = new Map<string, StoreKey>(
  SYNCED_STORES.map((name) => [KEYS[name], name] as const),
);

export function CloudProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<CloudStatus>("loading");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const pendingRef = useRef(new Map<StoreKey, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setStatus(data.session ? "signed-in" : "signed-out");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      setStatus(next ? "signed-in" : "signed-out");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  // Pull + realtime + push
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let channel: RealtimeChannel | undefined;

    const pushStore = async (name: StoreKey) => {
      const value = getStoreValue(name);
      setSyncing(true);
      const { error } = await supabase
        .from("app_state")
        .upsert(
          { user_id: userId, key: name, value: value as never, updated_at: new Date().toISOString() },
          { onConflict: "user_id,key" },
        );
      setSyncing(false);
      if (!error) setLastSync(new Date().toISOString());
    };

    const initialSync = async () => {
      setSyncing(true);
      const { data, error } = await supabase
        .from("app_state")
        .select("key, value")
        .eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        setSyncing(false);
        return;
      }
      const remote = new Map((data ?? []).map((row) => [row.key as StoreKey, row.value]));
      for (const name of SYNCED_STORES) {
        if (remote.has(name)) {
          setStoreFromRemote(name, remote.get(name));
        } else {
          // First device for this account: seed the cloud with what's already here.
          await pushStore(name);
        }
      }
      if (cancelled) return;
      setSyncing(false);
      setLastSync(new Date().toISOString());
    };

    void initialSync();

    channel = supabase
      .channel(`app_state:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_state", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { key?: string; value?: unknown } | null;
          if (!row?.key) return;
          const name = SYNCED_STORES.find((s) => s === row.key);
          if (!name) return;
          setStoreFromRemote(name, row.value);
          setLastSync(new Date().toISOString());
        },
      )
      .subscribe();

    const onLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; remote?: boolean }>).detail;
      if (!detail || detail.remote) return;
      const name = keyToStore.get(detail.key);
      if (!name) return;
      const timers = pendingRef.current;
      const existing = timers.get(name);
      if (existing) clearTimeout(existing);
      timers.set(
        name,
        setTimeout(() => {
          timers.delete(name);
          void pushStore(name);
        }, 400),
      );
    };

    window.addEventListener("mm-store", onLocalChange);

    return () => {
      cancelled = true;
      window.removeEventListener("mm-store", onLocalChange);
      for (const timer of pendingRef.current.values()) clearTimeout(timer);
      pendingRef.current.clear();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearLocalStores();
  }, []);

  const value = useMemo<CloudContextValue>(
    () => ({
      status,
      email: session?.user?.email ?? null,
      syncing,
      lastSync,
      signOut,
    }),
    [status, session, syncing, lastSync, signOut],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud() {
  return useContext(CloudContext);
}
