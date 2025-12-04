import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProductList from '@/pages/products/ProductList';
import ProductDetail from '@/pages/products/ProductDetail';
import ProductStock from '@/pages/products/ProductStock';
import IndividualProductDetail from '@/pages/products/IndividualProductDetail';
import DropdownMaster from '@/pages/dropdowns/DropdownMaster';
import MaterialList from '@/pages/materials/MaterialList';
import MaterialDetail from '@/pages/materials/MaterialDetail';
import RecipeListPage from '@/pages/recipes/RecipeListPage';
import ManageStock from '@/pages/manageStock/ManageStock';
import Settings from '@/pages/settings/Settings';
import Notifications from '@/pages/notifications/Notifications';
import MaterialNotifications from '@/pages/notifications/MaterialNotifications';
import ProductNotifications from '@/pages/notifications/ProductNotifications';
import OrderNotifications from '@/pages/notifications/OrderNotifications';
import CustomerNotifications from '@/pages/notifications/CustomerNotifications';
import SupplierNotifications from '@/pages/notifications/SupplierNotifications';
import ProductionNotifications from '@/pages/notifications/ProductionNotifications';
import CustomerList from '@/pages/customers/CustomerList';
import CustomerDetail from '@/pages/customers/CustomerDetail';
import SupplierList from '@/pages/suppliers/SupplierList';
import SupplierDetail from '@/pages/suppliers/SupplierDetail';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/products"
        element={
          <PrivateRoute>
            <ProductList />
          </PrivateRoute>
        }
      />
      <Route
        path="/products/:id"
        element={
          <PrivateRoute>
            <ProductDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/products/:productId/stock"
        element={
          <PrivateRoute>
            <ProductStock />
          </PrivateRoute>
        }
      />
      <Route
        path="/products/:productId/stock/:individualProductId"
        element={
          <PrivateRoute>
            <IndividualProductDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/materials"
        element={
          <PrivateRoute>
            <MaterialList />
          </PrivateRoute>
        }
      />
      <Route
        path="/materials/:id"
        element={
          <PrivateRoute>
            <MaterialDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/recipes"
        element={
          <PrivateRoute>
            <RecipeListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/manage-stock"
        element={
          <PrivateRoute>
            <ManageStock />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <PrivateRoute>
            <CustomerList />
          </PrivateRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <PrivateRoute>
            <CustomerDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/suppliers"
        element={
          <PrivateRoute>
            <SupplierList />
          </PrivateRoute>
        }
      />
      <Route
        path="/suppliers/:id"
        element={
          <PrivateRoute>
            <SupplierDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/dropdowns"
        element={
          <PrivateRoute>
            <DropdownMaster />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <Notifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications/materials"
        element={
          <PrivateRoute>
            <MaterialNotifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications/products"
        element={
          <PrivateRoute>
            <ProductNotifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications/orders"
        element={
          <PrivateRoute>
            <OrderNotifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications/customers"
        element={
          <PrivateRoute>
            <CustomerNotifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications/suppliers"
        element={
          <PrivateRoute>
            <SupplierNotifications />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications/production"
        element={
          <PrivateRoute>
            <ProductionNotifications />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename="/v2">
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
