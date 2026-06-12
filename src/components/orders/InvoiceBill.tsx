import { forwardRef } from 'react';
import type { Order } from '@/services/orderService';

interface InvoiceItem {
  id: string;
  product_name: string;
  product_type?: 'product' | 'raw_material';
  quantity: number;
  unit: string;
  pricing_unit?: string;
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
      <div ref={ref} className="bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="border-b-4 border-blue-600 pb-4 mb-4 px-4 pt-4">
          <div className="flex justify-between items-start gap-3">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-blue-900 mb-1">INVOICE</h1>
              <p className="text-sm sm:text-lg text-gray-600">Rajdhani Carpets</p>
              <p className="text-xs text-gray-500 mt-0.5">Premium Quality Carpets & Textiles</p>
            </div>
            <div className="text-right shrink-0">
              <div className="bg-blue-50 border-2 border-blue-600 px-3 py-1.5 rounded-lg">
                <p className="text-[10px] text-gray-600 font-semibold">Invoice No</p>
                <p className="text-sm sm:text-xl font-bold text-blue-900">{order.orderNumber}</p>
              </div>
              {(order as any).pi_number && (
                <div className="mt-1.5 bg-gray-50 border border-gray-300 px-3 py-1 rounded-lg">
                  <p className="text-[10px] text-gray-500 font-semibold">PI Number</p>
                  <p className="text-sm font-bold text-gray-800">{(order as any).pi_number}</p>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-1.5">Date: {formatDate(order.createdAt || order.orderDate)}</p>
            </div>
          </div>
        </div>

        {/* ── Bill To / Ship To ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-4 px-4">
          <div>
            <h3 className="text-[10px] font-bold text-gray-700 uppercase mb-1 border-b pb-1">Bill To</h3>
            <p className="font-bold text-sm text-gray-900">{order.customerName}</p>
            {order.customerEmail && <p className="text-xs text-gray-600">{order.customerEmail}</p>}
            {order.customerPhone && <p className="text-xs text-gray-600">{order.customerPhone}</p>}
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-gray-700 uppercase mb-1 border-b pb-1">Ship To</h3>
            {order.delivery_address ? (
              <div className="text-xs text-gray-600 space-y-0.5">
                {(() => {
                  try {
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
                  } catch {
                    return <p>{String(order.delivery_address)}</p>;
                  }
                })()}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Same as billing address</p>
            )}
          </div>
        </div>

        {/* ── Items — desktop: table, mobile: cards ─────────── */}

        {/* Desktop table (hidden on mobile) */}
        <div className="hidden sm:block mb-6 px-4">
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
              {items.map((item, index) => (
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
                        {item.weight && <p>GSM: {item.weight}{item.weight_unit}</p>}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Price per: {item.pricing_unit && item.pricing_unit !== 'unit' ? item.pricing_unit : item.unit}</p>
                  </td>
                  <td className="py-2 px-2 text-xs text-center border-b align-top">{item.quantity}</td>
                  <td className="py-2 px-2 text-xs text-right border-b align-top">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 px-2 text-xs text-right border-b align-top">{parseFloat(item.gst_rate).toFixed(2)}%</td>
                  <td className="py-2 px-2 text-xs text-right border-b align-top">{formatCurrency(item.gst_amount)}</td>
                  <td className="py-2 px-2 text-xs text-right font-semibold border-b align-top">{formatCurrency(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards (hidden on desktop) */}
        <div className="sm:hidden mb-4 px-4 space-y-3">
          <div className="bg-blue-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Items</div>
          {items.map((item, index) => (
            <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Item header */}
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                  <p className="text-xs font-bold text-gray-900">{item.product_name}</p>
                </div>
                <p className="text-sm font-bold text-blue-900 shrink-0">{formatCurrency(item.total_price)}</p>
              </div>
              {/* Item details */}
              <div className="px-3 py-2 space-y-1.5">
                {item.product_type === 'product' && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {item.category && <span className="text-[11px] text-gray-500">{item.category}</span>}
                    {item.color && <span className="text-[11px] text-gray-500">{item.color}</span>}
                    {(item.length && item.width) && <span className="text-[11px] text-gray-500">{item.length}{item.length_unit} × {item.width}{item.width_unit}</span>}
                    {item.weight && <span className="text-[11px] text-gray-500">{item.weight} GSM</span>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Qty</span>
                    <span className="font-semibold text-gray-900">{item.quantity} {item.unit}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Unit Price</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(item.unit_price)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">GST</span>
                    <span className="font-semibold text-gray-900">{parseFloat(item.gst_rate).toFixed(1)}% = {formatCurrency(item.gst_amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Totals ─────────────────────────────────────────── */}
        <div className="px-4 mb-4">
          <div className="ml-auto sm:w-64 space-y-1">
            <div className="flex justify-between py-1 border-b text-xs">
              <span className="font-semibold text-gray-700">Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(order.subtotal || '0')}</span>
            </div>
            <div className="flex justify-between py-1 border-b text-xs">
              <span className="font-semibold text-gray-700">GST</span>
              <span className="font-semibold text-gray-900">{formatCurrency(order.gstAmount || '0')}</span>
            </div>
            <div className="flex justify-between py-2 bg-blue-900 text-white px-3 rounded-lg mt-1">
              <span className="text-sm font-bold">Total</span>
              <span className="text-base font-bold">{formatCurrency(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between py-1 text-xs">
              <span className="font-semibold text-green-700">Paid</span>
              <span className="font-semibold text-green-700">{formatCurrency(order.paidAmount)}</span>
            </div>
            <div className="flex justify-between py-1 border-t-2 border-orange-500 text-sm">
              <span className="font-bold text-orange-700">Balance Due</span>
              <span className="font-bold text-orange-700">{formatCurrency(order.outstandingAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── Dates ──────────────────────────────────────────── */}
        <div className="px-4 mb-4 space-y-1">
          <p className="text-xs text-gray-600"><span className="font-semibold">Order Date:</span> {formatDate(order.createdAt || order.orderDate)}</p>
          {order.expectedDelivery && (
            <p className="text-xs text-gray-600"><span className="font-semibold">Expected Delivery:</span> {formatDate(order.expectedDelivery)}</p>
          )}
          {order.dispatchedAt && (
            <p className="text-xs text-blue-700"><span className="font-semibold">Shipped On:</span> {formatDate(order.dispatchedAt)}</p>
          )}
          {order.deliveredAt && (
            <p className="text-xs text-green-700"><span className="font-semibold">Delivered On:</span> {formatDate(order.deliveredAt)}</p>
          )}
        </div>

        {/* ── Remarks ────────────────────────────────────────── */}
        {order.remarks && (
          <div className="px-4 mb-4 pt-3 border-t">
            <h4 className="text-xs font-bold text-gray-700 mb-1">Remarks</h4>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{order.remarks}</p>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="border-t px-4 pt-3 pb-4 text-center">
          <p className="text-xs font-bold text-gray-700 mb-0.5">Thank You For Your Business!</p>
          <p className="text-xs text-gray-500">Email: info@rajdhanicarpets.com</p>
          <p className="text-[10px] text-gray-400 mt-2">Computer-generated invoice · Generated on {new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    );
  }
);

InvoiceBill.displayName = 'InvoiceBill';
