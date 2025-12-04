import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, Building, Calendar } from 'lucide-react';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Customer } from '@/services/customerService';

interface CustomerDetailInfoProps {
  customer: Customer;
}

export default function CustomerDetailInfo({ customer }: CustomerDetailInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">{customer.phone}</p>
            </div>
          </div>
          {(customer.address || customer.city) && (
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          )}
          {customer.gst_number && (
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">GST Number</p>
                <p className="text-sm font-medium text-gray-900">{customer.gst_number}</p>
              </div>
            </div>
          )}
          {customer.registration_date && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Customer Since</p>
                <p className="text-sm font-medium text-gray-900">{formatIndianDate(customer.registration_date)}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

