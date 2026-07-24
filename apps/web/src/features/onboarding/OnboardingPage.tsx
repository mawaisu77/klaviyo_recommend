import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { oauthUrls } from "../../api/endpoints";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useKlaviyoStatus, useShopifyStatus } from "../integrations/hooks";

export function OnboardingPage() {
  const shopify = useShopifyStatus();
  const klaviyo = useKlaviyoStatus();
  const navigate = useNavigate();
  const [shop, setShop] = useState("");

  const shopifyConnected = shopify.data?.connected ?? false;
  const klaviyoConnected = klaviyo.data?.connected ?? false;
  const bothConnected = shopifyConnected && klaviyoConnected;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">Get started</h1>
      </div>
      <p className="muted" style={{ marginBottom: 24 }}>
        Connect your Shopify store and Klaviyo account to begin syncing return data.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="card-title">1. Connect Shopify</h2>
            <p className="muted" style={{ margin: 0 }}>
              Authorize ReturnSense to read orders and returns.
            </p>
          </div>
          <StatusBadge status={shopifyConnected ? "connected" : "pending"} />
        </div>
        {!shopifyConnected && (
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input
              className="input"
              placeholder="your-store.myshopify.com"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
            />
            <a
              className="btn"
              href={shop ? oauthUrls.shopifyInstall(shop) : undefined}
              aria-disabled={!shop}
              style={!shop ? { pointerEvents: "none", opacity: 0.6 } : undefined}
            >
              Connect
            </a>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 className="card-title">2. Connect Klaviyo</h2>
            <p className="muted" style={{ margin: 0 }}>
              Authorize ReturnSense to create events and update profiles.
            </p>
          </div>
          <StatusBadge status={klaviyoConnected ? "connected" : "pending"} />
        </div>
        {!klaviyoConnected && (
          <a className="btn" href={oauthUrls.klaviyoConnect()} style={{ marginTop: 16 }}>
            Connect Klaviyo
          </a>
        )}
      </div>

      <button className="btn" disabled={!bothConnected} onClick={() => navigate("/")}>
        {bothConnected ? "Go to dashboard" : "Connect both to continue"}
      </button>
    </div>
  );
}
