import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import StudentPage from './pages/Student';
import CashierPage from './pages/Cashier';
import AdminPage from './pages/Admin';
import ConciergePage from './pages/Concierge';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  
  // For student page, allow access to student, teacher, and ateneoStaff roles
  if (role === 'student' && ['student', 'teacher', 'ateneoStaff', 'catering'].includes(user.role)) {
    return children;
  }
  
  // For cashier page, allow access to all store roles
  if (role === 'cashier' && [
    'cashier',
    'varda',
    'blueCafe',
    'colonelsCurry',
    'chillers',
    'luckyShawarma',
    'yumdimdum'
  ].includes(user.role)) {
    return children;
  }
  
  // For other roles, check exact match
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cashier"
          element={
            <ProtectedRoute role="cashier">
              <CashierPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/concierge"
          element={
            <ProtectedRoute role="concierge">
              <ConciergePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
