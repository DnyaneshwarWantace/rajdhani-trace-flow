import { Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import OrderItemForm from './OrderItemForm';

interface OrderItemsListProps {
  items: ExtendedOrderItem[];
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof ExtendedOrderItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  onSelectProduct: (item: ExtendedOrderItem) => void;
  products?: any[];
  rawMaterials?: any[];
}

export default function OrderItemsList({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onSelectProduct,
  products = [],
  rawMaterials = [],
}: OrderItemsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Order Items</CardTitle>
        <Button onClick={onAddItem}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <OrderItemForm
              key={item.id}
              item={item}
              index={index}
              onUpdate={onUpdateItem}
              onRemove={onRemoveItem}
              onSelectProduct={onSelectProduct}
              products={products}
              rawMaterials={rawMaterials}
            />
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet</p>
              <p className="text-sm mt-2">Click "Add Item" to start adding products or materials</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


