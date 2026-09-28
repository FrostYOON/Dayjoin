# 네이티브 빌드 검증 · P-010

확인일: 2026-09-27. 사용자가 다음 진행을 요청했고 Xcode는 직접 설정한 뒤 알려주기로 했다. 로컬 약관 미동의와 Android 도구 부재를 재확인했다. 기존 `feature/mobile-shell` / PR #4에서 앱의 실제 컴파일을 GitHub CI에 추가한다. 인증/업무 저장 개발은 시작하지 않았다.

## 공식 근거와 적용 방식

- [Android 공식 CLI 빌드](https://developer.android.com/build/building-cmdline): Gradle wrapper의 `assembleDebug` 사용. 프로젝트 Gradle 8.14.3 / Android Gradle Plugin 8.13.0 / SDK 36 / Java 21을 유지한다. `lintDebug`도 실행한다. debug APK이며 스토어 제출용 서명 빌드는 아니다.
- [Apple CLI 빌드](https://developer.apple.com/library/archive/technotes/tn2339/_index.html): Xcode 프로젝트·scheme·configuration·destination으로 빌드한다. `xcodebuild -list`와 `simctl help`를 러너에서 실행해 설치 CLI를 대조한다. `CODE_SIGNING_ALLOWED=NO`로 시뮬레이터용 Debug를 만들며 개인 인증서·스토어 계정은 사용하지 않는다.
- [GitHub macOS 26 도구 목록](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md), [Ubuntu 24.04 도구 목록](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)을 확인했다. macOS 기본 Xcode와 설치된 iPhone Simulator를 사용하고 실제 버전은 실행 로그/아티팩트에 남긴다. 로컬 Xcode 27에서 검증했다고 간주하지 않는다.
- [setup-java](https://github.com/actions/setup-java/releases/tag/v6.0.1) / [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.1)는 공식 릴리스 커밋으로 고정하고 action.yml 입력과 Node 24 런타임 조건을 확인했다. checkout/pnpm 설정은 기존 고정 버전을 유지한다.
- 프로젝트 선택: 모바일 관련 코드·의존성·CI 파일 변경 때 별도 `Native apps` workflow를 실행한다. 저장소는 확인 당시 Public이며 GitHub 기본 제공 러너를 사용한다. 비밀/배포 권한은 추가하지 않고 결과물은 7일 보관한다.

## 검사 범위

| 검사 | 확인하는 것 | 이 검사만으로 확인할 수 없는 것 |
|---|---|---|
| Android debug build + lint | 실제 Java/Gradle 컴파일, APK 생성, Android 정적 검사 | 에뮬레이터/실기기 실행, 키보드·뒤로가기·금융 동작 |
| iOS simulator build | Swift/SPM/Xcode 실제 컴파일 및 앱 번들 생성 | 실기기 설치·배포 서명·모든 iOS 버전 호환 |
| iOS 첫 실행 | CI의 사용 가능한 iPhone 부팅 → 설치 → 실행 → 화면 캡처 | 캡처만으로 기록 저장·키보드·백그라운드 복귀 검증 |
| 기존 CI | API/웹 감사·정적 검사·단위/HTTP·DB/Redis·컨테이너 회귀 | 업무 인증/RLS·실제 공유 |

`scripts/ios-smoke.mjs`는 CI에서만 실행하며 실행한 시뮬레이터를 종료한다. 시뮬레이터 이름/OS, launch 결과와 첫 화면을 보관하고 실패 시 오류 증거를 남긴다. 사람이 화면을 확인하기 전에는 스크린샷 생성 성공을 화면 정상으로 기록하지 않는다.

## 실행 기록

- Xcode 27.0(27A266a) 확인. `xcrun simctl list devices available`는 약관 미동의로 실패. Java runtime 및 기본 Android Studio/SDK 경로 없음.
- `pnpm --filter web exec cap build --help`는 release 빌드와 서명/내보내기 옵션 중심이다. 이번 debug/Simulator 검사는 공식 Gradle/Xcode CLI를 직접 호출한다.
- GitHub action.yml 최초 조회는 zsh의 `?` 확장으로 실패했고 endpoint를 작은따옴표로 감싸 다시 조회했다.
- Ruby YAML parse 및 `node --check scripts/ios-smoke.mjs` 통과. 최초 oxlint 상대 경로 `../../scripts/ios-smoke.mjs`는 CLI가 `..` 경로를 거절했다. 저장소 루트에서 `apps/api/node_modules/.bin/oxlint scripts/ios-smoke.mjs`로 실행해 통과했다.
- `842a00d` 커밋을 PR #4에 푸시했다. [네이티브 실행](https://github.com/FrostYOON/Dayjoin/actions/runs/36365930778), [기존 회귀 CI](https://github.com/FrostYOON/Dayjoin/actions/runs/36365930824)의 실제 결과를 아래에 기록한다.

## 실제 결과

커밋 `842a00d`의 네이티브 workflow와 기존 CI가 모두 성공했다.

- Android: Java **21.0.12.1**, Gradle **8.14.3**, SDK 36에서 `assembleDebug lintDebug` 통과. [debug APK 아티팩트](https://github.com/FrostYOON/Dayjoin/actions/runs/36365930778/artifacts/10947328254) 생성(4,345,881 bytes). 다운로드 후 ZIP 안의 HTML 2개·SVG·JS·CSS 5개를 로컬 웹 산출물과 바이트 단위로 비교해 일치했고 앱 ID와 외부 `server.url` 부재도 확인했다.
- iOS: CI의 **Xcode 26.6(17F113)**에서 unsigned Simulator build 통과. **iPhone 17 Pro / iOS 26.5**를 부팅해 앱 설치·실행 성공(PID 5515), 스크린샷 생성 완료. 약 2분 34초의 첫 부팅/설치 후 실행됐으며 workflow는 총 4분 35초에 완료됐다.
- [시뮬레이터 증거 아티팩트](https://github.com/FrostYOON/Dayjoin/actions/runs/36365930778/artifacts/10947152615)의 `device.json`, `launch.txt`, `first-screen.png`를 내려받았다. 화면을 직접 확인해 Dayjoin 달력·주말 색상·추석 공휴일·하단 메뉴가 표시됨을 확인했다. 첫 화면 원본을 [검증 이미지](verification/ios-first-launch.png)로 보존한다. 캡처 기기의 날짜는 UTC 9월 28일이다.
- 기존 CI: 전체 audit 0건, lint/typecheck, API 단위 6개·웹 26개·HTTP 계약 5개, API/웹 build, 자산 sync, 실제 DB/Redis 비활성/활성, API 컨테이너 실행 통과. 기존 웹 JS 청크 경고는 유지된다.
- 로컬 Xcode 약관 상태와 Android 환경은 그대로 미완료다. CI에서 앱이 실행된 사실과 로컬·실기기 검증을 구분한다. P-010은 진행 중이며 PR #4는 Draft로 유지한다.

## 남은 기기 조작 검증

P-010의 완료 기준에는 로컬 또는 실기기의 다음 확인이 남는다.

1. 달력 날짜/월 이동과 토요일·일요일/공휴일 색상.
2. 일정·가계부 입력 폼, 날짜/시간, 금액 키보드, 저장/취소.
3. 둥근 드롭다운 선택과 닫기, 모달 내부 스크롤.
4. 키보드가 입력 필드와 저장 버튼을 가리지 않는지 확인.
5. Android 뒤로가기와 iOS 닫기, 상하단 안전 영역.
6. 시스템 밝기·수동 테마·앱 복귀. 기록은 메모리 예시로 재시작 시 초기화됨을 구분.

사용자가 Xcode 설정 완료를 알려주면 시뮬레이터 목록부터 확인하고 위 검증을 이어간다. Android 실제 실행은 해당 개발 환경 준비 후 진행한다. CI 결과와 기기 조작을 구분해 PR Draft/P-010 상태를 판단한다.
