import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductStatsProps {
  individualProduct: IndividualProduct;
}

export default function IndividualProductStats({ individualProduct }: IndividualProductStatsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'sold':
        return <Package className="w-5 h-5 text-blue-500" />;
      case 'damaged':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'returned':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600';
      case 'sold':
        return 'text-blue-600';
      case 'damaged':
        return 'text-red-600';
      case 'returned':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              {getStatusIcon(individualProduct.status)}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold capitalize ${getStatusColor(individualProduct.status)}`}>
                {individualProduct.status.replace('_', ' ')}
              </div>
            </CardContent>
          </Card>

          {individualProduct.quality_grade && (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quality Grade</CardTitle>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {individualProduct.quality_grade}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {individualProduct.quality_grade}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR Code</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono text-gray-900 truncate">
                {individualProduct.qr_code || 'N/A'}
              </div>
            </CardContent>
          </Card>

          {individualProduct.serial_number && (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Serial Number</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-mono text-gray-900 truncate">
                  {individualProduct.serial_number}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

