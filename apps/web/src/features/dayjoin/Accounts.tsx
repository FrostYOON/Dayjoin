import { useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronRight,
  CreditCard,
  Landmark,
  Plus,
  Wallet,
} from "lucide-react";
import {
  accountLabels,
  balances,
  InputError,
  money,
  type Account,
  type AccountKind,
  type DemoData,
  type FieldErrors,
  type Person,
} from "./model.ts";
import { EmptyState, Modal, RecordRow } from "./ui.tsx";
import { SelectField } from "./SelectField.tsx";

export function Accounts({
  data,
  actor,
  onAdd,
  onTransfer,
  onPayment,
  onRecord,
}: {
  data: DemoData;
  actor: Person;
  onAdd: () => void;
  onTransfer: () => void;
  onPayment: (id: string) => void;
  onRecord: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const accounts = data.accounts.filter((account) => account.owner === actor);
  const values = balances(data);
  const chosen = accounts.find((account) => account.id === selected);
  const available = accounts
    .filter((account) => ["bank", "cash"].includes(account.kind))
    .reduce((sum, account) => sum + (values.get(account.id) ?? 0n), 0n);
  const debt = accounts
    .filter((account) => account.kind === "credit")
    .reduce(
      (sum, account) =>
        sum +
        ((values.get(account.id) ?? 0n) > 0n ? values.get(account.id)! : 0n),
      0n,
    );
  if (chosen) {
    const related = data.records.filter(
      (record) =>
        record.owner === actor &&
        record.kind !== "event" &&
        (record.accountId === chosen.id ||
          record.fromId === chosen.id ||
          record.toId === chosen.id ||
          data.accounts.some(
            (account) =>
              account.id === record.accountId &&
              account.kind === "debit" &&
              account.linkedId === chosen.id,
          )),
    );
    const balance = values.get(chosen.id) ?? 0n;
    return (
      <section className="finance-page">
        <button className="text-button" onClick={() => setSelected(null)}>
          <ArrowLeft size={17} />
          계좌·카드
        </button>
        <p className="eyebrow">{accountLabels[chosen.kind]} · 나만 보기</p>
        <h2>{chosen.name}</h2>
        <p className="balance-heading">
          {chosen.kind === "credit"
            ? balance < 0n
              ? "선납금"
              : "미납금"
            : chosen.kind === "debit"
              ? "연결 계좌 잔액"
              : "잔액"}
        </p>
        <p className="large-amount">
          {money(chosen.kind === "credit" && balance < 0n ? -balance : balance)}
        </p>
        {chosen.kind === "debit" && (
          <p className="help">
            {accounts.find((account) => account.id === chosen.linkedId)?.name}에
            연결되어 있어요.
          </p>
        )}
        {chosen.kind === "credit" && (
          <button
            className="primary-button"
            onClick={() => onPayment(chosen.id)}
          >
            카드 대금 납부 기록
          </button>
        )}
        <h3 className="section-title">
          관련 내역 <span>{related.length}</span>
        </h3>
        {related.length ? (
          related
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((record) => (
              <RecordRow
                key={record.id}
                record={record}
                onClick={() => onRecord(record.id)}
              />
            ))
        ) : (
          <EmptyState title="아직 거래가 없어요">
            새 기록을 추가하면 여기에 표시돼요.
          </EmptyState>
        )}
      </section>
    );
  }
  return (
    <section className="finance-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">나만 보는 금융 정보</p>
          <h2>계좌·카드</h2>
        </div>
        <button onClick={onAdd} className="primary-button">
          <Plus size={17} />
          추가
        </button>
      </div>
      <div className="balance-summary">
        <div>
          <p>현금·은행 잔액</p>
          <strong>{money(available)}</strong>
        </div>
        <div>
          <p>카드 미납금</p>
          <strong>{money(debt)}</strong>
        </div>
      </div>
      <p className="help">
        등록된 모든 거래 기준 · 체크카드 잔액은 연결 계좌에 포함돼요.
      </p>
      <div className="section-heading">
        <h3>
          내 계정 <span className="muted">{accounts.length}</span>
        </h3>
        <button className="text-button" onClick={onTransfer}>
          <ArrowLeftRight size={17} />
          이체 기록
        </button>
      </div>
      {accounts.length ? (
        accounts.map((account) => {
          const Icon = ["credit", "debit"].includes(account.kind)
            ? CreditCard
            : account.kind === "cash"
              ? Wallet
              : Landmark;
          const value = values.get(account.id) ?? 0n;
          return (
            <button
              className="account-row"
              key={account.id}
              onClick={() => setSelected(account.id)}
            >
              <span className={`account-icon account-${account.kind}`}>
                <Icon size={21} />
              </span>
              <span className="account-body">
                <strong>{account.name}</strong>
                <small>
                  {accountLabels[account.kind]}
                  {account.kind === "debit" ? " · 연결 계좌" : ""}
                  {account.kind === "credit"
                    ? value < 0n
                      ? " · 선납"
                      : " · 미납"
                    : ""}
                </small>
              </span>
              <strong className="account-value">
                {money(
                  account.kind === "credit" && value < 0n ? -value : value,
                )}
              </strong>
              <ChevronRight size={17} />
            </button>
          );
        })
      ) : (
        <EmptyState title="첫 계좌를 추가해 주세요">
          은행 계좌, 현금, 신용카드와 체크카드를 관리할 수 있어요.
        </EmptyState>
      )}
      <p className="notice">
        계좌 정보는 나만 볼 수 있어요. 공유 캘린더에는 선택한 거래 내용만
        표시돼요.
      </p>
    </section>
  );
}

type AccountDraft = Omit<Account, "id" | "owner">;
export function AccountForm({
  accounts,
  onSave,
  onClose,
}: {
  accounts: Account[];
  onSave: (draft: AccountDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AccountDraft>({
    name: "",
    kind: "bank",
    opening: "0",
    linkedId: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [discard, setDiscard] = useState(false);
  const close = () =>
    draft.name || draft.opening !== "0" || draft.linkedId
      ? setDiscard(true)
      : onClose();
  const fieldError = (name: keyof FieldErrors) =>
    errors[name] && <span className="field-error">{errors[name]}</span>;
  return (
    <Modal title="계좌·카드 추가" onClose={close}>
      <form
        className="entry-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(draft);
          } catch (error) {
            setErrors(
              error instanceof InputError
                ? error.fields
                : {
                    form: "추가하지 못했어요. 입력 내용을 유지했어요. 다시 시도해 주세요.",
                  },
            );
          }
        }}
      >
        <label className="field">
          종류
          <SelectField
            aria-label="종류"
            value={draft.kind}
            onValueChange={(value) =>
              setDraft({ ...draft, kind: value as AccountKind })
            }
            options={Object.entries(accountLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </label>
        <label className="field">
          별칭
          <input
            autoFocus
            value={draft.name}
            maxLength={40}
            placeholder="예: 생활 통장"
            aria-invalid={!!errors.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          {fieldError("name")}
        </label>
        {draft.kind === "debit" ? (
          <label className="field">
            연결할 은행 계좌
            <SelectField
              aria-label="연결할 은행 계좌"
              value={draft.linkedId ?? ""}
              aria-invalid={!!errors.linkedId}
              onValueChange={(value) => setDraft({ ...draft, linkedId: value })}
              options={accounts
                .filter((account) => account.kind === "bank")
                .map((account) => ({ value: account.id, label: account.name }))}
            />
            {fieldError("linkedId")}
          </label>
        ) : (
          <label className="field">
            {draft.kind === "credit" ? "시작 미납금 · 원" : "시작 잔액 · 원"}
            <input
              inputMode="numeric"
              value={draft.opening}
              aria-invalid={!!errors.opening}
              onChange={(e) => setDraft({ ...draft, opening: e.target.value })}
            />
            {fieldError("opening")}
          </label>
        )}
        <p className="help">
          {draft.kind === "debit"
            ? "체크카드 사용액은 연결한 은행 계좌에서 차감해요."
            : "기록을 시작하는 시점의 금액이에요. 수입·지출에 포함되지 않아요."}
        </p>
        <p className="notice">
          실제 계좌번호나 카드번호 없이 별칭만 입력해 주세요.
        </p>
        {Object.keys(errors).length > 0 && (
          <p className="form-error" role="alert">
            {errors.form ?? "표시된 입력 항목을 확인해 주세요."}
          </p>
        )}
        {discard && (
          <div className="discard-confirm">
            <p>작성 중인 내용을 버릴까요?</p>
            <div className="button-row">
              <button
                type="button"
                ref={(element) => {
                  element?.focus();
                }}
                onClick={() => setDiscard(false)}
              >
                계속 작성
              </button>
              <button type="button" className="danger-button" onClick={onClose}>
                버리고 닫기
              </button>
            </div>
          </div>
        )}
        <footer className="form-footer">
          <button type="button" onClick={close}>
            취소
          </button>
          <button className="primary-button" type="submit">
            추가하기
          </button>
        </footer>
      </form>
    </Modal>
  );
}
