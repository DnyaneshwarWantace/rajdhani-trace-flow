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
import { Search, Package, Factory, CheckCircle, X, ArrowRight } from 'lucide-react';
import type { Product } from '@/types/product';
import type { RawMaterial, MaterialFilters } from '@/types/material';
import type { ProductFilters } from '@/types/product';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import ProductCard from './ProductCard';
import MaterialCard from '@/components/materials/MaterialCard';
import { calculateProductRatio } from '@/utils/productRatioCalculator';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface MaterialSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (material: {
    materialId: string;
    materialName: string;
    quantity: string;
    unit: string;
    cost?: string;
    materialType?: 'product' | 'raw_material';
  }) => void;
  targetProduct?: {
    length: string;
    width: string;
    length_unit: string;
    width_unit: string;
  };
}

type SelectionStep = 'type' | 'filter';
type MaterialType = 'product' | 'material' | null;

export default function MaterialSelectorDialog({
  isOpen,
  onClose,
  onSelect,
  targetProduct,
}: MaterialSelectorDialogProps) {
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('type');
  const [chosenType, setChosenType] = useState<MaterialType>(null);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');

  // Shared / material filters (multi-select where it makes sense)
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string[]>([]);
  const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
  const [selectedMaterialColors, setSelectedMaterialColors] = useState<string[]>([]);

  // Product filters - now support multi-select (arrays)
  const [selectedColor, setSelectedColor] = useState<string[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [selectedLength, setSelectedLength] = useState<string[]>([]);
  const [selectedWidth, setSelectedWidth] = useState<string[]>([]);
  const [selectedWeight, setSelectedWeight] = useState<string[]>([]);
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

  // Helper to fully reset local state when dialog closes
  const resetState = () => {
    setSelectionStep('type');
    setChosenType(null);
    setMaterialSearchTerm('');
    setSelectedCategory([]);
    setSelectedSupplier([]);
    setSelectedMaterialTypes([]);
    setSelectedMaterialColors([]);
    setSelectedColor([]);
    setSelectedPattern([]);
    setSelectedSubcategory('all');
    setSelectedLength([]);
    setSelectedWidth([]);
    setSelectedWeight([]);
    setSelectedItems([]);
    setMaterialsPage(1);
    setProductsPage(1);
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
      };
      let { materials, total } = await MaterialService.getMaterials(filters);

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
          m.batch_number?.toLowerCase().includes(searchLower) ||
          m.quality_grade?.toLowerCase().includes(searchLower)
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

  // Load products for filters and listing (limited to avoid loading all products at once)
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  const loadProducts = async () => {
    if (chosenType !== 'product') return;
    
    try {
      setProductsLoading(true);
      const filters: ProductFilters = {
        search: materialSearchTerm || undefined,
        category: selectedCategory.length > 0 ? selectedCategory : undefined,
        page: 1,
        // Limit the number of products loaded for filtering to improve performance
        // We still filter client-side for color/pattern/length/width/weight
        limit: 200,
      };
      const { products: data, total } = await ProductService.getProducts(filters);
      setAllProducts(data);
      setProductsTotal(total);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  // Filter products client-side based on selected filters
  const getFilteredProducts = () => {
    let filtered = [...allProducts];

    // Filter by color (multi-select)
    if (selectedColor.length > 0) {
      filtered = filtered.filter(p => selectedColor.includes(p.color || ''));
    }

    // Filter by pattern (multi-select)
    if (selectedPattern.length > 0) {
      filtered = filtered.filter(p => {
        const productPattern = p.pattern || '';
        return selectedPattern.includes(productPattern);
      });
    }

    // Filter by subcategory
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(p => {
        const productSubcategory = p.subcategory || '';
        return productSubcategory === selectedSubcategory;
      });
    }

    // Filter by length (format: "value unit", multi-select)
    if (selectedLength.length > 0) {
      filtered = filtered.filter(p => {
        const productLength = `${p.length} ${p.length_unit || ''}`.trim();
        return selectedLength.includes(productLength);
      });
    }

    // Filter by width (format: "value unit", multi-select)
    if (selectedWidth.length > 0) {
      filtered = filtered.filter(p => {
        const productWidth = `${p.width} ${p.width_unit || ''}`.trim();
        return selectedWidth.includes(productWidth);
      });
    }

    // Filter by weight (format: "value unit", multi-select)
    if (selectedWeight.length > 0) {
      filtered = filtered.filter(p => {
        const productWeight = `${p.weight || ''} ${p.weight_unit || ''}`.trim();
        return selectedWeight.includes(productWeight);
      });
    }

    // Apply pagination
    const startIndex = (productsPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Calculate pagination for filtered products
  const getFilteredProductsTotal = () => {
    let filtered = [...allProducts];

    if (selectedColor.length > 0) {
      filtered = filtered.filter(p => selectedColor.includes(p.color || ''));
    }

    if (selectedPattern.length > 0) {
      filtered = filtered.filter(p => {
        const productPattern = p.pattern || '';
        return selectedPattern.includes(productPattern);
      });
    }

    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(p => {
        const productSubcategory = p.subcategory || '';
        return productSubcategory === selectedSubcategory;
      });
    }

    if (selectedLength.length > 0) {
      filtered = filtered.filter(p => {
        const productLength = `${p.length} ${p.length_unit || ''}`.trim();
        return selectedLength.includes(productLength);
      });
    }

    if (selectedWidth.length > 0) {
      filtered = filtered.filter(p => {
        const productWidth = `${p.width} ${p.width_unit || ''}`.trim();
        return selectedWidth.includes(productWidth);
      });
    }

    if (selectedWeight.length > 0) {
      filtered = filtered.filter(p => {
        const productWeight = `${p.weight || ''} ${p.weight_unit || ''}`.trim();
        return selectedWeight.includes(productWeight);
      });
    }

    return filtered.length;
  };

  // Load initial counts when dialog opens
  useEffect(() => {
    if (isOpen && chosenType === null) {
      // Load total counts for both products and materials
      const loadInitialCounts = async () => {
        try {
          // Load products count
          const productsResult = await ProductService.getProducts({ limit: 1 });
          setProductsTotal(productsResult.total || 0);
          
          // Load materials count + full list for filter options (like main material page)
          const materialsResult = await MaterialService.getMaterials({ limit: 1000 });
          setMaterialsTotal(materialsResult.total || 0);
          setAllRawMaterials(materialsResult.materials || []);
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
  }, [isOpen, chosenType, materialSearchTerm, selectedCategory, selectedMaterialTypes, selectedMaterialColors, selectedSupplier, materialsPage, productsPage, itemsPerPage]);

  // Reset materials page when filters change (for materials)
  useEffect(() => {
    if (chosenType === 'material') {
      setMaterialsPage(1);
    }
  }, [selectedCategory, selectedMaterialTypes, selectedMaterialColors, selectedSupplier, materialSearchTerm, chosenType]);

  // Reset products page when filters change (for products)
  useEffect(() => {
    if (chosenType === 'product') {
      setProductsPage(1);
    }
  }, [selectedColor, selectedPattern, selectedSubcategory, selectedLength, selectedWidth, selectedWeight, chosenType]);

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
    // Use custom 'id' field first (backend expects this), fallback to _id if id doesn't exist
    const materialId = material.id || (material as any)._id || '';
    const materialName = material.name;
    const unit = type === 'product' ? (material as Product).unit : (material as RawMaterial).unit;
    const cost = type === 'material' ? (material as RawMaterial).cost_per_unit?.toString() || '' : '';
    
    // Check if already selected
    if (selectedItems.some(item => item.materialId === materialId)) {
      return; // Already selected, do nothing
    }

    let quantity = '';
    
    // If it's a product and we have target product dimensions, try to auto-calculate
    if (type === 'product' && targetProduct) {
      const product = material as Product;
      
      if (product.length && product.width && product.length_unit && product.width_unit &&
          targetProduct.length && targetProduct.width && targetProduct.length_unit && targetProduct.width_unit) {
        // Both products have required fields - calculate the ratio
        const ratio = calculateProductRatio(product, targetProduct);
        if (ratio > 0 && !isNaN(ratio) && isFinite(ratio)) {
          quantity = ratio.toFixed(4);
        }
      }
    }

    const selected = {
      materialId,
      materialName,
      quantity,
      unit: unit || '',
      cost,
      materialType: type === 'product' ? 'product' as const : 'raw_material' as const,
    };

    // Add to selected items
    setSelectedItems([...selectedItems, selected]);
    
    // Immediately call onSelect to add to recipe (validation happens in main form)
    onSelect(selected);
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Search className="w-5 h-5 text-primary-600" />
            Select Material or Product
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {selectionStep === 'type'
              ? 'First, choose whether you want to add a Product or Raw Material to your recipe'
              : `Now filter and select from available ${chosenType === 'product' ? 'Products' : 'Raw Materials'}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 bg-white">
          {/* Step 1: Choose Type */}
          {selectionStep === 'type' && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Option */}
                <div
                  className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all shadow-sm bg-white"
                  onClick={() => {
                    setChosenType('product');
                    setSelectionStep('filter');
                  }}
                >
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-3 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Package className="w-7 h-7 text-primary-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Product</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Select from existing products in your inventory
                    </p>
                    <div className="text-xs text-gray-500 font-medium">
                      Available: {productsTotal} product{productsTotal !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {/* Material Option */}
                <div
                  className="p-6 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-all shadow-sm bg-white"
                  onClick={() => {
                    setChosenType('material');
                    setSelectionStep('filter');
                  }}
                >
                  <div className="text-center">
                    <div className="w-14 h-14 mx-auto mb-3 bg-green-100 rounded-lg flex items-center justify-center">
                      <Factory className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Raw Material</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Select from raw materials in your inventory
                    </p>
                    <div className="text-xs text-gray-500 font-medium">
                      Available: {materialsTotal} material{materialsTotal !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Filter and Select */}
          {selectionStep === 'filter' && (
            <div className="space-y-4">
              {/* Back Button */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetState();
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                  Back to Type Selection
                </Button>
                <Badge variant="outline" className="ml-2">
                  {chosenType === 'product' ? 'Products' : 'Raw Materials'}
                </Badge>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={`Search ${chosenType === 'product' ? 'products' : 'materials'} by name or category...`}
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
                  className="pl-10 h-11 border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              {/* Type-specific Filters */}
              {chosenType === 'material' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category - multi-select */}
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
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

                  {/* Type - multi-select */}
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
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

                  {/* Color - multi-select */}
                  <div>
                    <Label className="text-sm font-medium">Color</Label>
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

                  {/* Supplier - multi-select */}
                  <div className="md:col-span-3">
                    <Label className="text-sm font-medium">Supplier</Label>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Color</Label>
                    <MultiSelect
                      options={getUniqueProductColors()
                        .filter((color) => color && color.trim() !== '')
                        .map((color) => ({ label: color, value: color }))}
                      selected={selectedColor}
                      onChange={(values) => {
                        setSelectedColor(values);
                        setProductsPage(1);
                      }}
                      placeholder="All Colors"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Pattern</Label>
                    <MultiSelect
                      options={getUniqueProductPatterns()
                        .filter((pattern) => pattern && pattern.trim() !== '')
                        .map((pattern) => ({ label: pattern, value: pattern }))}
                      selected={selectedPattern}
                      onChange={(values) => {
                        setSelectedPattern(values);
                        setProductsPage(1);
                      }}
                      placeholder="All Patterns"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Subcategory</Label>
                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {getUniqueProductSubcategories()
                          .filter((subcategory) => subcategory && subcategory.trim() !== '')
                          .map((subcategory) => (
                            <SelectItem key={subcategory} value={subcategory}>
                              {subcategory}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Length</Label>
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
                    <Label className="text-sm font-medium">Width</Label>
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
                    <Label className="text-sm font-medium">Weight</Label>
                    <MultiSelect
                      options={getUniqueProductWeights()
                        .filter((weight) => weight && weight.trim() !== '')
                        .map((weight) => ({ label: weight, value: weight }))}
                      selected={selectedWeight}
                      onChange={(values) => {
                        setSelectedWeight(values);
                        setProductsPage(1);
                      }}
                      placeholder="All Weights"
                    />
                  </div>
                </div>
              )}

              {/* Selected Items Display */}
              {/* Selected Items Display */}
              {selectedItems.length > 0 && (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">
                        Selected Items ({selectedItems.length})
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedItems([]);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.materialId} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">
                            <TruncatedText text={item.materialName} maxLength={40} as="span" />
                          </div>
                          <div className="text-xs text-gray-600">
                            {item.materialType === 'product' ? 'Product' : 'Raw Material'} • {item.unit}
                            {item.quantity && ` • Qty: ${item.quantity}`}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveSelected(item.materialId);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              <div className="space-y-4">
                {(chosenType === 'product' ? productsLoading : materialsLoading) ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p>Loading {chosenType === 'product' ? 'products' : 'materials'}...</p>
                  </div>
                ) : (
                  <>
                    {chosenType === 'product' && filteredProducts.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map((product) => {
                          // Use custom 'id' field first (backend expects this), fallback to _id if id doesn't exist
                          const productId = product.id || product._id;
                          const isSelected = isItemSelected(productId);
                          return (
                            <ProductCard
                              key={productId}
                              product={product}
                              showActions={false}
                              variant="compact"
                              isSelected={isSelected}
                              onClick={() => handleMaterialSelection(product, 'product')}
                            />
                          );
                        })}
                      </div>
                    )}

                    {chosenType === 'material' && rawMaterials.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rawMaterials.map((material) => {
                          // Use custom 'id' field first (backend expects this), fallback to _id if id doesn't exist
                          const materialId = material.id || material._id;
                          const isSelected = isItemSelected(materialId);
                          return (
                            <MaterialCard
                              key={materialId}
                              material={material}
                              isSelected={isSelected}
                              onClick={() => handleMaterialSelection(material, 'material')}
                            />
                          );
                        })}
                      </div>
                    )}

                    {((chosenType === 'product' && filteredProducts.length === 0 && !productsLoading) ||
                      (chosenType === 'material' && rawMaterials.length === 0 && !materialsLoading)) && (
                      <div className="p-8 text-center text-gray-500">
                        <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">
                          No {chosenType === 'product' ? 'products' : 'materials'} found
                        </p>
                        <p className="text-sm">Try adjusting your search terms or filters</p>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
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
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-200 pt-4 mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }} 
            className="border-gray-300"
          >
            {selectedItems.length > 0 ? `Done (${selectedItems.length} selected)` : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

