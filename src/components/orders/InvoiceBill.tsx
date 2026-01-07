import { forwardRef } from 'react';
import type { Order } from '@/services/orderService';

interface InvoiceItem {
  id: string;
  product_name: string;
  product_type?: 'product' | 'raw_material';
  quantity: number;
  unit: string;
  unit_price: string;
  gst_rate: string;
  gst_amount: string;
  gst_included: boolean;
  subtotal: string;
  total_price: string;
  category?: string;
  subcategory?: string;
  color?: string;
  pattern?: string;
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
}

interface InvoiceBillProps {
  order: Order;
  items: InvoiceItem[];
}

export const InvoiceBill = forwardRef<HTMLDivElement, InvoiceBillProps>(
  ({ order, items }, ref) => {
    const formatCurrency = (amount: string | number) => {
      const num = typeof amount === 'string' ? parseFloat(amount) : amount;
      return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (date: string | Date) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
      <div ref={ref} className="bg-white p-6 max-w-5xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="border-b-4 border-blue-600 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-blue-900 mb-2">INVOICE</h1>
              <p className="text-lg text-gray-600">Rajdhani Carpets</p>
              <p className="text-sm text-gray-500 mt-1">Premium Quality Carpets & Textiles</p>
            </div>
            <div className="text-right">
              <div className="bg-blue-50 border-2 border-blue-600 px-4 py-2 rounded-lg">
                <p className="text-xs text-gray-600 font-semibold">Invoice Number</p>
                <p className="text-xl font-bold text-blue-900">{order.orderNumber}</p>
              </div>
              <p className="text-sm text-gray-600 mt-2">Date: {formatDate(order.createdAt || order.orderDate)}</p>
            </div>
          </div>
        </div>

        {/* Bill To & Ship To */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase mb-1 border-b pb-1">Bill To</h3>
            <p className="font-bold text-base text-gray-900">{order.customerName}</p>
            {order.customerEmail && <p className="text-xs text-gray-600">{order.customerEmail}</p>}
            {order.customerPhone && <p className="text-xs text-gray-600">{order.customerPhone}</p>}
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase mb-1 border-b pb-1">Ship To</h3>
            {order.delivery_address ? (
              <div className="text-xs text-gray-600 space-y-0.5">
                {(() => {
                  try {
                    // Parse if it's a JSON string
                    const addr = typeof order.delivery_address === 'string'
                      ? JSON.parse(order.delivery_address)
                      : order.delivery_address;

                    return (
                      <>
                        {addr.address && <p>{addr.address}</p>}
                        <p>
                          {addr.city && `${addr.city}, `}
                          {addr.state && `${addr.state}`}
                          {addr.pincode && ` - ${addr.pincode}`}
                        </p>
                      </>
                    );
                  } catch (e) {
                    // If parsing fails, just display as string
                    return <p>{String(order.delivery_address)}</p>;
                  }
                })()}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Same as billing address</p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="text-left py-2 px-2 font-semibold text-xs">#</th>
                <th className="text-left py-2 px-2 font-semibold text-xs">Product Description</th>
                <th className="text-center py-2 px-2 font-semibold text-xs">Qty</th>
                <th className="text-right py-2 px-2 font-semibold text-xs">Unit Price</th>
                <th className="text-right py-2 px-2 font-semibold text-xs">GST (%)</th>
                <th className="text-right py-2 px-2 font-semibold text-xs">GST Amt</th>
                <th className="text-right py-2 px-2 font-semibold text-xs">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-2 text-xs border-b align-top">{index + 1}</td>
                    <td className="py-2 px-2 text-xs border-b">
                      <p className="font-semibold text-gray-900">{item.product_name}</p>
                      {item.product_type === 'product' && (
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          {item.category && <p>Category: {item.category}</p>}
                          {item.subcategory && <p>Subcategory: {item.subcategory}</p>}
                          {item.color && <p>Color: {item.color}</p>}
                          {item.pattern && <p>Pattern: {item.pattern}</p>}
                          {(item.length || item.width) && (
                            <p>Dimensions: {item.length}{item.length_unit} × {item.width}{item.width_unit}</p>
                          )}
                          {item.weight && <p>Weight: {item.weight}{item.weight_unit}</p>}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">Unit: {item.unit}</p>
                    </td>
                    <td className="py-2 px-2 text-xs text-center border-b align-top">{item.quantity}</td>
                    <td className="py-2 px-2 text-xs text-right border-b align-top">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 px-2 text-xs text-right border-b align-top">{parseFloat(item.gst_rate).toFixed(2)}%</td>
                    <td className="py-2 px-2 text-xs text-right border-b align-top">{formatCurrency(item.gst_amount)}</td>
                    <td className="py-2 px-2 text-xs text-right font-semibold border-b align-top">{formatCurrency(item.total_price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          {/* Left side - Order Dates */}
          <div className="space-y-2">
            <div className="text-xs">
              <p className="font-semibold text-gray-700">Order Date:</p>
              <p className="text-gray-900">{formatDate(order.createdAt || order.orderDate)}</p>
            </div>
            {order.expectedDelivery && (
              <div className="text-xs">
                <p className="font-semibold text-gray-700">Expected Delivery:</p>
                <p className="text-gray-900">{formatDate(order.expectedDelivery)}</p>
              </div>
            )}
            {order.dispatchedAt && (
              <div className="text-xs">
                <p className="font-semibold text-blue-700">Dispatched On:</p>
                <p className="text-blue-900">{formatDate(order.dispatchedAt)}</p>
              </div>
            )}
            {order.deliveredAt && (
              <div className="text-xs">
                <p className="font-semibold text-green-700">Delivered On:</p>
                <p className="text-green-900">{formatDate(order.deliveredAt)}</p>
              </div>
            )}
          </div>

          {/* Right side - Totals */}
          <div>
            <div className="space-y-1">
              <div className="flex justify-between py-1 border-b">
                <span className="text-xs font-semibold text-gray-700">Subtotal:</span>
                <span className="text-xs font-semibold text-gray-900">{formatCurrency(order.subtotal || '0')}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-xs font-semibold text-gray-700">GST:</span>
                <span className="text-xs font-semibold text-gray-900">{formatCurrency(order.gstAmount || '0')}</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-900 text-white px-3 rounded-lg mt-1">
                <span className="text-sm font-bold">Total Amount:</span>
                <span className="text-lg font-bold">{formatCurrency(order.totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-xs font-semibold text-green-700">Paid:</span>
                <span className="text-xs font-semibold text-green-700">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-t-2 border-orange-500">
                <span className="text-sm font-bold text-orange-700">Balance Due:</span>
                <span className="text-sm font-bold text-orange-700">{formatCurrency(order.outstandingAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-4">
          <div className="text-center">
            <h4 className="text-xs font-bold text-gray-700 mb-1">Thank You For Your Business!</h4>
            <p className="text-xs text-gray-500">For any queries, please contact us</p>
            <p className="text-xs text-gray-500">Email: info@rajdhanicarpets.com</p>
          </div>
        </div>

        {/* Remarks */}
        {order.remarks && (
          <div className="mt-4 pt-3 border-t">
            <h4 className="text-xs font-bold text-gray-700 mb-1">Remarks</h4>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{order.remarks}</p>
            {order.remarks_added_by && order.remarks_added_at && (
              <p className="text-xs text-gray-400 mt-1">
                Added by {order.remarks_added_by} on {formatDate(order.remarks_added_at)}
              </p>
            )}
          </div>
        )}

        {/* Print Footer */}
        <div className="mt-4 text-center text-xs text-gray-400">
          <p>This is a computer-generated invoice and does not require a signature</p>
          <p className="mt-0.5">Generated on {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    );
  }
);

InvoiceBill.displayName = 'InvoiceBill';
