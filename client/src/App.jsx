import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import StudentPage from './pages/Student';
import CashierPage from './pages/Cashier';
import AdminPage from './pages/Admin';

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  
  // For student page, allow access to student, teacher, and ateneoStaff roles
  if (role === 'student' && ['student', 'teacher', 'ateneoStaff'].includes(user.role)) {
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
      </Routes>
    </Router>
  );
}

export default App;
