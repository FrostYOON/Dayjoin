import { useState } from "react";
import { inMonth, money, totals, type DemoData, type Person } from "./model.ts";
import { EmptyState } from "./ui.tsx";

export function Reports({
  data,
  actor,
  month,
  onMonth,
}: {
  data: DemoData;
  actor: Person;
  month: string;
  onMonth: (month: string) => void;
}) {
  const [scope, setScope] = useState<"mine" | "shared">("mine");
  const records = data.records.filter(
    (record) =>
      record.kind !== "event" &&
      inMonth(record, month) &&
      (scope === "mine"
        ? record.owner === actor
        : record.visibility === "shared"),
  );
  const sums = totals(records);
  const categories = new Map<string, bigint>();
  for (const record of records)
    if (record.kind === "expense" || record.kind === "refund")
      categories.set(
        record.category,
        (categories.get(record.category) ?? 0n) +
          BigInt(record.amount) * (record.kind === "refund" ? -1n : 1n),
      );
  const maximum = [...categories.values()].reduce(
    (max, value) => (value > max ? value : max),
    1n,
  );
  return (
    <section className="finance-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">돈의 흐름을 한눈에</p>
          <h2>월 합계</h2>
        </div>
        <label className="month-input">
          조회 월
          <input
            type="month"
            min="1900-01"
            max="2100-12"
            value={month}
            onChange={(e) => onMonth(e.target.value)}
          />
        </label>
      </div>
      <div className="segment report-segment">
        <button
          aria-pressed={scope === "mine"}
          onClick={() => setScope("mine")}
        >
          내 장부
        </button>
        <button
          aria-pressed={scope === "shared"}
          onClick={() => setScope("shared")}
        >
          공유 캘린더
        </button>
      </div>
      <p className="help">
        {scope === "mine"
          ? "내가 작성한 개인·공유 거래를 모두 합산해요."
          : "우리 둘에 공유된 거래만 합산해요. 개인 잔액과는 별개예요."}
      </p>
      <div className="balance-summary">
        <div>
          <p>수입</p>
          <strong>{money(sums.income)}</strong>
        </div>
        <div>
          <p>순지출</p>
          <strong>{money(sums.expense)}</strong>
        </div>
      </div>
      <p className="help">
        환불은 순지출에서 차감 · 이체와 카드 납부는 합계에서 제외
      </p>
      <h3 className="section-title">분류별 순지출</h3>
      {categories.size ? (
        [...categories]
          .sort((a, b) => (a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1))
          .map(([category, amount]) => (
            <div className="category-row" key={category}>
              <div>
                <span>{category}</span>
                <strong>{money(amount)}</strong>
              </div>
              <div className="category-track" aria-hidden="true">
                <span
                  style={{
                    width: `${amount > 0n ? Number((amount * 100n) / maximum) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))
      ) : (
        <EmptyState title="이 달의 지출이 없어요">
          지출을 등록하면 분류별로 확인할 수 있어요.
        </EmptyState>
      )}
    </section>
  );
}
