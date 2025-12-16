import { Card, CardContent } from '@/components/ui/card';
import { Building } from 'lucide-react';
import type { Supplier } from '@/services/supplierService';

interface SupplierDetailHeaderProps {
  supplier: Supplier;
}

export default function SupplierDetailHeader({ supplier }: SupplierDetailHeaderProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <Building className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            </div>
            {supplier.contact_person && (
              <p className="text-lg text-gray-600 mb-2">Contact: {supplier.contact_person}</p>
            )}
            <p className="text-sm text-gray-500">Supplier ID: {supplier.id}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

