import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./components/ui/toast";
import { AppRouter } from "./router";
import { AuthProvider } from "./store/auth";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
