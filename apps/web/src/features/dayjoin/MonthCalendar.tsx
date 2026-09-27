import { useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import themePlugin from "@fullcalendar/react/themes/classic";
import koLocale from "@fullcalendar/react/locales/ko";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import { calendarDayInfo, hasHolidayCoverage } from "./holidays.ts";
import {
  dateLabel,
  kindLabels,
  onDate,
  shiftDate,
  todayInSeoul,
  type DayRecord,
} from "./model.ts";

interface Props {
  month: string;
  selected: string;
  records: DayRecord[];
  onSelect: (date: string) => void;
}
export function MonthCalendar({ month, selected, records, onSelect }: Props) {
  const pendingFocus = useRef<string | null>(null);
  return (
    <div className="month-grid" aria-label="월간 달력">
      <FullCalendar
        key={month}
        plugins={[themePlugin, dayGridPlugin]}
        locale={koLocale}
        initialView="dayGridMonth"
        initialDate={`${month}-01`}
        timeZone="UTC"
        now={`${todayInSeoul()}T12:00:00Z`}
        headerToolbar={false}
        height="auto"
        fixedWeekCount={false}
        showNonCurrentDates
        firstDay={0}
        navLinks={false}
        tableClass="calendar-table"
        dayRowClass="calendar-week"
        dayHeaderClass={(info) =>
          `calendar-weekday day-tone-${info.date.getUTCDay() === 0 ? "red" : info.date.getUTCDay() === 6 ? "blue" : "normal"}`
        }
        dayHeaderContent={(info) =>
          ["일", "월", "화", "수", "목", "금", "토"][info.date.getUTCDay()]
        }
        dayCellDidMount={({ el }) => {
          // FullCalendar 7 hides the duplicated date label here. Our replacement is
          // an interactive date button, so expose it through the public mount hook.
          el.querySelector(".calendar-cell-inner")?.removeAttribute(
            "aria-hidden",
          );
        }}
        dayCellClass={(info) =>
          `calendar-cell ${info.isOther ? "outside-month" : ""} ${info.date.toISOString().slice(0, 10) === selected ? "is-selected" : ""}`
        }
        dayCellTopClass="calendar-cell-top"
        dayCellTopInnerClass="calendar-cell-inner"
        dayCellInnerClass="calendar-cell-events"
        dayCellTopContent={(info) => {
          const date = info.date.toISOString().slice(0, 10);
          const dayInfo = calendarDayInfo(date);
          const entries = records.filter((record) => onDate(record, date));
          const types = [...new Set(entries.map((record) => record.kind))];
          const label = entries.length
            ? `${entries.length}개 기록, ${types.map((kind) => kindLabels[kind]).join("·")}`
            : "기록 없음";
          return (
            <button
              type="button"
              className={`calendar-day day-tone-${dayInfo.tone} ${dayInfo.holiday ? "has-holiday" : ""}`}
              ref={(element) => {
                if (element && pendingFocus.current === date) {
                  element.focus({ preventScroll: true });
                  pendingFocus.current = null;
                }
              }}
              tabIndex={date === selected ? 0 : -1}
              data-calendar-date={date}
              aria-label={`${dateLabel(date)} ${dayInfo.weekdayName}${dayInfo.holiday ? `, ${dayInfo.holiday.name}, 공휴일` : ""}, ${label}`}
              title={dayInfo.holiday?.name}
              aria-pressed={date === selected}
              aria-current={info.isToday ? "date" : undefined}
              onClick={() => onSelect(date)}
              onKeyDown={(e) => {
                const offset = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -7,
                  ArrowDown: 7,
                }[e.key];
                if (offset !== undefined) {
                  const next = shiftDate(date, offset);
                  if (next >= "1900-01-01" && next <= "2100-12-31") {
                    e.preventDefault();
                    pendingFocus.current = next;
                    onSelect(next);
                  }
                }
              }}
            >
              <span className={`day-number ${info.isToday ? "is-today" : ""}`}>
                {info.date.getUTCDate()}
              </span>
              <span className="day-holiday-name" aria-hidden="true">
                {dayInfo.holiday?.shortName}
              </span>
              <span className="day-records" aria-hidden="true">
                {entries.slice(0, 2).map((record) => (
                  <span
                    className={`day-record kind-${record.kind}`}
                    key={record.id}
                  >
                    <span className="kind-dot" />
                    {record.title}
                  </span>
                ))}
                {entries.length > 2 && (
                  <span className="more-records">+{entries.length - 2}개</span>
                )}
              </span>
              <span className="day-marks" aria-hidden="true">
                {types.slice(0, 4).map((kind) => (
                  <span key={kind} className={`kind-dot kind-${kind}`} />
                ))}
              </span>
            </button>
          );
        }}
      />
      {!hasHolidayCoverage(month.slice(0, 4)) && (
        <p className="holiday-coverage-note" role="status">
          {month.slice(0, 4)}년 공휴일 정보는 아직 제공되지 않아요. 주말만
          표시하고 있어요.
        </p>
      )}
    </div>
  );
}
