import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import Login from "./pages/Login";
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
          <div className="flex min-h-screen bg-background">
            <Sidebar className="hidden md:flex" />
            <main className={cn(
              "flex-1 min-w-0 w-full transition-all duration-300",
              isCollapsed ? "md:ml-16" : "md:ml-64"
            )}>
              <Routes>
          {/* Dashboard - accessible to all authenticated users */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Orders routes - restricted to users with orders permission */}
          <Route path="/orders" element={
            <ProtectedRoute requiredPermission="orders">
              <Orders />
            </ProtectedRoute>
          } />
          <Route path="/orders/new" element={
            <ProtectedRoute requiredPermission="orders">
              <NewOrder />
            </ProtectedRoute>
          } />
          <Route path="/orders/add-item" element={
            <ProtectedRoute requiredPermission="orders">
              <AddItem />
            </ProtectedRoute>
          } />
          <Route path="/orders/:orderId" element={
            <ProtectedRoute requiredPermission="orders">
              <OrderDetails />
            </ProtectedRoute>
          } />


          {/* Production routes - restricted to users with production permission */}
          <Route path="/production" element={
            <ProtectedRoute requiredPermission="production">
              <Production />
            </ProtectedRoute>
          } />
          <Route path="/production/new-batch" element={
            <ProtectedRoute requiredPermission="production">
              <NewBatch />
            </ProtectedRoute>
          } />
          <Route path="/production-detail/:productId" element={
            <ProtectedRoute requiredPermission="production">
              <ProductionDetail />
            </ProtectedRoute>
          } />
          <Route path="/production/:batchId/dynamic-flow" element={
            <ProtectedRoute requiredPermission="production">
              <DynamicProductionFlow />
            </ProtectedRoute>
          } />
          <Route path="/production/:batchId/waste-generation" element={
            <ProtectedRoute requiredPermission="production">
              <WasteGeneration />
            </ProtectedRoute>
          } />
          <Route path="/production/complete/:batchId" element={
            <ProtectedRoute requiredPermission="production">
              <Complete />
            </ProtectedRoute>
          } />
          <Route path="/production/summary/:productId" element={
            <ProtectedRoute requiredPermission="production">
              <ProductionSummary />
            </ProtectedRoute>
          } />

          {/* Raw materials routes - restricted to users with materials permission */}
          <Route path="/materials" element={
            <ProtectedRoute requiredPermission="materials">
              <Materials />
            </ProtectedRoute>
          } />
          <Route path="/manage-stock" element={
            <ProtectedRoute requiredPermission="products">
              <ManageStock />
            </ProtectedRoute>
          } />

          {/* Customer routes - restricted to users with customers OR suppliers permission */}
          <Route path="/customers" element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          } />

          {/* Analytics - restricted to users with reports permission */}
          <Route path="/analytics" element={
            <ProtectedRoute requiredPermission="reports">
              <Analytics />
            </ProtectedRoute>
          } />

          {/* Product routes - restricted to users with products permission */}
          <Route path="/products" element={
            <ProtectedRoute requiredPermission="products">
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/product/:productId" element={
            <ProtectedRoute requiredPermission="products">
              <ProductDetail />
            </ProtectedRoute>
          } />
          <Route path="/product-stock/:productId" element={
            <ProtectedRoute requiredPermission="products">
              <ProductStock />
            </ProtectedRoute>
          } />
          <Route path="/product-wastage" element={
            <ProtectedRoute requiredPermission="products">
              <ProductWastage />
            </ProtectedRoute>
          } />


          {/* Recipe Calculator - restricted to users with production permission */}
          <Route path="/recipe-calculator" element={
            <ProtectedRoute requiredPermission="production">
              <RecipeCalculator />
            </ProtectedRoute>
          } />

          {/* Settings - requires settings permission */}
          <Route path="/settings" element={
            <ProtectedRoute requiredPermission="settings">
              <Settings />
            </ProtectedRoute>
          } />

          {/* Dropdown Master - requires settings permission */}
          <Route path="/dropdown-master" element={
            <ProtectedRoute requiredPermission="settings">
              <DropdownMaster />
            </ProtectedRoute>
          } />

          {/* System administration routes - admin only */}
          <Route path="/backend-test" element={
            <ProtectedRoute requiredRole="admin">
              <BackendTest />
            </ProtectedRoute>
          } />

          {/* 404 page */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
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
              {/* Public login route */}
              <Route path="/login" element={<Login />} />
              
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
