import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./layout/AdminLayout";
import { AttendancePage } from "./pages/AttendancePage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { EmployeePage } from "./pages/EmployeePage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { GenericSettingsPage } from "./pages/GenericSettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { RequestPage } from "./pages/RequestPage";
import { WorkSettingsPage } from "./pages/WorkSettingsPage";
import { getStoredUser } from "./lib/session";

function AdminGuard({ children }) {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/employee" replace />;
  }
  return children;
}

function EmployeeGuard({ children }) {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/employee"
        element={
          <EmployeeGuard>
            <EmployeePage />
          </EmployeeGuard>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="work-settings" element={<WorkSettingsPage />} />
        <Route path="location-settings" element={<GenericSettingsPage type="location-settings" />} />
        <Route path="qr-settings" element={<GenericSettingsPage type="qr-settings" />} />
        <Route path="security-settings" element={<GenericSettingsPage type="security-settings" />} />
        <Route path="general-settings" element={<GenericSettingsPage type="general-settings" />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="leave-requests" element={<RequestPage type="leave" />} />
        <Route path="overtime-requests" element={<RequestPage type="overtime" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
