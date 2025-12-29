import { useState } from 'react';
import { Search, Package, Grid3x3, List, Check, AlertCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { calculateSQM } from '@/utils/sqmCalculator';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';

interface ProductMaterialSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentItem: ExtendedOrderItem | null;
  products: any[];
  materials: any[];
  productSearchTerm: string;
  onSearchChange: (value: string) => void;
  onSelectProduct: (productId: string) => void;
  productPage: number;
  materialPage: number;
  productItemsPerPage: number;
  materialItemsPerPage: number;
  onProductPageChange: (page: number) => void;
  onMaterialPageChange: (page: number) => void;
}

export default function ProductMaterialSelectionDialog({
  isOpen,
  onClose,
  currentItem,
  products,
  materials,
  productSearchTerm,
  onSearchChange,
  onSelectProduct,
  productPage,
  materialPage,
  productItemsPerPage,
  materialItemsPerPage,
  onProductPageChange,
  onMaterialPageChange,
}: ProductMaterialSelectionDialogProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedStockFilters, setSelectedStockFilters] = useState<string[]>([]);

  const allItems = currentItem?.product_type === 'raw_material' ? materials : products;

  // Apply filters
  const items = allItems.filter(item => {
    // Search filter
    if (productSearchTerm) {
      const searchLower = productSearchTerm.toLowerCase();
      const isProduct = currentItem?.product_type !== 'raw_material';

      let matchesSearch = false;

      // Common fields for both products and materials
      matchesSearch =
        item.name?.toLowerCase().includes(searchLower) ||
        item.id?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower) ||
        item.color?.toLowerCase().includes(searchLower);

      // Product-specific fields
      if (isProduct) {
        matchesSearch = matchesSearch ||
          item.subcategory?.toLowerCase().includes(searchLower) ||
          item.pattern?.toLowerCase().includes(searchLower);
      }

      // Raw material-specific fields
      if (!isProduct) {
        matchesSearch = matchesSearch ||
          item.type?.toLowerCase().includes(searchLower) ||
          item.supplier_name?.toLowerCase().includes(searchLower) ||
          item.batch_number?.toLowerCase().includes(searchLower) ||
          item.quality_grade?.toLowerCase().includes(searchLower);
      }

      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(item.category)) {
      return false;
    }
    // Subcategory filter
    if (selectedSubcategories.length > 0 && !selectedSubcategories.includes(item.subcategory)) {
      return false;
    }
    // Color filter
    if (selectedColors.length > 0 && !selectedColors.includes(item.color)) {
      return false;
    }
    // Pattern filter
    if (selectedPatterns.length > 0 && !selectedPatterns.includes(item.pattern)) {
      return false;
    }
    // Stock filter
    if (selectedStockFilters.length > 0) {
      const stock = item.current_stock || item.stock || 0;
      let matchesStock = false;

      for (const filter of selectedStockFilters) {
        if (filter === 'in_stock' && stock >= 10) matchesStock = true;
        if (filter === 'low_stock' && stock > 0 && stock < 10) matchesStock = true;
        if (filter === 'out_of_stock' && stock === 0) matchesStock = true;
      }

      if (!matchesStock) return false;
    }

    return true;
  });

  const totalCount = items.length;
  const perPage = currentItem?.product_type === 'raw_material' ? materialItemsPerPage : productItemsPerPage;
  const currentPage = currentItem?.product_type === 'raw_material' ? materialPage : productPage;
  const onPageChange = currentItem?.product_type === 'raw_material' ? onMaterialPageChange : onProductPageChange;

  // Get unique values for filters
  const categories = [...new Set(allItems.map(p => p.category).filter(Boolean))];
  const subcategories = [...new Set(allItems.map(p => p.subcategory).filter(Boolean))];
  const colors = [...new Set(allItems.map(p => p.color).filter(Boolean))];
  const patterns = [...new Set(allItems.map(p => p.pattern).filter(Boolean))];

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedColors([]);
    setSelectedPatterns([]);
    setSelectedStockFilters([]);
  };

  const getStockStatusBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Out of Stock
        </Badge>
      );
    } else if (stock < 10) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
          Low Stock
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
          In Stock
        </Badge>
      );
    }
  };

  const handleSelect = (itemId: string) => {
    onSelectProduct(itemId);
    onClose();
  };

  // Product Card Component
  const ProductCard = ({ item }: { item: any }) => {
    const isSelected = currentItem?.product_id === item.id;
    const isProduct = currentItem?.product_type !== 'raw_material';

    const length = parseFloat(item.length || '0');
    const width = parseFloat(item.width || '0');
    const lengthUnit = item.length_unit || 'm';
    const widthUnit = item.width_unit || 'm';
    const sqm = length > 0 && width > 0 ? calculateSQM(length, width, lengthUnit, widthUnit) : 0;
    const stock = item.current_stock || item.stock || 0;
    const stockUnit = isProduct ? (item.count_unit || 'rolls') : (item.unit || 'units');

    return (
      <Card
        onClick={() => handleSelect(item.id)}
        className={`p-4 cursor-pointer transition-all hover:shadow-md h-full ${
          isSelected ? 'bg-primary-50 border-primary-400 border-2' : 'border-gray-200 hover:border-primary-200'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 line-clamp-2">{item.name}</h4>
                {isSelected && (
                  <Badge className="bg-primary-600 text-white text-xs flex-shrink-0">
                    <Check className="w-3 h-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-600 mb-2 space-y-1">
                {item.category && (
                  <p className="break-words">
                    <span className="font-medium">Category:</span> {item.category}
                    {item.subcategory && ` • ${item.subcategory}`}
                  </p>
                )}
                {isProduct && item.color && item.color !== 'N/A' && (
                  <p><span className="font-medium">Color:</span> {item.color}</p>
                )}
                {isProduct && item.pattern && item.pattern !== 'N/A' && (
                  <p><span className="font-medium">Pattern:</span> {item.pattern}</p>
                )}
                {!isProduct && item.brand && (
                  <p><span className="font-medium">Brand:</span> {item.brand}</p>
                )}
                {!isProduct && item.supplier && (
                  <p><span className="font-medium">Supplier:</span> {item.supplier}</p>
                )}
              </div>
            </div>
          </div>

          {/* Stock and Price */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <p className="text-gray-500">Stock</p>
              <p className="font-medium text-gray-900">
                {formatIndianNumberWithDecimals(stock, 2)} {stockUnit}
              </p>
            </div>
            <div className="flex items-start justify-end">
              {getStockStatusBadge(stock)}
            </div>
            {(item.price || item.selling_price || item.cost) && (
              <div className="col-span-2">
                <p className="text-gray-500">Price</p>
                <p className="font-semibold text-primary-600">
                  {formatCurrency(item.price || item.selling_price || item.cost || 0)}
                  {item.unit && !isProduct && ` / ${item.unit}`}
                </p>
              </div>
            )}
          </div>

          {/* Product Details */}
          {isProduct && (
            <div className="mt-2 pt-3 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {item.length && (
                <div className="min-w-0">
                  <p className="text-gray-500">Length</p>
                  <p className="font-medium text-gray-900 truncate">
                    {item.length} {lengthUnit}
                  </p>
                </div>
              )}
              {item.width && (
                <div className="min-w-0">
                  <p className="text-gray-500">Width</p>
                  <p className="font-medium text-gray-900 truncate">
                    {item.width} {widthUnit}
                  </p>
                </div>
              )}
              {sqm > 0 && (
                <div className="col-span-2 min-w-0 bg-blue-50 p-2 rounded">
                  <p className="text-gray-500">Total SQM (per product)</p>
                  <p className="font-semibold text-blue-700">
                    {length} {lengthUnit} × {width} {widthUnit} = {sqm.toFixed(2)} SQM
                  </p>
                </div>
              )}
              {item.weight && (
                <div className="min-w-0">
                  <p className="text-gray-500">Weight</p>
                  <p className="font-medium text-gray-900 truncate">
                    {item.weight} {item.weight_unit || ''}
                  </p>
                </div>
              )}
              {item.id && (
                <div className="min-w-0">
                  <p className="text-gray-500">Product ID</p>
                  <p className="font-mono text-gray-900 text-[10px] truncate" title={item.id}>
                    {item.id}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Raw Material Details */}
          {!isProduct && (
            <div className="mt-2 pt-3 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {item.material_type && (
                <div className="min-w-0">
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium text-gray-900 truncate">{item.material_type}</p>
                </div>
              )}
              {item.id && (
                <div className="min-w-0">
                  <p className="text-gray-500">Material ID</p>
                  <p className="font-mono text-gray-900 text-[10px] truncate" title={item.id}>
                    {item.id}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Table View Component
  const TableView = () => {
    const isProduct = currentItem?.product_type !== 'raw_material';

    return (
      <div className="overflow-auto h-full w-full">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                {isProduct ? 'Product' : 'Material'}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Category / Details
              </th>
              {isProduct && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Dimensions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Weight
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => {
              const isSelected = currentItem?.product_id === item.id;
              const length = parseFloat(item.length || '0');
              const width = parseFloat(item.width || '0');
              const lengthUnit = item.length_unit || 'm';
              const widthUnit = item.width_unit || 'm';
              const sqm = length > 0 && width > 0 ? calculateSQM(length, width, lengthUnit, widthUnit) : 0;
              const stock = item.current_stock || item.stock || 0;
              const stockUnit = isProduct ? (item.count_unit || 'rolls') : (item.unit || 'units');

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.id && (
                          <p className="text-xs text-gray-500 font-mono">{item.id}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-700 space-y-1">
                      {item.category && (
                        <p>
                          <span className="font-medium">Category:</span> {item.category}
                          {item.subcategory && ` • ${item.subcategory}`}
                        </p>
                      )}
                      {isProduct && item.color && item.color !== 'N/A' && (
                        <p><span className="font-medium">Color:</span> {item.color}</p>
                      )}
                      {isProduct && item.pattern && item.pattern !== 'N/A' && (
                        <p><span className="font-medium">Pattern:</span> {item.pattern}</p>
                      )}
                      {!isProduct && item.brand && (
                        <p><span className="font-medium">Brand:</span> {item.brand}</p>
                      )}
                      {!isProduct && item.supplier && (
                        <p><span className="font-medium">Supplier:</span> {item.supplier}</p>
                      )}
                    </div>
                  </td>
                  {isProduct && (
                    <>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {item.length && item.width ? (
                            <>
                              <p>{item.length} {lengthUnit} × {item.width} {widthUnit}</p>
                              {sqm > 0 && (
                                <p className="text-xs text-blue-600 font-medium">
                                  = {sqm.toFixed(2)} SQM
                                </p>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700">
                          {item.weight ? (
                            <p>{item.weight} {item.weight_unit || ''}</p>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatIndianNumberWithDecimals(stock, 2)} {stockUnit}
                        </p>
                      </div>
                      {getStockStatusBadge(stock)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-primary-600">
                      {formatCurrency(item.price || item.selling_price || item.cost || 0)}
                    </p>
                    {item.unit && !isProduct && (
                      <p className="text-xs text-gray-500">/ {item.unit}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleSelect(item.id)}
                      className={isSelected ? 'bg-primary-600' : ''}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Search className="w-5 h-5" />
                Search and Select {currentItem?.product_type === 'raw_material' ? 'Raw Material' : 'Product'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Find the perfect {currentItem?.product_type === 'raw_material' ? 'raw material' : 'product'} for your order
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-2"
              >
                <Grid3x3 className="w-4 h-4" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                Table
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col px-6 pt-4 gap-4" style={{ height: 'calc(90vh - 200px)' }}>
          {/* Search */}
          <div className="flex gap-2 flex-shrink-0">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, ID, category..."
                  className="h-10 pl-10"
                  value={productSearchTerm}
                  onChange={e => onSearchChange(e.target.value)}
                />
              </div>
            </div>
            {(selectedCategories.length + selectedSubcategories.length + selectedColors.length + selectedPatterns.length + selectedStockFilters.length) > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="flex items-center gap-2">
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            {/* Stock Filter */}
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Stock:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                    {selectedStockFilters.length > 0 ? `${selectedStockFilters.length} selected` : 'All'}
                    <Filter className="ml-2 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="start">
                  <div className="space-y-2">
                    {[
                      { value: 'in_stock', label: 'In Stock' },
                      { value: 'low_stock', label: 'Low Stock' },
                      { value: 'out_of_stock', label: 'Out of Stock' }
                    ].map(option => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`stock-${option.value}`}
                          checked={selectedStockFilters.includes(option.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStockFilters([...selectedStockFilters, option.value]);
                            } else {
                              setSelectedStockFilters(selectedStockFilters.filter(s => s !== option.value));
                            }
                          }}
                        />
                        <label htmlFor={`stock-${option.value}`} className="text-xs cursor-pointer flex-1">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Category:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                      {selectedCategories.length > 0 ? `${selectedCategories.length} selected` : 'All'}
                      <Filter className="ml-2 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="start">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {categories.map(cat => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cat-${cat}`}
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCategories([...selectedCategories, cat]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== cat));
                              }
                            }}
                          />
                          <label htmlFor={`cat-${cat}`} className="text-xs cursor-pointer flex-1">
                            {cat}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Subcategory Filter */}
            {subcategories.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Subcategory:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                      {selectedSubcategories.length > 0 ? `${selectedSubcategories.length} selected` : 'All'}
                      <Filter className="ml-2 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="start">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {subcategories.map(sub => (
                        <div key={sub} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sub-${sub}`}
                            checked={selectedSubcategories.includes(sub)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSubcategories([...selectedSubcategories, sub]);
                              } else {
                                setSelectedSubcategories(selectedSubcategories.filter(s => s !== sub));
                              }
                            }}
                          />
                          <label htmlFor={`sub-${sub}`} className="text-xs cursor-pointer flex-1">
                            {sub}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Color Filter */}
            {colors.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Color:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                      {selectedColors.length > 0 ? `${selectedColors.length} selected` : 'All'}
                      <Filter className="ml-2 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="start">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {colors.map(color => (
                        <div key={color} className="flex items-center space-x-2">
                          <Checkbox
                            id={`color-${color}`}
                            checked={selectedColors.includes(color)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedColors([...selectedColors, color]);
                              } else {
                                setSelectedColors(selectedColors.filter(c => c !== color));
                              }
                            }}
                          />
                          <label htmlFor={`color-${color}`} className="text-xs cursor-pointer flex-1">
                            {color}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Pattern Filter */}
            {patterns.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Pattern:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                      {selectedPatterns.length > 0 ? `${selectedPatterns.length} selected` : 'All'}
                      <Filter className="ml-2 h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-2" align="start">
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {patterns.map(pattern => (
                        <div key={pattern} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-${pattern}`}
                            checked={selectedPatterns.includes(pattern)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPatterns([...selectedPatterns, pattern]);
                              } else {
                                setSelectedPatterns(selectedPatterns.filter(p => p !== pattern));
                              }
                            }}
                          />
                          <label htmlFor={`pattern-${pattern}`} className="text-xs cursor-pointer flex-1">
                            {pattern}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Clear Filters */}
            {(selectedCategories.length > 0 || selectedSubcategories.length > 0 ||
              selectedColors.length > 0 || selectedPatterns.length > 0 || selectedStockFilters.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategories([]);
                  setSelectedColors([]);
                  setSelectedPatterns([]);
                  setSelectedStockFilters([]);
                }}
                className="h-8 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 pr-2 auto-rows-max">
                {items.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <div className="text-center">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
                      <p className="text-sm text-gray-600">No {currentItem?.product_type === 'raw_material' ? 'materials' : 'products'} found</p>
                    </div>
                  </div>
                ) : (
                  items.map(item => (
                    <ProductCard key={item.id} item={item} />
                  ))
                )}
              </div>
            ) : (
              <TableView />
            )}
          </div>

          {/* Pagination */}
          {totalCount > perPage && (
            <div className="border-t pt-4 flex items-center justify-between flex-shrink-0 pb-4">
              <span className="text-sm text-gray-600">
                Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalCount)} of{' '}
                {totalCount} {currentItem?.product_type === 'raw_material' ? 'materials' : 'products'}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(Math.ceil(totalCount / perPage), currentPage + 1))}
                  disabled={currentPage >= Math.ceil(totalCount / perPage)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 border-t pt-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
