import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  Mail,
} from "lucide-react";
import {
  authClient,
  authError,
  callbackUrl,
  exchangeCallback,
} from "./client.ts";
import { useAuth } from "./context.ts";
import { SocialLogin } from "./SocialLogin.tsx";
import "./auth.css";

type Mode = "login" | "signup" | "forgot" | "reset" | "resend";
type Fields = {
  email: string;
  password: string;
  confirm: string;
  name: string;
};
const copy: Record<
  Mode,
  { title: string; description: string; button: string }
> = {
  login: {
    title: "다시 만나서 반가워요",
    description: "오늘의 일정, 함께할 순간을 이어가요.",
    button: "로그인",
  },
  signup: {
    title: "우리의 하루를 함께",
    description: "Dayjoin에서 나의 계정을 만들어 보세요.",
    button: "회원가입",
  },
  forgot: {
    title: "비밀번호를 잊으셨나요?",
    description: "이메일로 비밀번호 변경 링크를 보내드려요.",
    button: "변경 링크 보내기",
  },
  reset: {
    title: "새 비밀번호를 정해요",
    description: "다른 곳에서 쓰지 않는 비밀번호가 좋아요.",
    button: "비밀번호 변경",
  },
  resend: {
    title: "이메일 확인하기",
    description: "가입할 때 입력한 이메일로 확인 링크를 보내드려요.",
    button: "확인 메일 다시 보내기",
  },
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <Link className="brand" to="/">
          <span className="brand-symbol">
            <CalendarDays size={22} />
          </span>
          Dayjoin<span className="brand-period">.</span>
        </Link>
        <Link className="auth-back" to="/">
          <ArrowLeft size={16} />
          캘린더 둘러보기
        </Link>
      </header>
      <div className="auth-content">
        <section className="auth-story" aria-label="Dayjoin 소개">
          <span className="auth-eyebrow">A LITTLE CLOSER, EVERY DAY</span>
          <h1>
            함께하는 하루가
            <br />
            조금 더 가까워지도록.
          </h1>
          <p>
            저녁 약속부터 기다려 온 여행까지.
            <br />
            우리의 일정과 나의 기록을 한곳에서.
          </p>
          <div className="auth-illustration" aria-hidden="true">
            <div className="auth-mini-heading">
              <span>우리의 한 주</span>
              <span>•••</span>
            </div>
            <div className="auth-week">
              {["월", "화", "수", "목", "금", "토", "일"].map((day, i) => (
                <span key={day}>
                  {day}
                  <strong className={i === 4 ? "selected" : ""}>
                    {21 + i}
                  </strong>
                </span>
              ))}
            </div>
            <div className="auth-sample event">
              <span>19:00</span>
              <strong>함께하는 저녁</strong>
              <span>♡</span>
            </div>
            <div className="auth-sample travel">
              <span>주말</span>
              <strong>기다려 온 여행</strong>
              <Check size={15} />
            </div>
            <span className="auth-note">작은 약속도, 소중한 순간도.</span>
          </div>
        </section>
        <section className="auth-card">{children}</section>
      </div>
      <footer className="auth-footer">
        함께하는 일정과 나만의 돈 기록, Dayjoin.
      </footer>
    </main>
  );
}

