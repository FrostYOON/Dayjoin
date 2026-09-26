# 공식 자료와 확인 범위

확인일: **2026-09-26**. 요금은 USD, 별도 표시가 없으면 세금·환율·초과 사용료 제외다. 아래는 공급자 기능/제약의 근거다. 제품 범위, 일정, 가격 후보, 품질 목표는 이 프로젝트를 위한 설계 제안이며 검증된 시장 수치가 아니다. 구현 착수 때 버전·요금·계정 잔여 한도를 다시 확인한다.

| 자료 | 계획에서 사용하는 근거 |
|---|---|
| [React 시작 방식](https://react.dev/learn/build-a-react-app-from-scratch) | Vite 기반 SPA에는 라우팅·데이터 조회 설계가 별도로 필요함. 비용과 학습 범위를 고려해 이번 프로젝트에서 선택 |
| [Vite 가이드](https://vite.dev/guide/) | React/TypeScript 개발·빌드 도구 |
| [React Router](https://reactrouter.com/start/declarative/installation) | 클라이언트 라우팅 구성 |
| [shadcn/Vite](https://ui.shadcn.com/docs/installation/vite) | UI 컴포넌트 구성 방법 |
| [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview) | 서버 상태 조회/캐시 |
| [React Hook Form](https://github.com/react-hook-form/react-hook-form), [Zod](https://zod.dev/) | 폼과 입력 검증 도구 |
| [Vitest](https://vitest.dev/guide/), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/), [Playwright](https://playwright.dev/docs/intro) | 단위/컴포넌트/브라우저 테스트 기반 |
| [Node 릴리스](https://nodejs.org/en/about/previous-releases), [릴리스 일정](https://github.com/nodejs/Release) | 계획 시점 Node 24 LTS 기준, 착수 시 지원 상태와 패치 재확인 |
| [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/) | 정적 파일과 SPA 경로 배포 |
| [Cloudflare 요금](https://developers.cloudflare.com/workers/platform/pricing/) | 정적 자산 요청 무료, 동적 실행·추가 제품은 별도 한도/과금 |
| [Supabase 로컬 개발](https://supabase.com/docs/guides/local-development) | CLI와 Docker 호환 컨테이너 런타임으로 로컬 개발 |
| [Nest 시작](https://docs.nestjs.com/first-steps), [인증](https://docs.nestjs.com/security/authentication) | Express 기본 어댑터, Guard 중심 API 인증 |
| [Nest Prisma](https://docs.nestjs.com/recipes/prisma), [Prisma 트랜잭션](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) | ORM 통합과 트랜잭션. 실제 CLI/driver는 선택 버전 확인 필요 |
| [Prisma migration 편집](https://www.prisma.io/docs/orm/migrations/editing-a-migration) | 최신 migration 형식이 과거 예제와 다를 수 있음. 버전 일치 문서 기준으로 SQL 확장 검증 |
| [Nest health check](https://docs.nestjs.com/recipes/terminus) | API liveness/readiness 구성 |
| [Supabase JWT](https://supabase.com/docs/guides/auth/jwts) | 검증된 사용자 식별, 공개 키/JWKS 경로 |
| [Render 요금](https://render.com/pricing), [무료 조건](https://render.com/docs/free), [리전](https://render.com/docs/regions) | API 인스턴스 비용, idle 중지, Singapore 후보. 구매 전 계정별 실제 요금 확인 |
| [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | 사용자/조직별 행 접근 제어 |
| [Supabase 리전](https://supabase.com/docs/guides/platform/regions) | Seoul 리전 선택 가능; 모든 하위 처리자 데이터가 국내에만 남는다는 뜻은 아님 |
| [Supabase Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) | 무료 활성 프로젝트 2개, Pro 조직의 프로젝트별 컴퓨트 계산 |
| [Supabase 요금](https://supabase.com/pricing) | 실제 가입 시 기본 요금·용량 재확인 |
| [백업](https://supabase.com/docs/guides/platform/backups) | 무료 플랜 별도 덤프, 유료 일일 DB 백업, Storage 객체 별도 보호 |
| [운영 전 확인](https://supabase.com/docs/guides/deployment/going-into-prod) | 비활성 무료 프로젝트 중지, 운영 설정 점검 |
| [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) | 기본 이메일 발송은 운영용으로 부적합, 외부 SMTP 준비 |
| [Resend 요금](https://resend.com/pricing) | 발송 한도와 발신 도메인 수, 가입 시 재확인 |
| [GitHub Actions 과금](https://docs.github.com/en/billing/concepts/product-billing/github-actions) | 비공개 저장소 CI도 계정별 무료 한도가 있음 |
| [Vercel Hobby](https://vercel.com/docs/plans/hobby) | 개인 비상업용 제한 때문에 수익화 서비스의 무료 운영 전제로 삼지 않음 |
| [FullCalendar 라이선스](https://fullcalendar.io/license), [React 연결](https://fullcalendar.io/docs/react) | Dayjoin은 Standard MIT 기능만 사용, Premium 기능 별도 판단 |
| [토스페이먼츠 빌링 결제창](https://docs.tosspayments.com/guides/v2/billing/integration), [빌링 API 안내](https://docs.tosspayments.com/guides/v2/billing/integration-api) | 국내 구독 결제 후보; 자동결제 계약/심사 확인 필요 |
| [토스페이먼츠 웹훅](https://docs.tosspayments.com/reference/using-api/webhook-events), [인증·멱등키](https://docs.tosspayments.com/reference/using-api/authorization) | 결제 종류별 이벤트 차이, 서버 대사와 재시도 설계 |

외부 조사는 기술 기반과 운영 비용 확인에 한정했다. 경쟁 서비스의 최신 가격 비교, 고객 인터뷰, 상표·도메인 권리 확인, 법률 검토, 실제 공급자 계약은 아직 수행하지 않았다.

## v0.3 구현 근거

2026-09-26 재확인한 Nest CLI/modules/configuration/Prisma/Terminus, Vite, PostgreSQL/Redis 공식 이미지, node-redis, Docker Compose, pnpm/Actions 근거와 적용 조건은 [개발 기준의 출처 표](08_ENGINEERING_STANDARD.md)에 모았다. 최신 문서와 설치 버전 차이는 Dayjoin의 검증 기록을 따른다.
