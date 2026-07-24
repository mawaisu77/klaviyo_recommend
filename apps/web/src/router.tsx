import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { useAuth } from "./store/auth";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { OnboardingPage } from "./features/onboarding/OnboardingPage";
import { IntegrationSettingsPage } from "./features/integrations/IntegrationSettingsPage";
import { ReturnMappingPage } from "./features/mappings/ReturnMappingPage";
import { ReturnsActivityPage } from "./features/returns/ReturnsActivityPage";
import { ReturnDetailsPage } from "./features/returns/ReturnDetailsPage";
import { SyncErrorsPage } from "./features/sync/SyncErrorsPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";

function Protected({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="auth-shell">Loading...</div>;
  if (!me) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="auth-shell">Loading...</div>;
  if (me) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/onboarding"
        element={
          <Protected>
            <OnboardingPage />
          </Protected>
        }
      />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/returns" element={<ReturnsActivityPage />} />
        <Route path="/returns/:id" element={<ReturnDetailsPage />} />
        <Route path="/sync-errors" element={<SyncErrorsPage />} />
        <Route path="/mappings" element={<ReturnMappingPage />} />
        <Route path="/integrations" element={<IntegrationSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
