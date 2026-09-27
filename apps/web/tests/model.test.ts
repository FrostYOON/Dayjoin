import test from "node:test";
import assert from "node:assert/strict";
import {
  addAccount,
  balances,
  cancelRecord,
  editDraft,
  inMonth,
  InputError,
  newDraft,
  onDate,
  parseAmount,
  remainingRefund,
  saveRecord,
  shiftDate,
  shiftMonth,
  totals,
  validDate,
  visibleRecords,
  type DemoData,
  type RecordDraft,
  type Transaction,
} from "../src/features/dayjoin/model.ts";
import { createDemo } from "../src/features/dayjoin/seed.ts";

const fixture = () => createDemo("2026-09-26");
const ownTotals = (data: DemoData) =>
  totals(data.records.filter((record) => record.owner === "jiwoo"));
function draft(
  data: DemoData,
  changes: Partial<RecordDraft> = {},
): RecordDraft {
  return {
    ...newDraft(
      "2026-09-26",
      data.accounts.filter((a) => a.owner === "jiwoo"),
      "expense",
    ),
    title: "검증용 기록",
    amount: "10000",
    ...changes,
  };
}
function expense(data: DemoData) {
  return data.records.find((r) => r.id === "dinner-cost") as Transaction;
}
function refund(data: DemoData, amount = "10000", id = "refund") {
  return saveRecord(
    data,
    draft(data, { kind: "refund", originalId: "dinner-cost", amount }),
    "jiwoo",
    id,
  );
}

