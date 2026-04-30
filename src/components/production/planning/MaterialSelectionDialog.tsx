import { useState, useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  available_stock?: number;
  in_production?: number;
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
  const prevIsOpenRef = useRef(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, SelectedMaterial>>(
    new Map(existingMaterials.map((m) => [m.material_id, m]))
  );

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
  const [productColorCodeMap, setProductColorCodeMap] = useState<Record<string, string>>({});
  const [productPatternImageMap, setProductPatternImageMap] = useState<Record<string, string>>({});
  const [productLengths, setProductLengths] = useState<string[]>([]);
  const [productWidths, setProductWidths] = useState<string[]>([]);
  const [productWeights, setProductWeights] = useState<string[]>([]);
  const [materialSuppliers, setMaterialSuppliers] = useState<string[]>([]);
  const [materialColors, setMaterialColors] = useState<string[]>([]);

  // Sync selectedMaterials with existingMaterials prop whenever it changes
  useEffect(() => {
    setSelectedMaterials(new Map(existingMaterials.map((m) => [m.material_id, m])));
  }, [existingMaterials]);

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

  // When dialog opens: load both materials and products once; keep cache when closed so re-open is instant
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    // If we already have cached data from a previous open, show it immediately (no refetch)
    if (rawMaterials.length > 0 && products.length > 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([loadRawMaterialsOnly(), loadProductsOnly()])
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  // When user changes search/filters: refetch current tab only (do not refetch on tab switch)
  useEffect(() => {
    if (!isOpen) return;
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      return;
    }
    setCurrentPage(1);
    loadMaterials();
  }, [isOpen, searchQuery, categoryFilter, subcategoryFilter, materialTypeFilter, colorFilter, patternFilter, supplierFilter, lengthFilter, widthFilter, weightFilter]);

  // Keep totalPages in sync with cached list when switching tabs (no refetch); reset to page 1
  useEffect(() => {
    if (!isOpen) return;
    const list = activeTab === 'raw_materials' ? rawMaterials : products;
    setTotalPages(Math.max(1, Math.ceil(list.length / itemsPerPage)));
    setCurrentPage(1);
  }, [isOpen, activeTab, rawMaterials.length, products.length]);

  const loadRawMaterialsOnly = async (): Promise<void> => {
    try {
      const response = await MaterialService.getMaterials({
        page: 1,
        limit: 1000,
        usage_type: 'per_batch',
      });
      const all = response.materials || [];
      let materialsData = [...all];
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        materialsData = materialsData.filter((m: any) =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.id?.toLowerCase().includes(searchLower) ||
          m.category?.toLowerCase().includes(searchLower) ||
          m.type?.toLowerCase().includes(searchLower) ||
          m.material_type?.toLowerCase().includes(searchLower) ||
          m.color?.toLowerCase().includes(searchLower) ||
          m.supplier_name?.toLowerCase().includes(searchLower) ||
          m.batch_number?.toLowerCase().includes(searchLower)
        );
      }
      if (categoryFilter.length > 0) {
        materialsData = materialsData.filter((m: any) => categoryFilter.includes(m.category));
      }
      if (materialTypeFilter.length > 0) {
        materialsData = materialsData.filter((m: any) => materialTypeFilter.includes(m.type || m.material_type));
      }
      if (colorFilter.length > 0) {
        materialsData = materialsData.filter((m: any) => colorFilter.includes(m.color));
      }
      if (supplierFilter.length > 0) {
        materialsData = materialsData.filter((m: any) => supplierFilter.includes(m.supplier_name));
      }
      const list = materialsData.map((m: any) => ({
        id: m.id,
        name: m.name,
        current_stock: m.current_stock || 0,
        available_stock: m.available_stock,
        in_production: m.in_production,
        unit: m.unit || 'kg',
        type: 'raw_material' as const,
        category: m.category,
        material_type: m.type || m.material_type,
        supplier: m.supplier_name,
        cost: m.cost_per_unit,
        color: m.color,
      }));
      setRawMaterials(list);
      setTotalPages(Math.ceil(list.length / itemsPerPage));
      setRawMaterialCategories(Array.from(new Set(all.map((m: any) => m.category).filter(Boolean))).sort());
      setMaterialTypes(Array.from(new Set(all.map((m: any) => m.type || m.material_type).filter(Boolean))).sort());
      setMaterialColors(Array.from(new Set(all.map((m: any) => m.color).filter((c: any) => c && c !== 'N/A'))).sort());
      setMaterialSuppliers(Array.from(new Set(all.map((m: any) => m.supplier_name).filter(Boolean))).sort());
    } catch (error) {
      console.error('Error loading raw materials:', error);
    }
  };

  const loadProductsOnly = async (): Promise<void> => {
    try {
      const [response, dropdownData] = await Promise.all([
        ProductService.getProducts({
          search: searchQuery || undefined,
          page: 1,
          limit: 1000,
        }),
        ProductService.getDropdownData().catch(() => null),
      ]);
      const all = response.products || [];
      let productsData = [...all];
      if (categoryFilter.length > 0) {
        productsData = productsData.filter((p: any) => categoryFilter.includes(p.category));
      }
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
      const productsWithStock = productsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        current_stock: p.current_stock ?? 0,
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
      }));
      setProducts(productsWithStock);
      setTotalPages(Math.ceil(productsWithStock.length / itemsPerPage));
      setProductCategories(Array.from(new Set(all.map((p: any) => p.category).filter(Boolean))).sort());
      setProductSubcategories(Array.from(new Set(all.map((p: any) => p.subcategory).filter(Boolean))).sort());
      setProductColors(Array.from(new Set(all.map((p: any) => p.color).filter((c: any) => c && c !== 'N/A'))).sort());
      setProductPatterns(Array.from(new Set(all.map((p: any) => p.pattern).filter((p: any) => p && p !== 'N/A'))).sort());
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
      setProductLengths(Array.from(new Set(all.map((p: any) => p.length).filter(Boolean))).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)));
      setProductWidths(Array.from(new Set(all.map((p: any) => p.width).filter(Boolean))).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)));
      setProductWeights(Array.from(new Set(all.map((p: any) => p.weight).filter(Boolean))).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadMaterials = async () => {
    setLoading(true);
    try {
      if (activeTab === 'raw_materials') {
        await loadRawMaterialsOnly();
      } else {
        await loadProductsOnly();
      }
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
    // Do not reset filters so switching tabs uses cached data and does not refetch
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
                    {Number(material.available_stock !== undefined ? material.available_stock : material.current_stock).toFixed(2)} {material.count_unit || 'rolls'}
                  </>
                ) : (
                  <>{Number(material.available_stock !== undefined ? material.available_stock : material.current_stock).toFixed(2)} {material.unit}</>
                )}
              </p>
              {material.in_production && material.in_production > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ({Number(material.in_production).toFixed(2)} {material.type === 'product' ? (material.count_unit || 'rolls') : material.unit} in production)
                </p>
              )}
            </div>
            <div className="flex items-start justify-end">
              {getStockStatusBadge(material.available_stock !== undefined ? material.available_stock : material.current_stock)}
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
                    <p className="text-gray-500">GSM</p>
                    <p className="font-medium text-gray-900 truncate">{material.weight} {material.weight_unit || ''}</p>
                  </div>
                )}
                {material.color && material.color !== 'N/A' && (
                  <div className="min-w-0">
                    <p className="text-gray-500">Color</p>
                    <p className="font-medium text-gray-900 truncate inline-flex items-center gap-1">
                      {productColorCodeMap[material.color] && (
                        <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: productColorCodeMap[material.color] }} />
                      )}
                      {material.color}
                    </p>
                  </div>
                )}
                {material.pattern && material.pattern !== 'N/A' && (
                  <div className="col-span-2 min-w-0">
                    <p className="text-gray-500">Pattern</p>
                    <p className="font-medium text-gray-900 truncate inline-flex items-center gap-1">
                      {productPatternImageMap[material.pattern] && (
                        <img src={productPatternImageMap[material.pattern]} alt={material.pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />
                      )}
                      {material.pattern}
                    </p>
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

  // Apply sorting
  const sortedMaterials = [...currentMaterials].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = (a.name || '').localeCompare(b.name || '');
        break;
      case 'stock': {
        const stockA = a.available_stock !== undefined ? a.available_stock : a.current_stock;
        const stockB = b.available_stock !== undefined ? b.available_stock : b.current_stock;
        compareValue = stockA - stockB;
        break;
      }
      case 'category':
        compareValue = (a.category || '').localeCompare(b.category || '');
        break;
      case 'recent':
        compareValue = new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
        break;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  // Apply client-side pagination AFTER sorting so ordering is global across all pages
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedMaterials = sortedMaterials.slice(startIdx, endIdx);

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent customLayout className="max-w-5xl h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
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

          {/* Search and Sort Controls - In One Row */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <DebouncedSearchInput
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  setCurrentPage(1);
                }}
                placeholder={activeTab === 'raw_materials' ? 'Search materials (min 3 characters)...' : 'Search products (min 3 characters)...'}
                minCharacters={3}
                debounceMs={500}
                showCounter={true}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Sort:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="recent">Recently Added</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Filters - Fixed */}
        <div className="px-6 pt-2 pb-3 flex-shrink-0 border-b border-gray-200">
          {activeTab === 'raw_materials' ? (
            // RAW MATERIALS: Only 4 filters - Category, Material Type, Color, Supplier
            <>
              {/* First Row: Category, Material Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Category Filter - Multi-select */}
                <MultiSelect
                  options={rawMaterialCategories.map(cat => ({ label: cat, value: cat }))}
                  selected={categoryFilter}
                  onChange={(values) => { setCategoryFilter(values); setCurrentPage(1); }}
                  placeholder="All Categories"
                />

                {/* Material Type Filter - Multi-select */}
                <MultiSelect
                  options={materialTypes.filter(Boolean).map(type => ({ label: type, value: type }))}
                  selected={materialTypeFilter}
                  onChange={(values) => { setMaterialTypeFilter(values); setCurrentPage(1); }}
                  placeholder="All Material Types"
                />
              </div>

              {/* Second Row: Color, Supplier */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              {/* First Row: Category, Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                {/* Color Filter - Multi-select */}
                <MultiSelect
                  options={productColors.map(color => ({ label: color, value: color, colorCode: productColorCodeMap[color] }))}
                  selected={colorFilter}
                  onChange={(values) => { setColorFilter(values); setCurrentPage(1); }}
                  placeholder="All Colors"
                />

                {/* Pattern Filter - Multi-select */}
                <MultiSelect
                  options={productPatterns.map(pattern => ({ label: pattern, value: pattern, imageUrl: productPatternImageMap[pattern] }))}
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
                  placeholder="All GSM"
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
          ) : sortedMaterials.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No {activeTab === 'raw_materials' ? 'raw materials' : 'products'} found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
              {paginatedMaterials.map((material) => (
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
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GSM</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Select</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedMaterials.map((material) => {
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
                              <div>
                                <span className="font-medium text-gray-900">
                                  {Number(material.available_stock !== undefined ? material.available_stock : material.current_stock).toFixed(2)} {material.unit}
                                </span>
                                {material.in_production && material.in_production > 0 && (
                                  <p className="text-xs text-orange-600">({Number(material.in_production).toFixed(2)} {material.unit} in production)</p>
                                )}
                              </div>
                            ) : (
                              <>
                                {material.length && material.width && (() => {
                                  const length = parseFloat(material.length);
                                  const width = parseFloat(material.width);
                                  const sqm = calculateSQM(length, width, material.length_unit || 'm', material.width_unit || 'm');
                                  const availStock = material.available_stock !== undefined ? material.available_stock : material.current_stock;
                                  const totalSqm = sqm * availStock;
                                  return (
                                    <>
                                      <span className="font-medium text-gray-900">
                                        {Number(availStock).toFixed(2)} {material.count_unit || 'rolls'}
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
                                <p className="text-gray-700 truncate max-w-[120px] inline-flex items-center gap-1" title={material.color || '-'}>
                                  {material.color && productColorCodeMap[material.color] && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: productColorCodeMap[material.color] }} />}
                                  {material.color || '-'}
                                </p>
                                {material.pattern && <p className="text-xs text-gray-500 truncate max-w-[120px] inline-flex items-center gap-1" title={material.pattern}>{productPatternImageMap[material.pattern] && <img src={productPatternImageMap[material.pattern]} alt={material.pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />}{material.pattern}</p>}
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
