import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check, ChevronDown, ChevronRight, Package } from 'lucide-react';
import { ProductService } from '@/services/productService';
import type { Product } from '@/types/product';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';

interface ProductSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  selectedProductId?: string;
}

export default function ProductSelectorDialog({
  isOpen,
  onClose,
  onSelect,
  selectedProductId,
}: ProductSelectorDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [selectedWidths, setSelectedWidths] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [widths, setWidths] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setSearchTerm('');
      setSelectedCategories([]);
      setSelectedSubcategories([]);
      setSelectedColors([]);
      setSelectedPatterns([]);
      setSelectedLengths([]);
      setSelectedWidths([]);
      setSelectedWeights([]);
      setExpandedGroups(new Set());
      setCurrentPage(1);
      setIsSelecting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      (selectedCategories.length > 0 ||
        selectedSubcategories.length > 0 ||
        selectedColors.length > 0 ||
        selectedPatterns.length > 0 ||
        selectedLengths.length > 0 ||
        selectedWidths.length > 0 ||
        selectedWeights.length > 0)
    ) {
      setCurrentPage(1);
      loadProducts();
    }
  }, [
    selectedCategories,
    selectedSubcategories,
    selectedColors,
    selectedPatterns,
    selectedLengths,
    selectedWidths,
    selectedWeights,
    isOpen,
  ]);

  useEffect(() => {
    // Apply pagination to filtered products
    applyPagination();
  }, [allProducts, currentPage, itemsPerPage, searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const filters: any = { limit: 10000 };

      if (selectedCategories.length > 0) {
        filters.category = selectedCategories;
      }
      if (selectedSubcategories.length > 0) {
        filters.subcategory = selectedSubcategories;
      }
      if (selectedColors.length > 0) {
        filters.color = selectedColors;
      }
      if (selectedPatterns.length > 0) {
        filters.pattern = selectedPatterns;
      }
      if (selectedLengths.length > 0) {
        filters.length = selectedLengths;
      }
      if (selectedWidths.length > 0) {
        filters.width = selectedWidths;
      }
      if (selectedWeights.length > 0) {
        filters.weight = selectedWeights;
      }

      const result = await ProductService.getProducts(filters);
      const loadedProducts = result.products || [];

      setAllProducts(loadedProducts);

      // Get unique filter options
      const uniqueCategories = Array.from(
        new Set(allProducts.map((p) => p.category).filter((c): c is string => typeof c === 'string' && c !== ''))
      ).sort();
      const uniqueSubcategories = Array.from(
        new Set(allProducts.map((p) => p.subcategory).filter((s): s is string => typeof s === 'string' && s !== ''))
      ).sort();
      const uniqueColors = Array.from(
        new Set(
          allProducts
            .map((p) => p.color)
            .filter((c): c is string => typeof c === 'string' && c.trim() !== '' && c.toLowerCase() !== 'n/a')
        )
      ).sort();
      const uniquePatterns = Array.from(
        new Set(
          allProducts
            .map((p) => p.pattern)
            .filter((p): p is string => typeof p === 'string' && p.trim() !== '' && p.toLowerCase() !== 'n/a')
        )
      ).sort();
      const uniqueLengths = Array.from(
        new Set(allProducts.map((p) => p.length).filter((l): l is string => typeof l === 'string' && l !== ''))
      ).sort();
      const uniqueWidths = Array.from(
        new Set(allProducts.map((p) => p.width).filter((w): w is string => typeof w === 'string' && w !== ''))
      ).sort();
      const uniqueWeights = Array.from(
        new Set(allProducts.map((p) => p.weight).filter((w): w is string => typeof w === 'string' && w !== ''))
      ).sort();

      setCategories(uniqueCategories);
      setSubcategories(uniqueSubcategories);
      setColors(uniqueColors);
      setPatterns(uniquePatterns);
      setLengths(uniqueLengths);
      setWidths(uniqueWidths);
      setWeights(uniqueWeights);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPagination = () => {
    // Filter products by search term
    const filtered = searchTerm.trim()
      ? allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allProducts;

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filtered.slice(startIndex, endIndex);

    setProducts(paginatedProducts);
  };

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

  const handleSelect = (product: Product, event?: React.MouseEvent) => {
    // Prevent any default behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!product || !product.id) {
      console.error('Invalid product selected:', product);
      return;
    }
    
    console.log('Selecting product:', product.id, product.name);
    
    // Set selecting flag to prevent dialog from closing prematurely
    setIsSelecting(true);
    
    try {
      // Call onSelect to update parent state first - this must complete before closing
      console.log('Calling onSelect callback');
      onSelect(product);
      console.log('onSelect callback completed');
      
      // Close the dialog after ensuring state update completes
      // Use a small timeout to ensure React has processed the state update
      setTimeout(() => {
        console.log('Closing dialog');
        setIsSelecting(false);
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error in handleSelect:', error);
      setIsSelecting(false);
      // Don't close dialog if there's an error
    }
  };

  // Get filtered products count for pagination
  const getFilteredProducts = () => {
    return searchTerm.trim()
      ? allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allProducts;
  };

  const filteredProducts = products;
  const totalFiltered = getFilteredProducts().length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Group products by name
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const key = product.name.trim().toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Sort groups: products with recipes first, then products without recipes
  const sortedGroupKeys = Object.keys(groupedProducts).sort((a, b) => {
    const aHasRecipe = groupedProducts[a].some(p => p.has_recipe);
    const bHasRecipe = groupedProducts[b].some(p => p.has_recipe);

    // If both have recipe or both don't have recipe, sort alphabetically
    if (aHasRecipe === bHasRecipe) {
      return a.localeCompare(b);
    }

    // Products with recipes come first
    return bHasRecipe ? 1 : -1;
  });

  const handleDialogClose = (open: boolean) => {
    // Prevent closing if we're in the middle of selecting
    if (isSelecting) {
      return;
    }
    // Only close if explicitly requested
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Product</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, ID, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                <MultiSelect
                  options={categories.map((cat) => ({ label: cat, value: cat }))}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder="All Categories"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Subcategory</label>
                <MultiSelect
                  options={subcategories.map((sub) => ({ label: sub, value: sub }))}
                  selected={selectedSubcategories}
                  onChange={setSelectedSubcategories}
                  placeholder="All Subcategories"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
                <MultiSelect
                  options={colors.map((color) => ({ label: color, value: color }))}
                  selected={selectedColors}
                  onChange={setSelectedColors}
                  placeholder="All Colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Pattern</label>
                <MultiSelect
                  options={patterns.map((pattern) => ({ label: pattern, value: pattern }))}
                  selected={selectedPatterns}
                  onChange={setSelectedPatterns}
                  placeholder="All Patterns"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Length</label>
                <MultiSelect
                  options={lengths.map((length) => ({ label: `${length}m`, value: length }))}
                  selected={selectedLengths}
                  onChange={setSelectedLengths}
                  placeholder="All Lengths"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Width</label>
                <MultiSelect
                  options={widths.map((width) => ({ label: `${width}m`, value: width }))}
                  selected={selectedWidths}
                  onChange={setSelectedWidths}
                  placeholder="All Widths"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Weight</label>
                <MultiSelect
                  options={weights.map((weight) => ({ label: weight, value: weight }))}
                  selected={selectedWeights}
                  onChange={setSelectedWeights}
                  placeholder="All Weights"
                />
              </div>
            </div>
          </div>

          {/* Products List - Grouped Table */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
                  <p className="text-sm text-gray-600">No products found</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category / Details</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedGroupKeys.map((groupKey) => {
                    const groupProducts = groupedProducts[groupKey];
                    const isExpanded = expandedGroups.has(groupKey);
                    const firstProduct = groupProducts[0];

                    return (
                      <React.Fragment key={groupKey}>
                        {/* Group Header Row */}
                        <tr
                          className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => toggleGroup(groupKey)}
                        >
                          <td colSpan={5} className="px-3 py-3">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate" title={firstProduct.name}>
                                  {firstProduct.name.split(' ').slice(0, 10).join(' ')}
                                  {firstProduct.name.split(' ').length > 10 && '...'}
                                </p>
                                <p className="text-sm text-blue-600 font-medium mt-1">
                                  ({groupProducts.length} Variant{groupProducts.length !== 1 ? 's' : ''})
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Variant Rows */}
                        {isExpanded &&
                          groupProducts.map((product) => (
                            <tr
                              key={product.id}
                              className={`bg-white hover:bg-gray-50 transition-colors ${
                                selectedProductId === product.id ? 'bg-blue-50' : ''
                              }`}
                              onClick={(e) => {
                                // Prevent row click from interfering with button clicks
                                e.stopPropagation();
                              }}
                            >
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400 text-sm">↳</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-500 truncate font-mono">{product.id}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="min-w-0 max-w-[180px] space-y-0.5">
                                  <p className="text-sm font-medium text-gray-900 line-clamp-1 break-words">
                                    {product.category}
                                  </p>
                                  {product.subcategory && (
                                    <p className="text-xs text-gray-500 line-clamp-1 break-words">
                                      {product.subcategory}
                                    </p>
                                  )}
                                  {product.color &&
                                    product.color.trim() !== '' &&
                                    product.color.toLowerCase() !== 'n/a' && (
                                      <p className="text-xs text-gray-500 line-clamp-1 break-words">
                                        Color: {product.color}
                                      </p>
                                    )}
                                  {product.pattern &&
                                    product.pattern.trim() !== '' &&
                                    product.pattern.toLowerCase() !== 'n/a' && (
                                      <p className="text-xs text-gray-500 line-clamp-1 break-words">
                                        Pattern: {product.pattern}
                                      </p>
                                    )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-900">
                                    {product.length && product.width
                                      ? `${product.length}${product.length_unit || 'm'} × ${product.width}${
                                          product.width_unit || 'm'
                                        }`
                                      : '-'}
                                  </p>
                                  {product.length && product.width && (
                                    <p className="text-xs text-gray-500">
                                      SQM: {(parseFloat(product.length) * parseFloat(product.width)).toFixed(2)}
                                    </p>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {product.current_stock || 0} {product.unit || 'pcs'}
                                </p>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={selectedProductId === product.id ? 'default' : 'outline'}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    e.nativeEvent.stopImmediatePropagation();
                                    handleSelect(product, e);
                                  }}
                                  className="h-8"
                                >
                                  {selectedProductId === product.id ? (
                                    <>
                                      <Check className="w-3 h-3 mr-1" />
                                      Selected
                                    </>
                                  ) : (
                                    'Select'
                                  )}
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && filteredProducts.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFiltered)} of {totalFiltered} products
              </div>
              
              <div className="flex items-center gap-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
