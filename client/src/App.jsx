import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';

import Home from './pages/Home.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Filings from './pages/Filings.jsx';
import Profile from './pages/Profile.jsx';

import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminClients from './pages/admin/AdminClients.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminFilings from './pages/admin/AdminFilings.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';

export default function App() {
  const { isAdmin } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public / client routes */}
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Authenticated client routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route
          path="/checkout"
          element={<ProtectedRoute><Checkout /></ProtectedRoute>}
        />
        <Route
          path="/order-success/:id"
          element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>}
        />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route
          path="/orders/:id"
          element={<ProtectedRoute><OrderDetail /></ProtectedRoute>}
        />
        <Route
          path="/filings"
          element={<ProtectedRoute><Filings /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />

        {/* Admin-only routes — never rendered for clients */}
        <Route
          path="/admin"
          element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="filings" element={<AdminFilings />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>

        <Route path="*" element={<Navigate to={isAdmin ? '/admin' : '/'} replace />} />
      </Routes>
    </>
  );
}
