export type Person = "jiwoo" | "haneul";
export type Visibility = "private" | "shared";
export type RecordKind =
  "event" | "expense" | "income" | "transfer" | "payment" | "refund";
export type AccountKind = "bank" | "cash" | "credit" | "debit";

export interface Account {
  id: string;
  owner: Person;
  name: string;
  kind: AccountKind;
  opening: string;
  linkedId?: string;
}
interface RecordBase {
  id: string;
  owner: Person;
  title: string;
  date: string;
  visibility: Visibility;
  note: string;
}
export interface Schedule extends RecordBase {
  kind: "event";
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
}
export interface Transaction extends RecordBase {
  kind: Exclude<RecordKind, "event">;
  amount: string;
  category: string;
  accountId?: string;
  fromId?: string;
  toId?: string;
  originalId?: string;
}
export type DayRecord = Schedule | Transaction;
export interface DemoData {
  accounts: Account[];
  records: DayRecord[];
}
export interface RecordDraft {
  id?: string;
  kind: RecordKind;
  title: string;
  date: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  visibility: Visibility;
  note: string;
  amount: string;
  category: string;
  accountId: string;
  fromId: string;
  toId: string;
  originalId?: string;
}
export type FieldErrors = Partial<
  Record<keyof RecordDraft | "form" | "name" | "opening" | "linkedId", string>
>;
export class InputError extends Error {
  fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super(Object.values(fields)[0] || "입력을 확인해 주세요.");
    this.fields = fields;
  }
}
export const people: Record<Person, string> = { jiwoo: "지우", haneul: "하늘" };
export const kindLabels: Record<RecordKind, string> = {
  event: "일정",
  expense: "지출",
  income: "수입",
  transfer: "이체",
  payment: "카드 납부",
  refund: "환불",
};
export const accountLabels: Record<AccountKind, string> = {
  bank: "은행 계좌",
  cash: "현금",
  credit: "신용카드",
  debit: "체크카드",
};
export const money = (amount: string | bigint) =>
  `${BigInt(amount).toLocaleString("ko-KR")}원`;
export const dateLabel = (date: string) =>
  `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`;
export function recordValue(record: DayRecord) {
  return record.kind === "event"
    ? record.allDay
      ? "종일"
      : record.startTime
    : `${record.kind === "expense" ? "−" : record.kind === "income" || record.kind === "refund" ? "+" : ""}${money(record.amount)}`;
}
export const weekdayLabel = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
export const todayInSeoul = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function validDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "1900-01-01" ||
    value > "2100-12-31"
  )
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function shiftMonth(month: string, direction: number) {
  return new Date(
    Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5)) - 1 + direction,
      1,
    ),
  )
    .toISOString()
    .slice(0, 7);
}
function lastScheduleDate(record: Schedule) {
  // All-day end dates are inclusive in the form; timed midnight is exclusive.
  return !record.allDay && record.endTime === "00:00"
    ? shiftDate(record.endDate, -1)
    : record.endDate;
}
export function onDate(record: DayRecord, date: string) {
  return record.kind === "event"
    ? record.date <= date && lastScheduleDate(record) >= date
    : record.date === date;
}
export function inMonth(record: DayRecord, month: string) {
  return record.kind === "event"
    ? record.date < `${shiftMonth(month, 1)}-01` &&
        lastScheduleDate(record) >= `${month}-01`
    : record.date.startsWith(month);
}
export function visibleRecords(data: DemoData, actor: Person): DayRecord[] {
  // This is a demo projection, not an authorization boundary. Real API responses must enforce it server-side.
  return data.records
    .filter(
      (record) => record.owner === actor || record.visibility === "shared",
    )
    .map((record) => {
      if (record.owner === actor || record.kind === "event") return record;
      const {
        accountId: _account,
        fromId: _from,
        toId: _to,
        originalId: _original,
        ...shared
      } = record;
      return shared;
    });
}
export function parseAmount(value: string, allowZero = false): string | null {
  const text = value.trim();
  if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(text)) return null;
  const amount = BigInt(text.replaceAll(",", ""));
  return amount >= (allowZero ? 0n : 1n) && amount <= 9999999999999n
    ? amount.toString()
    : null;
}
export function balances(data: DemoData): Map<string, bigint> {
  const result = new Map(
    data.accounts.map((account) => [account.id, BigInt(account.opening)]),
  );
  const account = (id?: string) => data.accounts.find((item) => item.id === id);
  const add = (id: string | undefined, amount: bigint) => {
    const target = account(id);
    const key = target?.kind === "debit" ? target.linkedId : target?.id;
    if (key) result.set(key, (result.get(key) ?? 0n) + amount);
  };
  for (const record of data.records) {
    if (record.kind === "event") continue;
    const amount = BigInt(record.amount);
    if (record.kind === "income") add(record.accountId, amount);
    if (record.kind === "expense")
      add(
        record.accountId,
        account(record.accountId)?.kind === "credit" ? amount : -amount,
      );
    if (record.kind === "refund")
      add(
        record.accountId,
        account(record.accountId)?.kind === "credit" ? -amount : amount,
      );
    if (record.kind === "transfer" || record.kind === "payment") {
      add(record.fromId, -amount);
      add(record.toId, record.kind === "payment" ? -amount : amount);
    }
  }
  for (const item of data.accounts.filter((item) => item.kind === "debit"))
    result.set(item.id, result.get(item.linkedId ?? "") ?? 0n);
  return result;
}
export function totals(records: DayRecord[]) {
  return records.reduce(
    (sum, record) => {
      if (record.kind === "income") sum.income += BigInt(record.amount);
      if (record.kind === "expense") sum.expense += BigInt(record.amount);
      if (record.kind === "refund") sum.expense -= BigInt(record.amount);
      return sum;
    },
    { income: 0n, expense: 0n },
  );
}
export function newDraft(
  date: string,
  accounts: Account[],
  kind: RecordKind = "event",
): RecordDraft {
  const asset =
    accounts.find(
      (account) => account.kind === "bank" || account.kind === "cash",
    )?.id ?? "";
  return {
    kind,
    date,
    endDate: date,
    title: "",
    allDay: false,
    startTime: "19:00",
    endTime: "20:30",
    amount: "",
    category: kind === "income" ? "급여" : "식비",
    accountId: asset,
    fromId: asset,
    toId: "",
    visibility: kind === "event" ? "shared" : "private",
    note: "",
  };
}
export function editDraft(record: DayRecord): RecordDraft {
  return { ...newDraft(record.date, []), ...record };
}
export function remainingRefund(data: DemoData, record: Transaction) {
  return (
    BigInt(record.amount) -
    data.records.reduce(
      (sum, other) =>
        sum +
        (other.kind === "refund" && other.originalId === record.id
          ? BigInt(other.amount)
          : 0n),
      0n,
    )
  );
}

