import { useEffect, useRef, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// This browser event is not yet part of TypeScript's standard DOM declarations.
interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function useWebApp() {
  const [installed, setInstalled] = useState(standalone);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [registrationFailed, setRegistrationFailed] = useState(false);
  const [reloadReady, setReloadReady] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const reloadRequested = useRef(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, value) { setRegistration(value); },
    onRegisterError() { setRegistrationFailed(true); },
    // An update accepted in another tab must not discard this tab's form.
    onNeedReload() {
      if (reloadRequested.current) window.location.reload();
      else setReloadReady(true);
    },
  });

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncDisplayMode = () => setInstalled(standalone());
    const complete = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallMessage("홈 화면에서 Dayjoin을 열 수 있어요.");
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    displayMode.addEventListener("change", syncDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
      displayMode.removeEventListener("change", syncDisplayMode);
    };
  }, []);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void registration?.update().catch(() => { /* Try again on the next visit. */ });
      }
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [registration]);

  const install = async () => {
    if (!installPrompt || installing) return;
    setInstalling(true);
    setInstallMessage("");
    try {
      const choice = await installPrompt.prompt();
      setInstallMessage(choice.outcome === "accepted"
        ? "설치를 요청했어요. 브라우저에서 완료해 주세요."
        : "나중에 브라우저 메뉴에서 설치할 수 있어요.");
    } catch {
      setInstallMessage("설치 창을 열지 못했어요. 브라우저 메뉴에서 설치해 주세요.");
    } finally {
      // A beforeinstallprompt event can only be used once.
      setInstallPrompt(null);
      setInstalling(false);
    }
  };

  const update = async () => {
    setUpdating(true);
    setUpdateError("");
    reloadRequested.current = true;
    try {
      // Another tab may have activated the waiting worker in the meantime.
      if (reloadReady || (registration?.active && !registration.waiting)) window.location.reload();
      else await updateServiceWorker();
    } catch {
      reloadRequested.current = false;
      setUpdateError("업데이트하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
    } finally {
      setUpdating(false);
    }
  };

  return {
    installed, canInstall: !!installPrompt, installing, installMessage, install,
    registrationFailed, updateAvailable: needRefresh || reloadReady,
    updateDismissed, dismissUpdate: () => setUpdateDismissed(true),
    updating, updateError, update,
  };
}

export type WebAppState = ReturnType<typeof useWebApp>;
