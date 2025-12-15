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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Package, Layers, Plus, Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
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
  type: 'raw_material' | 'product';
  category?: string;
  subcategory?: string;
  supplier?: string;
  cost?: number;
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
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

  // Categories
  const [rawMaterialCategories, setRawMaterialCategories] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      loadMaterials();
    }
  }, [isOpen, activeTab, searchQuery, categoryFilter, stockFilter, currentPage]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      if (activeTab === 'raw_materials') {
        const response = await MaterialService.getMaterials({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          status: stockFilter !== 'all' ? stockFilter : undefined,
          page: currentPage,
          limit: itemsPerPage,
        });

        const materialsData = response.materials || [];
        setRawMaterials(
          materialsData.map((m: any) => ({
            id: m.id,
            name: m.name,
            current_stock: m.current_stock || 0,
            unit: m.unit || 'kg',
            type: 'raw_material' as const,
            category: m.category,
            supplier: m.supplier_name,
            cost: m.cost_per_unit,
          }))
        );

        // Extract unique categories
        const categories = Array.from(new Set(materialsData.map((m: any) => m.category).filter(Boolean)));
        setRawMaterialCategories(categories);
        setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
      } else {
        const response = await ProductService.getProducts({
          search: searchQuery || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          page: currentPage,
          limit: itemsPerPage,
        });

        const productsData = response.products || [];
        setProducts(
          productsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            current_stock: p.current_stock || p.base_quantity || 0,
            unit: p.unit || 'pcs',
            type: 'product' as const,
            category: p.category,
            subcategory: p.subcategory,
            length: p.length,
            width: p.width,
            weight: p.weight,
            color: p.color,
            pattern: p.pattern,
          }))
        );

        // Extract unique categories
        const categories = Array.from(new Set(productsData.map((p: any) => p.category).filter(Boolean)));
        setProductCategories(categories);
        setTotalPages(Math.ceil((response.total || 0) / itemsPerPage));
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
        quantity_per_sqm: 0,
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
    setCategoryFilter('all');
    setStockFilter('all');
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
                {material.current_stock} {material.unit}
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
                    <p className="font-medium text-gray-900 truncate">{material.weight}</p>
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

  const currentCategories = activeTab === 'raw_materials' ? rawMaterialCategories : productCategories;
  const currentMaterials = activeTab === 'raw_materials' ? rawMaterials : products;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 gap-0 flex flex-col">
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

        {/* Tabs - Fixed */}
        <div className="px-6 pt-4 flex-shrink-0">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
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
        </div>

        {/* Current Section Indicator */}
        <div className="px-6 pt-3 flex-shrink-0">
          <div className={`px-4 py-2 rounded-lg border-l-4 ${
            activeTab === 'raw_materials'
              ? 'bg-blue-50 border-blue-500'
              : 'bg-green-50 border-green-500'
          }`}>
            <div className="flex items-center gap-2">
              {activeTab === 'raw_materials' ? (
                <>
                  <Layers className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Currently Viewing: Raw Materials</p>
                    <p className="text-xs text-blue-700">Select raw materials like yarn, thread, backing, etc.</p>
                  </div>
                </>
              ) : (
                <>
                  <Package className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Currently Viewing: Products</p>
                    <p className="text-xs text-green-700">Select finished products to use as materials in production</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filters - Fixed */}
        <div className="px-6 pt-3 pb-3 flex-shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative col-span-1 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {currentCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock Filter - only for raw materials */}
            {activeTab === 'raw_materials' && (
              <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : currentMaterials.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No {activeTab === 'raw_materials' ? 'raw materials' : 'products'} found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
              {currentMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
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
            <Button onClick={handleConfirm} disabled={selectedMaterials.size === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Add Selected ({selectedMaterials.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