export function AuthPage({ mode }: { mode: Mode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState("");
  const [socialPending, setSocialPending] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    resetField,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>();
  const hasPassword = ["login", "signup", "reset"].includes(mode);
  const newPassword = mode === "signup" || mode === "reset";
  const submit = handleSubmit(async (fields) => {
    if (!authClient || socialPending) return;
    setNotice("");
    try {
      const email = fields.email?.trim().toLowerCase();
      if (mode === "login") {
        const { error } = await authClient.auth.signInWithPassword({
          email,
          password: fields.password,
        });
        if (error) throw error;
        navigate("/", { replace: true });
      } else if (mode === "signup") {
        const { error, data } = await authClient.auth.signUp({
          email,
          password: fields.password,
          options: {
            emailRedirectTo: callbackUrl(),
            data: { display_name: fields.name.trim() },
          },
        });
        if (error) throw error;
        if (data.session) navigate("/", { replace: true });
        else setSent(true);
      } else if (mode === "forgot") {
        const { error } = await authClient.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl(),
        });
        if (error) throw error;
        setSent(true);
      } else if (mode === "resend") {
        const { error } = await authClient.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: callbackUrl() },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await authClient.auth.updateUser({
          password: fields.password,
        });
        if (error) throw error;
        // Revoke refresh tokens on other devices after a password reset.
        const result = await authClient.auth.signOut({ scope: "global" });
        setNotice(
          result.error
            ? "비밀번호를 변경했어요. 다른 기기의 로그아웃은 완료하지 못했어요."
            : "비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.",
        );
        setSent(true);
      }
    } catch (error) {
      setError("root", { message: authError(error) });
    } finally {
      resetField("password");
      resetField("confirm");
    }
  });
  if (mode === "reset" && !loading && !session && !sent)
    return (
      <AuthLayout>
        <h2>변경 링크를 먼저 열어 주세요</h2>
        <p>
          이메일로 받은 링크가 필요해요. 만료되었다면 새 링크를 요청해 주세요.
        </p>
        <Link className="auth-submit" to="/auth/forgot">
          변경 링크 요청
        </Link>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      {sent ? (
        <div className="auth-success">
          <span className="auth-mail-icon">
            {mode === "reset" ? <Check size={27} /> : <Mail size={27} />}
          </span>
          <h2>
            {mode === "reset"
              ? "비밀번호를 변경했어요"
              : "메일함을 확인해 주세요"}
          </h2>
          <p role="status">
            {notice ||
              "입력한 주소로 안내가 가능한 경우 메일을 보냈어요. 스팸함도 확인해 주세요."}
          </p>
          {mode !== "reset" && (
            <p className="auth-hint">
              이 브라우저에서 가장 최근에 받은 링크를 열어 주세요. 링크가
              만료되면 다시 요청할 수 있어요.
            </p>
          )}
          <Link className="auth-submit" to="/auth/login">
            로그인으로 돌아가기
            <ArrowRight size={17} />
          </Link>
          {mode !== "reset" && (
            <button className="text-button" onClick={() => setSent(false)}>
              이메일 다시 입력하기
            </button>
          )}
        </div>
      ) : (
        <>
          {(mode === "login" || mode === "signup") && (
            <nav className="auth-tabs" aria-label="계정 시작">
              <Link
                to="/auth/login"
                aria-current={mode === "login" ? "page" : undefined}
              >
                로그인
              </Link>
              <Link
                to="/auth/signup"
                aria-current={mode === "signup" ? "page" : undefined}
              >
                회원가입
              </Link>
            </nav>
          )}
          <h2>{copy[mode].title}</h2>
          <p className="auth-description">{copy[mode].description}</p>
          {!authClient && (
            <p role="alert" className="auth-error">
              아직 로그인 연결을 준비하고 있어요. 잠시 후 다시 방문해 주세요.
            </p>
          )}
          {(mode === "login" || mode === "signup") && (
            <SocialLogin
              disabled={isSubmitting}
              onPendingChange={setSocialPending}
            />
          )}
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <fieldset
              disabled={
                isSubmitting ||
                socialPending ||
                !authClient ||
                (mode === "reset" && loading)
              }
            >
              {mode === "signup" && (
                <label htmlFor="auth-name">
                  이름
                  <input
                    id="auth-name"
                    autoComplete="nickname"
                    placeholder="어떻게 불러드릴까요?"
                    maxLength={50}
                    {...register("name", {
                      required: "이름을 입력해 주세요.",
                      validate: (value) =>
                        !!value.trim() || "이름을 입력해 주세요.",
                    })}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                  />
                  {errors.name && (
                    <span id="name-error" className="auth-field-error">
                      {errors.name.message}
                    </span>
                  )}
                </label>
              )}
              {mode !== "reset" && (
                <label htmlFor="auth-email">
                  이메일
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="hello@example.com"
                    maxLength={254}
                    {...register("email", {
                      required: "이메일을 입력해 주세요.",
                    })}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  {errors.email && (
                    <span id="email-error" className="auth-field-error">
                      {errors.email.message}
                    </span>
                  )}
                </label>
              )}
              {hasPassword && (
                <label htmlFor="auth-password">
                  {newPassword ? "새 비밀번호" : "비밀번호"}
                  <span className="auth-password">
                    <input
                      id="auth-password"
                      aria-label={newPassword ? "새 비밀번호" : "비밀번호"}
                      type={visible ? "text" : "password"}
                      autoComplete={
                        newPassword ? "new-password" : "current-password"
                      }
                      placeholder={
                        newPassword
                          ? "12자 이상 입력해 주세요"
                          : "비밀번호를 입력해 주세요"
                      }
                      maxLength={128}
                      {...register("password", {
                        required: "비밀번호를 입력해 주세요.",
                        ...(newPassword
                          ? {
                              minLength: {
                                value: 12,
                                message: "12자 이상 입력해 주세요.",
                              },
                            }
                          : {}),
                      })}
                      aria-invalid={!!errors.password}
                      aria-describedby={
                        errors.password
                          ? "password-error"
                          : newPassword
                            ? "password-hint"
                            : undefined
                      }
                    />
                    <button
                      type="button"
                      className="auth-eye"
                      aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
                      aria-pressed={visible}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                  {newPassword && (
                    <span id="password-hint" className="auth-password-hint">
                      12자 이상 입력해 주세요. 다른 서비스와 다른 비밀번호가
                      좋아요.
                    </span>
                  )}
                  {errors.password && (
                    <span id="password-error" className="auth-field-error">
                      {errors.password.message}
                    </span>
                  )}
                </label>
              )}
              {newPassword && (
                <label htmlFor="auth-confirm">
                  비밀번호 확인
                  <input
                    id="auth-confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="한 번 더 입력해 주세요"
                    maxLength={128}
                    {...register("confirm", {
                      required: "비밀번호를 다시 입력해 주세요.",
                      validate: (value) =>
                        value === getValues("password") ||
                        "비밀번호가 일치하지 않아요.",
                    })}
                    aria-invalid={!!errors.confirm}
                    aria-describedby={
                      errors.confirm ? "confirm-error" : undefined
                    }
                  />
                  {errors.confirm && (
                    <span id="confirm-error" className="auth-field-error">
                      {errors.confirm.message}
                    </span>
                  )}
                </label>
              )}
              {mode === "login" && (
                <Link className="auth-forgot" to="/auth/forgot">
                  비밀번호를 잊으셨나요?
                </Link>
              )}
              {errors.root && (
                <p role="alert" className="auth-error">
                  {errors.root.message}
                </p>
              )}
              <button className="auth-submit" type="submit">
                {isSubmitting ? "잠시만 기다려 주세요…" : copy[mode].button}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
            </fieldset>
          </form>
          {mode === "signup" && (
            <p className="auth-hint">
              이메일로 가입하면 확인 메일을 보내드려요.
              <br />
              현재 캘린더 기록은 예시 데이터로 제공하고 있어요.
            </p>
          )}
          {mode === "login" ? (
            <Link className="auth-secondary" to="/auth/resend">
              가입 확인 메일을 받지 못했어요
            </Link>
          ) : (
            <Link className="auth-secondary" to="/auth/login">
              로그인으로 돌아가기
            </Link>
          )}
        </>
      )}
    </AuthLayout>
  );
}

