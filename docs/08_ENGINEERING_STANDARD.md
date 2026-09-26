# 공식 문서 기반 개발 기준

적용일: 2026-09-26. 사용자 확정: React + Vite, TypeScript + NestJS, 설치·생성·모듈 추가·검증은 터미널 명령으로 수행한다. Dayjoin에서 검증한 공통 기반을 Cashjoin·Workjoin에도 적용했다. 세 프로젝트 모두 기초 세팅에서 멈추고 새 채팅에서 하나씩 개발한다.

## 판단 순서

1. 작업 대상의 현재 설치 버전, 공식 문서 URL, 확인 날짜, 해당 버전의 지원 조건을 확인한다.
2. 공식 **필수 조건**, 공식 **추천/선택 기능**, **우리 프로젝트의 설계 선택**을 분리한다. 공식 문서가 모든 아키텍처 결정을 정해 주지는 않는다.
3. 설치·생성 명령은 CLI의 실제 `--help`와 대조한다. 검색 결과의 최신 문서와 설치 버전이 다르면 버전별 문서·릴리스·설치된 타입/API를 확인한다.
4. 공식 CLI로 프로젝트/모듈을 생성하고 생성 결과를 검토한다. package.json을 직접 편집해 설치를 대체하거나 실행하지 않은 명령을 실행 기록에 넣지 않는다.
5. 의존성 변경은 pnpm add/remove로 수행한다. lockfile을 함께 관리하고 CI는 frozen-lockfile을 사용한다. 설치 스크립트는 필요한 패키지만 검토하여 허용한다.
6. 실패 원인과 수정, 실제 통과한 검증을 기록한다. 기반 검증을 제품 기능·출시·운영 검증 완료로 표현하지 않는다.

## 공식 근거와 적용

