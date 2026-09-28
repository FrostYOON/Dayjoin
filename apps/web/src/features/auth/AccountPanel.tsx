import { useState } from "react";
import { Modal } from "../dayjoin/ui.tsx";
import { useAuth } from "./context.ts";

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const { user, loading, error, retry, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  return (
    <Modal title="내 계정" onClose={onClose}>
      <div className="auth-account">
        {user ? (
          <>
            <strong>{user.displayName}님, 반가워요.</strong>
            <p className="auth-account-email">{user.email}</p>
            <p>이메일 확인을 완료했어요.</p>
          </>
        ) : (
          <p role="status">
            {loading
              ? "로그인 정보를 확인하고 있어요…"
              : "계정 정보를 확인해 주세요."}
          </p>
        )}
        <p className="auth-hint">
          회원 계정은 저장돼요. 현재 일정·가계부는 예시 데이터이며 새로고침하면
          초기화돼요.
        </p>
        {error && (
          <>
            <p role="alert" className="auth-error">
              {error}
            </p>
            <button disabled={loading} onClick={retry}>
              다시 확인
            </button>
          </>
        )}
        {failure && (
          <p role="alert" className="auth-error">
            {failure}
          </p>
        )}
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void logout().then((message) => {
              if (message) {
                setFailure(message);
                setBusy(false);
              } else onClose();
            });
          }}
        >
          {busy ? "로그아웃 중…" : "로그아웃"}
        </button>
      </div>
    </Modal>
  );
}
