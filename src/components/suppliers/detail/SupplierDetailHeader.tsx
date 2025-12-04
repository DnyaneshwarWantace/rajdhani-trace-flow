import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, Star } from 'lucide-react';
import type { Supplier } from '@/services/supplierService';

interface SupplierDetailHeaderProps {
  supplier: Supplier;
}

export default function SupplierDetailHeader({ supplier }: SupplierDetailHeaderProps) {
  const getStatusBadge = (status?: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100'}>{status || 'Unknown'}</Badge>;
  };

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
              {getStatusBadge(supplier.status)}
              {supplier.performance_rating && (
                <Badge variant="outline" className="gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {supplier.performance_rating.toFixed(1)}/10
                </Badge>
              )}
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

