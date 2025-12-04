import { Package } from 'lucide-react';

interface ProductStockEmptyProps {
  hasFilters: boolean;
}

export default function ProductStockEmpty({ hasFilters }: ProductStockEmptyProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Package className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
      <p className="text-gray-600">
        {hasFilters ? 'Try adjusting your filters' : 'No individual products have been created yet'}
      </p>
    </div>
  );
}

