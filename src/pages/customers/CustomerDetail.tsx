import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CustomerService, type Customer, type CreateCustomerData } from '@/services/customerService';
import { OrderService, type Order } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import CustomerDetailHeader from '@/components/customers/detail/CustomerDetailHeader';
import CustomerDetailInfo from '@/components/customers/detail/CustomerDetailInfo';
import CustomerDetailFinancial from '@/components/customers/detail/CustomerDetailFinancial';
import CustomerDetailOrderStats from '@/components/customers/detail/CustomerDetailOrderStats';
import CustomerDetailOrderHistory from '@/components/customers/detail/CustomerDetailOrderHistory';
import CustomerFormDialog from '@/components/customers/CustomerFormDialog';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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
      const { data, error } = await CustomerService.updateCustomer(id, formData);
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
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

        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-6 space-y-6">
          <CustomerDetailHeader customer={customer} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CustomerDetailInfo customer={customer} />
              <CustomerDetailFinancial customer={customer} orders={orders} />
              <CustomerDetailOrderHistory customer={customer} orders={orders} onOrderUpdated={loadOrders} />
            </div>
            
            <div className="space-y-6">
              <CustomerDetailOrderStats customer={customer} orders={orders} />
            </div>
          </div>
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

