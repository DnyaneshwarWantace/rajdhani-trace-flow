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
// TODO: Replace ProductionFlowService with MongoDB implementation when available
import { getProductionFlow, updateProductionStep } from "@/lib/machines";
import { Loading } from "@/components/ui/loading";
import ProductionProgressBar from "@/components/production/ProductionProgressBar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeService, IndividualProductQRData } from "@/lib/qrCode";
import { IndividualProductService } from "@/services/api/individualProductService";
import ProductService from "@/services/api/productService";
import MaterialConsumptionService from "@/services/api/materialConsumptionService";
import { ProductionService } from "@/services/api/productionService";
import { DropdownService } from "@/services/api/dropdownService";

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
    length: string;
    width: string;
    weight: string;
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
  finalWidth: string;
  finalLength: string;
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
  // Unit information for display
  weightUnit?: string;
  widthUnit?: string;
  lengthUnit?: string;
}

export default function Complete() {
  const { batchId } = useParams();
  const productId = batchId as string;
  const navigate = useNavigate();
  const [productionProduct, setProductionProduct] = useState<any>(null);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [inspector, setInspector] = useState("");
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [productionSteps, setProductionSteps] = useState<any[]>([]);
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Array<{index: number, productId: string, missingFields: string[]}>>([]);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [qualityRatings, setQualityRatings] = useState<string[]>([]);
  const [completionSummary, setCompletionSummary] = useState<{
    totalProducts: number;
    available: number;
    damaged: number;
    averageQuality: string;
  } | null>(null);

  // Load quality rating options from database
  const loadQualityRatings = async () => {
    try {
      const data = await DropdownService.getProductionDropdownData();
      const opts = data?.quality_ratings?.filter((o: any) => o.is_active !== false).map((o: any) => o.value) || [];
      if (opts.length) {
        setQualityRatings(opts as string[]);
        return;
      }
    } catch (e) {}
    setQualityRatings(["A+", "A", "B", "C", "D"]);
  };

  // Function to generate globally unique custom ID using database
  const generateGloballyUniqueCustomId = async (productName: string): Promise<string> => {
    try {
      // Create product prefix from first 3 characters
      const prefix = productName.substring(0, 3).toUpperCase();
      
      // Fallback to timestamp-based ID for MongoDB
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}-${timestamp}`;
      
    } catch (error) {
      console.warn('Error generating custom ID:', error);
      // Fallback to timestamp-based ID
      const timestamp = Date.now().toString().slice(-6);
      return `${productName.substring(0, 3).toUpperCase()}-${timestamp}`;
    }
  };

  useEffect(() => {
    if (productId) {
      loadQualityRatings();
      // Load production product data (MongoDB)
      const loadProductionData = async () => {
        try {
          console.log('🔍 Loading production data for Complete page, productId:', productId);
          
          // Load material consumption for this batch to populate materialsConsumed
          const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
            production_batch_id: productId
          });
          const rawConsumed = (consumptionResp?.data || []).map((m: any) => ({
            materialId: m.material_id,
            materialName: m.material_name || 'Unknown Material',
            quantity: m.quantity_used || 0,
            unit: m.unit || 'units',
            cost: m.total_cost || (m.cost_per_unit || 0) * (m.quantity_used || 0),
            consumedAt: m.consumed_at
          }));

          // De-duplicate by materialId+unit and sum quantities
          const aggMap = new Map<string, any>();
          rawConsumed.forEach((item) => {
            const key = `${item.materialId}__${item.unit}`;
            const existing = aggMap.get(key);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              aggMap.set(key, { ...item });
            }
          });
          const materialsConsumed = Array.from(aggMap.values());

          // Load batch to get product_id and details
          let batchData: any = null;
          try {
            const { data: batchResp, error: batchError } = await ProductionService.getProductionBatchById(productId);
            
            if (batchError) {
              console.error('❌ Error loading batch:', batchError);
            } else {
              batchData = batchResp || null;
              console.log('📦 Batch data loaded on Complete page:', batchData);
              console.log('📦 Batch size from API:', batchData?.batch_size);
              console.log('📦 Batch size type:', typeof batchData?.batch_size);
              
              // If batch_size is missing, log a warning
              if (!batchData?.batch_size && batchData?.batch_size !== 0) {
                console.warn('⚠️ WARNING: batch_size is missing or undefined in batch data!', batchData);
              }
            }
          } catch (e) {
            console.error('❌ Error loading batch:', e);
            batchData = null;
          }

          // Load product details
          let productData: any = null;
          if (batchData?.product_id) {
            try {
              const { data: prod } = await ProductService.getProductById(batchData.product_id);
              productData = prod || null;
              console.log('📦 Product data loaded:', productData);
            } catch (e) {
              console.error('❌ Error loading product:', e);
              productData = null;
            }
          }

          // Get target quantity from batch data - ensure it's a number
          // Check multiple possible field names for batch size
          const batchSize = batchData?.batch_size ?? batchData?.planned_quantity ?? batchData?.target_quantity;
          const targetQuantity = batchSize 
            ? (typeof batchSize === 'number' ? batchSize : (typeof batchSize === 'string' ? parseInt(batchSize, 10) : 1))
            : 1;
          
          console.log('✅ Setting target quantity on Complete page:', targetQuantity);
          console.log('✅ From batch_size:', batchData?.batch_size);
          console.log('✅ From planned_quantity:', batchData?.planned_quantity);
          console.log('✅ Final batchData:', batchData);
          
          if (targetQuantity === 1 && batchData) {
            console.warn('⚠️ WARNING: Target quantity is defaulting to 1 even though batch data exists!');
            console.warn('⚠️ Batch data keys:', Object.keys(batchData));
          }

          const productionProduct: ProductionProduct = {
            id: productId || 'unknown',
            productId: (batchData?.product_id) || productId || 'unknown',
            productName: (productData?.name) || (batchData?.product_name) || 'Unknown Product',
            category: productData?.category || 'Carpet',
            color: productData?.color || 'N/A',
            size: productData?.size || 'N/A',
            pattern: productData?.pattern || 'N/A',
            targetQuantity: targetQuantity, // Use calculated targetQuantity
            priority: 'normal',
            status: 'active',
            expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            materialsConsumed,
            wasteGenerated: [],
            expectedProduct: {
              name: (productData?.name) || 'Unknown Product',
              category: productData?.category || 'Carpet',
              length: productData?.length || productData?.dimensions?.length || 'N/A',
              width: productData?.width || productData?.dimensions?.width || 'N/A',
              weight: productData?.weight || 'N/A',
              materialComposition: (productData?.material_composition || productData?.materialComposition ||
                (materialsConsumed && materialsConsumed.length > 0
                  ? Array.from(new Set(materialsConsumed.map((m: any) => m.materialName))).join(', ')
                  : 'N/A')
              ),
              qualityGrade: 'A'
            },
            notes: ''
          };
          console.log('✅ Production product created with targetQuantity:', productionProduct.targetQuantity);
          setProductionProduct(productionProduct);

          // Auto-generate individual product rows based on target quantity
          // Always regenerate if the current count doesn't match target quantity
          const defaultUnits = {
            weightUnit: productData?.weight_unit || 'kg',
            widthUnit: productData?.width_unit || 'm',
            lengthUnit: productData?.length_unit || 'm'
          };
          const rowsToCreate = Math.max(1, targetQuantity || 1);
          console.log('✅ Creating', rowsToCreate, 'individual product rows based on targetQuantity:', targetQuantity);
          console.log('✅ Current individualProducts.length:', individualProducts.length);
          
          // Only regenerate if count doesn't match or if array is empty
          if (individualProducts.length !== rowsToCreate || individualProducts.length === 0) {
            console.log('✅ Regenerating individual product rows to match target quantity');
            const rows: IndividualProduct[] = Array.from({ length: rowsToCreate }).map((_, idx) => {
              // Preserve existing product data if available (for same index)
              const existingProduct = individualProducts[idx];
              return {
                id: existingProduct?.id || '', // Will be generated by backend
                qrCode: existingProduct?.qrCode || '', // Will be generated on completion
                productId: productionProduct.productId,
                customId: existingProduct?.customId || '', // Will be generated by backend to avoid duplicates
                manufacturingDate: existingProduct?.manufacturingDate || new Date().toISOString().split('T')[0],
                finalWeight: existingProduct?.finalWeight || '',
                finalWidth: existingProduct?.finalWidth || '',
                finalLength: existingProduct?.finalLength || '',
                qualityGrade: existingProduct?.qualityGrade || 'A',
                status: existingProduct?.status || 'available',
                inspector: existingProduct?.inspector || inspector || '',
                productionSteps: existingProduct?.productionSteps || [],
                notes: existingProduct?.notes || '',
                ...defaultUnits
              };
            });
            console.log('✅ Setting', rows.length, 'individual product rows');
            setIndividualProducts(rows);
          } else {
            console.log('✅ Individual products count already matches target quantity, keeping existing rows');
          }
          
          // Load flow and steps for accurate stage statuses
          try {
            const { data: flow } = await ProductionService.getProductionFlowByBatchId(productId);
            if (flow) {
              setProductionFlow(flow);
              const { data: steps } = await ProductionService.getProductionFlowSteps(flow.id);
              
              // Extract inspector name from first machine operation step
              const inspectorName = steps?.find((step: any) => step.step_type === 'machine_operation' && step.inspector_name)?.inspector_name || '';
              if (inspectorName) {
                setInspector(inspectorName);
                console.log('✅ Extracted inspector name from production steps:', inspectorName);
                
                // Update existing individual products with inspector name if they don't have one
                setIndividualProducts(prev => prev.map(ip => ({
                  ...ip,
                  inspector: ip.inspector || inspectorName
                })));
              }
              setProductionSteps(steps || []);

              // Ensure wastage step is completed for Complete page
              const wasteStep = (steps || []).find((s: any) => s.step_type === 'wastage_tracking');
              if (wasteStep && wasteStep.status !== 'completed') {
                try {
                  await ProductionService.updateProductionFlowStep(wasteStep.id, {
                    status: 'completed',
                    end_time: new Date().toISOString(),
                    notes: 'Auto-marked completed on Complete page'
                  } as any);
                  wasteStep.status = 'completed';
                  setProductionSteps([...(steps || [])]);
                } catch (e) {
                  console.error('Error auto-completing waste step:', e);
                }
              } else if (!wasteStep) {
                try {
                  await ProductionService.createProductionFlowStep({
                    flow_id: flow.id,
                    step_name: 'Waste Generation',
                    step_type: 'wastage_tracking',
                    status: 'completed',
                    order_index: ((steps || []).length || 0) + 1,
                    inspector_name: 'System'
                  });
                  const { data: refreshed } = await ProductionService.getProductionFlowSteps(flow.id);
                  setProductionSteps(refreshed || []);
                } catch (e) {
                  console.error('Error creating waste step on Complete page:', e);
                }
              }
            } else {
              setProductionFlow(null);
              setProductionSteps([]);
            }
          } catch (e) {
            console.error('Error loading flow/steps for Complete page:', e);
            setProductionFlow(null);
            setProductionSteps([]);
          }

          // Recipe/material UI loading removed for this stage status fix
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
              length: '',
              width: '',
              weight: '',
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
  }, [productId, inspector]);

  const handleCellClick = (rowIndex: number, field: keyof IndividualProduct) => {
    setEditingCell({ row: rowIndex, col: field });
    setEditValue(String(individualProducts[rowIndex][field] || ""));
  };

  const handleCellSave = () => {
    if (editingCell) {
      const newData = [...individualProducts];
      const { row, col } = editingCell;
      
      let valueToSave = editValue;
      
      // Auto-append units based on field type if user didn't include them
      if (productionProduct?.expectedProduct) {
        const baseProduct = productionProduct.expectedProduct;
        
        if (col === 'finalWeight' && valueToSave && !valueToSave.includes('GSM') && !valueToSave.includes('kg')) {
          // Extract unit from base weight (e.g., "400 GSM" -> "GSM")
          const baseWeight = baseProduct.weight || '';
          const weightUnit = baseWeight.includes('GSM') ? 'GSM' : baseWeight.includes('kg') ? 'kg' : 'GSM';
          valueToSave = `${valueToSave.trim()} ${weightUnit}`;
        } else if (col === 'finalWidth' && valueToSave && !valueToSave.includes('m') && !valueToSave.includes('feet')) {
          // Extract unit from base width
          const baseWidth = baseProduct.width || '';
          const widthUnit = baseWidth.includes('feet') ? 'feet' : 'm';
          valueToSave = `${valueToSave.trim()} ${widthUnit}`;
        } else if (col === 'finalLength' && valueToSave && !valueToSave.includes('m') && !valueToSave.includes('feet')) {
          // Extract unit from base length
          const baseLength = baseProduct.length || '';
          const lengthUnit = baseLength.includes('feet') ? 'feet' : 'm';
          valueToSave = `${valueToSave.trim()} ${lengthUnit}`;
        }
      }
      
      newData[row] = { ...newData[row], [col]: valueToSave };
      setIndividualProducts(newData);
      
      // Data is automatically saved to MongoDB when completing production
      
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const addRow = async () => {
    // Use production steps from state
    const completedSteps = productionSteps.filter(s => s.status === 'completed').map(step => ({
      stepName: step.step_name,
      machineUsed: step.machine_id || 'Unknown',
      inspector: step.inspector_name || 'Unknown',
      completedAt: step.end_time || '',
      qualityNotes: step.notes || ''
    }));
    
    // Get inspector name from production steps if not already set
    const currentInspector = inspector || completedSteps.find(s => s.inspector && s.inspector !== 'Unknown')?.inspector || '';

    const newProduct: IndividualProduct = {
      id: '', // backend-generated on save
      qrCode: '', // generated on completion
      productId: productionProduct.productId,
      customId: '', // backend-generated unique custom ID
      manufacturingDate: new Date().toISOString().split('T')[0],
      finalWeight: "",
      finalWidth: "",
      finalLength: "",
      qualityGrade: "A" as const,
      status: "available" as const,
      inspector: currentInspector,
      inspectorId: '',
      productionSteps: completedSteps,
      notes: ""
    };
      const updatedProducts = [...individualProducts, newProduct];
      setIndividualProducts(updatedProducts);
      
      // Data is automatically saved to MongoDB when completing production
  };

  const removeRow = (index: number) => {
    const productToRemove = individualProducts[index];
    const updatedProducts = individualProducts.filter((_, i) => i !== index);
    setIndividualProducts(updatedProducts);
    
    // Data is automatically saved to MongoDB when completing production
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
      const requiredFields = ['finalWeight', 'finalWidth', 'finalLength', 'qualityGrade'];
      const fieldLabels = {
      'finalWeight': 'Final Weight', 
      'finalWidth': 'Final Width',
      'finalLength': 'Final Length',
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
    const createdIds: string[] = [];
    for (const individualProduct of individualProducts) {
      try {
        // Generate a QR code only on completion
        const individualProductQRCode = IDGenerator.generateQRCode();

        // Create placeholder individual product (bulk API with quantity 1)
        const result = await IndividualProductService.createIndividualProducts(
          individualProduct.productId,
          1,
          {
            batch_number: productId,
            quality_grade: individualProduct.qualityGrade,
            inspector: individualProduct.inspector || inspector || '', // Pass inspector name
            notes: individualProduct.notes
          }
        );
        
        if (result.error) {
          console.error(`❌ Error creating individual product ${individualProduct.id}:`, result.error);
          throw new Error(`Failed to create individual product: ${result.error}`);
        }

        // Get created item id from bulk API response
        // Bulk API returns: { data: { individual_products: [{id, qr_code, ...}] } }
        const bulkData = result.data;
        const createdItems = bulkData?.individual_products || [];
        const createdId = createdItems[0]?.id;
        
        console.log(`🔍 Bulk API response:`, { bulkData, createdItems, createdId });
        
        if (createdId) {
          createdIds.push(createdId);
          
          console.log(`📝 Updating individual product ${createdId} with final details...`);
          console.log(`   Final Weight: ${individualProduct.finalWeight}`);
          console.log(`   Final Width: ${individualProduct.finalWidth}`);
          console.log(`   Final Length: ${individualProduct.finalLength}`);
          
          // Update final fields and QR code, inspector, status, and batch number
          const updateResult = await IndividualProductService.updateIndividualProduct(createdId, {
            final_weight: individualProduct.finalWeight,
            final_width: individualProduct.finalWidth,
            final_length: individualProduct.finalLength,
            quality_grade: individualProduct.qualityGrade,
            status: individualProduct.status as any,
            production_date: individualProduct.manufacturingDate,
            inspector: individualProduct.inspector,
            notes: individualProduct.notes,
          } as any);
          
          console.log(`✅ Updated individual product ${createdId} with final details:`, {
            final_weight: individualProduct.finalWeight,
            final_width: individualProduct.finalWidth,
            final_length: individualProduct.finalLength,
            updateResult
          });
        } else {
          console.error(`❌ No createdId found! result.data:`, result.data);
        }
        
        console.log(`✅ Created individual product "${productionProduct.productName}" with QR code: ${individualProductQRCode}`);
      } catch (error) {
        console.error(`Error creating individual product ${individualProduct.id}:`, error);
        // Continue with other products even if one fails
      }
    }

    // Persist created IDs for this batch so summary can show only these
    try {
      if (createdIds.length > 0) {
        sessionStorage.setItem(`batch-created-individuals-${productId}`, JSON.stringify(createdIds));
      }
    } catch {}

    // Individual products are saved to MongoDB database only

    // Update main product inventory in MongoDB
    try {
      const availableCount = individualProducts.filter(p => p.status === "available").length;
      const damagedCount = individualProducts.filter(p => p.status === "damaged").length;
      
      console.log(`📊 Production completed: ${availableCount} available, ${damagedCount} damaged products`);
      
      // Update product base_quantity in MongoDB
      const { data: currentProduct, error: productError } = await ProductService.getProductById(productionProduct.productId);
      
      if (currentProduct && !productError) {
        const newQuantity = (currentProduct.base_quantity || 0) + availableCount;
        const newStatus = newQuantity <= 0 ? 'out-of-stock' : 
                                              newQuantity <= 5 ? 'low-stock' : 'in-stock';
      
        await ProductService.updateProduct(productionProduct.productId, {
          base_quantity: newQuantity,
          status: newStatus
        });
        
        console.log(`✅ Updated product base_quantity: ${currentProduct.base_quantity} → ${newQuantity} (${newStatus})`);
        console.log(`✅ Production completed successfully! ${availableCount} individual products added to inventory.`);
        console.log(`✅ Both individual products created AND base_quantity increased.`);
      } else {
        console.warn('⚠️ Could not update product base_quantity in MongoDB:', productError);
        console.warn('⚠️ Individual products were created but base_quantity could not be updated.');
      }

      // Mark batch as completed in backend with actual completion timestamp
      try {
        await ProductionService.updateProductionBatch(productId, {
          status: 'completed' as any,
          completion_date: new Date().toISOString() // Set actual completion date to NOW
        });
        console.log('✅ Production batch marked as completed with timestamp:', new Date().toISOString());
        // Navigate back to Production to refresh list/status
        navigate('/production', { replace: true });
      } catch (e) {
        console.error('❌ Error updating production batch status:', e);
      }

      // Optionally update flow status if available
      try {
        if (productionFlow?.id) {
          // There is no dedicated updateProductionFlow in service; skipping for now
          // Steps are already persisted; batch status drives UI
        }
      } catch {}
    } catch (error) {
      console.error('❌ Error updating product inventory:', error);
      console.error('❌ Individual products were created but there was an error updating inventory.');
    }

    // Mark production as completed (local state only)
    console.log('✅ Production completed locally');

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

  // Get inspector name from first machine operation step
  const inspectorName = productionSteps
    .find((step: any) => step.step_type === 'machine_operation' && step.inspector_name)?.inspector_name || '';

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Complete Production"
        subtitle={`Final product creation for ${productionProduct.productName}${inspectorName ? ` • Inspector: ${inspectorName}` : ''}`}
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
                  // Inspector name is saved to MongoDB when completing production
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
              <Label className="text-sm text-gray-500">Expected Length</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.length || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Expected Width</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.width || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Expected Weight</Label>
              <p className="font-medium text-gray-900">{productionProduct.expectedProduct.weight || 'N/A'}</p>
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
                            {material.materialType && `${material.materialType} • `}
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
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Manufacturing Date</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Weight</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Width</th>
                  <th className="border border-gray-200 p-2 text-left text-sm font-medium">Final Length</th>
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
                          placeholder={`e.g., 2 ${product.weightUnit || 'kg'}`}
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
                      {editingCell?.row === index && editingCell?.col === 'finalWidth' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder={`e.g., 4 ${product.widthUnit || 'feet'}`}
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
                      {editingCell?.row === index && editingCell?.col === 'finalLength' ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellSave}
                          onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                          autoFocus
                          placeholder={`e.g., 3 ${product.lengthUnit || 'feet'}`}
                        />
                      ) : (
                        <div
                          className="cursor-pointer p-1 hover:bg-blue-50 rounded"
                          onClick={() => handleCellClick(index, 'finalLength')}
                        >
                          {product.finalLength || "Click to edit"}
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
                          
                          // Data is automatically saved to MongoDB when completing production
                        }}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {qualityRatings.map(rating => (
                            <SelectItem key={rating} value={rating}>
                              {rating}
                            </SelectItem>
                          ))}
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
                          
                          // Data is automatically saved to MongoDB when completing production
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
                const requiredFields = ['finalWeight', 'finalWidth', 'finalLength', 'qualityGrade'];
                if (individualProducts.length === 0) {
                  return (
                    <div className="text-sm text-red-600 mt-1">
                      <p>⚠️ No individual product rows added. Please add at least 1 row.</p>
                    </div>
                  );
                }
                const incompleteProducts = individualProducts.filter(product => 
                  requiredFields.some(field => !product[field as keyof IndividualProduct] || product[field as keyof IndividualProduct] === "")
                );
                return incompleteProducts.length > 0 ? (
                  <div className="text-sm text-red-600 mt-1">
                    <p>⚠️ {incompleteProducts.length} products have incomplete data.</p>
                    <p className="text-xs mt-1">Missing: Final Weight, Final Width, Final Length, or Quality Grade</p>
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
