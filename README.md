# Dayjoin · 데이조인

일정과 가계부를 한 캘린더에서 관리하고, 선택한 기록을 함께 보는 서비스.

**현재 상태: 기반 구현 + React 통합 화면(가상 데이터) / 2026-09-27.** 공식 CLI로 React/Vite와 NestJS를 생성하고 PostgreSQL/선택적 Redis, health API, Dockerfile/Compose, CI workflow를 구성했다. Git 기본 브랜치는 `main`이며 원격 저장소는 [FrostYOON/Dayjoin](https://github.com/FrostYOON/Dayjoin)이다. 달력 중심의 반응형 화면과 가상 일정·가계부가 동작한다. Capacitor iOS/Android 네이티브 빌드와 CI의 iOS 첫 실행을 검증했다. 로컬·실기기 입력/키보드/뒤로가기 검증은 남아 있다. 로그인·테넌트 권한·영속 업무 모델·클라우드 배포는 아직 없다.

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

첫 사용 대상은 가족·커플이며 우선 사례는 저녁식사·여행이다. 사용자가 **계좌·카드·이체를 포함한 가계부와 기록별 개인/공유**로 범위를 넓혔다. [통합 가계부 설계안](docs/13_CALENDAR_RECORDS_PROPOSAL.md)을 바탕으로 [F-001 통합 시안과 가상 동작 확인](docs/14_UNIFIED_SCREEN_PREVIEW.md)을 완료했다. 이어서 **[F-002 React 가상 데이터 화면](docs/16_REACT_UI_IMPLEMENTATION.md)**을 구현했다. 다음은 P-010 앱 기기 적합성 확인이며, 실제 금융 원장·서버 저장·공유는 인증·권한 기반 이후 연결한다. 기존 일정 전용 공수는 재산정한다.

현재는 Dayjoin의 통합 제품에 집중한다. Cashjoin의 금융 계산·원장 기획을 참고하되 다른 저장소·DB·Auth·배포의 병합이나 중단은 결정하지 않았다. 서비스 간 독립 원칙을 유지하며 중복되는 제품 역할은 별도 전략 결정으로 남긴다.

플랫폼은 **모바일 앱 + 웹**으로 확장한다. 모바일은 월간 달력과 선택일 내역, PC 웹은 넓은 달력과 옆의 상세 영역을 기준으로 한다. [앱·웹 계획](docs/15_APP_AND_WEB_PLAN.md)의 방향에 따라 기존 React/Vite + Capacitor 8.5.2의 네이티브 프로젝트를 생성했다. [앱 구성과 실행 조건](docs/22_MOBILE_SHELL.md)을 따르며 앱 출시·기기 검증은 미완료다.

브랜치는 `main`(릴리스) → `dev`(통합) → 작업별 `feature/*`·`fix/*`·`docs/*`로 운영한다. 작업 PR은 dev로 모으고 병합은 별도로 진행한다. [브랜치 규칙](docs/19_GIT_WORKFLOW.md)을 따른다.

개발 시 [AGENTS.md](AGENTS.md)와 [공식 문서 기반 개발 기준](docs/08_ENGINEERING_STANDARD.md)을 먼저 따른다.

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
웹은 Dayjoin 달력·일정/가계부 등록·계좌/카드·월 합계를 제공한다. **웹 화면만 체험할 때는 설치 후 `pnpm dev:web`만 실행하면 된다.** API/Docker 없이 가상 데이터가 동작하며 새로고침하면 초기화된다. 상단 프로필에서 사용자 관점·화면 밝기·오류 상태를 비교할 수 있다. 화면 밝기는 기본적으로 시스템 설정을 따르며, 선택한 테마는 이 브라우저의 다음 방문에도 유지된다. 기록 데이터 저장과는 별도이며 [최신 테마·검증 기록](docs/20_THEME_AND_UI_CHECKPOINT.md)을 참고한다. 개발 프록시로 /api 요청이 Nest에 전달되지만 제품 UI는 아직 API를 호출하지 않는다.

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

## 앱 개발

[앱 구성 기록](docs/22_MOBILE_SHELL.md)의 Xcode/Android Studio 설정이 필요하다. 아래 명령은 웹 빌드 후 플랫폼 동기화 또는 네이티브 빌드·실행을 수행한다.

```sh
pnpm mobile:sync
pnpm mobile:ios
# Android 실행: pnpm mobile:android
```

[네이티브 CI 검증](docs/23_NATIVE_BUILD_VALIDATION.md)에서 Android APK 생성·lint와 iOS Simulator 빌드·첫 실행을 확인했다. 로컬은 Xcode 약관 미동의와 Android 도구 미준비로 기기 조작 검증이 남아 있다. 앱 데이터도 메모리 예시이며 새로 시작하면 초기화된다.

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

test는 API 환경 설정 단위 검사와 웹 금액·날짜·공개 표시 검사, test:e2e는 의존성을 대체한 HTTP 계약 검사, test:integration은 실제 DB/Redis와 빌드된 API를 실행한다. 통합 검사는 임시 3300 포트를 사용한다. 제품 브라우저 E2E와 권한/RLS/migration 검사는 아직 없다.

개발 서버는 해당 터미널에서 Ctrl+C, 컨테이너는 다음 명령으로 종료한다.

```sh
pnpm infra:down
```

DB volume은 보존한다. 초기 SQL은 새 volume에만 적용된다. 예시 비밀번호/무인증 로컬 Redis는 외부 운영에 사용하지 않는다. .env는 Git과 Docker 이미지에 포함하지 않는다.

- [공식 CLI 실행 기록](docs/09_SETUP_COMMANDS.log)
- [기반 검증 결과와 남은 범위](docs/10_BOOTSTRAP_VERIFICATION.md)
- [공식 문서 기반 개발 기준](docs/08_ENGINEERING_STANDARD.md)

GitHub Actions 파일은 .github/workflows/ci.yml에 준비했다. `main`/`dev` 푸시와 PR에서 실행하며, 실제 실행 결과는 [GitHub Actions](https://github.com/FrostYOON/Dayjoin/actions)에서 확인한다. 클라우드 배포는 수행하지 않았다.

## 새 채팅에서 이어가기

세 프로젝트 기초 세팅 후 이 채팅에서 Dayjoin 화면 설계와 React 가상 화면까지 진행했다. Capacitor 네이티브 빌드와 CI의 iOS 첫 실행까지 확인했다. 실제 서버 제품 기능과 기기 조작 검증은 후속 작업이다. [새 채팅 인계](docs/11_CHAT_HANDOFF.md)에 사용자 조건·완료 상태·다음 작업 후보를 정리했다.
