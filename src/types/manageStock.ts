export interface StockOrder {
  id: string;
  order_number: string;
  materialName: string;
  materialCategory?: string;
  materialBatchNumber?: string;
  supplier: string;
  supplier_id?: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  orderDate: string;
  expectedDelivery: string;
  status: 'ordered' | 'pending' | 'approved' | 'shipped' | 'in-transit' | 'delivered' | 'cancelled';
  notes?: string;
  actualDelivery?: string;
  minThreshold?: number;
  maxCapacity?: number;
  qualityGrade?: string;
  isRestock?: boolean;
  created_by?: string;
  createdAt?: string;
  created_at?: string;
  status_history?: Array<{
    status: string;
    changed_by: string;
    changed_at: string;
    notes?: string;
  }>;
}

export interface OrderStats {
  totalOrders: number;
  totalValue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

export interface OrderFilters {
  search: string;
  status: string;
  page: number;
  limit: number;
}

