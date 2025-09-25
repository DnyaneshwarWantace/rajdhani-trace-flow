import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, Search, Package, Factory, Play, Clock, 
  CheckCircle, Filter, SortAsc, SortDesc, FileSpreadsheet,
  Truck, AlertTriangle
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import { ProductService } from "@/services/ProductService";
import { MachineService } from "@/services/machineService";
import { ProductionFlowService } from "@/services/productionFlowService";
import { ProductionService } from "@/services/productionService";
import { NotificationService } from "@/services/notificationService";
import { supabase } from "@/lib/supabase";
import { Loading } from "@/components/ui/loading";

interface ProductionProduct {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  size: string;
  pattern: string;
  targetQuantity: number;
  priority: "normal" | "high" | "urgent";
  status: "planning" | "active" | "completed";
  expectedCompletion: string;
  createdAt: string;
  materialsConsumed: MaterialConsumption[];
  wasteGenerated: WasteItem[];
  expectedProduct: ExpectedProduct;
  notes: string;
}

interface MaterialConsumption {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
  consumedAt: string;
}

interface WasteItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  wasteType: "scrap" | "defective" | "excess";
  canBeReused: boolean;
  notes: string;
}

interface ExpectedProduct {
  name: string;
  category: string;
  height: string;
  width: string;
  weight: string;
  thickness: string;
  materialComposition: string;
  qualityGrade: string;
}

