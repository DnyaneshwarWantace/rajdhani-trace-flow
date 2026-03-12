import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from '@/components/ui/toaster';
import { canAccessPage } from '@/utils/permissions';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProductList from '@/pages/products/ProductList';
import ProductDetail from '@/pages/products/ProductDetail';
import ProductStock from '@/pages/products/ProductStock';
import IndividualProductDetail from '@/pages/products/IndividualProductDetail';
import DropdownMaster from '@/pages/dropdowns/DropdownMaster';
import MaterialList from '@/pages/materials/MaterialList';
import MaterialDetail from '@/pages/materials/MaterialDetail';
import InkManagement from '@/pages/materials/InkManagement';
import RecipeCalculator from '@/pages/recipes/RecipeCalculator';
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
import ProductionList from '@/pages/production/ProductionList';
import ProductionDetail from '@/pages/production/ProductionDetail';
import ProductionCreate from '@/pages/production/ProductionCreate';
import PlanningStage from '@/pages/production/PlanningStage';
import MachineStage from '@/pages/production/MachineStage';
import ProductionWastage from '@/pages/production/ProductionWastage';
import ProductionIndividualProducts from '@/pages/production/ProductionIndividualProducts';
import OrderList from '@/pages/orders/OrderList';
import NewOrder from '@/pages/orders/NewOrder';
import OrderDetails from '@/pages/orders/OrderDetails';
import QrResult from '@/pages/QrResult';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminPortal from '@/pages/admin/AdminPortal';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import RollbackDashboard from '@/pages/admin/RollbackDashboard';
import BackupDashboard from '@/pages/admin/BackupDashboard';

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

// Separate admin portal auth guard (NOT using main app AuthContext)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  const userStr = localStorage.getItem('admin_user');

  if (!token || !userStr) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'admin' && user.role !== 'super-admin' && user.role !== 'developer') {
      return <Navigate to="/admin/login" replace />;
    }
  } catch {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0806' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#b88e4f' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Authenticated users: redirect to appropriate page
  if (user?.role === 'admin' || user?.role === 'super-admin') {
    return <Navigate to="/dashboard" />;
  }

  return <Navigate to="/orders" />;
}

function PageAccessRoute({ pageKey, children }: { pageKey: string; children: React.ReactNode }) {
  const hasAccess = canAccessPage(pageKey);

  useEffect(() => {
    if (!hasAccess) {
      // Hard redirect so the app loads at /orders and never shows a white screen
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '';
      window.location.replace(base ? `${base}/orders` : '/orders');
    }
  }, [hasAccess]);

  if (hasAccess) {
    return <>{children}</>;
  }
  // Show spinner until redirect completes (avoids white screen)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-primary-600" />
        <p className="text-sm">Redirecting…</p>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Alias so external site can link to /workstation and still hit normal login */}
        <Route path="/workstation" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/qr-result"
          element={
            <PrivateRoute>
              <QrResult />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="dashboard">
                <Dashboard />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/portal"
          element={
            <AdminRoute>
              <AdminPortal />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="rollback" element={<RollbackDashboard />} />
          <Route path="backup" element={<BackupDashboard />} />
        </Route>
        <Route
          path="/products"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="products">
                <ProductList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:id"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="products">
                <ProductDetail />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:productId/stock"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="products">
                <ProductStock />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/products/:productId/stock/:individualProductId"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="products">
                <IndividualProductDetail />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/materials"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="materials">
                <MaterialList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/materials/:id"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="materials">
                <MaterialDetail />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/ink"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="materials">
                <InkManagement />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/recipes"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <RecipeCalculator />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/manage-stock"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="materials">
                <ManageStock />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/product/:productId"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/new"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionCreate />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/create"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionCreate />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/planning"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <PlanningStage />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/:id/planning"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <PlanningStage />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/:id/machine"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <MachineStage />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/:id/wastage"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionWastage />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/:id/individual-products"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionIndividualProducts />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/production/:id"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="production">
                <ProductionDetail />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="orders">
                <OrderList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="customers">
                <CustomerList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="customers">
                <CustomerDetail />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/suppliers"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="suppliers">
                <SupplierList />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/suppliers/:id"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="suppliers">
                <SupplierDetail />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/dropdowns"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="settings">
                <DropdownMaster />
              </PageAccessRoute>
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
              <PageAccessRoute pageKey="reports">
                <Notifications />
              </PageAccessRoute>
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
        <Route
          path="/orders/new"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="orders">
                <NewOrder />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <PrivateRoute>
              <PageAccessRoute pageKey="orders">
                <OrderDetails />
              </PageAccessRoute>
            </PrivateRoute>
          }
        />
        <Route path="/" element={<HomeRedirect />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter basename="/v2">
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
