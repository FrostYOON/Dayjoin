import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  Plus,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { Accounts, AccountForm } from "./features/dayjoin/Accounts.tsx";
import { MonthCalendar } from "./features/dayjoin/MonthCalendar.tsx";
import { calendarDayInfo } from "./features/dayjoin/holidays.ts";
import { RecordDetail } from "./features/dayjoin/RecordDetail.tsx";
import { RecordForm } from "./features/dayjoin/RecordForm.tsx";
import { Reports } from "./features/dayjoin/Reports.tsx";
import { SelectField } from "./features/dayjoin/SelectField.tsx";
import { createDemo } from "./features/dayjoin/seed.ts";
import {
  addAccount,
  cancelRecord,
  dateLabel,
  editDraft,
  InputError,
  newDraft,
  onDate,
  people,
  saveRecord,
  shiftMonth,
  todayInSeoul,
  validDate,
  visibleRecords,
  weekdayLabel,
  type Person,
  type RecordDraft,
  type Visibility,
} from "./features/dayjoin/model.ts";
import { EmptyState, Modal, RecordRow } from "./features/dayjoin/ui.tsx";
import "./App.css";

type Page = "calendar" | "accounts" | "reports";
type Panel =
  | { kind: "entry"; draft: RecordDraft }
  | { kind: "record"; id: string }
  | { kind: "account" }
  | { kind: "demo" }
  | null;
const navigation = [
  { page: "calendar", label: "캘린더", Icon: CalendarDays },
  { page: "accounts", label: "계좌·카드", Icon: Wallet },
  { page: "reports", label: "월 합계", Icon: ChartNoAxesColumn },
] as const;

