import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, CheckCircle2, Circle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProductionStep {
  step_number: number;
  step_name: string;
  description?: string;
  estimated_duration?: number; // in minutes
  status: 'pending' | 'in_progress' | 'completed';
}

interface ProductionStepsPreviewProps {
  steps: ProductionStep[];
}

export default function ProductionStepsPreview({ steps }: ProductionStepsPreviewProps) {
  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="w-5 h-5" />
            Production Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Factory className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No production steps defined</p>
            <p className="text-xs text-gray-400 mt-1">Steps will be added based on recipe</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalDuration = steps.reduce((sum, step) => sum + (step.estimated_duration || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Factory className="w-5 h-5" />
          Production Steps
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">{steps.length}</div>
            <div className="text-xs text-blue-700">Total Steps</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-600">
              {totalDuration > 0 ? `${Math.round(totalDuration / 60)}h ${totalDuration % 60}m` : 'N/A'}
            </div>
            <div className="text-xs text-purple-700">Est. Duration</div>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.step_number}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : step.status === 'in_progress' ? (
                  <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">
                    Step {step.step_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      step.status === 'completed'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : step.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }
                  >
                    {step.status === 'completed'
                      ? 'Completed'
                      : step.status === 'in_progress'
                      ? 'In Progress'
                      : 'Pending'}
                  </Badge>
                </div>
                <p className="font-medium text-gray-900">{step.step_name}</p>
                {step.description && (
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                )}
                {step.estimated_duration && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Est. {step.estimated_duration} minutes</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

