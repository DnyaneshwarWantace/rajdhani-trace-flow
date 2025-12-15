import type { Supplier } from '@/services/supplierService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Mail, Phone, User, FileText, Calendar } from 'lucide-react';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export default function SupplierDetailModal({
  isOpen,
  onClose,
  supplier,
}: SupplierDetailModalProps) {
  if (!supplier) return null;

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 font-medium">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{supplier.name}</DialogTitle>
              {supplier.contact_person && (
                <p className="text-sm text-gray-500 mt-1">Contact: {supplier.contact_person}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplier.contact_person && (
                <InfoRow icon={User} label="Contact Person" value={supplier.contact_person} />
              )}
              {supplier.phone && (
                <InfoRow icon={Phone} label="Phone" value={supplier.phone} />
              )}
              {supplier.email && (
                <InfoRow icon={Mail} label="Email" value={supplier.email} />
              )}
              {supplier.gst_number && (
                <InfoRow icon={FileText} label="GST Number" value={supplier.gst_number} />
              )}
              {supplier.created_at && (
                <InfoRow
                  icon={Calendar}
                  label="Added On"
                  value={new Date(supplier.created_at).toLocaleDateString()}
                />
              )}
            </div>
          </div>

          {/* Address Information */}
          {(supplier.address || supplier.city || supplier.state || supplier.pincode) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Address</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {supplier.address && (
                  <p className="text-sm text-gray-900 mb-2">{supplier.address}</p>
                )}
                <p className="text-sm text-gray-600">
                  {[supplier.city, supplier.state, supplier.pincode]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </p>
              </div>
            </div>
          )}

          {/* Additional Information */}
          {(supplier as any).notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">{(supplier as any).notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
