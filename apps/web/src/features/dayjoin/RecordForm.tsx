import { useId, useState, type ReactNode } from "react";
import { LockKeyhole, Users } from "lucide-react";
import {
  accountLabels,
  InputError,
  kindLabels,
  type Account,
  type FieldErrors,
  type RecordDraft,
  type RecordKind,
} from "./model.ts";
import { Modal } from "./ui.tsx";
import { SelectField } from "./SelectField.tsx";

interface Props {
  initial: RecordDraft;
  accounts: Account[];
  onSave: (draft: RecordDraft) => void;
  onClose: () => void;
}
export function RecordForm({ initial, accounts, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [discard, setDiscard] = useState(false);
  const prefix = useId();
  const changed = JSON.stringify(initial) !== JSON.stringify(draft);
  const close = () => (changed ? setDiscard(true) : onClose());
  const patch = (change: Partial<RecordDraft>) => {
    setDraft((current) => ({ ...current, ...change }));
    setErrors({});
  };
  const event = draft.kind === "event";
  const transfer = draft.kind === "transfer" || draft.kind === "payment";
  const assets = accounts.filter((account) =>
    ["bank", "cash"].includes(account.kind),
  );
  const field = (
    name: keyof RecordDraft,
    label: string,
    control: ReactNode,
  ) => (
    <label className="field" htmlFor={`${prefix}-${name}`}>
      <span>{label}</span>
      {control}
      {errors[name] && (
        <span className="field-error" id={`${prefix}-${name}-error`}>
          {errors[name]}
        </span>
      )}
    </label>
  );
  const attributes = (name: keyof RecordDraft) => ({
    id: `${prefix}-${name}`,
    name,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${prefix}-${name}-error` : undefined,
  });
  const input = (
    name:
      | "title"
      | "date"
      | "endDate"
      | "startTime"
      | "endTime"
      | "amount"
      | "category",
    label: string,
    type = "text",
  ) =>
    field(
      name,
      label,
      <input
        {...attributes(name)}
        type={type}
        value={draft[name]}
        onChange={(e) => patch({ [name]: e.target.value })}
        maxLength={name === "title" ? 80 : name === "category" ? 30 : undefined}
        inputMode={name === "amount" ? "numeric" : undefined}
        min={type === "date" ? "1900-01-01" : undefined}
        max={type === "date" ? "2100-12-31" : undefined}
        autoFocus={name === "title"}
        placeholder={
          name === "title"
            ? event
              ? "어떤 일정인가요?"
              : "어떤 내역인가요?"
            : name === "amount"
              ? "0"
              : undefined
        }
      />,
    );
  const accountField = (
    name: "accountId" | "fromId" | "toId",
    label: string,
    choices: Account[],
  ) =>
    field(
      name,
      label,
      <SelectField
        {...attributes(name)}
        aria-label={label}
        value={draft[name]}
        onValueChange={(value) => patch({ [name]: value })}
        options={choices.map((account) => ({
          value: account.id,
          label: `${account.name} · ${accountLabels[account.kind]}`,
        }))}
      />,
    );
  const chooseKind = (kind: RecordKind) =>
    patch({
      kind,
      visibility: kind === "event" ? "shared" : "private",
      category: kind === "income" ? "급여" : "식비",
      toId: "",
    });
  return (
    <Modal
      title={
        initial.id
          ? "기록 수정"
          : draft.kind === "refund"
            ? "환불 기록"
            : "새 기록"
      }
      onClose={close}
    >
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
                    form: "저장하지 못했어요. 입력 내용은 유지했어요. 다시 시도해 주세요.",
                  },
            );
          }
        }}
      >
        {!initial.id && draft.kind !== "refund" && (
          <div className="segment" aria-label="등록 유형">
            <button
              type="button"
              aria-pressed={event}
              onClick={() => chooseKind("event")}
            >
              일정
            </button>
            <button
              type="button"
              aria-pressed={!event}
              onClick={() => chooseKind("expense")}
            >
              가계부
            </button>
          </div>
        )}
        {!event &&
          !initial.id &&
          draft.kind !== "refund" &&
          field(
            "kind",
            "거래 종류",
            <SelectField
              {...attributes("kind")}
              aria-label="거래 종류"
              value={draft.kind}
              onValueChange={(value) => chooseKind(value as RecordKind)}
              options={(
                ["expense", "income", "transfer", "payment"] as const
              ).map((kind) => ({ value: kind, label: kindLabels[kind] }))}
            />,
          )}
        {input("title", event ? "일정 제목" : "내역 이름")}
        {!event && input("amount", "금액 · 원")}
        {event ? (
          <>
            <label className="check-field">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) => patch({ allDay: e.target.checked })}
              />
              종일 일정
            </label>
            <div className="form-columns">
              {input("date", "시작 날짜", "date")}
              {input("endDate", "종료 날짜", "date")}
            </div>
            {!draft.allDay && (
              <div className="form-columns">
                {input("startTime", "시작 시간", "time")}
                {input("endTime", "종료 시간", "time")}
              </div>
            )}
            <p className="help">
              {draft.allDay
                ? "종료 날짜까지 일정에 포함해요."
                : "서울 시간 기준으로 입력해 주세요."}
            </p>
          </>
        ) : (
          <>
            {input(
              "date",
              draft.kind === "refund" ? "환불 날짜" : "거래 날짜",
              "date",
            )}
            {transfer ? (
              <>
                {accountField("fromId", "보내는 계좌", assets)}
                {accountField(
                  "toId",
                  draft.kind === "payment" ? "납부할 카드" : "받는 계좌",
                  draft.kind === "payment"
                    ? accounts.filter((account) => account.kind === "credit")
                    : assets,
                )}
                <p className="help">
                  {draft.kind === "payment"
                    ? "카드 대금을 납부해도 지출은 다시 늘어나지 않아요."
                    : "내 계좌 사이 이동은 수입·지출에서 제외해요."}
                </p>
              </>
            ) : draft.kind === "refund" ? (
              <p className="notice">
                원래 결제 수단으로 환불하고 순지출에서 차감해요.
              </p>
            ) : (
              <>
                {accountField(
                  "accountId",
                  draft.kind === "income" ? "입금 계좌" : "결제 수단",
                  draft.kind === "income" ? assets : accounts,
                )}
                {input("category", "분류")}
                {accounts.length === 0 && (
                  <p className="help">
                    먼저 ‘계좌·카드’에서 사용할 계정을 추가해 주세요.
                  </p>
                )}
              </>
            )}
          </>
        )}
        <fieldset className="scope-picker">
          <legend>공개 범위</legend>
          <label className={draft.visibility === "private" ? "selected" : ""}>
            <input
              type="radio"
              name={`${prefix}-visibility`}
              value="private"
              checked={draft.visibility === "private"}
              onChange={() => patch({ visibility: "private" })}
            />
            <LockKeyhole size={17} />
            나만 보기
          </label>
          <label className={draft.visibility === "shared" ? "selected" : ""}>
            <input
              type="radio"
              name={`${prefix}-visibility`}
              value="shared"
              checked={draft.visibility === "shared"}
              onChange={() => patch({ visibility: "shared" })}
            />
            <Users size={17} />
            우리 둘에 공유
          </label>
        </fieldset>
        <p className="help">
          {draft.visibility === "private"
            ? "나에게만 보이는 기록이에요."
            : event
              ? "우리 둘의 멤버에게 일정이 보여요."
              : "거래 내용만 공유해요. 계좌·카드 이름과 잔액은 나만 볼 수 있어요."}
        </p>
        {field(
          "note",
          "메모 · 선택",
          <textarea
            {...attributes("note")}
            value={draft.note}
            onChange={(e) => patch({ note: e.target.value })}
            maxLength={1000}
            rows={3}
            placeholder="알아둘 내용을 적어 주세요"
          />,
        )}
        {Object.keys(errors).length > 0 && (
          <div className="form-error" role="alert">
            {errors.form ?? "표시된 입력 항목을 확인해 주세요."}
          </div>
        )}
        {discard && (
          <div className="discard-confirm" role="alert">
            <p>작성 중인 내용을 버리고 닫을까요?</p>
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
          <button type="submit" className="primary-button">
            {initial.id ? "변경 저장" : "등록하기"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
