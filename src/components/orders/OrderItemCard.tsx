import { formatCurrency } from '@/utils/formatHelpers';

interface ProductDetails {
  color?: string;
  pattern?: string;
  category?: string;
  subcategory?: string;
  weight?: string;
  width?: string;
  length?: string;
  sqm_per_piece?: string;
  width_unit?: string;
  length_unit?: string;
  supplier?: string;
}

interface OrderItemCardProps {
  item: {
    id: string;
    product_name: string;
    product_type: 'product' | 'raw_material';
    quantity: number;
    unit: string;
    unit_price: string;
    gst_rate: string;
    gst_amount: string;
    gst_included: boolean;
    subtotal: string;
    total_price: string;
    quality_grade?: string;
    specifications?: string;
    product_details?: ProductDetails | null;
  };
  index?: number;
  orderStatus?: string;
}

export function OrderItemCard({ item }: OrderItemCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-base mb-1">{item.product_name}</h3>
          <p className="text-sm text-gray-600">
            {item.product_type === 'raw_material' ? 'Raw Material' : 'Finished Product'} • Qty: {Number(item.quantity).toFixed(2)} {item.unit}
          </p>
        </div>
        <div className="text-right ml-4">
          <p className="text-xl font-bold">{formatCurrency(parseFloat(item.total_price))}</p>
        </div>
      </div>
    </div>
  );
}
