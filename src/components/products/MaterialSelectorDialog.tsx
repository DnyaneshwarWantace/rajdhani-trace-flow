import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';
import { Search, Package, Factory, CheckCircle, X, ArrowRight, Plus, AlertCircle, Check, Settings, Layers } from 'lucide-react';
import type { Product } from '@/types/product';
import type { RawMaterial, MaterialFilters } from '@/types/material';
import type { ProductFilters } from '@/types/product';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { calculateProductRatio } from '@/utils/productRatioCalculator';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

interface SelectedMaterial {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  cost?: string;
  materialType?: 'product' | 'raw_material';
}

interface MaterialSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with ALL selected items when user clicks "Add to Recipe" */
  onSelectMultiple: (materials: SelectedMaterial[]) => void;
  /** @deprecated use onSelectMultiple */
  onSelect?: (material: SelectedMaterial) => void;
  targetProduct?: {
    length: string;
    width: string;
    length_unit: string;
    width_unit: string;
  };
}

export default function MaterialSelectorDialog({
  isOpen,
  onClose,
  onSelectMultiple,
  onSelect: _onSelect,
  targetProduct,
}: MaterialSelectorDialogProps) {
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();
  const [chosenType, setChosenType] = useState<'material' | 'product'>('material');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');

  // Shared / material filters (multi-select where it makes sense)
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [selectedMaterialColors, setSelectedMaterialColors] = useState<string[]>([]);

  // Product filters - now support multi-select (arrays)
  const [selectedProductCategory, setSelectedProductCategory] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string[]>([]);
  const [selectedLength, setSelectedLength] = useState<string[]>([]);
  const [selectedWidth, setSelectedWidth] = useState<string[]>([]);
  const [selectedWeight, setSelectedWeight] = useState<string[]>([]);
  const [productColorCodeMap, setProductColorCodeMap] = useState<Record<string, string>>({});
  const [productPatternImageMap, setProductPatternImageMap] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Array<{
    materialId: string;
    materialName: string;
    unit: string;
    quantity: string;
    cost: string;
    materialType: 'product' | 'raw_material';
  }>>([]);

  // Data loading state
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [allRawMaterials, setAllRawMaterials] = useState<RawMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);

  // Pagination state
  const [materialsPage, setMaterialsPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const itemsPerPage = 12;

  // Sorting state
  const [materialSortBy, setMaterialSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [materialSortOrder, setMaterialSortOrder] = useState<'asc' | 'desc'>('asc');
  const [productSortBy, setProductSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper to fully reset local state when dialog closes
  const resetState = () => {
    setChosenType('material');
    setMaterialSearchTerm('');
    setSelectedCategory([]);
    setSelectedSupplier([]);
    setSelectedMaterialTypes([]);
    setSelectedMaterialColors([]);
    setSelectedProductCategory([]);
    setSelectedColor([]);
    setSelectedPattern([]);
    setSelectedSubcategory([]);
    setSelectedLength([]);
    setSelectedWidth([]);
    setSelectedWeight([]);
    setSelectedItems([]);
    setMaterialsPage(1);
    setProductsPage(1);
    setMaterialSortBy('name');
    setMaterialSortOrder('asc');
    setProductSortBy('name');
    setProductSortOrder('asc');
    setRawMaterials([]);
    setAllProducts([]);
  };

  // Load materials with pagination (respecting filters)
  const loadMaterials = async () => {
    if (chosenType !== 'material') return;

    try {
      setMaterialsLoading(true);
      const filters: MaterialFilters = {
        // Don't send search to API - handle client-side for more fields
        search: undefined,
        category: selectedCategory.length > 0 ? selectedCategory : undefined,
        type: selectedMaterialTypes.length > 0 ? selectedMaterialTypes : undefined,
        color: selectedMaterialColors.length > 0 ? selectedMaterialColors : undefined,
        supplier: selectedSupplier.length > 0 ? selectedSupplier : undefined,
        page: materialsPage,
        limit: materialSearchTerm ? 1000 : itemsPerPage, // Fetch all if searching
        sortBy: materialSortBy,
        sortOrder: materialSortOrder,
      };
      const filtersWithRecipe = { ...filters, usage_type: 'per_batch' as const };
      let { materials, total } = await MaterialService.getMaterials(filtersWithRecipe);

      // Apply client-side search if search term exists
      if (materialSearchTerm) {
        const searchLower = materialSearchTerm.toLowerCase();
        materials = materials.filter((m: any) =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.id?.toLowerCase().includes(searchLower) ||
          m.category?.toLowerCase().includes(searchLower) ||
          m.type?.toLowerCase().includes(searchLower) ||
          m.color?.toLowerCase().includes(searchLower) ||
          m.supplier_name?.toLowerCase().includes(searchLower) ||
          m.batch_number?.toLowerCase().includes(searchLower)
        );

        // Update total for filtered results
        total = materials.length;

        // Apply pagination client-side
        const startIdx = (materialsPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        materials = materials.slice(startIdx, endIdx);
      }

      setRawMaterials(materials);
      setMaterialsTotal(total);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  // Load products for filters and listing (fetch large batch, then filter/sort/paginate client-side)
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const loadProducts = async () => {
    if (chosenType !== 'product') return;
    
    try {
      setProductsLoading(true);
      const filters: ProductFilters = {
        // Use backend pagination and sorting like main product page
        // Backend supports arrays for multi-select filters
        search: materialSearchTerm || undefined,
        category: selectedProductCategory.length > 0 ? selectedProductCategory : undefined,
        color: selectedColor.length > 0 ? selectedColor : undefined,
        pattern: selectedPattern.length > 0 ? selectedPattern : undefined,
        subcategory: selectedSubcategory.length > 0 ? selectedSubcategory : undefined,
        length: selectedLength.length > 0 ? selectedLength : undefined,
        width: selectedWidth.length > 0 ? selectedWidth : undefined,
        weight: selectedWeight.length > 0 ? selectedWeight : undefined,
        page: productsPage,
        limit: itemsPerPage,
        sortBy: productSortBy,
        sortOrder: productSortOrder,
      };
      const [{ products: data, total }, dropdownData] = await Promise.all([
        ProductService.getProducts(filters),
        ProductService.getDropdownData().catch(() => null),
      ]);
      setAllProducts(data || []);
      setProductsTotal(total);
      const nextColorCodeMap: Record<string, string> = {};
      (dropdownData?.colors || []).forEach((item: any) => {
        if (item?.value && item?.color_code) nextColorCodeMap[item.value] = item.color_code;
      });
      setProductColorCodeMap(nextColorCodeMap);

      const nextPatternImageMap: Record<string, string> = {};
      (dropdownData?.patterns || []).forEach((item: any) => {
        if (item?.value && item?.image_url) nextPatternImageMap[item.value] = item.image_url;
      });
      setProductPatternImageMap(nextPatternImageMap);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  // Backend handles filtering, sorting, and pagination - just return current page
  const getFilteredProducts = () => {
    // Backend already filtered, sorted, and paginated - just return the current page
    return allProducts;
  };

  // Backend provides total count - use it directly
  const getFilteredProductsTotal = () => {
    return productsTotal;
  };

  // Load initial counts when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Load total counts for both products and materials
      const loadInitialCounts = async () => {
        try {
          // Load products count
          const productsResult = await ProductService.getProducts({ limit: 1 });
          setProductsTotal(productsResult.total || 0);
          
          // Load materials count + full list for filter options (like main material page)
          const materialsResult = await MaterialService.getMaterials({ limit: 1000, usage_type: 'per_batch' });
          const mats = materialsResult.materials || [];
          setMaterialsTotal(materialsResult.total ?? mats.length);
          setAllRawMaterials(mats);
        } catch (err) {
          console.error('Failed to load initial counts:', err);
        }
      };
      loadInitialCounts();
    }
  }, [isOpen]);

  // Load data when filters change
  useEffect(() => {
    if (isOpen && chosenType === 'material') {
      loadMaterials();
    } else if (isOpen && chosenType === 'product') {
      loadProducts();
    }
  }, [
    isOpen,
    chosenType,
    materialSearchTerm,
    selectedCategory,
    selectedMaterialTypes,
    selectedMaterialColors,
    selectedSupplier,
    selectedProductCategory,
    selectedColor,
    selectedPattern,
    selectedSubcategory,
    selectedLength,
    selectedWidth,
    selectedWeight,
    materialSortBy,
    materialSortOrder,
    productSortBy,
    productSortOrder,
    materialsPage,
    productsPage,
    itemsPerPage,
  ]);

  // Reset materials page when filters change (for materials)
  useEffect(() => {
    if (chosenType === 'material') {
      setMaterialsPage(1);
    }
  }, [selectedCategory, selectedMaterialTypes, selectedMaterialColors, selectedSupplier, materialSearchTerm, materialSortBy, materialSortOrder, chosenType]);

  // Reset products page when filters change (for products)
  useEffect(() => {
    if (chosenType === 'product') {
      setProductsPage(1);
    }
  }, [selectedProductCategory, selectedColor, selectedPattern, selectedSubcategory, selectedLength, selectedWidth, selectedWeight, productSortBy, productSortOrder, materialSearchTerm, chosenType]);

  // Get unique values for filters (from all loaded data)
  const getUniqueCategories = () => {
    if (chosenType === 'material') {
      const source = allRawMaterials.length > 0 ? allRawMaterials : rawMaterials;
      return [...new Set(source.map(m => m.category).filter(Boolean))];
    }
    return [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  };

  const getUniqueSuppliers = () => {
    const source = allRawMaterials.length > 0 ? allRawMaterials : rawMaterials;
    return [...new Set(source.map(m => m.supplier_name).filter(Boolean))];
  };

  const getUniqueMaterialTypes = () => {
    const source = allRawMaterials.length > 0 ? allRawMaterials : rawMaterials;
    return [
      ...new Set(
        source
          .map(m => m.type)
          .filter((t): t is string => Boolean(t && t !== 'N/A'))
      ),
    ];
  };

  const getUniqueMaterialColors = () => {
    const source = allRawMaterials.length > 0 ? allRawMaterials : rawMaterials;
    return [
      ...new Set(
        source
          .map(m => m.color)
          .filter((c): c is string => Boolean(c && c !== 'N/A'))
      ),
    ];
  };

  const getUniqueProductCategories = () => {
    return [...new Set(allProducts.map(p => p.category).filter((c): c is string => Boolean(c)))];
  };

  const getUniqueProductColors = () => {
    return [...new Set(allProducts.map(p => p.color).filter((c): c is string => Boolean(c)))];
  };

  const getUniqueProductPatterns = () => {
    return [...new Set(allProducts.map(p => p.pattern).filter((p): p is string => Boolean(p)))];
  };

  const getUniqueProductSubcategories = () => {
    return [...new Set(allProducts.map(p => p.subcategory).filter((s): s is string => Boolean(s)))];
  };

  const getUniqueProductLengths = () => {
    return [...new Set(allProducts.map(p => `${p.length} ${p.length_unit || ''}`).filter(Boolean))];
  };

  const getUniqueProductWidths = () => {
    return [...new Set(allProducts.map(p => `${p.width} ${p.width_unit || ''}`).filter(Boolean))];
  };

  const getUniqueProductWeights = () => {
    return [...new Set(allProducts.map(p => `${p.weight || ''} ${p.weight_unit || ''}`).filter(Boolean))];
  };

  // Calculate pagination
  const currentTotal = chosenType === 'product' ? getFilteredProductsTotal() : materialsTotal;
  const currentPage = chosenType === 'product' ? productsPage : materialsPage;
  const totalPages = Math.ceil(currentTotal / itemsPerPage);
  const filteredProducts = chosenType === 'product' ? getFilteredProducts() : [];

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      if (chosenType === 'product') {
        setProductsPage(newPage);
      } else {
        setMaterialsPage(newPage);
      }
    }
  };

  const handleMaterialSelection = (material: Product | RawMaterial, type: 'product' | 'material') => {
    const materialId = material.id || (material as any)._id || '';

    // Toggle: if already selected, remove it
    if (selectedItems.some(item => item.materialId === materialId)) {
      setSelectedItems(selectedItems.filter(item => item.materialId !== materialId));
      return;
    }

    const materialName = material.name;
    const unit = type === 'product' ? (material as Product).unit : (material as RawMaterial).unit;
    const cost = type === 'material' ? (material as RawMaterial).cost_per_unit?.toString() || '' : '';

    let quantity = '';
    if (type === 'product' && targetProduct) {
      const product = material as Product;
      if (product.length && product.width && product.length_unit && product.width_unit &&
          targetProduct.length && targetProduct.width && targetProduct.length_unit && targetProduct.width_unit) {
        const ratio = calculateProductRatio(product, targetProduct);
        if (ratio > 0 && !isNaN(ratio) && isFinite(ratio)) {
          quantity = ratio.toFixed(4);
        }
      }
    }

    setSelectedItems([...selectedItems, {
      materialId,
      materialName,
      quantity,
      unit: unit || '',
      cost,
      materialType: type === 'product' ? 'product' as const : 'raw_material' as const,
    }]);
  };

  const handleQuantityChange = (materialId: string, value: string) => {
    setSelectedItems(selectedItems.map(item =>
      item.materialId === materialId ? { ...item, quantity: value } : item
    ));
  };

  const handleConfirmSelection = () => {
    const valid = selectedItems.filter(item => parseFloat(item.quantity) > 0 && item.unit);
    if (valid.length === 0) return;
    onSelectMultiple(valid);
    resetState();
    onClose();
  };

  const handleRemoveSelected = (materialId: string) => {
    setSelectedItems(selectedItems.filter(item => item.materialId !== materialId));
  };

  const handleClose = () => {
    // Reset all local state when user closes via button / overlay
    resetState();
    // Don't reset totals - they will be reloaded when dialog opens again
    onClose();
  };

  // Also reset local state whenever parent closes the dialog
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Check if an item is already selected
  const isItemSelected = (itemId: string) => {
    return selectedItems.some(item => item.materialId === itemId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent customLayout className="max-w-5xl h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between animate-fade-in">
            <div>
              <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Search className="w-5 h-5 text-primary-600" />
                Select Material or Product
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                Filter and select ingredients to build your product recipe
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="px-6 pt-2 flex-shrink-0">
          <div className="flex border-b border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={() => {
                setChosenType('material');
                setMaterialsPage(1);
              }}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                chosenType === 'material'
                  ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/55'
              }`}
            >
              <Layers className="w-4 h-4" />
              Raw Materials ({materialsTotal})
            </button>
            <button
              type="button"
              onClick={() => {
                setChosenType('product');
                setProductsPage(1);
              }}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                chosenType === 'product'
                  ? 'border-primary-600 text-primary-600 bg-primary-50/20'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/55'
              }`}
            >
              <Package className="w-4 h-4" />
              Products ({productsTotal})
            </button>
          </div>
        </div>

        {/* Search, Sort and Filters Area - Scrollable but within bounds */}
        <div className="px-6 py-4 flex-shrink-0 space-y-3 bg-gray-50/40 border-b border-gray-150">
          {/* Search + Sort */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-405 w-5 h-5" />
              <Input
                placeholder={`Search ${chosenType === 'product' ? 'products' : 'materials'} by name or category...`}
                value={materialSearchTerm}
                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                className="pl-10 h-10 border-gray-300 focus:border-primary-500 focus:ring-primary-500 bg-white text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Sort by:</span>
              <Select
                value={chosenType === 'material' ? materialSortBy : productSortBy}
                onValueChange={(value: 'name' | 'stock' | 'category' | 'recent') => {
                  if (chosenType === 'material') {
                    setMaterialSortBy(value);
                    setMaterialsPage(1);
                  } else {
                    setProductSortBy(value);
                    setProductsPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs bg-white border-gray-300">
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
                value={chosenType === 'material' ? materialSortOrder : productSortOrder}
                onValueChange={(value: 'asc' | 'desc') => {
                  if (chosenType === 'material') {
                    setMaterialSortOrder(value);
                    setMaterialsPage(1);
                  } else {
                    setProductSortOrder(value);
                    setProductsPage(1);
                  }
                }}
              >
                <SelectTrigger className="w-[90px] h-9 text-xs bg-white border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type-specific Filters */}
          {chosenType === 'material' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in">
              {/* Category */}
              <div>
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</Label>
                <MultiSelect
                  options={getUniqueCategories()
                    .filter((category) => category && category.trim() !== '')
                    .map((category) => ({ label: category, value: category }))}
                  selected={selectedCategory}
                  onChange={(values) => {
                    setSelectedCategory(values);
                    setMaterialsPage(1);
                  }}
                  placeholder="All Categories"
                />
              </div>

              {/* Type */}
              <div>
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Type</Label>
                <MultiSelect
                  options={getUniqueMaterialTypes()
                    .filter((type) => type && type.trim() !== '')
                    .map((type) => ({ label: type, value: type }))}
                  selected={selectedMaterialTypes}
                  onChange={(values) => {
                    setSelectedMaterialTypes(values);
                    setMaterialsPage(1);
                  }}
                  placeholder="All Types"
                />
              </div>

              {/* Color */}
              <div>
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Color</Label>
                <MultiSelect
                  options={getUniqueMaterialColors()
                    .filter((color) => color && color.trim() !== '')
                    .map((color) => ({ label: color, value: color }))}
                  selected={selectedMaterialColors}
                  onChange={(values) => {
                    setSelectedMaterialColors(values);
                    setMaterialsPage(1);
                  }}
                  placeholder="All Colors"
                />
              </div>

              {/* Supplier */}
              <div>
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Supplier</Label>
                <MultiSelect
                  options={getUniqueSuppliers()
                    .filter((supplier) => supplier && supplier.trim() !== '')
                    .map((supplier) => ({ label: supplier, value: supplier }))}
                  selected={selectedSupplier}
                  onChange={(values) => {
                    setSelectedSupplier(values);
                    setMaterialsPage(1);
                  }}
                  placeholder="All Suppliers"
                />
              </div>
            </div>
          )}

          {chosenType === 'product' && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</Label>
                  <MultiSelect
                    options={getUniqueProductCategories()
                      .filter((category) => category && category.trim() !== '')
                      .map((category) => ({ label: category, value: category }))}
                    selected={selectedProductCategory}
                    onChange={(values) => {
                      setSelectedProductCategory(values);
                      setProductsPage(1);
                    }}
                    placeholder="All Categories"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Color</Label>
                  <MultiSelect
                    options={getUniqueProductColors()
                      .filter((color) => color && color.trim() !== '')
                      .map((color) => ({ label: color, value: color, colorCode: colorCodeMap[color.toLowerCase()] }))}
                    selected={selectedColor}
                    onChange={(values) => {
                      setSelectedColor(values);
                      setProductsPage(1);
                    }}
                    placeholder="All Colors"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Pattern</Label>
                  <MultiSelect
                    options={getUniqueProductPatterns()
                      .filter((pattern) => pattern && pattern.trim() !== '')
                      .map((pattern) => ({ label: pattern, value: pattern, imageUrl: patternImageMap[pattern] }))}
                    selected={selectedPattern}
                    onChange={(values) => {
                      setSelectedPattern(values);
                      setProductsPage(1);
                    }}
                    placeholder="All Patterns"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Subcategory</Label>
                  <MultiSelect
                    options={getUniqueProductSubcategories()
                      .filter((subcategory) => subcategory && subcategory.trim() !== '')
                      .map((subcategory) => ({ label: subcategory, value: subcategory }))}
                    selected={selectedSubcategory}
                    onChange={(values) => {
                      setSelectedSubcategory(values);
                      setProductsPage(1);
                    }}
                    placeholder="All Subcategories"
                  />
                </div>
              </div>

              {/* Dimensions and GSM filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Length</Label>
                  <MultiSelect
                    options={getUniqueProductLengths()
                      .filter((length) => length && length.trim() !== '')
                      .map((length) => ({ label: length, value: length }))}
                    selected={selectedLength}
                    onChange={(values) => {
                      setSelectedLength(values);
                      setProductsPage(1);
                    }}
                    placeholder="All Lengths"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Width</Label>
                  <MultiSelect
                    options={getUniqueProductWidths()
                      .filter((width) => width && width.trim() !== '')
                      .map((width) => ({ label: width, value: width }))}
                    selected={selectedWidth}
                    onChange={(values) => {
                      setSelectedWidth(values);
                      setProductsPage(1);
                    }}
                    placeholder="All Widths"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">GSM</Label>
                  <MultiSelect
                    options={getUniqueProductWeights()
                      .filter((weight) => weight && weight.trim() !== '')
                      .map((weight) => ({ label: weight, value: weight }))}
                    selected={selectedWeight}
                    onChange={(values) => {
                      setSelectedWeight(values);
                      setProductsPage(1);
                    }}
                    placeholder="All GSM"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Items — with inline quantity inputs */}
        {selectedItems.length > 0 && (
          <div className="px-6 py-3.5 bg-green-50/60 border-b border-green-200 flex-shrink-0 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-900 text-sm">
                  Selected ({selectedItems.length}) — Enter recipe quantity per 1 SQM
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedItems([]); }}
                className="text-red-650 hover:text-red-700 hover:bg-red-100/50 h-8 text-xs font-bold transition-colors"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pb-1">
              {selectedItems.map((item) => (
                <div key={item.materialId} className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-green-200 shadow-sm text-xs transition-all duration-200 hover:shadow">
                  <span className="font-semibold text-gray-900 truncate max-w-[140px]" title={item.materialName}>
                    {item.materialName}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.materialId, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                    placeholder="Qty"
                    className="w-18 h-7 text-xs border border-gray-300 rounded-lg px-2 focus:outline-none focus:border-green-500 font-bold bg-gray-50 focus:bg-white transition-all text-center"
                  />
                  <span className="text-[10px] text-gray-500 font-bold max-w-[50px] truncate" title={item.unit}>{item.unit}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveSelected(item.materialId); }}
                    className="text-red-400 hover:text-red-655 p-0.5 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid Results Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-white">
          {(chosenType === 'product' ? productsLoading : materialsLoading) ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
              <p className="text-gray-500 text-sm font-semibold">Loading {chosenType === 'product' ? 'products' : 'materials'}...</p>
            </div>
          ) : (
            <>
              {chosenType === 'product' && filteredProducts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => {
                    const productId = product.id || product._id;
                    const isSelected = isItemSelected(productId);

                    // Compute dimensions & specs
                    const len = product.length != null && String(product.length).trim() ? String(product.length).trim() : '';
                    const wid = product.width != null && String(product.width).trim() ? String(product.width).trim() : '';
                    const lenUnit = product.length_unit || 'M';
                    const widUnit = product.width_unit || 'M';
                    const dimStr = (len && wid) ? `${len}${lenUnit} × ${wid}${widUnit}` : '';
                    const weightStr = product.weight ? `${product.weight} ${product.weight_unit || 'GSM'}` : '';

                    const stockQty = Number(product.individual_product_stats?.available ?? product.current_stock ?? 0);
                    const inProductionQty = Number(product.individual_product_stats?.in_production ?? 0);

                    const stockColor = stockQty <= 0 ? 'text-red-600 bg-red-50 border-red-200' : stockQty < 10 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-200';
                    const dotColor = stockQty <= 0 ? 'bg-red-500' : stockQty < 10 ? 'bg-amber-500' : 'bg-green-500';

                    return (
                      <div
                        key={productId}
                        onClick={() => handleMaterialSelection(product, 'product')}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col justify-between h-full bg-white relative select-none ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/25 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-350'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Top Row: Monospace ID and Image Thumbnail */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              #{String(productId).substring(0, 8)}
                            </span>
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded-lg object-cover border border-gray-255 shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center border border-primary-100">
                                <Package className="w-4 h-4 text-primary-500" />
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight min-h-[2rem]" title={product.name}>
                            {product.name}
                          </h4>

                          {/* Category */}
                          <p className="text-[10px] text-gray-500 truncate font-medium">
                            {product.category} {product.subcategory ? ` • ${product.subcategory}` : ''}
                          </p>

                          {/* Visual attributes (Color / Pattern) */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {product.color && product.color.trim() !== '' && product.color.toLowerCase() !== 'n/a' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                                {colorCodeMap[product.color.toLowerCase()] && (
                                  <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" style={{ backgroundColor: colorCodeMap[product.color.toLowerCase()] }} />
                                )}
                                {product.color}
                              </span>
                            )}
                            {product.pattern && product.pattern.trim() !== '' && product.pattern.toLowerCase() !== 'n/a' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                                {patternImageMap[product.pattern] && (
                                  <img src={patternImageMap[product.pattern]} alt={product.pattern} className="w-3.5 h-3.5 rounded-full object-cover border border-slate-300 shrink-0" />
                                )}
                                {product.pattern}
                              </span>
                            )}
                          </div>

                          {/* Specs */}
                          {(dimStr || weightStr) && (
                            <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100 space-y-1">
                              {dimStr && <p className="truncate"><span className="text-gray-400 font-semibold">Dim:</span> <span className="text-gray-750 font-bold">{dimStr}</span></p>}
                              {weightStr && <p className="truncate"><span className="text-gray-400 font-semibold">GSM:</span> <span className="text-gray-750 font-bold">{weightStr}</span></p>}
                            </div>
                          )}
                        </div>

                        {/* Stock badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3.5 pt-2 border-t border-gray-100">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            Avail: {stockQty.toFixed(2)} {product.unit || 'pcs'}
                          </span>
                          {inProductionQty > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              In Prod: {inProductionQty.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Selected Indicator Checkmark */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-0.5 shadow-sm border border-white">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {chosenType === 'material' && rawMaterials.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rawMaterials.map((material) => {
                    const materialId = material.id || material._id;
                    const isSelected = isItemSelected(materialId);

                    // Compute available stock
                    const getAvailableStock = () => {
                      if (material.available_stock !== undefined) return material.available_stock;
                      const inProd = material.in_production ?? 0;
                      const reserved = material.reserved ?? 0;
                      const currentStock = material.current_stock ?? 0;
                      if (inProd > 0 || reserved > 0) return Math.max(0, currentStock - inProd - reserved);
                      return currentStock;
                    };
                    const stockQty = Number(getAvailableStock());
                    const inProductionQty = Number(material.in_production ?? 0);

                    const stockColor = stockQty <= 0 ? 'text-red-600 bg-red-50 border-red-200' : stockQty < 10 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-200';
                    const dotColor = stockQty <= 0 ? 'bg-red-500' : stockQty < 10 ? 'bg-amber-500' : 'bg-green-500';

                    return (
                      <div
                        key={materialId}
                        onClick={() => handleMaterialSelection(material, 'material')}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col justify-between h-full bg-white relative select-none ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50/25 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-primary-350'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Top Row: Monospace ID and Image Thumbnail */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                              #{String(materialId).substring(0, 8)}
                            </span>
                            {material.image_url ? (
                              <img src={material.image_url} alt={material.name} className="w-8 h-8 rounded-lg object-cover border border-gray-255 shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center border border-green-105">
                                <Factory className="w-4 h-4 text-green-500" />
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight min-h-[2rem]" title={material.name}>
                            {material.name}
                          </h4>

                          {/* Category / Type */}
                          <p className="text-[10px] text-gray-500 truncate font-medium">
                            {material.category} {material.type && material.type !== 'N/A' ? ` • ${material.type}` : ''}
                          </p>

                          {/* Color Swatch if exists */}
                          {material.color && material.color.trim() !== '' && material.color.toLowerCase() !== 'n/a' && (
                            <div className="pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                                {colorCodeMap[material.color.toLowerCase()] && (
                                  <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block shrink-0" style={{ backgroundColor: colorCodeMap[material.color.toLowerCase()] }} />
                                )}
                                {material.color}
                              </span>
                            </div>
                          )}

                          {/* Supplier / Cost */}
                          {(material.supplier_name || material.cost_per_unit) && (
                            <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-100 space-y-1">
                              {material.supplier_name && <p className="truncate"><span className="text-gray-400 font-semibold">Supplier:</span> <span className="text-gray-750 font-bold">{material.supplier_name}</span></p>}
                              {material.cost_per_unit && (
                                <p className="truncate"><span className="text-gray-400 font-semibold">Cost:</span> <span className="text-gray-750 font-bold">₹{material.cost_per_unit}/{material.unit || 'kg'}</span></p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Stock badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3.5 pt-2 border-t border-gray-100">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            Avail: {stockQty.toFixed(2)} {material.unit || 'kg'}
                          </span>
                          {inProductionQty > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              In Prod: {inProductionQty.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Selected Indicator Checkmark */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary-600 text-white rounded-full p-0.5 shadow-sm border border-white">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {((chosenType === 'product' && filteredProducts.length === 0 && !productsLoading) ||
                (chosenType === 'material' && rawMaterials.length === 0 && !materialsLoading)) && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Search className="w-12 h-12 text-gray-300 mb-4 animate-bounce" />
                  <p className="text-gray-650 font-semibold mb-1 text-sm">No {chosenType === 'product' ? 'products' : 'materials'} found</p>
                  <p className="text-xs text-gray-405">Adjust your search query or clear filters</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
                  <div className="text-xs text-gray-500 font-medium">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                    {Math.min(currentPage * itemsPerPage, currentTotal)} of {currentTotal}{' '}
                    {chosenType === 'product' ? 'products' : 'materials'}
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
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
                              onClick={() => handlePageChange(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex items-center justify-end gap-2 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
            className="border-gray-300 hover:bg-gray-100 bg-white"
          >
            Cancel
          </Button>
          {selectedItems.length > 0 && (
            <Button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleConfirmSelection(); }}
              disabled={selectedItems.every(item => !item.quantity || parseFloat(item.quantity) <= 0)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {selectedItems.length} to Recipe
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

