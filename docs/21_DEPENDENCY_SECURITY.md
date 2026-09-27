# 의존성 보안 보완

확인일: 2026-09-27. 사용자 진행 승인에 따라 dev에서 `fix/prisma-transitive-security`를 분기했다. 실행 중인 UI 개발 서버를 보존하기 위해 별도 관리형 worktree에서 작업했다.

## 근거와 선택

- 기존 `pnpm audit --prod`의 높음 2건/보통 1건은 Prisma CLI의 deepmerge-ts 7.1.5, mysql2 3.15.3에서 발생했다.
- [deepmerge-ts 권고](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [mysql2 인증 권고](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [mysql2 압축 권고](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3)의 수정 범위를 확인했다.
- 확인 당시 Prisma 안정판은 7.10.0이고 npm latest는 8.0.0-rc.17이다. CLI/client/adapter-pg는 안정판 7.10.0을 유지한다. 7.10.0이 하위 버전을 정확히 고정해 통상적인 범위 내 업데이트만으로는 해결되지 않는다.
- [pnpm overrides 공식 설정](https://pnpm.io/settings#overrides)으로 `@prisma/config@7.10.0>deepmerge-ts`만 8.0.0, `prisma@7.10.0>mysql2`만 3.23.1로 지정했다. 감사 예외나 패키지 제거로 권고를 숨기지 않았다. 이 제한적인 override는 프로젝트 선택이며 Prisma 공식 권장 조합이라는 뜻은 아니다.
- deepmerge-ts 8.0.0은 BSD-3-Clause/Node >=16, mysql2 3.23.1은 MIT/Node >=8이다. 현재 Node 24.20.0에서 지원 조건을 만족한다.
- [deepmerge-ts 8 릴리스](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0)의 Map 병합/타입 API/입력 변경 동작 차이를 확인했다. 설치된 Prisma config는 c12의 merger로 일반 deepmerge만 사용한다. 현재 Prisma 설정은 일반 객체이며 Map/커스텀 병합/타입 API를 사용하지 않는다. 실제 설정 로딩·generate·validate와 DB 연결로 현재 사용 경로를 검증했다.
- [mysql2 3.23.1 릴리스](https://github.com/sidorares/node-mysql2/releases/tag/v3.23.1)를 확인했다. 업무 DB는 PostgreSQL이며 MySQL 연결을 새로 도입하지 않는다. MySQL 서버 호환성을 검증했다고 주장하지 않는다.
- 후속 Prisma 안정판이 수정 버전을 포함하면 같은 검증 후 override를 제거한다. 대상 부모 버전을 바꿀 때 selector도 검토한다. CI에 `pnpm audit --prod`를 추가해 알려진 권고의 재유입을 확인한다.

## 실제 명령과 결과

1. `git fetch origin`, 관리형 worktree 생성(ref origin/dev), `git switch -c fix/prisma-transitive-security`.
2. `pnpm view prisma dist-tags --json`, `pnpm view prisma@7 version --json`, Prisma/config dependencies와 패치 두 버전의 engines/license 확인. 공식 문서 URL과 실제 설치 타입/코드를 대조했다. Prisma 업그레이드 문서 URL은 fetch 실패하여 버전 판단에 사용하지 않았다.
3. 새 worktree에서 shell이 Node 26/pnpm 9를 선택해 최초 install이 engine 검증에서 중단됐다. 해당 시도가 만든 .npmrc만 제거하고 프로젝트 지정 Node 24.20.0/pnpm 11.24.0 경로를 명시했다. 기존 lockfile이나 다른 환경의 설정을 삭제하지 않았다.
4. `pnpm config set --location=project --json overrides '{"@prisma/config@7.10.0>deepmerge-ts":"8.0.0","prisma@7.10.0>mysql2":"3.23.1"}'`, `pnpm install` 통과. CLI가 workspace 설정과 lockfile을 갱신했다. 직접 의존성이나 audit 예외를 추가하지 않았다.
5. `pnpm audit --prod --json` 통과: 권고 **0건**. 알려진 권고 기준이며 모든 보안 문제 부재를 증명하지 않는다.
6. `pnpm db:generate`, `pnpm db:validate`, `pnpm lint` 통과. 시도한 별도 회귀 검사가 `prisma/config`에 공개되지 않은 loadConfigFromFile을 import해 typecheck에서 실패했다. 그 임시 테스트를 제거하고 실제 공개 Prisma CLI 검사를 사용했다. 내부 API를 제품/테스트에 남기지 않았다.
7. `pnpm typecheck`, `pnpm test`(API 6개), `pnpm test:e2e`(HTTP 계약 5개), `pnpm build`(Prisma generate + API/웹) 통과. 이 브랜치의 dev 기준은 초기 웹 템플릿이며 UI PR의 26개 웹 테스트 결과와 구분한다.
8. 테스트용 .env.example 복사 후 `docker compose --profile cache up -d --wait postgres redis`, `pnpm test:integration`, `REDIS_ENABLED=true pnpm test:integration` 통과. 실제 PostgreSQL SELECT 1, Redis 비활성/활성, liveness/security header를 확인했다. 기존 데이터 볼륨은 보존한다.

schema 변경이나 업무 모델 추가는 없으므로 migration을 생성하지 않았다. API 컨테이너 이미지는 PR CI에서 별도 빌드/실행 결과를 확인한다. 인증·RLS·금융 원장은 여전히 미구현이다.

## 개발 도구 감사 확대 · 2026-09-27

Prisma 수정 PR #2와 UI PR #1을 각 최신 CI 성공 후 dev에 병합했다. UI 결합 커밋 `a000809`의 [CI](https://github.com/FrostYOON/Dayjoin/actions/runs/36296639003)는 감사·단위/HTTP·DB/Redis·API 이미지 검사를 모두 통과했다.

모바일 도구를 확인하는 과정에서 운영 의존성에 한정하지 않은 전체 감사를 실행했다. 기존 `@nestjs/mau@0.2.8` 경로에 undici/tmp 권고 17건(높음 5, 보통 8, 낮음 4)이 있었다. [Nest 배포 문서](https://docs.nestjs.com/deployment)의 Mau는 선택적인 클라우드 배포 도구이며, 저장소의 scripts·CI·Dockerfile·앱 코드에서 사용하지 않는다. 현재 안정판도 undici 6.20.1/inquirer 8.2.6을 고정한다. 불필요한 override를 늘리는 대신 `fix/development-tool-audit`에서 **사용하지 않는 직접 devDependency를 제거**했다. Nest의 build/start/schematics/testing 도구는 유지한다.

- `pnpm view @nestjs/mau version dependencies --json`, 사용 경로 `rg` 확인 후 `pnpm --filter api remove @nestjs/mau` 실행. package.json/lockfile은 공식 CLI가 갱신했다.
- `pnpm audit` 통과: 개발 도구를 포함해 0건. CI도 `pnpm audit --prod`에서 `pnpm audit`으로 확대했다. 감사 예외는 없다.
- 전체 lint/typecheck, API 단위 6개·웹 26개·HTTP 계약 5개, Prisma generate와 API/웹 build 통과. 웹 청크 582.11 kB 경고는 기존과 같다.
- Capacitor 추가 브랜치에서 발견한 uuid 권고와 네이티브 실행 검증은 앱 작업에서 별도로 처리한다. 이 브랜치에는 Capacitor가 없다.