| 분야 | 공식 문서에서 확인한 조건/방식 | 프로젝트 적용 |
|---|---|---|
| React/Vite | [Vite 시작](https://vite.dev/guide/): react-ts 템플릿, 지원 Node 조건 | CLI 생성, TypeScript strict. React Router·Query·UI 라이브러리는 사용할 기능을 만들 때 설치 |
| Nest | [첫 단계](https://docs.nestjs.com/first-steps), [CLI](https://docs.nestjs.com/cli/usages): 지원 Node와 공식 생성 명령 | Node 24 LTS, Express 기본 어댑터, 생성 템플릿의 ESM/Vitest/oxlint 사용 |
| 모듈 | [Nest modules](https://docs.nestjs.com/modules): providers/imports/exports 경계 | 업무별 모듈, DB·Redis는 infrastructure 모듈. Config만 전역. 구조 선택이지 DDD/CQRS 전체 도입 의무가 아님 |
| 환경·입력 | [Configuration](https://docs.nestjs.com/techniques/configuration), [Validation](https://docs.nestjs.com/techniques/validation) | 환경 변수 Zod 검증, DTO ValidationPipe. 잘못된 설정은 시작 시 실패, 비밀 값은 오류에 출력하지 않음 |
| Prisma | [Nest Prisma 가이드](https://docs.nestjs.com/recipes/prisma): Prisma 7, driver adapter, generate 및 종료 lifecycle | CLI/client/adapter-pg 7.10.0 정렬. prerelease 8로 자동 교체하지 않음. 생성 client는 src 아래, 빌드 전 generate |
| 상태 API | [Terminus](https://docs.nestjs.com/recipes/terminus) | live는 프로세스, ready는 실제 PostgreSQL SELECT 1 및 활성 Redis PING |
| PostgreSQL | [공식 이미지](https://hub.docker.com/_/postgres), [지원 정책](https://www.postgresql.org/support/versioning/) | 로컬 18.6-bookworm. 18 계열의 volume 경로 /var/lib/postgresql 적용 |
| Redis | [공식 Node client](https://redis.io/docs/latest/develop/clients/nodejs/), [운영 안내](https://redis.io/docs/latest/develop/clients/nodejs/produsage/) | redis 패키지, 재사용 연결, 오류 listener, 연결/명령 timeout, 종료 처리. 업무 기능은 아직 없음 |
| Compose | [시작 순서](https://docs.docker.com/compose/how-tos/startup-order/), [profiles](https://docs.docker.com/compose/how-tos/profiles/) | docker compose 명령, healthcheck + service_healthy, Redis cache profile, API app profile |
| CI | [pnpm workspaces](https://pnpm.io/workspaces), [pnpm/setup](https://github.com/pnpm/setup), [checkout](https://github.com/actions/checkout) | workspace, lockfile 설치, 검사·통합 실행·이미지 빌드, Action commit 고정 |

위의 Redis 사용 여부, ORM·폴더 이름·모노레포·클라우드 공급자는 프로젝트 선택이다. 공식 문서에 등장한다는 이유만으로 모든 모듈을 설치하지 않는다.

## 구성과 모듈화

서비스별 독립 저장소를 지향하고 각 프로젝트 안에서 apps/web + apps/api를 pnpm workspace로 관리한다. 서비스 간 운영 DB·인증·비밀은 공유하지 않는다. 첫 버전은 Nest 단일 애플리케이션 안의 업무 모듈로 구성한다.

- Controller: HTTP 입출력과 DTO. 권한/업무 계산은 Service로 전달한다.
- Service: 유스케이스, 트랜잭션과 업무 규칙. 다른 도메인은 내보낸 provider를 통해 사용한다.
- DB 접근: 전용 provider와 도메인 단위 접근 코드. 단순 CRUD에 의미 없는 공통 Repository 계층을 강제하지 않는다.
- Infrastructure: DB/Redis/메일 등 외부 연결을 격리하고 lifecycle로 정리한다.
- Web: app, features, components, lib는 실제 기능이 생길 때 분리한다. 비어 있는 대규모 구조를 먼저 만들지 않는다.
- 인증, 테넌트 권한, RLS, 오류 계약, OpenAPI, 알림/outbox는 제품 구현 단계에서 관련 공식 문서를 다시 확인하고 추가한다.

## DB와 Redis

PostgreSQL은 일정·가계부·ERP 업무 데이터의 기준 저장소다. DB migration은 Prisma 하나로 관리한다. runtime DATABASE_URL과 CLI MIGRATION_DATABASE_URL을 분리한다. API 계정은 비소유자·NOSUPERUSER·NOBYPASSRLS다. 모델을 만들 때 RLS·테넌트 포함 제약·권한 테스트를 함께 구현한다. 현재 기반에 업무 테이블이나 RLS 정책이 구현됐다는 의미는 아니다.

Redis는 초기 비용·복잡도를 줄이기 위해 기본 비활성화한다. 캐시가 필요하면 재계산 가능한 데이터, 명확한 TTL, 테넌트/용도별 키를 사용한다. 전체 키 스캔이나 요청마다 새 연결을 만들지 않는다. 캐시 손실이 PostgreSQL 업무 데이터 손실로 이어지면 안 된다.

현재 로컬 Redis는 메모리 128MB, allkeys-lru, 영속화 없음의 **캐시 전용** 구성이다. 세션·결제·작업 큐에 이 구성을 재사용하지 않는다. 영속 작업이 필요하면 전달 보장·재시도·멱등성·복구와 운영 비용을 별도로 결정한다.

## 로컬·CI·운영

- Compose는 로컬 개발/CI용이다. DB와 Redis 포트는 127.0.0.1로 제한하고 예시 비밀번호는 로컬 전용이다.
- PostgreSQL named volume을 보존한다. down은 중지/컨테이너 제거이며 down -v는 데이터 삭제이므로 일상 종료 명령에 넣지 않는다.
- init SQL은 새 volume 최초 실행 시에만 적용된다. 기존 DB 변경에는 migration을 사용한다.
- PostgreSQL readiness 대기 후 API를 시작한다. Redis를 켜면 cache profile과 REDIS_ENABLED=true를 함께 지정한다.
- API 이미지는 다단계 빌드, 비루트 실행, .env/캐시 제외, 고정된 Node·pnpm·lockfile을 사용한다.
- Vite /api 프록시는 개발 서버 기능이다. 정적 배포에서는 별도 라우팅 또는 명시적 API URL + CORS allowlist를 구성해야 한다.
- 현재는 개발 프록시로 같은 origin을 사용하며 CORS 허용 정책은 아직 구현하지 않았다. 운영 배포 전에 실제 도메인을 기준으로 적용한다.
- 운영 후보는 Cloudflare 정적 호스팅 + Nest API 호스팅 + 관리형 PostgreSQL/Auth다. Supabase Auth는 다음 단계 후보이며 로컬 PostgreSQL이 인증 서버 역할을 대신하지 않는다.
- 클라우드 계약/유료 리소스/CD 연결은 아직 없다. 운영 전 TLS, secret 보관/회전, DB pool 한도, 로그 비식별화, 지표/오류 알림, 백업·복원 실험, migration/rollback 절차, 예산 알림을 확인한다.
- 로컬 도구가 오픈소스여도 클라우드·도메인·메일·백업 운영이 계속 무료라고 가정하지 않는다.

## 작업 단위 완료 기준

터미널 명령과 종료 상태, 적용 버전, 변경 이유, 관련 검사 결과를 기록한다. 코드 변경은 lint·typecheck·build와 의미 있는 테스트, 연결 변경은 실제 의존성 smoke, schema 변경은 format·generate·migration 재현과 권한 검증이 기준이다. 문서 수정마다 무관한 전체 테스트를 반복하지 않는다.

도메인 테이블이 없는 기반 단계에서는 빈 모델에 가짜 migration을 만들지 않는다. 첫 업무 schema부터 dev migration → 빈 DB 적용 → 권한 테스트 → 운영용 migrate deploy 순서를 검증한다.
