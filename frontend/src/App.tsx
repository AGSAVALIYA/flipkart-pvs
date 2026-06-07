import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/permissions";

// Layout components
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

// Page components
import { LoginPage } from "@/pages/LoginPage";
import { UploadPage } from "@/pages/UploadPage";
import { OperatorPage } from "@/pages/OperatorPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { AdminPage } from "@/pages/AdminPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

// Initialize TanStack query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 60 * 1000,
    },
  },
});

// Home page routing redirect component
const IndexRedirect: React.FC = () => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect by role permissions
  if (role === "admin" || role === "super_admin") {
    return <Navigate to="/upload" replace />;
  }

  return <Navigate to="/operator" replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Core Layout routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Index home redirect */}
                <Route path="/" element={<IndexRedirect />} />

                {/* Sub features routes protected by granular RBAC permissions */}
                <Route element={<ProtectedRoute requiredPermissions={[Permission.PRODUCTS_UPLOAD]} />}>
                  <Route path="/upload" element={<UploadPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermissions={[Permission.VALIDATION_VERIFY]} />}>
                  <Route path="/operator" element={<OperatorPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermissions={[Permission.REPORTS_VIEW]} />}>
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>

                <Route element={<ProtectedRoute requiredPermissions={[Permission.USERS_VIEW]} />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
};
export default App;
