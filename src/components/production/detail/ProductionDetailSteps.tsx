import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, PlayCircle } from 'lucide-react';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductionStep {
  id?: string;
  step_number: number;
  step_name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  estimated_duration?: number;
  actual_duration?: number;
  operator?: string;
  start_time?: string;
  end_time?: string;
  quality_check_result?: string;
  notes?: string;
}

interface ProductionDetailStepsProps {
  steps: ProductionStep[];
}

export default function ProductionDetailSteps({ steps }: ProductionDetailStepsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (!steps || steps.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Production Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">No production steps available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Production Steps</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id || index}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700">{step.step_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">
                    <TruncatedText text={step.step_name} maxLength={50} />
                  </h4>
                  <Badge className={getStatusColor(step.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(step.status)}
                      <span>{step.status.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </Badge>
                </div>
                {step.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    <TruncatedText text={step.description} maxLength={100} />
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                  {step.operator && (
                    <div>
                      <span className="font-medium">Operator:</span> {step.operator}
                    </div>
                  )}
                  {step.estimated_duration && (
                    <div>
                      <span className="font-medium">Estimated:</span> {step.estimated_duration} min
                    </div>
                  )}
                  {step.actual_duration && (
                    <div>
                      <span className="font-medium">Actual:</span> {step.actual_duration} min
                    </div>
                  )}
                  {step.start_time && (
                    <div>
                      <span className="font-medium">Started:</span> {formatIndianDateTime(step.start_time)}
                    </div>
                  )}
                  {step.end_time && (
                    <div>
                      <span className="font-medium">Completed:</span> {formatIndianDateTime(step.end_time)}
                    </div>
                  )}
                  {step.quality_check_result && (
                    <div className="sm:col-span-2">
                      <span className="font-medium">Quality Check:</span> {step.quality_check_result}
                    </div>
                  )}
                </div>
                {step.notes && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <span className="font-medium">Notes:</span> {step.notes}
                    </p>
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


