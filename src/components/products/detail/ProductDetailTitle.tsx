import type { Product } from '@/types/product';

interface ProductDetailTitleProps {
  product: Product;
}

export default function ProductDetailTitle({ product }: ProductDetailTitleProps) {
  return (
    <div className="bg-white px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 line-clamp-2 break-words">
          {product.name}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs sm:text-sm text-gray-500 font-mono bg-gray-50 px-2 sm:px-3 py-1 rounded-md truncate max-w-full">
            {product.id}
          </span>
        </div>
      </div>
    </div>
  );
}
