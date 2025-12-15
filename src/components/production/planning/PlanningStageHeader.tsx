import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';

interface PlanningStageHeaderProps {
  onBack: () => void;
}

export default function PlanningStageHeader({ onBack }: PlanningStageHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Planning Stage</h1>
              <p className="text-sm text-gray-600">Prepare and plan your production batch</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

