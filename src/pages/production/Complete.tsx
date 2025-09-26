import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, Package, CheckCircle, Plus, Trash2, Download, Upload,
  Save, QrCode, AlertTriangle
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import { IDGenerator } from "@/lib/idGenerator";
import { ProductionFlowService } from "@/services/productionFlowService";
import { supabase } from "@/lib/supabase";
import { getProductionFlow, updateProductionStep } from "@/lib/machines";
import { Loading } from "@/components/ui/loading";
import ProductionProgressBar from "@/components/production/ProductionProgressBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeService, IndividualProductQRData } from "@/lib/qrCode";
import { individualProductService } from "@/services/individualProductService";

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
  materialsConsumed: any[];
  wasteGenerated: any[];
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

interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  customId: string;
  manufacturingDate: string;
  finalWeight: string;
  finalThickness: string;
  finalWidth: string;
  finalHeight: string;
  qualityGrade: "A+" | "A" | "B" | "C" | "D";
  status: "available" | "damaged";
  inspector: string;
  inspectorId?: string;
  productionSteps: Array<{
    stepName: string;
    machineUsed: string;
  inspector: string;
    completedAt: string;
    qualityNotes?: string;
  }>;
  notes: string;
}

export default function Complete() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productionProduct, setProductionProduct] = useState<any>(null);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [inspector, setInspector] = useState("Admin");
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [productionSteps, setProductionSteps] = useState<any[]>([]);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{index: number, productId: string, missingFields: string[]}>>([]);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{
    totalProducts: number;
    available: number;
    damaged: number;
    averageQuality: string;
  } | null>(null);

  // Function to generate globally unique custom ID
  const generateGloballyUniqueCustomId = (productName: string): string => {
    // Get all existing individual products from storage
    // Individual products are loaded from Supabase database
    const allIndividualProducts: any[] = [];
    
    // Create product prefix from first 3 characters
    const prefix = productName.substring(0, 3).toUpperCase();
    
    // Find all existing IDs with this prefix
    const existingIds = allIndividualProducts
      .filter((product: any) => product.customId?.startsWith(prefix + '-'))
      .map((product: any) => product.customId);
    
    // Also include current batch IDs to avoid conflicts
    const currentBatchIds = individualProducts.map(p => p.customId);
    const allExistingIds = [...existingIds, ...currentBatchIds];
    
    // Find the next available number
    let counter = 1;
    let newId = `${prefix}-${String(counter).padStart(3, '0')}`;
    
    while (allExistingIds.includes(newId)) {
      counter++;
      newId = `${prefix}-${String(counter).padStart(3, '0')}`;
    }
    
    return newId;
  };

  useEffect(() => {
    if (productId) {
      // Load production data from Supabase like other pages
      const loadProductionData = async () => {
        try {
          console.log('🔍 Loading production data for Complete page, productId:', productId);
          
          // Load the production flow from Supabase
          const flow = await ProductionFlowService.getProductionFlow(productId);
          console.log('🔍 Production flow loaded for Complete page:', flow);
          
          if (flow) {
        setProductionFlow(flow);
            
            // Load actual product data from database
            // Extract product name from flow name format: "Product Name Production Flow - Batch PRO-xxx"
            const flowName = flow.flow_name || '';
            const productName = flowName.replace(' Production Flow - Batch PRO-', ' - ').split(' - ')[0];
            
            const { data: products, error: productsError } = await supabase
              .from('products')
              .select('*')
              .eq('name', productName)
              .single();
            
            console.log('🔍 Loaded actual product data:', products);
            
            // Load material consumption data to get actual materials used
            // First try with batch ID, then fallback to product ID
            let { data: materialsConsumed, error: materialsError } = await supabase
              .from('material_consumption')
              .select('*')
              .eq('production_product_id', flow.production_product_id);

            // If no records found with batch ID, try with product ID
            if (!materialsConsumed || materialsConsumed.length === 0) {
              console.log('No material consumption found with batch ID, trying with product ID...');
              
              if (products) {
                const { data: fallbackMaterials, error: fallbackError } = await supabase
                  .from('material_consumption')
                  .select('*')
                  .eq('production_product_id', products.id);
                
                if (fallbackMaterials && fallbackMaterials.length > 0) {
                  materialsConsumed = fallbackMaterials;
                  console.log('✅ Found material consumption records with product ID:', products.id);
                }
              }
            }
            
            console.log('🔍 Loaded materials consumed:', materialsConsumed);
            
            // Create production product with real data
            const productionProduct: ProductionProduct = {
              id: flow.production_product_id, // This is the batch ID
              productId: products?.id, // This should be the actual product ID from database
              productName: productName, // Use the extracted product name
              category: products?.category || 'Carpet',
              color: products?.color || 'Standard',
              size: products?.size || 'N/A',
              pattern: products?.pattern || 'N/A',
              targetQuantity: 1,
              priority: 'normal',
              status: 'active',
              expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              createdAt: flow.created_at || new Date().toISOString(),
              materialsConsumed: (materialsConsumed || []).map((m: any) => ({
                materialId: m.material_id,
                materialName: m.material_name || 'Unknown Material',
                quantity: m.quantity_used || m.consumed_quantity || 0,
                unit: m.unit || 'units',
                cost: m.cost_per_unit || 0,
                consumedAt: m.consumed_at || m.created_at
              })),
              wasteGenerated: [],
              expectedProduct: {
                name: flow.flow_name.replace(' Production Flow', ''),
                category: products?.category || 'Carpet',
                height: products?.height || 'N/A',
                width: products?.width || 'N/A',
                weight: products?.weight || 'N/A',
                thickness: products?.thickness || 'N/A',
                materialComposition: materialsConsumed && materialsConsumed.length > 0 
                  ? materialsConsumed.map(m => m.material_name).join(', ')
                  : products?.material_composition || 'N/A',
                qualityGrade: 'A'
              },
              notes: ''
            };
            setProductionProduct(productionProduct);
            console.log('✅ Created production product for Complete page:', productionProduct);
            
            // Load production steps
            const steps = await ProductionFlowService.getFlowSteps(flow.id);
            if (steps) {
              // Set all production steps for progress tracking
              setProductionSteps(steps);
              
              // Filter only completed steps for individual product history
              const completedSteps = steps.filter(s => s.status === 'completed').map(step => ({
                stepName: step.step_name,
                machineUsed: step.machine_id || 'Unknown',
                inspector: step.inspector_name || 'Unknown',
                completedAt: step.end_time || '',
                qualityNotes: step.notes || ''
              }));
              
              // Initialize individual products with production history
        // Generate globally unique custom IDs for all products in this batch
        const customIds = [];
              for (let i = 0; i < productionProduct.targetQuantity; i++) {
                customIds.push(generateGloballyUniqueCustomId(productionProduct.productName));
        }
        
              const initialProducts: IndividualProduct[] = await Promise.all(Array.from({ length: productionProduct.targetQuantity }, async (_, index) => ({
          id: await IDGenerator.generateUniqueIndividualProductId(),
          qrCode: IDGenerator.generateQRCode(),
                productId: productionProduct.productId,
          customId: customIds[index],
          manufacturingDate: new Date().toISOString().split('T')[0],
          finalWeight: "",
          finalThickness: "",
          finalWidth: "",
          finalHeight: "",
          qualityGrade: "A" as const,
          status: "available" as const,
          inspector: inspector,
          inspectorId: generateUniqueId('INSP'),
          productionSteps: completedSteps,
          notes: ""
        })));
        setIndividualProducts(initialProducts);
            }
          } else {
            console.error('❌ No production flow found for Complete page, productId:', productId);
          }
        } catch (error) {
          console.error('❌ Error loading production data for Complete page:', error);
        }
      };
      
      loadProductionData();
    }
  }, [productId, inspector]);

  const handleCellClick = (rowIndex: number, field: keyof IndividualProduct) => {
    setEditingCell({ row: rowIndex, col: field });
    setEditValue(String(individualProducts[rowIndex][field] || ""));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const newData = [...individualProducts];
      const { row, col } = editingCell;
      newData[row] = { ...newData[row], [col]: editValue };
      setIndividualProducts(newData);
      
      // Data is automatically saved to Supabase when completing production
      
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const addRow = () => {
    // Use production steps from state
    const completedSteps = productionSteps.filter(s => s.status === 'completed').map(step => ({
      stepName: step.step_name,
      machineUsed: step.machine_id || 'Unknown',
      inspector: step.inspector_name || 'Unknown',
      completedAt: step.end_time || '',
      qualityNotes: step.notes || ''
    }));
    

    const newProduct: IndividualProduct = {
      id: generateUniqueId('IND'),
      qrCode: generateUniqueId('QR'),
      productId: productionProduct.productId,
      customId: generateGloballyUniqueCustomId(productionProduct.productName),
      manufacturingDate: new Date().toISOString().split('T')[0],
      finalWeight: "",
      finalThickness: "",
      finalWidth: "",
      finalHeight: "",
      qualityGrade: "A" as const,
      status: "available" as const,
      inspector: inspector,
      inspectorId: generateUniqueId('INSP'),
      productionSteps: completedSteps,
      notes: ""
    };
      const updatedProducts = [...individualProducts, newProduct];
      setIndividualProducts(updatedProducts);
      
      // Data is automatically saved to Supabase when completing production
  };

  const removeRow = (index: number) => {
    const productToRemove = individualProducts[index];
    const updatedProducts = individualProducts.filter((_, i) => i !== index);
    setIndividualProducts(updatedProducts);
    
    // Data is automatically saved to Supabase when completing production
  };

  const skipIndividualProductDetails = async () => {
    if (!productionFlow) {
      console.error('No production flow found');
      return;
    }

    try {
      console.log('Skipping individual product details');

      // Create a completed individual product step to represent skipped individual product creation
      const skippedStep = await ProductionFlowService.addStepToFlow({
        flow_id: productionFlow.id,
        step_name: 'N/A',
        step_type: 'testing_individual',
        order_index: productionSteps.length + 1,
        machine_id: null, // No specific machine since it was skipped
        inspector_name: 'System',
        notes: 'Individual product details were skipped - no individual products were created'
      });

      // Mark the step as completed since it was skipped
      if (skippedStep) {
        await ProductionFlowService.completeFlowStep(skippedStep.id, 'Individual product details skipped by user');
        console.log('✅ Skipped individual product step marked as completed:', skippedStep);
      }

      // Navigate back to production overview
      navigate('/production');
    } catch (error) {
      console.error('Error creating skipped individual product step:', error);
      // Still navigate back even if there's an error
      navigate('/production');
    }
  };

  const handleCompleteProduction = async () => {
    // Prevent multiple clicks
    if (isCompleting) {
      console.log('⚠️ Production completion already in progress');
      return;
    }

    // Check if there are any individual products to complete
    if (individualProducts.length === 0) {
      console.log('⚠️ No individual products to complete');
      return;
    }

    setIsCompleting(true);
    
    try {
      // Validate all required fields are filled (excluding optional fields like notes)
      const requiredFields = ['finalWeight', 'finalThickness', 'finalWidth', 'finalHeight', 'qualityGrade'];
      const fieldLabels = {
      'finalWeight': 'Final Weight', 
      'finalThickness': 'Final Thickness',
      'finalWidth': 'Final Width',
      'finalHeight': 'Final Height',
      'qualityGrade': 'Quality Grade'
    };
    
    const errors: Array<{index: number, productId: string, missingFields: string[]}> = [];
    
    individualProducts.forEach((product, index) => {
      const missingFields = requiredFields.filter(field => 
        !product[field as keyof IndividualProduct] || product[field as keyof IndividualProduct] === ""
      );
      
      if (missingFields.length > 0) {
        errors.push({
          index: index + 1,
          productId: product.id,
          missingFields: missingFields.map(field => fieldLabels[field as keyof typeof fieldLabels])
        });
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationPopup(true);
      setIsCompleting(false); // Reset loading state on validation error
      return;
    }

    // Save individual products with complete production history and QR codes
    for (const individualProduct of individualProducts) {
      try {
        // Generate simple QR code string (not complex JSON object)
        const individualProductQRCode = IDGenerator.generateQRCode();
        
        // Create in Supabase with batch ID for new batch system
        const individualProductData: any = {
          qr_code: individualProductQRCode,
          product_id: individualProduct.productId,
          product_name: productionProduct.productName, // Add missing required field
          final_weight: individualProduct.finalWeight,
          final_thickness: individualProduct.finalThickness,
          final_width: individualProduct.finalWidth,
          final_height: individualProduct.finalHeight,
          quality_grade: individualProduct.qualityGrade,
          status: individualProduct.status as 'available' | 'sold' | 'damaged' | 'in-production' | 'completed',
          notes: individualProduct.notes,
          production_date: individualProduct.manufacturingDate,
          inspector: individualProduct.inspector
        };

        // Note: batch_id column doesn't exist in individual_products table
        // The production batch information is tracked through the production flow

        console.log('🔍 Saving to Supabase:', individualProductData);
        const result = await individualProductService.createIndividualProduct(individualProductData);
        
        if (result.error) {
          console.error(`❌ Error creating individual product ${individualProduct.id}:`, result.error);
          throw new Error(`Failed to create individual product: ${result.error.message}`);
        }
        
        console.log(`✅ Created individual product "${productionProduct.productName}" with QR code: ${individualProductQRCode}`);
      } catch (error) {
        console.error(`Error creating individual product ${individualProduct.id}:`, error);
        // Continue with other products even if one fails
      }
    }
    
    // Individual products are saved to Supabase database only

    // Update main product inventory in Supabase
    try {
      const availableCount = individualProducts.filter(p => p.status === "available").length;
      const damagedCount = individualProducts.filter(p => p.status === "damaged").length;
      
      console.log(`📊 Production completed: ${availableCount} available, ${damagedCount} damaged products`);
      
      // Update product base_quantity in Supabase
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('base_quantity, status')
        .eq('id', productionProduct.productId)
        .single();
      
      if (currentProduct && !productError) {
        const newQuantity = (currentProduct.base_quantity || 0) + availableCount;
        const newStatus = newQuantity <= 0 ? 'out-of-stock' : 
                                              newQuantity <= 5 ? 'low-stock' : 'in-stock';
      
        await supabase
          .from('products')
          .update({
            base_quantity: newQuantity,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', productionProduct.productId);
        
        console.log(`✅ Updated product base_quantity: ${currentProduct.base_quantity} → ${newQuantity} (${newStatus})`);
        console.log(`✅ Production completed successfully! ${availableCount} individual products added to inventory.`);
        console.log(`✅ Both individual products created AND base_quantity increased.`);
      } else {
        console.warn('⚠️ Could not update product base_quantity in Supabase:', productError);
        console.warn('⚠️ Individual products were created but base_quantity could not be updated.');
      }
    } catch (error) {
      console.error('❌ Error updating product inventory:', error);
      console.error('❌ Individual products were created but there was an error updating inventory.');
    }

    // Mark production as completed
    // Production products are managed in Supabase database
    const productionProducts: any[] = [];
    const updatedProduction = productionProducts.map((p: any) => 
      p.id === productionProduct.id ? { 
        ...p, 
        status: "completed",
        completedAt: new Date().toISOString(),
        finalInspector: inspector,
        actualQuantity: individualProducts.length,
        qualityDistribution: getQualityDistribution(individualProducts)
      } : p
    );
    // Production products are managed in Supabase database only

    // Update production flow status
    if (productionFlow && productionFlow.status !== 'completed') {
      const lastStep = productionSteps[productionSteps.length - 1];
      if (lastStep) {
        try {
          await updateProductionStep(productionFlow.id, lastStep.id, {
            status: 'completed',
            endTime: new Date().toISOString(),
            inspectorName: inspector
          });
          console.log('✅ Production flow step marked as completed');
        } catch (error) {
          console.error('❌ Error updating production flow step:', error);
        }
      }

      // Update the production flow status to completed
      try {
        console.log('🔍 Updating production flow status to completed for flow ID:', productionFlow.id);
        console.log('🔍 Current production flow status:', productionFlow.status);
        console.log('🔍 Production flow data:', productionFlow);
        
        const { data: updateData, error: updateError } = await supabase
          .from('production_flows')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', productionFlow.id)
          .select();
        
        if (updateError) {
          console.error('❌ Error updating production flow status:', updateError);
        } else {
          console.log('✅ Production flow status updated to completed:', updateData);
          
          // Also update the local state
          setProductionFlow(prev => ({
            ...prev,
            status: 'completed',
            updated_at: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('❌ Error updating production flow status:', error);
      }
    }

    // Show completion summary popup
    setCompletionSummary({
      totalProducts: individualProducts.length,
      available: individualProducts.filter(p => p.status === "available").length,
      damaged: individualProducts.filter(p => p.status === "damaged").length,
      averageQuality: calculateAverageQualityGrade(individualProducts)
    });
    setShowCompletionPopup(true);
    
    } catch (error) {
      console.error('❌ Error completing production:', error);
      // Show error notification or handle error appropriately
    } finally {
      setIsCompleting(false); // Always reset loading state
    }
  };

  const calculateAverageQualityGrade = (products: IndividualProduct[]): string => {
    const gradeValues = { 'A+': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const totalValue = products.reduce((sum, p) => sum + gradeValues[p.qualityGrade], 0);
    const average = totalValue / products.length;
    
    if (average >= 4.5) return 'A+';
    if (average >= 3.5) return 'A';
    if (average >= 2.5) return 'B';
    if (average >= 1.5) return 'C';
    return 'D';
  };

  const getQualityDistribution = (products: IndividualProduct[]) => {
    const distribution = products.reduce((acc, p) => {
      acc[p.qualityGrade] = (acc[p.qualityGrade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(distribution).map(([grade, count]) => ({ grade, count }));
  };

  if (!productionProduct) {
    return <Loading message="Loading individual product details..." />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Complete Production"
        subtitle={`Final product creation for ${productionProduct.productName}`}
      />

      {/* Production Progress Bar */}
      <ProductionProgressBar
        currentStep="testing_individual"
        steps={[
          {
            id: "material_selection",
            name: "Material Selection",
            status: productionProduct?.materialsConsumed?.length > 0 ? "completed" : "pending",
            stepType: "material_selection"
          },
          {
            id: "machine_operation",
            name: "Machine Operations",
            status: productionSteps?.some((s: any) => s.step_type === 'machine_operation' && s.status === 'completed') ? "completed" : "pending",
            stepType: "machine_operation"
          },
          {
            id: "wastage_tracking",
            name: "Waste Generation",
            status: productionSteps?.some((s: any) => s.step_type === 'wastage_tracking' && s.status === 'completed') ? "completed" : "pending",
            stepType: "wastage_tracking"
          },
          {
            id: "testing_individual",
            name: "Individual Details",
            status: "in_progress",
            stepType: "testing_individual"
          }
        ]}
        machineSteps={productionSteps?.filter((s: any) => s.step_type === 'machine_operation') || []}
        className="mb-6"
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/production')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production
        </Button>
      </div>

      {/* Product Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Production Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Product</Label>
              <p className="font-medium">{productionProduct.productName}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Target Quantity</Label>
              <p className="font-medium">{productionProduct.targetQuantity}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Priority</Label>
              <Badge className={
                productionProduct.priority === "urgent" ? "bg-red-100 text-red-800" :
                productionProduct.priority === "high" ? "bg-orange-100 text-orange-800" :
                "bg-blue-100 text-blue-800"
              }>
                {productionProduct.priority}
              </Badge>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Inspector</Label>
              <Input
                value={inspector}
                onChange={(e) => {
                  setInspector(e.target.value);
                  // Inspector name is saved to Supabase when completing production
                }}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Product Details for Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Main Product Specifications (Reference)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Reference Information</span>
            </div>
            <p className="text-sm text-blue-700">
              Use these specifications as a reference when filling in the actual final measurements below.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Expected Height</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.height || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Expected Width</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.width || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Expected Weight</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.weight || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Expected Thickness</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.thickness || 'N/A'}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label className="text-sm text-gray-500">Category</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.category || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Material Composition</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.materialComposition || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Usage Details */}
      {productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Material Usage in This Production Batch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                The following materials were consumed during this production batch:
              </p>
              <div className="grid gap-4">
                {productionProduct.materialsConsumed.map((material: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <div>
                          <h4 className="font-medium text-gray-900">{material.materialName}</h4>
                          <p className="text-sm text-gray-500">
                            {material.materialBrand && `${material.materialBrand} • `}
                            {material.materialCategory}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {material.quantityUsed || material.quantity} {material.unit}
                      </div>
                      {material.costPerUnit && (
                        <div className="text-sm text-gray-500">
                          ₹{material.costPerUnit} per {material.unit}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Total Materials Used:</strong> {productionProduct.materialsConsumed.length} different materials
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual Product Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
              Individual Product Details
              </CardTitle>
            <div className="flex gap-2">
              <Button onClick={addRow} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
                    </Button>
                  </div>
            </div>
          </CardHeader>
          <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Custom ID</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">QR Code</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Manufacturing Date</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Weight</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Thickness</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Width</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Height</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Quality Grade</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Status</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Notes</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {individualProducts.map((product, index) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'customId' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'customId')}
                        >
                          {product.customId}
                  </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2 text-sm text-gray-600">
                      {product.qrCode}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'manufacturingDate' ? (
                        <Input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'manufacturingDate')}
                        >
                          {product.manufacturingDate}
                    </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'finalWeight' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder="e.g., 600 GSM"
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'finalWeight')}
                        >
                          {product.finalWeight || "Click to edit"}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'finalThickness' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder="e.g., 11mm"
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'finalThickness')}
                        >
                          {product.finalThickness || "Click to edit"}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'finalWidth' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder="e.g., 1.83m"
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'finalWidth')}
                        >
                          {product.finalWidth || "Click to edit"}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'finalHeight' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder="e.g., 2.74m"
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'finalHeight')}
                        >
                          {product.finalHeight || "Click to edit"}
                        </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2">
                      <Select
                        value={product.qualityGrade}
                        onValueChange={(value: any) => {
                          const newData = [...individualProducts];
                          newData[index].qualityGrade = value;
                          setIndividualProducts(newData);
                          
                          // Data is automatically saved to Supabase when completing production
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border border-gray-200 p-2">
              <Select
                        value={product.status}
                        onValueChange={(value: any) => {
                          const newData = [...individualProducts];
                          newData[index].status = value;
                          setIndividualProducts(newData);
                          
                          // Data is automatically saved to Supabase when completing production
                        }}
                      >
                        <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
                    </td>
                    <td className="border border-gray-200 p-2">
                      {editingCell?.row === index && editingCell?.col === 'notes' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'notes')}
                        >
                          {product.notes || "Click to edit"}
          </div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeRow(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Complete Production */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Ready to Complete Production?</h3>
              <p className="text-sm text-gray-500">
                {individualProducts.filter(p => p.status === "available").length} products will be added to inventory
              </p>
              {(() => {
                const requiredFields = ['finalWeight', 'finalThickness', 'finalWidth', 'finalHeight', 'qualityGrade'];
                const incompleteProducts = individualProducts.filter(product => 
                  requiredFields.some(field => !product[field as keyof IndividualProduct] || product[field as keyof IndividualProduct] === "")
                );
                return incompleteProducts.length > 0 ? (
                  <div className="text-sm text-red-600 mt-1">
                    <p>⚠️ {incompleteProducts.length} products have incomplete data.</p>
                    <p className="text-xs mt-1">Missing: Final Weight, Final Thickness, Final Width, Final Height, or Quality Grade</p>
                  </div>
                ) : (
                  <p className="text-sm text-green-600 mt-1">
                    ✅ All products have complete data. Ready to complete production.
                  </p>
                );
              })()}
          </div>
            <div className="flex gap-3">
              <Button 
                onClick={skipIndividualProductDetails}
                variant="outline"
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                size="lg"
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Skip Individual Products
              </Button>
        <Button 
          onClick={handleCompleteProduction}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
          disabled={isCompleting || individualProducts.length === 0}
        >
          {isCompleting ? (
            <>
              <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Production
            </>
          )}
        </Button>
            </div>
      </div>
        </CardContent>
      </Card>

      {/* Validation Error Popup */}
      <Dialog open={showValidationPopup} onOpenChange={setShowValidationPopup}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Incomplete Product Data
            </DialogTitle>
            <DialogDescription>
              Please fill all required fields for the following products before completing production.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {validationErrors.map((error, index) => (
              <div key={error.productId} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive" className="text-xs">
                    Product #{error.index}
                  </Badge>
                  <span className="font-mono text-sm text-gray-600">{error.productId}</span>
                </div>
                <div className="text-sm text-red-700">
                  <div className="font-medium mb-1">Missing fields:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {error.missingFields.map((field, fieldIndex) => (
                      <li key={fieldIndex} className="text-red-600">
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowValidationPopup(false)}
              className="w-full"
            >
              Close and Fix Issues
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Production Completion Success Popup */}
      <Dialog open={showCompletionPopup} onOpenChange={setShowCompletionPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Production Completed Successfully!
            </DialogTitle>
            <DialogDescription>
              Your production batch has been completed and products have been added to inventory.
            </DialogDescription>
          </DialogHeader>
          
          {completionSummary && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{completionSummary.totalProducts}</div>
                  <div className="text-sm text-gray-600">Total Products</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{completionSummary.available}</div>
                  <div className="text-sm text-gray-600">Available</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{completionSummary.damaged}</div>
                  <div className="text-sm text-gray-600">Damaged</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{completionSummary.averageQuality}</div>
                  <div className="text-sm text-gray-600">Avg Quality</div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowCompletionPopup(false);
                navigate('/production');
              }}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Continue to Production
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
