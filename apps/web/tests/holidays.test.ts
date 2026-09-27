import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarDayInfo,
  hasHolidayCoverage,
  holidayYears,
  koreanHolidays,
} from "../src/features/dayjoin/holidays.ts";
import { shiftDate, validDate } from "../src/features/dayjoin/model.ts";

test("토요일은 파랑, 일요일과 공휴일은 빨강이며 평일과 구분한다", () => {
  assert.equal(calendarDayInfo("2026-09-19").tone, "blue");
  assert.equal(calendarDayInfo("2026-09-20").tone, "red");
  assert.equal(calendarDayInfo("2026-09-21").tone, "normal");
  assert.equal(calendarDayInfo("2026-09-26").weekday, 6);
  assert.equal(calendarDayInfo("2026-09-26").tone, "red");
  assert.equal(calendarDayInfo("2026-09-25").holiday?.name, "추석");
});

test("2026 추석 토요일에 임의의 월요일 대체공휴일을 만들지 않는다", () => {
  for (const date of ["2026-09-24", "2026-09-25", "2026-09-26"])
    assert.ok(calendarDayInfo(date).holiday);
  assert.equal(calendarDayInfo("2026-09-28").holiday, undefined);
  assert.equal(calendarDayInfo("2026-10-05").holiday?.substituteFor, "개천절");
  assert.equal(calendarDayInfo("2026-06-08").holiday, undefined);
});

test("2026 노동절·제헌절 변경과 지방선거, 음력 공휴일을 포함한다", () => {
  assert.equal(calendarDayInfo("2026-05-01").holiday?.name, "노동절");
  assert.equal(calendarDayInfo("2026-07-17").holiday?.name, "제헌절");
  assert.equal(calendarDayInfo("2026-06-03").holiday?.name, "전국동시지방선거");
  assert.equal(calendarDayInfo("2026-02-17").holiday?.name, "설날");
  assert.equal(
    calendarDayInfo("2026-05-25").holiday?.substituteFor,
    "부처님오신날",
  );
});

test("2027년 음력 날짜와 대체공휴일은 발표된 날짜를 따른다", () => {
  assert.equal(calendarDayInfo("2027-02-07").holiday?.name, "설날");
  assert.equal(calendarDayInfo("2027-02-09").holiday?.substituteFor, "설날");
  assert.equal(calendarDayInfo("2027-05-03").holiday?.substituteFor, "노동절");
  assert.equal(calendarDayInfo("2027-07-19").holiday?.substituteFor, "제헌절");
  assert.equal(calendarDayInfo("2027-09-15").holiday?.name, "추석");
  assert.equal(calendarDayInfo("2027-12-27").holiday?.substituteFor, "성탄절");
  assert.equal(calendarDayInfo("2027-06-07").holiday, undefined);
});

test("패키지가 제공하는 연도만 지원하며 범위 밖을 공휴일 없음으로 간주하지 않는다", () => {
  assert.deepEqual(holidayYears, [
    "2018",
    "2019",
    "2020",
    "2021",
    "2022",
    "2023",
    "2024",
    "2025",
    "2026",
    "2027",
  ]);
  assert.equal(hasHolidayCoverage("2018"), true);
  assert.equal(hasHolidayCoverage("2025"), true);
  assert.equal(hasHolidayCoverage("2026"), true);
  assert.equal(hasHolidayCoverage("2027"), true);
  assert.equal(hasHolidayCoverage("2017"), false);
  assert.equal(hasHolidayCoverage("2028"), false);
  assert.equal(hasHolidayCoverage(""), false);
  assert.equal(calendarDayInfo("2028-01-01").holidayCoverage, false);
  assert.equal(calendarDayInfo("2028-01-01").tone, "blue");
  assert.equal(calendarDayInfo("2026-02-30").weekday, -1);
  assert.equal(calendarDayInfo("invalid").holidayCoverage, false);
});

test("겹친 공휴일 이름을 모두 보존하고 다음 날의 대체공휴일을 표시한다", () => {
  const overlap = calendarDayInfo("2025-05-05");
  assert.equal(overlap.tone, "red");
  assert.equal(overlap.holiday?.name, "어린이날 · 부처님오신날");
  assert.equal(overlap.holiday?.shortName, "어린이날 · 부처님오신날");
  assert.equal(overlap.holiday?.substituteFor, undefined);
  assert.equal(
    calendarDayInfo("2025-05-06").holiday?.substituteFor,
    "부처님오신날",
  );
});

test("과거 임시공휴일·선거일을 제공하고 현재의 공휴일 규정을 소급하지 않는다", () => {
  assert.equal(calendarDayInfo("2018-01-01").holiday?.name, "신정");
  assert.equal(calendarDayInfo("2024-10-01").holiday?.name, "임시공휴일");
  assert.equal(calendarDayInfo("2025-01-27").holiday?.name, "임시공휴일");
  assert.equal(
    calendarDayInfo("2025-06-03").holiday?.name,
    "임시공휴일(대통령선거)",
  );
  assert.equal(calendarDayInfo("2025-07-17").holiday, undefined);
  assert.equal(calendarDayInfo("2025-05-01").holiday, undefined);
});

test("공휴일 데이터 무결성과 정부 발표 연간 합계 72일을 대조한다", () => {
  for (const [date, entry] of Object.entries(koreanHolidays)) {
    assert.ok(validDate(date), date);
    assert.ok(entry?.name && entry.shortName);
  }
  assert.equal(
    Object.keys(koreanHolidays).filter((d) => d.startsWith("2026")).length,
    22,
  );
  assert.equal(
    Object.keys(koreanHolidays).filter((d) => d.startsWith("2027")).length,
    24,
  );
  for (const year of [2026, 2027]) {
    let total = 0;
    for (
      let date = `${year}-01-01`;
      date < `${year + 1}-01-01`;
      date = shiftDate(date, 1)
    ) {
      const info = calendarDayInfo(date);
      if (info.weekday === 0 || info.holiday) total += 1;
    }
    assert.equal(total, 72, `${year} named holidays and Sundays`);
  }
});

test("날짜 판정은 실행 환경의 시간대가 달라도 동일하다", () => {
  const previous = process.env.TZ;
  try {
    for (const tz of ["Asia/Seoul", "America/Toronto", "Pacific/Honolulu"]) {
      process.env.TZ = tz;
      assert.equal(calendarDayInfo("2026-09-26").weekday, 6);
      assert.equal(calendarDayInfo("2026-09-26").holiday?.name, "추석 연휴");
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
