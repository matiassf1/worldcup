import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLoginPage from './pages/PublicLoginPage.jsx';
import ViewerRoom from './pages/ViewerRoom.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function RequireViewerAuth({ children }) {
  const token = localStorage.getItem('viewerToken');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function RequireAdminAuth({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLoginPage />} />
        <Route
          path="/room"
          element={
            <RequireViewerAuth>
              <ViewerRoom />
            </RequireViewerAuth>
          }
        />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <RequireAdminAuth>
              <AdminDashboard />
            </RequireAdminAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
