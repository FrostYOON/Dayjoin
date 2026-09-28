# Dayjoin · 데이조인

일정과 가계부를 한 캘린더에서 관리하고, 선택한 기록을 함께 보는 서비스.

**현재 상태: React 통합 예시 화면 + 이메일 인증 + 소셜 로그인 연결 코드 / 2026-09-28.** Supabase Auth와 Nest 토큰 검증을 연결했다. 실제 가입·메일 확인·로그인 유지·복구는 로컬 인증 서버에서 검증한다. 일정·가계부는 여전히 메모리 예시 데이터이며 업무 영속 저장·공유/RLS·운영 배포는 미구현이다. [인증 구현·실행 기록](docs/25_EMAIL_AUTH.md)을 참고한다.

사용자 확정 조건은 **한국 우선, 1인 개발, TypeScript·NestJS 사용 경험이 가장 많고 Python은 조금 사용, 프론트엔드 경험 없음, 주 약 10시간, 초기 비용 최소화, 장기 수익화, 세 서비스 독립 개발**이다. React + Vite / NestJS 및 공식 CLI 중심 개발은 확정이다. 호스팅·일정·가격은 추천안/추정치다.

| 읽는 순서 | 문서 | 내용 |
|---|---|---|
| 1 | [제품·요구사항](docs/01_PRODUCT_PRD.md) | 대상 사용자, MVP, 제외 범위, 화면, 인수 조건 |
| 2 | [기술·데이터 설계](docs/02_ARCHITECTURE.md) | 언어/프레임워크, 구조, 권한, 데이터, 핵심 명령 |
| 3 | [개발 순서·백로그](docs/03_DELIVERY_BACKLOG.md) | 학습, 단계별 산출물, 공수, 첫 작업과 완료 조건 |
| 4 | [DevOps·보안](docs/04_DEVOPS_SECURITY.md) | 로컬/CI/운영, 테스트, 배포, 백업·장애 대응 |
| 5 | [수익화·비용](docs/05_BUSINESS_COST.md) | 유료화 가설, 검증, 단계별 운영 비용 |
| 6 | [결정·인계 기록](docs/06_DECISIONS.md) | 확정 사항, 추천안, 남은 결정, 다음 작업 |
| 참고 | [공식 근거](docs/07_SOURCES.md) | 2026-09-26 확인한 기술/요금 출처 |

첫 사용 대상은 가족·커플이며 우선 사례는 저녁식사·여행이다. 사용자가 **계좌·카드·이체를 포함한 가계부와 기록별 개인/공유**로 범위를 넓혔다. [통합 가계부 설계안](docs/13_CALENDAR_RECORDS_PROPOSAL.md)을 바탕으로 [F-001 통합 시안과 가상 동작 확인](docs/14_UNIFIED_SCREEN_PREVIEW.md)을 완료했다. 이어서 **[F-002 React 가상 데이터 화면](docs/16_REACT_UI_IMPLEMENTATION.md)**을 구현했다. 다음은 사용자 요청 범위에서 서버 저장·권한 기반을 연결하는 단계이며, 실제 금융 원장·서버 저장·공유는 인증·권한 기반 이후 연결한다. 기존 일정 전용 공수는 재산정한다.

현재는 Dayjoin의 통합 제품에 집중한다. Cashjoin의 금융 계산·원장 기획을 참고하되 다른 저장소·DB·Auth·배포의 병합이나 중단은 결정하지 않았다. 서비스 간 독립 원칙을 유지하며 중복되는 제품 역할은 별도 전략 결정으로 남긴다.

플랫폼은 사용자 최신 결정에 따라 **웹앱(PWA) 우선**이다. PWA PR #5는 별도 승인·통합 대상이며 네이티브 PR #4는 보류한다. 인증 작업은 독립 dev 기반 브랜치에서 진행했다.

브랜치는 `main`(릴리스) → `dev`(통합) → 작업별 `feature/*`·`fix/*`·`docs/*`로 운영한다. 작업 PR은 dev로 모으고 병합은 별도로 진행한다. [브랜치 규칙](docs/19_GIT_WORKFLOW.md)을 따른다.

개발 시 [AGENTS.md](AGENTS.md)와 [공식 문서 기반 개발 기준](docs/08_ENGINEERING_STANDARD.md)을 먼저 따른다.

Google·Apple 로그인은 SDK 연결과 화면을 구현했으며 실제 제공자 설정은 아직이다. 비활성 제공자는 준비 중으로 표시한다. [소셜 로그인 활성화와 인증 정책](docs/26_SOCIAL_AUTH.md)을 참고한다.

