import { Download, Smartphone } from "lucide-react";
import type { WebAppState } from "./useWebApp.ts";

export function WebAppSettings({ webApp }: { webApp: WebAppState }) {
  return (
    <section className="web-app-settings" aria-labelledby="web-app-heading">
      <h3 id="web-app-heading" tabIndex={-1} data-initial-focus><Smartphone size={18} />홈 화면에서 Dayjoin</h3>
      <p>자주 보는 달력과 가계부를 홈 화면에서 바로 열어보세요.</p>
      {webApp.installed ? <p className="notice">설치한 웹앱으로 사용할 수 있어요.</p> : <>
        {webApp.canInstall && <button className="primary-button full-width"
          disabled={webApp.installing} onClick={() => void webApp.install()}>
          <Download size={17} />{webApp.installing ? "설치 창을 열고 있어요" : "홈 화면에 설치"}
        </button>}
        <details open={!webApp.canInstall}>
          <summary>브라우저에서 설치하는 방법</summary>
          <p><strong>iPhone·iPad</strong> Safari의 공유 메뉴에서 ‘홈 화면에 추가’를 선택해 주세요.</p>
          <p><strong>Android·PC</strong> 지원 브라우저 메뉴의 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요. 메뉴가 없다면 브라우저에서 계속 사용할 수 있어요.</p>
        </details>
      </>}
      {webApp.installMessage && <p role="status">{webApp.installMessage}</p>}
      <p className="muted">지금은 예시 화면이에요. 설치해도 입력한 기록은 저장되지 않고 새로고침하면 초기화돼요.</p>
      {webApp.registrationFailed && <p role="status">오프라인 화면을 준비하지 못했어요. 인터넷에 연결된 상태로 이용해 주세요.</p>}
      {webApp.updateAvailable && <>
        <p>새 버전이 있어요. 업데이트하면 예시 기록이 초기화돼요.</p>
        <button disabled={webApp.updating} onClick={() => void webApp.update()}>새로고침해 업데이트</button>
        {webApp.updateError && <p role="alert">{webApp.updateError}</p>}
      </>}
    </section>
  );
}

export function WebAppUpdate({ webApp, editing }: { webApp: WebAppState; editing: boolean }) {
  if (!webApp.updateAvailable || webApp.updateDismissed) return null;
  return (
    <section className="web-app-update" aria-label="웹앱 업데이트">
      <div role="status">
        <strong>새로운 버전이 준비됐어요</strong>
        <p>{editing ? "열린 창을 마친 뒤 업데이트해 주세요." : "새로고침하면 입력한 예시 기록이 초기화돼요."}</p>
        {webApp.updateError && <p>{webApp.updateError}</p>}
      </div>
      <div className="button-row">
        <button disabled={editing || webApp.updating} onClick={() => void webApp.update()}>새로고침해 업데이트</button>
        <button onClick={webApp.dismissUpdate}>나중에</button>
      </div>
    </section>
  );
}
