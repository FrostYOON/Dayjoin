import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AuthFailure, authRequest, readProfile } from "./client.ts";
import { AuthContext, type Profile } from "./context.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    try {
      const profile = readProfile(await authRequest("me"));
      if (ticket === generation.current) {
        setUser(profile);
        setError("");
      }
    } catch (cause) {
      if (ticket !== generation.current) return;
      setUser(null);
      setError(
        cause instanceof AuthFailure && cause.status === 401
          ? ""
          : "로그인 상태를 확인하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    const update = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh]);
  const logout = async () => {
    try {
      await authRequest("sign-out", {});
      generation.current++;
      setUser(null);
      setLoading(false);
      setError("");
      return null;
    } catch {
      return "로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.";
    }
  };
  return (
    <AuthContext
      value={{
        user,
        loading,
        error,
        refresh,
        retry: () => {
          void refresh();
        },
        logout,
      }}
    >
      {children}
    </AuthContext>
  );
}
