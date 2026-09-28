import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import "../../App.css";
import { AuthProvider } from "./AuthProvider.tsx";
import { useAuth } from "./context.ts";
import { AuthCallback, AuthPage } from "./AuthPage.tsx";

const App = lazy(() => import("../../App.tsx"));

function Calendar() {
  const { session } = useAuth();
  // A changed identity destroys all calendar preview state and open drafts.
  return (
    <Suspense fallback={<p role="status">캘린더를 불러오고 있어요…</p>}>
      <App key={session?.user.id ?? "guest"} />
    </Suspense>
  );
}
export function AuthRoot() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route
            path="/auth/login"
            element={<AuthPage key="login" mode="login" />}
          />
          <Route
            path="/auth/signup"
            element={<AuthPage key="signup" mode="signup" />}
          />
          <Route
            path="/auth/forgot"
            element={<AuthPage key="forgot" mode="forgot" />}
          />
          <Route
            path="/auth/resend"
            element={<AuthPage key="resend" mode="resend" />}
          />
          <Route
            path="/auth/reset"
            element={<AuthPage key="reset" mode="reset" />}
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
