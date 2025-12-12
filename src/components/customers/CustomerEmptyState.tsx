import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Plus } from 'lucide-react';

interface CustomerEmptyStateProps {
  onCreate: () => void;
}

export default function CustomerEmptyState({ onCreate }: CustomerEmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Customers Found</h2>
        <Button onClick={onCreate} className="mt-4 bg-primary-600 hover:bg-primary-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </CardContent>
    </Card>
  );
}

