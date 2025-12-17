import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductionService } from '@/services/productionService';
import { useToast } from '@/hooks/use-toast';
import MachineStepCard from './MachineStepCard';
import { Loader2, Factory } from 'lucide-react';

interface MachineStepsListProps {
  batchId?: string;
  productionFlow: any;
  onStepUpdate: () => void;
}

export default function MachineStepsList({
  productionFlow,
  onStepUpdate,
}: MachineStepsListProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productionFlow?.id) {
      loadSteps();
    } else {
      setSteps([]);
      setLoading(false);
    }
  }, [productionFlow]);

  const loadSteps = async () => {
    try {
      setLoading(true);
      const { data, error } = await ProductionService.getProductionFlowSteps(productionFlow.id);
      
      if (error) {
        console.error('Error loading steps:', error);
        return;
      }

      // Filter only machine operation steps
      const machineSteps = (data || []).filter(
        (step: any) => step.step_type === 'machine_operation'
      );
      
      // Sort by order_index
      machineSteps.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      
      setSteps(machineSteps);
    } catch (error) {
      console.error('Error loading steps:', error);
      toast({
        title: 'Error',
        description: 'Failed to load machine steps',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStepUpdate = async (stepId: string, updates: any) => {
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

      toast({
        title: 'Success',
        description: 'Step updated successfully',
      });

      await loadSteps();
      onStepUpdate();
    } catch (error) {
      console.error('Error updating step:', error);
      toast({
        title: 'Error',
        description: 'Failed to update step',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!productionFlow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Machine Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Production flow has not been created yet. Machine steps will appear here once the production flow is initialized.
            </p>
            <p className="text-xs text-gray-500">
              The production flow is typically created when you start the first machine operation. 
              You can still view material consumption details in the right panel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Machine Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600">
            No machine steps found. Machine steps will appear here when production flow is created.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Pending';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="w-5 h-5" />
          Machine Steps ({steps.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Step</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Step Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Machine ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Inspector</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {steps.map((step, index) => (
                <tr key={step.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    Step {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(step.status)}`}>
                      {getStatusLabel(step.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {step.step_name || 'Machine Operation'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {step.notes || step.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-700">
                    {step.machine_id || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {step.inspector_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <MachineStepCard
                      step={step}
                      stepNumber={index + 1}
                      onUpdate={(updates) => handleStepUpdate(step.id, updates)}
                      compact={true}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

