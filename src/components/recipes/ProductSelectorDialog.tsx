import { useState, useEffect } from 'react';
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
      const allProducts = result.products || [];

      setProducts(allProducts);

      // Get unique filter options
      const uniqueCategories = Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean))).sort();
      const uniqueSubcategories = Array.from(new Set(allProducts.map((p) => p.subcategory).filter(Boolean))).sort();
      const uniqueColors = Array.from(
        new Set(allProducts.map((p) => p.color).filter((c) => c && c.trim() !== '' && c.toLowerCase() !== 'n/a'))
      ).sort();
      const uniquePatterns = Array.from(
        new Set(allProducts.map((p) => p.pattern).filter((p) => p && p.trim() !== '' && p.toLowerCase() !== 'n/a'))
      ).sort();
      const uniqueLengths = Array.from(new Set(allProducts.map((p) => p.length).filter(Boolean))).sort();
      const uniqueWidths = Array.from(new Set(allProducts.map((p) => p.width).filter(Boolean))).sort();
      const uniqueWeights = Array.from(new Set(allProducts.map((p) => p.weight).filter(Boolean))).sort();

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

  const handleSelect = (product: Product) => {
    onSelect(product);
    onClose();
  };

  // Filter products by search term
  const filteredProducts = searchTerm.trim()
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  // Group products by name
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const key = product.name.trim().toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const sortedGroupKeys = Object.keys(groupedProducts).sort();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                      <>
                        {/* Group Header Row */}
                        <tr
                          key={groupKey}
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
                                  size="sm"
                                  variant={selectedProductId === product.id ? 'default' : 'outline'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(product);
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
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
