import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CustomerService, type Customer } from '@/services/customerService';
import { OrderService, type Order } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import CustomerDetailHeader from '@/components/customers/detail/CustomerDetailHeader';
import CustomerDetailInfo from '@/components/customers/detail/CustomerDetailInfo';
import CustomerDetailFinancial from '@/components/customers/detail/CustomerDetailFinancial';
import CustomerDetailOrderStats from '@/components/customers/detail/CustomerDetailOrderStats';
import CustomerDetailOrderHistory from '@/components/customers/detail/CustomerDetailOrderHistory';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
    navigate(`/customers?edit=${id}`);
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
            <Button onClick={handleEdit}>
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
              <CustomerDetailOrderHistory customer={customer} orders={orders} />
            </div>
            
            <div className="space-y-6">
              <CustomerDetailOrderStats customer={customer} orders={orders} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

