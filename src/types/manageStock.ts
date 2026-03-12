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
  status: 'pending' | 'approved' | 'shipped' | 'received';
  notes?: string;
  actualDelivery?: string;
  minThreshold?: number;
  maxCapacity?: number;
  isRestock?: boolean;
  created_by?: string;
  createdAt?: string;
  created_at?: string;
  receivedQuantity?: number;
  receivedTotalCost?: number;
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
  approvedOrders: number;
  shippedOrders: number;
  receivedOrders: number;
}

export interface OrderFilters {
  search: string;
  status: string | string[];
  page: number;
  limit: number;
}

