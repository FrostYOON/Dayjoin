# 웹앱(PWA) 제공 방향

변경일: 2026-09-27. **사용자 확정: 앱 대신 웹앱으로 먼저 사용한다.** 이전 앱·웹 동시 제공 계획을 이번 개발 범위에서는 대체한다. iOS/Android 앱·스토어 출시를 자동으로 재개하지 않는다.

## 현재 제공 방식

React + Vite + TypeScript 반응형 웹을 그대로 사용하고 `vite-plugin-pwa`로 설치형 웹앱을 구성한다. 브라우저 주소로 접속하거나 지원 브라우저에서 홈 화면에 추가해 실행한다. 모바일은 달력 아래에 선택일 기록, PC는 달력 옆에 상세를 배치한다. 따뜻한 색감과 시스템 테마를 유지한다.

Nest API와 PostgreSQL을 업무 데이터의 기준으로 유지한다. PWA 설치나 화면 캐시가 로그인·영속 저장·공유·오프라인 편집을 구현해 주지는 않는다. 현재 화면은 메모리의 예시 데이터이며 새로고침하면 초기화된다.

## 구현 및 다음 순서

1. W-010: manifest·PNG/Apple 아이콘, 홈 화면 설치 안내, 사용자 선택 업데이트, 공개 화면 자산 캐시를 구성한다. 실제 구현·검증은 [PWA 기록](24_PWA_IMPLEMENTATION.md)을 따른다.
2. 후속 사용자 요청에서 로그인·일정 영속 저장·개인/공유 권한을 연결한다. 가계부의 계좌·카드·이체 범위는 유지하며 금융 원장·거래 기능은 순차 구현한다.
3. W-020: HTTPS 시험 주소와 실제 iPhone/Android에서 설치·키보드·복귀·업데이트·공유 흐름을 검증한다. 운영 도메인/호스팅은 아직 연결하지 않았다.
4. 가족·커플의 실제 사용 결과를 확인한다. 푸시 알림·오프라인 수정·스토어 앱은 현재 작업에 자동 추가하지 않는다.

## 배포와 캐시 기준

- 서비스 워커 검증은 개발 서버(5173)가 아닌 production build/preview에서 한다. 개발 중 서비스 워커는 비활성화한다.
- 실제 휴대폰 설치용 사이트는 HTTPS로 제공한다. Mac의 `127.0.0.1` 주소는 휴대폰에서 같은 서버를 가리키지 않는다.
- 캐시는 JS/CSS/HTML/아이콘 같은 공개 정적 파일에 한정한다. `/api`·`/auth` 경로는 오프라인 HTML fallback에서 제외하고 업무 응답 runtime cache를 만들지 않는다.
- 새 버전 발견 시 안내하고 사용자가 새로고침을 선택한다. 입력 폼이 열린 동안 배너의 업데이트를 막고, 다른 탭의 업데이트로 현재 탭을 자동 새로고침하지 않는다.
- 운영 호스팅은 `sw.js`, manifest, HTML 재검증과 버전별 정적 자산 제공을 구성하고 재배포/롤백을 시험해야 한다. 로그인 도입 때 로그아웃과 기기 공유 상태를 추가 검증한다.

## 이전 네이티브 작업 보존

`feature/mobile-shell`과 [Draft PR #4](https://github.com/FrostYOON/Dayjoin/pull/4)의 Capacitor 코드·CI 검증 기록은 별도 브랜치에 보존한다. 이번 PWA 브랜치로 가져오거나 dev에 병합하지 않는다. Xcode 설정과 네이티브 기기 검증은 웹앱 진행의 선행 조건이 아니다. 네이티브 재개는 별도 요청과 필요성 판단 후 진행한다.

## 공식 조건과 프로젝트 선택

확인일 2026-09-27. 설치 버전은 React 19.3.0, Vite 8.3.1, TypeScript 6.0.3, Node 24.20.0, pnpm 11.24.0이다.

- [Vite PWA React](https://vite-pwa-org.netlify.app/frameworks/react.html): 공식 React 등록 hook과 Workbox를 사용한다. 문서 표시 버전 1.2.0과 실제 패키지 1.3.0 차이는 설치된 타입·배포 소스와 대조했다.
- [설치 조건](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable): manifest·아이콘·secure context와 브라우저별 설치 차이를 따른다. localhost 예외를 운영 HTTPS 대체로 해석하지 않는다.
- [사용자 선택 업데이트](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html): 라이브러리가 제공하는 선택지이며 입력 보존을 위해 프로젝트에서 채택했다.
- [Apple 웹 푸시](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/): iOS 16.4 이상 홈 화면 웹앱의 푸시 지원은 후속 후보다. 현재 알림 구현·권한 요청·발송 서버는 없다.
