import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import Campaigns from './components/Campaigns';
import Payments from './components/Payments';
import OrderHistory from './components/History';
import Profile from './components/Profile';
import Admin from './components/Admin';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
