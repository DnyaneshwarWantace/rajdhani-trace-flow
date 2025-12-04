import Masonry from 'react-masonry-css';
import CustomerCard from './CustomerCard';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerGridProps {
  customers: Customer[];
  orders: Order[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  canDelete: boolean;
}

export default function CustomerGrid({
  customers,
  orders,
  onEdit,
  onDelete,
  canDelete,
}: CustomerGridProps) {
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
      {customers.map((customer) => (
        <div key={customer.id} className="mb-4">
          <CustomerCard
            customer={customer}
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

