import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import {
  ClipboardList,
  Cog,
  Trash2,
  Package,
  CheckCircle2,
  User,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { ProductionService } from '@/services/productionService';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionStagesDetailedProps {
  batch: ProductionBatch;
}

export default function ProductionStagesDetailed({ batch }: ProductionStagesDetailedProps) {
  const [materialConsumption, setMaterialConsumption] = useState<any[]>([]);
  const [flowSteps, setFlowSteps] = useState<any[]>([]);
  const [wastageRecords, setWastageRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<{
    planning: boolean;
    machine: boolean;
    wastage: boolean;
    products: boolean;
  }>({
    planning: true,
    machine: true,
    wastage: true,
    products: true,
  });

  useEffect(() => {
    loadStageData();
  }, [batch.id]);

  const loadStageData = async () => {
    try {
      setLoading(true);

      console.log('📊 Loading stage data for batch:', batch.id);

      // The batch object now contains all related data from the backend
      // Check if batch already has the data populated
      let materials = [];
      if ((batch as any).material_consumption) {
        console.log('📦 Using material consumption from batch:', (batch as any).material_consumption.length);
        materials = (batch as any).material_consumption || [];
      } else {
        // Fallback: Load separately if not included
        const { data: materialsData } = await ProductionService.getMaterialConsumption(batch.id);
        console.log('📦 Material consumption loaded separately:', materialsData?.length || 0);
        materials = materialsData || [];
      }

      // Load individual products for materials that have individual_product_ids but no individual_products
      const materialsWithProducts = await Promise.all(
        materials.map(async (material: any) => {
          if (material.material_type === 'product' && 
              material.individual_product_ids && 
              material.individual_product_ids.length > 0 && 
              (!material.individual_products || material.individual_products.length === 0)) {
            try {
              const { IndividualProductService } = await import('@/services/individualProductService');
              const individualProducts = await Promise.all(
                material.individual_product_ids.map((id: string) =>
                  IndividualProductService.getIndividualProductById(id)
                )
              );
              return {
                ...material,
                individual_products: individualProducts.filter(p => p !== null)
              };
            } catch (error) {
              console.error('Error loading individual products:', error);
              return material;
            }
          }
          return material;
        })
      );

      setMaterialConsumption(materialsWithProducts);

      // Check if batch has production flow data
      if ((batch as any).production_flow) {
        console.log('🔄 Using production flow from batch:', (batch as any).production_flow);
        const steps = (batch as any).production_flow.steps || [];
        console.log('⚙️ Flow steps from batch:', steps.length);
        setFlowSteps(steps);
      } else {
        // Fallback: Load separately if not included
        const { data: flowData } = await ProductionService.getProductionFlowByBatchId(batch.id);
        console.log('🔄 Production flow loaded separately:', flowData);

        if (flowData?.flow_id || flowData?.id) {
          const steps = flowData.production_flow_steps || flowData.steps || [];
          console.log('⚙️ Flow steps loaded:', steps.length);
          setFlowSteps(steps);
        } else {
          console.log('⚠️ No flow found for this batch');
        }
      }

      // Load wastage records for this batch
      try {
        const { WasteService } = await import('@/services/wasteService');
        const allWaste = await WasteService.getAllWaste();
        const batchWaste = allWaste.filter(
          (item: any) => item.production_batch_id === batch.id || item.batch_id === batch.id
        );
        setWastageRecords(batchWaste);
        console.log('🗑️ Wastage records loaded:', batchWaste.length);
      } catch (error) {
        console.error('Error loading wastage records:', error);
        setWastageRecords([]);
      }

    } catch (error) {
      console.error('❌ Error loading stage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDate = (date: string | Date | undefined, showInProgress: boolean = false) => {
    if (!date) {
      return showInProgress ? 'In Progress' : 'N/A';
    }
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton loaders for stages */}
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div>
                    <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 w-48 bg-gray-100 rounded"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate stage data based on actual records and flow steps
  // Find steps by type/name to identify stages
  const machineStep = flowSteps.find(s => 
    s.step_type === 'machine_operation' || 
    s.step_name?.toLowerCase().includes('machine')
  );
  const wastageStep = flowSteps.find(s => 
    s.step_type === 'wastage' || 
    s.step_name?.toLowerCase().includes('wastage')
  );
  const finalStep = flowSteps.find(s => 
    s.step_type === 'final' || 
    s.step_name?.toLowerCase().includes('final') ||
    s.step_name?.toLowerCase().includes('inspection')
  );

  // Planning Stage:
  // - Start: When batch is created
  // - Completion: When moving to machine stage (first MaterialConsumption or first machine step creation)
  // - Status: "completed" if we have material consumption or machine step exists
  const planningStartDate = batch.created_at || batch.start_date;
  const planningCompletionDate = materialConsumption.length > 0 
    ? materialConsumption[0]?.consumed_at 
    : (machineStep?.created_at || machineStep?.createdAt || null);
  const planningIsCompleted = materialConsumption.length > 0 || !!machineStep;
  
  const planningStage = {
    status: planningIsCompleted ? 'completed' : 'draft',
    started_at: planningStartDate,
    started_by: batch.operator || batch.supervisor || 'System',
    completed_at: planningCompletionDate,
    completed_by: planningIsCompleted ? (batch.operator || batch.supervisor || 'System') : null
  };

  // Machine Stage:
  // - Start: When moving to machine stage (same as planning completion - first machine step creation/start)
  // - Completion: When machine step status is 'completed' (not just when wastage step exists)
  // - Status: "in_progress" if machine step exists but not completed, "completed" if machine step status is 'completed'
  const machineStartDate = machineStep?.start_time || machineStep?.started_at || machineStep?.created_at || machineStep?.createdAt || planningCompletionDate;
  const machineCompletionDate = machineStep?.status === 'completed' 
    ? (machineStep?.end_time || machineStep?.completed_at || machineStep?.endTime || wastageStep?.created_at || wastageStep?.createdAt || null)
    : null;
  const machineIsCompleted = machineStep?.status === 'completed';
  const machineIsInProgress = !!machineStep && machineStep.status === 'in_progress' && !machineIsCompleted;

  const machineStage = {
    status: machineIsCompleted ? 'completed' : (machineIsInProgress ? 'in_progress' : 'not_started'),
    started_at: machineStartDate,
    started_by: machineStep?.inspector_name || machineStep?.inspector || batch.operator || batch.supervisor || 'System',
    completed_at: machineCompletionDate,
    completed_by: machineIsCompleted ? (wastageStep?.inspector_name || wastageStep?.inspector || batch.operator || batch.supervisor || 'System') : null
  };

  // Wastage Stage:
  // - Use explicit stage status from batch if available, otherwise infer from flow steps
  // - Only mark as completed when explicitly set, not just when wastage records exist
  const wastageStartDate = batch.wastage_stage?.started_at || wastageStep?.created_at || wastageStep?.createdAt || wastageStep?.start_time || wastageStep?.started_at || null;
  const wastageCompletionDate = batch.wastage_stage?.completed_at || null; // Only use explicit completion date
  const wastageIsCompleted = batch.wastage_stage?.status === 'completed'; // Only completed if explicitly marked
  const wastageIsInProgress = batch.wastage_stage?.status === 'in_progress' || (wastageRecords.length > 0 && !wastageIsCompleted && (!batch.wastage_stage?.status || batch.wastage_stage?.status === 'not_started'));
  const hasWastage = wastageRecords.length > 0 || batch.wastage_stage?.has_wastage || false;

  const wastageStage = {
    status: (wastageIsCompleted ? 'completed' : (wastageIsInProgress ? 'in_progress' : 'not_started')) as 'completed' | 'in_progress' | 'not_started',
    started_at: wastageStartDate,
    started_by: batch.wastage_stage?.started_by || wastageStep?.inspector_name || wastageStep?.inspector || batch.operator || batch.supervisor || 'System',
    completed_at: wastageCompletionDate,
    completed_by: batch.wastage_stage?.completed_by || (wastageIsCompleted ? (batch.operator || batch.supervisor || 'System') : null),
    has_wastage: hasWastage
  };

  // Final Stage (Individual Details):
  // - Start when wastage is completed
  // - Mark as in_progress when wastage is completed but batch is not completed
  // - Only mark as completed when production batch status is 'completed'
  const finalStartDate = batch.final_stage?.started_at || (wastageIsCompleted ? wastageCompletionDate : null) || finalStep?.created_at || finalStep?.createdAt || finalStep?.start_time || finalStep?.started_at || null;
  const finalCompletionDate = batch.status === 'completed' 
    ? (batch.final_stage?.completed_at || batch.completion_date || null)
    : null;
  const finalIsCompleted = batch.status === 'completed'; // Only completed when batch status is 'completed'
  const finalIsInProgress = wastageIsCompleted && !finalIsCompleted; // In progress when wastage is completed but batch is not

  const finalStage = {
    status: (finalIsCompleted ? 'completed' : (finalIsInProgress ? 'in_progress' : 'not_started')) as 'completed' | 'in_progress' | 'not_started',
    started_at: finalStartDate,
    started_by: batch.final_stage?.started_by || finalStep?.inspector_name || finalStep?.inspector || batch.operator || batch.supervisor || 'System',
    completed_at: finalCompletionDate,
    completed_by: batch.final_stage?.completed_by || (finalIsCompleted ? (batch.operator || batch.supervisor || 'System') : null),
    products_count: batch.actual_quantity || batch.planned_quantity || 0
  };

  // Determine which stages to show based on progress
  // Always show planning stage
  // Show machine stage only if planning is completed
  // Show wastage stage if machine is completed OR if wastage records exist OR if wastage_stage is in_progress OR completed
  // Show final stage (individual products) only if wastage is completed
  const showMachineStage = planningStage.status === 'completed';
  const showWastageStage = machineStage.status === 'completed' || 
                          wastageRecords.length > 0 || 
                          batch.wastage_stage?.status === 'in_progress' ||
                          batch.wastage_stage?.status === 'completed'; // Show wastage even when completed
  const showFinalStage = wastageStage.status === 'completed' || wastageStage.status === 'in_progress'; // Show individual products stage when wastage is completed or in progress

  return (
    <div className="space-y-6">
      {/* Planning Stage - Always shown */}
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('planning')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Planning Stage</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Material planning and consumption
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={planningStage.status === 'completed' ? 'default' : 'secondary'} className={planningStage.status === 'completed' ? 'text-white' : ''}>
                {planningStage.status || 'draft'}
              </Badge>
              {expandedSections.planning ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>

        {expandedSections.planning && (
          <CardContent>
            {/* Stage Timeline */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <PlayCircle className="w-4 h-4" />
                  Started
                </div>
                <div className="font-medium">{formatDate(planningStage.started_at)}</div>
                {planningStage.started_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {planningStage.started_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <StopCircle className="w-4 h-4" />
                  Completed
                </div>
                <div className="font-medium">{formatDate(planningStage.completed_at)}</div>
                {planningStage.completed_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {planningStage.completed_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Status
                </div>
                <Badge variant={planningStage.status === 'completed' ? 'default' : 'secondary'} className={`mt-1 ${planningStage.status === 'completed' ? 'text-white' : ''}`}>
                  {planningStage.status || 'Draft'}
                </Badge>
              </div>
            </div>

            {/* Materials Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Material</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actual Consumed</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Individual Products</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Consumed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {materialConsumption.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No materials consumed yet
                      </td>
                    </tr>
                  ) : (
                    materialConsumption.map((material) => (
                      <>
                        <tr key={material.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              <TruncatedText text={material.material_name} maxLength={40} className="block" />
                            </div>
                            <div className="text-sm text-gray-500 font-mono">{material.material_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={material.material_type === 'product' ? 'default' : 'secondary'} className={material.material_type === 'product' ? 'text-white' : ''}>
                              {material.material_type?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">{material.quantity_used} {material.unit}</span>
                          </td>
                          <td className="px-4 py-3">
                            {material.actual_consumed_quantity ? (
                              <span>{material.actual_consumed_quantity.toFixed(2)} {material.unit}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {material.individual_products?.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit">{material.individual_products.length} products</Badge>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDate(material.consumed_at)}
                          </td>
                        </tr>
                        {/* Individual Products Detailed Table */}
                        {material.material_type === 'product' && material.individual_products && material.individual_products.length > 0 && (
                          <tr key={`${material.id}-products`}>
                            <td colSpan={6} className="px-4 py-3 bg-blue-50">
                              <div className="mt-2">
                                <h5 className="text-sm font-semibold text-blue-900 mb-2">
                                  Consumed Individual Products ({material.individual_products.length})
                                </h5>
                                <div className="overflow-x-auto max-h-60 overflow-y-auto border border-blue-200 rounded-lg">
                                  <table className="w-full text-xs border-collapse">
                                    <thead className="bg-blue-100 sticky top-0">
                                      <tr>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">#</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Product ID</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">QR Code</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Serial Number</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Size (L × W)</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Weight</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Color</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Pattern</th>
                                        <th className="border border-blue-300 px-2 py-2 text-left font-semibold text-blue-900">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                      {material.individual_products.map((product: any, idx: number) => {
                                        const statusColor = product.status === 'used' 
                                          ? 'bg-green-100 text-green-800 border-green-300' 
                                          : product.status === 'in_production'
                                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                          : 'bg-gray-100 text-gray-800 border-gray-300';
                                        return (
                                          <tr key={product.id || idx} className="hover:bg-gray-50">
                                            <td className="border border-gray-200 px-2 py-2 text-gray-600">{idx + 1}</td>
                                            <td className="border border-gray-200 px-2 py-2 font-medium text-gray-900">{product.id || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.qr_code || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                              {product.length && product.width ? (
                                                <>
                                                  {product.length.includes(' ') ? product.length : `${product.length} ${product.length_unit || ''}`} × {product.width.includes(' ') ? product.width : `${product.width} ${product.width_unit || ''}`}
                                                </>
                                              ) : '—'}
                                            </td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                              {product.weight ? (
                                                product.weight.includes(' ') ? product.weight : `${product.weight} ${product.weight_unit || ''}`
                                              ) : '—'}
                                            </td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.color || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.pattern || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2">
                                              <Badge className={`${statusColor} text-xs`}>
                                                {product.status || 'unknown'}
                                              </Badge>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Machine Stage - Only show if planning is completed */}
      {showMachineStage && (
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('machine')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Cog className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Machine Stage</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Production flow and machine operations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={
                machineStage.status === 'completed' ? 'default' :
                machineStage.status === 'in_progress' ? 'default' : 'secondary'
              } className={(machineStage.status === 'completed' || machineStage.status === 'in_progress') ? 'text-white' : ''}>
                {machineStage.status || 'not started'}
              </Badge>
              {expandedSections.machine ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>

        {expandedSections.machine && (
          <CardContent>
            {/* Stage Timeline */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <PlayCircle className="w-4 h-4" />
                  Started
                </div>
                <div className="font-medium">{formatDate(machineStage.started_at)}</div>
                {machineStage.started_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {machineStage.started_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <StopCircle className="w-4 h-4" />
                  Completed
                </div>
                <div className="font-medium">{formatDate(machineStage.completed_at, machineStage.status === 'in_progress')}</div>
                {machineStage.completed_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {machineStage.completed_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Progress
                </div>
                {flowSteps.length > 0 && (
                  <Badge variant="outline" className="mt-1">
                    {flowSteps.filter(s => s.status === 'completed').length}/{flowSteps.length} steps
                  </Badge>
                )}
              </div>
            </div>

            {/* Machine Steps Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Step Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Machine</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Shift</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Operator</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Started</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Completed</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {flowSteps.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No machine steps recorded yet
                      </td>
                    </tr>
                  ) : (
                    flowSteps.map((step, index) => (
                      <tr key={step.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            step.status === 'completed' ? 'bg-green-100 text-green-700' :
                            step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {step.step_number || index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{step.step_name}</div>
                          <div className="text-sm text-gray-500">{step.step_type}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{step.machine_name || step.machine_id || '—'}</td>
                        <td className="px-4 py-3">
                          {step.shift ? (
                            <Badge className={
                              step.shift === 'day' 
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }>
                              {step.shift === 'day' ? '☀️ Day' : '🌙 Night'}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{step.inspector_name || step.inspector || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(step.start_time || step.started_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(step.end_time || step.completed_at)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={
                            step.status === 'completed' ? 'default' :
                            step.status === 'in_progress' ? 'default' : 'secondary'
                          } className={(step.status === 'completed' || step.status === 'in_progress') ? 'text-white' : ''}>
                            {step.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
      )}

      {/* Wastage Stage - Show if machine is completed or wastage records exist */}
      {showWastageStage && (
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('wastage')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <CardTitle>Wastage Stage</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Wastage and defect records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={
                wastageStage.status === 'completed' ? 'default' :
                wastageStage.status === 'in_progress' ? 'default' : 'secondary'
              } className={(wastageStage.status === 'completed' || wastageStage.status === 'in_progress') ? 'text-white' : ''}>
                {wastageStage.status || 'not started'}
              </Badge>
              {expandedSections.wastage ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>

        {expandedSections.wastage && (
          <CardContent>
            {/* Stage Timeline */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <PlayCircle className="w-4 h-4" />
                  Started
                </div>
                <div className="font-medium">{formatDate(wastageStage.started_at)}</div>
                {wastageStage.started_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {wastageStage.started_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <StopCircle className="w-4 h-4" />
                  Completed
                </div>
                <div className="font-medium">{wastageStage.completed_at ? formatDate(wastageStage.completed_at, wastageStage.status === 'in_progress') : 'N/A'}</div>
                {wastageStage.completed_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {wastageStage.completed_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Status
                </div>
                <Badge variant={wastageStage.status === 'completed' ? 'default' : 'secondary'} className={`mt-1 ${wastageStage.status === 'completed' ? 'text-white' : ''}`}>
                  {wastageStage.status || 'Not Started'}
                </Badge>
              </div>
            </div>

            {wastageRecords.length > 0 ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Material</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Waste Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {wastageRecords.map((waste) => (
                        <>
                          <tr key={waste.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                <TruncatedText text={waste.material_name || waste.product_name || ''} maxLength={40} className="block" />
                              </div>
                              <div className="text-sm text-gray-500 font-mono">{waste.material_id || waste.product_id}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={waste.material_type === 'product' ? 'default' : 'secondary'} className={waste.material_type === 'product' ? 'text-white' : ''}>
                                {waste.material_type?.replace('_', ' ') || 'raw_material'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{waste.waste_type || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="font-medium">{waste.quantity} {waste.unit}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={waste.waste_category === 'reusable' ? 'default' : 'secondary'} className={waste.waste_category === 'reusable' ? 'text-white' : ''}>
                                {waste.waste_category || 'disposable'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={waste.status === 'generated' ? 'default' : 'secondary'} className={waste.status === 'generated' ? 'text-white' : ''}>
                                {waste.status || 'generated'}
                              </Badge>
                            </td>
                          </tr>
                          {/* Individual Products for Product Wastage */}
                          {waste.material_type === 'product' && waste.individual_products && waste.individual_products.length > 0 && (
                            <tr key={`${waste.id}-products`}>
                              <td colSpan={6} className="px-4 py-3 bg-red-50">
                                <div className="mt-2">
                                  <h5 className="text-xs font-semibold text-red-900 mb-2">
                                    Wasted Individual Products ({waste.individual_products.length})
                                  </h5>
                                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                                    <table className="w-full text-xs border-collapse">
                                      <thead className="bg-red-100 sticky top-0">
                                        <tr>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">#</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Product ID</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">QR Code</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Serial Number</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Size (L × W)</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Weight</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Color</th>
                                          <th className="border border-red-300 px-2 py-2 text-left font-semibold text-red-900">Pattern</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white">
                                        {waste.individual_products.map((product: any, idx: number) => (
                                          <tr key={product.id || idx} className="hover:bg-gray-50">
                                            <td className="border border-gray-200 px-2 py-2 text-gray-600">{idx + 1}</td>
                                            <td className="border border-gray-200 px-2 py-2 font-medium text-gray-900">{product.id || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.qr_code || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                              {product.length && product.width ? (
                                                <>
                                                  {product.length.includes(' ') ? product.length : `${product.length} ${product.length_unit || ''}`} × {product.width.includes(' ') ? product.width : `${product.width} ${product.width_unit || ''}`}
                                                </>
                                              ) : '—'}
                                            </td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                              {product.weight ? (
                                                product.weight.includes(' ') ? product.weight : `${product.weight} ${product.weight_unit || ''}`
                                              ) : '—'}
                                            </td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.color || '—'}</td>
                                            <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.pattern || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No wastage recorded for this batch
              </div>
            )}
          </CardContent>
        )}
      </Card>
      )}

      {/* Final Products - Only show if wastage is completed */}
      {showFinalStage && (
      <Card>
        <CardHeader
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection('products')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Individual Details</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Individual products produced in this batch
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={
                finalStage.status === 'completed' ? 'default' :
                finalStage.status === 'in_progress' ? 'default' : 'secondary'
              } className={(finalStage.status === 'completed' || finalStage.status === 'in_progress') ? 'text-white' : ''}>
                {finalStage.status === 'in_progress' ? 'Active' : 
                 finalStage.status === 'completed' ? 'Completed' : 
                 'Not Started'}
              </Badge>
              {expandedSections.products ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </CardHeader>

        {expandedSections.products && (
          <CardContent>
            {/* Stage Timeline */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <PlayCircle className="w-4 h-4" />
                  Started
                </div>
                <div className="font-medium">{formatDate(finalStage.started_at)}</div>
                {finalStage.started_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {finalStage.started_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <StopCircle className="w-4 h-4" />
                  Completed
                </div>
                <div className="font-medium">{finalStage.completed_at ? formatDate(finalStage.completed_at, finalStage.status === 'in_progress') : 'N/A'}</div>
                {finalStage.completed_by && (
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <User className="w-3 h-3" />
                    {finalStage.completed_by}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Package className="w-4 h-4" />
                  Total Products
                </div>
                <div className="font-medium text-lg">{finalStage.products_count || 0}</div>
              </div>
            </div>

            <div className="text-center py-4 text-gray-500">
              Final products will be displayed here
            </div>
          </CardContent>
        )}
      </Card>
      )}
    </div>
  );
}
