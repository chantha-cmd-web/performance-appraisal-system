import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import EvaluationForm from './views/EvaluationForm';
import UserManagement from './views/UserManagement';
import EmployeeProfiles from './views/EmployeeProfiles';
import HRSettings from './views/HRSettings';
import CriteriaManagement from './views/CriteriaManagement';
import SelfEvaluation from './views/SelfEvaluation';
import PositionFormManagement from './views/PositionFormManagement';
import AuditLogs from './views/AuditLogs';
import DataManagement from './views/DataManagement';
import { canAccessAdminPage } from './utils/rbac';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccessAdminPage(user)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="evaluation" element={<EvaluationForm />} />
              <Route path="self-evaluation" element={<SelfEvaluation />} />
              <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
              <Route path="employees" element={<AdminRoute><EmployeeProfiles /></AdminRoute>} />
              <Route path="hr-settings" element={<AdminRoute><HRSettings /></AdminRoute>} />
              <Route path="settings" element={<AdminRoute><CriteriaManagement /></AdminRoute>} />
              <Route path="position-forms" element={<AdminRoute><PositionFormManagement /></AdminRoute>} />
              <Route path="audit-logs" element={<AdminRoute><AuditLogs /></AdminRoute>} />
              <Route path="data-management" element={<AdminRoute><DataManagement /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