function App() {
  const [today] = useState(todayInSeoul);
  const [data, setData] = useState(() => createDemo(today));
  const [actor, setActor] = useState<Person>("jiwoo");
  const [page, setPage] = useState<Page>("calendar");
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [type, setType] = useState<"all" | "event" | "finance">("all");
  const [scope, setScope] = useState<"all" | Visibility>("all");
  const [panel, setPanel] = useState<Panel>(null);
  const [status, setStatus] = useState("");
  const [scene, setScene] = useState<"ready" | "loading" | "error">("ready");
  const [failNext, setFailNext] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [reset, setReset] = useState<"empty" | "seed" | null>(null);
  const selectedDayInfo = calendarDayInfo(selected);
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#25211e" : "#faf8f5",
      );
  }, [resolvedTheme]);
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 5000);
    return () => clearTimeout(timer);
  }, [status]);
  const ownAccounts = data.accounts.filter(
    (account) => account.owner === actor,
  );
  const visible = visibleRecords(data, actor);
  const filtered = visible.filter(
    (record) =>
      (type === "all" ||
        (type === "event"
          ? record.kind === "event"
          : record.kind !== "event")) &&
      (scope === "all" || record.visibility === scope),
  );
  const daily = filtered
    .filter((record) => onDate(record, selected))
    .sort(
      (a, b) => (a.kind === "event" ? 0 : 1) - (b.kind === "event" ? 0 : 1),
    );
  const detail =
    panel?.kind === "record"
      ? visible.find((record) => record.id === panel.id)
      : undefined;
  const selectDate = (date: string) => {
    if (validDate(date)) {
      setSelected(date);
      setMonth(date.slice(0, 7));
    }
  };
  const changeMonth = (value: string) => {
    if (/^\d{4}-\d{2}$/.test(value) && validDate(`${value}-01`))
      selectDate(`${value}-01`);
  };
  const openNew = () =>
    setPanel({ kind: "entry", draft: newDraft(selected, ownAccounts) });
  const simulateSave = () => {
    if (failNext) {
      setFailNext(false);
      throw new Error("Simulated save failure");
    }
  };
  const changed = () => {
    setPanel(null);
    setScene("ready");
    setStatus("예시 데이터에 반영했어요. 새로고침하면 초기화돼요.");
  };
  const renderNav = () =>
    navigation.map(({ page: next, label, Icon }) => (
      <button
        key={next}
        onClick={() => setPage(next)}
        aria-current={page === next ? "page" : undefined}
      >
        <Icon size={20} aria-hidden="true" />
        <span>{label}</span>
      </button>
    ));
  const loadState =
    scene === "loading" ? (
      <div className="load-state" role="status">
        <span className="loading-orbit" />
        <h3>기록을 불러오고 있어요</h3>
        <p>미리보기의 로딩 상태예요.</p>
        <button onClick={() => setScene("ready")}>불러오기 완료</button>
      </div>
    ) : scene === "error" ? (
      <div className="load-state" role="alert">
        <CircleHelp size={28} />
        <h3>기록을 불러오지 못했어요</h3>
        <p>잠시 후 다시 시도해 주세요.</p>
        <button className="primary-button" onClick={() => setScene("ready")}>
          다시 시도
        </button>
      </div>
    ) : null;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#calendar"
          onClick={(e) => {
            e.preventDefault();
            setPage("calendar");
          }}
        >
          <span className="brand-symbol">
            <CalendarDays size={22} strokeWidth={1.7} />
          </span>
          Dayjoin<span className="brand-period">.</span>
        </a>
        <button className="primary-button sidebar-create" onClick={openNew}>
          <Plus size={19} />새 기록
        </button>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          {renderNav()}
        </nav>
        <div className="sidebar-calendar">
          <p className="sidebar-label">함께 보는 캘린더</p>
          <div>
            <span className="calendar-color" />
            우리 둘 <span className="member-count">2</span>
          </div>
          <p className="sidebar-caption">
            <LockKeyhole size={12} />
            개인 기록은 나에게만 보여요.
          </p>
        </div>
        <div className="sidebar-bottom">
          <div className="avatar-pair">
            <span>지</span>
            <span>하</span>
          </div>
          <p>
            함께하는 일정과
            <br />
            나만의 돈 기록.
          </p>
          <button
            className="text-button"
            onClick={() => setPanel({ kind: "demo" })}
          >
            <Settings2 size={16} />
            미리보기 설정
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <div>
            <div className="mobile-brand">
              <span className="brand-symbol">
                <CalendarDays size={19} />
              </span>
              Dayjoin.
            </div>
            <div className="workspace-title">
              <span>나의 공간</span>
              <ChevronRight size={13} />
              <strong>
                {page === "calendar"
                  ? "우리 둘"
                  : page === "accounts"
                    ? "계좌·카드"
                    : "월 합계"}
              </strong>
            </div>
          </div>
          <div className="header-right">
            <span className="preview-badge">미리보기</span>
            <button
              className="profile-button"
              onClick={() => setPanel({ kind: "demo" })}
              aria-label="미리보기 설정"
            >
              <span className="avatar">{people[actor].slice(0, 1)}</span>
              <span>{people[actor]}</span>
              <Settings2 size={15} />
            </button>
          </div>
        </header>
        <main id="main-content">
          {page === "calendar" ? (
            <div className="calendar-workspace">
              <section className="calendar-panel" aria-label="캘린더">
                <div className="calendar-intro">
                  <div>
                    <p className="eyebrow">
                      <Users size={13} />
                      공유 캘린더
                    </p>
                    <h1>우리 둘의 캘린더</h1>
                  </div>
                  <div className="avatar-pair" aria-label="멤버 지우와 하늘">
                    <span>지</span>
                    <span>하</span>
                  </div>
                </div>
                <div className="calendar-toolbar">
                  <div className="month-navigation">
                    <h2>
                      {month.slice(0, 4)}년{" "}
                      <strong>{Number(month.slice(5))}월</strong>
                    </h2>
                    <div className="month-buttons">
                      <button
                        className="icon-button"
                        aria-label="이전 달"
                        disabled={month === "1900-01"}
                        onClick={() => changeMonth(shiftMonth(month, -1))}
                      >
                        <ChevronLeft size={19} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="다음 달"
                        disabled={month === "2100-12"}
                        onClick={() => changeMonth(shiftMonth(month, 1))}
                      >
                        <ChevronRight size={19} />
                      </button>
                    </div>
                  </div>
                  <button
                    className="today-button"
                    onClick={() => selectDate(today)}
                  >
                    오늘
                  </button>
                </div>
                <div className="calendar-filters">
                  <div className="segment" aria-label="기록 종류">
                    {(["all", "event", "finance"] as const).map((value) => (
                      <button
                        key={value}
                        aria-pressed={type === value}
                        onClick={() => setType(value)}
                      >
                        {value === "all"
                          ? "전체"
                          : value === "event"
                            ? "일정"
                            : "가계부"}
                      </button>
                    ))}
                  </div>
                  <label className="scope-filter">
                    <span className="sr-only">공개 범위 필터</span>
                    <SelectField
                      compact
                      aria-label="공개 범위 필터"
                      value={scope}
                      onValueChange={(value) => setScope(value as typeof scope)}
                      options={[
                        { value: "all", label: "개인 + 공유" },
                        { value: "shared", label: "공유만" },
                        { value: "private", label: "나만 보기" },
                      ]}
                    />
                  </label>
                </div>
                <MonthCalendar
                  month={month}
                  selected={selected}
                  records={scene === "ready" ? filtered : []}
                  onSelect={selectDate}
                />
                <div className="calendar-legend">
                  <span>
                    <i className="kind-dot kind-event" />
                    일정
                  </span>
                  <span>
                    <i className="kind-dot kind-expense" />
                    지출
                  </span>
                  <span>
                    <i className="kind-dot kind-income" />
                    수입·환불
                  </span>
                  <span>
                    <ArrowLeftRight size={12} />
                    이체·납부
                  </span>
                </div>
              </section>
              <aside className="agenda-panel" aria-label="선택한 날짜의 기록">
                <div className="agenda-heading">
                  <div>
                    <p className={`eyebrow day-tone-${selectedDayInfo.tone}`}>
                      {weekdayLabel(selected)}
                      {selected === today ? " · 오늘" : ""}
                    </p>
                    <h2>{dateLabel(selected)}</h2>
                  </div>
                  <button
                    className="add-round"
                    aria-label={`${dateLabel(selected)} 기록 등록`}
                    onClick={openNew}
                  >
                    <Plus size={23} />
                  </button>
                </div>
                {selectedDayInfo.holiday && (
                  <div className="agenda-holiday" aria-live="polite">
                    <span>
                      {selectedDayInfo.holiday.substituteFor
                        ? "대체공휴일"
                        : "공휴일"}
                    </span>
                    <strong>{selectedDayInfo.holiday.name}</strong>
                  </div>
                )}
                {loadState ?? (
                  <>
                    <p className="agenda-count" aria-live="polite">
                      {daily.length}개의 기록
                    </p>
                    <div className="agenda-list" key={selected}>
                      {daily.length ? (
                        daily.map((record) => (
                          <RecordRow
                            record={record}
                            key={record.id}
                            onClick={() =>
                              setPanel({ kind: "record", id: record.id })
                            }
                          />
                        ))
                      ) : (
                        <EmptyState title="아직 기록이 없어요">
                          새로운 일정이나 가계부를
                          <br />이 날짜에 추가해 보세요.
                        </EmptyState>
                      )}
                    </div>
                    <button className="agenda-add" onClick={openNew}>
                      <Plus size={16} />이 날짜에 기록 추가
                    </button>
                  </>
                )}
              </aside>
            </div>
          ) : (
            (loadState ??
            (page === "accounts" ? (
              <Accounts
                key={actor}
                data={data}
                actor={actor}
                onAdd={() => setPanel({ kind: "account" })}
                onTransfer={() =>
                  setPanel({
                    kind: "entry",
                    draft: newDraft(selected, ownAccounts, "transfer"),
                  })
                }
                onPayment={(id) =>
                  setPanel({
                    kind: "entry",
                    draft: {
                      ...newDraft(selected, ownAccounts, "payment"),
                      toId: id,
                    },
                  })
                }
                onRecord={(id) => setPanel({ kind: "record", id })}
              />
            ) : (
              <Reports
                data={data}
                actor={actor}
                month={month}
                onMonth={changeMonth}
              />
            )))
          )}
        </main>
        <footer className="demo-footer">
          <span className="demo-indicator" />
          예시 데이터로 체험 중<span className="footer-divider">·</span>
          새로고침하면 초기화돼요.
          <span className="footer-detail">
            실제 저장·금융 연동·공유는 연결 전이에요.
          </span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="모바일 주요 메뉴">
        {renderNav()}
      </nav>
      <div
        className={`toast ${status ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </div>
      {panel?.kind === "entry" && (
        <RecordForm
          initial={panel.draft}
          accounts={ownAccounts}
          onClose={() => setPanel(null)}
          onSave={(draft) => {
            const next = saveRecord(data, draft, actor, crypto.randomUUID());
            simulateSave();
            setData(next);
            selectDate(draft.date);
            setType("all");
            setScope("all");
            setPage("calendar");
            changed();
          }}
        />
      )}
      {detail && (
        <RecordDetail
          record={detail}
          actor={actor}
          data={data}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel({ kind: "entry", draft: editDraft(detail) })}
          onRefund={() => {
            if (detail.kind === "expense")
              setPanel({
                kind: "entry",
                draft: {
                  ...newDraft(
                    detail.date > today ? detail.date : today,
                    ownAccounts,
                    "refund",
                  ),
                  title: `${detail.title} 환불`,
                  visibility: detail.visibility,
                  originalId: detail.id,
                },
              });
          }}
          onCancel={() => {
            const next = cancelRecord(data, detail.id, actor);
            if (failNext) {
              setFailNext(false);
              throw new InputError({
                form: "취소하지 못했어요. 다시 시도해 주세요.",
              });
            }
            setData(next);
            changed();
          }}
        />
      )}
      {panel?.kind === "account" && (
        <AccountForm
          accounts={ownAccounts}
          onClose={() => setPanel(null)}
          onSave={(draft) => {
            const next = addAccount(data, draft, actor, crypto.randomUUID());
            simulateSave();
            setData(next);
            changed();
          }}
        />
      )}
      {panel?.kind === "demo" && (
        <Modal
          title="미리보기 설정"
          onClose={() => {
            setPanel(null);
            setReset(null);
          }}
        >
          <div className="entry-form">
            <p className="notice">
              가상 인물과 예시 기록으로 화면을 확인할 수 있어요. 실제 로그인이나
              공유 기능은 아니에요.
            </p>
            <label className="field">
              보는 사람
              <SelectField
                aria-label="보는 사람"
                value={actor}
                onValueChange={(value) => {
                  setActor(value as Person);
                  setStatus("");
                }}
                options={[
                  { value: "jiwoo", label: "지우 · 나" },
                  { value: "haneul", label: "하늘 · 다른 멤버" },
                ]}
              />
            </label>
            <label className="field">
              화면 밝기
              <SelectField
                aria-label="화면 밝기"
                value={theme ?? "system"}
                onValueChange={setTheme}
                options={[
                  { value: "system", label: "시스템 설정 따르기" },
                  { value: "light", label: "따뜻한 라이트" },
                  { value: "dark", label: "따뜻한 다크" },
                ]}
              />
            </label>
            <label className="field">
              조회 상태
              <SelectField
                aria-label="조회 상태"
                value={scene}
                onValueChange={(value) => setScene(value as typeof scene)}
                options={[
                  { value: "ready", label: "정상" },
                  { value: "loading", label: "로딩" },
                  { value: "error", label: "오류" },
                ]}
              />
            </label>
            <label className="check-field">
              <input
                type="checkbox"
                checked={failNext}
                onChange={(e) => setFailNext(e.target.checked)}
              />
              다음 저장 한 번 실패시키기
            </label>
            <div className="button-row">
              <button onClick={() => setReset("seed")}>
                예시 데이터로 초기화
              </button>
              <button onClick={() => setReset("empty")}>
                빈 데이터로 초기화
              </button>
            </div>
            {reset && (
              <div className="discard-confirm">
                <p>지금까지 입력한 예시 기록을 초기화할까요?</p>
                <div className="button-row">
                  <button onClick={() => setReset(null)}>유지하기</button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      setData(
                        reset === "seed"
                          ? createDemo(today)
                          : { accounts: [], records: [] },
                      );
                      setReset(null);
                      setScene("ready");
                      setSelected(today);
                      setMonth(today.slice(0, 7));
                      setPage("calendar");
                      setType("all");
                      setScope("all");
                      setPanel(null);
                      setStatus("예시 데이터를 초기화했어요.");
                    }}
                  >
                    초기화
                  </button>
                </div>
              </div>
            )}
            <button
              className="primary-button full-width"
              onClick={() => {
                setPanel(null);
                setReset(null);
              }}
            >
              확인
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default App;
