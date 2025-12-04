import Masonry from 'react-masonry-css';
import SupplierCard from './SupplierCard';
import type { Supplier } from '@/services/supplierService';
import type { StockOrder } from '@/services/manageStockService';

interface SupplierGridProps {
  suppliers: Supplier[];
  orders: StockOrder[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  canDelete: boolean;
}

export default function SupplierGrid({
  suppliers,
  orders,
  onEdit,
  onDelete,
  canDelete,
}: SupplierGridProps) {
  const breakpointColumnsObj = {
    default: 3,
    1024: 2,
    640: 1,
  };

  return (
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="flex w-auto -ml-4"
      columnClassName="pl-4 bg-clip-padding"
    >
      {suppliers.map((supplier) => (
        <div key={supplier.id} className="mb-4">
          <SupplierCard
            supplier={supplier}
            orders={orders}
            onEdit={onEdit}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </div>
      ))}
    </Masonry>
  );
}

