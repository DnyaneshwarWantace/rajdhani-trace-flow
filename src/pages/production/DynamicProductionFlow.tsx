import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Factory, Plus, Play, Pause, CheckCircle,
  Clock, User, Settings, ArrowRight, AlertTriangle, RefreshCw,
  Search, Package
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import ProductService from "@/services/api/productService";
import { MachineService, Machine } from "@/services/api/machineService";
import { ProductionService } from "@/services/api/productionService";
import { RawMaterialService } from "@/services/api/rawMaterialService";
import MaterialConsumptionService from "@/services/api/materialConsumptionService";
import AuthService from "@/services/api/authService";


interface ProductionStep {
  id: string;
  stepNumber: number;
  name: string;
  description: string;
  machineId: string;
  machineName: string;
  status: 'pending' | 'in_progress' | 'completed';
  startTime?: string;
  endTime?: string;
  inspector: string;
  stepType: 'material_selection' | 'machine_operation' | 'wastage_tracking' | 'testing_individual';
}

interface ProductionFlow {
  id: string;
  production_product_id: string;
  flow_name: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export default function DynamicProductionFlow() {
  const { batchId } = useParams(); // This is the production batch ID
  const navigate = useNavigate();
  const location = useLocation();

  // Core state
  const [productionProduct, setProductionProduct] = useState<any>(null);
  const [productionFlow, setProductionFlow] = useState<ProductionFlow | null>(null);
  const [productionSteps, setProductionSteps] = useState<ProductionStep[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Dialog states
  const [showAddMachineDialog, setShowAddMachineDialog] = useState(false);
  const [showAddMaterialDialog, setShowAddMaterialDialog] = useState(false);

  // Form states
  const [newMachineForm, setNewMachineForm] = useState({
    name: '',
    machine_type: '',
    description: ''
  });

  // Material addition states
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [additionalQuantity, setAdditionalQuantity] = useState(1);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');

  // Material consumption states
  const [materialConsumption, setMaterialConsumption] = useState<any[]>([]);
  const [showMaterialConsumptionDialog, setShowMaterialConsumptionDialog] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState('');
  const [editingQuantity, setEditingQuantity] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadInitialData();
    
    // Cleanup function to clear sessionStorage when component unmounts or batchId changes
    return () => {
      if (batchId) {
        sessionStorage.removeItem(`production-flow-${batchId}`);
        console.log('🧹 Cleaned up sessionStorage for batch:', batchId);
      }
    };
  }, [batchId]);

  // Refresh steps when page becomes visible (in case machine was added from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && productionFlow) {
        loadProductionSteps();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [productionFlow]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // IMPORTANT: Clear all previous batch data to prevent mixing batches
      setProductionSteps([]);
      setMaterialConsumption([]);
      setProductionProduct(null);
      
      console.log('🔍 Loading production data for batch ID:', batchId);

      // Check if we have flow data from navigation state (passed from ProductionDetail)
      let navigationState = location.state as any;
      console.log('🔍 Navigation state:', navigationState);
      console.log('🔍 Navigation state type:', typeof navigationState);
      console.log('🔍 Has flow?', navigationState?.flow);
      console.log('🔍 Has productionProduct?', navigationState?.productionProduct);

