import { formatIndianDate } from '@/utils/formatHelpers';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import {
  Loader2,
  FileText,
  Calendar,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Sun,
  Moon,
  Check,
  CheckCircle,
  Package,
  Boxes,
  Layers,
  Settings,
  User,
  Play,
  Pause,
  Cpu,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import MachineStageHeader from '@/components/production/machine/MachineStageHeader';
import ProductionDeleteDialog from '@/components/production/ProductionDeleteDialog';
import MachineStepsList from '@/components/production/machine/MachineStepsList';
import ConsumedMaterialsDisplay from '@/components/production/machine/ConsumedMaterialsDisplay';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import type { Product } from '@/types/product';
import { calculateSQM } from '@/utils/sqmCalculator';

export default function MachineStage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]);
  const consumedMaterialsRef = useRef<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [machineShift, setMachineShift] = useState<'day' | 'night' | undefined>(undefined);
  const [isMachineCompleted, setIsMachineCompleted] = useState(false);
  const [machineStageRemark, setMachineStageRemark] = useState('');
  const [navigatingToWastage, setNavigatingToWastage] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<any[]>([]);

  useEffect(() => {
    ProductService.getDropdownData()
      .then(data => {
        const cm: Record<string, string> = {};
        (data.colors || []).forEach((c: any) => { if (c?.value && c?.color_code) cm[c.value.toLowerCase()] = c.color_code; });
        setColorCodeMap(cm);
        const pm: Record<string, string> = {};
        (data.patterns || []).forEach((p: any) => { if (p?.value && p?.image_url) pm[p.value.toLowerCase()] = p.image_url; });
        setPatternImageMap(pm);
      })
      .catch(() => {});
  }, []);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actorName = (() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 'User';
      const parsed = JSON.parse(raw);
      return parsed?.full_name || parsed?.email || 'User';
    } catch {
      return 'User';
    }
  })();

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, refreshKey]);

  // Poll every 8s so if another user completes machine steps, the button enables live
  useEffect(() => {
    if (!id) return;
    const poll = async () => {
      try {
        const { data: freshBatch } = await ProductionService.getBatchById(id);
        if (freshBatch) {
          await checkMachineCompletion(freshBatch);
        }
      } catch { /* silent */ }
    };
    pollIntervalRef.current = setInterval(poll, 8000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load batch
      const { data: batchData } = await ProductionService.getBatchById(id!);
      if (batchData) {
        // Stage redirect guard: if machine stage is already done, send user forward
        if (batchData.machine_stage?.status === 'completed') {
          navigate(`/production/${id}/individual-products`, { replace: true });
          return;
        }

        // CRITICAL FIX: If we're on machine page but planning_stage is not completed, fix it
        const planningStageStatus = batchData.planning_stage?.status as string | undefined;
        const machineStageStatus = batchData.machine_stage?.status as string | undefined;

        if (planningStageStatus !== 'completed' && (machineStageStatus === 'in_progress' || machineStageStatus === 'completed' || batchData.status === 'in_production')) {
          console.log('⚠️ Planning stage is not marked as completed, but machine stage is active. Fixing planning_stage status...');
          try {
            await ProductionService.updateBatch(id!, {
              planning_stage: {
                status: 'completed',
                completed_at: new Date().toISOString(),
                completed_by: 'System',
              },
            });
            console.log('✅ Planning stage status fixed to "completed"');
            // Reload the batch to get updated data
            const { data: updatedBatchData } = await ProductionService.getBatchById(id!);
            if (updatedBatchData) {
              batchData.planning_stage = updatedBatchData.planning_stage;
            }
          } catch (error) {
            console.error('❌ Error fixing planning_stage status:', error);
          }
        }

        // Fetch product details
        let enrichedBatch = { ...batchData };
        if (batchData.product_id) {
          try {
            const productData = await ProductService.getProductById(batchData.product_id);
            enrichedBatch.product_name = productData.name;
            setProduct(productData);
          } catch (error) {
            console.error('Error fetching product:', error);
          }
        }

        setBatch(enrichedBatch);
        if (enrichedBatch.machine_stage?.remark) {
          setMachineStageRemark(enrichedBatch.machine_stage.remark);
        }
        
        // Load production flow
        const { data: flowData } = await ProductionService.getProductionFlowByBatchId(id!);
        if (flowData) {
          setProductionFlow(flowData);
          
          // Get shift from machine step
          const machineStep = flowData.production_flow_steps?.find((s: any) => 
            s.step_type === 'machine_operation' || 
            s.step_name?.toLowerCase().includes('machine')
          ) || flowData.steps?.find((s: any) => 
            s.step_type === 'machine_operation' || 
            s.step_name?.toLowerCase().includes('machine')
          );
          
          if (machineStep?.shift) {
            setMachineShift(machineStep.shift);
          }
        } else {
          // If no flow exists, try to load from PlanningDraftState
          // The flow might be created later, so we'll still show material consumption
          console.log('No production flow found for batch:', id);
        }
        
        // Load material consumption - MUST exist for machine stage
        const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
        if (consumptionData && consumptionData.length > 0) {
          console.log('📦 Raw consumption data from API:', consumptionData);

          // Convert to consumed materials format with all details
          const consumed = consumptionData.map((m: any) => {
            console.log(`🔍 Processing material: ${m.material_name}`, {
              hasIndividualProducts: !!m.individual_products,
              individualProductsCount: m.individual_products?.length || 0,
              firstProductStatus: m.individual_products?.[0]?.status,
            });

            return {
              material_id: m.material_id,
              material_name: m.material_name,
              material_type: m.material_type,
              quantity_per_sqm: m.quantity_per_sqm || 0,
              required_quantity: m.quantity_used || m.required_quantity || 0,
              actual_consumed_quantity: m.actual_consumed_quantity || m.quantity_used || 0,
              whole_product_count: m.whole_product_count || m.quantity_used || 0,
              unit: m.unit,
              individual_product_ids: m.individual_product_ids || [], // CRITICAL: Must have individual_product_ids for products
              individual_products: m.individual_products || [], // CRITICAL: Full individual product details
            };
          });
          
          // Validate that products have individual_product_ids
          const productMaterials = consumed.filter(m => m.material_type === 'product');
          const missingIndividualProducts = productMaterials.filter(
            m => !m.individual_product_ids || m.individual_product_ids.length === 0
          );
          
          if (missingIndividualProducts.length > 0) {
            console.error('⚠️ Products missing individual_product_ids:', missingIndividualProducts.map(m => m.material_name));
            toast({
              title: 'Warning',
              description: `Some products are missing individual product IDs. Please go back to planning stage and select individual products.`,
              variant: 'destructive',
            });
          }
          
          setConsumedMaterials(consumed);
          consumedMaterialsRef.current = consumed;
          console.log('✅ Loaded consumed materials:', consumed.length, 'items');
          console.log('📦 Individual product IDs:', consumed
            .filter(m => m.material_type === 'product')
            .map(m => ({ name: m.material_name, ids: m.individual_product_ids?.length || 0 }))
          );
        } else {
          // No consumption records - this should not happen if planning was done correctly
          toast({
            title: 'Error',
            description: 'No material consumption records found. Please complete planning stage first.',
            variant: 'destructive',
          });
          console.error('❌ No MaterialConsumption records found for batch:', id);
        }

        // Check machine completion status after loading all data
        // Pass the batch data directly to avoid state timing issues
        await checkMachineCompletion(enrichedBatch);
      }
    } catch (error) {
      console.error('Error loading machine stage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load production data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkMachineCompletion = async (batchData?: any) => {
    try {
      // Use passed batch data or state batch
      const currentBatch = batchData || batch;

      console.log('🔍 Checking machine completion:', {
        hasBatchData: !!currentBatch,
        machineStageStatus: currentBatch?.machine_stage?.status,
        wastageStageStatus: currentBatch?.wastage_stage?.status,
      });

      // If machine stage itself is marked completed, enable immediately
      if (currentBatch?.machine_stage?.status === 'completed') {
        setIsMachineCompleted(true);
        return;
      }

      // Check if wastage stage is already in progress or completed (means machine is done)
      if (currentBatch?.wastage_stage?.status === 'in_progress' || currentBatch?.wastage_stage?.status === 'completed') {
        console.log('✅ Wastage stage is active, machine must be completed');
        setIsMachineCompleted(true);
        return;
      }

      // Reload production flow to get latest step statuses
      const { data: latestFlowData } = await ProductionService.getProductionFlowByBatchId(id!);

      if (!latestFlowData) {
        console.log('❌ No production flow data');
        setIsMachineCompleted(false);
        return;
      }

      const flowId = latestFlowData.id || latestFlowData.flow_id;
      const { data: flowSteps } = await ProductionService.getProductionFlowSteps(flowId);

      const machineSteps = (flowSteps || []).filter((s: any) =>
        s.step_type === 'machine_operation' ||
        s.step_name?.toLowerCase().includes('machine')
      );
      machineSteps.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      setSteps(machineSteps);

      console.log('🔧 Machine steps found:', {
        count: machineSteps.length,
        statuses: machineSteps.map((s: any) => ({ name: s.step_name, status: s.status })),
      });

      if (machineSteps.length === 0) {
        console.log('❌ No machine steps found');
        setIsMachineCompleted(false);
        return;
      }

      // Check if all machine steps are completed
      const allCompleted = machineSteps.every((s: any) => s.status === 'completed');

      console.log('✅ All machine steps completed:', allCompleted);

      // Machine stage is complete when all steps are done and materials exist
      const currentMaterials = consumedMaterialsRef.current;
      const isCompleted = allCompleted && currentMaterials.length > 0;

      setIsMachineCompleted(isCompleted);
    } catch (error) {
      console.error('Error checking machine completion:', error);
      setIsMachineCompleted(false);
    }
  };

  // Separate function to check completion without full refresh
  const checkCompletionOnly = async () => {
    await checkMachineCompletion();
  };

  const handleUpdateStep = async (stepId: string, updates: any) => {
    try {
      const { error } = await ProductionService.updateProductionFlowStep(stepId, updates);
      
      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      // Update local state steps immediately
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? { ...step, ...updates }
            : step
        )
      );

      toast({
        title: 'Success',
        description: 'Step updated successfully',
      });

      // Re-evaluate batch completion status
      await checkMachineCompletion();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to update step',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleDeleteConfirm = async (reason: string) => {
    if (!batch) return;
    try {
      setIsDeleting(true);
      const { data, error } = await ProductionService.deleteBatch(batch.id, reason);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Deleted', description: 'Production batch deleted and all materials reverted.' });
        setIsDeleteDialogOpen(false);
        navigate('/production', { state: { section: location.state?.section || 'assigned' } });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete production batch.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const validateMachineStageCompletion = async (): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Reload production flow to get latest step statuses
      const { data: latestFlowData } = await ProductionService.getProductionFlowByBatchId(id!);
      
      // Check 1: Production flow must exist
      if (!latestFlowData) {
        return {
          valid: false,
          error: 'Production flow not found. Please ensure machine operations are set up correctly.'
        };
      }

      // Get latest flow steps
      const flowId = latestFlowData.id || latestFlowData.flow_id;
      const { data: flowSteps } = await ProductionService.getProductionFlowSteps(flowId);
      
      // Check 2: Machine step must exist
      const machineSteps = (flowSteps || []).filter((s: any) => 
        s.step_type === 'machine_operation' || 
        s.step_name?.toLowerCase().includes('machine')
      );

      if (machineSteps.length === 0) {
        return {
          valid: false,
          error: 'No machine steps found. Please complete machine operations first.'
        };
      }

      // Check 3: All machine steps must be completed
      const incompleteSteps = machineSteps.filter((s: any) => s.status !== 'completed');
      if (incompleteSteps.length > 0) {
        const stepNames = incompleteSteps.map((s: any) => s.step_name || 'Machine Operation').join(', ');
        return {
          valid: false,
          error: `Please complete all machine steps before moving to wastage stage. Incomplete: ${stepNames}`
        };
      }

      // Check 4: Material consumption must exist
      const currentMaterials = consumedMaterialsRef.current;
      if (!currentMaterials || currentMaterials.length === 0) {
        return {
          valid: false,
          error: 'Material consumption records not found. Please ensure materials are consumed.'
        };
      }

      // Check 5: Products must have individual_product_ids
      const productMaterials = currentMaterials.filter(m => m.material_type === 'product');
      const missingIndividualProducts = productMaterials.filter(
        m => !m.individual_product_ids || m.individual_product_ids.length === 0
      );
      
      if (missingIndividualProducts.length > 0) {
        const materialNames = missingIndividualProducts.map(m => m.material_name).join(', ');
        return {
          valid: false,
          error: `Some products are missing individual product IDs: ${materialNames}. Please go back to planning stage and select individual products.`
        };
      }

      // All validations passed
      return { valid: true };
    } catch (error) {
      console.error('Error validating machine stage:', error);
      return {
        valid: false,
        error: 'Error validating machine stage. Please try again.'
      };
    }
  };

  const handleNavigateToWastage = async () => {
    // If machine stage is already completed (by this or another user), skip validation and go straight forward
    const { data: freshBatch } = await ProductionService.getBatchById(id!).catch(() => ({ data: null }));
    if (freshBatch?.machine_stage?.status === 'completed') {
      navigate(`/production/${id}/individual-products`, { replace: true, state: { section: location.state?.section || 'assigned' } });
      return;
    }

    const validation = await validateMachineStageCompletion();
    if (!validation.valid) {
      toast({
        title: 'Cannot Proceed to Individual Products Stage',
        description: validation.error || 'Machine stage is not complete.',
        variant: 'destructive',
      });
      return;
    }
    const remark = machineStageRemark.trim();
    try {
      setNavigatingToWastage(true);
      const { error: updateError } = await ProductionService.updateBatch(id!, {
        machine_stage: {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: actorName,
          ...(remark ? { remark } : {}),
        },
        individual_stage: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
          started_by: actorName,
        },
      });

      if (updateError) {
        console.error('❌ Error updating machine stage:', updateError);
        toast({
          title: 'Warning',
          description: 'Machine stage completion may not have been saved. Proceeding to individual products stage.',
          variant: 'destructive',
        });
      }
      navigate(`/production/${id}/individual-products`, { replace: true, state: { section: location.state?.section || 'assigned' } });
    } catch (error) {
      console.error('❌ Error updating machine stage:', error);
      toast({
        title: 'Error',
          description: 'Failed to proceed to individual products stage. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setNavigatingToWastage(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Batch not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Desktop View */}
      <div className="hidden lg:block space-y-6">
        <MachineStageHeader
          batch={batch}
          onBack={() => {
            navigate('/production', { state: { section: location.state?.section || 'assigned' } });
          }}
          onWastage={handleNavigateToWastage}
          onRefresh={handleRefresh}
          onDelete={() => setIsDeleteDialogOpen(true)}
          shift={machineShift}
          wastageDisabled={!isMachineCompleted}
        />

        {/* Production Progress Tracker */}
        <ProductionStageProgress currentStage="machine" />

        {/* Machine Schedule Date Banner */}
        {batch.machine_stage?.schedule_date && (() => {
          const scheduleDate = new Date(batch.machine_stage.schedule_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          scheduleDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - scheduleDate.getTime()) / (1000 * 60 * 60 * 24));
          const formattedDate = formatIndianDate(batch.machine_stage.schedule_date);
          const isOverdue = diffDays > 0 && batch.machine_stage.status !== 'completed';
          const isToday = diffDays === 0 && batch.machine_stage.status !== 'completed';
          if (batch.machine_stage.status === 'completed') return null;
          return (
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${
              isOverdue ? 'bg-red-50 border-red-200' : isToday ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
            }`}>
              {isOverdue ? (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : isToday ? (
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-semibold ${isOverdue ? 'text-red-700' : isToday ? 'text-amber-700' : 'text-blue-700'}`}>
                  {isOverdue
                    ? `Machine stage overdue by ${diffDays} day${diffDays !== 1 ? 's' : ''}!`
                    : isToday
                    ? 'Machine production scheduled for today!'
                    : `Machine production scheduled for ${formattedDate}`}
                </p>
                <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600' : isToday ? 'text-amber-600' : 'text-blue-600'}`}>
                  {isOverdue
                    ? `Was scheduled for ${formattedDate}. Please start immediately.`
                    : isToday
                    ? 'Start the machine stage now.'
                    : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} remaining.`}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Product Details */}
        {product && (
          <>
            <ProductionOverviewStats
              targetQuantity={batch?.planned_quantity || 0}
              unit={product.count_unit || 'rolls'}
              materialsUsed={consumedMaterials.length}
              expectedLength={product.length ? parseFloat(product.length) : undefined}
              expectedWidth={product.width ? parseFloat(product.width) : undefined}
              expectedWeight={product.weight ? parseFloat(product.weight) : undefined}
            />
            <ExpectedProductDetails product={product} />
          </>
        )}

        {/* Consumed Materials */}
        <ConsumedMaterialsDisplay
          materials={consumedMaterials}
          product={product}
          targetQuantity={batch?.planned_quantity || 0}
        />

        {/* Machine Steps */}
        <MachineStepsList
          batchId={id!}
          productionFlow={productionFlow}
          onStepUpdate={checkCompletionOnly}
        />

        {/* Optional remark – shown near start/complete; saved when proceeding to wastage */}
        <Card>
          <CardContent className="p-4">
            <Label htmlFor="machine-stage-remark" className="text-sm font-medium text-gray-700">
              Remark (optional)
            </Label>
            <Textarea
              id="machine-stage-remark"
              placeholder="e.g. Machine stage completion delayed due to..."
              value={machineStageRemark}
              onChange={(e) => setMachineStageRemark(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Individual Products Stage Button at Bottom */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleNavigateToWastage}
            disabled={!isMachineCompleted || navigatingToWastage}
            className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            {navigatingToWastage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin animate-spin-reverse" />
                Proceeding to Individual Products...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Individual Products Stage
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-gray-50 pb-40">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/production', { state: { section: location.state?.section || 'assigned' } })}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">
                {batch?.batch_number || 'New Batch'}
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[140px]">
                {product?.name || batch?.product_name || 'Machine Stage'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              className="p-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
              title="Delete batch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Stepper Progress */}
          <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-gray-500 font-medium">Stage Progress</span>
              <span className="text-xs text-purple-600 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full">
                2. Machine Operations
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="bg-purple-500 rounded-full" />
              <div className="bg-purple-500 rounded-full animate-pulse" />
              <div className="bg-gray-200 rounded-full" />
              <div className="bg-gray-200 rounded-full" />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 mt-2 font-semibold">
              <span className="text-purple-650 font-medium">Planning</span>
              <span className="text-purple-600 font-bold">Machine</span>
              <span>Details</span>
              <span>Wastage</span>
            </div>
          </div>

          {/* Combined product summary card */}
          <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
            {/* Top strip: key stats */}
            <div className="flex border-b border-gray-100">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border-r border-gray-100">
                <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{batch?.planned_quantity || 0} {product?.count_unit || 'rolls'}</p>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Target Qty</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border-r border-gray-100">
                <Boxes className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{consumedMaterials.length} Items</p>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Materials</p>
                </div>
              </div>
              {product?.length && product?.width && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border-r border-gray-100">
                  <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{product.length}×{product.width}M</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Dimensions</p>
                  </div>
                </div>
              )}
              {product?.weight && product.weight !== 'N/A' && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{product.weight}</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">GSM</p>
                  </div>
                </div>
              )}
            </div>
            {/* Bottom row: product name + attributes */}
            {product && (
              <div className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
                <span className="text-xs font-bold text-gray-900">{product.name}</span>
                {product.category && (
                  <span className="text-[10px] text-gray-400 font-medium">{product.category}</span>
                )}
                {product.color && product.color !== 'N/A' && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    {colorCodeMap[product.color.toLowerCase()] && (
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colorCodeMap[product.color.toLowerCase()] }} />
                    )}
                    {product.color}
                  </span>
                )}
                {product.pattern && product.pattern !== 'N/A' && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    {patternImageMap[product.pattern.toLowerCase()] && (
                      <img src={patternImageMap[product.pattern.toLowerCase()]} alt="" className="w-3 h-3 rounded object-cover border border-black/10" />
                    )}
                    {product.pattern}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Machine Operations Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 shadow-sm">
            <Cpu className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-amber-800 mb-0.5">Machine Operations</h4>
              <p className="text-[11px] leading-relaxed text-amber-700">
                Update the status of machine operations below. Once all steps are completed, you can proceed to the next stage.
              </p>
            </div>
          </div>

          {/* Consumed Materials */}
          {consumedMaterials.length > 0 && (
            <div className="bg-green-50/70 border border-green-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900 text-sm">Consumed Materials</h3>
                <span className="ml-auto text-xs bg-green-150 text-green-800 px-2 py-0.5 rounded-full font-bold">
                  {consumedMaterials.length} Items
                </span>
              </div>

              <div className="space-y-3">
                {consumedMaterials.map((m, idx) => {
                  const targetQty = batch?.planned_quantity || 0;
                  const sqmPerUnit = calculateSQM(
                    product?.length || (product as any)?.roll_length || '0',
                    product?.width || (product as any)?.roll_width || '0',
                    product?.length_unit || (product as any)?.measurement_unit || 'm',
                    product?.width_unit || (product as any)?.measurement_unit || 'm'
                  );
                  const totalSQM = targetQty * sqmPerUnit;

                  let qtyPerSqmNum = m.quantity_per_sqm;
                  if ((qtyPerSqmNum == null || qtyPerSqmNum === 0) && totalSQM > 0) {
                    const reqQty = m.required_quantity || m.quantity_used || m.actual_consumed_quantity || 0;
                    qtyPerSqmNum = reqQty / totalSQM;
                  }
                  qtyPerSqmNum = qtyPerSqmNum || 0;

                  const sqmPerRoll = targetQty > 0 ? totalSQM / targetQty : 0;
                  const perRoll = qtyPerSqmNum * sqmPerRoll;
                  const forNRolls = qtyPerSqmNum * totalSQM;

                  const isProduct = m.material_type === 'product';
                  const typeBg = isProduct ? '#EDE9FE' : '#EFF6FF';
                  const typeColor = isProduct ? '#7C3AED' : '#2563EB';
                  const typeLabel = isProduct ? 'Product' : 'Raw Material';

                  const consumedQty = m.material_type === 'product' && m.whole_product_count !== undefined
                    ? m.whole_product_count
                    : (m.actual_consumed_quantity ?? m.required_quantity ?? forNRolls);

                  return (
                    <div key={`consumed-${m.material_id}-${idx}`} className="bg-white rounded-xl p-3 border border-gray-200">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-[13px] leading-tight mb-0.5 truncate">{m.material_name}</h4>
                          <p className="text-[10px] text-gray-405 truncate">ID: {m.material_id || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ backgroundColor: typeBg, color: typeColor }}>
                            {typeLabel}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700 border border-green-200">
                            Consumed
                          </span>
                        </div>
                      </div>

                      {/* Breakdown details */}
                      <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-2.5 space-y-2">
                        <p className="text-[10px] font-bold text-blue-750">Quantity Breakdown</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white rounded-md p-1.5 border border-blue-50">
                            <p className="text-[8px] text-gray-400">Per 1 SQM</p>
                            <p className="text-[11px] font-bold text-gray-800">{qtyPerSqmNum.toFixed(6)} {m.unit}</p>
                          </div>
                          <div className="bg-white rounded-md p-1.5 border border-blue-50">
                            <p className="text-[8px] text-gray-400">Per 1 Roll</p>
                            <p className="text-[11px] font-bold text-gray-800">{perRoll.toFixed(4)} {m.unit}</p>
                          </div>
                          <div className="bg-white rounded-md p-1.5 border border-blue-50">
                            <p className="text-[8px] text-gray-400">Required Qty</p>
                            <p className="text-[11px] font-bold text-gray-800">
                              {Number(m.required_quantity || forNRolls).toFixed(2)} {m.unit}
                            </p>
                          </div>
                          <div className="bg-white rounded-md p-1.5 border border-blue-50">
                            <p className="text-[8px] text-gray-400">Consumed Qty</p>
                            <p className="text-[11px] font-bold text-green-750">
                              {Number(consumedQty).toFixed(2)} {m.unit}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Machine Steps List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-gray-150 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Machine Steps</h3>
              <span className="text-xs font-bold text-gray-505">{steps.length} Steps</span>
            </div>

            {steps.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-400">No machine steps configured.</p>
            ) : (
              <div className="divide-y divide-gray-150">
                {steps.map((s: any, idx: number) => {
                  const isDone = s.status === 'completed';
                  const isProgress = s.status === 'in_progress';
                  const statusLabel = isDone ? 'Completed' : isProgress ? 'In Progress' : 'Pending';

                  return (
                    <div key={s.id} className="p-4 space-y-3">
                      {/* Step ID & Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400">Step {idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isDone
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : isProgress
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-205 text-gray-600'
                        }`}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Step Title & Description */}
                      <div>
                        <h4 className="text-[14px] font-bold text-gray-900">{s.step_name || 'Machine Operation'}</h4>
                        {(s.notes || s.description) && (
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.notes || s.description}</p>
                        )}
                      </div>

                      {/* Details Flex Wrap Row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        {(s.machine_name || s.machine_id) && (
                          <div className="flex items-center gap-1.5">
                            <Settings className="w-3.5 h-3.5 text-gray-400" />
                            <span>Machine: <strong className="text-gray-800">{s.machine_name || s.machine_id}</strong></span>
                          </div>
                        )}

                        {s.shift && (
                          <div className="flex items-center gap-1.5">
                            {s.shift === 'day' ? (
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Moon className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                            <span>Shift: <strong className="text-gray-800 capitalize">{s.shift}</strong></span>
                          </div>
                        )}

                        {(s.inspector_name || s.inspector) && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>Inspector: <strong className="text-gray-800">{s.inspector_name || s.inspector}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Actions buttons */}
                      <div className="flex gap-2">
                        {s.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStep(s.id, { status: 'in_progress', start_time: new Date().toISOString() })}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 text-white fill-current" />
                            Start Step
                          </button>
                        )}
                        {isProgress && (
                          <>
                            <button
                              onClick={() => handleUpdateStep(s.id, { status: 'pending' })}
                              className="flex-1 py-2 bg-white border border-gray-200 text-gray-750 hover:bg-gray-50 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Pause className="w-3.5 h-3.5 text-gray-600" />
                              Pause
                            </button>
                            <button
                              onClick={() => handleUpdateStep(s.id, { status: 'completed', end_time: new Date().toISOString() })}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              Complete
                            </button>
                          </>
                        )}
                        {isDone && (
                          <div className="flex items-center gap-1.5 text-green-600 py-1 font-semibold text-xs">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>Step Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Remark Optional */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <Label htmlFor="mobile-machine-stage-remark" className="block text-xs font-bold text-gray-755 mb-2">
              Remark (Optional)
            </Label>
            <Textarea
              id="mobile-machine-stage-remark"
              value={machineStageRemark}
              onChange={(e) => setMachineStageRemark(e.target.value)}
              placeholder="e.g. Completed with minor delays..."
              rows={3}
              className="text-xs bg-gray-50 border-gray-200 rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Sticky Bottom Footer CTA — sits above the bottom nav (h-16 = 64px) */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-4 z-20 shadow-lg space-y-1.5">
          {!isMachineCompleted && (
            <p className="text-center text-[11px] text-amber-600 font-semibold">
              Complete all machine steps to proceed
            </p>
          )}
          <button
            onClick={handleNavigateToWastage}
            disabled={!isMachineCompleted || navigatingToWastage}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold text-white transition-colors"
            style={{ backgroundColor: (!isMachineCompleted || navigatingToWastage) ? '#9CA3AF' : '#7C3AED' }}
          >
            {navigatingToWastage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Proceeding...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Individual Products Stage
              </>
            )}
          </button>
        </div>
      </div>

      <ProductionDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        batch={batch}
        isDeleting={isDeleting}
        mode="delete"
      />
    </Layout>
  );
}

