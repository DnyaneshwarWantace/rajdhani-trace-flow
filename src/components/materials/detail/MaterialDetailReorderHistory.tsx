import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Package, Calendar, Building2, Loader2 } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { StockOrder } from '@/services/manageStockService';
import type { RawMaterial } from '@/types/material';

interface MaterialDetailReorderHistoryProps {
  material: RawMaterial;
}

export default function MaterialDetailReorderHistory({ material }: MaterialDetailReorderHistoryProps) {
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReorderHistory();
  }, [material.id, material.name]);

  const loadReorderHistory = async () => {
    try {
      setLoading(true);
      // Fetch raw orders directly to check all items in each order
      const { getApiUrl } = await import('@/utils/apiConfig');
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/purchase-orders?limit=1000`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();
      const rawOrders = result.data || [];

      console.log('🔍 Loading reorder history for material:', {
        materialId: material.id,
        materialName: material.name,
        totalOrders: rawOrders.length
      });

      // Filter orders that contain this material in ANY item
      const matchingOrders = rawOrders.filter((order: any) => {
        // Check items array (new format)
        if (order.items && order.items.length > 0) {
          const hasMatchingItem = order.items.some((item: any) => {
            // Match by material_id
            if (item.material_id && item.material_id === material.id) {
              return true;
            }
            // Match by material_name (case-insensitive)
            if (item.material_name && material.name) {
              const itemName = item.material_name.toLowerCase().trim();
              const materialName = material.name.toLowerCase().trim();
              return itemName === materialName || 
                     itemName.includes(materialName) || 
                     materialName.includes(itemName);
            }
            return false;
          });
          if (hasMatchingItem) return true;
        }

        // Check material_details (old format)
        const materialDetails = order.material_details || {};
        if (materialDetails.materialName && material.name) {
          const detailName = materialDetails.materialName.toLowerCase().trim();
          const materialName = material.name.toLowerCase().trim();
          return detailName === materialName || 
                 detailName.includes(materialName) || 
                 materialName.includes(detailName);
        }

        return false;
      });

      console.log('📦 Found matching orders:', matchingOrders.length);

      // Transform matching orders, extracting data for THIS material only
      const transformedOrders: StockOrder[] = matchingOrders.map((order: any) => {
        const materialDetails = order.material_details || {};
        
        // Find the matching item for this material
        let matchingItem = null;
        if (order.items && order.items.length > 0) {
          matchingItem = order.items.find((item: any) => {
            if (item.material_id === material.id) return true;
            if (item.material_name && material.name) {
              const itemName = item.material_name.toLowerCase().trim();
              const materialName = material.name.toLowerCase().trim();
              return itemName === materialName || 
                     itemName.includes(materialName) || 
                     materialName.includes(itemName);
            }
            return false;
          });
        }

        // Use matching item data if found, otherwise fall back to material_details
        const quantity = matchingItem ? matchingItem.quantity : (materialDetails.quantity || 0);
        const unit = matchingItem ? matchingItem.unit : (materialDetails.unit || 'units');
        const costPerUnit = matchingItem ? matchingItem.unit_price : (materialDetails.costPerUnit || 0);
        const totalCost = matchingItem ? matchingItem.total_price : (order.total_amount || order.pricing?.total_amount || 0);

        return {
          id: order.id,
          order_number: order.order_number,
          materialName: matchingItem ? matchingItem.material_name : (materialDetails.materialName || 'Material Order'),
          materialCategory: materialDetails.materialCategory || 'Other',
          materialBatchNumber: materialDetails.materialBatchNumber || `BATCH-${order.id}`,
          supplier: order.supplier_name,
          supplier_id: order.supplier_id,
          quantity: quantity,
          unit: unit,
          costPerUnit: costPerUnit,
          totalCost: totalCost,
          orderDate: order.order_date,
          expectedDelivery: order.expected_delivery,
          status: order.status === 'pending' ? 'ordered' : (order.status === 'shipped' ? 'in-transit' : order.status),
          notes: materialDetails.userNotes || materialDetails.notes || order.notes || '',
          actualDelivery: order.actual_delivery,
          minThreshold: materialDetails.minThreshold || 100,
          maxCapacity: materialDetails.maxCapacity || 1000,
          qualityGrade: materialDetails.qualityGrade || 'A',
          isRestock: materialDetails.isRestock || false,
          created_by: order.created_by,
          createdAt: order.createdAt || order.created_at,
          created_at: order.created_at || order.createdAt,
          status_history: order.status_history || []
        } as StockOrder;
      });

      const sortedOrders = transformedOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
      console.log('✅ Final orders to display:', sortedOrders.length);
      setOrders(sortedOrders);
    } catch (error) {
      console.error('❌ Error loading reorder history:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      delivered: 'bg-green-100 text-green-800',
      'in-transit': 'bg-orange-100 text-orange-800',
      shipped: 'bg-orange-100 text-orange-800',
      approved: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
      ordered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100'}>{status}</Badge>;
  };

  const getTotalReorderStats = () => {
    const totalOrders = orders.length;
    const totalQuantity = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    const totalValue = orders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
    
    return {
      totalOrders,
      totalQuantity,
      totalValue,
      deliveredOrders,
    };
  };

  const stats = getTotalReorderStats();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Reorder History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No reorder history found for this material</p>
          </div>
        ) : (
          <>
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                <p className="text-xl font-bold text-blue-600">{stats.totalOrders}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Delivered</p>
                <p className="text-xl font-bold text-green-600">{stats.deliveredOrders}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Quantity</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalQuantity} {material.unit}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Total Value</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.totalValue)}</p>
              </div>
            </div>

            {/* Order List */}
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{order.order_number || order.id}</h4>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatIndianDate(order.orderDate)}</span>
                        </div>
                        {order.expectedDelivery && (
                          <div className="flex items-center gap-1">
                            <span>Expected:</span>
                            <span>{formatIndianDate(order.expectedDelivery)}</span>
                          </div>
                        )}
                        {order.actualDelivery && (
                          <div className="flex items-center gap-1 text-green-600">
                            <span>✓ Delivered:</span>
                            <span>{formatIndianDate(order.actualDelivery)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalCost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Supplier</p>
                        <p className="text-sm font-medium text-gray-900">{order.supplier}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-sm font-medium text-gray-900">
                        {order.quantity} {order.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cost/Unit</p>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(order.costPerUnit)}</p>
                    </div>
                  </div>

                  {order.materialBatchNumber && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500">Batch Number</p>
                      <p className="text-sm font-medium text-gray-900">{order.materialBatchNumber}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

