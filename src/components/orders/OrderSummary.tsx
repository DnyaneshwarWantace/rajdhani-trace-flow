import { CheckCircle, User, Package, Mail, Phone, MapPin, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatHelpers';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';

/** Minimal customer info for order summary display */
export interface OrderSummaryCustomer {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  company_name?: string;
  gst_number?: string;
}

interface OrderSummaryProps {
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting?: boolean;
  /** Optional: show full order review with customer and line items before create */
  items?: ExtendedOrderItem[];
  /** Full customer info to show in summary (if not provided, customerName is used for name only) */
  customer?: OrderSummaryCustomer | null;
  customerName?: string;
}

export default function OrderSummary({
  subtotal,
  gstAmount,
  totalAmount,
  paidAmount,
  onCancel,
  onSubmit,
  canSubmit,
  isSubmitting = false,
  items = [],
  customer,
  customerName,
}: OrderSummaryProps) {
  const outstandingAmount = totalAmount - paidAmount;
  const showFullSummary = items.length > 0;
  const displayName = customer?.name ?? customerName ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        {showFullSummary && (
          <p className="text-sm text-gray-500 font-normal mt-1">
            Review your order below, then click Create Order to confirm.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Full order review: customer info + line items */}
        {showFullSummary && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
            {/* Customer info block */}
            {(displayName || customer) && (
              <div className="rounded-md border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                  <User className="w-4 h-4" />
                  Customer information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 min-w-[4rem]">Name</span>
                    <span className="font-medium text-gray-900">{displayName || '—'}</span>
                  </div>
                  {customer?.company_name && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 min-w-[4rem]">Company</span>
                      <span className="text-gray-900">{customer.company_name}</span>
                    </div>
                  )}
                  {customer?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 min-w-[4rem]">Email</span>
                      <span className="text-gray-900">{customer.email}</span>
                    </div>
                  )}
                  {customer?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 min-w-[4rem]">Phone</span>
                      <span className="text-gray-900">{customer.phone}</span>
                    </div>
                  )}
                  {(customer?.address || customer?.city || customer?.pincode) && (
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-500 block text-xs mb-0.5">Address</span>
                        <span className="text-gray-900">
                          {[customer.address, [customer.city, customer.state].filter(Boolean).join(', '), customer.pincode].filter(Boolean).join(' — ')}
                        </span>
                      </div>
                    </div>
                  )}
                  {customer?.gst_number && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <span className="text-gray-500 min-w-[4rem]">GST No.</span>
                      <span className="text-gray-900">{customer.gst_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Package className="w-4 h-4" />
                Order Items ({items.length})
              </div>
              <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">#</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Product / Material</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700">Qty</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700">Unit Price</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700">GST</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-700">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 text-gray-600">{index + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {item.product_name || '—'}
                        </td>
                        <td className="py-2 px-3">
                          <span className={item.product_type === 'raw_material' ? 'text-amber-700' : 'text-blue-700'}>
                            {item.product_type === 'raw_material' ? 'Raw Material' : 'Product'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {item.quantity} {item.unit || ''}
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price ?? 0)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.gst_amount ?? 0)}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.total_price ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST:</span>
            <span>{formatCurrency(gstAmount)}</span>
          </div>
          <div className="flex justify-between font-medium text-lg border-t pt-2">
            <span>Total Amount:</span>
            <span className="text-primary">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid Amount:</span>
            <span className="text-green-600">{formatCurrency(paidAmount)}</span>
          </div>
          <div className="flex justify-between font-medium text-lg border-t pt-2">
            <span>Outstanding Amount:</span>
            <span className="text-orange-600">{formatCurrency(outstandingAmount)}</span>
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
            disabled={!canSubmit || isSubmitting}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Creating Order...' : 'Create Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


