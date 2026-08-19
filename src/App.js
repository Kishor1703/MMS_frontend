import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import MachineList from "./pages/MachineList";
import MachineDetail from "./pages/MachineDetail";
import AddMachine from "./pages/AddMachine";
import Employees from "./pages/Employees";
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/machines" element={<MachineList />} />
            <Route path="/machines/:id" element={<MachineDetail />} />
            <Route
              path="/machines/new"
              element={
                <ProtectedRoute allowedRoles={["admin", "owner"]}>
                  <AddMachine />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={["admin", "owner", "general_manager"]}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["admin", "owner", "general_manager"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
