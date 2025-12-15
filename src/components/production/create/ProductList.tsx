import { useState, useEffect } from 'react';
import { Package, Loader2, Tag, Ruler, Weight, ChevronDown, ChevronRight } from 'lucide-react';
import type { Product } from '@/types/product';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductListProps {
  products: Product[];
  selectedProductId: string | null;
  onSelect: (product: Product) => void;
  loading: boolean;
}

interface GroupedProducts {
  [key: string]: Product[];
}

export default function ProductList({
  products,
  selectedProductId,
  onSelect,
  loading,
}: ProductListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Auto-expand groups with selected product
  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const selectedProduct = products.find((p) => p.id === selectedProductId);
      if (selectedProduct) {
        const groupKey = selectedProduct.name.trim().toLowerCase();
        setExpandedGroups((prev) => {
          if (!prev.has(groupKey)) {
            return new Set(prev).add(groupKey);
          }
          return prev;
        });
      }
    }
  }, [selectedProductId, products]);

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No products found</p>
      </div>
    );
  }

  // Group products by name
  const groupedProducts: GroupedProducts = products.reduce((acc, product) => {
    const key = product.name.trim().toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {} as GroupedProducts);

  // Sort groups by name
  const sortedGroupKeys = Object.keys(groupedProducts).sort();

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const isGroupExpanded = (groupKey: string) => expandedGroups.has(groupKey);

  return (
    <div className="space-y-2">
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {sortedGroupKeys.map((groupKey) => {
          const groupProducts = groupedProducts[groupKey];
          const isExpanded = isGroupExpanded(groupKey);
          const hasVariations = groupProducts.length > 1;
          const firstProduct = groupProducts[0];

          return (
            <div key={groupKey} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => hasVariations && toggleGroup(groupKey)}
                className={`w-full text-left p-3 transition-all ${
                  hasVariations ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="flex items-center gap-3">
                  {hasVariations && (
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )}
                  {!hasVariations && <div className="w-4" />}
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 mb-1">
                      <TruncatedText text={firstProduct.name} maxLength={50} />
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      {firstProduct.category && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded max-w-[120px] truncate" title={firstProduct.category}>
                          <TruncatedText text={firstProduct.category} maxLength={20} />
                        </span>
                      )}
                      {firstProduct.subcategory && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded max-w-[120px] truncate" title={firstProduct.subcategory}>
                          <TruncatedText text={firstProduct.subcategory} maxLength={20} />
                        </span>
                      )}
                      {hasVariations && (
                        <span className="text-primary-600 font-medium">
                          {groupProducts.length} {groupProducts.length === 1 ? 'variation' : 'variations'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Variations */}
              {(!hasVariations || isExpanded) && (
                <div className="border-t border-gray-100 bg-gray-50">
                  {groupProducts.map((product) => {
                    const isSelected = selectedProductId === product.id;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => onSelect(product)}
                        className={`w-full text-left p-3 transition-all border-b border-gray-100 last:border-b-0 ${
                          isSelected
                            ? 'bg-primary-50 border-l-4 border-l-primary-600'
                            : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3 pl-7">
                          <div className="flex-1 min-w-0">
                            <div className="space-y-1.5 text-xs text-gray-600">
                              {(product.length || product.width) && (
                                <div className="flex items-center gap-1.5">
                                  <Ruler className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span className="font-medium">
                                    {product.length}{product.length_unit || ''}
                                    {product.length && product.width && ' × '}
                                    {product.width}{product.width_unit || ''}
                                  </span>
                                </div>
                              )}
                              {product.weight && (
                                <div className="flex items-center gap-1.5">
                                  <Weight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span>
                                  {product.weight} {product.weight_unit || ''}
                                </span>
                                </div>
                              )}
                              {(product.color || product.pattern) && (
                                <div className="flex items-center gap-1.5">
                                  <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                  <span>
                                    {product.color && product.color !== 'NA' && product.color !== 'N/A' ? product.color : ''}
                                    {product.color && product.color !== 'NA' && product.color !== 'N/A' && product.pattern && product.pattern !== 'NA' && product.pattern !== 'N/A' ? ' • ' : ''}
                                    {product.pattern && product.pattern !== 'NA' && product.pattern !== 'N/A' ? product.pattern : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

