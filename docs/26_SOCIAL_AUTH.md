# 구글·애플 로그인과 인증 설정

확인일: 2026-09-28 (America/Toronto). 기존 `feature/email-auth` / PR #6에 이어 구현한다. 실제 외부 프로젝트 생성·OAuth 자격증명 등록·운영 메일 발송은 아직 수행하지 않았다.

## 적용한 범위

- 로그인·가입 화면의 Google / Apple 버튼. Supabase Auth 공개 `/settings` 응답을 읽고 활성화된 제공자만 이용 가능하게 한다. 설정 조회 실패/잘못된 형식은 비활성화와 재시도로 처리하며 이메일 폼은 계속 이용할 수 있다.
- 설치된 `@supabase/supabase-js@2.117.2`의 `signInWithOAuth`를 이용한다. 이미 적용된 PKCE 설정과 단일 코드 교환을 재사용하고 OAuth·토큰 발급을 직접 구현하지 않는다. 추가 의존성/DB migration은 없다.
- 취소·공급자 오류를 한국어로 안내한다. callback 쿼리/fragment를 주소창에서 제거하며 임의 `error_description`은 표시하지 않는다. 오류와 code가 함께 오면 교환하지 않는다.
- 구글 이름 metadata를 표시 이름의 대안으로 사용한다. 애플 OAuth에서 이름이 없으면 이메일 앞부분을 사용한다. 표시 이름은 권한 판단에 쓰지 않으며 API의 JWT/현재 사용자/확인된 이메일 검증은 유지한다.
- 로그인 중 다른 가입·로그인 제출을 막는다. 회원가입 비밀번호 도움말을 추가하고 접근성 이름은 입력란 이름만 유지한다.

`캘린더 둘러보기`는 기존 예시 캘린더 체험 링크다. 실제 계정의 일정·장부를 공개하는 기능이 아니다. 제거 여부는 사용자 선호 확인 중이며 현재 진입 방식은 유지했다. 일정·장부 영속 저장과 공유 권한은 이번 인증 확장 범위에 포함하지 않는다.

## 공식 근거와 프로젝트 선택

