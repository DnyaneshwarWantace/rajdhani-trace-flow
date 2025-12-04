import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import type { Customer } from '@/services/customerService';

interface CustomerDetailHeaderProps {
  customer: Customer;
}

export default function CustomerDetailHeader({ customer }: CustomerDetailHeaderProps) {
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      new: 'bg-blue-100 text-blue-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              {getStatusBadge(customer.status)}
              <Badge variant="outline">{customer.customer_type}</Badge>
            </div>
            {customer.company_name && (
              <p className="text-lg text-gray-600 mb-2">{customer.company_name}</p>
            )}
            <p className="text-sm text-gray-500">Customer ID: {customer.id}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

