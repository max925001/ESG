import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { useAuthStore } from './store/authStore';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { UploadPage } from './pages/Upload';
import { IngestionReview } from './pages/IngestionReview';
import { ValidationIssues } from './pages/ValidationIssues';
import { RawVsNormalized } from './pages/RawVsNormalized';
import { Approvals } from './pages/Approvals';
import { AuditLog } from './pages/AuditLog';
import { AICleaning } from './pages/AICleaning';

const App: React.FC = () => {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading secure session...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Workspace Layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* General Access Subroutes */}
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="review" element={<IngestionReview />} />
          <Route path="validation" element={<ValidationIssues />} />
          <Route path="raw-vs-normalized" element={<RawVsNormalized />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="ai-cleaning" element={<AICleaning />} />

          {/* ESG Manager-Only Approval Dashboard */}
          <Route 
            path="approvals" 
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <Approvals />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all Wildcard Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