export function saveRecord(
  data: DemoData,
  draft: RecordDraft,
  actor: Person,
  id: string,
): DemoData {
  const errors: FieldErrors = {};
  const existing = data.records.find((record) => record.id === draft.id);
  if (draft.id && (!existing || existing.owner !== actor))
    throw new InputError({ form: "본인의 기록만 수정할 수 있어요." });
  if (!draft.id && data.records.some((record) => record.id === id))
    throw new InputError({ form: "이미 저장된 기록이에요." });
  if (!draft.title.trim()) errors.title = "제목을 입력해 주세요.";
  if (draft.title.trim().length > 80)
    errors.title = "제목은 80자 이내로 입력해 주세요.";
  if (draft.note.length > 1000)
    errors.note = "메모는 1,000자 이내로 입력해 주세요.";
  if (!validDate(draft.date))
    errors.date = "1900~2100년의 올바른 날짜를 입력해 주세요.";
  if (!["private", "shared"].includes(draft.visibility))
    errors.visibility = "공개 범위를 선택해 주세요.";
  const base: RecordBase = {
    id: draft.id ?? id,
    owner: actor,
    title: draft.title.trim(),
    date: draft.date,
    visibility: draft.visibility,
    note: draft.note.trim(),
  };
  let next: DayRecord;
  if (draft.kind === "event") {
    if (!validDate(draft.endDate) || draft.endDate < draft.date)
      errors.endDate = "종료일은 시작일 이후여야 해요.";
    if (
      !draft.allDay &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.endTime) ||
        `${draft.endDate}T${draft.endTime}` <=
          `${draft.date}T${draft.startTime}`)
    )
      errors.endTime = "종료 시간을 시작 시간 이후로 설정해 주세요.";
    next = {
      ...base,
      kind: "event",
      endDate: draft.endDate,
      allDay: draft.allDay,
      startTime: draft.startTime,
      endTime: draft.endTime,
    };
  } else {
    const amount = parseAmount(draft.amount);
    if (amount === null)
      errors.amount =
        "금액은 1원 이상 9,999,999,999,999원 이하의 정수로 입력해 주세요.";
    const own = (key: string) =>
      data.accounts.find(
        (account) => account.id === key && account.owner === actor,
      );
    const asset = (key: string) =>
      ["bank", "cash"].includes(own(key)?.kind ?? "");
    if (draft.kind === "expense" && !own(draft.accountId))
      errors.accountId = "결제 수단을 선택해 주세요.";
    if (draft.kind === "income" && !asset(draft.accountId))
      errors.accountId = "수입을 받을 현금·은행 계좌를 선택해 주세요.";
    if (draft.kind === "transfer" || draft.kind === "payment") {
      if (!asset(draft.fromId))
        errors.fromId = "보내는 현금·은행 계좌를 선택해 주세요.";
      if (draft.fromId === draft.toId)
        errors.toId = "서로 다른 계좌를 선택해 주세요.";
      else if (draft.kind === "transfer" && !asset(draft.toId))
        errors.toId = "받는 현금·은행 계좌를 선택해 주세요.";
      else if (draft.kind === "payment" && own(draft.toId)?.kind !== "credit")
        errors.toId = "납부할 신용카드를 선택해 주세요.";
    }
    if (["income", "expense"].includes(draft.kind) && !draft.category.trim())
      errors.category = "분류를 입력해 주세요.";
    next = {
      ...base,
      kind: draft.kind,
      amount: amount ?? "0",
      category: draft.category.trim(),
    };
    if (draft.kind === "income" || draft.kind === "expense")
      next.accountId = draft.accountId;
    if (draft.kind === "transfer" || draft.kind === "payment") {
      next.fromId = draft.fromId;
      next.toId = draft.toId;
      next.category = "";
    }
    if (draft.kind === "refund") {
      const original = data.records.find(
        (record) =>
          record.id === draft.originalId &&
          record.kind === "expense" &&
          record.owner === actor,
      );
      if (!original || original.kind !== "expense")
        errors.form = "환불할 지출을 찾을 수 없어요.";
      else {
        const remaining = remainingRefund(
          {
            ...data,
            records: data.records.filter((record) => record.id !== draft.id),
          },
          original,
        );
        if (amount !== null && BigInt(amount) > remaining)
          errors.amount = `환불 가능한 금액은 ${money(remaining)}이에요.`;
        if (draft.date < original.date)
          errors.date = "환불일은 원거래 날짜 이후여야 해요.";
        next.accountId = original.accountId;
        next.category = original.category;
        next.originalId = original.id;
      }
    }
  }
  if (existing) {
    if (existing.kind !== next.kind)
      errors.form = "기존 기록의 종류는 바꿀 수 없어요.";
    const refunds = data.records.filter(
      (record): record is Transaction =>
        record.kind === "refund" && record.originalId === existing.id,
    );
    if (
      refunds.length &&
      (next.kind !== "expense" ||
        existing.kind !== "expense" ||
        next.accountId !== existing.accountId ||
        next.category !== existing.category ||
        next.date !== existing.date ||
        BigInt(next.amount) <
          refunds.reduce((sum, record) => sum + BigInt(record.amount), 0n))
    )
      errors.form =
        "연결된 환불을 먼저 취소한 뒤 결제 수단·날짜·분류·금액을 변경해 주세요.";
  }
  if (Object.keys(errors).length) throw new InputError(errors);
  return {
    ...data,
    records: existing
      ? data.records.map((record) => (record.id === next.id ? next : record))
      : [...data.records, next],
  };
}
export function cancelRecord(
  data: DemoData,
  id: string,
  actor: Person,
): DemoData {
  const record = data.records.find(
    (item) => item.id === id && item.owner === actor,
  );
  if (!record)
    throw new InputError({ form: "본인의 기록만 취소할 수 있어요." });
  if (
    data.records.some(
      (item) => item.kind === "refund" && item.originalId === id,
    )
  )
    throw new InputError({ form: "연결된 환불 기록을 먼저 취소해 주세요." });
  // In-memory demo only. The production ledger will retain correction/reversal history.
  return { ...data, records: data.records.filter((item) => item.id !== id) };
}
export function addAccount(
  data: DemoData,
  draft: Omit<Account, "id" | "owner">,
  actor: Person,
  id: string,
): DemoData {
  const errors: FieldErrors = {};
  const opening = parseAmount(draft.opening, true);
  if (!draft.name.trim() || draft.name.trim().length > 40)
    errors.name = "별칭을 1~40자로 입력해 주세요.";
  if (draft.kind !== "debit" && opening === null)
    errors.opening = "시작 금액은 0원 이상의 정수로 입력해 주세요.";
  if (
    draft.kind === "debit" &&
    !data.accounts.some(
      (item) =>
        item.id === draft.linkedId &&
        item.owner === actor &&
        item.kind === "bank",
    )
  )
    errors.linkedId = "본인의 은행 계좌를 연결해 주세요.";
  if (data.accounts.some((item) => item.id === id))
    errors.form = "이미 추가된 계정이에요.";
  if (Object.keys(errors).length) throw new InputError(errors);
  return {
    ...data,
    accounts: [
      ...data.accounts,
      {
        ...draft,
        id,
        owner: actor,
        name: draft.name.trim(),
        opening: draft.kind === "debit" ? "0" : opening!,
        linkedId: draft.kind === "debit" ? draft.linkedId : undefined,
      },
    ],
  };
}
