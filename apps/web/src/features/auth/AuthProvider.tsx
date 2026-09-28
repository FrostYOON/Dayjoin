import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { authClient, authError } from "./client.ts";

import { AuthContext, type Profile } from "./context.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(
    authClient ? undefined : null,
  );
  const [verified, setVerified] = useState<{
    token: string;
    profile: Profile | null;
    error: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!authClient) return;
    let active = true;
    const { data } = authClient.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });
    void authClient.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!active) return;
        if (failure) setError(authError(failure));
        setSession(data.session);
      })
      .catch(() => {
        if (active) {
          setSession(null);
          setError("로그인 상태를 확인하지 못했어요.");
        }
      });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const abort = new AbortController();
    void fetch("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(response.status === 401 ? "expired" : "unavailable");
        const value: unknown = await response.json();
        if (
          !value ||
          typeof value !== "object" ||
          !("id" in value) ||
          value.id !== session.user.id ||
          !("email" in value) ||
          typeof value.email !== "string" ||
          !("displayName" in value) ||
          typeof value.displayName !== "string"
        )
          throw new Error("unavailable");
        if (!abort.signal.aborted)
          setVerified({
            token: session.access_token,
            profile: value as Profile,
            error: "",
          });
      })
      .catch((failure: unknown) => {
        if (abort.signal.aborted) return;
        setVerified({
          token: session.access_token,
          profile: null,
          error:
            failure instanceof Error && failure.message === "expired"
              ? "로그인 확인이 필요해요. 로그아웃 후 다시 로그인해 주세요."
              : "로그인 서버에 연결하지 못했어요. 연결 후 다시 확인해 주세요.",
        });
      });
    return () => abort.abort();
  }, [session, attempt]);

  const logout = async () => {
    if (!authClient) return null;
    try {
      const { error: failure } = await authClient.auth.signOut({
        scope: "local",
      });
      if (failure) return authError(failure);
      setVerified(null);
      setSession(null);
      setError("");
      return null;
    } catch {
      return "로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.";
    }
  };
  const current =
    session && verified?.token === session.access_token ? verified : null;
  return (
    <AuthContext
      value={{
        session: session ?? null,
        user: current?.profile ?? null,
        loading: session === undefined || (!!session && !current),
        error: current?.error || error,
        retry: () => {
          setVerified(null);
          setAttempt((n) => n + 1);
        },
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
