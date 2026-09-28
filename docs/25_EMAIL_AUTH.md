# 이메일 회원가입·로그인

확인일: 2026-09-27 (America/Toronto). 사용자 요청: 회원가입·로그인부터 구현한다. 일정·장부 영속 저장, 공유 권한/RLS, 네이티브 앱과 공개 배포는 이번 범위에 포함하지 않는다.

## 구현한 동작

- 달력 미리보기의 로그인 진입, 이름·이메일·비밀번호 가입, 확인 메일 재요청.
- 이메일 확인 링크의 PKCE 교환, 만료/다른 브라우저 링크 안내, 비밀번호 로그인·복구.
- Supabase SDK의 세션 저장·자동 갱신·동일 브라우저 탭 간 로그아웃 동기화.
- 계정 전환/로그아웃 시 캘린더 컴포넌트를 다시 만들어 이전 계정의 메모리 기록·작성 중 폼을 제거.
- Nest `GET /api/v1/auth/me`: SDK 서명 검증 후 issuer/audience/expiry/not-before/UUID subject/인증 역할을 확인하고 Auth 서버의 현재 사용자·확인된 이메일을 조회한다. 이름 metadata는 표시 용도이며 권한 근거가 아니다.
- API의 성공/실패 응답 모두 `Cache-Control: no-store`. 비밀번호는 Supabase Auth에만 보내고 Nest/Prisma/가상 기록에 저장하지 않는다.
- 공개 달력은 예시 데이터다. 로그인 완료는 실제 일정·가계부 저장 또는 공유 권한 구현을 의미하지 않는다.

## 공식 필수 조건·선택지·프로젝트 결정

