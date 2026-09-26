# Dayjoin · 데이조인

함께 쓰는 일정을 한곳에 모으고, 변경된 약속을 확인하는 공유 캘린더.

**현재 상태: 기반 구현 + 계획 v0.3 / 2026-09-26.** 공식 CLI로 React/Vite와 NestJS를 생성하고 PostgreSQL/선택적 Redis, health API, Dockerfile/Compose, CI workflow를 구성했다. Git 기본 브랜치는 `main`이며 원격 저장소는 [FrostYOON/Dayjoin](https://github.com/FrostYOON/Dayjoin)이다. 캘린더 화면·로그인·테넌트 권한·업무 모델과 클라우드 배포는 아직 없다.

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

다음 제품 작업: **D-001: 첫 사용자와 함께 일정 하나를 공유하는 흐름을 구체화한다**. 기반 검증 이후 해당 작업과 인증·권한 설계를 진행한다. 백로그의 체크박스는 완료 전까지 비워 둔다. 문서 생성과 앱 개발 완료를 구분한다.

세 서비스 계획은 모두 준비하되 구현은 Dayjoin → Cashjoin → Workjoin 순서가 기본 추천이다. 먼저 한 서비스의 실제 사용 결과를 보고 다음 서비스 착수 시점을 조정한다. ERP 고객을 이미 확보한다면 Workjoin 순서를 앞당길 수 있다.

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
웹은 아직 Vite의 React 예제 화면이다. 캘린더 UI는 다음 단계다. 개발 프록시로 /api 요청이 Nest에 전달된다.

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

test는 환경 설정 단위 검사, test:e2e는 의존성을 대체한 HTTP 계약 검사, test:integration은 실제 DB/Redis와 빌드된 API를 실행한다. 통합 검사는 임시 3300 포트를 사용한다. 제품 브라우저 E2E와 권한/RLS/migration 검사는 아직 없다.

개발 서버는 해당 터미널에서 Ctrl+C, 컨테이너는 다음 명령으로 종료한다.

```sh
pnpm infra:down
```

DB volume은 보존한다. 초기 SQL은 새 volume에만 적용된다. 예시 비밀번호/무인증 로컬 Redis는 외부 운영에 사용하지 않는다. .env는 Git과 Docker 이미지에 포함하지 않는다.

- [공식 CLI 실행 기록](docs/09_SETUP_COMMANDS.log)
- [기반 검증 결과와 남은 범위](docs/10_BOOTSTRAP_VERIFICATION.md)
- [공식 문서 기반 개발 기준](docs/08_ENGINEERING_STANDARD.md)

GitHub Actions 파일은 .github/workflows/ci.yml에 준비했다. `main` 푸시와 PR에서 실행하며, 실제 실행 결과는 [GitHub Actions](https://github.com/FrostYOON/Dayjoin/actions)에서 확인한다. 클라우드 배포는 수행하지 않았다.

## 새 채팅에서 이어가기

세 프로젝트 모두 기초 세팅까지만 완료했다. 이후 기능 개발은 각 프로젝트의 새 채팅에서 하나씩 진행한다. [새 채팅 인계](docs/11_CHAT_HANDOFF.md)에 사용자 조건·완료 상태·다음 작업 후보를 정리했다.
