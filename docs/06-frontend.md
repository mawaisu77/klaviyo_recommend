# 06 - Frontend

Vite + React + TypeScript single-page app in `apps/web/`. The backend owns all OAuth
callbacks; the SPA only starts flows (redirects) and reads status.

## Tech

- Vite + React 18 + TypeScript
- React Router for routing
- TanStack Query for server state (fetching, caching, retries)
- A small auth context in `src/store/` backed by the session cookie
- shadcn-style UI primitives in `src/components/ui/` (button, input, card, table,
  dialog, badge, toast)
- HTTP client in `src/api/client.ts` (fetch wrapper, `credentials: "include"`, JSON,
  error normalization)

## Structure

```text
src/
├─ main.tsx                 # mounts <App/> with QueryClientProvider + Router
├─ App.tsx
├─ router.tsx               # route table + guards
├─ api/
│  ├─ client.ts             # base fetch wrapper
│  └─ endpoints.ts          # typed calls using shared DTOs
├─ store/
│  └─ auth.tsx              # AuthProvider, useAuth (GET /auth/me)
├─ layouts/
│  ├─ AuthLayout.tsx        # centered card for login/register
│  └─ AppLayout.tsx         # sidebar + top bar for authenticated app
├─ components/ui/           # reusable primitives
└─ features/
   ├─ auth/                 # LoginPage, RegisterPage
   ├─ onboarding/           # OnboardingPage (connect Shopify + Klaviyo)
   ├─ integrations/         # IntegrationSettingsPage
   ├─ mappings/             # ReturnMappingPage
   ├─ returns/              # ReturnsActivityPage, ReturnDetailsPage
   ├─ sync/                 # SyncErrorsPage
   └─ dashboard/            # DashboardPage (analytics summary)
```

## Routing

```text
/login                     public   -> LoginPage
/register                  public   -> RegisterPage
/onboarding                private  -> OnboardingPage
/                          private  -> DashboardPage
/integrations              private  -> IntegrationSettingsPage
/mappings                  private  -> ReturnMappingPage
/returns                   private  -> ReturnsActivityPage
/returns/:id               private  -> ReturnDetailsPage
/sync-errors               private  -> SyncErrorsPage
```

Private routes are wrapped by a guard that redirects to `/login` when `useAuth()` has no
user. If integrations are not connected, the guard redirects to `/onboarding`.

## Screens (by chunk)

### Chunk 1
- **Login / Register** - forms hitting `/auth/*`; on success, load `/auth/me` and route to
  the dashboard.
- **App shell** - `AppLayout` with sidebar nav and an empty **Dashboard** placeholder.

### Chunk 2
- **Onboarding** - two-step: "Connect Shopify" and "Connect Klaviyo" buttons that redirect
  to `/integrations/shopify/install` and `/integrations/klaviyo/connect`. Shows a done
  state when both are connected.
- **Integration Settings** - status cards for each connection (connected shop domain,
  scopes, token expiry, last sync), plus reconnect/disconnect and a "Send test event"
  button (Klaviyo).

### Chunk 3
- **Return Reason Mapping** - table of `sourceReason -> marketingCategory` with inline
  edit and active toggle; seeded defaults.
- **Returns Activity** - paginated table: date, order, customer, product(s), reason,
  value, Klaviyo sync status badge.
- **Return Details** - full return, all items, generated event payloads, and each sync
  attempt with status.
- **Sync Errors** - failed events with error messages and a retry action.
- **Analytics Summary (Dashboard)** - totals: returns, returned value, top reasons, top
  returned products, successful vs failed events. Use simple cards + a small chart.

## Data fetching conventions

- One hooks file per feature (`features/<name>/hooks.ts`) exporting `useX` query/mutation
  hooks built on TanStack Query and `src/api/endpoints.ts`.
- Mutations invalidate the relevant query keys (e.g. retrying a sync job invalidates
  `["sync-jobs"]` and `["returns"]`).
- Show loading skeletons and empty states; surface API errors via a toast.

## Styling

Keep it clean and modern: a light neutral theme, a persistent left sidebar, generous
spacing, status badges (green/amber/red) for sync states, and accessible forms. No
required design system beyond the shadcn-style primitives.
