# Dayjoin API

Nest 공식 CLI의 ESM/Vitest 템플릿에서 시작한 연결 기반이다. 실제 실행은 [프로젝트 README](../../README.md)를 따른다.

- HealthModule: /api/v1/health/live, /api/v1/health/ready.
- DatabaseModule: Prisma 7 + PostgreSQL adapter, 시작/종료 lifecycle.
- RedisModule: 선택적 단일 연결, timeout, 초기 연결 재시도 한도와 실행 중 재연결.
- ConfigModule: Zod 환경 변수 검증. 설정 오류에는 값 대신 필드 이름만 출력.

Prisma schema에는 아직 업무 모델이 없다. schema 변경 후 generate, 첫 모델 구현 때 migrate dev와 RLS/권한 검증을 함께 진행한다.
Prisma CLI는 MIGRATION_DATABASE_URL, 앱은 DATABASE_URL을 사용한다.
Vitest가 decorator metadata에 의존하지 않도록 provider 의존성은 @Inject로 명시한다.

공식 CLI가 자동 생성한 Prisma skills 파일은 생성 결과로 보존했다. 프로젝트의 사용자 지정 개발 규칙은 루트 AGENTS.md를 따른다.
