# Dayjoin 기반 검증 기록

검증일: 2026-09-26. 로컬 macOS arm64에서 실행했다. 설치·생성·검사 명령과 종료 코드는 [실행 기록](09_SETUP_COMMANDS.log)에 있다. 파일 편집과 일부 읽기 검사는 터미널로 수행했으며 이 로그가 모든 셸 출력을 저장하는 세션 녹화는 아니다.

이 문서는 GitHub 연결 전의 기반 검증 기록이다. 이후 Git/원격 연결 상태는 [새 채팅 인계](11_CHAT_HANDOFF.md), GitHub CI 실행 결과는 [Actions](https://github.com/FrostYOON/Dayjoin/actions)를 따른다.

## 적용 버전

- Node 24.20.0 / pnpm 11.24.0. 사용자 전역 기본 버전을 바꾸지 않고 프로젝트 실행 경로를 고정했다.
- create-vite 9.2.1의 react-ts 생성 결과: React/React DOM 19.3.0, Vite 8.3.1, TypeScript 6.0.3.
- Nest CLI 12.0.7, Nest core/common/platform-express 12.1.0, Config 12.0.1, Terminus 12.1.0.
- Prisma CLI/client/adapter-pg 7.10.0. 최신 태그에 prerelease 8이 보여도 Nest 공식 가이드의 7 계열을 유지했다.
- node-redis 6.2.1, Zod 4.6.5, Vitest 4.1.11. 전체 전이 의존성은 pnpm-lock.yaml에 고정한다.
- 로컬 이미지 postgres:18.6-bookworm, redis:8.10.2-alpine, node:24.20.0-bookworm-slim.
- 사용한 Docker Engine 29.7.2 / Compose 5.4.0. OS/클라우드 플랫폼 전체를 검증한 것은 아니다.

## 실제 통과한 검사

| 검사 | 결과/의미 |
|---|---|
| pnpm install --frozen-lockfile --strict-peer-dependencies | 종료 0, peer 호환 경고 없음 |
| pnpm db:validate | 빈 업무 schema 문법 유효 |
| pnpm db:generate | Prisma Client 생성 성공 |
| pnpm build | Nest API와 React/Vite production build 성공 |
| pnpm lint | API/web 통과 |
| pnpm typecheck | API/web 통과 |
| pnpm test | 환경 변수 단위 검사 6개 통과 |
| pnpm test:e2e | HTTP 계약 검사 5개 통과. DB/Redis는 테스트 대체 객체 사용 |
| pnpm test:integration | 실제 PostgreSQL 접근, Redis 비활성 모드, live 응답/보안 헤더 통과 |
| REDIS_ENABLED=true pnpm test:integration | 실제 PostgreSQL + 실제 Redis PING 통과 |
| docker compose --profile cache --profile app config --quiet | Compose 설정 검증 성공 |
| docker compose --profile cache up -d --wait postgres redis | 두 의존 서비스 healthy |
| Docker API 이미지 빌드 | Linux arm64 컨테이너 내 frozen install/generate/Nest build 성공 |
| REDIS_ENABLED=true docker compose --profile cache --profile app up -d --build --wait | API/DB/Redis 모두 healthy |
| docker compose exec -T api id | uid=1000(node), 비루트 사용자 |
| Vite HTTP + /api 프록시 | 예제 HTML 및 실제 API→DB/Redis readiness 통과 |
| DB 역할 직접 조회 | API 역할 NOSUPERUSER/NOBYPASSRLS/NOCREATEDB 확인. migration 역할만 개발 shadow DB 생성 허용 |
| 실행 중 Redis 중지/재시작 | ready 503 + live 200 → API 재시작 없이 ready 200 복구 |
| 실행 중 PostgreSQL 중지/재시작 | ready 503 + live 200 → API 재시작 없이 ready 200 복구 |
| CI YAML 구문 읽기 | 통과. GitHub runner에서의 실제 실행은 미수행 |

Redis 재연결 보완 후 API를 다시 빌드했고 lint/typecheck/11개 테스트 및 컨테이너 장애·복구 검증을 통과했다. 오류 경로 테스트의 Terminus ERROR 로그는 의도한 503 검사이며 테스트 실패가 아니다.

## 발견한 차이와 수정

1. 로그인 셸의 기본 Node/pnpm과 프로젝트용 버전이 달라 명시적인 Node 24 실행 경로를 사용했다. 최초 pnpm dlx cache 옵션은 해당 버전 CLI help를 확인해 --config.cache-dir/--config.store-dir 형태로 수정했다.
2. Nest 생성 템플릿의 vite-tsconfig-paths가 TypeScript 6과 peer 경고를 냈다. 현재 별칭을 쓰지 않아 pnpm remove로 제거하고 두 Vitest 설정의 플러그인도 제거했다. 테스트용 provider는 @Inject로 명시해 decorator metadata 자동 생성에 의존하지 않는다.
3. pnpm이 Prisma의 설치 스크립트를 차단했다. 공식 Prisma 설치에 필요한 @prisma/engines와 prisma 두 패키지만 approve-builds로 허용했다.
4. Prisma CLI 캐시와 Vitest 임시 폴더가 실행 환경의 파일 권한 제한에 걸렸다. Prisma 캐시 접근 권한을 허용하고 테스트는 허용된 임시 폴더를 사용해 다시 실행했다. 프로젝트의 일반 개발 환경에 이 임시 경로를 강제하지 않는다.
5. Node slim 이미지의 Prisma 7 CLI가 OpenSSL 누락을 경고했다. 공식 CLI의 안내에 따라 이미지에 openssl/ca-certificates를 설치한 뒤 경고 없이 다시 빌드했다. 최신 Prisma 8 문서의 설치 예제를 7에 혼용하지 않았다.
6. 중첩된 pnpm 캐시가 Docker context에 포함되는 것을 확인해 .dockerignore를 수정했다. .env, node_modules, 생성 client, 빌드 결과, tsbuildinfo도 호스트에서 복사하지 않는다.
7. Redis 초기 연결은 제한된 횟수로 시도하고 실패 시 시작을 중단한다. 한 번 연결된 뒤 발생한 장애는 지연을 제한한 재연결을 계속하며 readiness에 반영한다.

## 구현된 범위와 남은 범위

구현: 공식 CLI 기반 web/api workspace, 환경 검증, DB/Redis lifecycle, live/ready API, 입력 ValidationPipe·Helmet 기반, 로컬 Compose, API Dockerfile, CI workflow 파일, 실행 문서와 공통 개발 규칙.

미구현/미검증:

- 웹은 공식 React/Vite 예제 화면이다. 캘린더 UI·라우팅·사용자 흐름·브라우저 자동화/접근성 검증은 다음 단계다.
- 로그인, JWT Guard, 멤버십/초대, 업무 데이터, RLS 정책/테넌트 격리, OpenAPI/오류 계약은 아직 없다.
- Prisma schema에 업무 모델이 없어 migration을 만들거나 적용하지 않았다. 첫 모델부터 migration/권한을 함께 검증한다.
- Redis 업무 캐시/TTL/큐는 아직 없다. 현재 구성은 영속 작업 큐에 사용할 수 없다.
- Git 저장소/원격 연결, GitHub CI 실제 실행, 클라우드 배포, SMTP·결제, 운영 모니터링·백업/복원은 아직 없다.
- 운영 CORS/인증/비밀 관리/부하/보안 심사 완료를 주장하지 않는다.
- 후속 사용자 요청으로 Cashjoin·Workjoin에도 기초 설정을 적용했다. 각 프로젝트의 별도 검증 기록을 따른다.

## 다음 작업

D-001의 첫 공유 시나리오와 화면을 정리하면서 D-010에 남은 API 오류 계약/OpenAPI/CI 실제 연결을 이어간다. 다음 기반 단계는 인증 공급자 확정과 workspaces/memberships 데이터·권한 설계다. 인터뷰/제품 기능·인증이 끝나지 않아 D-010/D-020 전체를 완료 처리하지 않는다.

## 검증 환경 정리

검증용 Vite 프로세스를 종료하고 Dayjoin Compose 컨테이너/네트워크를 down으로 제거했다. PostgreSQL named volume과 빌드 이미지는 보존했다. README 명령으로 다시 실행할 수 있다.

개발 서버 종료 로그의 exit 143은 검증 후 보낸 SIGTERM에 따른 정상적인 정리 결과다. 빌드/테스트 실패가 아니다.
