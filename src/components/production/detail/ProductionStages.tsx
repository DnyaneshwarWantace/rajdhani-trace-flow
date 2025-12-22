import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Cog,
  Trash2,
  Package,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ProductionService } from '@/services/productionService';

interface ProductionStagesProps {
  batchId: string;
}

export default function ProductionStages({ batchId }: ProductionStagesProps) {
  const [materialConsumption, setMaterialConsumption] = useState<any[]>([]);
  const [flowSteps, setFlowSteps] = useState<any[]>([]);
  const [wastageRecords] = useState<any[]>([]);
  const [individualProducts] = useState<any[]>([]);
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
  }, [batchId]);

  const loadStageData = async () => {
    try {
      setLoading(true);

      // Load material consumption
      const { data: materials } = await ProductionService.getMaterialConsumption(batchId);
      setMaterialConsumption(materials || []);

      // Load production flow steps
      const { data: flowData } = await ProductionService.getProductionFlowByBatchId(batchId);
      if (flowData?.flow_id) {
        const { data: steps } = await ProductionService.getProductionFlowSteps(flowData.flow_id);
        setFlowSteps(steps || []);
      }

      // TODO: Load wastage records from wastage API
      // const { data: wastage } = await WastageService.getWastageByBatch(batchId);
      // setWastageRecords(wastage || []);

      // TODO: Load individual products produced
      // const { data: products } = await IndividualProductService.getByBatch(batchId);
      // setIndividualProducts(products || []);

    } catch (error) {
      console.error('Error loading stage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading stage details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Planning Stage */}
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
                  Material consumption and planning details
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {materialConsumption.length > 0 && (
                <Badge variant="secondary">
                  {materialConsumption.length} materials consumed
                </Badge>
              )}
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
            {materialConsumption.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No materials consumed yet</p>
            ) : (
              <div className="space-y-4">
                {materialConsumption.map((material, index) => (
                  <div key={material.id || index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{material.material_name}</h4>
                        <p className="text-sm text-gray-500 capitalize">{material.material_type?.replace('_', ' ')}</p>
                      </div>
                      <Badge variant={material.material_type === 'product' ? 'default' : 'secondary'}>
                        {material.quantity_used} {material.unit}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Material ID:</span>
                        <span className="ml-2 font-mono text-gray-900">{material.material_id}</span>
                      </div>
                      {material.actual_consumed_quantity && (
                        <div>
                          <span className="text-gray-500">Actual Consumed:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {material.actual_consumed_quantity?.toFixed(2)} {material.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    {material.individual_products && material.individual_products.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Individual Products ({material.individual_products.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {material.individual_products.map((product: any) => (
                            <Badge
                              key={product.id}
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {product.serial_number || product.id}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {material.consumed_at && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(material.consumed_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Machine Stage */}
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
              {flowSteps.length > 0 && (
                <Badge variant="secondary">
                  {flowSteps.filter(s => s.status === 'completed').length}/{flowSteps.length} steps completed
                </Badge>
              )}
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
            {flowSteps.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No machine steps recorded yet</p>
            ) : (
              <div className="space-y-3">
                {flowSteps.map((step, index) => (
                  <div key={step.id || index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          step.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : step.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {step.step_number}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{step.step_name}</h4>
                          <p className="text-sm text-gray-500 capitalize">{step.step_type?.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <Badge variant={
                        step.status === 'completed' ? 'default' :
                        step.status === 'in_progress' ? 'default' : 'secondary'
                      }>
                        {step.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                      {step.machine_name && (
                        <div>
                          <span className="text-gray-500">Machine:</span>
                          <span className="ml-2 text-gray-900">{step.machine_name}</span>
                        </div>
                      )}
                      {step.inspector && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-900">{step.inspector}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      {step.started_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Started: {formatDate(step.started_at)}
                        </div>
                      )}
                      {step.completed_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Completed: {formatDate(step.completed_at)}
                        </div>
                      )}
                    </div>

                    {step.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {step.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Wastage Stage */}
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
              {wastageRecords.length > 0 && (
                <Badge variant="destructive">
                  {wastageRecords.length} wastage records
                </Badge>
              )}
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
            {wastageRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No wastage recorded</p>
            ) : (
              <div className="space-y-3">
                {wastageRecords.map((wastage, index) => (
                  <div key={wastage.id || index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{wastage.material_name}</h4>
                        <p className="text-sm text-gray-500 capitalize">{wastage.wastage_type?.replace('_', ' ')}</p>
                      </div>
                      <Badge variant="destructive">
                        {wastage.quantity} {wastage.unit}
                      </Badge>
                    </div>

                    {wastage.reason && (
                      <p className="text-sm text-gray-600 mt-2">{wastage.reason}</p>
                    )}

                    {wastage.recorded_by && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        {wastage.recorded_by}
                        {wastage.recorded_at && (
                          <>
                            <span>•</span>
                            {formatDate(wastage.recorded_at)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Final Products */}
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
                <CardTitle>Final Products</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Individual products produced in this batch
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {individualProducts.length > 0 && (
                <Badge variant="default">
                  {individualProducts.length} products
                </Badge>
              )}
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
            {individualProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No products finalized yet</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {individualProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 font-mono text-sm">{product.serial_number}</h4>
                        <p className="text-xs text-gray-500">{product.qr_code}</p>
                      </div>
                      <Badge variant={product.status === 'available' ? 'default' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      {product.length && (
                        <div>
                          <span className="text-gray-500">Length:</span>
                          <span className="ml-1 text-gray-900">{product.length}</span>
                        </div>
                      )}
                      {product.width && (
                        <div>
                          <span className="text-gray-500">Width:</span>
                          <span className="ml-1 text-gray-900">{product.width}</span>
                        </div>
                      )}
                      {product.weight && (
                        <div>
                          <span className="text-gray-500">Weight:</span>
                          <span className="ml-1 text-gray-900">{product.weight}</span>
                        </div>
                      )}
                      {product.color && (
                        <div>
                          <span className="text-gray-500">Color:</span>
                          <span className="ml-1 text-gray-900">{product.color}</span>
                        </div>
                      )}
                    </div>

                    {product.created_at && (
                      <div className="mt-2 text-xs text-gray-500">
                        Created: {formatDate(product.created_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
