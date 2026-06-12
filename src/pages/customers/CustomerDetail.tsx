import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CustomerService, type Customer, type CreateCustomerData, type UpdateCustomerData } from '@/services/customerService';
import { OrderService, type Order } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import CustomerDetailHeader from '@/components/customers/detail/CustomerDetailHeader';
import CustomerDetailInfo from '@/components/customers/detail/CustomerDetailInfo';
import CustomerDetailFinancial from '@/components/customers/detail/CustomerDetailFinancial';
import CustomerDetailOrderStats from '@/components/customers/detail/CustomerDetailOrderStats';
import CustomerDetailOrderHistory from '@/components/customers/detail/CustomerDetailOrderHistory';
import CustomerFormDialog from '@/components/customers/CustomerFormDialog';
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

function parseAddress(c: Customer): string {
  if (c.permanent_address) {
    try {
      const p = JSON.parse(c.permanent_address);
      return [p.address, p.city, p.state, p.pincode].filter(Boolean).join(', ');
    } catch {
      // fall through
    }
  }
  return [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    customer_type: 'individual',
    company_name: '',
    gst_number: '',
    credit_limit: '0.00',
    notes: '',
    permanentAddress: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    deliveryAddress: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    sameAsPermanent: true,
  });

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadOrders();
    }
  }, [id]);

  const loadCustomer = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await CustomerService.getCustomerById(id);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        navigate('/customers');
        return;
      }
      if (data) {
        setCustomer(data);
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      toast({ title: 'Error', description: 'Failed to load customer', variant: 'destructive' });
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await OrderService.getOrders({ limit: 1000 });
      if (error) {
        console.error('Error loading orders:', error);
        setOrders([]);
        return;
      }
      if (data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };

  useLiveSyncRefresh({
    modules: ['customers', 'orders'],
    onRefresh: () => {
      if (!id) return;
      loadCustomer();
      loadOrders();
    },
    pollingMs: 8000,
  });

  const handleBack = () => {
    navigate('/customers');
  };

  const handleEdit = () => {
    if (!customer) return;
    
    let permanentAddr = {
      address: '',
      city: '',
      state: '',
      pincode: '',
    };
    let deliveryAddr = {
      address: '',
      city: '',
      state: '',
      pincode: '',
    };

    if (customer.permanent_address) {
      try {
        permanentAddr = JSON.parse(customer.permanent_address);
      } catch (e) {
        permanentAddr = {
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
        };
      }
    } else {
      permanentAddr = {
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
      };
    }

    if (customer.delivery_address) {
      try {
        deliveryAddr = JSON.parse(customer.delivery_address);
      } catch (e) {
        deliveryAddr = permanentAddr;
      }
    } else {
      deliveryAddr = permanentAddr;
    }

    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      customer_type: customer.customer_type,
      company_name: customer.company_name || '',
      gst_number: customer.gst_number || '',
      notes: customer.notes || '',
      permanentAddress: permanentAddr,
      deliveryAddress: deliveryAddr,
      sameAsPermanent: JSON.stringify(permanentAddr) === JSON.stringify(deliveryAddr),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields (Name and Phone)', variant: 'destructive' });
      return;
    }

    if (!id || !customer) return;

    try {
      setSubmitting(true);
      // Serialize address objects for API (same as CustomerList) so address gets updated
      const submitData: Record<string, unknown> = {
        ...formData,
        permanent_address: formData.permanentAddress ? JSON.stringify(formData.permanentAddress) : undefined,
        delivery_address: formData.deliveryAddress ? JSON.stringify(formData.deliveryAddress) : undefined,
        address: formData.permanentAddress?.address ?? formData.address,
        city: formData.permanentAddress?.city ?? formData.city,
        state: formData.permanentAddress?.state ?? formData.state,
        pincode: formData.permanentAddress?.pincode ?? formData.pincode,
      };
      delete submitData.permanentAddress;
      delete submitData.deliveryAddress;
      delete submitData.sameAsPermanent;

      const { data, error } = await CustomerService.updateCustomer(id, submitData as UpdateCustomerData);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Customer updated successfully' });
        setIsDialogOpen(false);
        loadCustomer(); // Reload customer data
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({ title: 'Error', description: 'Failed to update customer', variant: 'destructive' });
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

  if (!customer) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-gray-600 mb-4">Customer not found</p>
          <Button onClick={handleBack}>Back to Customers</Button>
        </div>
      </Layout>
    );
  }

  const totalRevenue = parseFloat(customer.total_value || '0');
  const outstanding = parseFloat(customer.outstanding_amount || '0');

  const getCustomerOrders = () => {
    const customerName = customer.name || '';
    return orders.filter(order => {
      if (order.customerId && order.customerId === customer.id) {
        return true;
      }
      if (!order.customerId && customerName && order.customerName && 
          order.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  };
  const customerOrders = getCustomerOrders().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    pending:   { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
    accepted:  { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Accepted' },
    dispatched:{ bg: 'bg-orange-50', text: 'text-orange-700', label: 'Dispatched' },
    delivered: { bg: 'bg-green-50', text: 'text-green-700', label: 'Delivered' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' },
  };

  return (
    <Layout>
      {/* Desktop View */}
      <div className="hidden lg:flex flex-col min-h-[calc(100vh-4rem)] bg-gray-50 w-full">
        <div className="shrink-0 bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </Button>
            <Button onClick={handleEdit} className="bg-primary-600 hover:bg-primary-700 text-white">
              <Edit className="w-4 h-4 mr-2" />
              Edit Customer
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto w-full px-2 sm:px-3 lg:px-4 py-6">
          <div className="w-full max-w-full mx-auto space-y-6">
            <CustomerDetailHeader customer={customer} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <CustomerDetailInfo customer={customer} />
                {isAdmin && <CustomerDetailFinancial customer={customer} orders={orders} />}
                <CustomerDetailOrderHistory customer={customer} orders={orders} onOrderUpdated={loadOrders} />
              </div>
              
              <div className="space-y-6">
                <CustomerDetailOrderStats customer={customer} orders={orders} />
              </div>
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
              <h2 className="text-base font-bold text-gray-900 leading-tight truncate max-w-[180px]">{customer.name}</h2>
              <p className="text-[11.5px] text-gray-500 font-medium">Customer Profile</p>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="w-10 h-10 border border-gray-150 rounded-xl bg-white flex items-center justify-center text-gray-600 active:bg-gray-50 transition-colors"
            title="Edit Customer"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-5 flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0066FF] font-extrabold text-2xl select-none mb-3">
            {customer.name[0]?.toUpperCase()}
          </div>
          <h3 className="text-lg font-extrabold text-gray-900 leading-tight text-center">{customer.name}</h3>
          {customer.company_name && (
            <p className="text-sm text-gray-500 font-medium mt-1 text-center">{customer.company_name}</p>
          )}
          <span className="mt-3 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
            {customer.customer_type === 'business' ? 'Business Customer' : 'Individual Customer'}
          </span>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 bg-white border border-gray-150 rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-center divide-x divide-gray-100">
          <div>
            <span className="text-lg font-extrabold text-[#0066FF] leading-none block">{customer.total_orders ?? customerOrders.length}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1.5 uppercase tracking-wide block">Orders</span>
          </div>
          <div>
            <span className="text-lg font-extrabold text-green-600 leading-none block">{inrShort(totalRevenue)}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1.5 uppercase tracking-wide block">Revenue</span>
          </div>
          <div>
            <span className="text-lg font-extrabold leading-none block" style={{ color: outstanding > 0 ? '#EA580C' : '#16A34A' }}>{inrShort(outstanding)}</span>
            <span className="text-[10px] text-gray-400 font-semibold mt-1.5 uppercase tracking-wide block">Outstanding</span>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Contact Info</h4>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">Phone</span>
            <span className="text-gray-900 font-extrabold">{customer.phone || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">Email</span>
            <span className="text-gray-900 font-extrabold truncate max-w-[200px]">{customer.email || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">GST</span>
            <span className="text-gray-900 font-extrabold uppercase">{customer.gst_number || '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold">Status</span>
            <span className="text-gray-900 font-extrabold capitalize">{customer.status || '—'}</span>
          </div>
        </div>

        {/* Address Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Address & Notes</h4>
          <p className="text-xs text-gray-800 font-medium leading-relaxed">{parseAddress(customer) || '—'}</p>
          {customer.notes && (
            <p className="text-xs text-gray-500 font-semibold italic mt-1 leading-relaxed border-t border-gray-50 pt-2.5">
              Note: {customer.notes}
            </p>
          )}
        </div>

        {/* Order History */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3">
          <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
            Order History ({customerOrders.length})
          </h4>
          {customerOrders.length === 0 ? (
            <div className="py-8 flex flex-col items-center gap-2 text-center text-gray-400">
              <span className="text-2xl">🛍️</span>
              <span className="text-xs font-semibold">No orders found for this customer</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {customerOrders.map((order, i) => {
                const badgeStyle = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className={`py-3.5 flex items-start justify-between gap-3 active:bg-gray-50 cursor-pointer ${i === 0 ? 'pt-1' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[13px] font-extrabold text-gray-900 leading-tight">{order.orderNumber || (order as any).order_number || order.id}</h5>
                      <span className="text-[11px] text-gray-400 font-bold block mt-1">{fmtDate(order.orderDate)}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                      <span className="text-[13px] font-extrabold text-gray-900 leading-none">
                        {inrShort(parseFloat(String(order.totalAmount || 0)))}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeStyle.bg} ${badgeStyle.text}`}>
                        {badgeStyle.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CustomerFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        onFormDataChange={setFormData}
        selectedCustomer={customer}
        submitting={submitting}
      />
    </Layout>
  );
}

