import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import NewOrder from "./pages/orders/NewOrder";
import AddItem from "./pages/orders/AddItem";
import OrderDetails from "./pages/orders/OrderDetails";
import Inventory from "./pages/Inventory";
import FinishedGoods from "./pages/inventory/FinishedGoods";
import LowStocks from "./pages/inventory/LowStocks";

import Production from "./pages/Production";
import NewBatch from "./pages/production/NewBatch";
import ProductionDetail from "./pages/ProductionDetail";
import Complete from "./pages/production/Complete";
import DynamicProductionFlow from "./pages/production/DynamicProductionFlow";
import WasteGeneration from "./pages/production/WasteGeneration";
import Materials from "./pages/Materials";
import ManageStock from "./pages/ManageStock";
import Customers from "./pages/Customers";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductStock from "./pages/ProductStock";
import QRScanner from "./pages/QRScanner";
import QRResult from "./pages/QRResult";
import QRRedirect from "./pages/QRRedirect";
import Settings from "./pages/Settings";
import DataInitializer from "./components/DataInitializer";
import BackendInitializer from "./components/BackendInitializer";
import BackendTest from "./pages/BackendTest";

// import RajdhaniERP from "@/lib/storageUtilsUtils"; // Removed - using Supabase now
import { useEffect, useState } from "react";


const queryClient = new QueryClient();

// Create authenticated layout component
const AuthenticatedLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [backendReady, setBackendReady] = useState(false);

  // Handle backend connection success
  useEffect(() => {
    const timer = setTimeout(() => {
      setBackendReady(true);
    }, 3000); // Show backend connection status for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!isAuthenticated) {
    return null; // This shouldn't render if not authenticated due to ProtectedRoute
  }

  return (
          <div className="flex h-screen bg-background">
            <Sidebar className="hidden md:flex" />
            <main className="flex-1 overflow-auto min-w-0 w-full md:w-auto">
              <Routes>
          {/* Dashboard - accessible to all authenticated users */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Orders routes - restricted to orders and admin roles */}
          <Route path="/orders" element={
            <ProtectedRoute allowedRoles={['admin', 'orders']}>
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/orders/new" element={
            <ProtectedRoute allowedRoles={['admin', 'orders']}>
              <NewOrder />
            </ProtectedRoute>
          } />
          <Route path="/orders/add-item" element={
            <ProtectedRoute allowedRoles={['admin', 'orders']}>
              <AddItem />
            </ProtectedRoute>
          } />
          <Route path="/orders/:orderId" element={
            <ProtectedRoute allowedRoles={['admin', 'orders']}>
              <OrderDetails />
            </ProtectedRoute>
          } />

          {/* Inventory routes - restricted to inventory and admin roles only */}
          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={['admin', 'inventory']}>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/inventory/finished-goods" element={
            <ProtectedRoute allowedRoles={['admin', 'inventory']}>
              <FinishedGoods />
            </ProtectedRoute>
          } />
          <Route path="/inventory/low-stocks" element={
            <ProtectedRoute allowedRoles={['admin', 'inventory']}>
              <LowStocks />
            </ProtectedRoute>
          } />

          {/* Production routes - restricted to production and admin roles */}
          <Route path="/production" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <Production />
            </ProtectedRoute>
          } />
          <Route path="/production/new-batch" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <NewBatch />
            </ProtectedRoute>
          } />
          <Route path="/production-detail/:productId" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <ProductionDetail />
            </ProtectedRoute>
          } />
          <Route path="/production/:productId/dynamic-flow" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <DynamicProductionFlow />
            </ProtectedRoute>
          } />
          <Route path="/production/:productId/waste-generation" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <WasteGeneration />
            </ProtectedRoute>
          } />
          <Route path="/production/complete/:productId" element={
            <ProtectedRoute allowedRoles={['admin', 'production']}>
              <Complete />
            </ProtectedRoute>
          } />

          {/* Raw materials routes - restricted to raw_material and admin roles only */}
          <Route path="/materials" element={
            <ProtectedRoute allowedRoles={['admin', 'raw_material']}>
              <Materials />
            </ProtectedRoute>
          } />
          <Route path="/manage-stock" element={
            <ProtectedRoute allowedRoles={['admin', 'raw_material']}>
              <ManageStock />
            </ProtectedRoute>
          } />

          {/* Customer routes - restricted to orders and admin roles */}
          <Route path="/customers" element={
            <ProtectedRoute allowedRoles={['admin', 'orders']}>
              <Customers />
            </ProtectedRoute>
          } />

          {/* Analytics - accessible to all authenticated users but admin has full access */}
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />

          {/* Product routes - restricted to inventory and admin only */}
          <Route path="/products" element={
            <ProtectedRoute allowedRoles={['admin', 'inventory']}>
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/product/:productId" element={
            <ProtectedRoute allowedRoles={['admin', 'inventory']}>
              <ProductDetail />
            </ProtectedRoute>
          } />
          <Route path="/product-stock/:productId" element={
            <ProtectedRoute allowedRoles={['admin', 'inventory']}>
              <ProductStock />
            </ProtectedRoute>
          } />

          {/* QR scanner routes - accessible to all authenticated users */}
          <Route path="/qr-scanner" element={
            <ProtectedRoute>
              <QRScanner />
            </ProtectedRoute>
          } />
          <Route path="/qr-result" element={
            <ProtectedRoute>
              <QRResult />
            </ProtectedRoute>
          } />
          <Route path="/qr-redirect" element={
            <ProtectedRoute>
              <QRRedirect />
            </ProtectedRoute>
          } />

          {/* Settings - requires settings permissions */}
                <Route path="/settings" element={<Settings />} />

          {/* System administration routes - admin only */}
          <Route path="/data-initializer" element={
            <ProtectedRoute requiredRole="admin">
              <DataInitializer />
            </ProtectedRoute>
          } />
          <Route path="/backend-test" element={
            <ProtectedRoute requiredRole="admin">
              <BackendTest />
            </ProtectedRoute>
          } />

          {/* 404 page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>

          {/* Backend Connection Status - Only show briefly on app start */}
          {!backendReady && <BackendInitializer />}
    </div>
  );
};

const App = () => {
  // Initialize Rajdhani ERP System
  useEffect(() => {
    // RajdhaniERP.initialize(); // Removed - using Supabase now
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public login route */}
              <Route path="/login" element={<Login />} />

              {/* All other routes require authentication */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              } />
            </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