test("금액은 정수·올바른 천 단위 구분만 허용하고 한도까지 정확히 보존한다", () => {
  assert.equal(parseAmount(" 12,345 "), "12345");
  assert.equal(parseAmount("9,999,999,999,999"), "9999999999999");
  assert.equal(parseAmount("0", true), "0");
  for (const input of [
    "0",
    "-1",
    "1.5",
    "1e3",
    "01",
    "1,00",
    "1,0000",
    "10 000",
    "",
    "10000000000000",
  ])
    assert.equal(parseAmount(input), null, input);
});
test("윤년·월말·연말 날짜 경계와 잘못된 날짜를 구분한다", () => {
  assert.equal(validDate("2024-02-29"), true);
  for (const value of [
    "2026-02-29",
    "2026-04-31",
    "1899-12-31",
    "2101-01-01",
    "2026-9-1",
  ])
    assert.equal(validDate(value), false);
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDate("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});
test("월을 넘는 종일 여행은 양쪽 달과 마지막 날에 표시한다", () => {
  const travel = fixture().records.find((r) => r.id === "travel")!;
  assert.equal(inMonth(travel, "2026-09"), true);
  assert.equal(inMonth(travel, "2026-10"), true);
  assert.equal(onDate(travel, "2026-10-02"), true);
  assert.equal(onDate(travel, "2026-10-03"), false);
  assert.equal(inMonth(travel, "2026-11"), false);
});
test("예시 잔액은 체크카드 연결 계좌에 반영하고 카드 결제는 부채로 계산한다", () => {
  const data = fixture(),
    result = balances(data);
  assert.equal(result.get("bank"), 3450000n);
  assert.equal(result.get("debit"), 3450000n);
  assert.equal(result.get("trip"), 320000n);
  assert.equal(result.get("cash"), 50000n);
  assert.equal(result.get("credit"), 60000n);
  assert.equal(result.get("other-bank"), 183000n);
  assert.deepEqual(ownTotals(data), { income: 2500000n, expense: 90000n });
});
test("이체는 두 자산을 이동하고 수입·지출 합계에는 더하지 않는다", () => {
  const data = fixture();
  const next = saveRecord(
    data,
    draft(data, { kind: "transfer", fromId: "bank", toId: "trip" }),
    "jiwoo",
    "new-transfer",
  );
  assert.equal(balances(next).get("bank"), 3440000n);
  assert.equal(balances(next).get("trip"), 330000n);
  assert.deepEqual(ownTotals(next), ownTotals(data));
});
test("신용카드 납부는 계좌·부채를 줄이고 지출을 중복 집계하지 않는다", () => {
  const data = fixture();
  const next = saveRecord(
    data,
    draft(data, {
      kind: "payment",
      amount: "60000",
      fromId: "bank",
      toId: "credit",
    }),
    "jiwoo",
    "payment",
  );
  assert.equal(balances(next).get("bank"), 3390000n);
  assert.equal(balances(next).get("credit"), 0n);
  assert.deepEqual(ownTotals(next), ownTotals(data));
  const returned = refund(next);
  assert.equal(balances(returned).get("credit"), -10000n);
  assert.deepEqual(ownTotals(returned), { income: 2500000n, expense: 80000n });
});
test("체크카드 지출·환불은 연결 계좌를 증감한다", () => {
  const data = fixture();
  const next = saveRecord(
    data,
    draft(data, { amount: "15000", accountId: "debit" }),
    "jiwoo",
    "debit-expense",
  );
  assert.equal(balances(next).get("bank"), 3435000n);
  const returned = saveRecord(
    next,
    draft(next, {
      kind: "refund",
      originalId: "debit-expense",
      amount: "15000",
    }),
    "jiwoo",
    "debit-refund",
  );
  assert.equal(balances(returned).get("bank"), 3450000n);
  assert.equal(balances(returned).get("credit"), 60000n);
});
test("부분 환불 한도는 누적 계산하고 수정할 때 기존 환불을 이중 차감하지 않는다", () => {
  const data = refund(fixture());
  assert.equal(remainingRefund(data, expense(data)), 50000n);
  assert.throws(() => refund(data, "50001", "too-much"), InputError);
  const current = data.records.find((r) => r.id === "refund")!;
  const edited = saveRecord(
    data,
    { ...editDraft(current), amount: "60000" },
    "jiwoo",
    "ignored",
  );
  assert.equal(remainingRefund(edited, expense(edited)), 0n);
  assert.equal(balances(edited).get("credit"), 0n);
  assert.throws(
    () =>
      saveRecord(
        data,
        draft(data, {
          kind: "refund",
          originalId: "dinner-cost",
          date: "2026-09-25",
        }),
        "jiwoo",
        "early",
      ),
    InputError,
  );
});
test("환불은 원거래의 계좌·분류를 사용하며 연결된 원거래 취소·위험한 수정을 막는다", () => {
  const data = refund(fixture());
  const current = data.records.find((r) => r.id === "refund") as Transaction;
  assert.equal(current.accountId, "credit");
  assert.equal(current.category, "식비");
  assert.throws(() => cancelRecord(data, "dinner-cost", "jiwoo"), InputError);
  for (const changes of [
    { amount: "9999" },
    { accountId: "bank" },
    { category: "쇼핑" },
    { date: "2026-09-27" },
  ]) {
    assert.throws(
      () =>
        saveRecord(
          data,
          { ...editDraft(expense(data)), ...changes },
          "jiwoo",
          "ignored",
        ),
      InputError,
    );
  }
  const restored = cancelRecord(
    cancelRecord(data, "refund", "jiwoo"),
    "dinner-cost",
    "jiwoo",
  );
  assert.equal(balances(restored).get("credit"), 0n);
});
test("가계부 수단은 소유자와 거래 종류를 검증한다", () => {
  const data = fixture();
  for (const changes of [
    { accountId: "other-bank" },
    { kind: "income" as const, accountId: "credit" },
    { kind: "transfer" as const, fromId: "bank", toId: "bank" },
    { kind: "transfer" as const, fromId: "bank", toId: "credit" },
    { kind: "payment" as const, fromId: "credit", toId: "bank" },
    { kind: "refund" as const, originalId: "cafe" },
  ])
    assert.throws(
      () => saveRecord(data, draft(data, changes), "jiwoo", "invalid"),
      InputError,
    );
});
test("시작 잔액은 수입이 아니며 체크카드는 본인 은행에만 연결한다", () => {
  const data = fixture();
  const next = addAccount(
    data,
    { name: "새 통장", kind: "bank", opening: "50,000" },
    "jiwoo",
    "new-bank",
  );
  assert.equal(balances(next).get("new-bank"), 50000n);
  assert.deepEqual(ownTotals(next), ownTotals(data));
  assert.throws(
    () =>
      addAccount(
        data,
        {
          name: "잘못된 연결",
          kind: "debit",
          opening: "0",
          linkedId: "other-bank",
        },
        "jiwoo",
        "bad",
      ),
    InputError,
  );
});
test("다른 멤버의 개인 기록과 공유 거래의 개인 계좌 식별자를 숨긴다", () => {
  const data = fixture(),
    mine = visibleRecords(data, "jiwoo"),
    theirs = visibleRecords(data, "haneul");
  assert.equal(
    mine.some((r) => r.id === "snack"),
    false,
  );
  assert.equal(
    theirs.some((r) => ["gift", "salary", "transfer"].includes(r.id)),
    false,
  );
  const shared = theirs.find((r) => r.id === "dinner-cost")!;
  for (const key of ["accountId", "fromId", "toId", "originalId"])
    assert.equal(key in shared, false);
  assert.equal(
    totals(mine.filter((r) => r.visibility === "shared")).expense,
    72000n,
  );
  assert.equal(expense(data).accountId, "credit");
});
test("공개 범위 변경은 상대방 가시성에만 적용하고 본인 잔액을 유지한다", () => {
  const data = fixture();
  const next = saveRecord(
    data,
    { ...editDraft(expense(data)), visibility: "private" },
    "jiwoo",
    "ignored",
  );
  assert.equal(
    visibleRecords(next, "haneul").some((r) => r.id === "dinner-cost"),
    false,
  );
  assert.deepEqual(balances(next), balances(data));
});
test("다른 멤버 기록의 수정·취소와 중복 등록은 거절한다", () => {
  const data = fixture(),
    foreign = data.records.find((r) => r.id === "cafe")!;
  assert.throws(
    () => saveRecord(data, editDraft(foreign), "jiwoo", "ignored"),
    InputError,
  );
  assert.throws(() => cancelRecord(data, foreign.id, "jiwoo"), InputError);
  assert.throws(
    () => saveRecord(data, draft(data), "jiwoo", "gift"),
    InputError,
  );
});
test("취소 시 잔액과 합계가 복구되고 입력 오류는 기존 상태를 바꾸지 않는다", () => {
  const data = fixture(),
    before = structuredClone(data);
  assert.throws(
    () => saveRecord(data, draft(data, { amount: "1,00" }), "jiwoo", "bad"),
    InputError,
  );
  assert.deepEqual(data, before);
  const next = cancelRecord(data, "gift", "jiwoo");
  assert.equal(balances(next).get("bank"), 3480000n);
  assert.equal(ownTotals(next).expense, 60000n);
  assert.deepEqual(data, before);
});
test("제목·종료일·종료 시간과 기존 기록 종류의 변경을 검증한다", () => {
  const data = fixture();
  for (const changes of [
    { title: " " },
    { title: "가".repeat(81) },
    { kind: "event" as const, endDate: "2026-09-25" },
    { kind: "event" as const, endTime: "18:00" },
    { date: "2026-02-30" },
  ]) {
    assert.throws(
      () => saveRecord(data, draft(data, changes), "jiwoo", "invalid"),
      InputError,
    );
  }
  assert.throws(
    () =>
      saveRecord(
        data,
        { ...editDraft(expense(data)), kind: "income" },
        "jiwoo",
        "ignored",
      ),
    InputError,
  );
});

test("시간 일정의 자정 종료는 다음 날짜·월에 남지 않는다", () => {
  const data = fixture();
  const next = saveRecord(
    data,
    draft(data, {
      kind: "event",
      date: "2026-09-30",
      endDate: "2026-10-01",
      startTime: "23:00",
      endTime: "00:00",
    }),
    "jiwoo",
    "midnight",
  );
  const record = next.records.find((r) => r.id === "midnight")!;
  assert.equal(onDate(record, "2026-09-30"), true);
  assert.equal(onDate(record, "2026-10-01"), false);
  assert.equal(inMonth(record, "2026-10"), false);
});
