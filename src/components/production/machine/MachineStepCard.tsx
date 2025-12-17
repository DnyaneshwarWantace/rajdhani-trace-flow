import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, CheckCircle, Clock, User, Settings } from 'lucide-react';

interface MachineStepCardProps {
  step: any;
  stepNumber: number;
  onUpdate: (updates: any) => void;
  compact?: boolean;
}

export default function MachineStepCard({
  step,
  stepNumber,
  onUpdate,
  compact = false,
}: MachineStepCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleStart = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({
        status: 'in_progress',
        start_time: new Date().toISOString(),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePause = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({
        status: 'pending',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    setIsUpdating(true);
    try {
      await onUpdate({
        status: 'completed',
        end_time: new Date().toISOString(),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Compact view for table
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {step.status === 'pending' && (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={isUpdating}
            className="flex items-center gap-1 h-7 text-xs"
          >
            <Play className="w-3 h-3" />
            Start
          </Button>
        )}
        {step.status === 'in_progress' && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              disabled={isUpdating}
              className="flex items-center gap-1 h-7 text-xs"
            >
              <Pause className="w-3 h-3" />
              Pause
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              disabled={isUpdating}
              className="flex items-center gap-1 h-7 text-xs bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-3 h-3" />
              Complete
            </Button>
          </>
        )}
        {step.status === 'completed' && (
          <div className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </div>
        )}
      </div>
    );
  }

  // Full card view
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-500">Step {stepNumber}</span>
              <Badge variant="outline" className={getStatusColor(step.status)}>
                {getStatusLabel(step.status)}
              </Badge>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{step.step_name || 'Machine Operation'}</h3>
            {step.notes && (
              <p className="text-sm text-gray-600">{step.notes}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          {step.machine_id && (
            <div className="flex items-center gap-2 text-gray-600">
              <Settings className="w-4 h-4" />
              <span className="font-mono text-xs">{step.machine_id}</span>
            </div>
          )}
          {step.inspector_name && (
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>{step.inspector_name}</span>
            </div>
          )}
          {step.start_time && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Started: {new Date(step.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
          {step.end_time && (
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="w-4 h-4" />
              <span>Completed: {new Date(step.end_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step.status === 'pending' && (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start
            </Button>
          )}
          {step.status === 'in_progress' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePause}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                Pause
              </Button>
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={isUpdating}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Complete
              </Button>
            </>
          )}
          {step.status === 'completed' && (
            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Step Completed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

