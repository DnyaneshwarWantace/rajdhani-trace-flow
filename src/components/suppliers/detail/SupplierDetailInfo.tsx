import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, Building, Calendar } from 'lucide-react';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Supplier } from '@/services/supplierService';

interface SupplierDetailInfoProps {
  supplier: Supplier;
}

export default function SupplierDetailInfo({ supplier }: SupplierDetailInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplier.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{supplier.email}</p>
              </div>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{supplier.phone}</p>
              </div>
            </div>
          )}
          {(supplier.address || supplier.city) && (
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
          {supplier.gst_number && (
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">GST Number</p>
                <p className="text-sm font-medium text-gray-900">{supplier.gst_number}</p>
              </div>
            </div>
          )}
          {supplier.created_at && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Supplier Since</p>
                <p className="text-sm font-medium text-gray-900">{formatIndianDate(supplier.created_at)}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

