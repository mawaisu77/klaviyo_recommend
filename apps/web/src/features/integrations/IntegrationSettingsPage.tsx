import { useQueryClient } from "@tanstack/react-query";
import { oauthUrls, endpoints } from "../../api/endpoints";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/toast";
import { formatDate } from "../../lib/format";
import { useKlaviyoStatus, useShopifyStatus } from "./hooks";

export function IntegrationSettingsPage() {
  const shopify = useShopifyStatus();
  const klaviyo = useKlaviyoStatus();
  const qc = useQueryClient();
  const { notify } = useToast();

  const disconnectShopify = async () => {
    await endpoints.shopifyDisconnect();
    await qc.invalidateQueries({ queryKey: ["shopify-status"] });
    notify("Shopify disconnected");
  };

  const disconnectKlaviyo = async () => {
    await endpoints.klaviyoDisconnect();
    await qc.invalidateQueries({ queryKey: ["klaviyo-status"] });
    notify("Klaviyo disconnected");
  };

  const sendTestEvent = async () => {
    try {
      const res = await endpoints.klaviyoTestEvent();
      notify(`Test event sent (${res.uniqueId})`);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to send test event", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Integrations</h1>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2 className="card-title">Shopify</h2>
            <StatusBadge status={shopify.data?.status ?? "disconnected"} />
          </div>
          <dl style={{ margin: "12px 0" }}>
            <Row label="Shop" value={shopify.data?.shopDomain ?? "-"} />
            <Row label="Scopes" value={shopify.data?.scopes ?? "-"} />
            <Row label="Installed" value={formatDate(shopify.data?.installedAt ?? null)} />
          </dl>
          <div className="row-actions">
            {shopify.data?.connected ? (
              <button className="btn btn-danger" onClick={() => void disconnectShopify()}>
                Disconnect
              </button>
            ) : (
              <a className="btn" href={oauthUrls.shopifyInstall("your-store.myshopify.com")}>
                Connect
              </a>
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h2 className="card-title">Klaviyo</h2>
            <StatusBadge status={klaviyo.data?.status ?? "disconnected"} />
          </div>
          <dl style={{ margin: "12px 0" }}>
            <Row label="Account" value={klaviyo.data?.accountId ?? "-"} />
            <Row label="Scopes" value={klaviyo.data?.scopes ?? "-"} />
            <Row label="Token expires" value={formatDate(klaviyo.data?.tokenExpiresAt ?? null)} />
          </dl>
          <div className="row-actions">
            {klaviyo.data?.connected ? (
              <>
                <button className="btn btn-secondary" onClick={() => void sendTestEvent()}>
                  Send test event
                </button>
                <button className="btn btn-danger" onClick={() => void disconnectKlaviyo()}>
                  Disconnect
                </button>
              </>
            ) : (
              <a className="btn" href={oauthUrls.klaviyoConnect()}>
                Connect
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span className="muted">{label}</span>
      <span style={{ maxWidth: 260, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}
