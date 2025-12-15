import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Grid3x3, List } from 'lucide-react';
import { CustomerService, type Customer, type CreateCustomerData } from '@/services/customerService';
import { OrderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import CustomerStatsBoxes from '@/components/customers/CustomerStatsBoxes';
import CustomerFilters from '@/components/customers/CustomerFilters';
import CustomerTable from '@/components/customers/CustomerTable';
import CustomerGrid from '@/components/customers/CustomerGrid';
import CustomerEmptyState from '@/components/customers/CustomerEmptyState';
import CustomerFormDialog from '@/components/customers/CustomerFormDialog';
import CustomerDeleteDialog from '@/components/customers/CustomerDeleteDialog';
import type { Order } from '@/services/orderService';

export default function CustomerList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const [stats, setStats] = useState({
    total: 0,
    business: 0,
    individual: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadCustomers();
    loadOrders();
  }, [searchTerm, typeFilter]);

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
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await CustomerService.getCustomers({
        search: searchTerm,
        customer_type: typeFilter !== 'all' ? typeFilter : undefined,
      });

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      if (data) {
        // Sort by created_at descending (newest first)
        const sortedData = [...data].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });

        setCustomers(sortedData);

        // Calculate total revenue from orders
        const totalRevenue = orders.reduce((sum, order) => {
          const hasCustomer = data.some(c =>
            (order.customerId && order.customerId === c.id) ||
            (!order.customerId && c.name && order.customerName?.toLowerCase().trim() === c.name.toLowerCase().trim())
          );

          if (hasCustomer && order.totalAmount) {
            return sum + Number(order.totalAmount);
          }
          return sum;
        }, 0);

        setStats({
          total: data.length,
          business: data.filter((c) => c.customer_type === 'business').length,
          individual: data.filter((c) => c.customer_type === 'individual').length,
          totalRevenue: totalRevenue,
        });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
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
    setSelectedCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);

    // Parse JSON address fields if they exist
    let permanentAddr = { address: '', city: '', state: '', pincode: '' };
    let deliveryAddr = { address: '', city: '', state: '', pincode: '' };

    if (customer.permanent_address) {
      try {
        permanentAddr = JSON.parse(customer.permanent_address);
      } catch (e) {
        // Fallback to old fields
        permanentAddr = {
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
        };
      }
    } else {
      // Use old fields as permanent address
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

  const handleView = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };




  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields (Name and Phone)', variant: 'destructive' });
      return;
    }

    // Validate GST number if provided
    if (formData.gst_number && formData.gst_number.trim().length > 0 && formData.gst_number.length !== 15) {
      toast({ title: 'Validation Error', description: 'GST number must be exactly 15 characters', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);

      // Prepare data with serialized addresses
      const submitData = {
        ...formData,
        permanent_address: formData.permanentAddress ? JSON.stringify(formData.permanentAddress) : undefined,
        delivery_address: formData.deliveryAddress ? JSON.stringify(formData.deliveryAddress) : undefined,
        // Backward compatibility - keep old fields
        address: formData.permanentAddress?.address || formData.address,
        city: formData.permanentAddress?.city || formData.city,
        state: formData.permanentAddress?.state || formData.state,
        pincode: formData.permanentAddress?.pincode || formData.pincode,
      };

      // Remove form-only fields
      delete submitData.permanentAddress;
      delete submitData.deliveryAddress;
      delete submitData.sameAsPermanent;

      if (selectedCustomer) {
        const { data, error} = await CustomerService.updateCustomer(selectedCustomer.id, submitData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          toast({ title: 'Success', description: 'Customer updated successfully' });
          setIsDialogOpen(false);
          loadCustomers();
        }
      } else {
        const { data, error } = await CustomerService.createCustomer(submitData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          toast({ title: 'Success', description: 'Customer created successfully' });
          setIsDialogOpen(false);
          loadCustomers();
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({ title: 'Error', description: 'Failed to save customer', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    setIsDeleting(true);
    try {
      const { data, error } = await CustomerService.deleteCustomer(selectedCustomer.id);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Customer deleted successfully' });
        setIsDeleteDialogOpen(false);
        setSelectedCustomer(null);
        loadCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({ title: 'Error', description: 'Failed to delete customer', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <Layout>
      <div>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customers</h1>
              <p className="text-sm text-gray-600">Manage your customer database</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle - Hidden on mobile/tablet */}
              <div className="hidden lg:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-primary-600 text-white' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={handleCreate} className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        <CustomerStatsBoxes
          total={stats.total}
          business={stats.business}
          individual={stats.individual}
          totalRevenue={stats.totalRevenue}
        />

        <CustomerFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : customers.length === 0 ? (
          <CustomerEmptyState onCreate={handleCreate} />
        ) : viewMode === 'table' ? (
          <CustomerTable
            customers={customers}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        ) : (
          <CustomerGrid
            customers={customers}
            orders={orders}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        )}


        <CustomerFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          formData={formData}
          onFormDataChange={setFormData}
          selectedCustomer={selectedCustomer}
          submitting={submitting}
        />

        <CustomerDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          customer={selectedCustomer}
          isDeleting={isDeleting}
        />
      </div>
    </Layout>
  );
}