| 구분 | 근거와 적용 |
|---|---|
| 공식 기능 | [Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple 로그인](https://supabase.com/docs/guides/auth/social-login/auth-apple), [SDK OAuth](https://supabase.com/docs/reference/javascript/auth-signinwithoauth): Auth 제공자 설정 후 SDK로 시작하고 앱 callback에서 PKCE 코드를 교환한다. |
| 설치 버전 대조 | SDK 2.117.2의 `SignInWithOAuthCredentials`와 실제 URL 생성 코드를 확인했다. 로컬 CLI 2.118.0 / Auth 이미지 v2.197.0. [해당 Auth 버전 settings 구현](https://github.com/supabase/auth/blob/v2.197.0/internal/api/settings.go)에서 `external.google/apple` boolean을 확인했고 로컬 응답도 두 값 모두 false였다. |
| 공식 공개 API | [Auth OpenAPI](https://github.com/supabase/auth/blob/v2.197.0/openapi.yaml)의 `/settings`는 인증 UI용 공개 설정이다. 설치 SDK에 settings 메서드가 없어 이 조회만 표준 fetch로 감쌌다. 공개 키만 전송하며 timeout/취소/no-store를 적용한다. |
| 프로젝트 선택 | Google·Apple만 우선 제공한다. 별도 One Tap/Apple JS 패키지 없이 기존 SDK를 재사용한다. 메일·프로필 외 캘린더/연락처 권한을 요청하지 않는다. 제공자 enabled 값은 자격증명이 유효하다는 보장이 아니므로 운영 활성화 후 실제 계정 검증이 별도로 필요하다. |

## 실제 활성화 순서

먼저 Dayjoin 전용 운영/개발 Supabase 프로젝트와 웹 도메인을 정한다. `apps/web/.env.local`에는 공개 URL/공개 publishable key, `apps/api/.env`에는 동일 프로젝트의 URL/공개 key를 넣고 재빌드·재시작한다. 공급자 비밀과 Apple `.p8` 파일은 Supabase 설정/비밀 보관소에만 두고 `VITE_*`, Git, 채팅에 넣지 않는다.

콜백 두 종류를 구분한다.

| 등록 위치 | 등록할 주소 |
|---|---|
| Google OAuth redirect / Apple Return URL | `https://<project-ref>.supabase.co/auth/v1/callback` — Supabase 대시보드에 표시된 실제 주소 |
| Supabase Auth Redirect URLs | `https://<web-domain>/auth/callback` — 서비스 화면으로 돌아오는 주소 |
| 로컬 웹 미리보기를 함께 허용할 때 | `http://127.0.0.1:5175/auth/callback` 등 사용하는 origin을 정확히 추가 |

Google: Google Cloud의 웹 OAuth client와 동의 화면을 구성하고 Supabase Google provider에 client ID/secret을 등록한다. 승인된 JavaScript origin은 실제 웹 origin을 사용한다. 로그인 범위는 `openid`, 이메일, 프로필이다. 로컬 Auth를 계속 쓰는 별도 Google 개발 client라면 Supabase callback은 `http://127.0.0.1:55431/auth/v1/callback`이며 CLI `auth.external.google` 설정을 사용한다. 실제 ID/secret은 아직 없다.

Apple: [Apple 공식 웹 설정](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)에 따라 Sign in with Apple을 켠 primary App ID와 연결된 Services ID, 도메인/Return URL, 서명 키가 필요하다. 웹 OAuth의 client ID는 Services ID를 사용한다. Supabase Apple 가이드는 secret을 6개월마다 갱신하도록 안내한다. 현재 Apple 계정·도메인·서명 키는 설정하지 않았다. 이메일 가리기 사용자는 relay 이메일로 표시될 수 있고 OAuth 응답에 이름은 없을 수 있다.

설정 이후 두 버튼으로 실제 동의 → callback → Nest `/auth/me` → 새로고침 → 로그아웃을 검증해야 한다. 현재 자동 테스트는 실제 제공자의 동의·토큰 발급까지 검증한 결과가 아니다.

## 비밀번호와 이메일의 현재 동작

- 가입·재설정: 웹 최소 12자, 확인 입력 일치 검사. 입력칸 최대 128자는 UI 제한이며 인증 서버의 추가 제한을 대체하지 않는다. 로컬 Auth 설정도 최소 12자다. 로그인은 기존 비밀번호를 그대로 Auth 서버가 검증한다.
- 대소문자/숫자/특수문자 조합 강제, 유출 비밀번호 탐지, 강도 점수는 아직 설정/구현하지 않았다. [공식 비밀번호 보안 문서](https://supabase.com/docs/guides/auth/password-security)는 Auth의 bcrypt 해시 저장을 설명한다. 비밀번호 원문은 Dayjoin Nest/업무 DB에 저장하지 않는다.
- 확인 메일은 사용자가 가입할 때 입력한 이메일로 작성된다. 현재 로컬 Mailpit (`http://127.0.0.1:55434`)에서만 캡처하며 외부 메일함에 전송하지 않는다.
- 운영에서 실제 사용자에게 보내려면 [SMTP 설정](https://supabase.com/docs/guides/auth/auth-smtp)과 발신 도메인/주소 검증이 필요하다. 운영 Supabase 기본 메일 기능만으로 일반 사용자 발송이 준비됐다고 간주하지 않는다.
- Google/Apple만으로 시작한 사용자는 Dayjoin 비밀번호를 입력하지 않는다. 제공자가 확인한 이메일 정보를 Auth가 처리하며 Nest에서도 확인된 이메일을 요구한다.

## 명령·검증 기록

의존성 변경 없이 기존 SDK를 사용했다. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm test:auth`로 검증한다. 처음 브라우저 실행은 추가한 비밀번호 도움말이 label의 접근성 이름에 포함되어 입력란 탐색이 대기하는 문제로 중단했다. 명시적인 입력란 이름과 별도 `aria-describedby`로 수정하고 다시 빌드해 실행했다.

브라우저 재실행 때 중단한 테스트의 서버가 3301/4180 포트에 남아 첫 재시작이 실패했다. 해당 테스트 PID만 종료한 뒤 재실행했다. lsof의 중복 LISTEN 옵션 오류는 옵션을 하나로 정리해 수정했다.

최종 결과: API 단위 32개, 기존 웹 도메인 26개, HTTP 13개, 브라우저 7개 통과. 브라우저 7개는 실제 로컬 이메일 Auth 3개와 소셜 SDK/오류 경계 4개다. `pnpm typecheck`, `pnpm lint`, `pnpm build`(Prisma generate 포함), `pnpm test`, `pnpm test:e2e`, `pnpm test:auth`를 통과했다. 로그인 화면을 Codex 브라우저에서 확인했고 두 제공자는 로컬 실제 설정대로 비활성 상태였다. 기존 Vite의 500 kB 초과 chunk 경고는 남아 있다. 실제 Google/Apple 계정 로그인, 운영 SMTP, PWA 통합 검증은 제외한다.
