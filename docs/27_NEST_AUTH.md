# Nest 공식 이메일 인증

확인·적용일: 2026-10-07. 사용자가 Supabase / 별도 인증 프레임워크 대신 Nest 공식 가이드로 진행하도록 요청했다. 현재 설치된 Nest 12.1 가이드의 `@nestjs/authentication`을 사용한다. 공식 패키지까지 배제하고 암호·세션을 직접 구현하는 것으로 해석하지 않았다.

## 결정과 근거

| 구분 | 확인한 내용 | 적용 |
|---|---|---|
| 공식 제공 | [인증 가이드](https://docs.nestjs.com/security/authentication)의 인증 모듈, 전역 guard, 비밀번호·세션·메일 링크와 저장소 계약 | Nest 공식 모듈을 사용하고 사용자 조회·Prisma 연결·화면을 작성 |
| 공식 조건 | production에서는 활성 인증 저장소를 메모리로 유지할 수 없음 | sessions, emailTokens, refreshTokens, mfa 계약을 PostgreSQL로 등록. 메모리 허용 우회 옵션 없음 |
| 공식 선택지 | 쿠키 세션과 access/refresh token 방식 | PWA에는 서버 쿠키 세션을 선택. JWT 발급·MFA 제품 기능은 추가하지 않음 |
| 공식 선택지 | DTO class 또는 Standard Schema 검증 | 기존 Zod와 Nest 12.1 StandardSchemaValidationPipe 사용 |
| 공식 제공 | [메일](https://docs.nestjs.com/application/mail), [CSRF](https://docs.nestjs.com/security/csrf), [요청 제한](https://docs.nestjs.com/security/rate-limiting) | 공식 SMTP/File transport, 모든 쓰기 요청의 CSRF 방어, 인증 요청 횟수 제한 |
| 프로젝트 선택 | 업무 PostgreSQL과 Prisma 유지, 웹/API를 같은 origin으로 제공 | 별도 Auth 서버·Supabase SDK·Passport·JWT 패키지는 이번 실행 경로에서 사용하지 않음 |

검토한 설치 버전은 Node 24.20.0, pnpm 11.24.0, Nest common/core 12.1.0, Prisma/client/adapter 7.10.0, TypeScript 6.0.3이다. 추가한 패키지는 `@nestjs/authentication@0.0.1`, `@nestjs/mail@0.0.1`, `@nestjs/throttler@6.7.1`이며 모두 MIT다. authentication/mail은 Node 20.19 이상·Nest 12와 호환되는 설치된 package metadata·타입·공식 예제와 대조했다. 최신 Nest 11 예제를 그대로 복사하지 않았다.

authentication/mail의 현재 버전은 초기 0.0.1이다. 공식 제공이라는 이유로 장기간 운영에서 검증됐다고 가정하지 않는다. 버전을 고정하고 공식 저장소 계약과 실제 흐름을 검사했으며, 운영 공개 전 릴리스 변경 사항과 실제 SMTP·도메인 구성을 다시 검증한다. 패키지는 API에만 설치한다. 웹에서 Supabase SDK를 제거했고 해당 서버 인증 패키지는 브라우저 번들에 들어가지 않는다.

## 구현한 동작

- 회원가입: 표시 이름·이메일·비밀번호를 서버에서도 검증한다. 이메일은 trim/NFC/소문자로 정규화하고 DB unique 제약으로 중복을 막는다. 신규 비밀번호는 12~128자이며 로그인 시에는 기존 비밀번호 길이를 강제로 변경하지 않는다.
- 비밀번호: 공식 PasswordHasher의 scrypt 기본 설정을 사용한다. 평문·해시·자격증명 지문은 HTTP 사용자 응답에 포함하지 않는다. 해시 비용을 올리는 로그인 도중 비밀번호가 변경되면 조건부 DB 갱신으로 새 비밀번호를 보존한다.
- 이메일 확인: 가입 시 입력한 주소로 링크를 만든다. 확인 전에는 로그인 세션을 발급하지 않는다. 링크는 24시간·일회용이며 GET 미리보기로 소비하지 않고 화면의 확인 버튼으로 POST한다.
- 로그인: 공식 SignInService와 SessionCookieProvider를 사용한다. 쿠키는 HttpOnly / SameSite=Lax이고 production에서는 Secure다. DB에는 쿠키 원문 대신 해시를 저장한다. 절대 만료 7일·비활성 만료 1일은 프로젝트 선택이다.
- 내 계정·로그아웃: 서버에서 세션과 최신 사용자 정보를 확인한다. 세션은 API 재시작 뒤에도 유지되며 로그아웃한 쿠키는 다시 사용할 수 없다. 프론트엔드가 인증 토큰을 localStorage에 저장하지 않는다.
- 비밀번호 복구: 존재 여부와 관계없이 동일한 접수 응답을 반환한다. 1시간·일회용 링크로 새 비밀번호를 설정하면 기존 세션을 모두 해제한다. 변경 전에 검증을 시작해 뒤늦게 생성된 세션도 자격증명 지문 비교로 거부한다.
- 보호: 인증 API의 응답에 no-store를 적용하고, 공식 CSRF 방어와 IP/경로별 횟수 제한을 적용한다. 기본 30회/분, 가입 5회, 로그인 10회, 확인 메일 재발송·복구 요청 각 3회다. 현재 제한 저장소는 프로세스 메모리이므로 여러 서버의 한도는 공유하지 않는다.

UsersModule은 DB 사용자 조회를 내보내고 AuthModule이 이를 사용한다. MailModule은 메일 연결만 담당한다. PrismaAuthStore가 공식 저장소 인터페이스를 구현한다. 공식 로그인/복구 서비스 내부에서도 refreshTokens/mfa 계약을 사용하므로 저장소는 등록하지만, JWT·MFA·API key·소셜 로그인 endpoint를 구현했다고 표현하지 않는다.

## DB·권한 경계

`20261008011623_nest_auth` migration에 User와 공식 인증 상태 테이블 7개를 추가했다. ID 해시, 토큰 종류·만료, 세션·사용자 인덱스와 공식 계약에 필요한 원자적 consume/조건부 touch/refresh family 폐기/TOTP step/recovery code 처리를 구현했다. 대기 메일 토큰은 최대 1,000개로 제한하고 PostgreSQL advisory transaction lock으로 동시에 추가할 때도 한도를 지킨다.

인증 테이블 모두 ENABLE/FORCE RLS, PUBLIC 권한 회수, backend 역할 정책을 적용했다. API 역할은 비소유자·NOSUPERUSER·NOBYPASSRLS다. 로그인 전에 사용자를 찾는 인증 저장소이므로 허용된 backend 역할은 인증 행 전체를 조회할 수 있다. 이는 **DB 역할 제한**이며 캘린더·가계부의 사용자별 공유 권한/RLS가 구현됐다는 의미가 아니다. 브라우저에서 DB에 직접 접근하는 경로도 제공하지 않는다.

기존 로컬 DB에는 migrate deploy로 적용하고 별도 `dayjoin_auth_test` 빈 DB에도 재현했다. 테스트는 이 전용 DB를 사용한다. 업무 DB/volume을 초기화하지 않는다. 기존 캐시 Redis에 인증 상태를 저장하지 않는다.

## 실행과 메일 확인

README 실행 순서로 PostgreSQL을 켜고 `pnpm db:generate`, `pnpm db:migrate:deploy` 후 API와 웹을 시작한다. 기본 웹 주소는 **http://127.0.0.1:5173**이며 APP_URL과 정확히 일치시킨다. localhost·127.0.0.1 또는 포트를 섞지 않는다. 다른 포트에서는 API의 APP_URL과 Vite의 DAYJOIN_API_PROXY_TARGET을 함께 지정한다.

SMTP_URL이 없으면 개발/테스트 메일을 `apps/api/var/mail/*.eml`에 저장한다. 메일 폴더는 0700, Git 제외, transport logging 비활성화다. 링크는 인증용 비밀이므로 문서·커밋·도구 출력에 복사하지 않는다. 실제 입력한 메일 주소의 수신함에 전달하는 검증은 아직 수행하지 않았다.

실제 수신에는 SMTP_URL과 발신 도메인을 인증한 MAIL_FROM이 필요하다. production은 HTTPS APP_URL과 SMTP_URL이 없으면 시작을 거부한다. 정적 웹 배포에서는 `/api`를 Nest로 전달하는 같은 origin 라우팅과 올바른 Host/Origin, TLS를 구성한다. 현재 Vite proxy는 개발/미리보기용이고 별도 origin CORS 허용은 추가하지 않았다.

Compose app profile의 HTTPS/SMTP 예시 값은 production 이미지 시작·health 검사용 placeholder다. 실제 메일 발송이나 HTTP 개발 웹 로그인을 제공하는 운영 설정이 아니다. 일반 로컬 가입 시험은 `pnpm dev:api` / `pnpm dev:web`를 사용한다.

## 실제 CLI와 실패·수정

의존성은 pnpm add/remove/install로 변경하고 lockfile을 유지했다. 주요 실제 실행 명령:

```sh
git fetch origin
git switch -c feature/nest-auth origin/dev
git cherry-pick 8bb3f0b 91839df
pnpm --filter api add @nestjs/authentication@0.0.1
pnpm --filter api add @nestjs/mail@0.0.1
pnpm --filter api add @nestjs/throttler@6.7.1
pnpm --filter api remove @supabase/supabase-js
pnpm --filter web remove @supabase/supabase-js
pnpm remove -Dw supabase
pnpm --filter api exec nest generate module users --no-spec
pnpm --filter api exec nest generate service users --no-spec
pnpm --filter api exec nest generate module infrastructure/mail --no-spec
pnpm --filter api exec prisma format
pnpm db:generate
docker compose up -d --wait postgres
pnpm --filter api exec prisma migrate dev --name nest_auth --create-only
pnpm db:migrate:deploy
pnpm test:auth:setup
```

- `@nestjs/mailer` 조회는 404였다. 공식 문서의 실제 이름 `@nestjs/mail`로 확인·설치했다.
- 최초 제한된 네트워크에서 pnpm의 도구 준비가 ENOTFOUND로 실패했다. 해당 실행을 중지하고 허용된 네트워크로 frozen-lockfile 설치와 Nest CLI 생성을 재실행했다.
- 최종 실제 DB/HTTP 검사도 제한된 실행 환경에서는 실패했다. 로컬 DB·HTTP 접근을 허용한 실행에서 다시 검증해 42개를 통과했다.
- DTO 변환에서 Zod transform 이후 max 사용과 TypeScript erasableSyntaxOnly parameter property 오류를 수정했다. 이전 Supabase 서비스 테스트도 새 인증 계약 테스트로 교체했다.
- PostgreSQL advisory lock의 void 반환은 Prisma에서 deserialize할 수 없어 text cast를 적용했다. refresh family의 동시 upsert unique 충돌은 skipDuplicates 방식으로 수정했다. 이후 공식 concurrent 저장소 계약을 통과했다.
- 첫 브라우저 검사는 테스트 메일 URL 파서가 괄호까지 token으로 읽어 실패했다. fixture 파서를 base64url 토큰 경계로 수정한 뒤 전체 가입/복구 흐름을 통과했다.
- 마지막 audit에서 기존 전이 의존성 `source-map-js@1.2.1`의 [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)를 확인했다. 일반 recursive update 후에도 이전 버전이 남아, workspace에 해당 영향 버전만 1.2.2로 제한하는 override를 기록하고 `pnpm install`을 실행했다. 이후 audit은 알려진 취약점 0건이다.

## 실제 검증과 남은 범위

검증은 아래 완료 기록을 기준으로 한다. GitHub CI는 새 PR의 실제 커밋 실행 결과로 확인한다.

- Prisma format/generate, 빈 테스트 DB migration 및 기존 로컬 DB migrate deploy 성공.
- API 환경 설정 12개 + 웹 도메인 26개, 합계 38개 단위 검사 통과.
- 실제 PostgreSQL의 인증 HTTP 12개·공식 concurrent 저장소 계약/역할 검사 25개·health 5개, 합계 42개 통과. 재시작 후 로그인, 확인 토큰 재사용 거부, 로그아웃, 복구 시 세션 해제, 뒤늦은 이전 자격증명 세션 거부, 비밀번호 변경과 해시 갱신의 동시 실행을 검증했다.
- 별도 SQL transaction에서 SELECT 권한을 부여한 임시 비허용 역할로 인증 테이블 8개의 조회 행이 모두 0임을 확인했다. 관리자 조회에서는 테스트 계정이 존재했고, 검사 후 역할·권한 변경은 rollback했다.
- 실제 Chromium 가입→이메일 확인→로그인→새로고침→로그아웃→복구→새 비밀번호 로그인과 입력 오류/미설정 소셜/잘못된 링크 3개 시나리오 통과.
- 실제 DB 연결 및 Redis 비활성·활성 통합 검사, 비루트 production API 이미지 시작/health 통과. 실제 SMTP 발송을 수행한 것은 아니다.
- lint/typecheck/build와 pnpm audit 통과. 빌드 경고 없이 인증 화면과 달력을 별도 청크로 유지한다.

구글·애플 버튼은 준비 중으로 표시한다. 실제 OAuth 공급자 자격증명·callback·계정 연결은 미구현이다. 캘린더·가계부는 계속 예시 데이터이며 서버 저장·초대·공유 권한·금융 원장과 운영 배포도 후속이다.

기존 Supabase 구현은 feature/email-auth / PR #6에 보존했다. 이번 feature/nest-auth는 최신 dev(6acc53b)에서 분기해 인증 화면만 재사용했고 Supabase 실행 경로를 교체했다. 기존 Supabase 계정/세션 데이터 이관은 수행하지 않았다. PWA PR #5와 보류 중인 네이티브 PR #4도 보존하며 어느 PR도 자동 병합·종료하지 않는다.
