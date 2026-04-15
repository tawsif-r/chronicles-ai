import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AgentNew from './pages/AgentNew';
import AgentDetail from './pages/AgentDetail';
import AgentChat from './pages/AgentChat';
import AgentLogs from './pages/AgentLogs';
import AgentMemory from './pages/AgentMemory';
import Settings from './pages/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  return token ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/agents/new" element={<PrivateRoute><AgentNew /></PrivateRoute>} />
          <Route path="/agents/:id" element={<PrivateRoute><AgentDetail /></PrivateRoute>} />
          <Route path="/agents/:id/chat" element={<PrivateRoute><AgentChat /></PrivateRoute>} />
          <Route path="/agents/:id/logs" element={<PrivateRoute><AgentLogs /></PrivateRoute>} />
          <Route path="/agents/:id/memory" element={<PrivateRoute><AgentMemory /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
