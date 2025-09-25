import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
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

const App = () => {
  const [backendReady, setBackendReady] = useState(false);

  // Initialize Rajdhani ERP System
  useEffect(() => {
    // RajdhaniERP.initialize(); // Removed - using Supabase now
  }, []);

  // Handle backend connection success
  useEffect(() => {
    const timer = setTimeout(() => {
      setBackendReady(true);
    }, 3000); // Show backend connection status for 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <div className="flex h-screen bg-background">
            <Sidebar className="hidden md:flex" />
            <main className="flex-1 overflow-auto min-w-0 w-full md:w-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/new" element={<NewOrder />} />
                <Route path="/orders/add-item" element={<AddItem />} />
                <Route path="/orders/:orderId" element={<OrderDetails />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/finished-goods" element={<FinishedGoods />} />
                <Route path="/inventory/low-stocks" element={<LowStocks />} />
                <Route path="/production" element={<Production />} />
                <Route path="/production/new-batch" element={<NewBatch />} />
                <Route path="/production-detail/:productId" element={<ProductionDetail />} />
                <Route path="/production/:productId/dynamic-flow" element={<DynamicProductionFlow />} />
                <Route path="/production/:productId/waste-generation" element={<WasteGeneration />} />
                <Route path="/production/complete/:productId" element={<Complete />} />

                <Route path="/materials" element={<Materials />} />
                <Route path="/manage-stock" element={<ManageStock />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:productId" element={<ProductDetail />} />
                <Route path="/product-stock/:productId" element={<ProductStock />} />
                <Route path="/qr-scanner" element={<QRScanner />} />
                <Route path="/qr-result" element={<QRResult />} />
                <Route path="/qr-redirect" element={<QRRedirect />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/data-initializer" element={<DataInitializer />} />
                <Route path="/backend-test" element={<BackendTest />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>

          {/* Backend Connection Status - Only show briefly on app start */}
          {!backendReady && <BackendInitializer />}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
