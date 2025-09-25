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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Factory, Plus, Play, Pause, CheckCircle,
  Clock, User, Settings, ArrowRight, AlertTriangle, RefreshCw
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import { ProductService } from "@/services/ProductService";
import { MachineService } from "@/services/machineService";
import { ProductionFlowService } from "@/services/productionFlowService";
import { supabase } from "@/lib/supabase";

interface Machine {
  id: string;
  name: string;
  description?: string;
}

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
  const { productId } = useParams(); // This is actually the production ID now
  const navigate = useNavigate();

  // Core state
  const [productionProduct, setProductionProduct] = useState<any>(null);
  const [productionFlow, setProductionFlow] = useState<ProductionFlow | null>(null);
  const [productionSteps, setProductionSteps] = useState<ProductionStep[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  // Dialog states
  const [showAddMachineDialog, setShowAddMachineDialog] = useState(false);
  const [showMachineSelectionDialog, setShowMachineSelectionDialog] = useState(false);

  // Form states
  const [newMachineForm, setNewMachineForm] = useState({
    name: '',
    description: ''
  });

  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [inspectorName, setInspectorName] = useState('');

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [productId]);

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
      console.log('🔍 Loading production data for ID:', productId);

      // Load production flow from Supabase first
      const flow = await ProductionFlowService.getProductionFlow(productId);
      console.log('🔍 Production flow loaded:', flow);

      if (!flow) {
        console.warn('⚠️ No production flow found for productId:', productId, '- continuing with localStorage data');
        // Continue with localStorage data even if no flow is found
      }

      // Load from localStorage first
      const savedProductions = JSON.parse(localStorage.getItem('rajdhani_productions') || '{}');
      const savedProduction = savedProductions[productId];

      if (savedProduction) {
        console.log('✅ Found saved production data:', savedProduction);
        const { production, productDetails } = savedProduction;

        // Create production product from saved data
        const productionProduct = {
          id: productId, // Use the production ID
          productId: production.productId || productDetails.id,
          productName: productDetails.name || production.productName,
          category: productDetails.category || production.category,
          color: productDetails.color || production.color || 'N/A',
          size: productDetails.size || production.size || 'N/A',
          pattern: productDetails.pattern || production.pattern || 'N/A',
          targetQuantity: production.targetQuantity || 1,
          priority: production.priority || 'normal' as const,
          status: production.status || 'active' as const,
          expectedCompletion: production.expectedCompletion || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: production.createdAt || new Date().toISOString(),
          materialsConsumed: [],
          wasteGenerated: [],
          expectedProduct: {
            name: flow?.flow_name?.replace(' Production Flow', '') || 'Unknown Product',
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
        setProductionFlow(flow);

        // Load production steps for this flow
        console.log('Loading production steps for flow_id:', flow.id);
        const { data: steps, error: stepsError } = await supabase
          .from('production_flow_steps')
          .select('*')
          .eq('flow_id', flow.id)
          .order('step_order', { ascending: true });
        
        console.log('Production steps query result:', { steps, stepsError });
        
        if (stepsError) {
          console.error('Error loading production steps:', stepsError);
          // Try without ordering if step_order doesn't exist
          const { data: stepsFallback, error: fallbackError } = await supabase
            .from('production_flow_steps')
            .select('*')
            .eq('flow_id', flow.id);
          
          console.log('Fallback query result:', { stepsFallback, fallbackError });
          
          if (!fallbackError && stepsFallback) {
            const transformedSteps = stepsFallback.map((step: any) => ({
              id: step.id,
              stepNumber: step.step_order || step.order_index || 1,
              name: step.step_name,
              description: step.notes || getMachineDescription(step.step_name),
              machineId: step.machine_id || '',
              machineName: step.step_name,
              status: (step.status === 'completed' ? 'completed' :
                      step.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
              startTime: step.start_time,
              endTime: step.end_time,
              inspector: step.inspector_name || '',
              stepType: 'machine_operation' as const
            }));
            setProductionSteps(transformedSteps);
          }
          return;
        }

        if (!stepsError && steps) {
          // Transform Supabase steps to UI format
          const transformedSteps = steps.map((step: any) => ({
            id: step.id,
            stepNumber: step.step_order || step.order_index || 1,
            name: step.step_name,
            description: step.notes || getMachineDescription(step.step_name),
            machineId: step.machine_id || '',
            machineName: step.step_name,
            status: (step.status === 'completed' ? 'completed' :
                    step.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
            startTime: step.start_time,
            endTime: step.end_time,
            inspector: step.inspector_name || '',
            stepType: 'machine_operation' as const
          }));

          setProductionSteps(transformedSteps);
        }
      } else {
        // No saved production data, create from flow data
        console.log('No saved production data, creating from flow data');
        const productionProduct = {
          id: productId,
          productId: flow.production_product_id,
          productName: flow?.flow_name?.replace(' Production Flow', '') || 'Unknown Product',
          category: 'Carpet',
          color: 'Standard',
          size: 'N/A',
          pattern: 'N/A',
          targetQuantity: 1,
          priority: 'normal' as const,
          status: 'active' as const,
          expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: flow.created_at || new Date().toISOString(),
          materialsConsumed: [],
          wasteGenerated: [],
          expectedProduct: {
            name: flow?.flow_name?.replace(' Production Flow', '') || 'Unknown Product',
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
        setProductionFlow(flow);
      }
    } catch (error) {
      console.error('Error loading production flow:', error);
    }

    // Load machines from Supabase
    await loadMachines();
  };

  const loadMachines = async () => {
    try {
      const machinesData = await MachineService.getMachines();
      setMachines(machinesData);
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
      const { data: steps, error } = await supabase
        .from('production_flow_steps')
        .select('*')
        .eq('flow_id', productionFlow.id)
        .order('step_order', { ascending: true });

      console.log('📊 Production steps query result:', { steps, error, count: steps?.length || 0 });

      if (error) {
        console.error('Error loading production steps:', error);
        
        // Try without ordering if step_order doesn't exist
        const { data: stepsFallback, error: fallbackError } = await supabase
          .from('production_flow_steps')
          .select('*')
          .eq('flow_id', productionFlow.id);
        
        console.log('Fallback query result:', { stepsFallback, fallbackError });
        
        if (!fallbackError && stepsFallback) {
          const transformedSteps = stepsFallback.map((step: any) => ({
            id: step.id,
            stepNumber: step.step_order || step.order_index || 1,
            name: step.step_name,
            description: step.notes || getMachineDescription(step.step_name),
            machineId: step.machine_id || '',
            machineName: step.step_name,
            status: (step.status === 'completed' ? 'completed' :
                    step.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
            startTime: step.start_time,
            endTime: step.end_time,
            inspector: step.inspector_name || '',
            stepType: 'machine_operation' as const
          }));
          setProductionSteps(transformedSteps);
          console.log('✅ Loaded production steps via fallback query');
        } else {
          console.error('❌ Failed to load production steps even with fallback:', fallbackError);
          setProductionSteps([]);
        }
        return;
      }

      // Transform Supabase steps to UI format
      const transformedSteps = (steps || []).map((step: any) => ({
        id: step.id,
        stepNumber: step.step_order || step.order_index || 1,
        name: step.step_name,
        description: step.notes || getMachineDescription(step.step_name),
        machineId: step.machine_id || '',
        machineName: step.step_name,
        status: (step.status === 'completed' ? 'completed' :
                step.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress' | 'completed',
        startTime: step.start_time,
        endTime: step.end_time,
        inspector: step.inspector_name || '',
        stepType: 'machine_operation' as const
      }));

      setProductionSteps(transformedSteps);
    } catch (error) {
      console.error('Error in loadProductionSteps:', error);
    }
  };

  const addMachineToFlow = async () => {
    if (!selectedMachineId || !inspectorName.trim()) {
      console.error('Please select a machine and enter inspector name');
      return;
    }

    const selectedMachine = machines.find(m => m.id === selectedMachineId);
    if (!selectedMachine || !productionFlow) return;

    // Check if this machine is already added to prevent duplicates
    const existingStep = productionSteps.find(step => 
      step.machineId === selectedMachineId || 
      step.machineName === selectedMachine.name
    );
    
    if (existingStep) {
      console.warn('Machine already added to this flow:', selectedMachine.name);
      setSelectedMachineId('');
      setInspectorName('');
      setShowMachineSelectionDialog(false);
      return;
    }

    // Check if previous machine operations are completed before allowing next one
    const machineSteps = productionSteps.filter(step => step.stepType === 'machine_operation');
    if (machineSteps.length > 0) {
      const incompleteSteps = machineSteps.filter(step => step.status !== 'completed');
      if (incompleteSteps.length > 0) {
        const incompleteStepNames = incompleteSteps.map(step => step.machineName).join(', ');
        console.warn(`Cannot add new machine. Previous machine operations must be completed first: ${incompleteStepNames}`);
        alert(`⚠️ Cannot add new machine operation.\n\nPrevious machine operations must be completed first:\n${incompleteStepNames}\n\nPlease complete the current machine operation before adding the next one.`);
        setSelectedMachineId('');
        setInspectorName('');
        setShowMachineSelectionDialog(false);
        return;
      }
    }

    try {
      // Add step to Supabase
      const newStep = await ProductionFlowService.addStepToFlow({
        flow_id: productionFlow.id,
        step_name: selectedMachine.name,
        step_type: 'machine_operation',
        order_index: productionSteps.length + 1,
        machine_id: selectedMachineId,
        inspector_name: inspectorName.trim(),
        notes: getMachineDescription(selectedMachine.name)
      });

      // Reload steps from Supabase
      await loadProductionSteps();

      setSelectedMachineId('');
      setInspectorName('');
      setShowMachineSelectionDialog(false);

      console.log('Machine added to flow:', newStep);
    } catch (error) {
      console.error('Error adding machine to flow:', error);
    }
  };

  const updateStepStatus = async (stepId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      // Update in Supabase
      await ProductionFlowService.updateFlowStep(stepId, {
        status: newStatus === 'in_progress' ? 'in_progress' : newStatus === 'completed' ? 'completed' : 'pending',
        start_time: newStatus === 'in_progress' ? new Date().toISOString() : undefined,
        end_time: newStatus === 'completed' ? new Date().toISOString() : undefined
      });

      // Reload steps from Supabase
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
      // Add to Supabase
      const newMachine = await MachineService.createMachine({
        name: newMachineForm.name.trim(),
        description: newMachineForm.description.trim() || ""
      });

      // Reload machines from Supabase
      await loadMachines();

      setNewMachineForm({ name: '', description: '' });
      setShowAddMachineDialog(false);

      console.log('Machine added successfully:', newMachine);
    } catch (error) {
      console.error('Error adding machine:', error);
    }
  };

  const goToWasteGeneration = () => {
    navigate(`/production/${productId}/waste-generation`);
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

  const skipToWasteGeneration = async () => {
    if (!productionFlow) return;

    try {
      console.log('Skipping machine operations and going to waste generation');

      // Create a completed machine step to represent skipped machine operations
      const skippedStep = await ProductionFlowService.addStepToFlow({
        flow_id: productionFlow.id,
        step_name: 'N/A',
        step_type: 'machine_operation',
        order_index: productionSteps.length + 1,
        machine_id: null, // No specific machine since it was skipped
        inspector_name: 'System',
        notes: 'Machine operations were skipped - went directly to waste generation'
      });

      // Mark the step as completed since it was skipped
      if (skippedStep) {
        await ProductionFlowService.completeFlowStep(skippedStep.id, 'Machine operations skipped by user');
        console.log('✅ Skipped machine step marked as completed:', skippedStep);
      }

      // Reload steps to reflect the changes
      await loadProductionSteps();
    } catch (error) {
      console.error('Error creating skipped machine step:', error);
    }

    setShowMachineSelectionDialog(false);
    goToWasteGeneration();
  };

  if (!productionProduct) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header
        title="Production Flow - Machine Operations"
        subtitle={`${productionProduct.productName} - Target: ${productionProduct.targetQuantity} pieces`}
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/production')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production
        </Button>
        <Button variant="outline" onClick={loadProductionSteps} className="ml-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Steps
        </Button>
      </div>

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
              const incompleteSteps = machineSteps.filter(step => step.status !== 'completed');
              const canAddMachine = incompleteSteps.length === 0;
              
              return (
                <>
                  <Button
                    onClick={() => setShowMachineSelectionDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!canAddMachine}
                    title={!canAddMachine ? "Complete previous machine operations first" : "Add new machine operation"}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Machine to Flow
                  </Button>
                  
                  {!canAddMachine && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      Complete previous machine operations before adding new ones:
                      <ul className="mt-2 text-left">
                        {incompleteSteps.map(step => (
                          <li key={step.id} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                            {step.machineName} - {step.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}

            {productionSteps.length > 0 && (
              <div className="pt-4 border-t">
                <Button
                  onClick={goToWasteGeneration}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Go to Waste Generation
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="space-y-3 pt-6 border-t border-gray-100">
            {(() => {
              const machineSteps = productionSteps.filter(step => step.stepType === 'machine_operation');
              const incompleteSteps = machineSteps.filter(step => step.status !== 'completed');
              const canAddMachine = incompleteSteps.length === 0;
              
              return (
                <>
                  <Button
                    onClick={addMachineToFlow}
                    disabled={!selectedMachineId || !inspectorName || !canAddMachine}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    size="default"
                    title={!canAddMachine ? "Complete previous machine operations first" : "Add machine step"}
                  >
                    <Factory className="w-4 h-4 mr-2" />
                    Add Machine Step
                  </Button>
                  
                  {!canAddMachine && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Complete previous operations first: {incompleteSteps.map(s => s.machineName).join(', ')}
                    </div>
                  )}
                </>
              );
            })()}
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
              disabled={!newMachineForm.name.trim()}
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
    </div>
  );
}
