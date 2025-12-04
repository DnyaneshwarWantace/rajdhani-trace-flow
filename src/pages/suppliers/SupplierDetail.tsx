import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SupplierService, type Supplier } from '@/services/supplierService';
import { ManageStockService, type StockOrder } from '@/services/manageStockService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import SupplierDetailHeader from '@/components/suppliers/detail/SupplierDetailHeader';
import SupplierDetailInfo from '@/components/suppliers/detail/SupplierDetailInfo';
import SupplierDetailOrderSummary from '@/components/suppliers/detail/SupplierDetailOrderSummary';
import SupplierDetailOrderStats from '@/components/suppliers/detail/SupplierDetailOrderStats';
import SupplierDetailOrderHistory from '@/components/suppliers/detail/SupplierDetailOrderHistory';

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleBack = () => {
    navigate('/suppliers');
  };

  const handleEdit = () => {
    navigate(`/suppliers?edit=${id}`);
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Suppliers
            </Button>
            <Button onClick={handleEdit}>
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
    </Layout>
  );
}

