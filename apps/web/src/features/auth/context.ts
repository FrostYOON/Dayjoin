import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";
export type Profile = { id: string; email: string; displayName: string };
type AuthState = {
  session: Session | null;
  user: Profile | null;
  loading: boolean;
  error: string;
  retry: () => void;
  logout: () => Promise<string | null>;
};
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
