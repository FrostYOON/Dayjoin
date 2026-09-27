import * as holidayPresets from "@hyunbinseo/holidays-kr/all";
import { validDate } from "./model.ts";

export interface KoreanHoliday {
  name: string;
  shortName: string;
  substituteFor?: string;
}

// Dates come exclusively from the package. These aliases preserve Dayjoin's labels.
// Sources and update procedure: docs/17_KOREAN_HOLIDAYS.md.
const displayNames: Readonly<Record<string, string | undefined>> = {
  "1월 1일": "신정",
  "3ㆍ1절": "삼일절",
  기독탄신일: "성탄절",
  "부처님 오신 날": "부처님오신날",
  "설날 전날": "설날 연휴",
  "설날 다음 날": "설날 연휴",
  "추석 전날": "추석 연휴",
  "추석 다음 날": "추석 연휴",
};
const shortNames: Readonly<Record<string, string | undefined>> = {
  "설날 연휴": "설 연휴",
  전국동시지방선거: "지방선거",
  "임시공휴일(대통령선거)": "대통령선거",
};

function holidayDisplay(rawName: string): KoreanHoliday {
  const substitute = /^대체공휴일\((.+)\)$/.exec(rawName)?.[1];
  if (substitute) {
    const name = displayNames[substitute] ?? substitute;
    return {
      name: `${name} 대체공휴일`,
      shortName: "대체휴일",
      substituteFor: name,
    };
  }
  const name = displayNames[rawName] ?? rawName;
  return { name, shortName: shortNames[name] ?? name };
}

const presets: readonly Readonly<Record<string, readonly string[]>>[] =
  Object.values(holidayPresets);

export const koreanHolidays: Readonly<
  Record<string, KoreanHoliday | undefined>
> = Object.fromEntries(
  presets.flatMap((preset) =>
    Object.entries(preset).map(([date, names]) => {
      const entries = names.map(holidayDisplay);
      return [
        date,
        {
          name: entries.map((entry) => entry.name).join(" · "),
          shortName: [...new Set(entries.map((entry) => entry.shortName))].join(
            " · ",
          ),
          ...(entries.every((entry) => entry.substituteFor)
            ? {
                substituteFor: entries
                  .map((entry) => entry.substituteFor)
                  .join(" · "),
              }
            : {}),
        },
      ];
    }),
  ),
);

export const holidayYears: readonly string[] = [
  ...new Set(Object.keys(koreanHolidays).map((date) => date.slice(0, 4))),
].sort();
const supportedYears = new Set(holidayYears);
export function hasHolidayCoverage(year: string) {
  return supportedYears.has(year);
}

export function calendarDayInfo(date: string) {
  const valid = validDate(date);
  const weekday = valid ? new Date(`${date}T12:00:00Z`).getUTCDay() : -1;
  const holiday = valid ? koreanHolidays[date] : undefined;
  return {
    weekday,
    holiday,
    weekend: weekday === 0 || weekday === 6,
    holidayCoverage: valid && hasHolidayCoverage(date.slice(0, 4)),
    tone: holiday || weekday === 0 ? "red" : weekday === 6 ? "blue" : "normal",
    weekdayName:
      ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][
        weekday
      ] ?? "",
  };
}
