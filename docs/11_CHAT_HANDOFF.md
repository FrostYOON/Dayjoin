# Dayjoin 새 채팅 인계

## 사용자 의도와 현재 범위
Dayjoin은 공유 캘린더 서비스다. 한국 우선, 1인 개발, 주 약 10시간. 사용자는 TypeScript·NestJS 경험이 가장 많고 프론트엔드는 입문 단계다. 초기 비용을 줄이면서 직접 사용하고 장기적으로 수익화하려 한다.
최신 요청은 **세 프로젝트 기초 세팅까지만 완료한 후 각 프로젝트의 새 채팅에서 하나씩 진행**이다. 이 인계만으로 로그인/제품 기능을 자동 개발하지 않는다. 새 채팅에서는 문서를 읽고 준비 상태만 간단히 알린 뒤 사용자의 다음 요청을 기다린다.

## 완료한 기초 세팅
- React + Vite + TypeScript, NestJS + Express, pnpm workspace.
- 환경 변수 검증, 입력 검증/보안 헤더 기반, DB/선택적 Redis 모듈, health API.
- PostgreSQL/Redis/API Docker Compose, 비루트 다단계 API 이미지, CI workflow 파일.
- 고정 도구 버전과 lockfile, 공식 CLI 명령 기록, 로컬 검사/실제 연결 검증.
- 프로젝트별 포트/DB/volume 분리. 이 프로젝트: 웹 5173, API 3000, PostgreSQL 15432, Redis 16379, 통합 검사 3300.
- Git 기본 브랜치 `main`, 원격 `origin`: https://github.com/FrostYOON/Dayjoin.git. 2026-09-26 사용자 요청으로 연결했다. 저장소는 연결 당시 Public이며, CI 실제 결과는 GitHub Actions에서 확인한다.

## 읽는 순서
1. ../AGENTS.md — 사용자 개발 원칙.
2. ../README.md — 실제 실행/검사 명령.
3. 08_ENGINEERING_STANDARD.md — 공식 문서 확인/CLI/모듈화/운영 기준.
4. 10_BOOTSTRAP_VERIFICATION.md — 실제 검증과 미완료 범위.
5. 01_PRODUCT_PRD.md, 02_ARCHITECTURE.md, 03_DELIVERY_BACKLOG.md — 제품 계획.

## 미완료 범위
웹은 공식 예제 화면이며 제품 UI가 아니다. 업무 모델/migration/RLS, 로그인/JWT·초대·업무 권한, 도메인 기능·결제와 클라우드 배포는 없다. GitHub CI 통과 여부는 해당 커밋의 실행 결과로 판단한다.
도메인 데이터가 없어 빈 migration을 임의로 만들지 않는다. Redis는 캐시 연결 기반이며 업무 캐시/영속 작업 큐는 구현하지 않았다.
다음 제품 작업 후보: **D-001: 실제로 공유할 일정 사례와 첫 그룹 유형 정리**. 작업 순서는 사용자가 이 채팅에서 요청할 때 정한다.

## 준수할 실행 방식
작업 전 설치 버전에 맞는 공식 문서를 확인하고 필수 조건과 프로젝트 선택을 구분한다. 설치·생성·모듈 추가·빌드는 실제 터미널 공식 CLI로 실행한다. 실행하지 않은 검사를 완료로 기록하지 않는다.
기존 공통 기반을 불필요하게 다시 생성하지 말고 현재 파일과 검증 기록을 활용한다. 서비스별 저장소/DB/배포를 독립적으로 유지한다. README의 예시 비밀번호는 로컬 전용이다.
