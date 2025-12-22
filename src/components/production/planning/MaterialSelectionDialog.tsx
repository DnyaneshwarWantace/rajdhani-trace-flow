import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Package, Layers, Plus, Check, ChevronLeft, ChevronRight, AlertCircle, Grid3x3, List } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { ProductService } from '@/services/productService';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { calculateSQM } from '@/utils/sqmCalculator';

interface Material {
  id: string;
  name: string;
  current_stock: number;
  unit: string;
  count_unit?: string; // Counting unit for products (e.g., "rolls")
  type: 'raw_material' | 'product';
  category?: string;
  subcategory?: string;
  supplier?: string;
  material_type?: string;
  cost?: number;
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
  color?: string;
  pattern?: string;
}

interface SelectedMaterial {
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  unit: string;
}

interface MaterialSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (materials: SelectedMaterial[]) => void;
  existingMaterials?: SelectedMaterial[];
}

export default function MaterialSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  existingMaterials = [],
}: MaterialSelectionDialogProps) {
  const [activeTab, setActiveTab] = useState<'raw_materials' | 'products'>('raw_materials');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]); // Multi-select
  const [subcategoryFilter, setSubcategoryFilter] = useState<string[]>([]); // Multi-select
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string[]>([]); // Multi-select
  const [colorFilter, setColorFilter] = useState<string[]>([]); // Multi-select
  const [patternFilter, setPatternFilter] = useState<string[]>([]); // Multi-select
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]); // Multi-select
  const [lengthFilter, setLengthFilter] = useState<string[]>([]); // Multi-select
  const [widthFilter, setWidthFilter] = useState<string[]>([]); // Multi-select
  const [weightFilter, setWeightFilter] = useState<string[]>([]); // Multi-select
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, SelectedMaterial>>(
    new Map(existingMaterials.map((m) => [m.material_id, m]))
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Dynamic filter options
  const [rawMaterialCategories, setRawMaterialCategories] = useState<string[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<string[]>([]);
  const [productPatterns, setProductPatterns] = useState<string[]>([]);
  const [productLengths, setProductLengths] = useState<string[]>([]);
  const [productWidths, setProductWidths] = useState<string[]>([]);
  const [productWeights, setProductWeights] = useState<string[]>([]);
  const [materialSuppliers, setMaterialSuppliers] = useState<string[]>([]);
  const [materialColors, setMaterialColors] = useState<string[]>([]);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  // Load filter options only once when dialog opens or tab changes
  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
    }
  }, [isOpen, activeTab]);

  // Load materials when filters change
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      loadMaterials();
    }
  }, [isOpen, activeTab, searchQuery, categoryFilter, subcategoryFilter, materialTypeFilter, colorFilter, patternFilter, supplierFilter, lengthFilter, widthFilter, weightFilter]);

  // Load filtered materials when page changes
  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [currentPage]);

  const loadFilterOptions = async () => {
    try {
      if (activeTab === 'raw_materials') {
        // Fetch all materials for filter extraction
        const allMaterialsResponse = await MaterialService.getMaterials({ limit: 1000 });
        const allMaterials = allMaterialsResponse.materials || [];

        // Extract unique filter values - ONLY these 4 filters
        const categories = Array.from(new Set(allMaterials.map((m: any) => m.category).filter(Boolean))).sort();
        setRawMaterialCategories(categories);

        const types = Array.from(new Set(allMaterials.map((m: any) => m.material_type).filter(Boolean))).sort();
        setMaterialTypes(types);

        const colors = Array.from(new Set(allMaterials.map((m: any) => m.color).filter((c) => c && c !== 'N/A'))).sort();
        setMaterialColors(colors);

        const suppliers = Array.from(new Set(allMaterials.map((m: any) => m.supplier_name).filter(Boolean))).sort();
        setMaterialSuppliers(suppliers);
      } else {
        // Fetch all products for filter extraction
        const allProductsResponse = await ProductService.getProducts({ limit: 1000 });
        const allProducts = allProductsResponse.products || [];

        // Extract unique filter values
        const categories = Array.from(new Set(allProducts.map((p: any) => p.category).filter(Boolean))).sort();
        setProductCategories(categories);

        const subcategories = Array.from(new Set(allProducts.map((p: any) => p.subcategory).filter(Boolean))).sort();
        setProductSubcategories(subcategories);

        const colors = Array.from(new Set(allProducts.map((p: any) => p.color).filter((c) => c && c !== 'N/A'))).sort();
        setProductColors(colors);

        const patterns = Array.from(new Set(allProducts.map((p: any) => p.pattern).filter((p) => p && p !== 'N/A'))).sort();
        setProductPatterns(patterns);

        // Extract unique lengths, widths, weights
        const lengths = Array.from(new Set(allProducts.map((p: any) => p.length).filter(Boolean))).sort((a, b) => parseFloat(a) - parseFloat(b));
        setProductLengths(lengths);

        const widths = Array.from(new Set(allProducts.map((p: any) => p.width).filter(Boolean))).sort((a, b) => parseFloat(a) - parseFloat(b));
        setProductWidths(widths);

        const weights = Array.from(new Set(allProducts.map((p: any) => p.weight).filter(Boolean))).sort((a, b) => parseFloat(a) - parseFloat(b));
        setProductWeights(weights);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadMaterials = async () => {
    setLoading(true);
    try {
      if (activeTab === 'raw_materials') {

        // Fetch filtered materials for display
        // Fetch all materials if multiple categories or use single category
        const response = await MaterialService.getMaterials({
          search: searchQuery || undefined,
          category: categoryFilter.length === 1 ? categoryFilter[0] : undefined,
          page: currentPage,
          limit: categoryFilter.length > 1 ? 1000 : itemsPerPage, // Fetch all if multiple categories
        });

        let materialsData = response.materials || [];

        // Apply multi-select category filter client-side if multiple selected
        if (categoryFilter.length > 0) {
          materialsData = materialsData.filter((m: any) => categoryFilter.includes(m.category));
        }

        // Apply other client-side filters (for filters not supported by backend)
        if (materialTypeFilter.length > 0) {
          materialsData = materialsData.filter((m: any) => materialTypeFilter.includes(m.material_type));
        }
        if (colorFilter.length > 0) {
          materialsData = materialsData.filter((m: any) => colorFilter.includes(m.color));
        }
        if (supplierFilter.length > 0) {
          materialsData = materialsData.filter((m: any) => supplierFilter.includes(m.supplier_name));
        }

        // Paginate client-side if multiple filters selected
        const totalFilteredCount = materialsData.length;
        if (categoryFilter.length > 1 || materialTypeFilter.length > 1 || colorFilter.length > 1 || supplierFilter.length > 1) {
          const startIdx = (currentPage - 1) * itemsPerPage;
          const endIdx = startIdx + itemsPerPage;
          materialsData = materialsData.slice(startIdx, endIdx);
        }

        setRawMaterials(
          materialsData.map((m: any) => ({
            id: m.id,
            name: m.name,
            current_stock: m.current_stock || 0,
            unit: m.unit || 'kg',
            type: 'raw_material' as const,
            category: m.category,
            material_type: m.material_type,
            supplier: m.supplier_name,
            cost: m.cost_per_unit,
            color: m.color,
          }))
        );

        setTotalPages(Math.ceil((categoryFilter.length > 1 || materialTypeFilter.length > 1 || colorFilter.length > 1 || supplierFilter.length > 1 ? totalFilteredCount : (response.total || 0)) / itemsPerPage));
      } else {
        // Fetch filtered products for display
        const response = await ProductService.getProducts({
          search: searchQuery || undefined,
          category: categoryFilter.length === 1 ? categoryFilter[0] : undefined,
          color: colorFilter.length > 0 ? colorFilter : undefined,
          pattern: patternFilter.length > 0 ? patternFilter : undefined,
          subcategory: subcategoryFilter.length > 0 ? subcategoryFilter : undefined,
          length: lengthFilter.length > 0 ? lengthFilter : undefined,
          width: widthFilter.length > 0 ? widthFilter : undefined,
          weight: weightFilter.length > 0 ? weightFilter : undefined,
          page: currentPage,
          limit: categoryFilter.length > 1 || colorFilter.length > 1 || patternFilter.length > 1 || subcategoryFilter.length > 1 || lengthFilter.length > 1 || widthFilter.length > 1 || weightFilter.length > 1 ? 1000 : itemsPerPage,
        });

        let productsData = response.products || [];

        // Apply multi-select category filter client-side if multiple selected
        if (categoryFilter.length > 0) {
          productsData = productsData.filter((p: any) => categoryFilter.includes(p.category));
        }

        // Apply client-side filters (for filters not fully supported by backend or multi-select)
        if (subcategoryFilter.length > 0) {
          productsData = productsData.filter((p: any) => subcategoryFilter.includes(p.subcategory));
        }
        if (colorFilter.length > 0) {
          productsData = productsData.filter((p: any) => colorFilter.includes(p.color));
        }
        if (patternFilter.length > 0) {
          productsData = productsData.filter((p: any) => patternFilter.includes(p.pattern));
        }
        if (lengthFilter.length > 0) {
          productsData = productsData.filter((p: any) => {
            const productLength = `${p.length} ${p.length_unit || ''}`.trim();
            return lengthFilter.includes(productLength) || lengthFilter.includes(p.length?.toString());
          });
        }
        if (widthFilter.length > 0) {
          productsData = productsData.filter((p: any) => {
            const productWidth = `${p.width} ${p.width_unit || ''}`.trim();
            return widthFilter.includes(productWidth) || widthFilter.includes(p.width?.toString());
          });
        }
        if (weightFilter.length > 0) {
          productsData = productsData.filter((p: any) => {
            const productWeight = `${p.weight || ''} ${p.weight_unit || ''}`.trim();
            return weightFilter.includes(productWeight) || weightFilter.includes(p.weight?.toString());
          });
        }

        // Paginate client-side if multiple filters selected
        const totalFilteredCount = productsData.length;
        if (categoryFilter.length > 1 || colorFilter.length > 1 || patternFilter.length > 1 || subcategoryFilter.length > 1 || lengthFilter.length > 1 || widthFilter.length > 1 || weightFilter.length > 1) {
          const startIdx = (currentPage - 1) * itemsPerPage;
          const endIdx = startIdx + itemsPerPage;
          productsData = productsData.slice(startIdx, endIdx);
        }

        // Fetch available stock for products with individual tracking
        const productsWithStock = await Promise.all(
          productsData.map(async (p: any) => {
            let availableStock = p.current_stock || 0;

            // For products with individual stock tracking, get count of available individual products
            if (p.individual_stock_tracking) {
              try {
                const { IndividualProductService } = await import('@/services/individualProductService');
                const { total: availableCount } = await IndividualProductService.getIndividualProductsByProductId(
                  p.id,
                  { status: 'available' }
                );
                availableStock = availableCount || 0;
              } catch (error) {
                console.error(`Error fetching individual products for ${p.id}:`, error);
                availableStock = 0;
              }
            }

            return {
              id: p.id,
              name: p.name,
              current_stock: availableStock,
              unit: p.unit || 'pcs',
              type: 'product' as const,
              category: p.category,
              subcategory: p.subcategory,
              length: p.length,
              width: p.width,
              length_unit: p.length_unit,
              width_unit: p.width_unit,
              weight: p.weight,
              weight_unit: p.weight_unit,
              color: p.color,
              pattern: p.pattern,
            };
          })
        );

        setProducts(productsWithStock);

        setTotalPages(Math.ceil((categoryFilter.length > 1 || colorFilter.length > 1 || patternFilter.length > 1 || subcategoryFilter.length > 1 || lengthFilter.length > 1 || widthFilter.length > 1 || weightFilter.length > 1 ? totalFilteredCount : (response.total || 0)) / itemsPerPage));
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMaterial = (material: Material) => {
    const newSelected = new Map(selectedMaterials);

    if (newSelected.has(material.id)) {
      newSelected.delete(material.id);
    } else {
      newSelected.set(material.id, {
        material_id: material.id,
        material_name: material.name,
        material_type: material.type,
        quantity_per_sqm: 0, // Will be set by user in the requirements table
        unit: material.unit,
      });
    }

    setSelectedMaterials(newSelected);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedMaterials.values()));
    onClose();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'raw_materials' | 'products');
    setCurrentPage(1);
    setCategoryFilter([]); // Reset to empty array for multi-select
    setSubcategoryFilter([]);
    setMaterialTypeFilter([]);
    setColorFilter([]);
    setPatternFilter([]);
    setSupplierFilter([]);
    setLengthFilter([]);
    setWidthFilter([]);
    setWeightFilter([]);
    setSearchQuery('');
  };

  const getStockStatusBadge = (stock: number) => {
    if (stock === 0) {
      return (
        <Badge variant="destructive" className="text-xs">
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

  const MaterialCard = ({ material }: { material: Material }) => {
    const isSelected = selectedMaterials.has(material.id);

    return (
      <Card
        onClick={() => handleSelectMaterial(material)}
        className={`p-4 cursor-pointer transition-all hover:shadow-md h-full ${
          isSelected ? 'bg-primary-50 border-primary-400 border-2' : 'border-gray-200 hover:border-primary-200'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-semibold text-gray-900">{material.name}</h4>
                {isSelected && (
                  <Badge className="bg-primary-600 text-white text-xs flex-shrink-0">
                    <Check className="w-3 h-3 mr-1" />
                    Selected
                  </Badge>
                )}
              </div>
              {material.category && (
                <p className="text-xs text-gray-600 mb-1 break-words">
                  Category: {material.category}
                  {material.subcategory && ` • ${material.subcategory}`}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <p className="text-gray-500">Stock Available</p>
              <p className="font-medium text-gray-900">
                {material.type === 'product' ? (
                  <>
                    {material.current_stock} {material.count_unit || 'rolls'}
                  </>
                ) : (
                  <>{material.current_stock} {material.unit}</>
                )}
              </p>
            </div>
            <div className="flex items-start justify-end">
              {getStockStatusBadge(material.current_stock)}
            </div>
          </div>

          {/* Additional details for products */}
          {material.type === 'product' && (() => {
            const length = parseFloat(material.length || '0');
            const width = parseFloat(material.width || '0');
            const lengthUnit = material.length_unit || 'm';
            const widthUnit = material.width_unit || 'm';
            const sqm = length > 0 && width > 0 ? calculateSQM(length, width, lengthUnit, widthUnit) : 0;

            return (
              <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {material.length && (
                  <div className="min-w-0">
                    <p className="text-gray-500">Length</p>
                    <p className="font-medium text-gray-900 truncate">
                      {material.length} {lengthUnit}
                    </p>
                  </div>
                )}
                {material.width && (
                  <div className="min-w-0">
                    <p className="text-gray-500">Width</p>
                    <p className="font-medium text-gray-900 truncate">
                      {material.width} {widthUnit}
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
                {material.weight && (
                  <div className="min-w-0">
                    <p className="text-gray-500">Weight</p>
                    <p className="font-medium text-gray-900 truncate">{material.weight} {material.weight_unit || ''}</p>
                  </div>
                )}
                {material.color && material.color !== 'N/A' && (
                  <div className="min-w-0">
                    <p className="text-gray-500">Color</p>
                    <p className="font-medium text-gray-900 truncate">{material.color}</p>
                  </div>
                )}
                {material.pattern && material.pattern !== 'N/A' && (
                  <div className="col-span-2 min-w-0">
                    <p className="text-gray-500">Pattern</p>
                    <p className="font-medium text-gray-900 truncate">{material.pattern}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Additional details for raw materials */}
          {material.type === 'raw_material' && (
            <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {material.supplier && (
                <div className="min-w-0">
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-medium text-gray-900 truncate" title={material.supplier}>{material.supplier}</p>
                </div>
              )}
              {material.cost && (
                <div className="min-w-0">
                  <p className="text-gray-500">Cost</p>
                  <p className="font-medium text-gray-900">₹{material.cost}/{material.unit}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  };

  const currentMaterials = activeTab === 'raw_materials' ? rawMaterials : products;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Select Materials & Products</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Choose materials and products to add to your production plan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-sm px-3 py-1 ${
                  activeTab === 'raw_materials'
                    ? 'bg-blue-100 text-blue-700 border-blue-400'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}
              >
                <Layers className="w-4 h-4 mr-2" />
                {activeTab === 'raw_materials' ? 'Viewing: Raw Materials' : 'Raw Materials'}
              </Badge>
              <Badge
                variant="outline"
                className={`text-sm px-3 py-1 ${
                  activeTab === 'products'
                    ? 'bg-green-100 text-green-700 border-green-400'
                    : 'bg-gray-100 text-gray-500 border-gray-300'
                }`}
              >
                <Package className="w-4 h-4 mr-2" />
                {activeTab === 'products' ? 'Viewing: Products' : 'Products'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs and View Toggle - Fixed */}
        <div className="px-6 pt-2 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="raw_materials" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                  <Layers className="w-4 h-4 mr-2" />
                  Raw Materials
                </TabsTrigger>
                <TabsTrigger value="products" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                  <Package className="w-4 h-4 mr-2" />
                  Products
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Toggle */}
            <div className="hidden lg:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filters - Fixed */}
        <div className="px-6 pt-2 pb-3 flex-shrink-0 border-b border-gray-200">
          {activeTab === 'raw_materials' ? (
            // RAW MATERIALS: Only 4 filters - Category, Material Type, Color, Supplier
            <>
              {/* First Row: Search, Category, Material Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {/* Search */}
                <DebouncedSearchInput
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search materials (min 3 characters)..."
                  minCharacters={3}
                  debounceMs={500}
                  showCounter={true}
                />

                {/* Category Filter - Multi-select */}
                <MultiSelect
                  options={rawMaterialCategories.map(cat => ({ label: cat, value: cat }))}
                  selected={categoryFilter}
                  onChange={(values) => { setCategoryFilter(values); setCurrentPage(1); }}
                  placeholder="All Categories"
                />

                {/* Material Type Filter - Multi-select */}
                <MultiSelect
                  options={materialTypes.map(type => ({ label: type, value: type }))}
                  selected={materialTypeFilter}
                  onChange={(values) => { setMaterialTypeFilter(values); setCurrentPage(1); }}
                  placeholder="All Material Types"
                />
              </div>

              {/* Second Row: Color, Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Color Filter - Multi-select */}
                <MultiSelect
                  options={materialColors.map(color => ({ label: color, value: color }))}
                  selected={colorFilter}
                  onChange={(values) => { setColorFilter(values); setCurrentPage(1); }}
                  placeholder="All Colors"
                />

                {/* Supplier Filter - Multi-select */}
                <MultiSelect
                  options={materialSuppliers.map(supplier => ({ label: supplier, value: supplier }))}
                  selected={supplierFilter}
                  onChange={(values) => { setSupplierFilter(values); setCurrentPage(1); }}
                  placeholder="All Suppliers"
                />
              </div>
            </>
          ) : (
            // PRODUCTS: Category, Subcategory, Color, Pattern, Length, Width, Weight
            <>
              {/* First Row: Search, Category, Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {/* Search */}
                <DebouncedSearchInput
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search products (min 3 characters)..."
                  minCharacters={3}
                  debounceMs={500}
                  showCounter={true}
                />

                {/* Category Filter - Multi-select */}
                <MultiSelect
                  options={productCategories.map(cat => ({ label: cat, value: cat }))}
                  selected={categoryFilter}
                  onChange={(values) => { setCategoryFilter(values); setCurrentPage(1); }}
                  placeholder="All Categories"
                />

                {/* Subcategory Filter - Multi-select */}
                <MultiSelect
                  options={productSubcategories.map(sub => ({ label: sub, value: sub }))}
                  selected={subcategoryFilter}
                  onChange={(values) => { setSubcategoryFilter(values); setCurrentPage(1); }}
                  placeholder="All Subcategories"
                />
              </div>

              {/* Second Row: Color, Pattern */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {/* Color Filter - Multi-select */}
                <MultiSelect
                  options={productColors.map(color => ({ label: color, value: color }))}
                  selected={colorFilter}
                  onChange={(values) => { setColorFilter(values); setCurrentPage(1); }}
                  placeholder="All Colors"
                />

                {/* Pattern Filter - Multi-select */}
                <MultiSelect
                  options={productPatterns.map(pattern => ({ label: pattern, value: pattern }))}
                  selected={patternFilter}
                  onChange={(values) => { setPatternFilter(values); setCurrentPage(1); }}
                  placeholder="All Patterns"
                />
              </div>

              {/* Third Row: Length, Width, Weight - Multi-select Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Length Filter - Multi-select */}
                <MultiSelect
                  options={productLengths.map(length => ({ label: length, value: length }))}
                  selected={lengthFilter}
                  onChange={(values) => { setLengthFilter(values); setCurrentPage(1); }}
                  placeholder="All Lengths"
                />

                {/* Width Filter - Multi-select */}
                <MultiSelect
                  options={productWidths.map(width => ({ label: width, value: width }))}
                  selected={widthFilter}
                  onChange={(values) => { setWidthFilter(values); setCurrentPage(1); }}
                  placeholder="All Widths"
                />

                {/* Weight Filter - Multi-select */}
                <MultiSelect
                  options={productWeights.map(weight => ({ label: weight, value: weight }))}
                  selected={weightFilter}
                  onChange={(values) => { setWeightFilter(values); setCurrentPage(1); }}
                  placeholder="All Weights"
                />
              </div>
            </>
          )}
        </div>

        {/* Content Area - Scrollable with fixed min-height */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 min-h-0 max-h-full">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading {activeTab === 'raw_materials' ? 'raw materials' : 'products'}...</p>
                <p className="text-sm text-gray-500 mt-1">Please wait</p>
              </div>
            </div>
          ) : currentMaterials.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No {activeTab === 'raw_materials' ? 'raw materials' : 'products'} found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
              {currentMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          ) : (
            <div className="py-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      {activeTab === 'raw_materials' ? (
                        <>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dimensions</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color/Pattern</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Select</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {currentMaterials.map((material) => {
                      const isSelected = selectedMaterials.has(material.id);

                      return (
                        <tr key={material.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                          <td className="px-3 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{material.name}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-gray-700 truncate max-w-[150px]" title={material.category || '-'}>{material.category || '-'}</p>
                            {material.subcategory && <p className="text-xs text-gray-500 truncate max-w-[150px]" title={material.subcategory}>{material.subcategory}</p>}
                            {material.material_type && <p className="text-xs text-gray-500 truncate max-w-[150px]" title={material.material_type}>{material.material_type}</p>}
                          </td>
                          <td className="px-3 py-3">
                            {activeTab === 'raw_materials' ? (
                              <span className="font-medium text-gray-900">{material.current_stock} {material.unit}</span>
                            ) : (
                              <>
                                {material.length && material.width && (() => {
                                  const length = parseFloat(material.length);
                                  const width = parseFloat(material.width);
                                  const sqm = calculateSQM(length, width, material.length_unit || 'm', material.width_unit || 'm');
                                  const totalSqm = sqm * material.current_stock;
                                  return (
                                    <>
                                      <span className="font-medium text-gray-900">
                                        {material.current_stock} {material.count_unit || 'rolls'}
                                      </span>
                                      {totalSqm > 0 && (
                                        <p className="text-xs text-gray-500 mt-0.5">({totalSqm.toFixed(2)} SQM)</p>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </td>
                          {activeTab === 'raw_materials' ? (
                            <>
                              <td className="px-3 py-3">
                                <p className="text-gray-700 truncate max-w-[150px]" title={material.supplier || '-'}>{material.supplier || '-'}</p>
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-gray-700">{material.cost ? `₹${material.cost}/${material.unit}` : '-'}</p>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-3">
                                <p className="text-gray-700">
                                  {material.length && material.width
                                    ? `${material.length}${material.length_unit} × ${material.width}${material.width_unit}`
                                    : '-'}
                                </p>
                                {material.length && material.width && (() => {
                                  const length = parseFloat(material.length);
                                  const width = parseFloat(material.width);
                                  const sqm = calculateSQM(length, width, material.length_unit || 'm', material.width_unit || 'm');
                                  return sqm > 0 ? (
                                    <p className="text-xs text-gray-500 mt-0.5">({sqm.toFixed(2)} SQM)</p>
                                  ) : null;
                                })()}
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-gray-700 truncate max-w-[120px]" title={material.color || '-'}>{material.color || '-'}</p>
                                {material.pattern && <p className="text-xs text-gray-500 truncate max-w-[120px]" title={material.pattern}>{material.pattern}</p>}
                              </td>
                              <td className="px-3 py-3">
                                <p className="text-gray-700">{material.weight ? `${material.weight} ${material.weight_unit || ''}`.trim() : '-'}</p>
                              </td>
                            </>
                          )}
                          <td className="px-3 py-3 text-center">
                            <Button
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleSelectMaterial(material)}
                              className={isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-4 h-4 mr-1" />
                                  Selected
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1" />
                                  Select
                                </>
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination - Fixed */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Fixed */}
        <DialogFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedMaterials.size} {selectedMaterials.size === 1 ? 'item' : 'items'} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedMaterials.size === 0} className="text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Selected ({selectedMaterials.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
