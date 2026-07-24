import type { MeResponse } from "@returnsense/shared";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../api/client";
import { endpoints } from "../api/endpoints";

interface AuthState {
  me: MeResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, organizationName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    endpoints
      .me()
      .then(setMe)
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 401)) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setMe(await endpoints.login({ email, password }));
  }, []);

  const register = useCallback(
    async (email: string, password: string, organizationName: string) => {
      setMe(await endpoints.register({ email, password, organizationName }));
    },
    [],
  );

  const logout = useCallback(async () => {
    await endpoints.logout();
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ me, loading, login, register, logout }),
    [me, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
