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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
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

