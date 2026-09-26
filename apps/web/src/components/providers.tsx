"use client";
import {
  createContext,
  useContext,
  useState,
  useRef,
  useSyncExternalStore,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { http, ApiError } from "@/lib/http";
import { demoRequest, resetDemo } from "@/lib/demo";
import type { User } from "@/lib/types";
export const DEMO = process.env.NEXT_PUBLIC_DATA_MODE !== "real";
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const result = await (DEMO
    ? demoRequest<T>(path, method, body)
    : http<T>(path, method, body));
  if (path === "categories" && method === "GET") {
    type Node = { children?: Node[] };
    const flatten = (nodes: Node[]): Node[] =>
      nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
    return flatten(result as Node[]) as T;
  }
  return result;
}
const subscribe = () => () => {};
function normalizeUser(
  raw: Omit<User, "permissions"> & {
    permissions: (string | { permission: string })[];
  },
) {
  return {
    ...raw,
    permissions: raw.permissions.map((p) =>
      typeof p === "string" ? p : p.permission,
    ),
  } as User;
}
type Session = {
  user: User | null;
  loading: boolean;
  ready: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  reset: () => void;
  notify: (text: string) => void;
};
const Context = createContext<Session>(null!);
export const useSession = () => useContext(Context);
function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [notice, setNotice] = useState("");
  const sessionChannel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(
      `districo-session-${DEMO ? "demo" : "real"}`,
    );
    sessionChannel.current = channel;
    // Cookies/demo session are shared by tabs. Reload on identity changes so no old
    // private query or in-flight mutation survives under another user's session.
    channel.onmessage = () => window.location.reload();
    return () => {
      channel.close();
      sessionChannel.current = null;
    };
  }, []);
  const session = useQuery({
    queryKey: ["session"],
    enabled: ready,
    queryFn: async () => {
      try {
        return normalizeUser(await request("auth/me"));
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60000,
  });
  // Borra los datos del usuario anterior sin quitar la consulta ["session"]:
  // client.clear() la eliminaba y el proveedor seguía mostrando la identidad
  // vieja hasta recargar. Las demás claves llevan el id del usuario.
  const replaceSession = useCallback(
    (user: User | null) => {
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "session",
      });
      client.setQueryData(["session"], user);
    },
    [client],
  );
  const expire = useCallback(() => replaceSession(null), [replaceSession]);
  useEffect(() => {
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [expire]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function login(email: string, password: string) {
    await request("auth/login", "POST", { email, password });
    const user = normalizeUser(await request("auth/me"));
    await client.cancelQueries();
    replaceSession(user);
    sessionChannel.current?.postMessage("changed");
    return user;
  }
  async function logout() {
    try {
      await request("auth/logout", "POST", {});
    } finally {
      await client.cancelQueries();
      expire();
      sessionChannel.current?.postMessage("changed");
    }
  }
  function reset() {
    resetDemo();
    replaceSession(null);
    setNotice("Escenario de demostración reiniciado.");
    sessionChannel.current?.postMessage("changed");
  }
  return (
    <Context.Provider
      value={{
        user: session.data ?? null,
        loading: !ready || session.isPending,
        ready,
        error: session.error,
        login,
        logout,
        reset,
        notify: setNotice,
      }}
    >
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`toast ${notice ? "visible" : ""}`}
      >
        {notice}
      </div>
    </Context.Provider>
  );
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 20000 },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
export function useApi<T>(path: string, enabled = true) {
  const { user, ready, loading } = useSession();
  return useQuery<T>({
    queryKey: [DEMO ? "demo" : "real", user?.id ?? "public", path],
    queryFn: () => request<T>(path),
    enabled: ready && !loading && enabled,
  });
}
