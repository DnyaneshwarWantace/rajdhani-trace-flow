import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Factory, Plus } from 'lucide-react';

interface ProductionEmptyStateProps {
  onCreate: () => void;
}

export default function ProductionEmptyState({ onCreate }: ProductionEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Factory className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Production Batches Found</h2>
        <p className="text-gray-600 mb-4">Get started by creating your first production batch</p>
        <Button onClick={onCreate} className="bg-primary-600 hover:bg-primary-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Batch
        </Button>
      </CardContent>
    </Card>
  );
}


