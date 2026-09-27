import { useState } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import {
  accountLabels,
  dateLabel,
  InputError,
  kindLabels,
  money,
  people,
  recordValue,
  remainingRefund,
  type DayRecord,
  type DemoData,
  type Person,
} from "./model.ts";
import { Modal, RecordIcon, ScopeLabel } from "./ui.tsx";

export function RecordDetail({
  record,
  data,
  actor,
  onClose,
  onEdit,
  onRefund,
  onCancel,
}: {
  record: DayRecord;
  data: DemoData;
  actor: Person;
  onClose: () => void;
  onEdit: () => void;
  onRefund: () => void;
  onCancel: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const own = record.owner === actor;
  const accountName = (id?: string) => {
    const account = data.accounts.find(
      (item) => item.id === id && item.owner === actor,
    );
    return account ? `${account.name} · ${accountLabels[account.kind]}` : "—";
  };
  return (
    <Modal title="기록 상세" onClose={onClose}>
      <div className={`detail-content kind-${record.kind}`}>
        <div className="detail-kind">
          <span className="record-icon">
            <RecordIcon kind={record.kind} />
          </span>
          {kindLabels[record.kind]}
        </div>
        <h3 className="detail-title">{record.title}</h3>
        <ScopeLabel shared={record.visibility === "shared"} />
        <p className="detail-amount">{recordValue(record)}</p>
        <dl className="detail-list">
          <div>
            <dt>날짜</dt>
            <dd>
              {record.date.replaceAll("-", ". ")}
              {record.kind === "event" && record.date !== record.endDate
                ? ` – ${record.endDate.replaceAll("-", ". ")}`
                : ""}
            </dd>
          </div>
          {record.kind === "event" && (
            <div>
              <dt>시간</dt>
              <dd>
                {record.allDay
                  ? "종일 · 종료 날짜 포함"
                  : `${record.startTime} – ${record.date === record.endDate ? "" : dateLabel(record.endDate) + " "}${record.endTime} · 서울`}
              </dd>
            </div>
          )}
          {record.kind !== "event" && record.category && (
            <div>
              <dt>분류</dt>
              <dd>{record.category}</dd>
            </div>
          )}
          {record.kind !== "event" && own && (
            <>
              {record.accountId && (
                <div>
                  <dt>계좌·카드</dt>
                  <dd>{accountName(record.accountId)}</dd>
                </div>
              )}
              {record.fromId && (
                <div>
                  <dt>보내는 계좌</dt>
                  <dd>{accountName(record.fromId)}</dd>
                </div>
              )}
              {record.toId && (
                <div>
                  <dt>
                    {record.kind === "payment" ? "납부 카드" : "받는 계좌"}
                  </dt>
                  <dd>{accountName(record.toId)}</dd>
                </div>
              )}
            </>
          )}
          <div>
            <dt>작성자</dt>
            <dd>
              {people[record.owner]}
              {own ? " · 나" : ""}
            </dd>
          </div>
        </dl>
        {record.note && <p className="record-note">{record.note}</p>}
        {["transfer", "payment"].includes(record.kind) && (
          <p className="help">수입·지출 합계에서 제외되는 자금 이동이에요.</p>
        )}
        {own && record.kind === "expense" && (
          <p className="help">
            환불 가능 금액 {money(remainingRefund(data, record))}
          </p>
        )}
        {!own && (
          <p className="notice">
            공유받은 기록이에요. 수정은 작성자만 할 수 있어요.
          </p>
        )}
        {own && !confirm && (
          <div className="detail-actions">
            <button onClick={onEdit}>
              <Pencil size={16} />
              수정
            </button>
            {record.kind === "expense" &&
              remainingRefund(data, record) > 0n && (
                <button onClick={onRefund}>
                  <RotateCcw size={16} />
                  환불
                </button>
              )}
            <button className="danger-button" onClick={() => setConfirm(true)}>
              <Trash2 size={16} />
              기록 취소
            </button>
          </div>
        )}
        {confirm && (
          <div className="discard-confirm">
            <p>‘{record.title}’ 기록을 취소할까요?</p>
            <p className="help">
              {record.kind === "event"
                ? "캘린더에서 사라져요."
                : "관련 잔액과 합계에도 반영돼요."}
            </p>
            <div className="button-row">
              <button
                onClick={() => {
                  setConfirm(false);
                  setError("");
                }}
              >
                돌아가기
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  try {
                    onCancel();
                  } catch (caught) {
                    setError(
                      caught instanceof InputError
                        ? caught.message
                        : "취소하지 못했어요. 다시 시도해 주세요.",
                    );
                  }
                }}
              >
                취소 확정
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
