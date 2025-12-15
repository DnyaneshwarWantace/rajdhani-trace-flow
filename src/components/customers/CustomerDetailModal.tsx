import type { Customer } from '@/services/customerService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/utils/formatHelpers';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, FileText, Calendar } from 'lucide-react';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export default function CustomerDetailModal({
  isOpen,
  onClose,
  customer,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  // Parse addresses
  let permanentAddr = null;
  let deliveryAddr = null;

  try {
    if (customer.permanent_address) {
      permanentAddr = JSON.parse(customer.permanent_address);
    }
  } catch (e) {
    // Use fallback fields
    permanentAddr = {
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
    };
  }

  try {
    if (customer.delivery_address) {
      deliveryAddr = JSON.parse(customer.delivery_address);
    }
  } catch (e) {
    deliveryAddr = permanentAddr;
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value || '-'}</p>
      </div>
    </div>
  );

  const AddressSection = ({ title, address }: { title: string; address: any }) => (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
        <p className="text-sm text-gray-900">{address?.address || '-'}</p>
        <p className="text-sm text-gray-600">
          {[address?.city, address?.state, address?.pincode].filter(Boolean).join(', ') || '-'}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
              {customer.company_name && (
                <p className="text-sm text-gray-500 mt-1">{customer.company_name}</p>
              )}
            </div>
            <Badge variant={customer.customer_type === 'business' ? 'default' : 'secondary'}>
              {customer.customer_type === 'business' ? 'Business' : 'Individual'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow icon={Phone} label="Phone" value={customer.phone} />
              <InfoRow icon={Mail} label="Email" value={customer.email || '-'} />
              {customer.gst_number && (
                <InfoRow icon={FileText} label="GST Number" value={customer.gst_number} />
              )}
              <InfoRow icon={Calendar} label="Registered On" value={new Date(customer.registration_date || customer.created_at).toLocaleDateString()} />
            </div>
          </div>

          {/* Addresses */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Addresses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permanentAddr && (
                <AddressSection title="Permanent Address" address={permanentAddr} />
              )}
              {deliveryAddr && JSON.stringify(deliveryAddr) !== JSON.stringify(permanentAddr) && (
                <AddressSection title="Delivery Address" address={deliveryAddr} />
              )}
            </div>
          </div>

          {/* Business Stats */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{customer.total_orders || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatCurrency(parseFloat(customer.total_value || '0'))}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-xs text-orange-600 font-medium">Outstanding</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {formatCurrency(parseFloat(customer.outstanding_amount || '0'))}
                </p>
              </div>
              {customer.last_order_date && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 font-medium">Last Order</p>
                  <p className="text-sm font-bold text-purple-900 mt-1">
                    {new Date(customer.last_order_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
