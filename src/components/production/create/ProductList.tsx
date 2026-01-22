import { useState, useEffect } from 'react';
import { Package, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Product } from '@/types/product';

interface ProductListProps {
  products: Product[];
  selectedProductId: string | null;
  onSelect: (product: Product) => void;
  loading: boolean;
  sortBy?: 'name' | 'stock' | 'category' | 'recent';
}

interface GroupedProducts {
  [key: string]: Product[];
}

export default function ProductList({
  products,
  selectedProductId,
  onSelect,
  loading,
  sortBy = 'name',
}: ProductListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Auto-expand groups with selected product
  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const selectedProduct = products.find((p) => p.id === selectedProductId);
      if (selectedProduct) {
        const groupKey = selectedProduct.name.trim().toLowerCase();
        setExpandedGroups((prev) => new Set(prev).add(groupKey));
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

  // Group products by name only when sorting by name
  // Otherwise, show products in sorted order without grouping
  const shouldGroup = sortBy === 'name';
  
  let groupedProducts: GroupedProducts = {};
  let sortedGroupKeys: string[] = [];
  
  if (shouldGroup) {
    // Group products by name while preserving backend sort order
    // Use a Map to track insertion order
    const groupMap = new Map<string, Product[]>();
    const groupOrder: string[] = [];
    
    products.forEach((product) => {
      const key = product.name.trim().toLowerCase();
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
        groupOrder.push(key);
      }
      groupMap.get(key)!.push(product);
    });
    
    // Convert Map to object and preserve order
    groupOrder.forEach(key => {
      groupedProducts[key] = groupMap.get(key)!;
    });
    
    // Use the preserved order (backend already sorted correctly)
    sortedGroupKeys = groupOrder;
  } else {
    // For non-name sorting, create a single "all" group with all products
    // Products are already sorted by backend - use them directly
    groupedProducts = { 'all': products };
    sortedGroupKeys = ['all'];
  }

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

  const formatDimensions = (product: Product) => {
    const parts = [];
    const hasLength = product.length && product.length !== 'NA' && product.length !== 'N/A';
    const hasWidth = product.width && product.width !== 'NA' && product.width !== 'N/A';

    if (hasLength && hasWidth) {
      parts.push(`${product.length} ${product.length_unit || ''} × ${product.width} ${product.width_unit || ''}`.trim());
    } else if (hasLength) {
      parts.push(`${product.length} ${product.length_unit || ''}`.trim());
    } else if (hasWidth) {
      parts.push(`${product.width} ${product.width_unit || ''}`.trim());
    }
    return parts.join(', ') || '-';
  };

  const formatStock = (product: Product) => {
    // Use available_stock for production planning (excludes reserved stock)
    const stock = product.available_stock !== undefined ? product.available_stock : product.current_stock || 0;
    const unit = product.count_unit || 'units';
    return `${stock} ${unit}`;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-h-[500px] overflow-y-auto">
      <div>
        {sortedGroupKeys.map((groupKey) => {
          const groupProducts = groupedProducts[groupKey];
          const isExpanded = expandedGroups.has(groupKey);
          const firstProduct = groupProducts[0];

          return (
            <div key={groupKey} className="border-b border-gray-100 last:border-b-0">
              {/* Group Row - Product Name with Variant Count (only show when grouping) */}
              {shouldGroup && (
                <div
                  className="px-2 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleGroup(groupKey)}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate" title={firstProduct.name}>
                      {firstProduct.name}
                    </p>
                    <p className="text-[10px] text-blue-600 font-medium">
                      ({groupProducts.length} Variant{groupProducts.length !== 1 ? 's' : ''})
                    </p>
                  </div>
                </div>
              )}

              {/* Variant Rows - Show table with headers */}
              {(isExpanded || !shouldGroup) && (
                <div className="bg-gray-50 border-t border-gray-200">
                  {/* Table Header for Variants */}
                  <div className="bg-white border-b border-gray-200 px-2 py-1.5">
                    <div className="flex gap-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                      {!shouldGroup && <div className="w-[20%] pl-3">Product Name</div>}
                      <div className={`${shouldGroup ? 'w-[22%] pl-5' : 'w-[18%]'}`}>Category</div>
                      <div className={`${shouldGroup ? 'w-[22%]' : 'w-[18%]'}`}>Dimensions</div>
                      <div className={`${shouldGroup ? 'w-[18%]' : 'w-[15%]'}`}>Weight</div>
                      <div className={`${shouldGroup ? 'w-[25%]' : 'w-[20%]'}`}>Color / Pattern</div>
                      <div className={`${shouldGroup ? 'w-[13%]' : 'w-[12%]'}`}>Stock</div>
                    </div>
                  </div>

                  {/* Variant Rows */}
                  {groupProducts.map((product) => {
                    const isSelected = selectedProductId === product.id;

                    return (
                      <div
                        key={product.id}
                        onClick={() => onSelect(product)}
                        className={`flex gap-3 px-2 py-2 items-center cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                          isSelected
                            ? 'bg-primary-50 border-l-4 border-l-primary-600'
                            : 'hover:bg-white'
                        }`}
                      >
                        {!shouldGroup && (
                          <div className="w-[20%] pl-3">
                            <span className="text-xs font-medium text-gray-900 truncate block" title={product.name}>
                              {product.name}
                            </span>
                          </div>
                        )}
                        <div className={`${shouldGroup ? 'w-[22%] pl-3' : 'w-[18%]'} flex items-start gap-1`}>
                          {shouldGroup && <span className="text-gray-400 text-xs mt-0.5">↳</span>}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-gray-700 truncate block">
                              {(product.category && product.category !== 'NA' && product.category !== 'N/A') ? product.category : '-'}
                            </span>
                            {product.subcategory && product.subcategory !== 'NA' && product.subcategory !== 'N/A' && (
                              <span className="text-[10px] text-gray-500 truncate block">
                                {product.subcategory}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`${shouldGroup ? 'w-[22%]' : 'w-[18%]'}`}>
                          <span className="text-xs text-gray-700">{formatDimensions(product)}</span>
                        </div>
                        <div className={`${shouldGroup ? 'w-[18%]' : 'w-[15%]'}`}>
                          <span className="text-xs text-gray-700">
                            {(product.weight && product.weight !== 'NA' && product.weight !== 'N/A') ? `${product.weight} ${product.weight_unit || ''}`.trim() : '-'}
                          </span>
                        </div>
                        <div className={`${shouldGroup ? 'w-[25%]' : 'w-[20%]'}`}>
                          {product.color && product.color !== 'NA' && product.color !== 'N/A' && (
                            <span className="text-xs text-gray-700 block">
                              {product.color}
                            </span>
                          )}
                          {product.pattern && product.pattern !== 'NA' && product.pattern !== 'N/A' && (
                            <span className="text-xs text-gray-700 block">
                              {product.pattern}
                            </span>
                          )}
                          {(!product.color || product.color === 'NA' || product.color === 'N/A') &&
                           (!product.pattern || product.pattern === 'NA' || product.pattern === 'N/A') && (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                        <div className={`${shouldGroup ? 'w-[13%]' : 'w-[12%]'} flex items-center gap-2`}>
                          <span className="text-xs text-gray-700 font-medium">
                            {formatStock(product)}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center ml-auto">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
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
