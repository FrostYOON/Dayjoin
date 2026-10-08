import type { Profile } from "./context.ts";

export class AuthFailure extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function authRequest(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch("/api/v1/auth/" + path, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const value: unknown = await response.json().catch(() => null);
    const message =
      value &&
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string"
        ? value.message
        : "";
    throw new AuthFailure(response.status, message);
  }
  return response.json();
}
export function authError(error: unknown) {
  if (error instanceof AuthFailure) {
    if (error.message.startsWith("Email delivery unavailable"))
      return "확인 메일을 보내지 못했어요. 가입 확인 메일을 다시 요청해 주세요.";
    if (error.status === 429)
      return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
    if (error.status === 409)
      return "이미 가입한 이메일이에요. 로그인하거나 비밀번호를 변경해 주세요.";
    if (error.message === "Email verification required")
      return "메일함에서 이메일 확인을 먼저 완료해 주세요.";
    if (error.message === "Invalid or expired link")
      return "링크가 만료되었거나 이미 사용되었어요. 새 메일을 요청해 주세요.";
    if (error.status === 401) return "이메일 또는 비밀번호를 확인해 주세요.";
    if (error.status === 400) return "입력한 내용을 확인해 주세요.";
    if (error.status === 403)
      return "접속한 주소를 확인하고 다시 시도해 주세요.";
  }
  return "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
export function readProfile(value: unknown): Profile {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("email" in value) ||
    typeof value.email !== "string" ||
    !("displayName" in value) ||
    typeof value.displayName !== "string" ||
    !("emailVerified" in value) ||
    value.emailVerified !== true
  )
    throw new Error("Invalid profile");
  return value as Profile;
}