      // If no navigation state, try sessionStorage as fallback
      if (!navigationState?.flow && batchId) {
        const storedData = sessionStorage.getItem(`production-flow-${batchId}`);
        if (storedData) {
          console.log('✅ Found flow data in sessionStorage for batch:', batchId);
          navigationState = JSON.parse(storedData);
          // IMPORTANT: Clean up after reading to prevent reusing old data
          sessionStorage.removeItem(`production-flow-${batchId}`);
          // Also clear any other old flow data
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('production-flow-') && key !== `production-flow-${batchId}`) {
              sessionStorage.removeItem(key);
              console.log('🧹 Cleared old sessionStorage key:', key);
            }
          });
        }
      }

      let flow: any = null;
      let productionProductFromState = null;
      let initialStep = null;

      if (navigationState?.flow) {
        console.log('✅ Using flow from navigation state:', navigationState.flow);
        flow = navigationState.flow;
        productionProductFromState = navigationState.productionProduct;
        initialStep = navigationState.initialStep;
        console.log('✅ Initial machine step from navigation:', initialStep);
      } else {
        console.log('⚠️ No navigation state found, loading from MongoDB');
        // Load production flow from MongoDB using the batch ID
        try {
          // Try to get flow by batch ID first (production_product_id matches batch ID)
          const { data: loadedFlow, error: flowError } = await ProductionService.getProductionFlowByBatchId(batchId);
          
          if (flowError || !loadedFlow) {
            // If not found by batch ID, try by flow ID
            console.log('⚠️ Flow not found by batch ID, trying flow ID:', batchId);
            const { data: flowById, error: flowByIdError } = await ProductionService.getProductionFlowById(batchId);
            
            if (flowByIdError || !flowById) {
              console.warn('⚠️ Production flow not found in MongoDB for batch ID:', batchId);
              flow = null;
            } else {
              console.log('✅ Production flow loaded from MongoDB by flow ID:', flowById);
              flow = flowById;
            }
          } else {
            console.log('✅ Production flow loaded from MongoDB:', loadedFlow);
            flow = loadedFlow;
          }
        } catch (error) {
          console.error('❌ Error loading production flow from MongoDB:', error);
          flow = null;
        }
      }

      // Fallback: create a minimal flow so the page can operate without backend flow persistence
      if (!flow) {
        console.warn('⚠️ No production flow found for batch. Creating a temporary in-memory flow.');
        flow = {
          id: batchId,
          production_product_id: batchId,
          flow_name: `Production Flow - Batch ${batchId}`,
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      setProductionFlow(flow);

      // Load raw materials for additional material addition
      await loadRawMaterials();

      // Load material consumption data (pass flow directly since state might not be updated yet)
      await loadMaterialConsumption(flow);

      // Debug: Check all material consumption records
      await debugMaterialConsumption();

      // If we have production product from navigation state, use it directly
      if (productionProductFromState) {
        console.log('✅ Using production product from navigation state:', productionProductFromState);
        setProductionProduct(productionProductFromState);

        // If we have an initial machine step, add it to the production steps
        if (initialStep) {
          console.log('✅ Adding initial machine step to production steps');
          const transformedStep: ProductionStep = {
            id: initialStep.id,
            stepNumber: initialStep.order_index || 1,
            name: initialStep.step_name,
            description: initialStep.notes || '',
            machineId: initialStep.machine_id || '',
            machineName: initialStep.step_name.replace(' Operation', ''),
            status: 'pending',
            inspector: initialStep.inspector_name || '',
            stepType: 'machine_operation'
          };
          setProductionSteps([transformedStep]);
          console.log('✅ Initial machine step set:', transformedStep);
        }

        setIsLoading(false);
        return;
      }

      // Otherwise, try to get product ID from production batch
      // First try to get product from production batch
      let productData = null;
      let batchData = null;
      try {
        // Load batch by ID directly
        const { data: batch, error: batchError } = await ProductionService.getProductionBatchById(batchId);
        
        if (!batchError && batch) {
          batchData = batch;
          console.log('✅ Found batch data:', batchData);
          
          if (batch.product_id) {
            // Load product by ID
            const { data: product } = await ProductService.getProductById(batch.product_id);
            if (product) {
              productData = product;
              console.log('✅ Found product data from batch:', productData);
            }
          }
        } else {
          // Fallback: try to get production batch from list
          const { data: batches, error: batchListError } = await ProductionService.getProductionBatches({
          // We can't filter by batch ID directly, so we'll need to get all and filter
        });
        
          if (!batchListError && batches) {
          const batch = batches.find((b: any) => b.id === batchId);
            if (batch) {
              batchData = batch;
              if (batch.product_id) {
            // Load product by ID
            const { data: product } = await ProductService.getProductById(batch.product_id);
            if (product) {
              productData = product;
                  console.log('✅ Found product data from batch list:', productData);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading product from batch:', error);
      }

      // Fallback: try to extract product name from flow name if batch lookup failed
      if (!productData) {
        const flowName = flow.flow_name || '';
        // Flow name format: "Product Name Production Flow - Batch BATCH-xxx"
        // Try different patterns
        let productName = flowName.replace(' Production Flow - Batch BATCH-', ' - ').split(' - ')[0];
        if (productName === flowName) {
          // Try with PRO- prefix
          productName = flowName.replace(' Production Flow - Batch PRO-', ' - ').split(' - ')[0];
        }
        if (productName === flowName) {
          // Try just removing " Production Flow" from end
          productName = flowName.replace(' Production Flow - Batch', '').trim();
        }

        console.log('🔍 Extracted product name from flow:', productName);

        // Load the actual product data from database using the product name
        const { data: products, error: productsError } = await ProductService.getProducts();

        if (productsError) {
          console.error('❌ Error loading product data:', productsError);
          setIsLoading(false);
          return;
        }

        productData = products?.find(p => p.name === productName);
        if (!productData) {
          console.error('❌ No product found with name:', productName);
          console.warn('⚠️ Continuing without product data - some features may not work');
          // Don't return - use flow data as fallback
        } else {
          console.log('✅ Found product data:', productData);
        }
      }

      // Create production product from flow and product data (or use minimal data if product not found)
      // Use batch_size from batchData if available
      const targetQuantity = batchData?.batch_size || 1;
      
      if (productData) {
        const productionProduct = {
          id: batchId, // Use the batch ID
          productId: productData.id, // Use the actual product ID
          productName: productData.name,
          category: productData.category,
          color: productData.color || 'N/A',
          size: productData.length && productData.width ? `${productData.length} x ${productData.width}` : 'N/A',
          pattern: productData.pattern || 'N/A',
          targetQuantity: targetQuantity, // Use batch_size from database
          priority: 'normal' as const,
          status: 'active' as const,
          expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: flow.created_at || new Date().toISOString(),
          materialsConsumed: [],
          wasteGenerated: [],
          expectedProduct: {
            name: productData.name,
            category: productData.category,
            length: productData.length || 'N/A',
            width: productData.width || 'N/A',
            weight: productData.weight || 'N/A',
            materialComposition: 'N/A',
            qualityGrade: 'A'
          },
          notes: ''
        };
        
        setProductionProduct(productionProduct);
        console.log('✅ Created production product from flow and database data:', productionProduct);
        console.log('✅ Target quantity from batch:', targetQuantity);
      } else {
        // Create minimal production product from flow data only
        const flowName = flow.flow_name || '';
        const extractedProductName = flowName.replace(' Production Flow - Batch', '').split(' - ')[0].trim();
        
        const productionProduct = {
          id: batchId,
          productId: batchId, // Fallback to batch ID
          productName: extractedProductName || 'Unknown Product',
          category: 'Unknown',
          color: 'N/A',
          size: 'N/A',
          pattern: 'N/A',
          targetQuantity: targetQuantity, // Use batch_size from database
          priority: 'normal' as const,
          status: 'active' as const,
          expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: flow.created_at || new Date().toISOString(),
          materialsConsumed: [],
          wasteGenerated: [],
          expectedProduct: {
            name: extractedProductName || 'Unknown Product',
            category: 'Unknown',
            length: 'N/A',
            width: 'N/A',
            weight: 'N/A',
            materialComposition: 'N/A',
            qualityGrade: 'A'
          },
          notes: ''
        };
        
        setProductionProduct(productionProduct);
        console.log('⚠️ Created minimal production product from flow data only:', productionProduct);
        console.log('✅ Target quantity from batch:', targetQuantity);
      }

        // Load production steps for this flow
        if (flow) {
          console.log('Loading production steps for flow_id:', flow.id);
          
          // Load production flow steps from MongoDB
          const { data: stepsData, error: stepsError } = await ProductionService.getProductionFlowSteps(flow.id);
          
          console.log('Production steps query result:', { stepsData, stepsError });
          
          if (stepsError) {
            console.error('Error loading production steps:', stepsError);
          } else if (stepsData && stepsData.length > 0) {
            // Transform MongoDB steps to UI format
            const transformedSteps = stepsData.map((step: any) => ({
              id: step.id,
              stepNumber: step.order_index || step.step_order || 1,
              name: step.step_name || step.name || 'Unknown Step',
              description: step.notes || step.description || getMachineDescription(step.step_name || step.name),
              machineId: step.machine_id || step.machineId || '',
              machineName: step.step_name ? step.step_name.replace(' Operation', '') : (step.machine_name || 'Unknown Machine'),
              status: (step.status === 'completed' ? 'completed' :
                      step.status === 'in_progress' ? 'in_progress' : 
                      step.status === 'pending' ? 'pending' : 'pending') as 'pending' | 'in_progress' | 'completed',
              startTime: step.start_time || step.startTime,
              endTime: step.end_time || step.endTime,
              inspector: step.inspector_name || step.inspector || '',
              stepType: (step.step_type || step.stepType || 'machine_operation') as 'machine_operation'
            }));
            
            // Sort by order_index
            transformedSteps.sort((a: any, b: any) => a.stepNumber - b.stepNumber);
            
            setProductionSteps(transformedSteps);
            console.log('✅ Loaded production steps:', transformedSteps);
          } else {
            console.log('⚠️ No production steps found for flow');
            setProductionSteps([]);
          }
        } // Close the if (flow) block
    } catch (error) {
      console.error('Error loading production flow:', error);
    } finally {
      // Load machines from Supabase
      await loadMachines();
      setIsLoading(false);
      console.log('✅ Initial data loading completed');
    }
  };

  const loadMachines = async () => {
    try {
      const { data: machinesData, error } = await MachineService.getMachines();
      if (error) {
        console.error('Error loading machines:', error);
        setMachines([]);
      } else {
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
      }
    } catch (error) {
      console.error('Error loading machines:', error);
      setMachines([]);
    }
  };


  const loadProductionSteps = async () => {
    if (!productionFlow) {
      console.log('❌ No production flow available for loading steps');
      return;
    }

    try {
      console.log('🔄 Loading production steps for flow_id:', productionFlow.id);
      
      // Load production flow steps from MongoDB
      const { data: stepsData, error: stepsError } = await ProductionService.getProductionFlowSteps(productionFlow.id);
      
      if (stepsError) {
        console.error('Error loading production steps:', stepsError);
        setProductionSteps([]);
        return;
      }
      
      if (stepsData && stepsData.length > 0) {
        // Transform MongoDB steps to UI format
        const transformedSteps = stepsData.map((step: any) => ({
          id: step.id,
          stepNumber: step.order_index || step.step_order || 1,
          name: step.step_name || step.name || 'Unknown Step',
          description: step.notes || step.description || getMachineDescription(step.step_name || step.name),
          machineId: step.machine_id || step.machineId || '',
          machineName: step.step_name ? step.step_name.replace(' Operation', '') : (step.machine_name || 'Unknown Machine'),
          status: (step.status === 'completed' ? 'completed' :
                  step.status === 'in_progress' ? 'in_progress' : 
                  step.status === 'pending' ? 'pending' : 'pending') as 'pending' | 'in_progress' | 'completed',
          startTime: step.start_time || step.startTime,
          endTime: step.end_time || step.endTime,
          inspector: step.inspector_name || step.inspector || '',
          stepType: (step.step_type || step.stepType || 'machine_operation') as 'machine_operation'
        }));
        
        // Sort by order_index
        transformedSteps.sort((a: any, b: any) => a.stepNumber - b.stepNumber);
        
        setProductionSteps(transformedSteps);
        console.log('✅ Loaded production steps:', transformedSteps);
      } else {
        console.log('⚠️ No production steps found for flow');
        setProductionSteps([]);
      }
    } catch (error) {
      console.error('Error in loadProductionSteps:', error);
      setProductionSteps([]);
    }
  };


  const updateStepStatus = async (stepId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      // Find the current step
      const currentStep = productionSteps.find(step => step.id === stepId);
      if (!currentStep) {
        console.error('Step not found:', stepId);
        return;
      }

      // Validate step progression
      if (newStatus === 'in_progress') {
        // Check if previous steps are completed
        const previousSteps = productionSteps.filter(step => step.stepNumber < currentStep.stepNumber);
        const incompletePreviousSteps = previousSteps.filter(step => step.status !== 'completed');
        
        if (incompletePreviousSteps.length > 0) {
          alert(`⚠️ Cannot start this step. Please complete the previous steps first:\n${incompletePreviousSteps.map(s => s.name).join(', ')}`);
          return;
        }
      }

      if (newStatus === 'completed') {
        // Check if the step is currently in progress
        if (currentStep.status !== 'in_progress') {
          alert(`⚠️ Cannot complete this step. Please start the step first.`);
          return;
        }
      }

      // Persist update to MongoDB
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'in_progress') updatePayload.start_time = new Date().toISOString();
      if (newStatus === 'completed') updatePayload.end_time = new Date().toISOString();

      const { error } = await ProductionService.updateProductionFlowStep(stepId, updatePayload);
      if (error) {
        console.error('Error updating step status in MongoDB:', error);
      }

      // Update local state instead of reloading entire data
      setProductionSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? {
                ...step,
                status: newStatus,
                startTime: newStatus === 'in_progress' ? new Date().toISOString() : step.startTime,
                endTime: newStatus === 'completed' ? new Date().toISOString() : step.endTime
              }
            : step
        )
      );

      // Ensure Production page sees updated state; reload steps from backend for accuracy
      await loadProductionSteps();

      console.log('Step status updated:', { stepId, newStatus });
    } catch (error) {
      console.error('Error updating step status:', error);
    }
  };

  const addNewMachine = async () => {
    if (!newMachineForm.name.trim()) {
      console.error('Machine name is required');
      return;
    }

    try {
      if (!newMachineForm.machine_type.trim()) {
        alert('Machine type is required');
        return;
      }

      // Add to MongoDB
      const { data: newMachine, error } = await MachineService.createMachine({
        machine_name: newMachineForm.name.trim(),
        machine_type: newMachineForm.machine_type.trim(),
        notes: newMachineForm.description.trim() || ""
      });

      if (error) {
        throw new Error(error);
      }

      // Reload machines from MongoDB
      await loadMachines();

      setNewMachineForm({ name: '', machine_type: '', description: '' });
      setShowAddMachineDialog(false);

      console.log('Machine added successfully:', newMachine);
    } catch (error) {
      console.error('Error adding machine:', error);
      alert('Failed to add machine. Please try again.');
    }
  };

  const goToWasteGeneration = () => {
    // batchId is the production batch ID
    navigate(`/production/${batchId}/waste-generation`);
  };

  // Load raw materials for additional material addition
  const loadRawMaterials = async () => {
    try {
      const { data, error } = await RawMaterialService.getRawMaterials();
      if (error) {
        console.error('Error loading raw materials:', error);
        return;
      }
      setRawMaterials(data || []);
    } catch (error) {
      console.error('Error loading raw materials:', error);
    }
  };

  // Load material consumption data
  const loadMaterialConsumption = async (flowOverride?: any) => {
    if (!batchId) return;
    
    // Use flowOverride if provided, otherwise use productionFlow from state
    const flowToUse = flowOverride || productionFlow;
    
    try {
      console.log('🔍 Loading material consumption for batch ID:', batchId);
      console.log('🔍 Production flow data:', flowToUse);
      
      // Try loading by batch ID first, then by flow ID if flow is available
      let consumption: any = null;
      let error: string | null = null;
      
      // First try to get by batch ID
      const batchResult = await MaterialConsumptionService.getMaterialConsumption({
        production_batch_id: batchId
      });
      
      if (!batchResult.error && batchResult.data && batchResult.data.data && batchResult.data.data.length > 0) {
        consumption = batchResult.data;
        console.log('📦 Material consumption loaded by batch ID:', consumption);
      } else if (flowToUse?.id) {
        // If no results by batch ID, try by flow ID
        console.log('🔍 No results by batch ID, trying flow ID:', flowToUse.id);
        const flowResult = await MaterialConsumptionService.getMaterialConsumption({
          production_flow_id: flowToUse.id
        });
        
        if (!flowResult.error && flowResult.data) {
          consumption = flowResult.data;
          console.log('📦 Material consumption loaded by flow ID:', consumption);
        } else {
          error = flowResult.error || 'No material consumption found';
        }
      } else {
        consumption = batchResult.data;
        console.log('📦 Material consumption query result:', consumption);
      }
      
      if (error) {
        console.error('Error loading material consumption:', error);
        setMaterialConsumption([]);
      } else {
        setMaterialConsumption(consumption?.data || []);
      }
    } catch (error) {
      console.error('Error loading material consumption:', error);
      setMaterialConsumption([]);
    }
  };

  // Add additional material during production
  const addAdditionalMaterial = async () => {
    if (!selectedMaterialId || additionalQuantity <= 0) {
      console.error('Please select a material and enter quantity');
      return;
    }

    const selectedMaterial = rawMaterials.find(m => m.id === selectedMaterialId);
    if (!selectedMaterial) {
      console.error('Selected material not found');
      return;
    }

    // Check if material has sufficient stock
    if (selectedMaterial.current_stock < additionalQuantity) {
      console.error(`Insufficient stock. Available: ${selectedMaterial.current_stock}, Required: ${additionalQuantity}`);
      return;
    }

    try {
      // Record material consumption for this production batch
      // Each stage creates new consumption records for tracking
      const currentStep = productionSteps.length > 0 ? productionSteps[productionSteps.length - 1] : null;
      const { data: result, error } = await MaterialConsumptionService.createMaterialConsumption({
        production_batch_id: batchId,
        production_flow_id: productionFlow?.id,
        material_id: selectedMaterialId,
        material_name: selectedMaterial.name,
        material_type: selectedMaterial.material_type || 'raw_material',
        quantity_used: additionalQuantity,
        unit: selectedMaterial.unit,
        operator: 'Production Operator',
        machine_id: currentStep?.machineId,
        step_name: currentStep ? `Machine Step ${currentStep.stepNumber}: ${currentStep.name}` : 'Machine Operation',
        notes: `Material consumed at MACHINE OPERATION stage for production batch ${batchId} - Quantity modified during production`
      });

      if (error) {
        console.error('Error recording material consumption:', error);
        return;
      }

      console.log(`✅ Added ${additionalQuantity} ${selectedMaterial.unit} of ${selectedMaterial.name} to production`);
      
      // Reset form
      setSelectedMaterialId('');
      setAdditionalQuantity(1);
      setShowAddMaterialDialog(false);
      
      // Reload materials to reflect updated stock
      await loadRawMaterials();
      
      // Reload material consumption to show the new addition
      await loadMaterialConsumption();
      
    } catch (error) {
      console.error('Error adding additional material:', error);
    }
  };

  // Update material consumption quantity
  const updateMaterialConsumption = async (materialId: string, newQuantity: number) => {
    try {
      console.log('🔄 Updating material consumption:', { materialId, newQuantity });
      
      const { data: result, error } = await MaterialConsumptionService.updateMaterialConsumption(materialId, {
        quantity_used: newQuantity,
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.error('Error updating material consumption:', error);
        return;
      }
      
      console.log('✅ Material consumption updated successfully');
      
      // Reload material consumption data
      await loadMaterialConsumption();
      
      // Close dialog
      setShowMaterialConsumptionDialog(false);
      setEditingMaterialId('');
      setEditingQuantity(0);
      
    } catch (error) {
      console.error('Error updating material consumption:', error);
    }
  };

  // Open material consumption edit dialog
  const openMaterialEditDialog = (material: any) => {
    setEditingMaterialId(material.id);
    setEditingQuantity(material.quantity_used || material.consumed_quantity || 0);
    setShowMaterialConsumptionDialog(true);
  };

  // Debug function to check all material consumption records
  const debugMaterialConsumption = async () => {
    try {
      console.log('🔍 DEBUG: Checking all material consumption records...');
      
      const { data: allRecords, error } = await MaterialConsumptionService.getMaterialConsumption({
        limit: 10
      });
      
      if (error) {
        console.error('❌ Error fetching all material consumption records:', error);
        return;
      }
      
      console.log('🔍 DEBUG: All material consumption records:', allRecords);
      console.log('🔍 DEBUG: Current batch ID:', batchId);
      console.log('🔍 DEBUG: Current flow ID:', productionFlow?.id);
      
      const records = allRecords?.data || [];
      
      // Check if any records match our batch ID
      const matchingRecords = records.filter(record => 
        record.production_batch_id === batchId
      );
      
      console.log('🔍 DEBUG: Records matching batch ID:', matchingRecords);
      
      // Check if any records match our flow ID
      const flowMatchingRecords = records.filter(record => 
        record.production_flow_id === productionFlow?.id
      );
      
      console.log('🔍 DEBUG: Records matching flow ID:', flowMatchingRecords);
      
    } catch (error) {
      console.error('❌ Error in debug function:', error);
    }
  };

  const getProgressPercentage = (): number => {
    if (!productionSteps.length) return 0;

    // Calculate progress based on overall production workflow stages:
    // 1. Machine Operations (can have multiple machines)
    // 2. Waste Generation
    // 3. Individual Product Creation

    const completedMachineSteps = productionSteps.filter(s => s.status === 'completed').length;
    const totalMachineSteps = productionSteps.length;

    // Machine operations represent 60% of total progress
    const machineProgress = totalMachineSteps > 0 ? (completedMachineSteps / totalMachineSteps) * 60 : 0;

    // Return only machine progress since we're in machine operations stage
    // Full workflow completion (100%) happens only when individual products are created
    return Math.round(machineProgress);
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

  if (!productionProduct) {
    return <div className="p-6">Loading...</div>;
  }

  // Get current logged-in user
  const currentUser = AuthService.getUser();
  const currentUserName = currentUser?.full_name || currentUser?.email || 'Unknown User';
  
  // Get inspector name from completed machine operation steps
  // Prefer the most recently completed machine step, but fallback to current logged-in user
  const completedMachineSteps = productionSteps
    .filter(step => step.stepType === 'machine_operation' && step.status === 'completed' && step.inspector)
    .sort((a, b) => {
      // Sort by endTime descending (most recent first)
      const timeA = a.endTime ? new Date(a.endTime).getTime() : 0;
      const timeB = b.endTime ? new Date(b.endTime).getTime() : 0;
      return timeB - timeA;
    });
  
  // Use the inspector from completed steps, or fallback to current logged-in user
  const inspectorName = completedMachineSteps.length > 0 
    ? completedMachineSteps[0].inspector 
    : productionSteps.find(step => step.stepType === 'machine_operation' && step.inspector)?.inspector 
    || currentUserName; // Fallback to current logged-in user
  
  // Get all unique inspectors who worked on machine operations
  const machineOperators = Array.from(new Set(
    productionSteps
      .filter(step => step.stepType === 'machine_operation' && step.inspector)
      .map(step => step.inspector)
  ));
  
  // If no operators found in steps, add current user
  if (machineOperators.length === 0 && currentUserName !== 'Unknown User') {
    machineOperators.push(currentUserName);
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header
        title="Production Flow - Machine Operations"
        subtitle={productionProduct?.productName || "Loading..."}
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/production')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">Loading production flow...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - only show when not loading */}
      {!isLoading && (
        <>
          {/* Production Summary Card */}
          {productionProduct && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Production Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Product Name</Label>
                    <p className="font-medium">{productionProduct.productName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Target Quantity</Label>
                    <p className="font-medium">{productionProduct.targetQuantity} pieces</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Machine Stage Operator</Label>
                    <div>
                      <p className="font-medium">{inspectorName}</p>
                      {machineOperators.length > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {machineOperators.length} operators involved
                        </p>
                      )}
                      {currentUser && inspectorName === currentUserName && (
                        <p className="text-xs text-blue-600 mt-1">
                          ✓ You are working on this step
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Overview */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Production Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Machine Operations</span>
              <span className="text-sm text-gray-600">{getProgressPercentage()}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              {productionSteps.filter(s => s.status === 'completed').length} of {productionSteps.length} machines completed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Material Consumption Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Materials Consumed in Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materialConsumption.length > 0 ? (
            <div className="space-y-3">
              {materialConsumption.map((material, index) => {
                // Get correct unit for raw materials - try to find from rawMaterials list first
                let displayUnit = material.unit;
                if (material.material_type === 'raw_material') {
                  const rawMaterial = rawMaterials.find(rm => rm.id === material.material_id);
                  if (rawMaterial && rawMaterial.unit) {
                    displayUnit = rawMaterial.unit;
                  }
                }
                
                return (
                <div key={material.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{material.material_name}</div>
                    <div className="text-sm text-gray-600">
                      {material.material_type === 'product' 
                        ? `${material.quantity_used || material.consumed_quantity} ${(material.quantity_used || material.consumed_quantity) === 1 ? 'product' : 'products'}`
                        : `${material.quantity_used || material.consumed_quantity} ${displayUnit}`
                      } • 
                      {material.material_type === 'product' ? ' Product Material' : ' Raw Material'} • 
                      Consumed: {new Date(material.consumed_at).toLocaleDateString()}
                    </div>
                    {material.individual_product_ids && material.individual_product_ids.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1 flex flex-wrap gap-1 items-center">
                        <span className="font-medium">Individual Products:</span>
                        {material.individual_product_ids.slice(0, 5).map((id: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {id}
                          </Badge>
                        ))}
                        {material.individual_product_ids.length > 5 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            +{material.individual_product_ids.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMaterialEditDialog(material)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Modify
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No materials consumed yet</p>
              <p className="text-sm">Materials will appear here once production starts</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Machine Steps */}
      <div className="space-y-4">
        {productionSteps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    step.status === 'completed' ? 'bg-green-600' :
                    step.status === 'in_progress' ? 'bg-blue-600' :
                    'bg-gray-400'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : step.status === 'in_progress' ? (
                      <Play className="w-6 h-6" />
                    ) : (
                      <Clock className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                      {step.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600">Inspector: {step.inspector}</p>
                  </div>
                </div>
                <Badge className={`px-3 py-1 ${
                  step.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                  step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {step.status === 'pending' ? 'Pending' :
                   step.status === 'in_progress' ? 'In Progress' :
                   'Completed'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{step.description}</p>

              {step.startTime && (
                <div className="text-sm">
                  <span className="font-medium">Started:</span> {new Date(step.startTime).toLocaleString()}
                </div>
              )}

              {step.endTime && (
                <div className="text-sm">
                  <span className="font-medium">Completed:</span> {new Date(step.endTime).toLocaleString()}
                </div>
              )}

              <div className="flex gap-2">
                {step.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => updateStepStatus(step.id, 'in_progress')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                )}

                {step.status === 'in_progress' && (
                  <Button
                    size="sm"
                    onClick={() => updateStepStatus(step.id, 'completed')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                )}

                {step.status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Machine Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            {(() => {
              const machineSteps = productionSteps.filter(step => step.stepType === 'machine_operation');
              const completedSteps = machineSteps.filter(step => step.status === 'completed');
              const hasMachine = machineSteps.length > 0;
              
              return (
                <>
                  <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Factory className="w-5 h-5 inline mr-2 text-blue-600" />
                    <strong>Machine Operations:</strong> {hasMachine ? `${completedSteps.length}/${machineSteps.length} completed` : 'No machine selected'}
                    <br />
                    <span className="text-xs text-gray-500 mt-1 block">
                      {hasMachine 
                        ? 'Complete all machine operations to proceed to waste generation.'
                        : 'Machine selection is MANDATORY. You must select a machine to start production.'
                      }
                    </span>
                  </div>
                  
                  {/* Add Additional Material Button - only show if machine is selected */}
                  {hasMachine && (
                    <Button
                      onClick={() => setShowAddMaterialDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Additional Material
                    </Button>
                  )}
                  
                </>
              );
            })()}

            {(() => {
              const machineSteps = productionSteps.filter(step => step.stepType === 'machine_operation');
              const completedSteps = machineSteps.filter(step => step.status === 'completed');
              const allMachineStepsCompleted = machineSteps.length > 0 && completedSteps.length === machineSteps.length;
              
              return allMachineStepsCompleted && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={goToWasteGeneration}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Go to Waste Generation
                  </Button>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>


      {/* Add Machine Dialog */}
      <Dialog open={showAddMachineDialog} onOpenChange={setShowAddMachineDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-green-600" />
              Add New Machine
            </DialogTitle>
            <DialogDescription>
              Add a new machine to your production system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Machine Name *
              </Label>
              <Input
                value={newMachineForm.name}
                onChange={(e) => setNewMachineForm({...newMachineForm, name: e.target.value})}
                placeholder="e.g., BR3C-Cutter, NEEDLE PUNCHING"
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Machine Type *
              </Label>
              <Input
                value={newMachineForm.machine_type}
                onChange={(e) => setNewMachineForm({...newMachineForm, machine_type: e.target.value})}
                placeholder="e.g., Cutting, Stitching, Printing, etc."
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Description (Optional)
              </Label>
              <Input
                value={newMachineForm.description}
                onChange={(e) => setNewMachineForm({...newMachineForm, description: e.target.value})}
                placeholder="Brief description of machine capabilities..."
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="space-y-2 pt-6 border-t border-gray-100">
            <Button
              onClick={addNewMachine}
              disabled={!newMachineForm.name.trim() || !newMachineForm.machine_type.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
              size="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Machine
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddMachineDialog(false)}
              className="w-full"
              size="sm"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Additional Material Dialog */}
      <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="w-5 h-5 text-green-600" />
              Add Additional Material
            </DialogTitle>
            <DialogDescription>
              Add more materials during production if needed. These will be tracked for consumption and waste.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Material Search */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search Materials
              </Label>
              <Input
                value={materialSearchTerm}
                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                placeholder="Search materials..."
                className="w-full"
              />
            </div>

            {/* Material Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Select Material *
              </Label>
              <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a material..." />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials
                    .filter(material => 
                      material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()) &&
                      material.status === 'in-stock' &&
                      material.current_stock > 0
                    )
                    .map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} - {material.current_stock} {material.unit} available
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity Input */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Quantity *
              </Label>
              <Input
                type="number"
                min="1"
                value={additionalQuantity}
                onChange={(e) => setAdditionalQuantity(parseInt(e.target.value) || 1)}
                placeholder="Enter quantity"
                className="w-full"
              />
            </div>

            {/* Material Info */}
            {selectedMaterialId && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                {(() => {
                  const material = rawMaterials.find(m => m.id === selectedMaterialId);
                  return material ? (
                    <div className="text-sm">
                      <div className="font-medium">{material.name}</div>
                      <div className="text-gray-600">
                        Available: {material.current_stock} {material.unit}
                      </div>
                      <div className="text-gray-600">
                        Cost: ₹{material.cost_per_unit} per {material.unit}
                      </div>
                      <div className="text-gray-600">
                        Total Cost: ₹{(material.cost_per_unit * additionalQuantity).toFixed(2)}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          <DialogFooter className="space-y-2 pt-4 border-t border-gray-100">
            <Button
              onClick={addAdditionalMaterial}
              disabled={!selectedMaterialId || additionalQuantity <= 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Material to Production
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddMaterialDialog(false)}
              className="w-full"
              size="sm"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Consumption Edit Dialog */}
      <Dialog open={showMaterialConsumptionDialog} onOpenChange={setShowMaterialConsumptionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Settings className="w-5 h-5 text-blue-600" />
              Modify Material Quantity
            </DialogTitle>
            <DialogDescription>
              Update the quantity of material consumed during production.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {(() => {
              const material = materialConsumption.find(m => m.id === editingMaterialId);
              return material ? (
                <>
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <div className="text-sm">
                      <div className="font-medium">{material.material_name}</div>
                      <div className="text-gray-600">
                        Current: {material.quantity_used || material.consumed_quantity} {material.unit}
                      </div>
                      <div className="text-gray-600">
                        Type: {material.material_type === 'product' ? 'Product Material' : 'Raw Material'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      New Quantity *
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editingQuantity}
                      onChange={(e) => setEditingQuantity(parseFloat(e.target.value) || 0)}
                      placeholder="Enter new quantity"
                      className="w-full"
                    />
                  </div>
                </>
              ) : null;
            })()}
          </div>

          <DialogFooter className="space-y-2 pt-4 border-t border-gray-100">
            <Button
              onClick={() => updateMaterialConsumption(editingMaterialId, editingQuantity)}
              disabled={!editingMaterialId || editingQuantity < 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Update Quantity
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMaterialConsumptionDialog(false)}
              className="w-full"
              size="sm"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
