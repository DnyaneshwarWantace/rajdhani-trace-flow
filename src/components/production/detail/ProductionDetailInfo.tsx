import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { Hash, Package, Calendar, User, Building2, Tag, Ruler, Weight } from 'lucide-react';
import { formatIndianDate, formatIndianDateTime } from '@/utils/formatHelpers';
import type { ProductionBatch } from '@/services/productionService';
import { OrderService } from '@/services/orderService';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

interface ProductionDetailInfoProps {
  batch: ProductionBatch;
}

export default function ProductionDetailInfo({ batch }: ProductionDetailInfoProps) {
  const getAttachedOrderNumbers = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Orders:\s*(.+)$/i);
    if (!match?.[1]) return [];
    const raw = match[1].split('·')[0].trim();
    const idMatches = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
    const parsed = (idMatches.length > 0 ? idMatches : raw.split(','))
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(parsed));
  };

  const getAttachedOrderCustomerMap = (notes?: string): Record<string, string> => {
    if (!notes) return {};
    const map: Record<string, string> = {};
    const orderIds = getAttachedOrderNumbers(notes);
    const customersRawMatch = notes.match(/Attached Customers:\s*(.+)$/i);
    const customersRaw = customersRawMatch?.[1] || '';
    if (customersRaw) {
      const entries = customersRaw.split(',').map((s) => s.trim()).filter(Boolean);
      entries.forEach((entry, idx) => {
        const [left, ...rightParts] = entry.split(':');
        const possibleOrderId = (left || '').trim();
        const possibleCustomer = rightParts.join(':').trim();
        if (possibleCustomer && /[A-Z]{2,}-\d{6}-\d{3,}/.test(possibleOrderId)) {
          map[possibleOrderId] = possibleCustomer;
          return;
        }
        if (orderIds[idx] && entry) {
          map[orderIds[idx]] = possibleCustomer || entry;
        }
      });
    }
    const legacyMatch = notes.match(/Order\s+([A-Z]{2,}-\d{6}-\d{3,})\s+For\s+(.+?)(?:\s*·|$)/i);
    if (legacyMatch?.[1] && legacyMatch?.[2] && !map[legacyMatch[1].trim()]) {
      map[legacyMatch[1].trim()] = legacyMatch[2].trim();
    }
    return map;
  };

  const attachedOrderNumbers = getAttachedOrderNumbers(batch.notes);
  const attachedOrderCustomerMap = getAttachedOrderCustomerMap(batch.notes);
  const [orderCustomerMapFromApi, setOrderCustomerMapFromApi] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const loadCustomers = async () => {
      if (attachedOrderNumbers.length === 0) {
        setOrderCustomerMapFromApi({});
        return;
      }
      try {
        const { data } = await OrderService.getOrders({
          limit: 1000,
          sortBy: 'order_date',
          sortOrder: 'desc',
        });
        if (cancelled) return;
        const map: Record<string, string> = {};
        (data || []).forEach((order) => {
          const orderNo = String(order.orderNumber || '').trim();
          const customer = String(order.customerName || '').trim();
          if (orderNo && customer) {
            map[orderNo] = customer;
          }
        });
        setOrderCustomerMapFromApi(map);
      } catch {
        if (!cancelled) setOrderCustomerMapFromApi({});
      }
    };
    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, [batch.id, batch.notes, attachedOrderNumbers.length]);

  const infoItems = [
    {
      label: 'Batch Number',
      value: batch.batch_number || 'N/A',
      icon: Hash,
      color: 'text-gray-600',
      truncate: false,
      show: true,
    },
    {
      label: 'Product Name',
      value: batch.product_name || 'N/A',
      icon: Package,
      color: 'text-primary-600',
      truncate: true,
      maxLength: 40,
      show: true,
    },
    {
      label: 'Planned Quantity',
      value: `${batch.planned_quantity}${batch.actual_quantity && batch.actual_quantity !== batch.planned_quantity ? ` (${batch.actual_quantity} actual)` : ''}`,
      icon: Package,
      color: 'text-blue-600',
      truncate: false,
      show: true,
    },
    {
      label: 'Product Category',
      value: batch.category && batch.category !== 'N/A'
        ? `${batch.category}${batch.subcategory && batch.subcategory !== 'N/A' ? ` / ${batch.subcategory}` : ''}`
        : 'N/A',
      icon: Tag,
      color: 'text-purple-600',
      truncate: true,
      maxLength: 40,
      show: batch.category && batch.category !== 'N/A',
    },
    {
      label: 'Dimensions',
      value: batch.length && batch.width && batch.length !== 'N/A' && batch.width !== 'N/A'
        ? `${batch.length}${batch.length_unit || ''} × ${batch.width}${batch.width_unit || ''}`
        : 'N/A',
      icon: Ruler,
      color: 'text-indigo-600',
      truncate: false,
      show: batch.length && batch.width && batch.length !== 'N/A' && batch.width !== 'N/A',
    },
    {
      label: 'Expected GSM',
      value: batch.weight && batch.weight !== 'N/A'
        ? `${batch.weight} ${batch.weight_unit || ''}`
        : 'N/A',
      icon: Weight,
      color: 'text-green-600',
      truncate: false,
      show: batch.weight && batch.weight !== 'N/A',
    },
    {
      label: 'Operator',
      value: batch.operator || 'N/A',
      icon: User,
      color: 'text-blue-600',
      truncate: false,
      show: !!(batch.operator && String(batch.operator).trim() !== ''),
    },
    {
      label: 'Supervisor',
      value: batch.supervisor || 'N/A',
      icon: Building2,
      color: 'text-indigo-600',
      truncate: false,
      show: !!(batch.supervisor && String(batch.supervisor).trim() !== ''),
    },
    {
      label: 'Start Date',
      value: batch.start_date ? formatIndianDate(batch.start_date) : 'Not Started',
      icon: Calendar,
      color: 'text-green-600',
      truncate: false,
      show: !!batch.start_date && String(batch.start_date).trim() !== '',
    },
    {
      label: 'Completion Date',
      value: batch.completion_date ? formatIndianDate(batch.completion_date) : 'Not Completed',
      icon: Calendar,
      color: 'text-green-600',
      truncate: false,
      show: !!batch.completion_date && String(batch.completion_date).trim() !== '',
    },
    {
      label: 'Created On',
      value: batch.created_at ? formatIndianDateTime(batch.created_at) : 'N/A',
      icon: Calendar,
      color: 'text-indigo-600',
      truncate: false,
      show: !!batch.created_at && String(batch.created_at).trim() !== '',
    },
  ].filter(item => item.show);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Batch Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {infoItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className={`flex-shrink-0 mt-0.5 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">{item.label}</p>
                  <p className="text-sm font-semibold text-gray-900 break-words">
                    {item.truncate && item.value !== 'N/A' ? (
                      <TruncatedText text={item.value} maxLength={item.maxLength || 40} as="span" />
                    ) : (
                      item.value
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <ProductAttributePreview
          color={batch.color}
          pattern={batch.pattern}
          className="mt-4 p-3 rounded-lg border border-gray-200 bg-gray-50"
        />
        {batch.notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-1">Notes</p>
            <p className="text-sm text-blue-800 break-words">{batch.notes}</p>
            {attachedOrderNumbers.length > 0 && (
              <div className="mt-3 border-t border-blue-200 pt-3">
                <p className="text-xs font-medium text-blue-900 mb-1.5">Attached Orders</p>
                <div className="space-y-1">
                  {attachedOrderNumbers.map((orderNo) => (
                    <div key={orderNo} className="text-xs text-blue-900">
                      <span className="font-semibold">{orderNo}</span>
                      <span className="text-blue-700">
                        {' '}
                        · {orderCustomerMapFromApi[orderNo] || attachedOrderCustomerMap[orderNo] || 'Customer not linked'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

