import { useEffect, useRef, useState } from "react";
import {
  authClient,
  authError,
  callbackUrl,
  getSocialProviders,
  type SocialProvider,
  type SocialProviders,
} from "./client.ts";

const names = { google: "Google", apple: "Apple" } as const;

function ProviderIcon({ provider }: { provider: SocialProvider }) {
  return provider === "google" ? (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.88-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 12.54c.03 3.21 2.82 4.28 2.85 4.29-.02.07-.44 1.53-1.47 3.04-.89 1.3-1.81 2.59-3.26 2.62-1.42.03-1.88-.85-3.51-.85-1.63 0-2.14.82-3.49.88-1.4.05-2.46-1.41-3.36-2.7-1.83-2.65-3.23-7.49-1.35-10.76a5.22 5.22 0 0 1 4.43-2.68c1.38-.03 2.69.94 3.52.94.82 0 2.37-1.16 3.99-.99.67.03 2.55.27 3.75 2.03-.1.06-2.23 1.3-2.2 4.18ZM14.37 4.57c.75-.91 1.26-2.17 1.12-3.43-1.08.04-2.38.72-3.15 1.62-.7.8-1.31 2.1-1.15 3.33 1.2.09 2.42-.61 3.18-1.52Z" />
    </svg>
  );
}

export function SocialLogin({
  disabled,
  onPendingChange,
}: {
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const [providers, setProviders] = useState<SocialProviders | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void getSocialProviders(controller.signal)
      .then((available) => {
        if (!controller.signal.aborted) setProviders(available);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettingsError(true);
      });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    // A cancelled provider visit can return via the browser's back/forward
    // cache, preserving the pending UI from before the redirect.
    const resume = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      inFlight.current = false;
      setPending(null);
      onPendingChange(false);
    };
    window.addEventListener("pageshow", resume);
    return () => window.removeEventListener("pageshow", resume);
  }, [onPendingChange]);

  async function signIn(provider: SocialProvider) {
    if (!authClient || !providers?.[provider] || disabled || inFlight.current)
      return;
    inFlight.current = true;
    setPending(provider);
    onPendingChange(true);
    setError("");
    try {
      // The SDK generates/stores the PKCE verifier and redirects to Supabase.
      // No provider secrets or calendar scopes are needed by this browser.
      const { error } = await authClient.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl() },
      });
      if (error) throw error;
    } catch (cause) {
      setError(authError(cause));
      setPending(null);
      onPendingChange(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="auth-social">
      <div
        className="auth-social-buttons"
        role="group"
        aria-label="소셜 계정으로 시작"
      >
        {(["google", "apple"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            className={`auth-provider auth-provider-${provider}`}
            aria-label={`${names[provider]}로 계속하기`}
            disabled={
              disabled || !!pending || !authClient || !providers?.[provider]
            }
            onClick={() => {
              void signIn(provider);
            }}
          >
            <ProviderIcon provider={provider} />
            <span>
              {pending === provider
                ? "연결하고 있어요…"
                : `${names[provider]}로 계속하기`}
            </span>
            {providers && !providers[provider] && <small>준비 중</small>}
          </button>
        ))}
      </div>
      {settingsError ? (
        <p className="auth-social-status" role="status">
          간편 로그인 상태를 불러오지 못했어요.{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSettingsError(false);
              setAttempt((value) => value + 1);
            }}
          >
            다시 시도
          </button>
        </p>
      ) : !providers ? (
        <p className="auth-social-status" role="status">
          간편 로그인을 확인하고 있어요…
        </p>
      ) : !providers.google || !providers.apple ? (
        <p className="auth-social-status">
          준비 중인 로그인 방식은 아직 이용할 수 없어요.
        </p>
      ) : null}
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      <div className="auth-divider">
        <span>또는 이메일로 계속하기</span>
      </div>
    </div>
  );
}