## 실행 방법

필요 도구: Node 24.20.0, pnpm 11.24.0, 실행 중인 Docker/Compose. 현재 lockfile 설치 결과는 React 19.3.0, Vite 8.3.1, Nest core 12.1.0, TypeScript 6.0.3, Prisma 7.10.0이다. 버전 변경은 공식 호환 조건을 재확인하고 CLI/lockfile로 반영한다.

프로젝트 루트에서:

```sh
nvm use
pnpm --version
pnpm install --frozen-lockfile
cp -n apps/api/.env.example apps/api/.env
pnpm db:generate
pnpm infra:up
pnpm auth:start
pnpm auth:env
```

터미널 1:

```sh
pnpm dev:api
```

터미널 2:

```sh
pnpm dev:web
```

Vite: http://localhost:5173 · API: http://localhost:3000/api/v1/health/ready.
웹은 Dayjoin 달력·일정/가계부 등록·계좌/카드·월 합계를 제공한다. **웹 화면만 체험할 때는 설치 후 `pnpm dev:web`만 실행하면 된다.** API/Docker 없이 가상 데이터가 동작하며 새로고침하면 초기화된다. 상단 프로필에서 사용자 관점·화면 밝기·오류 상태를 비교할 수 있다. 화면 밝기는 기본적으로 시스템 설정을 따르며, 선택한 테마는 이 브라우저의 다음 방문에도 유지된다. 기록 데이터 저장과는 별도이며 [최신 테마·검증 기록](docs/20_THEME_AND_UI_CHECKPOINT.md)을 참고한다. 실제 로그인 계정은 별도 내 계정 화면에서 확인하며 `/api/v1/auth/me`를 호출한다. 가상 사용자 지우/하늘은 로그인 계정과 관계없는 체험용 인물이다. 가입 확인·복구 메일은 [개발용 메일함](http://127.0.0.1:55434)에서 확인한다.

Redis 연결도 확인하려면:

```sh
pnpm infra:cache
REDIS_ENABLED=true pnpm dev:api
```

기존 API 프로세스를 먼저 종료한 다음 재실행한다. 기본값은 Redis 비활성화다.

API까지 컨테이너로 실행하는 대안:

```sh
REDIS_ENABLED=true docker compose --profile cache --profile app up -d --build --wait
```

이 경우 호스트의 dev:api는 동시에 실행하지 않는다(같은 3000 포트). 웹은 dev:web로 실행한다.

## 검증·종료

```sh
pnpm db:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm infra:cache
pnpm test:integration
REDIS_ENABLED=true pnpm test:integration
docker compose --profile cache --profile app config --quiet
```

test는 API 환경 설정 단위 검사와 웹 금액·날짜·공개 표시 검사, test:e2e는 의존성을 대체한 HTTP 계약 검사, test:integration은 실제 DB/Redis와 빌드된 API를 실행한다. 통합 검사는 임시 3300 포트를 사용한다. 인증 브라우저 검사는 로컬 Auth와 DB를 시작한 뒤 `pnpm build && pnpm test:auth`로 실행한다. 권한/RLS/migration 검사는 아직 없다.

개발 서버는 해당 터미널에서 Ctrl+C, 컨테이너는 다음 명령으로 종료한다.

```sh
pnpm auth:stop
pnpm infra:down
```

DB volume은 보존한다. 초기 SQL은 새 volume에만 적용된다. 예시 비밀번호/무인증 로컬 Redis는 외부 운영에 사용하지 않는다. .env는 Git과 Docker 이미지에 포함하지 않는다.

- [공식 CLI 실행 기록](docs/09_SETUP_COMMANDS.log)
- [기반 검증 결과와 남은 범위](docs/10_BOOTSTRAP_VERIFICATION.md)
- [공식 문서 기반 개발 기준](docs/08_ENGINEERING_STANDARD.md)

GitHub Actions 파일은 .github/workflows/ci.yml에 준비했다. `main` 푸시와 PR에서 실행하며, 실제 실행 결과는 [GitHub Actions](https://github.com/FrostYOON/Dayjoin/actions)에서 확인한다. 클라우드 배포는 수행하지 않았다.

## 새 채팅에서 이어가기

세 프로젝트 기초 세팅 후 이 채팅에서 Dayjoin 화면 설계와 React 가상 화면까지 진행했다. 실제 서버 제품 기능과 앱 패키징은 후속 작업이다. [새 채팅 인계](docs/11_CHAT_HANDOFF.md)에 사용자 조건·완료 상태·다음 작업 후보를 정리했다.
