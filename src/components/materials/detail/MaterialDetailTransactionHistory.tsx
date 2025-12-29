import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, Factory, ShoppingCart, CheckCircle, Clock } from 'lucide-react';
import { ProductionService } from '@/services/productionService';
import { getApiUrl } from '@/utils/apiConfig';
import type { RawMaterial } from '@/types/material';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaterialDetailTransactionHistoryProps {
  material: RawMaterial;
}

interface ConsumptionRecord {
  id: string;
  production_batch_id?: string;
  batch_number?: string;
  quantity_used: number;
  unit: string;
  consumption_status: 'reserved' | 'in_production' | 'used' | 'sold';
  consumed_at: string;
  order_id?: string;
  customer_id?: string;
  customer_name?: string;
  reserved_at?: string;
  sold_at?: string;
  notes?: string;
  product_id?: string;
  product_name?: string;
  product_category?: string;
  product_color?: string;
  product_pattern?: string;
}

export default function MaterialDetailTransactionHistory({
  material,
}: MaterialDetailTransactionHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadHistory();
  }, [material.id, statusFilter]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      
      // Load MaterialConsumption records (production)
      const { data: consumptionData, summary: summaryData, error } = await ProductionService.getRawMaterialConsumptionHistory(
        material.id,
        {
          status: statusFilter !== 'all' ? statusFilter as any : undefined,
          limit: 100,
        }
      );

      if (error) {
        console.error('Error loading consumption history:', error);
      }

      // Load orders for this material
      let orderRecords: ConsumptionRecord[] = [];
      try {
        const token = localStorage.getItem('auth_token');
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/raw-materials/${material.id}/orders`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const orderData = await response.json();
          const orders = orderData.data || [];
          
          // Convert orders to transaction records
          orderRecords = orders.map((order: any) => {
            let consumptionStatus: 'reserved' | 'sold' = 'reserved';
            let consumedAt = order.created_at;
            let reservedAt: string | undefined;
            let soldAt: string | undefined;
            
            if (order.status === 'pending' || order.status === 'accepted') {
              consumptionStatus = 'reserved';
              consumedAt = order.accepted_at || order.created_at;
              reservedAt = order.accepted_at || order.created_at;
            } else if (order.status === 'dispatched' || order.status === 'delivered') {
              consumptionStatus = 'sold';
              consumedAt = order.dispatched_at || order.delivered_at || order.created_at;
              soldAt = order.dispatched_at || order.delivered_at;
            }
            
            return {
              id: `ORDER-${order.order_id}`,
              production_batch_id: undefined,
              batch_number: undefined,
              quantity_used: order.quantity,
              unit: order.unit,
              consumption_status: consumptionStatus,
              consumed_at: consumedAt,
              order_id: order.order_number,
              customer_id: undefined,
              customer_name: order.customer_name,
              reserved_at: reservedAt,
              sold_at: soldAt,
              notes: `Order: ${order.order_number}`,
              product_id: undefined,
              product_name: undefined,
              product_category: undefined,
              product_color: undefined,
              product_pattern: undefined,
            };
          });
        }
      } catch (error) {
        console.error('Error loading orders:', error);
      }

      // Combine consumption records and order records
      const allRecords = [...(consumptionData || []), ...orderRecords];
      
      // Filter by status if needed
      let filteredRecords = allRecords;
      if (statusFilter !== 'all') {
        filteredRecords = allRecords.filter(r => r.consumption_status === statusFilter);
      }
      
      // Sort by date (newest first)
      filteredRecords.sort((a, b) => {
        const dateA = new Date(a.consumed_at || 0).getTime();
        const dateB = new Date(b.consumed_at || 0).getTime();
        return dateB - dateA;
      });

      setRecords(filteredRecords);
      setSummary(summaryData || {});
    } catch (error) {
      console.error('Error loading transaction history:', error);
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'reserved':
        return (
          <Badge className={`${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200`}>
            <Clock className="w-3 h-3" />
            Reserved
          </Badge>
        );
      case 'in_production':
        return (
          <Badge className={`${baseClasses} bg-blue-100 text-blue-800 border-blue-200`}>
            <Factory className="w-3 h-3" />
            In Production
          </Badge>
        );
      case 'used':
        return (
          <Badge className={`${baseClasses} bg-green-100 text-green-800 border-green-200`}>
            <CheckCircle className="w-3 h-3" />
            Used
          </Badge>
        );
      case 'sold':
        return (
          <Badge className={`${baseClasses} bg-purple-100 text-purple-800 border-purple-200`}>
            <ShoppingCart className="w-3 h-3" />
            Sold
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="in_production">In Production</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Total Used</p>
              <p className="text-2xl font-bold text-blue-900">
                {summary.total_used?.toFixed(2) || 0} {material.unit}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-600 font-medium">Reserved</p>
              <p className="text-2xl font-bold text-yellow-900">
                {/* Reserved from orders (material.reserved) + reserved from MaterialConsumption (summary.reserved) */}
                {(Number(material.reserved || 0) + Number(summary.reserved || 0)).toFixed(2)} {material.unit}
              </p>
              {(Number(material.reserved || 0) > 0) && (
                <p className="text-xs text-yellow-700 mt-1">
                  {Number(material.reserved || 0).toFixed(2)} from orders
                </p>
              )}
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium">Used</p>
              <p className="text-2xl font-bold text-green-900">
                {summary.used?.toFixed(2) || 0} {material.unit}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-medium">Sold</p>
              <p className="text-2xl font-bold text-purple-900">
                {/* Sold from orders (material.sold) + sold from MaterialConsumption (summary.sold) */}
                {(Number(material.sold || 0) + Number(summary.sold || 0)).toFixed(2)} {material.unit}
              </p>
              {(Number(material.sold || 0) > 0) && (
                <p className="text-xs text-purple-700 mt-1">
                  {Number(material.sold || 0).toFixed(2)} from orders
                </p>
              )}
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No transaction history found for this material</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Transaction ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Production Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Product Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Order ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Customer ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Reserved Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    Sold Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.map((record, index) => (
                  <tr 
                    key={record.id} 
                    className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-4 py-3 text-xs font-mono text-gray-900 border-r border-gray-200">
                      {record.id || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap">
                      {formatDate(record.consumed_at)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">
                      {record.quantity_used?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 border-r border-gray-200 uppercase">
                      {record.unit || material.unit}
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200">
                      {getStatusBadge(record.consumption_status || 'in_production')}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 border-r border-gray-200">
                      {record.batch_number || record.production_batch_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">
                      {record.product_name ? (
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{record.product_name}</div>
                          {record.product_category && (
                            <div className="text-xs text-gray-500">Category: {record.product_category}</div>
                          )}
                          {(record.product_color || record.product_pattern) && (
                            <div className="text-xs text-gray-500">
                              {[record.product_color, record.product_pattern].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 border-r border-gray-200">
                      {record.order_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 border-r border-gray-200">
                      {record.customer_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 border-r border-gray-200">
                      {record.customer_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 border-r border-gray-200 whitespace-nowrap">
                      {record.reserved_at ? formatDate(record.reserved_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 border-r border-gray-200 whitespace-nowrap">
                      {record.sold_at ? formatDate(record.sold_at) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                      <div className="truncate" title={record.notes || ''}>
                        {record.notes || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

