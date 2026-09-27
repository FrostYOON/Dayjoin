# 시스템 테마와 UI 저장 기준

확인일: 2026-09-27. 사용자 요청으로 시스템 테마/설정 저장과 누적 UI의 GitHub 저장을 진행한다. [브랜치 규칙](19_GIT_WORKFLOW.md)에 따라 `feature/calendar-ledger-ui`에서 작업하며 PR 대상은 `dev`다.

## 테마 구현과 근거

- 기본값은 **시스템 설정 따르기**다. 라이트/다크를 직접 고르면 시스템 설정보다 우선하고, 다시 시스템을 고르면 기기 설정을 따른다.
- `next-themes@0.4.6`의 ThemeProvider/useTheme를 사용한다. 저장, 시스템 변경 구독, 탭 간 동기화는 라이브러리가 담당한다. 기존 `data-theme` CSS, 브라우저 `color-scheme`과 `theme-color`를 연결했다.
- 저장 키는 `dayjoin-theme`이며 같은 origin/브라우저의 다음 방문에 유지된다. 서버 계정 동기화가 아니고, 일정·가계부 예시 데이터는 여전히 새로고침 시 초기화된다. 저장 차단 환경에서는 영속 저장을 보장하지 않는다.
- [공식 README/API](https://github.com/pacocoursey/next-themes#api), npm 메타데이터, 설치된 타입/배포 코드를 대조했다. MIT, React/React DOM 16.8~19 지원, 별도 런타임 의존성 없음, unpacked 33,783 bytes. npm의 마지막 수정일은 2025-03-11이며 최근 릴리스가 활발하다고 단정하지 않는다. React 19.3.0/Vite 8.3.1/TypeScript 6.0.3에서 실제 검증했다.
- 기본 모드·저장 키·문구는 프로젝트 선택이다. 공개 attribute/defaultTheme/storageKey/enableSystem/enableColorScheme/scriptProps API를 사용하며 Next.js로 전환한 것이 아니다.
- Vite 클라이언트 렌더링에서는 라이브러리의 SSR 초기화 script가 실행되지 않아 React 19.3 개발 경고가 발생했다. 설치된 React DOM의 데이터 블록 처리와 [React script 문서](https://react.dev/reference/react-dom/components/script)를 대조해 공개 `scriptProps`의 `type="text/plain"`으로 해당 script를 비실행 데이터로 명시했다. 초기 적용/변경은 provider effect가 처리한다. SSR의 무깜빡임 보장을 이 앱에서도 검증했다고 쓰지 않는다.

## 실제 검증

- `pnpm lint`, `pnpm typecheck`: web/api 모두 통과.
- `pnpm test`: API 환경 설정 6개 + 웹 도메인/공휴일 26개 통과.
- `pnpm test:e2e`: 포트가 제한된 실행 환경에서 HTTP 계약 검사 5개 실패. 로컬 포트 접근이 가능한 승인된 환경에서 재실행해 **5/5 통과**했다. 제품 사용자 흐름 E2E라는 의미는 아니다.
- `pnpm build`: Prisma generate 및 web/api 빌드 통과. 마지막 script 조정 후 web lint/typecheck/build를 다시 통과했다.
- 최종 JS 582.11 kB / gzip 179.55 kB, CSS 43.96 kB / gzip 9.81 kB. 테마 추가 전 대비 JS gzip 약 1.31 kB 증가. 기존 500 kB 청크 경고는 남아 있다.
- 개발 브라우저에서 기본 시스템 선택, 다크 선택 후 새로고침 유지, 새 탭 반영, 열린 다른 탭의 라이트 동기화, 시스템 선택 저장/복귀를 확인했다. html attribute와 browser theme-color가 실제 테마와 일치했다. script 경고 수정 후 새 검증 탭의 console warn/error는 없었다.
- OS 자체 설정 전환 실험, 실제 휴대폰, 저장 차단 모드, 로딩 중 깜빡임 측정은 수행하지 않았다. 26개 테스트는 기존 회귀 검사이며 테마 자동화 테스트를 새로 추가한 것은 아니다.
- 실제 DB/Redis smoke와 컨테이너 실행은 로컬에서 이번에 반복하지 않았다. 해당 검사는 PR의 GitHub CI 결과와 구분해 확인한다.

## 기존 의존성 후속 보완

`pnpm audit --prod --json`은 권고 3건(높음 2, 보통 1)으로 exit 1이었다. next-themes 관련 권고는 없었으며 아래 버전은 초기 `origin/main` lockfile에도 있었다.

| 경로 | 버전 | 권고·패치 범위 |
|---|---|---|
| Prisma CLI → @prisma/config → deepmerge-ts | 7.1.5 | [재귀 객체 병합 시 스택 소진](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), >=8.0.0 |
| Prisma CLI → mysql2 | 3.15.3 | [인증 플러그인 다운그레이드](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), >=3.22.0 |
| Prisma CLI → mysql2 | 3.15.3 | [압축 응답 해제 시 자원 소진](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3), >=3.23.1 |

현재 API는 PostgreSQL adapter-pg를 사용하며 MySQL 연결을 구현하지 않았다. deepmerge-ts는 Prisma 설정의 전이 의존성이다. 이 맥락은 위험 평가 자료이며 취약성 해소나 운영 안전성을 보장하지 않는다. Prisma 업데이트/전이 의존성 호환성과 컨테이너 포함 범위를 별도 `fix/*`에서 검증한다. 이번 UI 저장에 무조건적인 major override나 audit 예외를 추가하지 않았다. 병합/운영 전 보완 항목으로 유지한다.

### 후속 해결 · 2026-09-27

[보안 PR #2](https://github.com/FrostYOON/Dayjoin/pull/2)가 dev에 병합됐다. 부모/버전을 한정한 override로 패치 버전을 적용했으며, [검증 기록](21_DEPENDENCY_SECURITY.md)과 [CI](https://github.com/FrostYOON/Dayjoin/actions/runs/36296440566)에서 감사·Prisma·DB/Redis·컨테이너 검사를 통과했다. UI 브랜치에도 dev를 병합한 뒤 frozen-lockfile 설치, 배포 의존성 감사 0건, 전체 lint/typecheck, API 6개·웹 26개·HTTP 5개, 전체 빌드를 다시 확인했다. 위 3건은 최초 발견 당시 기록이며 현재 미해결 권고로 중복 집계하지 않는다. 웹 청크 경고와 네이티브 실행 미검증은 남아 있다.
