import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Package, Grid3x3, List, Check, AlertCircle, Filter, Tag, Droplet, Maximize2, Layers } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

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
  productSortBy?: 'name' | 'stock' | 'category' | 'recent';
  productSortOrder?: 'asc' | 'desc';
  materialSortBy?: 'name' | 'stock' | 'category' | 'recent';
  materialSortOrder?: 'asc' | 'desc';
  onProductSortChange?: (sortBy: 'name' | 'stock' | 'category' | 'recent', sortOrder: 'asc' | 'desc') => void;
  onMaterialSortChange?: (sortBy: 'name' | 'stock' | 'category' | 'recent', sortOrder: 'asc' | 'desc') => void;
  productsLoading?: boolean;
  materialsLoading?: boolean;
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
  productSortBy = 'name',
  productSortOrder = 'asc',
  materialSortBy = 'name',
  materialSortOrder = 'asc',
  onProductSortChange,
  onMaterialSortChange,
  productsLoading = false,
  materialsLoading = false,
}: ProductMaterialSelectionDialogProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedStockFilters, setSelectedStockFilters] = useState<string[]>([]);

  // Use props for sorting or local state as fallback
  const isProduct = currentItem?.product_type !== 'raw_material';
  const sortBy = isProduct ? productSortBy : materialSortBy;
  const sortOrder = isProduct ? productSortOrder : materialSortOrder;
  
  const handleSortByChange = (value: 'name' | 'stock' | 'category' | 'recent') => {
    if (isProduct && onProductSortChange) {
      onProductSortChange(value, sortOrder);
    } else if (!isProduct && onMaterialSortChange) {
      onMaterialSortChange(value, sortOrder);
    }
  };

  const handleSortOrderChange = (value: 'asc' | 'desc') => {
    if (isProduct && onProductSortChange) {
      onProductSortChange(sortBy, value);
    } else if (!isProduct && onMaterialSortChange) {
      onMaterialSortChange(sortBy, value);
    }
  };

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
          item.batch_number?.toLowerCase().includes(searchLower);
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
      const isProduct = currentItem?.product_type !== 'raw_material';
      // For raw materials, use available_stock; for products, use current_stock
      const stock = isProduct
        ? (item.current_stock || item.stock || 0)
        : (item.available_stock !== undefined ? item.available_stock : (item.current_stock || item.stock || 0));
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

  // Items are already sorted by backend, no need for client-side sorting
  const sortedItems = items;

  const totalCount = sortedItems.length;
  const perPage = currentItem?.product_type === 'raw_material' ? materialItemsPerPage : productItemsPerPage;
  const currentPage = currentItem?.product_type === 'raw_material' ? materialPage : productPage;
  const onPageChange = currentItem?.product_type === 'raw_material' ? onMaterialPageChange : onProductPageChange;

  // Apply pagination
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = sortedItems.slice(startIndex, endIndex);

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
    // For raw materials, show available_stock; for products, show current_stock
    const stock = isProduct
      ? (item.current_stock || item.stock || 0)
      : (item.available_stock !== undefined ? item.available_stock : (item.current_stock || item.stock || 0));
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
                  <p className="flex items-center gap-1"><span className="font-medium">Color:</span> {colorCodeMap[item.color] && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: colorCodeMap[item.color] }} />} {item.color}</p>
                )}
                {isProduct && item.pattern && item.pattern !== 'N/A' && (
                  <p className="flex items-center gap-1"><span className="font-medium">Pattern:</span> {patternImageMap[item.pattern] && <img src={patternImageMap[item.pattern]} alt={item.pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />} {item.pattern}</p>
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
                  <p className="text-gray-500">GSM</p>
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
                    GSM
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
            {paginatedItems.map((item) => {
              const isSelected = currentItem?.product_id === item.id;
              const length = parseFloat(item.length || '0');
              const width = parseFloat(item.width || '0');
              const lengthUnit = item.length_unit || 'm';
              const widthUnit = item.width_unit || 'm';
              const sqm = length > 0 && width > 0 ? calculateSQM(length, width, lengthUnit, widthUnit) : 0;
              // For raw materials, show available_stock; for products, show current_stock
              const stock = isProduct
                ? (item.current_stock || item.stock || 0)
                : (item.available_stock !== undefined ? item.available_stock : (item.current_stock || item.stock || 0));
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
                        <p className="flex items-center gap-1"><span className="font-medium">Color:</span> {colorCodeMap[item.color] && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: colorCodeMap[item.color] }} />} {item.color}</p>
                      )}
                      {isProduct && item.pattern && item.pattern !== 'N/A' && (
                        <p className="flex items-center gap-1"><span className="font-medium">Pattern:</span> {patternImageMap[item.pattern] && <img src={patternImageMap[item.pattern]} alt={item.pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />} {item.pattern}</p>
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

  // ── MOBILE full-screen sheet ────────────────────────────────────────
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileActiveFilterTab, setMobileActiveFilterTab] = useState<'stock' | 'category' | 'subcategory' | 'color' | 'pattern'>('stock');

  const MOBILE_SORT_OPTS = [
    { sortBy: 'name' as const, sortOrder: 'asc' as const, label: 'Name A → Z' },
    { sortBy: 'name' as const, sortOrder: 'desc' as const, label: 'Name Z → A' },
    { sortBy: 'stock' as const, sortOrder: 'desc' as const, label: 'Stock: High → Low' },
    { sortBy: 'stock' as const, sortOrder: 'asc' as const, label: 'Stock: Low → High' },
    { sortBy: 'recent' as const, sortOrder: 'desc' as const, label: 'Recently Added' },
  ];

  const activeSortLabel = MOBILE_SORT_OPTS.find(o => o.sortBy === sortBy && o.sortOrder === sortOrder)?.label || 'Name A → Z';
  const activeFilterCount = selectedCategories.length + selectedSubcategories.length + selectedColors.length + selectedPatterns.length + selectedStockFilters.length;

  if (isOpen) {
    const isProdType = currentItem?.product_type !== 'raw_material';

    const mobileContent = (
      <div 
        className="fixed inset-0 z-[60] bg-black/40 flex flex-col justify-end lg:hidden animate-in fade-in duration-200" 
        onClick={onClose}
      >
        <div 
          className="w-full max-h-[96vh] h-[96vh] bg-white rounded-t-2xl flex flex-col relative animate-in slide-in-from-bottom duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Top drag indicator/handle bar */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto my-2.5 flex-shrink-0" />
          
          {/* Header */}
          <div className="px-4 pb-2.5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
            <span className="text-lg font-bold text-gray-900">
              Select {isProdType ? 'Product' : 'Raw Material'}
            </span>
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors" aria-label="Close dialog">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          {/* Search Box & Info */}
          <div className="px-4 py-2.5 flex-shrink-0 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-gray-800"
                placeholder="Search by name, color, pattern…"
                value={productSearchTerm}
                onChange={e => onSearchChange(e.target.value)}
              />
              {productSearchTerm && (
                <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1.5 font-normal">
              {totalCount} {isProdType ? 'products' : 'materials'} found
            </div>
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-6">
            {(isProdType ? productsLoading : materialsLoading) ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-8 h-8 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-400">Loading {isProdType ? 'products' : 'materials'}…</p>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Package className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-xs font-semibold text-gray-500">No {isProdType ? 'products' : 'materials'} found</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Try a different search term</p>
              </div>
            ) : paginatedItems.map(item => {
              const isSelected = currentItem?.product_id === item.id;
              const stock = isProdType
                ? (item.current_stock || item.stock || 0)
                : (item.available_stock !== undefined ? item.available_stock : (item.current_stock || item.stock || 0));
              const maxStock = Math.max(stock, 50);
              const stockPct = Math.min(100, (stock / maxStock) * 100);
              const stockUnit = isProdType ? (item.count_unit || 'rolls') : (item.unit || 'units');
              const stockStatus = stock === 0 ? 'out' : stock < 10 ? 'low' : 'in';
              const stockBarColor = stockStatus === 'out' ? 'bg-red-500' : stockStatus === 'low' ? 'bg-amber-400' : 'bg-green-500';
              const stockBadgeStyle = stockStatus === 'out'
                ? 'bg-red-100 text-red-700' : stockStatus === 'low'
                ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700';
              const stockLabel = stockStatus === 'out' ? 'Out of Stock' : stockStatus === 'low' ? 'Low Stock' : 'In Stock';
              const hexColor = item.color && /^#[0-9A-Fa-f]{3,6}$/.test(item.color) ? item.color : (colorCodeMap[item.color] || null);
              const length = parseFloat(item.length || '0');
              const width = parseFloat(item.width || '0');
              const lengthUnit = item.length_unit || 'm';
              const widthUnit = item.width_unit || 'm';
              const sqm = length > 0 && width > 0 ? calculateSQM(length, width, lengthUnit, widthUnit) : 0;
              const sqmUnit = isProdType ? (item.count_unit ? (item.count_unit.endsWith('s') ? item.count_unit.slice(0, -1) : item.count_unit) : 'roll') : '';

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full text-left rounded-xl border transition-all overflow-hidden p-2.5 flex gap-2.5 relative cursor-pointer ${
                    isSelected ? 'border-blue-500 bg-blue-50/70 shadow-sm' : 'border-gray-100 bg-white shadow-sm'
                  }`}
                >
                  {/* Left: Thumbnail/swatch/icon */}
                  <div className="flex-shrink-0 flex flex-col items-center justify-start w-12">
                    {item.image_url || item.imageUrl ? (
                      <img src={item.image_url || item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    ) : item.pattern && patternImageMap[item.pattern] ? (
                      <img src={patternImageMap[item.pattern]} alt={item.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200" />
                    ) : hexColor ? (
                      <div className="w-12 h-12 rounded-lg border border-black/10 shadow-inner" style={{ backgroundColor: hexColor }} />
                    ) : (
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isProdType ? 'bg-blue-50' : 'bg-purple-50'}`}>
                        <Package className={`w-5 h-5 ${isProdType ? 'text-blue-400' : 'text-purple-400'}`} />
                      </div>
                    )}
                  </div>

                  {/* Right: Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    {/* Name + badge */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold text-gray-900 leading-tight flex-1">{item.name}</p>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ${stockBadgeStyle}`}>{stockLabel}</span>
                    </div>

                    {/* Chips/Tags */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.category && (
                        <span className="flex items-center gap-1 text-[9.5px] bg-gray-50 border border-gray-200/85 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          <Tag className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" />
                          {item.category}
                        </span>
                      )}
                      {item.subcategory && (
                        <span className="text-[9.5px] bg-gray-50 border border-gray-200/85 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {item.subcategory}
                        </span>
                      )}
                      {isProdType && item.color && item.color !== 'N/A' && (
                        <span className="flex items-center gap-1 text-[9.5px] bg-amber-50 border border-amber-200/60 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
                          <Droplet className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                          {item.color}
                        </span>
                      )}
                      {isProdType && length > 0 && width > 0 && (
                        <span className="flex items-center gap-1 text-[9.5px] bg-blue-50 border border-blue-200/60 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          <Maximize2 className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          {item.length}{item.length_unit || 'm'} × {item.width}{item.width_unit || 'm'}
                        </span>
                      )}
                      {isProdType && sqm > 0 && (
                        <span className="flex items-center gap-1 text-[9.5px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                          <Grid3x3 className="w-3 h-3 text-white flex-shrink-0" />
                          {sqm.toFixed(2)} SQM/{sqmUnit}
                        </span>
                      )}
                      {isProdType && item.weight && (
                        <span className="flex items-center gap-1 text-[9.5px] bg-green-50 border border-green-200/60 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          <Layers className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {item.weight} {item.weight_unit || 'GSM'}
                        </span>
                      )}
                      {!isProdType && item.supplier && (
                        <span className="text-[9.5px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                          {item.supplier}
                        </span>
                      )}
                      {!isProdType && item.brand && (
                        <span className="text-[9.5px] bg-purple-50 border border-purple-200/50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                          {item.brand}
                        </span>
                      )}
                    </div>

                    {/* Stock bar + stock number */}
                    <div className="flex items-center justify-between gap-2.5 mt-2 pt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stockBarColor}`} style={{ width: `${stockPct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-green-700 flex-shrink-0">
                        {formatIndianNumberWithDecimals(stock, 0)} {stockUnit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalCount > perPage && (
              <div className="flex items-center justify-between py-2">
                <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40">
                  Previous
                </button>
                <span className="text-xs text-gray-400">{currentPage} / {Math.ceil(totalCount / perPage)}</span>
                <button onClick={() => onPageChange(Math.min(Math.ceil(totalCount / perPage), currentPage + 1))} disabled={currentPage >= Math.ceil(totalCount / perPage)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 disabled:opacity-40">
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Bottom Sort + Filter bar */}
          <div className="p-3.5 bg-white border-t border-gray-100 flex gap-3.5 w-full flex-shrink-0 pb-5">
            <button onClick={() => setMobileSortOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 border border-gray-200 rounded-2xl bg-gray-50 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
              <List className="w-3.5 h-3.5 text-gray-500" />
              <span>{activeSortLabel}</span>
            </button>
            <button onClick={() => setMobileFilterOpen(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 border rounded-2xl text-xs font-semibold transition-colors ${
                activeFilterCount > 0 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}>
              <Filter className="w-3.5 h-3.5" />
              <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Sort sheet */}
        {mobileSortOpen && (
          <div onClick={e => e.stopPropagation()}>
            <div className="fixed inset-0 bg-black/40 z-[70]" onClick={() => setMobileSortOpen(false)} />
            <div className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-200 pb-8">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                <span className="text-base font-bold text-gray-900">Sort By</span>
                <button onClick={() => setMobileSortOpen(false)}>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="pb-8">
                {MOBILE_SORT_OPTS.map((opt, i) => {
                  const active = opt.sortBy === sortBy && opt.sortOrder === sortOrder;
                  return (
                    <button key={opt.label} onClick={() => {
                      if (isProdType) onProductSortChange?.(opt.sortBy, opt.sortOrder);
                      else onMaterialSortChange?.(opt.sortBy, opt.sortOrder);
                      setMobileSortOpen(false);
                    }} className={`w-full flex items-center gap-4 px-5 py-4 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-blue-600' : 'border-gray-300'}`}>
                        {active && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                      </div>
                      <span className={`text-sm ${active ? 'font-bold text-blue-600' : 'font-normal text-gray-900'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filter sheet */}
        {mobileFilterOpen && (
          <div onClick={e => e.stopPropagation()}>
            <div className="fixed inset-0 z-[70] bg-white flex flex-col animate-in slide-in-from-bottom duration-250">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-gray-250 flex-shrink-0">
                <span className="text-lg font-bold text-gray-900">Filters</span>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button 
                      onClick={clearAllFilters} 
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      CLEAR ALL
                    </button>
                  )}
                  <button 
                    onClick={() => setMobileFilterOpen(false)} 
                    className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Close filters"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar Sections */}
                <div className="w-[115px] bg-gray-50 border-r border-gray-200 flex-shrink-0 overflow-y-auto">
                  {/* Stock Status tab */}
                  <button
                    onClick={() => setMobileActiveFilterTab('stock')}
                    className={`w-full text-left py-4 px-3.5 text-xs font-semibold border-l-4 transition-all relative flex flex-col gap-1 ${
                      mobileActiveFilterTab === 'stock'
                        ? 'border-blue-600 bg-white text-blue-600 font-extrabold'
                        : 'border-transparent text-gray-700 hover:bg-gray-100/50'
                    }`}
                  >
                    <span>Stock Status</span>
                    {selectedStockFilters.length > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                        {selectedStockFilters.length}
                      </span>
                    )}
                  </button>

                  {/* Categories tab */}
                  {categories.length > 0 && (
                    <button
                      onClick={() => setMobileActiveFilterTab('category')}
                      className={`w-full text-left py-4 px-3.5 text-xs font-semibold border-l-4 transition-all relative flex flex-col gap-1 ${
                        mobileActiveFilterTab === 'category'
                          ? 'border-blue-600 bg-white text-blue-600 font-extrabold'
                          : 'border-transparent text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      <span>Category</span>
                      {selectedCategories.length > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                          {selectedCategories.length}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Subcategories tab */}
                  {subcategories.length > 0 && (
                    <button
                      onClick={() => setMobileActiveFilterTab('subcategory')}
                      className={`w-full text-left py-4 px-3.5 text-xs font-semibold border-l-4 transition-all relative flex flex-col gap-1 ${
                        mobileActiveFilterTab === 'subcategory'
                          ? 'border-blue-600 bg-white text-blue-600 font-extrabold'
                          : 'border-transparent text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      <span>Subcategory</span>
                      {selectedSubcategories.length > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                          {selectedSubcategories.length}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Colors tab */}
                  {colors.length > 0 && (
                    <button
                      onClick={() => setMobileActiveFilterTab('color')}
                      className={`w-full text-left py-4 px-3.5 text-xs font-semibold border-l-4 transition-all relative flex flex-col gap-1 ${
                        mobileActiveFilterTab === 'color'
                          ? 'border-blue-600 bg-white text-blue-600 font-extrabold'
                          : 'border-transparent text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      <span>Color</span>
                      {selectedColors.length > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                          {selectedColors.length}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Patterns tab */}
                  {patterns.length > 0 && (
                    <button
                      onClick={() => setMobileActiveFilterTab('pattern')}
                      className={`w-full text-left py-4 px-3.5 text-xs font-semibold border-l-4 transition-all relative flex flex-col gap-1 ${
                        mobileActiveFilterTab === 'pattern'
                          ? 'border-blue-600 bg-white text-blue-600 font-extrabold'
                          : 'border-transparent text-gray-700 hover:bg-gray-100/50'
                      }`}
                    >
                      <span>Pattern</span>
                      {selectedPatterns.length > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                          {selectedPatterns.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* Right Options Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Stock options */}
                  {mobileActiveFilterTab === 'stock' && (
                    <div className="space-y-1">
                      {[{ v: 'in_stock', l: 'In Stock' }, { v: 'low_stock', l: 'Low Stock' }, { v: 'out_of_stock', l: 'Out of Stock' }].map(opt => {
                        const checked = selectedStockFilters.includes(opt.v);
                        return (
                          <button 
                            key={opt.v} 
                            onClick={() => setSelectedStockFilters(prev => prev.includes(opt.v) ? prev.filter(x => x !== opt.v) : [...prev, opt.v])}
                            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                            </div>
                            <span className={`text-sm font-medium ${checked ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                              {opt.l}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Category options */}
                  {mobileActiveFilterTab === 'category' && (
                    <div className="space-y-1">
                      {categories.map(cat => {
                        const checked = selectedCategories.includes(cat);
                        return (
                          <button 
                            key={cat} 
                            onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])}
                            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                            </div>
                            <span className={`text-sm font-medium ${checked ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                              {cat}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Subcategory options */}
                  {mobileActiveFilterTab === 'subcategory' && (
                    <div className="space-y-1">
                      {subcategories.map(sub => {
                        const checked = selectedSubcategories.includes(sub);
                        return (
                          <button 
                            key={sub} 
                            onClick={() => setSelectedSubcategories(prev => prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub])}
                            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                            </div>
                            <span className={`text-sm font-medium ${checked ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                              {sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Color options */}
                  {mobileActiveFilterTab === 'color' && (
                    <div className="space-y-1">
                      {colors.map(color => {
                        const checked = selectedColors.includes(color);
                        return (
                          <button 
                            key={color} 
                            onClick={() => setSelectedColors(prev => prev.includes(color) ? prev.filter(x => x !== color) : [...prev, color])}
                            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {colorCodeMap[color] && (
                                <span 
                                  className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0 inline-block shadow-inner" 
                                  style={{ backgroundColor: colorCodeMap[color] }} 
                                />
                              )}
                              <span className={`text-sm font-medium truncate ${checked ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                                {color}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Pattern options */}
                  {mobileActiveFilterTab === 'pattern' && (
                    <div className="space-y-1">
                      {patterns.map(pattern => {
                        const checked = selectedPatterns.includes(pattern);
                        return (
                          <button 
                            key={pattern} 
                            onClick={() => setSelectedPatterns(prev => prev.includes(pattern) ? prev.filter(x => x !== pattern) : [...prev, pattern])}
                            className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                            </div>
                            <span className={`text-sm font-medium ${checked ? 'text-blue-700 font-bold' : 'text-gray-800'}`}>
                              {pattern}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-gray-100 mb-6 flex-shrink-0">
                <button 
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white text-base font-bold"
                >
                  Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    if (isMobile) {
      return createPortal(mobileContent, document.body);
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent customLayout className="max-w-7xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
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

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col px-6 pt-4 gap-4">
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

          {/* Filters and Sorting Row */}
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            {/* Sorting Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
              <Select
                value={sortBy}
                onValueChange={(value) => handleSortByChange(value as 'name' | 'stock' | 'category' | 'recent')}
              >
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="recent">Recently Added</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(value: 'asc' | 'desc') => handleSortOrderChange(value)}
              >
                <SelectTrigger className="w-[110px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                            <span className="inline-flex items-center gap-1">{colorCodeMap[color] && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: colorCodeMap[color] }} />}{color}</span>
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
                            <span className="inline-flex items-center gap-1">{patternImageMap[pattern] && <img src={patternImageMap[pattern]} alt={pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />}{pattern}</span>
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
                {paginatedItems.length === 0 ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <div className="text-center">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
                      <p className="text-sm text-gray-600">No {currentItem?.product_type === 'raw_material' ? 'materials' : 'products'} found</p>
                    </div>
                  </div>
                ) : (
                  paginatedItems.map(item => (
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

  return null;
}
