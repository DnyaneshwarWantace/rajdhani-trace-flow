import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, AlertTriangle, Plus, Trash2, Save, Factory, Info
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import { RawMaterialService } from "@/services/rawMaterialService";
import { ProductService } from "@/services/ProductService";
import { ProductionFlowService } from "@/services/productionFlowService";
import ProductionProgressBar from "@/components/production/ProductionProgressBar";
import { supabase } from "@/lib/supabase";

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
  expectedProduct: {
    name: string;
    category: string;
    height: string;
    width: string;
    weight: string;
    thickness: string;
    materialComposition: string;
    qualityGrade: string;
  };
  notes: string;
}

interface RawMaterial {
  id: string;
  name: string;
  brand: string;
  category: string;
  currentStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  supplierId: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "overstock";
  location?: string;
  batchNumber?: string;
}

export default function WasteGeneration() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productionProduct, setProductionProduct] = useState<ProductionProduct | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [isAddingWaste, setIsAddingWaste] = useState(false);
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [productionSteps, setProductionSteps] = useState<any[]>([]);
  
  // Waste form
  const [newWaste, setNewWaste] = useState({
    materialId: "",
    materialName: "",
    quantity: "",
    unit: "",
    wasteType: "scrap" as const,
    canBeReused: false,
    notes: ""
  });

  useEffect(() => {
    if (productId) {
      // Load production product from production flow data
      const loadProductionData = async () => {
        try {
          // First load the production flow to get the actual product ID
          const flow = await ProductionFlowService.getProductionFlow(productId);
          if (flow) {
            setProductionFlow(flow);

            // Extract actual product ID from production_product_id
            const actualProductId = flow.production_product_id.replace('PRO-', '').replace('PROD_', '');

            // Load the actual product data
            const response = await ProductService.getProducts();
            const products = response.data || [];
            const product = products.find((p: any) => p.id === actualProductId);

            // Load material consumption from Supabase
            const { data: materialsConsumed, error: materialsError } = await supabase
              .from('material_consumption')
              .select('*')
              .eq('production_product_id', flow.production_product_id);

            if (materialsError) {
              console.warn('Error loading materials consumed:', materialsError);
            }

            if (product) {
              // Convert to production product format with loaded materials
              const productionProduct: ProductionProduct = {
                id: flow.production_product_id, // Use production flow product ID
                productId: product.id,
                productName: product.name,
                category: product.category,
                color: product.color || 'Standard',
                size: `${product.height || 'N/A'} x ${product.width || 'N/A'}`,
                pattern: product.pattern || 'N/A',
                targetQuantity: 1,
                priority: 'normal',
                status: 'active',
                expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: flow.created_at || new Date().toISOString(),
                materialsConsumed: (materialsConsumed || []).map((m: any) => ({
                  materialId: m.material_id,
                  materialName: m.material_name || 'Unknown Material',
                  quantity: m.consumed_quantity,
                  unit: m.unit || 'units',
                  cost: m.cost_per_unit || 0,
                  consumedAt: m.created_at
                })),
                wasteGenerated: [],
                expectedProduct: {
                  name: product.name,
                  category: product.category,
                  height: product.height || '',
                  width: product.width || '',
                  weight: product.weight || '',
                  thickness: product.thickness || '',
                  materialComposition: product.material_composition || '',
                  qualityGrade: 'A+'
                },
                notes: ''
              };
              setProductionProduct(productionProduct);
              console.log('Loaded production product with materials:', productionProduct);
            }

            // Load production steps
            const steps = await ProductionFlowService.getFlowSteps(flow.id);
            if (steps) {
              setProductionSteps(steps);

              // Auto-set waste tracking step to 'in_progress' if it's pending
              const wasteStep = steps.find(s => s.step_type === 'wastage_tracking');
              if (wasteStep && wasteStep.status === 'pending') {
                // Update step status to in_progress
                await ProductionFlowService.updateFlowStep(wasteStep.id, {
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                });
                console.log('Waste tracking step set to in_progress');
              }
            }
          }
        } catch (error) {
          console.error('Error loading production data:', error);
        }
      };
      loadProductionData();
    }
    
    // Load raw materials from Supabase
    const loadRawMaterials = async () => {
      try {
        const result = await RawMaterialService.getRawMaterials();
        if (result?.data) {
          // Map Supabase RawMaterial to local interface
          const mappedMaterials = result.data.map((material: any) => ({
            id: material.id,
            name: material.name,
            brand: material.brand || '',
            category: material.category,
            currentStock: material.current_stock,
            unit: material.unit,
            costPerUnit: material.cost_per_unit,
            supplier: material.supplier_name || '',
            supplierId: material.supplier_id || '',
            status: material.status || 'in-stock',
            location: material.location,
            batchNumber: material.batch_number
          }));
          setRawMaterials(mappedMaterials);
        }
      } catch (error) {
        console.error('Error loading raw materials:', error);
        setRawMaterials([]);
      }
    };

    loadRawMaterials();
  }, [productId]);

  // Handle waste material selection change
  const handleWasteMaterialSelection = (materialId: string) => {
    const selectedMaterial = rawMaterials.find(m => m.id === materialId);
    if (selectedMaterial) {
      setNewWaste({
        ...newWaste,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        unit: selectedMaterial.unit
      });
    }
  };

  const updateProductionProduct = (updatedProduct: ProductionProduct) => {
    // TODO: Update production product in Supabase
    console.log('Updated production product:', updatedProduct);
    setProductionProduct(updatedProduct);
  };

  const addWasteItem = () => {
    if (!productionProduct || !newWaste.materialId || !newWaste.quantity) return;

    const waste: WasteItem = {
      materialId: newWaste.materialId,
      materialName: newWaste.materialName,
      quantity: parseFloat(newWaste.quantity),
      unit: newWaste.unit,
      wasteType: newWaste.wasteType,
      canBeReused: newWaste.canBeReused,
      notes: newWaste.notes
    };

    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      wasteGenerated: [...(productionProduct.wasteGenerated || []), waste]
    };

    updateProductionProduct(updatedProduct);
    
    // Update production flow if wastage step is active
    ProductionFlowService.getProductionFlow(productionProduct.id).then(flow => {
      if (flow) {
        const wastageStep = productionSteps.find(s => s.step_type === 'wastage_tracking' && s.status === 'in_progress');
        if (wastageStep) {
          // Auto-complete wastage step when waste is added
          ProductionFlowService.updateFlowStep(wastageStep.id, {
            status: 'completed',
            end_time: new Date().toISOString(),
            inspector_name: 'Admin',
            notes: `Wastage recorded: ${updatedProduct.wasteGenerated.length} items`
          });
        }
      }
    });
    
    // Reset form
    setNewWaste({
      materialId: "",
      materialName: "",
      quantity: "",
      unit: "",
      wasteType: "scrap",
      canBeReused: false,
      notes: ""
    });
    setIsAddingWaste(false);
  };

  const removeWasteItem = (index: number) => {
    if (!productionProduct) return;
    
    const updatedWasteItems = productionProduct.wasteGenerated?.filter((_, i) => i !== index) || [];
    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      wasteGenerated: updatedWasteItems
    };
    
    updateProductionProduct(updatedProduct);
  };

  const completeWasteTracking = async () => {
    if (!productionProduct) return;
    
    // 1. Deduct consumed materials from raw material inventory
    if (productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
      const updatedRawMaterials = rawMaterials.map(material => {
        const consumed = productionProduct.materialsConsumed.find(cm => cm.materialId === material.id);
        if (consumed) {
          const newQuantity = material.currentStock - consumed.quantity;
          return {
            ...material,
            currentStock: Math.max(0, newQuantity),
            status: newQuantity <= 0 ? "out-of-stock" as const : 
                    newQuantity <= 10 ? "low-stock" as const : "in-stock" as const
          };
        }
        return material;
      });
      
      // Update raw materials in Supabase
      const materialUpdates = productionProduct.materialsConsumed.map(async (consumed) => {
        const material = rawMaterials.find(m => m.id === consumed.materialId);
        if (material) {
          const newQuantity = material.currentStock - consumed.quantity;
          const newStatus = newQuantity <= 0 ? "out-of-stock" :
                           newQuantity <= 10 ? "low-stock" : "in-stock";

          return supabase
            .from('raw_materials')
            .update({
              current_stock: Math.max(0, newQuantity),
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', consumed.materialId);
        }
        return null;
      });

      // Execute all material updates
      await Promise.all(materialUpdates.filter(update => update !== null));

      // Update local state to reflect changes in UI
      setRawMaterials(updatedRawMaterials);
      console.log('✅ Materials deducted from inventory in database');
      console.log('Updated materials:', updatedRawMaterials.filter(m =>
        productionProduct.materialsConsumed.some(cm => cm.materialId === m.id)
      ));
    }
    
    // 2. Add waste items to waste management system
    if (productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0) {
      const wasteManagementItems = productionProduct.wasteGenerated.map(waste => ({
        id: generateUniqueId('WASTE'),
        materialId: waste.materialId,
        materialName: waste.materialName,
        quantity: waste.quantity,
        unit: waste.unit,
        wasteType: waste.wasteType,
        canBeReused: waste.canBeReused,
        notes: waste.notes,
        productionId: productionProduct.id,
        productName: productionProduct.productName,
        generatedAt: new Date().toISOString(),
        status: waste.canBeReused ? 'available_for_reuse' : 'disposed'
      }));
      
      // TODO: Save waste management data to Supabase
      console.log('Waste management items to save:', wasteManagementItems);
      console.log('✅ Waste items prepared for waste management system');
      console.log('Final waste data structure:', wasteManagementItems);
    }
    
    // 3. Mark waste generation step as completed
    ProductionFlowService.getProductionFlow(productionProduct.id).then(flow => {
      if (flow) {
        const wasteStep = productionSteps.find(s => s.step_type === 'wastage_tracking');
        if (wasteStep && wasteStep.status !== 'completed') {
          // Update the waste step to completed
          ProductionFlowService.updateFlowStep(wasteStep.id, {
            status: 'completed',
            end_time: new Date().toISOString(),
            inspector_name: 'Admin',
            notes: `Waste tracking completed with ${(productionProduct?.wasteGenerated || []).length} items. Materials deducted from inventory.`
          });
          
          // Update local production steps state
          const updatedSteps = productionSteps.map(step => 
            step.id === wasteStep.id 
              ? { 
                  ...step, 
                  status: 'completed' as const, 
                  end_time: new Date().toISOString(),
                  inspector_name: 'Admin',
                  notes: `Waste tracking completed with ${(productionProduct?.wasteGenerated || []).length} items. Materials deducted from inventory.`
                }
              : step
          );
          setProductionSteps(updatedSteps);
          
          console.log('Waste tracking step completed');
        }
      }
    });
    
    // Navigate directly to individual details section (Complete page)
      navigate(`/production/complete/${productId}`);
  };

  if (!productionProduct) {
    return <div className="p-6">Loading...</div>;
  }

  const totalWasteQuantity = (productionProduct.wasteGenerated || []).reduce((sum, w) => sum + w.quantity, 0);

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title={`Waste Generation: ${productionProduct.productName}`}
        subtitle="Track waste generated during production process"
      />

      {/* Production Progress Bar */}
      <ProductionProgressBar
        currentStep="wastage_tracking"
        steps={[
          {
            id: "material_selection",
            name: "Material Selection",
            status: "completed",
            stepType: "material_selection"
          },
          {
            id: "machine_operation",
            name: "Machine Operations",
            status: productionSteps?.some((s: any) => s.step_type === 'machine_operation') ? "completed" : "pending",
            stepType: "machine_operation"
          },
          {
            id: "wastage_tracking",
            name: "Waste Generation",
            status: productionSteps?.find((s: any) => s.step_type === 'wastage_tracking')?.status === 'completed' ? "completed" : 
                   productionSteps?.find((s: any) => s.step_type === 'wastage_tracking')?.status === 'in_progress' ? "in_progress" : "pending",
            stepType: "wastage_tracking"
          },
          {
            id: "testing_individual",
            name: "Individual Details",
            status: "pending",
            stepType: "testing_individual"
          }
        ]}
        machineSteps={productionSteps?.filter((s: any) => s.step_type === 'machine_operation') || []}
        className="mb-6"
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/production/${productId}/dynamic-flow`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production Flow
        </Button>
      </div>

      {/* Waste Generation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Waste Tracking Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {productionProduct.wasteGenerated?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Waste Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {totalWasteQuantity.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Waste Quantity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(productionProduct.wasteGenerated || []).filter(w => w.canBeReused).length}
              </div>
              <div className="text-sm text-gray-500">Reusable Items</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Waste Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Waste Generation Tracking
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingWaste(!isAddingWaste)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Waste Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAddingWaste && (
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Waste Tracking</span>
                </div>
                <p className="text-sm text-blue-700">
                  Track waste generated during production. Materials used in production are shown first for easy selection.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Select Material *</Label>
                  <select
                    value={newWaste.materialId}
                    onChange={(e) => handleWasteMaterialSelection(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Choose a material...</option>
                    <optgroup label="Materials Used in Production">
                      {productionProduct.materialsConsumed?.map((material) => (
                        <option key={material.materialId} value={material.materialId}>
                          {material.materialName} - Used: {material.quantity} {material.unit}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All Raw Materials">
                      {rawMaterials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name} - {material.currentStock} {material.unit} in stock
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <Label>Material Name</Label>
                  <Input
                    value={newWaste.materialName}
                    onChange={(e) => setNewWaste({...newWaste, materialName: e.target.value})}
                    placeholder="Auto-filled from selection"
                    readOnly
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Waste Quantity *</Label>
                  <Input
                    type="number"
                    value={newWaste.quantity}
                    onChange={(e) => setNewWaste({...newWaste, quantity: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={newWaste.unit}
                    onChange={(e) => setNewWaste({...newWaste, unit: e.target.value})}
                    placeholder="Auto-filled from selection"
                    readOnly
                  />
                </div>
                <div>
                  <Label>Waste Type</Label>
                  <select
                    value={newWaste.wasteType}
                    onChange={(e) => setNewWaste({...newWaste, wasteType: e.target.value as any})}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="scrap">Scrap</option>
                    <option value="defective">Defective</option>
                    <option value="excess">Excess</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canBeReused"
                  checked={newWaste.canBeReused}
                  onChange={(e) => setNewWaste({...newWaste, canBeReused: e.target.checked})}
                />
                <Label htmlFor="canBeReused">Can be reused/recycled</Label>
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newWaste.notes}
                  onChange={(e) => setNewWaste({...newWaste, notes: e.target.value})}
                  placeholder="Waste description and handling notes"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={addWasteItem} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />
                  Add Waste Item
                </Button>
                <Button variant="outline" onClick={() => setIsAddingWaste(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Waste Items */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              Recorded Waste Items
              {productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {productionProduct.wasteGenerated.length} items
                </Badge>
              )}
            </h4>
            
            {productionProduct.wasteGenerated?.map((waste, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{waste.materialName}</div>
                  <div className="text-sm text-gray-500">
                    {waste.quantity} {waste.unit} • {waste.wasteType} • {waste.canBeReused ? "Reusable" : "Non-reusable"}
                  </div>
                  {waste.notes && <div className="text-sm text-gray-600 mt-1">{waste.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={waste.canBeReused ? "default" : "destructive"}>
                    {waste.wasteType}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeWasteItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {(!productionProduct.wasteGenerated || productionProduct.wasteGenerated.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No waste items recorded yet</p>
                <p className="text-sm">Click "Add Waste Item" to start tracking waste</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complete Waste Tracking */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Complete Waste Tracking</h3>
              <p className="text-sm text-gray-600">
                Once you've recorded all waste items, proceed to the next step in production
              </p>
            </div>
            <Button 
              onClick={completeWasteTracking}
              className="bg-green-600 hover:bg-green-700"
            >
              <Factory className="w-4 h-4 mr-2" />
              Complete & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}