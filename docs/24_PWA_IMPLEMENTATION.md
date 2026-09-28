# 웹앱(PWA) 구현과 검증

확인일: 2026-09-27. 사용자 요청으로 스토어 앱 대신 웹앱을 먼저 제공한다. 최신 `origin/dev`의 `6acc53b`에서 `feature/web-pwa`를 분기했다. 기존 `feature/mobile-shell` / Draft PR #4는 보류·보존하며 이 PR에 합치지 않는다.

## 구현

- Vite PWA의 `generateSW`/Workbox로 manifest와 서비스 워커를 생성한다. 식별자·scope·start URL은 `/`, 표시 방식은 standalone이다.
- 기존 Dayjoin SVG를 공식 assets-generator CLI로 PNG 192/512, maskable 512, Apple 180 아이콘과 favicon으로 변환했다. 아이콘/manifest는 소스에 포함한다.
- 미리보기 설정에 홈 화면 설치와 브라우저별 수동 안내를 제공한다. `beforeinstallprompt` 지원 시 설치 버튼을 보여주고, 취소/실패 후 수동 안내로 돌아간다. 이벤트 미지원·아직 설치 조건 미충족일 때 설치 가능하다고 단정하지 않는다.
- 새 버전은 안내 후 사용자가 새로고침을 선택한다. 폼이 열려 있으면 배너의 업데이트를 막는다. 다른 탭에서 이미 worker를 활성화해도 작성 중인 탭은 자동 새로고침하지 않는다.
- 정적 JS/CSS/HTML/아이콘만 precache한다. API/auth 응답 runtime cache는 없으며 `/api`·`/auth` navigation에 화면 HTML을 대신 반환하지 않는다. 서비스 워커 개발 모드는 꺼 둔다.
- 홈 화면 설치와 무관하게 업무 기록은 메모리 예시이며 새로고침/업데이트 시 초기화된다. 화면과 업데이트 안내에 이를 명시한다. 실제 저장·권한·공유·푸시·오프라인 편집은 구현하지 않았다.

## 공식 조건과 프로젝트 선택

| 항목 | 확인한 실제 버전·조건 | 적용 판단 |
|---|---|---|
| 기존 런타임 | Node 24.20.0 / pnpm 11.24.0 / React 19.3.0 / Vite 8.3.1 / TS 6.0.3 | 기존 스택 유지 |
| vite-plugin-pwa | 1.3.0, MIT, Vite peer에 8 포함 | 공식 React hook과 설치된 `onNeedReload` 타입/배포 소스 확인 |
| Workbox | workbox-window/build 7.4.1, MIT | 공개 정적 캐시와 업데이트 lifecycle을 라이브러리에 맡김 |
| assets-generator | 1.0.2, MIT | 플러그인의 optional peer `^1.0.0`에 맞춤. 2.0.0도 조회했지만 통합 peer 조건과 구분 |
| sharp | 0.35.4, Apache-2.0, 보안 수정 버전 | generator 1.0.2와 sharp-ico 0.1.5 경로에만 scoped override. CLI 이미지 생성 재검증. 상위 패키지 갱신 때 제거 검토 |
| Playwright | 1.63.0, Apache-2.0, Node >=20 | 배포 빌드의 실제 worker/브라우저 동작을 회귀 검사 |

공식 필수 조건은 패키지의 peer/Node 지원과 설치 가능 브라우저의 manifest/secure context 조건이다. `prompt`, 정적 파일만 캐시, 네이티브 보류, 새로고침의 입력 보존은 프로젝트 선택이다. 문서 페이지의 1.2.0 표시를 설치 버전으로 간주하지 않고 1.3.0 타입/소스를 확인했다. 설치 안내는 작은 브라우저 이벤트 연결이며 서비스 워커·캐시를 자체 구현하지 않는다.

