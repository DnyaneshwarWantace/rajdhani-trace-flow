import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProductionCreateHeaderProps {
  onBack: () => void;
}

export default function ProductionCreateHeader({ onBack }: ProductionCreateHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Production Batch</h1>
          <p className="text-sm text-gray-600 mt-1">Add a new production batch for a product</p>
        </div>
      </div>
    </div>
  );
}


