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
import { WasteManagementService } from "@/services/wasteManagementService";
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
          console.log('🔍 Loading production data for productId:', productId);
          
          // First load the production flow to get the actual product ID
          const flow = await ProductionFlowService.getProductionFlow(productId);
          console.log('🔍 Production flow loaded:', flow);
          
          if (flow) {
            setProductionFlow(flow);

            // Use the same approach as DynamicProductionFlow - create mock production product from flow data
            console.log('🔍 Creating production product from flow data like DynamicProductionFlow does');

            // Load material consumption from Supabase
            // First try with batch ID, then fallback to product ID
            let { data: materialsConsumed, error: materialsError } = await supabase
              .from('material_consumption')
              .select('*')
              .eq('production_product_id', flow.production_product_id);

            // If no records found with batch ID, try with product ID
            if (!materialsConsumed || materialsConsumed.length === 0) {
              console.log('No material consumption found with batch ID, trying with product ID...');
              const productId = flow.flow_name.replace(' Production Flow - Batch PRO-', ' - ').split(' - ')[0];
              
              // Get the actual product ID from products table
              const { data: productData } = await supabase
                .from('products')
                .select('id')
                .eq('name', productId)
                .single();
              
              if (productData) {
                const { data: fallbackMaterials, error: fallbackError } = await supabase
                  .from('material_consumption')
                  .select('*')
                  .eq('production_product_id', productData.id);
                
                if (fallbackMaterials && fallbackMaterials.length > 0) {
                  materialsConsumed = fallbackMaterials;
                  console.log('✅ Found material consumption records with product ID:', productData.id);
                }
              }
            }

            if (materialsError) {
              console.warn('Error loading materials consumed:', materialsError);
            }

            // Create production product from flow data (same as DynamicProductionFlow)
            const productionProduct: ProductionProduct = {
              id: flow.production_product_id, // This is the batch ID
              productId: flow.production_product_id, // Use production_product_id as productId
              productName: flow.flow_name.replace(' Production Flow', ''),
              category: 'Carpet',
              color: 'N/A',
              size: 'N/A',
              pattern: 'N/A',
              targetQuantity: 1,
              priority: 'normal',
              status: 'active',
              expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              createdAt: flow.created_at || new Date().toISOString(),
              materialsConsumed: (materialsConsumed || []).map((m: any) => ({
                materialId: m.material_id,
                materialName: m.material_name || 'Unknown Material',
                quantity: m.quantity_used || 0, // Use consistent field name
                unit: m.unit || 'units',
                cost: m.total_cost || (m.cost_per_unit * m.quantity_used) || 0,
                consumedAt: m.consumed_at || m.created_at
              })),
              wasteGenerated: [],
              expectedProduct: {
                name: flow.flow_name.replace(' Production Flow', ''),
                category: 'Carpet',
                height: 'N/A',
                width: 'N/A',
                weight: 'N/A',
                thickness: 'N/A',
                materialComposition: 'N/A',
                qualityGrade: 'A'
              },
              notes: ''
            };
            setProductionProduct(productionProduct);
            console.log('✅ Created production product from flow data:', productionProduct);

            // Load production steps
            const steps = await ProductionFlowService.getFlowSteps(flow.id);
            if (steps) {
              setProductionSteps(steps);

              // Check if waste tracking step exists, if not create it
              let wasteStep = steps.find(s => s.step_type === 'wastage_tracking');
              if (!wasteStep) {
                console.log('Creating waste tracking step');
                const newWasteStep = await ProductionFlowService.addStepToFlow({
                  flow_id: flow.id,
                  step_name: 'Waste Generation',
                  step_type: 'wastage_tracking',
                  order_index: steps.length + 1,
                  machine_id: null,
                  inspector_name: 'Admin',
                  notes: 'Track waste generated during production process'
                });
                
                if (newWasteStep) {
                  // Add to local steps
                  const newStep = {
                    id: newWasteStep.id,
                    flow_id: flow.id,
                    step_name: 'Waste Generation',
                    step_type: 'wastage_tracking',
                    order_index: steps.length + 1,
                    machine_id: null,
                    inspector_name: 'Admin',
                    notes: 'Track waste generated during production process',
                    status: 'pending' as const,
                    start_time: null,
                    end_time: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  setProductionSteps([...steps, newStep]);
                  wasteStep = newStep;
                }
              }

              // Auto-set waste tracking step to 'in_progress' if it's pending
              if (wasteStep && wasteStep.status === 'pending') {
                // Update step status to in_progress
                await ProductionFlowService.updateFlowStep(wasteStep.id, {
                  status: 'in_progress',
                  start_time: new Date().toISOString()
                });
                console.log('Waste tracking step set to in_progress');
              }
            }
          } else {
            console.error('❌ No production flow found for productId:', productId);
            // Set fallback product when no flow is found
            const fallbackProduct: ProductionProduct = {
              id: productId || 'unknown',
              productId: productId || 'unknown',
              productName: 'Unknown Product',
              category: 'Unknown',
              color: 'Unknown',
              size: 'Unknown',
              pattern: 'Unknown',
              targetQuantity: 1,
              priority: 'normal',
              status: 'active',
              expectedCompletion: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              materialsConsumed: [],
              wasteGenerated: [],
              expectedProduct: {
                name: 'Unknown Product',
                category: 'Unknown',
                height: '',
                width: '',
                weight: '',
                thickness: '',
                materialComposition: '',
                qualityGrade: 'A+'
              },
              notes: ''
            };
            setProductionProduct(fallbackProduct);
          }
        } catch (error) {
          console.error('❌ Error loading production data:', error);
          // Set a fallback production product to prevent infinite loading
          const fallbackProduct: ProductionProduct = {
            id: productId || 'unknown',
            productId: productId || 'unknown',
            productName: 'Unknown Product',
            category: 'Unknown',
            color: 'Unknown',
            size: 'Unknown',
            pattern: 'Unknown',
            targetQuantity: 1,
            priority: 'normal',
            status: 'active',
            expectedCompletion: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            materialsConsumed: [],
            wasteGenerated: [],
            expectedProduct: {
              name: 'Unknown Product',
              category: 'Unknown',
              height: '',
              width: '',
              weight: '',
              thickness: '',
              materialComposition: '',
              qualityGrade: 'A+'
            },
            notes: ''
          };
          setProductionProduct(fallbackProduct);
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
          })) as RawMaterial[];
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
    
    // Don't auto-complete the waste step - user must explicitly choose to complete or skip
    
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
    
    // 1. Record material consumption and deduct from raw material inventory
    if (productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
      console.log('📦 Recording material consumption for production:', productionProduct.id);
      
      // Record each material consumption using the proper service
      for (const consumed of productionProduct.materialsConsumed) {
        try {
          const result = await RawMaterialService.recordMaterialConsumption({
            production_batch_id: productionProduct.id,
            material_id: consumed.materialId,
            consumed_quantity: consumed.quantity,
            waste_quantity: 0, // No waste in this step, waste is tracked separately
            operator: 'Admin',
            notes: `Material consumed during production of ${productionProduct.productName}`
          });
          
          if (result.error) {
            console.error(`❌ Error recording consumption for ${consumed.materialName}:`, result.error);
          } else {
            console.log(`✅ Recorded consumption: ${consumed.quantity} ${consumed.unit} of ${consumed.materialName}`);
          }
        } catch (error) {
          console.error(`❌ Error processing material consumption for ${consumed.materialName}:`, error);
        }
      }
      
      // Reload raw materials to reflect updated stock levels
      const { data: updatedMaterials } = await RawMaterialService.getRawMaterials();
      if (updatedMaterials) {
        const mappedMaterials = updatedMaterials.map((material: any) => ({
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
        })) as RawMaterial[];
        setRawMaterials(mappedMaterials);
        console.log('✅ Raw materials inventory updated');
      }
    }
    
    // 2. Add waste items to waste management system
    if (productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0) {
      console.log('🗑️ Adding waste items to waste management system...');
      
      for (const waste of productionProduct.wasteGenerated) {
        try {
          // Check if this waste is from consumed materials or additional waste
          const isFromConsumedMaterial = productionProduct.materialsConsumed?.some(
            consumed => consumed.materialId === waste.materialId
          );
          
          const result = await WasteManagementService.createWasteItem({
            material_id: waste.materialId,
            material_name: waste.materialName,
        quantity: waste.quantity,
        unit: waste.unit,
            waste_type: waste.wasteType,
            can_be_reused: waste.canBeReused,
            production_batch_id: productionProduct.id,
            production_product_id: productionProduct.id,
            notes: `${waste.notes || ''} ${isFromConsumedMaterial ? '(From consumed material)' : '(Additional waste - not deducted from inventory)'}`
          });
          
          if (result.error) {
            console.error(`❌ Error creating waste item for ${waste.materialName}:`, result.error);
          } else {
            console.log(`✅ Added waste item: ${waste.quantity} ${waste.unit} of ${waste.materialName} (${waste.wasteType})`);
          }
        } catch (error) {
          console.error(`❌ Error processing waste item ${waste.materialName}:`, error);
        }
      }
      
      console.log('✅ All waste items added to waste management system');
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

  const skipWasteGeneration = async () => {
    if (!productionFlow) {
      console.error('No production flow found');
      return;
    }

    try {
      console.log('Skipping waste generation for flow:', productionFlow.id);
      
      // 1. Deduct consumed materials from raw material inventory (even when skipping waste)
      if (productionProduct && productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
        console.log('📦 Recording material consumption for production (skipping waste):', productionProduct.id);
        
        // Record each material consumption using the proper service
        for (const consumed of productionProduct.materialsConsumed) {
          try {
            const result = await RawMaterialService.recordMaterialConsumption({
              production_batch_id: productionProduct.id,
              material_id: consumed.materialId,
              consumed_quantity: consumed.quantity,
              waste_quantity: 0, // No waste when skipping
              operator: 'Admin',
              notes: `Material consumed during production of ${productionProduct.productName} (waste generation skipped)`
            });
            
            if (result.error) {
              console.error(`❌ Error recording consumption for ${consumed.materialName}:`, result.error);
            } else {
              console.log(`✅ Recorded consumption: ${consumed.quantity} ${consumed.unit} of ${consumed.materialName}`);
            }
          } catch (error) {
            console.error(`❌ Error processing material consumption for ${consumed.materialName}:`, error);
          }
        }
        
        // Reload raw materials to reflect updated stock levels
        const { data: updatedMaterials } = await RawMaterialService.getRawMaterials();
        if (updatedMaterials) {
          const mappedMaterials = updatedMaterials.map((material: any) => ({
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
          })) as RawMaterial[];
          setRawMaterials(mappedMaterials);
          console.log('✅ Raw materials inventory updated (waste skipped)');
        }
      }
      
      // 2. Handle any additional waste items (even when skipping, user might have added some)
      if (productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0) {
        console.log('🗑️ Adding additional waste items to waste management system (skipping mode)...');
        
        for (const waste of productionProduct.wasteGenerated) {
          try {
            const result = await WasteManagementService.createWasteItem({
              material_id: waste.materialId,
              material_name: waste.materialName,
              quantity: waste.quantity,
              unit: waste.unit,
              waste_type: waste.wasteType,
              can_be_reused: waste.canBeReused,
              production_batch_id: productionProduct.id,
              production_product_id: productionProduct.id,
              notes: `${waste.notes || ''} (Additional waste - not deducted from inventory, waste generation skipped)`
            });
            
            if (result.error) {
              console.error(`❌ Error creating waste item for ${waste.materialName}:`, result.error);
            } else {
              console.log(`✅ Added waste item: ${waste.quantity} ${waste.unit} of ${waste.materialName} (${waste.wasteType})`);
            }
          } catch (error) {
            console.error(`❌ Error processing waste item ${waste.materialName}:`, error);
          }
        }
        
        console.log('✅ Additional waste items added to waste management system');
      }
      
      // Find the waste tracking step
      let wasteStep = productionSteps.find(step => step.stepType === 'wastage_tracking');
      
      if (wasteStep) {
        // Update the existing waste step to completed (skipped)
        await ProductionFlowService.updateFlowStep(wasteStep.id, {
          status: 'completed',
          end_time: new Date().toISOString(),
          inspector_name: 'Admin',
          notes: 'Waste generation skipped - no waste was generated during this production process.'
        });
        
        // Update local production steps state
        const updatedSteps = productionSteps.map(step => 
          step.id === wasteStep.id 
            ? { 
                ...step, 
                status: 'completed' as const, 
                end_time: new Date().toISOString(),
                inspector_name: 'Admin',
                notes: 'Waste generation skipped - no waste was generated during this production process.'
              }
            : step
        );
        setProductionSteps(updatedSteps);
        
        console.log('Waste generation step skipped and marked as completed');
      } else {
        // Create a new waste tracking step and mark it as completed (skipped)
        console.log('Creating waste tracking step and marking as skipped');
        const newWasteStep = await ProductionFlowService.addStepToFlow({
          flow_id: productionFlow.id,
          step_name: 'Waste Generation',
          step_type: 'wastage_tracking',
          order_index: productionSteps.length + 1,
          machine_id: null,
          inspector_name: 'Admin',
          notes: 'Waste generation skipped - no waste was generated during this production process.'
        });

        // Update the step to completed status
        if (newWasteStep) {
          await ProductionFlowService.updateFlowStep(newWasteStep.id, {
            status: 'completed',
            end_time: new Date().toISOString(),
            inspector_name: 'Admin',
            notes: 'Waste generation skipped - no waste was generated during this production process.'
          });
        }

        // Add to local production steps state
        const newStep = {
          id: newWasteStep?.id || generateUniqueId('STEP'),
          flow_id: productionFlow.id,
          step_name: 'Waste Generation',
          step_type: 'wastage_tracking',
          order_index: productionSteps.length + 1,
          machine_id: null,
          inspector_name: 'Admin',
          notes: 'Waste generation skipped - no waste was generated during this production process.',
          status: 'completed' as const,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setProductionSteps([...productionSteps, newStep]);
        console.log('Waste generation step created and marked as skipped');
      }
      
      // Navigate directly to individual details section (Complete page)
      navigate(`/production/complete/${productId}`);
    } catch (error) {
      console.error('Error skipping waste generation:', error);
      // Still navigate to complete page even if there's an error
      navigate(`/production/complete/${productId}`);
    }
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

      {/* Status Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <h4 className="font-medium text-amber-800">Waste Tracking In Progress</h4>
            <p className="text-sm text-amber-700 mt-1">
              You must either complete waste tracking or skip this step to proceed to individual product creation.
            </p>
          </div>
        </div>
      </div>

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
          <div className="space-y-4">

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
            
            {/* Skip Option */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-orange-700">No Waste Generated</h4>
                  <p className="text-sm text-gray-600">
                    If no waste was generated during this production process, you can skip this step
                  </p>
                </div>
                <Button 
                  onClick={skipWasteGeneration}
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Skip Waste Generation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

