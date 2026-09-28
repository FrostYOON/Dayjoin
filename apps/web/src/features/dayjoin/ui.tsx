import { useEffect, useRef, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  LockKeyhole,
  RotateCcw,
  Users,
  X,
} from "lucide-react";
import {
  dateLabel,
  kindLabels,
  people,
  recordValue,
  type DayRecord,
  type RecordKind,
} from "./model.ts";

const recordIcons = {
  event: CalendarDays,
  expense: ArrowUpRight,
  income: ArrowDownLeft,
  transfer: ArrowLeftRight,
  payment: CreditCard,
  refund: RotateCcw,
};
export function RecordIcon({
  kind,
  size = 18,
}: {
  kind: RecordKind;
  size?: number;
}) {
  const Icon = recordIcons[kind];
  return <Icon size={size} aria-hidden="true" />;
}
export function ScopeLabel({ shared }: { shared: boolean }) {
  const Icon = shared ? Users : LockKeyhole;
  return (
    <span className="scope-label">
      <Icon size={12} aria-hidden="true" />
      {shared ? "공유 · 우리 둘" : "나만 보기"}
    </span>
  );
}
export function RecordRow({
  record,
  onClick,
}: {
  record: DayRecord;
  onClick: () => void;
}) {
  return (
    <button
      className={`record-row kind-${record.kind}`}
      onClick={onClick}
      aria-label={`${record.title} ${kindLabels[record.kind]} 상세`}
    >
      <span className="record-icon">
        <RecordIcon kind={record.kind} />
      </span>
      <span className="record-body">
        <span className="record-type">
          {kindLabels[record.kind]}
          {["transfer", "payment"].includes(record.kind) ? " · 지출 제외" : ""}
        </span>
        <strong>{record.title}</strong>
        <span className="record-meta">
          <ScopeLabel shared={record.visibility === "shared"} />
          <span>{people[record.owner]}</span>
        </span>
        {record.kind === "event" && record.endDate !== record.date && (
          <span className="record-meta">
            {dateLabel(record.date)} – {dateLabel(record.endDate)}
          </span>
        )}
      </span>
      <span className="record-value">{recordValue(record)}</span>
    </button>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <CalendarDays size={30} strokeWidth={1.3} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const initialFocus =
      dialog.querySelector<HTMLElement>("[data-initial-focus]") ??
      dialog.querySelector<HTMLElement>("input[autofocus]") ??
      dialog.querySelector<HTMLElement>(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), [role="combobox"], textarea',
      );
    initialFocus?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="dialog-header">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
