import { Button } from '@/components/ui/button';
import { Edit, Package } from 'lucide-react';

interface ProductDetailActionsProps {
  onEdit?: () => void;
  onStock?: () => void;
}

export default function ProductDetailActions({
  onEdit,
  onStock,
}: ProductDetailActionsProps) {
  return (
    <div className="space-y-3">
      {onEdit && (
        <Button className="w-full justify-start" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Product
        </Button>
      )}
      {onStock && (
        <Button variant="outline" className="w-full justify-start" onClick={onStock}>
          <Package className="w-4 h-4 mr-2" />
          Stock
        </Button>
      )}
    </div>
  );
}

