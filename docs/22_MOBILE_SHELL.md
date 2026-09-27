# Capacitor 앱 구성 · P-010 진행 중

확인일: 2026-09-27. 사용자의 다음 단계 진행 요청에 따라 UI/보안 PR을 dev에 통합한 뒤 `feature/mobile-shell`에서 앱 프로젝트를 생성했다. **웹 자산 빌드·동기화 완료, 네이티브 빌드와 기기 실행은 미검증**이다. 현재 업무 데이터는 메모리 예시이며 앱 재시작 시 초기화된다.

## 설치 버전과 선택 근거

| 구분 | 근거 | 적용 |
|---|---|---|
| 공식 필수 조건 | [Capacitor 환경](https://capacitorjs.com/docs/getting-started/environment-setup): Node >=22, iOS 개발용 macOS/Xcode >=26, Android Studio >=2025.2.1 및 SDK | Node 24.20.0 / pnpm 11.24.0. Xcode 27.0(27A266a) 설치 확인. 약관 미동의, Android Studio/SDK/JDK 미준비 |
| 공식 설치 방식 | [기존 웹에 추가](https://capacitorjs.com/docs/getting-started), [init](https://capacitorjs.com/docs/cli/commands/init), [add](https://capacitorjs.com/docs/cli/commands/add) | core/cli/ios/android **8.5.2**, MIT. 실제 설치 CLI `--help`와 config 타입 대조. 모든 패키지는 pnpm add로 고정 |
| 공식 권장 선택 | 환경 문서는 iOS 의존성에 SPM을 권장하며 Capacitor 8 기본값 | `cap add ios --packagemanager SPM`. CocoaPods를 추가하지 않음 |
| 공식 버전 변경 | [8.5 UIScene 변경](https://capacitorjs.com/docs/updating/8-5): Xcode 27의 scene lifecycle 대응 | 8.5.2 템플릿의 SceneDelegate·Info.plist manifest·AppDelegate hook·Sources 등록 확인 |
| 프로젝트 선택 | 기존 React/Vite를 웹과 앱에서 재사용하는 [계획](15_APP_AND_WEB_PLAN.md) | `apps/web/ios`, `apps/web/android`, `webDir: dist`. 개발 ID `com.frostyoon.dayjoin`; 상표/도메인 소유나 스토어 등록을 보장하지 않으며 등록 전 확정 필요 |
| 프로젝트 호환 기준 | [Vite build.target](https://vite.dev/config/build-options#build-target)와 설치된 Vite 8.3.1 상수: Chrome/Edge 111, Firefox 114, Safari/iOS 16.4 | iOS 앱 target **16.4**로 조정. Android는 템플릿 min SDK 24, compile/target SDK 36, Java 21 유지. WebView 최소 111 및 정적 로딩 오류 안내. 실제 지원 기기 인증과 출시 OS 범위 확정은 아님 |

`server.url`이나 개발 PC 주소는 저장하지 않는다. 앱에 복사한 웹 빌드를 사용하고, HTTP cleartext·임의 외부 탐색 허용은 추가하지 않는다. Capacitor sync는 Swift/Gradle 프로젝트 설정을 갱신하는 단계이며 네이티브 컴파일이나 SDK 다운로드 성공을 의미하지 않는다.

## 변경 내용

- 공식 CLI로 iOS Xcode 프로젝트와 Android Gradle 프로젝트 생성. 기본 앱 아이콘/스플래시는 템플릿 상태다.
- `capacitor.config.ts`를 기존 Node용 TypeScript 검사에 포함.
- 루트 `mobile:sync`, `mobile:ios`, `mobile:android` 명령 추가. 항상 웹을 빌드한 뒤 sync/run한다.
- CI의 웹 build 이후 `cap sync`를 실행한다. Ubuntu에서 자산 복사/플랫폼 설정 생성만 확인하며 iOS/Android 네이티브 빌드 CI는 아직 없다.
- 생성된 Android 예시 테스트는 `2 + 2` 또는 잘못된 템플릿 package ID를 확인하므로 제거했다. 네이티브 테스트가 통과했다고 쓰지 않는다.
- 웹 복사본·빌드 결과·기기별 설정·서명 비밀은 Git에서 제외한다. 필요한 네이티브 프로젝트, Gradle wrapper와 템플릿 자산은 추적한다.
- 기존 safe-area/viewport 설정을 유지했다. 모달 키보드·뒤로가기·상태 표시줄·테마·앱 복귀는 기기 검증 후 보완한다.

## CLI 도구 의존성 보안

전체 `pnpm audit`에서 최초 18건을 발견했다. 기존 Mau 도구의 undici/tmp 17건은 별도 [PR #3](https://github.com/FrostYOON/Dayjoin/pull/3)에서 미사용 배포 CLI 제거로 해결했다. 해당 PR의 [CI](https://github.com/FrostYOON/Dayjoin/actions/runs/36297096153)는 DB/Redis·API 이미지까지 통과해 dev에 병합했다.

추가 1건은 `@capacitor/cli > xcode@3.0.1 > uuid@7.0.3`의 [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)다. [uuid 11.1.1 릴리스](https://github.com/uuidjs/uuid/releases/tag/v11.1.1)와 package exports를 확인하고 `xcode@3.0.1>uuid: 11.1.1`만 pnpm CLI로 override했다. 11.1.1은 CommonJS require를 제공하고 xcode의 실제 사용 경로는 `uuid.v4()`뿐이다. Xcode 프로젝트 parse/serialize 및 고유한 24자리 ID 100개 생성을 확인했다. 이는 프로젝트의 제한적 보완이며 Capacitor가 공식 지정한 의존성 조합이라는 뜻은 아니다. 상위 xcode/Capacitor가 수정 버전을 포함하면 override 제거를 검토한다.

## 실제 명령과 검증

```sh
pnpm --filter web add --save-exact @capacitor/core@8.5.2 @capacitor/ios@8.5.2 @capacitor/android@8.5.2
pnpm --filter web add -D --save-exact @capacitor/cli@8.5.2
pnpm --filter web exec cap --version
pnpm --filter web exec cap init --help
pnpm --filter web exec cap add --help
pnpm --filter web exec cap sync --help
pnpm --filter web exec cap run --help
pnpm --filter web exec cap init Dayjoin com.frostyoon.dayjoin --web-dir dist
pnpm --filter web build
pnpm --filter web exec cap add ios --packagemanager SPM
pnpm --filter web exec cap add android
pnpm config set --location=project --json overrides '{"@prisma/config@7.10.0>deepmerge-ts":"8.0.0","prisma@7.10.0>mysql2":"3.23.1","xcode@3.0.1>uuid":"11.1.1"}'
pnpm install
pnpm mobile:sync
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test
plutil -lint apps/web/ios/App/App/Info.plist apps/web/ios/App/App.xcodeproj/project.pbxproj
```

위 명령과 웹 26개 회귀 검사는 통과했다. 생성된 웹 파일과 양쪽 플랫폼의 복사본을 바이트 단위로 비교했고, app ID/webDir와 외부 server URL 부재를 확인했다. 기존 JS 청크 582.11 kB 경고는 남는다. 정적 앱 구성만으로 실제 금융·공유·기기 동작을 검증하지 않는다.

보안 PR #3 반영 시 lockfile 충돌이 발생했고 최초 frozen 설치는 overrides 불일치로 실패했다. `pnpm install --no-frozen-lockfile`로 병합된 manifests/설정에서 재생성했다. 최종 `pnpm install --frozen-lockfile`, 전체 `pnpm audit`(0건), 전체 lint/typecheck, `pnpm mobile:sync`가 통과했다. 최종 산출물은 오류 안내를 포함한 5개 웹 파일이 양쪽 플랫폼과 일치했고 설정·plist 검사도 통과했다. CLI가 iOS app target 16.4를 읽어 SPM package 최소 버전을 v16으로 재생성한 결과를 보존했다. 생성 템플릿 Gradle의 후행 공백도 제거해 최종 diff 검사를 통과했다. 네이티브 실행 검사는 아래 조건 때문에 미실행이다.

## 기기 실행을 막는 현재 조건

- iOS: `xcrun simctl list devices available`가 Xcode 약관 미동의로 종료된다. 약관은 사용자가 Xcode에서 직접 검토·동의해야 한다. 동의 후 추가 컴포넌트와 iOS Simulator runtime을 준비하고 기기 목록부터 다시 확인한다.
- Android: 기본 경로의 Android Studio/SDK가 없으며 `java_home -V`도 runtime 없음으로 응답했다. Android Studio를 설치하고 SDK Manager에서 API 36·Platform Tools·에뮬레이터를 준비한다. Studio의 Java 21 호환 JDK를 사용한다.
- 두 플랫폼의 네이티브 컴파일, 시뮬레이터/에뮬레이터 실행, 실기기 설치·서명·스토어 제출은 수행하지 않았다. 앱 PR은 Draft로 유지하며 P-010 완료 체크를 하지 않는다.

도구 준비 후 이 브랜치 또는 관리형 worktree에서 실행한다:

```sh
nvm use
pnpm install --frozen-lockfile
pnpm mobile:sync
pnpm --filter web exec cap open ios
# Android는 cap open android
pnpm mobile:ios
# Android는 pnpm mobile:android
```

첫 실행에서는 달력 터치·날짜 이동, 일정/가계부 입력·저장, 드롭다운, 키보드로 가려지는 입력/버튼, Android 뒤로가기, 안전 영역, 밝기 설정, 백그라운드 복귀를 확인한다. 브라우저에서 돌아가는 사실만으로 기기 검증을 대신하지 않는다. 이후 단계는 인증/일정 영속화이며 아직 시작하지 않았다.