| 구분 | 근거 / 적용 |
|---|---|
| 공식 동작 | [비밀번호 인증](https://supabase.com/docs/guides/auth/passwords): 가입 확인·복구에 이메일 발송이 필요. 로컬 Mailpit은 실제 외부 발송 대신 메일을 캡처한다. |
| 공식 동작 | [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow): 코드 검증자는 시작한 브라우저에 있으므로 같은 브라우저에서 가장 최근 링크를 열어야 한다. 코드 재사용·만료는 오류로 처리한다. |
| 공식 권장 | [JWT 검증](https://supabase.com/docs/guides/auth/jwts), [getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims): SDK로 JWKS 서명을 검증하며 HS256은 Auth 서버 검증으로 대체한다. 단순 decode를 인증으로 사용하지 않는다. |
| 공식 선택지 | [React Router](https://reactrouter.com/start/declarative/installation), [React Hook Form](https://react-hook-form.com/get-started): SPA 경로와 폼 상태/검증에 사용. 전체 프레임워크·서버 렌더링 도입은 아니다. |
| 프로젝트 결정 | Supabase Auth, 이메일 확인 필수, 비밀번호 최소 12자, 로컬 access token 15분, refresh token rotation. 비밀번호 변경 후 전체 refresh session 로그아웃을 요청한다. |
| 프로젝트 결정 | 일반 로그아웃은 현재 브라우저 세션(`scope: local`). 다른 기기는 유지한다. 이미 발급된 access token은 만료 전까지 유효할 수 있다. 즉시 전 기기 토큰 폐기 기능을 구현했다고 주장하지 않는다. |
| 프로젝트 결정 | 기존 Compose PostgreSQL은 업무 DB, 별도 `dayjoin-auth` Supabase PostgreSQL은 Auth 내부 저장소. Prisma가 Auth 내부 스키마를 관리하지 않는다. 빈 업무 migration을 만들지 않는다. |
| 프로젝트 결정 | 브라우저 env는 `sb_publishable_` 공개 키만 허용. Vite에서 비밀 키·누락된 설정 조합·안전하지 않은 URL을 빌드 전에 거부한다. 서버도 공개 키를 사용하며 service_role이 필요하지 않다. |

설치 버전: `@supabase/supabase-js` 2.117.2(웹/API), Supabase CLI 2.118.0, React Router 8.4.0, React Hook Form 7.89.0, Playwright 1.63.0. 모두 MIT. Node 24.20.0은 SDK/Router의 Node 22 이상 조건을 충족하며 React Hook Form은 React 19를 지원한다. 기존 React 19.3.0 / Vite 8.3.1 / Nest 12.1.0 / TS 6.0.3은 유지했다.

SDK가 session/refresh/서명·키 회전을 담당하고 제품 코드는 표시, 경로, 에러 메시지와 API 허용 조건을 담당한다. SDK/라우터 추가 후 웹은 초기 JS 약 527 kB(압축 약 156 kB), 지연 로딩한 달력 약 355 kB(압축 약 108 kB)다. Vite의 500 kB 경고는 남으며 추가 최적화를 완료한 것으로 표시하지 않는다.

## 로컬 실행

```sh
nvm use
pnpm install --frozen-lockfile
cp -n apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm infra:up
pnpm auth:start
pnpm auth:env
# 별도 터미널
pnpm dev:api
# 별도 터미널
pnpm dev:web
```

- 웹: http://127.0.0.1:5173/auth/signup
- Nest: http://127.0.0.1:3000/api/v1/auth/me (Bearer token 필요)
- Auth: http://127.0.0.1:55431
- 개발용 메일함: http://127.0.0.1:55434
- Auth 전용 DB: localhost:55432. 업무 DB: localhost:15432.
- 가입 후 개발용 메일함에서 최신 확인 링크를 같은 브라우저로 연다. 실제 개인 메일함에는 발송하지 않는다. 시험 계정을 사용한다.
- `pnpm auth:env`는 CLI 상태를 메모리에서 읽어 URL·공개 키만 `.env.local`/API `.env`에 쓴다. 기존 값이 다르면 덮어쓰지 않고 중단한다. CLI status 원문에는 서명 비밀이 있으므로 로그·문서에 붙이지 않는다.
- `pnpm auth:stop`은 로컬 Auth를 중지하고 데이터 볼륨을 보존한다. `--no-backup`/`down -v`는 일상 종료에 사용하지 않는다.
- Auth 설정이 없으면 로그인 화면은 준비 중 상태이며 보호 API는 503을 반환한다. 공개 예시 달력은 계속 볼 수 있다.

현재 채팅의 인증 미리보기는 별도 worktree에서 웹 **5175**, API **3002**로 실행한다. 기존 5173/4173 화면과 충돌하지 않도록 분리했다. E2E는 웹4180/API3301을 사용하며 테스트 완료 후 이 두 서버는 자동 종료한다.

### 포트 제한

[공식 로컬 개발 안내](https://supabase.com/docs/guides/local-development)의 Docker bridge `host_binding_ipv4=127.0.0.1`을 적용했으나 현재 Docker Desktop 29.7.2에서 실제 포트는 0.0.0.0으로 남았다. 그래서 CLI 2.118.0의 [Docker 생성 방식](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/db-bootstrap/docker-create-args.ts)에 한정한 실행 래퍼를 사용한다. `dayjoin-auth`의 DB·gateway·mailpit 세 컨테이너의 알려진 포트만 `127.0.0.1:host:container`로 명시한다. 다른 Docker 명령/컨테이너와 전역 설정은 수정하지 않는다.

`auth:start`는 생성 후 실제 published port를 검사하고 loopback이 아니면 Auth를 중지한다. CLI 업그레이드 시 이 검증과 실제 가입 시험을 다시 실행한다. 이 래퍼는 Docker Desktop 호환용 프로젝트 결정이지 Supabase 필수 요구가 아니다.

## 실제 실행 기록·실패 수정

- `pnpm view … version engines license`, `pnpm --filter api list --depth 0`, 공식 문서·SDK 소스·CLI help 확인. root의 글로벌 nest는 11.0.2이므로 실제 생성은 workspace Nest CLI 12.0.7로 실행했다.
- `pnpm --filter web add @supabase/supabase-js@2.117.2 react-router@8.4.0 react-hook-form@7.89.0`
- `pnpm --filter api add @supabase/supabase-js@2.117.2`, `pnpm add -Dw supabase@2.118.0`, `pnpm --filter web add -D @playwright/test@1.63.0`
- `pnpm exec supabase init`, workspace `nest generate module/service/guard/controller auth --no-spec`. 생성한 모듈을 ESM `.js` import와 실제 providers/exports로 수정했다.
- `exchangeCodeForSession` 구현에는 redirectType이 있으나 공개 반환 타입에는 없었다. 비공개 필드에 의존하지 않고 공식 `PASSWORD_RECOVERY` 이벤트로 복구 경로를 결정했다.
- pnpm 11의 `pkg set scripts.auth:start`는 콜론 파싱 오류. `scripts["auth:start"]` 표기로 수정했다.
- HTTP test beforeEach가 mock 함수를 반환해 Vitest가 cleanup으로 실행했다. 반환 없는 블록으로 수정했다.
- 삭제 사용자 테스트의 mock 분기가 삽입되지 않아 검사 실패. 실제 401 응답 분기를 추가하고 재검증했다.
- CLI 기본 공개 바인딩과 bridge 옵션의 불일치를 발견해 위의 명시적 loopback 래퍼로 수정했다. 실제 세 published port가 모두 127.0.0.1임을 확인했다.

## 검증

로컬 검증과 원격 CI의 해당 커밋 결과를 구분한다. 최신 CI 결과는 인증 PR의 Checks에서 확인한다.

- API 단위: 환경 설정·서명 위조/발급자/audience/만료/subject/미확인 이메일/키 교체/삭제 사용자/연결 실패 검사.
- 웹 도메인: 기존 금액·날짜·공휴일·공개 표시 검사.
- HTTP: 무인증·잘못된 Authorization·쿼리 토큰 거부, no-store, 안전한 사용자 응답과 기존 health 계약.
- 실제 Auth 브라우저 3개: 가입→미확인 로그인 거부→메일 확인→사용자 조회→새로고침 유지→다중 탭 로그아웃과 이전 폼 제거→잘못된 비밀번호→refresh 갱신. 잘못된 링크/모바일360px/다크 모드/폼 검증. 비밀번호 복구→이전 비밀번호 거부→새 비밀번호 로그인.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm test:auth`, `pnpm audit`, `pnpm db:validate` 실행. 최종 결과는 아래 완료 기록에 남긴다.

## 아직 필요한 것

운영 Supabase 프로젝트, HTTPS 웹/API 배포와 정확한 callback allowlist, SMTP 발신 도메인·메일 전달, 공개 가입의 CAPTCHA·운영 rate limit을 아직 구성/검증하지 않았다. 상용 서비스의 가입 정책·약관 동의도 배포 전에 정한다. 실제 휴대폰/PWA 설치 상태의 인증 복귀, 그룹 멤버십·RLS·영속 일정/금융 기록은 미구현이다.

PWA PR #5는 이 작업 시작 시 OPEN/CI 성공 상태였고 병합 승인을 기다린다. 인증 작업은 독립적으로 최신 dev(6acc53b)에서 `feature/email-auth`로 분기했다. PWA와의 통합·충돌 해결은 승인된 병합 순서에 따라 진행하며, 이 브랜치의 인증 검증을 PWA 통합 검증으로 표현하지 않는다. 네이티브 PR #4는 계속 보류한다.

## 로컬 완료 기록

API 단위 **27개**, 웹 도메인 **26개**, HTTP **13개**, 실제 Auth 브라우저 **3개**가 통과했다. lint/typecheck/build, frozen-lockfile 재설치, Prisma validate/generate, 전체 pnpm audit(알려진 취약점 0개), Redis 비활성/활성 실제 DB smoke, API Docker 이미지 빌드가 통과했다. 운영 SMTP·클라우드·PWA 통합은 이 결과에 포함하지 않는다.