공식 근거:
- [Vite PWA React](https://vite-pwa-org.netlify.app/frameworks/react.html), [1.3.0 릴리스](https://github.com/vite-pwa/vite-plugin-pwa/releases/tag/v1.3.0), [선택형 업데이트](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).
- [Assets CLI](https://vite-pwa-org.netlify.app/assets-generator/cli.html), [2.0.0 변경](https://github.com/vite-pwa/assets-generator/releases/tag/v2.0.0), [sharp 0.35.4](https://sharp.pixelplumbing.com/changelog/v0.35.4/), [보안 권고](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
- [PWA 설치 조건](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [설치 이벤트](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event), [Playwright 테스트 서버](https://playwright.dev/docs/test-webserver).

## 실패와 수정

1. 제한된 환경의 registry 조회가 ENOTFOUND로 실패해 네트워크 권한이 있는 공식 CLI 호출로 다시 확인했다.
2. 처음 설치한 Playwright 1.58.2는 조회한 최신 버전 1.63.0으로 CLI 교체했다. generator 설치는 `sharp` build script 미승인으로 실패했다. 설치 스크립트를 읽은 후 `pnpm approve-builds sharp`로 필요한 한 패키지만 허용했다.
3. 첫 audit에서 sharp 0.33.5의 high 권고 2건을 발견했다. 0.35.5 적용 시 pnpm이 새 릴리스 대기 예외 27개를 자동 추가했다. 예외 제거 명령은 자동 승인 검토에서 처음 거절됐으나, Git 원본에 없는 이번 작업의 추가 항목임을 증명한 후 승인됐다. 기존 보안 설정은 유지하고 예외만 제거했다.
4. 기존 작업 lockfile의 0.35.5 항목이 릴리스 대기 검사를 막아 해당 lockfile을 임시 백업했다. 작업 시작 커밋의 lockfile을 기준으로 공식 `pnpm install --no-frozen-lockfile`을 실행해 보안 수정 0.35.4와 PWA 의존성을 재해석했다. 최종 파일에는 릴리스 대기 예외가 없고 frozen 설치/audit가 통과했다.
5. 첫 브라우저 검사는 모바일에서 숨겨진 데스크톱 제목을 찾는 선택자와 이름이 같은 설정 버튼 선택자가 실패했다. 실제 모바일 달력과 명시된 설정 aria-label을 사용하도록 수정했다.
6. 다른 탭이 worker를 활성화한 경우 기다리는 worker가 없어 업데이트 버튼이 반응하지 않는 오류를 찾았다. 이미 활성화됐으면 사용자가 버튼을 누를 때 현재 탭을 새로고침하도록 수정하고 다중 탭 검사로 확인했다.

## 실제 통과한 검증

- `pnpm install --frozen-lockfile`, `pnpm audit`: 알려진 취약점 0건.
- `pnpm --filter web pwa:icons`: sharp 0.35.4에서 PNG/ICO 재생성 성공.
- 전체 `pnpm lint`, `pnpm typecheck`, `pnpm test` (API 6 / 웹 26), `pnpm test:e2e` (HTTP 계약 5), `pnpm build` (Prisma generate / Nest / Vite) 통과.
- `pnpm --filter web test:pwa`: Playwright/Chromium 153에서 아래 5개 통과. CI에도 빌드 후 같은 검사를 추가했다.
  1. manifest와 PNG 실제 크기, Chromium installability 오류 0개.
  2. 첫 접속 후 오프라인 새로고침으로 화면 열기. API/auth 응답이 캐시되거나 navigation HTML로 대체되지 않음.
  3. 360px 설정/수동 설치/예시 데이터 안내와 다크 모드, 가로 넘침 없음.
  4. 설치 취소 후 재사용 불가능한 prompt를 제거하고 수동 안내 유지. 이 항목은 브라우저 이벤트 fixture이며 실제 OS 설치 취소 시험은 아님.
  5. 업데이트 중 폼 유지, 다른 탭 업데이트에도 입력 유지, 저장 완료 후 사용자가 선택한 새로고침 성공.
- Codex 브라우저의 production preview에서 다크 모드 설치 안내를 직접 확인했다. [화면 증거](verification/pwa-settings.png).
- 기존 JS 청크 경고는 남아 있다: 메인 590.09 kB(gzip 182.16 kB), Workbox window 5.65 kB(gzip 2.20 kB). precache 17항목/650.25 KiB. 화면 성능 목표를 통과했다는 의미는 아니다.

## 남은 범위와 실행

개발 화면: `pnpm dev:web` → 5173, worker 없음. PWA: `pnpm --filter web build` → `pnpm --filter web preview --host 127.0.0.1 --port 4173 --strictPort`. 검사는 별도 4174 포트의 테스트 전용 static host를 사용하며 `/__test/update`는 제품 서버에 포함되지 않는다.

실제 iPhone/Android 홈 화면 설치·키보드·앱 복귀는 미검증이다. HTTPS 공개 시험 주소·호스팅/도메인·서버 인증/권한/영속 저장은 다음 작업이며 이번에 배포하지 않았다. 휴대폰에서 Mac의 127.0.0.1 주소를 그대로 쓰지 않는다. 운영 호스팅에서는 HTML/manifest/sw.js 재검증과 정적 자산의 버전 보존, 재배포/롤백을 확인해야 한다.
