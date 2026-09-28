import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
// This browser client must only receive the public project key.
export const authClient =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
          storageKey: "dayjoin-auth-v1",
        },
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              cache: "no-store",
              signal: AbortSignal.timeout(12000),
            }),
        },
      })
    : null;

export function authError(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
  switch (code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호를 확인해 주세요.";
    case "email_not_confirmed":
      return "이메일 확인을 먼저 완료해 주세요. 아래에서 확인 메일을 다시 받을 수 있어요.";
    case "weak_password":
      return "비밀번호는 12자 이상으로, 추측하기 어렵게 입력해 주세요.";
    case "same_password":
      return "이전과 다른 비밀번호를 입력해 주세요.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return "링크가 만료되었거나 사용할 수 없어요. 메일을 다시 요청해 주세요.";
    default:
      return "처리하지 못했어요. 연결을 확인하고 잠시 후 다시 시도해 주세요.";
  }
}

export const callbackUrl = () => `${window.location.origin}/auth/callback`;

// React StrictMode can mount the callback twice. A single-use PKCE code must
// only be exchanged once; do not log it or leave it in navigation history.
async function exchangeOnce(code: string) {
  if (!authClient) throw new Error("Auth unavailable");
  let recovery = false;
  const { data: listener } = authClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recovery = true;
  });
  try {
    const { error } = await authClient.auth.exchangeCodeForSession(code);
    return { error, recovery };
  } finally {
    listener.subscription.unsubscribe();
  }
}
let exchange:
  { code: string; result: ReturnType<typeof exchangeOnce> } | undefined;
export function exchangeCallback(code: string) {
  if (exchange?.code !== code) exchange = { code, result: exchangeOnce(code) };
  return exchange.result;
}