export function AuthCallback() {
  const navigate = useNavigate();
  const [{ code, callbackError }] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    return {
      code: query.get("code"),
      callbackError: query.get("error") ?? fragment.get("error"),
    };
  });
  const [message, setMessage] = useState(() =>
    callbackError === "access_denied"
      ? "로그인이 취소되었어요. 원하시면 다시 시도해 주세요."
      : callbackError
        ? "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요."
        : !authClient || !code
          ? "링크가 만료되었거나 사용할 수 없어요. 로그인을 다시 시도하거나 메일을 다시 요청해 주세요."
          : "",
  );
  useEffect(() => {
    let active = true;
    // Remove codes/errors before rendering links or making subsequent navigations.
    window.history.replaceState(window.history.state, "", "/auth/callback");
    if (!code || !authClient || callbackError) return;
    void exchangeCallback(code)
      .then(({ recovery, error }) => {
        if (!active) return;
        if (error)
          setMessage(
            "인증을 완료하지 못했어요. 시작한 브라우저에서 로그인을 다시 시도하거나 가장 최근 확인 메일을 열어 주세요.",
          );
        else navigate(recovery ? "/auth/reset" : "/", { replace: true });
      })
      .catch(() => {
        if (active)
          setMessage(
            "인증을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
          );
      });
    return () => {
      active = false;
    };
  }, [code, callbackError, navigate]);
  return (
    <AuthLayout>
      <span className="auth-mail-icon">
        <Mail size={27} />
      </span>
      <h2>{message ? "인증을 확인해 주세요" : "인증을 완료하고 있어요"}</h2>
      <p role={message ? "alert" : "status"}>
        {message || "잠시만 기다려 주세요."}
      </p>
      {message && (
        <>
          <Link className="auth-submit" to="/auth/login">
            로그인으로 돌아가기
          </Link>
          <Link className="auth-secondary" to="/auth/resend">
            가입 확인 메일 다시 받기
          </Link>
          <Link className="auth-secondary" to="/auth/forgot">
            비밀번호 변경 링크 다시 받기
          </Link>
        </>
      )}
    </AuthLayout>
  );
}
