import { ArrowLeft, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { IndividualProduct, Product } from '@/types/product';

interface IndividualProductHeaderProps {
  individualProduct: IndividualProduct;
  product: Product;
  onBack: () => void;
  onEdit: () => void;
  onViewQRCode?: () => void;
}

export default function IndividualProductHeader({
  individualProduct,
  product: _product,
  onBack,
  onEdit,
  onViewQRCode,
}: IndividualProductHeaderProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'sold':
        return 'secondary';
      case 'damaged':
        return 'destructive';
      case 'returned':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Individual Product</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-gray-600 font-mono">
                  {individualProduct.qr_code || individualProduct.id}
                </p>
                <Badge 
                  variant={getStatusVariant(individualProduct.status)}
                  className={individualProduct.status === 'available' ? 'bg-blue-600 text-white border-blue-600' : ''}
                >
                  {individualProduct.status}
                </Badge>
                {individualProduct.quality_grade && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    {individualProduct.quality_grade}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {individualProduct.qr_code && onViewQRCode && (
              <Button variant="outline" size="sm" className="gap-2" onClick={onViewQRCode}>
                <QrCode className="w-4 h-4" />
                View QR Code
              </Button>
            )}
            <Button onClick={onEdit} size="sm">
              Edit Details
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