export default function Production() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"priority" | "createdAt" | "expectedCompletion">("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [productionProducts, setProductionProducts] = useState<ProductionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productionFlows, setProductionFlows] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Load notifications for production requests
  const loadNotifications = async () => {
    try {
      const { data: productionNotifications, error } = await NotificationService.getNotificationsByModule('production');
      if (error) {
        console.error('Error loading production notifications:', error);
        return;
      }
      
      // Filter for unread production requests
      const unreadRequests = productionNotifications?.filter(n => 
        n.status === 'unread' && n.type === 'production_request'
      ) || [];
      
      setNotifications(unreadRequests);
      console.log('📢 Loaded production request notifications:', unreadRequests.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Handle adding product to production from notification
  const handleAddToProductionFromNotification = async (notification: any) => {
    if (!notification.related_data?.productId) return;
    
    try {
      // Navigate to new batch page with the product data
      navigate('/production/new-batch', {
        state: {
          selectedProduct: {
            id: notification.related_data.productId,
            name: notification.related_data.productName,
            category: notification.related_data.category
          }
        }
      });
      
      // Mark notification as read
      await NotificationService.markAsRead(notification.id);
      
      // Reload notifications
      await loadNotifications();
      
      console.log('✅ Product added to production from notification:', notification.related_data.productName);
    } catch (error) {
      console.error('❌ Error adding product to production from notification:', error);
    }
  };

  // Handle dismissing notification
  const handleDismissNotification = async (notificationId: string) => {
    try {
      await NotificationService.markAsDismissed(notificationId);
      await loadNotifications();
      console.log('✅ Notification dismissed:', notificationId);
    } catch (error) {
      console.error('❌ Error dismissing notification:', error);
    }
  };

  // Load production products from production_flows table
  useEffect(() => {
    const loadProductionProducts = async () => {
      try {
        setIsLoading(true);

        // Load directly from production_flows table since that's where your data is
        const { data: flows, error } = await supabase
          .from('production_flows')
          .select(`
            *,
            production_flow_steps (*)
          `);

        if (error) {
          console.error('Error loading production flows:', error);
          setProductionProducts([]);
          return;
        }

        console.log('Loaded production flows:', flows);

        // Transform production flows to production products format
        const productionProducts = await Promise.all((flows || []).map(async (flow: any) => {
          // Calculate status based on flow steps AND individual products
          const steps = flow.production_flow_steps || [];
          const hasSteps = steps.length > 0;
          const completedSteps = steps.filter((s: any) => s.status === 'completed').length;
          const inProgressSteps = steps.filter((s: any) => s.status === 'in_progress').length;

          // Check if individual products have been created for this flow
          let individualProducts: any[] = [];
          try {
            const { data, error } = await supabase
              .from('individual_products')
              .select('id')
              .eq('product_id', flow.production_product_id);

            if (error) {
              // Only log non-expected errors (suppress table not found errors)
              if (error.code !== '42P01' && error.code !== 'PGRST116') {
                console.warn('Error checking individual products:', error);
              }
              individualProducts = [];
            } else {
              individualProducts = data || [];
            }
          } catch (error) {
            console.warn('Individual products table may not exist:', error);
          }

          let status: 'planning' | 'active' | 'completed' = 'planning';

          // Only mark as completed if individual products exist (meaning the final step is truly done)
          if (individualProducts && individualProducts.length > 0) {
            status = 'completed';
          } else if (inProgressSteps > 0 || completedSteps > 0 || hasSteps) {
            status = 'active';
          }

          // Try to get actual product data using production ID directly
          let productData = null;
          try {
            // First check if product exists to avoid 406 errors
            const { data: products, error: productError } = await supabase
              .from('products')
              .select('id')
              .eq('id', flow.production_product_id)
              .limit(1);

            if (!productError && products && products.length > 0) {
              // Product exists, fetch full data
              const { data: fullProduct, error: fullError } = await supabase
                .from('products')
                .select('*')
                .eq('id', flow.production_product_id)
                .single();
              
              if (!fullError) {
                productData = fullProduct;
              }
            }
            // If product doesn't exist, productData remains null (no error logging needed)
          } catch (error) {
            // Silently handle expected errors for non-existent products
            productData = null;
          }

          // Get material consumption data
          let materialsConsumed = [];
          try {
            const { data: materials, error: materialsError } = await supabase
              .from('material_consumption')
              .select('*')
              .eq('production_product_id', flow.production_product_id);
            
            if (materialsError) {
              // Only log non-expected errors (suppress column not found errors)
              if (materialsError.code !== '42703') {
                console.warn('Error fetching material consumption:', materialsError);
              }
              materialsConsumed = [];
            } else {
              materialsConsumed = materials || [];
            }
          } catch (error) {
            console.warn('Error fetching material consumption:', error);
            materialsConsumed = [];
          }

          return {
            id: flow.production_product_id, // Use production_product_id as the main ID
            productId: flow.production_product_id,
            productName: productData?.name || flow.flow_name.replace(' Production Flow', '') || `Production Item ${flow.production_product_id}`,
            category: productData?.category || 'Carpet',
            color: productData?.color || 'Standard',
            size: productData ? `${productData.height || 'N/A'} x ${productData.width || 'N/A'}` : 'N/A',
            pattern: productData?.pattern || 'N/A',
            targetQuantity: 1, // Default quantity
            priority: 'normal' as const,
            status,
            expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: flow.created_at,
            materialsConsumed: materialsConsumed,
            wasteGenerated: [], // TODO: Load waste data
            expectedProduct: {
              name: productData?.name || flow.flow_name.replace(' Production Flow', ''),
              category: productData?.category || 'Carpet',
              height: productData?.height || 'N/A',
              width: productData?.width || 'N/A',
              weight: productData?.weight || 'N/A',
              thickness: productData?.thickness || 'N/A',
              materialComposition: productData?.material_composition || 'N/A',
              qualityGrade: 'A'
            },
            notes: ''
          };
        }));

        setProductionProducts(productionProducts);
        console.log('Production products loaded from flows:', productionProducts.length);
      } catch (error) {
        console.error('Error loading production products:', error);
        setProductionProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductionProducts();
    loadNotifications();
  }, []);

  // Load production flows - now we get them with the products, so just extract them
  useEffect(() => {
    const loadFlows = async () => {
      try {
        // Since we're loading from production_flows directly, we already have the flows
        // Just need to get the detailed flow data for each product
        const { data: flows, error } = await supabase
          .from('production_flows')
          .select(`
            *,
            production_flow_steps (*)
          `);

        if (error) {
          console.error('Error loading production flows:', error);
          setProductionFlows([]);
          return;
        }

        setProductionFlows(flows || []);
        console.log('Production flows loaded:', flows?.length || 0);
      } catch (error) {
        console.error('Error loading production flows:', error);
        setProductionFlows([]);
      }
    };

    loadFlows();
  }, [productionProducts]);

  // Update production products state (no localStorage needed)
  const updateProductionProducts = (products: ProductionProduct[]) => {
    setProductionProducts(products);
  };

  // Add product to production
  const handleAddToProduction = () => {
    navigate('/production/new-batch');
  };

  // Start production for a product (planning phase)
  const handleStartProduction = (product: ProductionProduct) => {
    setIsLoading(true);
    // Small delay for better UX
    setTimeout(() => {
      navigate(`/production-detail/${product.id}`);
    }, 300);
  };

  // Continue production for active products
  const handleContinueProduction = (product: ProductionProduct) => {
    navigate(`/production-detail/${product.id}`);
  };

  // Show machine selection popup instead of direct navigation
  const [showMachineSelectionDialog, setShowMachineSelectionDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductionProduct | null>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [inspectorName, setInspectorName] = useState("");

  // Load machines
  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const machinesData = await MachineService.getMachines();
      setMachines(machinesData);
    } catch (error) {
      console.error('Error loading machines:', error);
      setMachines([]);
    }
  };

  const handleMachineOperations = (product: ProductionProduct) => {
    // Navigate directly to machine operations page instead of opening popup
    navigate(`/production/${product.id}/dynamic-flow`);
  };

  // Handle machine selection from popup
  const handleMachineSelection = async () => {
    if (!selectedMachineId || !inspectorName.trim() || !selectedProduct) {
      console.error('Please select a machine and enter inspector name');
      return;
    }

    const selectedMachine = machines.find(m => m.id === selectedMachineId);
    if (!selectedMachine) return;

    const flow = await ProductionFlowService.getProductionFlow(selectedProduct.id);
    if (flow) {
      const newStep = {
        id: generateUniqueId('STEP'),
        stepNumber: 1, // TODO: Get actual step count from production_flow_steps table
        name: selectedMachine.name,
        description: getMachineDescription(selectedMachine.name),
        machineId: selectedMachineId,
        machineName: selectedMachine.name,
        status: 'pending' as const,
        inspector: inspectorName,
        stepType: 'machine_operation' as const,
        createdAt: new Date().toISOString()
      };

      // TODO: Add step to production flow in Supabase
      console.log('Adding step to production flow:', newStep);
    }

    navigate(`/production/${selectedProduct.id}/dynamic-flow`);
    
    setSelectedMachineId('');
    setInspectorName('');
    setShowMachineSelectionDialog(false);
    setSelectedProduct(null);
  };

  const getMachineDescription = (machineName: string): string => {
    switch (machineName) {
      case 'BR3C-Cutter': return 'High precision cutting machine for carpet trimming and shaping';
      case 'CUTTING MACHINE': return 'Multi-purpose cutting machine for various carpet operations';
      case 'NEEDLE PUNCHING': return 'Needle punching machine for carpet finishing and texture work';
      default: return 'Machine operation for production process';
    }
  };

  const skipToWasteGeneration = () => {
    if (!selectedProduct) return;
    setShowMachineSelectionDialog(false);
    setSelectedProduct(null);
    handleWasteGeneration(selectedProduct);
  };

  // Navigate to waste generation
  const handleWasteGeneration = (product: ProductionProduct) => {
    // Navigate directly to waste generation page instead of creating steps
    navigate(`/production/${product.id}/waste-generation`);
  };

  // Complete production and add to inventory
  const handleCompleteProduction = (product: ProductionProduct) => {
    setIsLoading(true);
    // Small delay for better UX
    setTimeout(() => {
      navigate(`/production/complete/${product.id}`);
    }, 300);
  };

  // Filter and sort products
  const filteredProducts = (productionProducts || [])
    .filter(product => {
      if (!product || !product.productName || !product.category) return false;
      
      const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || product.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || product.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "priority":
          const priorityOrder = { urgent: 3, high: 2, normal: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case "createdAt":
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case "expectedCompletion":
          comparison = new Date(a.expectedCompletion).getTime() - new Date(b.expectedCompletion).getTime();
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning": return "bg-blue-100 text-blue-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6 relative">
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  Loading...
                </h3>
                <p className="text-sm text-gray-600">
                  Preparing production details
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Production Request Notifications */}
      {notifications && notifications.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800">Production Requests</h3>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {notifications.length}
            </Badge>
          </div>
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="bg-white border border-orange-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{notification.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    {notification.related_data && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>📦 Product: {notification.related_data.productName}</div>
                        <div>📋 Category: {notification.related_data.category}</div>
                        <div>👤 Requested by: {notification.related_data.requestedBy}</div>
                        <div>⏰ Requested at: {new Date(notification.related_data.requestedAt).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAddToProductionFromNotification(notification)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add to Production
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDismissNotification(notification.id)}
                      className="border-gray-300"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Header
        title="Production Management"
        subtitle="Track manufacturing processes"
      />

      {/* Action Bar - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
          <Button
            onClick={handleAddToProduction}
            className="bg-production hover:bg-production/90 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="sm:hidden">Add New Production</span>
            <span className="hidden sm:inline">Add to Production</span>
          </Button>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
        </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Status</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Production Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Production ({filteredProducts.length})</TabsTrigger>
          <TabsTrigger value="planning">Planning ({filteredProducts.filter(p => p && p.status === "planning").length})</TabsTrigger>
          <TabsTrigger value="active">Active ({filteredProducts.filter(p => p && p.status === "active").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({filteredProducts.filter(p => p && p.status === "completed").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductionCard
                key={product.id}
                product={product}
                productionFlows={productionFlows}
                onStartProduction={handleStartProduction}
                onContinueProduction={handleContinueProduction}
                onMachineOperations={handleMachineOperations}
                onWasteGeneration={handleWasteGeneration}
                onCompleteProduction={handleCompleteProduction}
                getStatusColor={getStatusColor}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts
              .filter(p => p && p.status === "planning")
              .map((product) => (
                <ProductionCard
                  key={product.id}
                  product={product}
                  productionFlows={productionFlows}
                  onStartProduction={handleStartProduction}
                  onContinueProduction={handleContinueProduction}
                  onMachineOperations={handleMachineOperations}
                  onWasteGeneration={handleWasteGeneration}
                  onCompleteProduction={handleCompleteProduction}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts
              .filter(p => p && p.status === "active")
              .map((product) => (
                <ProductionCard
                  key={product.id}
                  product={product}
                  productionFlows={productionFlows}
                  onStartProduction={handleStartProduction}
                  onContinueProduction={handleContinueProduction}
                  onMachineOperations={handleMachineOperations}
                  onWasteGeneration={handleWasteGeneration}
                  onCompleteProduction={handleCompleteProduction}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts
              .filter(p => p && p.status === "completed")
              .map((product) => (
                <ProductionCard
                  key={product.id}
                  product={product}
                  productionFlows={productionFlows}
                  onStartProduction={handleStartProduction}
                  onContinueProduction={handleContinueProduction}
                  onMachineOperations={handleMachineOperations}
                  onWasteGeneration={handleWasteGeneration}
                  onCompleteProduction={handleCompleteProduction}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredProducts.length === 0 && (
        <Card className="text-center py-12">
          <Factory className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Production Items</h3>
          <p className="text-gray-500 mb-4">
            Start by adding products to production from the Product Inventory
          </p>
          <Button onClick={handleAddToProduction} className="bg-production hover:bg-production/90">
            <Plus className="w-4 h-4 mr-2" />
            Add to Production
          </Button>
        </Card>
      )}

      {/* Machine Selection Dialog */}
      <Dialog open={showMachineSelectionDialog} onOpenChange={setShowMachineSelectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Machine Operation</DialogTitle>
            <DialogDescription>
              Select a machine for production or skip to waste generation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Inspector Name *</Label>
              <Input
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder="Enter inspector name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Select Machine *</Label>
              <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose machine..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name} - {machine.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="space-y-3 pt-6 border-t border-gray-100">
            <Button 
              onClick={handleMachineSelection}
              disabled={!selectedMachineId || !inspectorName}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              size="default"
            >
              <Factory className="w-4 h-4 mr-2" />
              Add Machine Step
            </Button>
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={skipToWasteGeneration}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                size="sm"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Skip
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowMachineSelectionDialog(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Production Card Component
interface ProductionCardProps {
  product: ProductionProduct;
  productionFlows: any[];
  onStartProduction: (product: ProductionProduct) => void;
  onContinueProduction: (product: ProductionProduct) => void;
  onMachineOperations: (product: ProductionProduct) => void;
  onWasteGeneration: (product: ProductionProduct) => void;
  onCompleteProduction: (product: ProductionProduct) => void;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
}

function ProductionCard({
  product,
  productionFlows,
  onStartProduction,
  onContinueProduction,
  onMachineOperations,
  onWasteGeneration,
  onCompleteProduction,
  getStatusColor,
  getPriorityColor
}: ProductionCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
              {product.productName}
            </CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(product.status)}>
                {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
              </Badge>
              <Badge className={getPriorityColor(product.priority)}>
                {product.priority.charAt(0).toUpperCase() + product.priority.slice(1)}
              </Badge>
            </div>
          </div>
          <Package className="w-8 h-8 text-gray-400" />
      </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Category:</span>
            <p className="font-medium">{product.category}</p>
          </div>
          <div>
            <span className="text-gray-500">Color:</span>
            <p className="font-medium">{product.color}</p>
          </div>
          <div>
            <span className="text-gray-500">Size:</span>
            <p className="font-medium">{product.size}</p>
          </div>
          <div>
            <span className="text-gray-500">Quantity:</span>
            <p className="font-medium">{product.targetQuantity}</p>
            </div>
            </div>

        <div className="text-sm text-gray-500">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" />
            Expected: {new Date(product.expectedCompletion).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Materials: {product.materialsConsumed?.length || 0} consumed
            {product.status === "active" && (!product.materialsConsumed || product.materialsConsumed.length === 0) && (
              <span className="text-red-600 text-xs ml-1">⚠️ Required</span>
            )}
          </div>
          {(() => {
            const flow = productionFlows.find(f => f.production_product_id === product.id);
            let progressPercentage = 0;

            // Calculate progress from production flow steps if available
            if (flow && flow.production_flow_steps && flow.production_flow_steps.length > 0) {
              const completedSteps = flow.production_flow_steps.filter((step: any) => step.status === 'completed').length;
              const totalSteps = flow.production_flow_steps.length;

              // Calculate progress based on overall production workflow:
              // - Machine operations: 60% of total progress
              // - Waste generation: 20% of total progress
              // - Individual product creation: 20% of total progress

              const machineProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 60 : 0;

              // Check if individual products exist for this flow
              const hasIndividualProducts = product.status === 'completed'; // This is already checked in the status logic above

              if (hasIndividualProducts) {
                progressPercentage = 100; // Truly completed
              } else {
                progressPercentage = Math.round(machineProgress); // Only machine progress
              }
            }

            return flow && (
              <div className="flex items-center gap-1">
                <Factory className="w-3 h-3" />
                Production Progress: {progressPercentage}%
                <div className="w-16 bg-gray-200 rounded-full h-1 ml-1">
                  <div
                    className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            );
          })()}
          {product.wasteGenerated?.length > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Waste: {product.wasteGenerated.length} items
            </div>
          )}
        </div>

        <div className="space-y-2">
          {product.status === "planning" && (
            <Button 
              onClick={() => onStartProduction(product)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Plan Materials
            </Button>
          )}

          {product.status === "active" && (() => {
            const flow = productionFlows.find(f => f.production_product_id === product.id);
            const hasMaterials = product.materialsConsumed && product.materialsConsumed.length > 0;
            const hasMachineSteps = flow?.production_flow_steps?.some((s: any) => s.step_type === 'machine_operation');
            const hasWasteStep = flow?.production_flow_steps?.some((s: any) => s.step_type === 'wastage_tracking');
            const isWasteCompleted = flow?.production_flow_steps?.some((s: any) => s.step_type === 'wastage_tracking' && s.status === 'completed');
            const isFlowCompleted = flow?.status === 'completed';

            // Check if machine operations are completed
            const machineSteps = flow?.production_flow_steps?.filter((s: any) => s.step_type === 'machine_operation') || [];
            const areMachineStepsCompleted = machineSteps.length > 0 && machineSteps.every((s: any) => s.status === 'completed');
            
            // Determine the next step based on actual data
            if (hasMachineSteps && !areMachineStepsCompleted) {
              // Machine Operations Stage - show machine operations button
              const completedMachineSteps = machineSteps.filter((s: any) => s.status === 'completed').length;
              return (
                <Button
                  onClick={() => onMachineOperations(product)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Factory className="w-4 h-4 mr-2" />
                  Machine Operations ({completedMachineSteps}/{machineSteps.length})
                </Button>
              );
            } else if (areMachineStepsCompleted && !hasWasteStep) {
              // All machines completed, go to waste generation
              return (
                <Button
                  onClick={() => onWasteGeneration(product)}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Go to Waste Generation
                </Button>
              );
            } else if (hasWasteStep && !isWasteCompleted) {
              // Waste Generation Stage - continue to waste generation
              return (
                <Button
                  onClick={() => onWasteGeneration(product)}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Complete Waste Generation
                </Button>
              );
            } else if (areMachineStepsCompleted) {
              // All machines completed, need to create individual products
              return (
                <Button
                  onClick={() => onCompleteProduction(product)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Individual Products
                </Button>
              );
            } else if (!hasMaterials) {
              // No materials yet - go to planning
              return (
                <Button
                  onClick={() => onContinueProduction(product)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Plan Materials
                </Button>
              );
            } else {
              // Default fallback - start machine operations
              return (
                <Button
                  onClick={() => onMachineOperations(product)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Factory className="w-4 h-4 mr-2" />
                  Start Machine Operations
                </Button>
              );
            }
          })()}

          {product.status === "completed" && (
            <Button 
              onClick={() => onCompleteProduction(product)}
              variant="outline"
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
