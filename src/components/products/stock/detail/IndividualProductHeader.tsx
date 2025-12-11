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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
            <Button variant="ghost" size="sm" onClick={onBack} className="p-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Individual Product</h1>
              <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                <p className="text-xs sm:text-sm text-gray-600 font-mono truncate">
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
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {individualProduct.qr_code && onViewQRCode && (
              <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial" onClick={onViewQRCode}>
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">QR Code</span>
              </Button>
            )}
            <Button onClick={onEdit} size="sm" className="flex-1 sm:flex-initial">
              <span className="text-xs sm:text-sm">Edit</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

