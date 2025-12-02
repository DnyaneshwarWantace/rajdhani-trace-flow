import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import FixedHeader from "@/components/layout/FixedHeader";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import NewOrder from "./pages/orders/NewOrder";
import AddItem from "./pages/orders/AddItem";
import OrderDetails from "./pages/orders/OrderDetails";

import Production from "./pages/Production";
import NewBatch from "./pages/production/NewBatch";
import ProductionDetail from "./pages/ProductionDetail";
import Complete from "./pages/production/Complete";
import ProductionSummary from "./pages/production/ProductionSummary";
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
import ProductWastage from "./pages/ProductWastage";
import QRResult from "./pages/QRResult";
import Settings from "./pages/Settings";
import DropdownMaster from "./pages/DropdownMaster";
import RecipeCalculator from "./pages/RecipeCalculator";
import BackendTest from "./pages/BackendTest";
import AccessDenied from "./pages/AccessDenied";
import ActivityLogs from "./pages/ActivityLogs";

// import RajdhaniERP from "@/lib/storageUtilsUtils"; // Removed - using Supabase now
import { useEffect } from "react";


const queryClient = new QueryClient();

// Create authenticated layout component
const AuthenticatedLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isCollapsed } = useSidebarContext();

  if (!isAuthenticated) {
    return null; // This shouldn't render if not authenticated due to ProtectedRoute
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FixedHeader />
      <div className="flex">
        <Sidebar className="hidden lg:flex" />
        <main className={cn(
          "flex-1 transition-all duration-300 pt-0",
          isCollapsed ? "lg:ml-16" : "lg:ml-56"
        )}>
          <Routes>
          {/* Dashboard - accessible to all authenticated users */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Orders routes - accessible to all authenticated users */}
          <Route path="/orders" element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/orders/new" element={
            <ProtectedRoute>
              <NewOrder />
            </ProtectedRoute>
          } />
          <Route path="/orders/add-item" element={
            <ProtectedRoute>
              <AddItem />
            </ProtectedRoute>
          } />
          <Route path="/orders/:orderId" element={
            <ProtectedRoute>
              <OrderDetails />
            </ProtectedRoute>
          } />


          {/* Production routes - accessible to all authenticated users */}
          <Route path="/production" element={
            <ProtectedRoute>
              <Production />
            </ProtectedRoute>
          } />
          <Route path="/production/new-batch" element={
            <ProtectedRoute>
              <NewBatch />
            </ProtectedRoute>
          } />
          <Route path="/production-detail/:productId" element={
            <ProtectedRoute>
              <ProductionDetail />
            </ProtectedRoute>
          } />
          <Route path="/production/:batchId/dynamic-flow" element={
            <ProtectedRoute>
              <DynamicProductionFlow />
            </ProtectedRoute>
          } />
          <Route path="/production/:batchId/waste-generation" element={
            <ProtectedRoute>
              <WasteGeneration />
            </ProtectedRoute>
          } />
          <Route path="/production/complete/:batchId" element={
            <ProtectedRoute>
              <Complete />
            </ProtectedRoute>
          } />
          <Route path="/production/summary/:productId" element={
            <ProtectedRoute>
              <ProductionSummary />
            </ProtectedRoute>
          } />

          {/* Raw materials routes - accessible to all authenticated users */}
          <Route path="/materials" element={
            <ProtectedRoute>
              <Materials />
            </ProtectedRoute>
          } />
          <Route path="/manage-stock" element={
            <ProtectedRoute>
              <ManageStock />
            </ProtectedRoute>
          } />

          {/* Customer routes - accessible to all authenticated users */}
          <Route path="/customers" element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          } />

          {/* Analytics - accessible to all authenticated users */}
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />

          {/* Product routes - accessible to all authenticated users */}
          <Route path="/products" element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/product/:productId" element={
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          } />
          <Route path="/product-stock/:productId" element={
            <ProtectedRoute>
              <ProductStock />
            </ProtectedRoute>
          } />
          <Route path="/product-wastage" element={
            <ProtectedRoute>
              <ProductWastage />
            </ProtectedRoute>
          } />


          {/* Recipe Calculator - accessible to all authenticated users */}
          <Route path="/recipe-calculator" element={
            <ProtectedRoute>
              <RecipeCalculator />
            </ProtectedRoute>
          } />

          {/* Settings - admin only */}
          <Route path="/settings" element={
            <ProtectedRoute requiredRole="admin">
              <Settings />
            </ProtectedRoute>
          } />

          {/* Dropdown Master - admin only */}
          <Route path="/dropdown-master" element={
            <ProtectedRoute requiredRole="admin">
              <DropdownMaster />
            </ProtectedRoute>
          } />

          {/* System administration routes - admin only */}
          <Route path="/backend-test" element={
            <ProtectedRoute requiredRole="admin">
              <BackendTest />
            </ProtectedRoute>
          } />

          <Route path="/activity-logs" element={
            <ProtectedRoute requiredRole="admin">
              <ActivityLogs />
            </ProtectedRoute>
          } />

          {/* 404 page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
          </main>
      </div>
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
        <SidebarProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Public QR result route - accessible without authentication */}
              <Route path="/qr-result" element={<QRResult />} />

              {/* Access Denied page - accessible without authentication (but should be reached via ProtectedRoute) */}
              <Route path="/access-denied" element={<AccessDenied />} />

              {/* All other routes require authentication */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              } />
            </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
