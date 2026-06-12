import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SupplierService, type Supplier, type CreateSupplierData } from '@/services/supplierService';
import { ManageStockService, type StockOrder } from '@/services/manageStockService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import SupplierDetailHeader from '@/components/suppliers/detail/SupplierDetailHeader';
import SupplierDetailInfo from '@/components/suppliers/detail/SupplierDetailInfo';
import SupplierDetailOrderSummary from '@/components/suppliers/detail/SupplierDetailOrderSummary';
import SupplierDetailOrderStats from '@/components/suppliers/detail/SupplierDetailOrderStats';
import SupplierDetailOrderHistory from '@/components/suppliers/detail/SupplierDetailOrderHistory';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';


function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function inrShort(n: number): string {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  if (a >= 1e3) return '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
  });

  useEffect(() => {
    if (id) {
      loadSupplier();
      loadOrders();
    }
  }, [id]);

  const loadSupplier = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await SupplierService.getSupplierById(id);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        navigate('/suppliers');
        return;
      }
      if (data) {
        setSupplier(data);
      }
    } catch (error) {
      console.error('Error loading supplier:', error);
      toast({ title: 'Error', description: 'Failed to load supplier', variant: 'destructive' });
      navigate('/suppliers');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data } = await ManageStockService.getOrders({ limit: 1000 });
      if (data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };

  useLiveSyncRefresh({
    modules: ['suppliers', 'manage_stock', 'materials'],
    onRefresh: () => {
      if (!id) return;
      loadSupplier();
      loadOrders();
    },
    pollingMs: 8000,
  });

  const handleBack = () => {
    navigate('/suppliers');
  };

  const handleEdit = () => {
    if (!supplier) return;
    
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      gst_number: supplier.gst_number || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in required field: Name', variant: 'destructive' });
      return;
    }

    // Validate GST number if provided (only check length, not format pattern)
    const cleanGST = formData.gst_number?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
    if (formData.gst_number && formData.gst_number.trim().length > 0 && cleanGST.length !== 15) {
      toast({ title: 'Validation Error', description: 'GST number must be exactly 15 characters', variant: 'destructive' });
      return;
    }

    if (!id || !supplier) return;

    try {
      setSubmitting(true);
      const { data, error } = await SupplierService.updateSupplier(id, formData);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Supplier updated successfully' });
        setIsDialogOpen(false);
        loadSupplier(); // Reload supplier data
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({ title: 'Error', description: 'Failed to update supplier', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </Layout>
    );
  }

  if (!supplier) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-gray-600 mb-4">Supplier not found</p>
          <Button onClick={handleBack}>Back to Suppliers</Button>
        </div>
      </Layout>
    );
  }

  const getSupplierOrders = () => {
    const supplierName = supplier.name || '';
    return orders.filter(order => {
      if (order.supplier_id && order.supplier_id === supplier.id) {
        return true;
      }
      if (!order.supplier_id && supplierName && order.supplier && 
          order.supplier.toLowerCase().trim() === supplierName.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  };

  const supplierOrders = getSupplierOrders().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  const totalValue = supplierOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
  const totalOrders = supplierOrders.length;

  const getSupplierOrderStatusStats = () => {
    const statusCounts = {
      pending: 0,
      approved: 0,
      shipped: 0,
      received: 0
    };
    
    supplierOrders.forEach(order => {
      const status = (order.status || 'pending').toLowerCase();
      if (status === 'pending' || status === 'ordered') {
        statusCounts.pending++;
      } else if (status === 'approved') {
        statusCounts.approved++;
      } else if (status === 'shipped' || status === 'in-transit') {
        statusCounts.shipped++;
      } else if (status === 'received' || status === 'delivered') {
        statusCounts.received++;
      }
    });
    
    const completedOrders = statusCounts.received;
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    
    return {
      ...statusCounts,
      completedOrders,
      completionRate
    };
  };

  const statusStats = getSupplierOrderStatusStats();

  const ORDER_STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    pending:   { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
    ordered:   { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Ordered' },
    approved:  { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Approved' },
    shipped:   { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Shipped' },
    'in-transit': { bg: 'bg-orange-50', text: 'text-orange-700', label: 'In Transit' },
    received:  { bg: 'bg-green-50', text: 'text-green-700', label: 'Received' },
    delivered: { bg: 'bg-green-50', text: 'text-green-700', label: 'Delivered' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },
  };

  const parseAddress = (s: Supplier) => {
    return [s.address, s.city, s.state, s.pincode].filter(Boolean).join(', ');
  };

  return (
    <Layout>
      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Suppliers
            </Button>
            <Button onClick={handleEdit} className="bg-primary-600 hover:bg-primary-700 text-white">
              <Edit className="w-4 h-4 mr-2" />
              Edit Supplier
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-6 space-y-6">
          <SupplierDetailHeader supplier={supplier} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SupplierDetailInfo supplier={supplier} />
              <SupplierDetailOrderSummary supplier={supplier} orders={orders} />
              <SupplierDetailOrderHistory supplier={supplier} orders={orders} />
            </div>
            
            <div className="space-y-6">
              <SupplierDetailOrderStats supplier={supplier} orders={orders} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden flex flex-col space-y-4 pb-12 bg-gray-50/50 -mx-4 px-4 pt-1">
        {/* Header Section */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-150 -mx-4 mb-2">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center text-gray-700 active:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight truncate max-w-[180px]">{supplier.name}</h2>
              <p className="text-[11.5px] text-gray-500 font-medium">Supplier Profile</p>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="w-10 h-10 border border-gray-150 rounded-xl bg-white flex items-center justify-center text-gray-600 active:bg-gray-50 transition-colors"
            title="Edit Supplier"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-5 flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#10B981] font-extrabold text-2xl select-none mb-3">
            {supplier.name[0]?.toUpperCase()}
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 leading-tight text-center">{supplier.name}</h3>
          {supplier.contact_person && (
            <p className="text-sm text-gray-500 font-medium mt-1 text-center">Contact: {supplier.contact_person}</p>
          )}
          <span className="mt-3 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            Active Supplier
          </span>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 bg-white border border-gray-150 rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-center divide-x divide-gray-100">
          <div>
            <span className="text-lg font-extrabold text-emerald-600 leading-none block">{totalOrders}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1.5 uppercase tracking-wide block">Total Orders</span>
          </div>
          <div>
            <span className="text-lg font-extrabold text-gray-900 leading-none block">{inrShort(totalValue)}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1.5 uppercase tracking-wide block">Total Value</span>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Contact Info</h4>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">Phone</span>
            <span className="text-gray-900 font-extrabold">{supplier.phone || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">Email</span>
            <span className="text-gray-900 font-extrabold truncate max-w-[200px]">{supplier.email || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">GST Number</span>
            <span className="text-gray-900 font-extrabold uppercase">{supplier.gst_number || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">Supplier Since</span>
            <span className="text-gray-900 font-extrabold">{fmtDate(supplier.created_at)}</span>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Address</h4>
          <p className="text-xs text-gray-800 font-medium leading-relaxed">{parseAddress(supplier) || '—'}</p>
        </div>

        {/* Order Statistics */}
        <div className="bg-white border border-gray-150 rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Order Statistics</h4>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              {statusStats.completionRate}% Success Rate
            </span>
          </div>
          
          <div className="space-y-3.5">
            {[
              { label: 'Pending', count: statusStats.pending, color: 'bg-yellow-500', track: 'bg-yellow-50' },
              { label: 'Approved', count: statusStats.approved, color: 'bg-blue-500', track: 'bg-blue-50' },
              { label: 'Shipped', count: statusStats.shipped, color: 'bg-orange-500', track: 'bg-orange-50' },
              { label: 'Received', count: statusStats.received, color: 'bg-green-500', track: 'bg-green-50' }
            ].map((item) => {
              const pct = totalOrders > 0 ? (item.count / totalOrders) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-gray-500">{item.label}</span>
                    <span className="text-gray-950">{item.count}</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${item.track}`}>
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Order History */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
            Purchase Orders ({supplierOrders.length})
          </h4>
          {supplierOrders.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center text-gray-400">
              <span className="text-2xl">📦</span>
              <span className="text-xs font-semibold">No orders found for this supplier</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {supplierOrders.map((order, i) => {
                const badgeStyle = ORDER_STATUS_STYLE[order.status?.toLowerCase()] || { bg: 'bg-gray-100', text: 'text-gray-800', label: order.status || 'Pending' };
                return (
                  <div
                    key={order.id}
                    className={`py-4 flex flex-col gap-3 ${i === 0 ? 'pt-1' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h5 className="text-[13px] font-extrabold text-gray-900 leading-tight">
                          {order.order_number || order.id}
                        </h5>
                        <span className="text-[11px] text-gray-400 font-bold block mt-1">
                          Ordered: {fmtDate(order.orderDate)}
                        </span>
                        {order.expectedDelivery && (
                          <span className="text-[11px] text-gray-400 font-bold block mt-0.5">
                            Expected: {fmtDate(order.expectedDelivery)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                        <span className="text-[13px] font-extrabold text-gray-900 leading-none">
                          {inrShort(order.totalCost || 0)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text}`}>
                          {badgeStyle.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-gray-50/50 border border-gray-150 rounded-xl p-2.5 text-center">
                      <div>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide block">Material</span>
                        <span className="text-[11px] text-gray-950 font-extrabold block truncate mt-0.5" title={order.materialName}>
                          {order.materialName || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide block">Quantity</span>
                        <span className="text-[11px] text-gray-950 font-extrabold block mt-0.5">
                          {order.quantity != null ? `${Number(order.quantity).toFixed(2)} ${order.unit || ''}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide block">Cost/Unit</span>
                        <span className="text-[11px] text-gray-955 font-extrabold block mt-0.5">
                          {inrShort(order.costPerUnit || 0)}
                        </span>
                      </div>
                    </div>

                    {order.actualDelivery && (
                      <div className="flex justify-between items-center text-[11px] bg-green-50/50 border border-green-150 rounded-xl px-3 py-1.5">
                        <span className="text-green-700 font-bold">✓ Delivered On</span>
                        <span className="text-green-800 font-black">{fmtDate(order.actualDelivery)}</span>
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-xs text-gray-500 font-semibold italic mt-0.5 leading-relaxed bg-gray-50/30 rounded-lg p-2 border border-gray-150">
                        Note: {order.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SupplierFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        onFormDataChange={setFormData}
        selectedSupplier={supplier}
        submitting={submitting}
      />
    </Layout>
  );
}


