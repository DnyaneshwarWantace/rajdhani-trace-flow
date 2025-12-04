import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Plus } from 'lucide-react';

interface SupplierEmptyStateProps {
  onCreate: () => void;
}

export default function SupplierEmptyState({ onCreate }: SupplierEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Building className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Suppliers Found</h2>
        <Button onClick={onCreate} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </CardContent>
    </Card>
  );
}

