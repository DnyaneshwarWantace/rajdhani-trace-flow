import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import ProductService from "@/services/api/productService";
import IndividualProductService from "@/services/api/individualProductService";
import { ProductionService } from "@/services/api/productionService";
import { MachineService, Machine } from "@/services/api/machineService";
import MaterialConsumptionService from "@/services/api/materialConsumptionService";
import MongoDBNotificationService from "@/services/api/notificationService";
import { Loading } from "@/components/ui/loading";

interface ProductionProduct {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  pattern: string;
  targetQuantity: number;
  priority: "normal" | "high" | "urgent";
  status: "planning" | "active" | "completed";
  expectedCompletion: string;
  completionDate?: string; // Actual completion date
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
  wasteType: string;
  canBeReused: boolean;
  notes: string;
}

interface ExpectedProduct {
  name: string;
  category: string;
  length: string;
  width: string;
  weight: string;
  materialComposition: string;
  qualityGrade: string;
}

export default function Production() {
  const navigate = useNavigate();
  const { hasPageAccess } = useAuth();
  
  // Check page permission
  const hasProductionAccess = hasPageAccess('production');
  
  // Redirect if no access
  useEffect(() => {
    if (!hasProductionAccess) {
      navigate('/access-denied', { state: { pageName: 'Production' } });
    }
  }, [hasProductionAccess, navigate]);
  
  // Don't render if no permission
  if (!hasProductionAccess) {
    return null;
  }
  
  // Ensure navigate is available
  if (!navigate) {
    console.error('Navigate function is not available');
    return <div>Error: Navigation not available</div>;
  }
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
      const { data: productionNotifications, error } = await MongoDBNotificationService.getNotificationsByModule('production');
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
      
      // Mark notification as read - change status to 'read'
      await MongoDBNotificationService.updateNotification(notification.id, {
        status: 'read'
      });
      
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
      // Mark notification as dismissed - change status to 'dismissed'
      await MongoDBNotificationService.updateNotification(notificationId, {
        status: 'dismissed'
      });
      await loadNotifications();
      console.log('✅ Notification dismissed:', notificationId);
    } catch (error) {
      console.error('❌ Error dismissing notification:', error);
    }
  };

  // Load production products from production_flows table
  useEffect(() => {
    const loadProductionProducts = async () => {
      let timeoutId: NodeJS.Timeout;
      
      try {
        setIsLoading(true);
        
        // Add timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          console.warn('Production loading timeout - forcing loading to stop');
          setIsLoading(false);
        }, 10000); // 10 second timeout

        // Load production batches from MongoDB
        const { data: batches, error } = await ProductionService.getProductionBatches();

        if (error) {
          console.error('Error loading production batches:', error);
          setProductionProducts([]);
          return;
        }

        console.log('Loaded production batches:', batches);

        // Transform production batches to production products format
        const productionProducts = await Promise.all((batches || []).map(async (batch: any) => {
          // Get product details
          let productName = 'Unknown Product';
          let category = 'Unknown';
          let color = 'Unknown';
          let pattern = 'Unknown';
          let length = 'N/A';
          let width = 'N/A';
          let weight = 'N/A';
          // Use batch_size as the target quantity (what the user requested to produce)
          let productBaseQuantity = batch.batch_size || batch.planned_quantity || 1;

          try {
            if (batch.product_id) {
              const { data: productData } = await ProductService.getProductById(batch.product_id);
              if (productData) {
                productName = productData.name || 'Unknown Product';
                category = productData.category || 'Unknown';
                color = productData.color || 'Unknown';
                pattern = productData.pattern || 'Unknown';
                length = productData.length || 'N/A';
                width = productData.width || 'N/A';
                weight = productData.weight || 'N/A';

                // Keep using batch_size, not current_stock
                // batch_size = what user wants to produce (e.g., 1)
                // current_stock = what's available in inventory (e.g., 4)
              }
            }
          } catch (error) {
            console.error('Error loading product details:', error);
          }

          // Load material consumption for this batch
          let materialsConsumed: any[] = [];
          try {
            console.log(`🔍 Loading material consumption for batch ${batch.id}...`);
            const { data: consumptionResp, error: consumptionError } = await MaterialConsumptionService.getMaterialConsumption({
              production_batch_id: batch.id
            });
            
            console.log(`🔍 Material consumption response for batch ${batch.id}:`, {
              hasError: !!consumptionError,
              error: consumptionError,
              hasData: !!consumptionResp,
              responseType: typeof consumptionResp,
              responseKeys: consumptionResp ? Object.keys(consumptionResp) : [],
              responseData: consumptionResp
            });
            
            if (!consumptionError && consumptionResp) {
              // Service returns { data: [...], pagination: {...} }
              // Handle different possible response structures
              let consumptionData: any[] = [];
              
              if (Array.isArray(consumptionResp)) {
                // If response is directly an array
                consumptionData = consumptionResp;
              } else if (consumptionResp.data && Array.isArray(consumptionResp.data)) {
                // If response is { data: [...], pagination: {...} }
                consumptionData = consumptionResp.data;
              } else if ((consumptionResp as any).data?.data && Array.isArray((consumptionResp as any).data.data)) {
                // If response is { data: { data: [...], pagination: {...} } }
                consumptionData = (consumptionResp as any).data.data;
              }
              
              console.log(`🔍 Consumption data extracted:`, {
                isArray: Array.isArray(consumptionData),
                length: consumptionData.length,
                firstItem: consumptionData[0],
                consumptionData
              });
              
              materialsConsumed = Array.isArray(consumptionData) ? consumptionData.map((m: any) => ({
                materialId: m.material_id,
                materialName: m.material_name || 'Unknown Material',
                quantity: m.quantity_used || 0,
                unit: m.unit || 'units',
                consumedAt: m.consumed_at || m.created_at
              })) : [];
              
              console.log(`✅ Loaded ${materialsConsumed.length} material consumption records for batch ${batch.id}`);
            } else {
              console.log(`⚠️ No material consumption found for batch ${batch.id}`, { error: consumptionError });
            }
          } catch (error) {
            console.error('Error loading material consumption for batch', batch.id, ':', error);
          }
          
          console.log(`📊 Final materialsConsumed for batch ${batch.id}:`, materialsConsumed.length, materialsConsumed);

          // Determine status based on batch status
          let status: 'planning' | 'active' | 'completed' = 'planning';
          switch (batch.status) {
            case 'planned':
              status = 'planning';
              break;
            case 'in_progress':
            case 'in_production':
              status = 'active';
              break;
            case 'completed':
              status = 'completed';
              break;
            default:
              status = 'planning';
          }

          return {
            id: batch.id,
            productId: batch.product_id || 'unknown',
            productName,
            category,
            color,
            pattern,
            targetQuantity: productBaseQuantity, // Use the product's actual base quantity
            priority: batch.priority || 'normal',
            status,
            // Expected completion: 7 days from start date, or from now if not started
            expectedCompletion: batch.start_date
              ? new Date(new Date(batch.start_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            // Actual completion: only set when status is completed
            completionDate: batch.status === 'completed' ? batch.completion_date : undefined,
            createdAt: batch.created_at || new Date().toISOString(),
            materialsConsumed, // This should have the consumed materials
            wasteGenerated: [], // TODO: Load from MongoDB waste management
            expectedProduct: {
              name: productName,
              category,
              length: length,
              width: width,
              weight: weight,
              materialComposition: 'N/A',
              qualityGrade: 'A'
            },
            notes: batch.notes || ''
          };
        }));

        setProductionProducts(productionProducts);
        console.log('Production products loaded from flows:', productionProducts.length);
      } catch (error) {
        console.error('Error loading production products:', error);
        setProductionProducts([]);
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };

    loadProductionProducts();
    loadNotifications();
  }, []);

  // Load production flows from MongoDB
  useEffect(() => {
    const loadFlows = async () => {
      try {
        // Load all production flows from MongoDB
        const flows: any[] = [];
        
        // For each production product, try to load its flow by batch ID
        for (const product of productionProducts) {
          try {
            // Try to get flow by batch ID (production_product_id)
            const { data: flow, error } = await ProductionService.getProductionFlowByBatchId(product.id);
            if (!error && flow) {
              // Load flow steps for this flow
              const { data: steps } = await ProductionService.getProductionFlowSteps(flow.id);
              flows.push({
                ...flow,
                production_flow_steps: steps || []
              });
            }
          } catch (error) {
            // Silently skip if flow doesn't exist yet (404 is expected for new batches)
            console.log(`No flow found for batch ${product.id} (this is normal for new batches)`);
          }
        }
        
        setProductionFlows(flows);
        console.log('✅ Loaded production flows:', flows.length);
      } catch (error) {
        console.error('Error loading production flows:', error);
        setProductionFlows([]);
      }
    };

    if (productionProducts.length > 0) {
      loadFlows();
    }
  }, [productionProducts]);

  // Refresh flows when page becomes visible (in case user navigated back from machine stage)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && productionProducts.length > 0) {
        console.log('🔄 Page became visible, refreshing production flows...');
        const loadFlows = async () => {
          try {
            const flows: any[] = [];
            
            for (const product of productionProducts) {
              try {
                const { data: flow, error } = await ProductionService.getProductionFlowByBatchId(product.id);
                if (!error && flow) {
                  const { data: steps } = await ProductionService.getProductionFlowSteps(flow.id);
                  flows.push({
                    ...flow,
                    production_flow_steps: steps || []
                  });
                }
              } catch (error) {
                // Silently skip if flow doesn't exist yet
                console.log(`No flow found for batch ${product.id}`);
              }
            }
            
            setProductionFlows(flows);
            console.log('🔄 Refreshed production flows:', flows.length);
          } catch (error) {
            console.error('Error refreshing production flows:', error);
          }
        };
        
        loadFlows();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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
      // Use productId (actual product ID) instead of id (batch ID)
      navigate(`/production-detail/${product.productId}`, {
        state: {
          targetQuantity: product.targetQuantity || 1,
          batchId: product.id // Pass batch ID in state if needed
        }
      });
    }, 300);
  };

  // Continue production for active products
  const handleContinueProduction = (product: ProductionProduct) => {
    // Use productId (actual product ID) instead of id (batch ID)
    navigate(`/production-detail/${product.productId}`, {
      state: {
        targetQuantity: product.targetQuantity || 1,
        batchId: product.id // Pass batch ID in state if needed
      }
    });
  };

  // Show machine selection popup instead of direct navigation
  const [showMachineSelectionDialog, setShowMachineSelectionDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductionProduct | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [inspectorName, setInspectorName] = useState("");

  // Load machines
  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const { data: machinesData, error } = await MachineService.getMachines();
      if (error) {
        console.error('Error loading machines:', error);
        setMachines([]);
        return;
      }
      // Map backend fields to frontend format
      const mappedMachines = (machinesData || []).map((machine: any) => ({
        id: machine.id,
        name: machine.machine_name || machine.name,
        description: machine.notes || machine.description || "",
        status: machine.status,
        created_at: machine.created_at,
        updated_at: machine.updated_at
      }));
      setMachines(mappedMachines);
      console.log('✅ Loaded', mappedMachines.length, 'machines from MongoDB');
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

    // TODO: Implement production flow creation with MongoDB
    // const flow = await ProductionService.createProductionFlow(selectedProduct.id);
    // if (flow) {
    //   const newStep = {
    //     id: generateUniqueId('STEP'),
    //     stepNumber: 1,
    //     name: selectedMachine.name,
    //     description: getMachineDescription(selectedMachine.name),
    //     machineId: selectedMachineId,
    //     machineName: selectedMachine.name,
    //     status: 'pending' as const,
    //     inspector: inspectorName,
    //     stepType: 'machine_operation' as const,
    //     createdAt: new Date().toISOString()
    //   };
    //   console.log('Adding step to production flow:', newStep);
    // }

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

  // REMOVED: skipToWasteGeneration function - machine step is now mandatory

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
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Loading production data...
              </p>
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

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                navigate={navigate}
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
                  navigate={navigate}
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
                  navigate={navigate}
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
                  navigate={navigate}
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
              Select a machine for production - machine step is mandatory
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
                      {machine.name} - {machine.description || 'Machine'}
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
            <Button 
              variant="outline" 
              onClick={() => setShowMachineSelectionDialog(false)}
              size="sm"
              className="w-full"
            >
              Cancel
            </Button>
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
  navigate: (path: string) => void;
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
  getPriorityColor,
  navigate
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
            <span className="text-gray-500">Length:</span>
            <p className="font-medium">{product.expectedProduct?.length || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Width:</span>
            <p className="font-medium">{product.expectedProduct?.width || 'N/A'}</p>
          </div>
          <div>
          </div>
          <div>
            <span className="text-gray-500">Weight:</span>
            <p className="font-medium">{product.expectedProduct?.weight || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500">Quantity:</span>
            <p className="font-medium">{product.targetQuantity} Products</p>
            </div>
            </div>

        <div className="text-sm text-gray-500">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" />
            Expected: {new Date(product.expectedCompletion).toLocaleDateString()}
          </div>
          {product.completionDate && product.status === "completed" && (
            <div className="flex items-center gap-1 mb-1 text-green-600">
              <CheckCircle className="w-3 h-3" />
              Completed: {new Date(product.completionDate).toLocaleDateString()}
            </div>
          )}
          <div className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Materials: {product.materialsConsumed?.length || 0} consumed
            {product.status === "active" && (!product.materialsConsumed || product.materialsConsumed.length === 0) && (
              <span className="text-red-600 text-xs ml-1">⚠️ Required</span>
            )}
          </div>
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
            // Find flow by batch ID (matches either id or production_product_id)
            const flow = productionFlows.find(f => f.id === product.id || f.production_product_id === product.id);
            const hasMaterials = product.materialsConsumed && product.materialsConsumed.length > 0;
            const hasMachineSteps = flow?.production_flow_steps?.some((s: any) => s.step_type === 'machine_operation');
            const hasWasteStep = flow?.production_flow_steps?.some((s: any) => s.step_type === 'wastage_tracking');
            const isWasteCompleted = flow?.production_flow_steps?.some((s: any) => s.step_type === 'wastage_tracking' && s.status === 'completed');
            const isFlowCompleted = flow?.status === 'completed';

            // Check if machine operations are completed
            const machineSteps = flow?.production_flow_steps?.filter((s: any) => s.step_type === 'machine_operation') || [];
            const areMachineStepsCompleted = machineSteps.length > 0 && machineSteps.every((s: any) => s.status === 'completed');
            const hasInProgressMachineSteps = machineSteps.some((s: any) => s.status === 'in_progress');
            
            console.log(`🔍 Product ${product.productName} flow analysis:`, {
              hasFlow: !!flow,
              hasMaterials,
              hasMachineSteps,
              machineStepsCount: machineSteps.length,
              areMachineStepsCompleted,
              hasInProgressMachineSteps,
              hasWasteStep,
              isWasteCompleted
            });
            
            // Stage 1: Plan Materials - No flow exists OR no materials added yet
            if (!flow || (!hasMaterials && !hasMachineSteps)) {
              return (
                <Button
                  onClick={() => onStartProduction(product)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Plan Materials
                </Button>
              );
            }
            
            // Stage 2: Machine Operations - Flow exists with machine steps but not all completed
            if (hasMachineSteps && !areMachineStepsCompleted) {
              const completedMachineSteps = machineSteps.filter((s: any) => s.status === 'completed').length;
              const inProgressSteps = machineSteps.filter((s: any) => s.status === 'in_progress').length;
              
              let buttonText = `Machine Operations (${completedMachineSteps}/${machineSteps.length})`;
              if (inProgressSteps > 0) {
                buttonText = `Continue Machine Operations (${completedMachineSteps}/${machineSteps.length})`;
              }
              
              return (
                <Button
                  onClick={() => onMachineOperations(product)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Factory className="w-4 h-4 mr-2" />
                  {buttonText}
                </Button>
              );
            }
            
            // Stage 3: Waste Generation - All machines completed but waste not done
            if (areMachineStepsCompleted && (!hasWasteStep || !isWasteCompleted)) {
              return (
                <Button
                  onClick={() => onWasteGeneration(product)}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {hasWasteStep ? 'Complete Waste Generation' : 'Go to Waste Generation'}
                </Button>
              );
            }
            
            // Stage 4: Complete - Waste completed (or skipped), ready to create individual products
            if (areMachineStepsCompleted && (isWasteCompleted || !hasWasteStep)) {
              return (
                <Button
                  onClick={() => onCompleteProduction(product)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Production
                </Button>
              );
            }
            
            // Fallback: If we have materials but no machine steps yet, start machine operations
            if (hasMaterials && !hasMachineSteps) {
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
            
            // Final fallback
            return (
              <Button
                onClick={() => onStartProduction(product)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Truck className="w-4 h-4 mr-2" />
                Plan Materials
              </Button>
            );
          })()}

          {product.status === "completed" && (
            <Button 
              onClick={() => {
                console.log('Navigating to production summary for product:', product.id);
                if (navigate) {
                  navigate(`/production/summary/${product.id}`);
                } else {
                  console.error('Navigate function is not available');
                }
              }}
              variant="outline"
              className="w-full"
            >
              <Package className="w-4 h-4 mr-2" />
              View Production Summary
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
