import { createContext, useContext } from "react";
export type Profile = {
  id: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};
type AuthState = {
  user: Profile | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  retry: () => void;
  logout: () => Promise<string | null>;
};
export const AuthContext = createContext<AuthState | null>(null);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is required");
  return value;
}
