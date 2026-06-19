import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Package, Loader2, Check, Filter, X, SlidersHorizontal } from 'lucide-react';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecipeMaterialSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materialType: 'raw_material' | 'product';
  onSelect: (materials: any[]) => void;
  existingMaterialIds?: string[];
  onMaterialTypeChange?: (type: 'raw_material' | 'product') => void;
}

export default function RecipeMaterialSelectionDialog({
  isOpen,
  onClose,
  materialType,
  onSelect,
  existingMaterialIds = [],
  onMaterialTypeChange,
}: RecipeMaterialSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Mobile sheet states
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Freeze scrolling when dialog is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
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
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen, isMobile]);

  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  // Sorting states
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();

  useEffect(() => {
    if (isOpen) {
      // Clear materials immediately to avoid showing stale data
      setMaterials([]);
      setSelectedMaterials([]);
      setSearchTerm('');
      setCurrentPage(1);
      // Clear all filters
      setSelectedCategories([]);
      setSelectedSubcategories([]);
      setSelectedColors([]);
      setSelectedPatterns([]);
      setSelectedTypes([]);
      setSelectedSuppliers([]);
      // Reset sorting
      setSortBy('name');
      setSortOrder('asc');
      // Load new materials
      loadMaterials();
    }
  }, [isOpen, materialType]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadMaterials = async () => {
    setLoading(true);
    try {
      if (materialType === 'product') {
        const { products } = await ProductService.getProducts({ limit: 1000 });
        setMaterials(products || []);
      } else {
        const { materials: rawMats } = await MaterialService.getMaterials({ limit: 1000, usage_type: 'per_batch' });
        setMaterials(rawMats || []);
      }
    } catch (error) {
      console.error('Error loading materials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Client-side search and filter
  const filteredMaterials = materials.filter((m) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      let matchesSearch = false;

      if (materialType === 'product') {
        matchesSearch =
          m.name?.toLowerCase().includes(searchLower) ||
          m.id?.toLowerCase().includes(searchLower) ||
          m.category?.toLowerCase().includes(searchLower) ||
          m.subcategory?.toLowerCase().includes(searchLower) ||
          m.color?.toLowerCase().includes(searchLower) ||
          m.pattern?.toLowerCase().includes(searchLower);
      } else {
        matchesSearch =
          m.name?.toLowerCase().includes(searchLower) ||
          m.id?.toLowerCase().includes(searchLower) ||
          m.category?.toLowerCase().includes(searchLower) ||
          m.type?.toLowerCase().includes(searchLower) ||
          m.color?.toLowerCase().includes(searchLower) ||
          m.supplier_name?.toLowerCase().includes(searchLower) ||
          m.batch_number?.toLowerCase().includes(searchLower)
      }

      if (!matchesSearch) return false;
    }

    // Category filter
    if (selectedCategories.length > 0 && !selectedCategories.includes(m.category)) {
      return false;
    }

    // Product-specific filters
    if (materialType === 'product') {
      if (selectedSubcategories.length > 0 && !selectedSubcategories.includes(m.subcategory)) {
        return false;
      }
      if (selectedColors.length > 0 && !selectedColors.includes(m.color)) {
        return false;
      }
      if (selectedPatterns.length > 0 && !selectedPatterns.includes(m.pattern)) {
        return false;
      }
    }

    // Raw material-specific filters
    if (materialType === 'raw_material') {
      if (selectedTypes.length > 0 && !selectedTypes.includes(m.type)) {
        return false;
      }
      if (selectedColors.length > 0 && !selectedColors.includes(m.color)) {
        return false;
      }
      if (selectedSuppliers.length > 0 && !selectedSuppliers.includes(m.supplier_name)) {
        return false;
      }
    }

    return true;
  });

  // Apply sorting
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    let compareValue = 0;

    switch (sortBy) {
      case 'name':
        compareValue = (a.name || '').localeCompare(b.name || '');
        break;
      case 'stock': {
        const stockA = a.current_stock || 0;
        const stockB = b.current_stock || 0;
        compareValue = stockA - stockB;
        break;
      }
      case 'category':
        compareValue = (a.category || '').localeCompare(b.category || '');
        break;
      case 'recent':
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        compareValue = dateB - dateA; // Most recent first
        break;
      default:
        compareValue = 0;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  const toggleMaterialSelection = (material: any) => {
    const isSelected = selectedMaterials.some((m) => m.id === material.id);
    if (isSelected) {
      setSelectedMaterials(selectedMaterials.filter((m) => m.id !== material.id));
    } else {
      setSelectedMaterials([...selectedMaterials, material]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedMaterials);
  };

  // Pagination
  const totalPages = Math.ceil(sortedMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = sortedMaterials.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get unique filter values
  const categories = Array.from(new Set(materials.map((m) => m.category).filter(Boolean))).sort();
  const subcategories = Array.from(new Set(materials.map((m) => m.subcategory).filter(Boolean))).sort();
  const colors = Array.from(new Set(materials.map((m) => m.color).filter((c) => c && c !== 'N/A'))).sort();
  const patterns = Array.from(new Set(materials.map((m) => m.pattern).filter((p) => p && p !== 'N/A'))).sort();
  const types = Array.from(new Set(materials.map((m) => m.type).filter(Boolean))).sort();
  const suppliers = Array.from(new Set(materials.map((m) => m.supplier_name).filter(Boolean))).sort();

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedColors([]);
    setSelectedPatterns([]);
    setSelectedTypes([]);
    setSelectedSuppliers([]);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedSubcategories.length > 0 ||
    selectedColors.length > 0 ||
    selectedPatterns.length > 0 ||
    selectedTypes.length > 0 ||
    selectedSuppliers.length > 0;

  const mobileContent = isOpen && isMobile ? (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-50 animate-in fade-in duration-200" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3 shrink-0">
        <button onClick={onClose} className="p-1 text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <span className="flex-1 text-[15px] font-bold text-gray-900">Manage Recipe Materials</span>
        {selectedMaterials.length > 0 && (
          <Badge className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5">
            {selectedMaterials.length} selected
          </Badge>
        )}
      </div>

      {/* Material Type Toggle */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 shrink-0">
        <Button
          type="button"
          variant={materialType === 'raw_material' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onMaterialTypeChange && onMaterialTypeChange('raw_material')}
          className={`flex-1 text-xs h-9 font-semibold ${materialType === 'raw_material' ? 'text-white bg-blue-600 hover:bg-blue-700' : 'bg-white text-gray-700'}`}
        >
          <Package className="w-4 h-4 mr-1.5" />
          Raw Materials
        </Button>
        <Button
          type="button"
          variant={materialType === 'product' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onMaterialTypeChange && onMaterialTypeChange('product')}
          className={`flex-1 text-xs h-9 font-semibold ${materialType === 'product' ? 'text-white bg-blue-600 hover:bg-blue-700' : 'bg-white text-gray-700'}`}
        >
          <Package className="w-4 h-4 mr-1.5" />
          Products
        </Button>
      </div>

      {/* Search and Mobile Actions */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400"
            placeholder={`Search ${materialType === 'product' ? 'products' : 'materials'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-gray-400" /></button>
          )}
        </div>

        {/* Sort & Filter Trigger Buttons for Mobile */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileSortOpen(true)}
            className="flex-1 h-9 text-xs font-semibold rounded-lg bg-white border-gray-300 text-gray-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Sort: {sortBy === 'name' ? 'Name' : sortBy === 'stock' ? 'Stock' : sortBy === 'category' ? 'Category' : 'Recent'} ({sortOrder === 'asc' ? 'Asc' : 'Desc'})
          </Button>
          <Button
            type="button"
            variant={hasActiveFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setMobileFilterOpen(true)}
            className={`flex-1 h-9 text-xs font-semibold rounded-lg border-gray-300 ${hasActiveFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-gray-700'}`}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Filters {hasActiveFilters && `(${[selectedCategories, selectedSubcategories, selectedColors, selectedPatterns, selectedTypes, selectedSuppliers].flatMap(x => x).length})`}
          </Button>
        </div>
      </div>

      {/* Materials List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : sortedMaterials.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            No {materialType === 'product' ? 'products' : 'materials'} found
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {paginatedMaterials.map((material) => {
              const isSelected = selectedMaterials.some((m) => m.id === material.id);
              const isAlreadyAdded = existingMaterialIds.includes(material.id);
              return (
                <Card
                  key={material.id}
                  className={`p-3.5 cursor-pointer border rounded-xl transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : isAlreadyAdded ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'
                  }`}
                  onClick={() => toggleMaterialSelection(material)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      className="mt-0.5 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-bold text-sm text-gray-900 leading-tight block">
                          {material.name}
                        </span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 leading-normal bg-gray-100 text-gray-700 shrink-0">
                          {materialType === 'product' ? (material.count_unit || 'count') : material.unit}
                        </Badge>
                      </div>

                      {isAlreadyAdded && (
                        <div className="mb-2">
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200/80 leading-none py-0.5">
                            Already in Recipe
                          </Badge>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 space-y-0.5 font-medium">
                        <div><span className="text-gray-400 font-normal">ID:</span> {material.id}</div>
                        {material.category && (
                          <div><span className="text-gray-400 font-normal">Category:</span> {material.category} {material.subcategory && `• ${material.subcategory}`}</div>
                        )}
                        {materialType === 'raw_material' && material.supplier_name && (
                          <div><span className="text-gray-400 font-normal">Supplier:</span> {material.supplier_name}</div>
                        )}
                        {materialType === 'product' && (
                          <>
                            {material.color && material.color !== 'N/A' && (
                              <div className="inline-flex items-center gap-1">
                                <span className="text-gray-400 font-normal">Color:</span>
                                {colorCodeMap[material.color] && <span className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: colorCodeMap[material.color] }} />}
                                {material.color}
                              </div>
                            )}
                            {material.pattern && material.pattern !== 'N/A' && (
                              <div className="ml-3 inline-flex items-center gap-1">
                                <span className="text-gray-400 font-normal">Pattern:</span>
                                {patternImageMap[material.pattern] && <img src={patternImageMap[material.pattern]} alt={material.pattern} className="w-3.5 h-3.5 rounded object-cover border border-gray-200" />}
                                {material.pattern}
                              </div>
                            )}
                            {material.length && material.width && (
                              <div><span className="text-gray-400 font-normal">Dimensions:</span> {material.length}{material.length_unit} × {material.width}{material.width_unit} ({material.sqm || 0} sqm)</div>
                            )}
                          </>
                        )}
                        <div className="pt-1 mt-1 border-t border-gray-100 flex justify-between items-center text-[11px]">
                          <span className="text-gray-400 font-normal">Current Stock:</span>
                          <span className="font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{material.current_stock || 0} {materialType === 'product' ? (material.count_unit || 'count') : material.unit}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Pagination */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Prev
          </Button>
          <span className="text-xs font-medium text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Next
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3.5 flex gap-2 shrink-0">
        <Button variant="outline" onClick={onClose} className="flex-1 h-11 text-sm font-bold rounded-xl border-gray-300">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={selectedMaterials.length === 0}
          className="flex-1 h-11 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          Add {selectedMaterials.length > 0 && `(${selectedMaterials.length})`}
        </Button>
      </div>

      {/* Mobile Sort Sheet */}
      {mobileSortOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150">
              <span className="font-bold text-base text-gray-900">Sort Options</span>
              <button onClick={() => setMobileSortOpen(false)} className="p-1 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sort By</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'name', label: 'Name' },
                    { id: 'stock', label: 'Stock' },
                    { id: 'category', label: 'Category' },
                    { id: 'recent', label: 'Recent' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id as any)}
                      className={`h-10 text-xs font-semibold rounded-lg border transition-all ${
                        sortBy === opt.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'asc', label: 'Ascending' },
                    { id: 'desc', label: 'Descending' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortOrder(opt.id as any)}
                      className={`h-10 text-xs font-semibold rounded-lg border transition-all ${
                        sortOrder === opt.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <Button onClick={() => setMobileSortOpen(false)} className="w-full text-white bg-blue-600 hover:bg-blue-700 font-bold rounded-xl h-11">
                Apply Sort
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150">
              <span className="font-bold text-base text-gray-900">Filters</span>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Category selector */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => {
                      const active = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            if (active) {
                              setSelectedCategories(selectedCategories.filter(c => c !== cat));
                            } else {
                              setSelectedCategories([...selectedCategories, cat]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product specific filters */}
              {materialType === 'product' && (
                <>
                  {subcategories.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subcategories</label>
                      <div className="flex flex-wrap gap-1.5">
                        {subcategories.map((subcat) => {
                          const active = selectedSubcategories.includes(subcat);
                          return (
                            <button
                              key={subcat}
                              onClick={() => {
                                if (active) {
                                  setSelectedSubcategories(selectedSubcategories.filter(s => s !== subcat));
                                } else {
                                  setSelectedSubcategories([...selectedSubcategories, subcat]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              {subcat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {colors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Colors</label>
                      <div className="flex flex-wrap gap-1.5">
                        {colors.map((color) => {
                          const active = selectedColors.includes(color);
                          return (
                            <button
                              key={color}
                              onClick={() => {
                                if (active) {
                                  setSelectedColors(selectedColors.filter(c => c !== color));
                                } else {
                                  setSelectedColors([...selectedColors, color]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              {colorCodeMap[color] && <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: colorCodeMap[color] }} />}
                              {color}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Raw Material specific filters */}
              {materialType === 'raw_material' && (
                <>
                  {types.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Types</label>
                      <div className="flex flex-wrap gap-1.5">
                        {types.map((type) => {
                          const active = selectedTypes.includes(type);
                          return (
                            <button
                              key={type}
                              onClick={() => {
                                if (active) {
                                  setSelectedTypes(selectedTypes.filter(t => t !== type));
                                } else {
                                  setSelectedTypes([...selectedTypes, type]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {colors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Colors</label>
                      <div className="flex flex-wrap gap-1.5">
                        {colors.map((color) => {
                          const active = selectedColors.includes(color);
                          return (
                            <button
                              key={color}
                              onClick={() => {
                                if (active) {
                                  setSelectedColors(selectedColors.filter(c => c !== color));
                                } else {
                                  setSelectedColors([...selectedColors, color]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              {color}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {suppliers.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Suppliers</label>
                      <div className="flex flex-wrap gap-1.5">
                        {suppliers.map((supplier) => {
                          const active = selectedSuppliers.includes(supplier);
                          return (
                            <button
                              key={supplier}
                              onClick={() => {
                                if (active) {
                                  setSelectedSuppliers(selectedSuppliers.filter(s => s !== supplier));
                                } else {
                                  setSelectedSuppliers([...selectedSuppliers, supplier]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              {supplier}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="p-4 border-t border-gray-150 bg-gray-50 flex gap-2 shrink-0">
              <Button onClick={clearAllFilters} variant="outline" className="flex-1 h-11 text-sm font-bold rounded-xl border-gray-300">
                Clear All
              </Button>
              <Button onClick={() => setMobileFilterOpen(false)} className="flex-1 text-white bg-blue-600 hover:bg-blue-700 font-bold rounded-xl h-11">
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* Mobile view */}
      {createPortal(mobileContent, document.body)}

      {/* Desktop view */}
      <Dialog open={isOpen && !isMobile} onOpenChange={onClose}>
        <DialogContent className="hidden lg:flex max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Manage Recipe Materials
              </div>
              {selectedMaterials.length > 0 && (
                <Badge className="bg-blue-600 text-white">
                  {selectedMaterials.length} selected
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Material Type Toggle */}
          <div className="flex gap-2 mb-3">
            <Button
              type="button"
              variant={materialType === 'raw_material' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMaterialTypeChange && onMaterialTypeChange('raw_material')}
              className={materialType === 'raw_material' ? 'text-white bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Package className="w-4 h-4 mr-2" />
              Raw Materials
            </Button>
            <Button
              type="button"
              variant={materialType === 'product' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onMaterialTypeChange && onMaterialTypeChange('product')}
              className={materialType === 'product' ? 'text-white bg-blue-600 hover:bg-blue-700' : ''}
            >
              <Package className="w-4 h-4 mr-2" />
              Products
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search ${materialType === 'product' ? 'products' : 'materials'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Sort:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
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
                  <SelectTrigger className="w-[110px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
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
                        {categories.map((cat) => (
                          <div key={cat} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cat-${cat}`}
                              checked={selectedCategories.includes(cat)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories([...selectedCategories, cat]);
                                } else {
                                  setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                                }
                              }}
                            />
                            <label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer flex-1">
                              {cat}
                            </label>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Product-specific filters */}
              {materialType === 'product' && (
                <>
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
                            {subcategories.map((subcat) => (
                              <div key={subcat} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`sub-${subcat}`}
                                  checked={selectedSubcategories.includes(subcat)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedSubcategories([...selectedSubcategories, subcat]);
                                    } else {
                                      setSelectedSubcategories(selectedSubcategories.filter((c) => c !== subcat));
                                    }
                                  }}
                                />
                                <label htmlFor={`sub-${subcat}`} className="text-sm cursor-pointer flex-1">
                                  {subcat}
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
                            {colors.map((color) => (
                              <div key={color} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`color-${color}`}
                                  checked={selectedColors.includes(color)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedColors([...selectedColors, color]);
                                    } else {
                                      setSelectedColors(selectedColors.filter((c) => c !== color));
                                    }
                                  }}
                                />
                                <label htmlFor={`color-${color}`} className="text-sm cursor-pointer flex-1">
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
                            {patterns.map((pattern) => (
                              <div key={pattern} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`pattern-${pattern}`}
                                  checked={selectedPatterns.includes(pattern)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedPatterns([...selectedPatterns, pattern]);
                                    } else {
                                      setSelectedPatterns(selectedPatterns.filter((p) => p !== pattern));
                                    }
                                  }}
                                />
                                <label htmlFor={`pattern-${pattern}`} className="text-sm cursor-pointer flex-1">
                                  <span className="inline-flex items-center gap-1">{patternImageMap[pattern] && <img src={patternImageMap[pattern]} alt={pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />}{pattern}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </>
              )}

              {/* Raw material-specific filters */}
              {materialType === 'raw_material' && (
                <>
                  {/* Type Filter */}
                  {types.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Type:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                            {selectedTypes.length > 0 ? `${selectedTypes.length} selected` : 'All'}
                            <Filter className="ml-2 h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-2" align="start">
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {types.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`type-${type}`}
                                  checked={selectedTypes.includes(type)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedTypes([...selectedTypes, type]);
                                    } else {
                                      setSelectedTypes(selectedTypes.filter((t) => t !== type));
                                    }
                                  }}
                                />
                                <label htmlFor={`type-${type}`} className="text-sm cursor-pointer flex-1">
                                  {type}
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
                            {colors.map((color) => (
                              <div key={color} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`color-${color}`}
                                  checked={selectedColors.includes(color)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedColors([...selectedColors, color]);
                                    } else {
                                      setSelectedColors(selectedColors.filter((c) => c !== color));
                                    }
                                  }}
                                />
                                <label htmlFor={`color-${color}`} className="text-sm cursor-pointer flex-1">
                                  {color}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {/* Supplier Filter */}
                  {suppliers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-gray-700 whitespace-nowrap">Supplier:</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="h-8 w-[140px] text-xs justify-between">
                            {selectedSuppliers.length > 0 ? `${selectedSuppliers.length} selected` : 'All'}
                            <Filter className="ml-2 h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-2" align="start">
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {suppliers.map((supplier) => (
                              <div key={supplier} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`supplier-${supplier}`}
                                  checked={selectedSuppliers.includes(supplier)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedSuppliers([...selectedSuppliers, supplier]);
                                    } else {
                                      setSelectedSuppliers(selectedSuppliers.filter((s) => s !== supplier));
                                    }
                                  }}
                                />
                                <label htmlFor={`supplier-${supplier}`} className="text-sm cursor-pointer flex-1">
                                  {supplier}
                                </label>
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-8 text-xs font-semibold"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Material List */}
          <div className="flex-1 overflow-auto mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : sortedMaterials.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No {materialType === 'product' ? 'products' : 'materials'} found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedMaterials.map((material) => {
                  const isSelected = selectedMaterials.some((m) => m.id === material.id);
                  const isAlreadyAdded = existingMaterialIds.includes(material.id);
                  return (
                    <Card
                      key={material.id}
                      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'border-blue-500 bg-blue-50' : isAlreadyAdded ? 'border-amber-300 bg-amber-50' : 'hover:border-blue-300'
                      }`}
                      onClick={() => toggleMaterialSelection(material)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 data-[state=checked]:text-white"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm line-clamp-2">{material.name}</h4>
                                {isAlreadyAdded && (
                                  <Badge variant="outline" className="text-xs mt-1 bg-amber-100 text-amber-700 border-amber-300">
                                    Already in Recipe
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {materialType === 'product' ? (material.count_unit || 'count') : material.unit}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="truncate">
                                <span className="font-medium">ID:</span> {material.id}
                              </div>
                              {material.category && (
                                <div className="truncate">
                                  <span className="font-medium">Category:</span> {material.category}
                                  {material.subcategory && ` • ${material.subcategory}`}
                                </div>
                              )}
                              {materialType === 'raw_material' && material.supplier_name && (
                                <div className="truncate">
                                  <span className="font-medium">Supplier:</span> {material.supplier_name}
                                </div>
                              )}
                              {materialType === 'product' && (
                                <>
                                  {material.color && material.color !== 'N/A' && (
                                    <div className="truncate inline-flex items-center gap-1">
                                      <span className="font-medium">Color:</span> {colorCodeMap[material.color] && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: colorCodeMap[material.color] }} />} {material.color}
                                    </div>
                                  )}
                                  {material.pattern && material.pattern !== 'N/A' && (
                                    <div className="truncate inline-flex items-center gap-1">
                                      <span className="font-medium">Pattern:</span> {patternImageMap[material.pattern] && <img src={patternImageMap[material.pattern]} alt={material.pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />} {material.pattern}
                                    </div>
                                  )}
                                  {material.length && material.width && (
                                    <div className="truncate">
                                      <span className="font-medium">Dimensions:</span> {material.length}{material.length_unit} × {material.width}{material.width_unit}
                                    </div>
                                  )}
                                  {material.sqm && (
                                    <div className="truncate">
                                      <span className="font-medium">SQM:</span> {material.sqm}
                                    </div>
                                  )}
                                  {material.weight && (
                                    <div className="truncate">
                                      <span className="font-medium">GSM:</span> {material.weight} {material.weight_unit}
                                    </div>
                                  )}
                                </>
                              )}
                              <div>
                                <span className="font-medium">Stock:</span> {material.current_stock || 0} {materialType === 'product' ? (material.count_unit || 'count') : material.unit}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-2 border-t mt-4 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
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
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={currentPage === pageNum ? 'text-white' : ''}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <span className="text-sm text-gray-600 ml-2">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between border-t pt-4 px-6 pb-6 mt-auto flex-shrink-0">
            <div className="text-sm text-gray-600">
              {selectedMaterials.length > 0 ? (
                <span>{selectedMaterials.length} material(s) selected</span>
              ) : (
                <span>Select materials to add</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={selectedMaterials.length === 0}
                className="text-white bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Add {selectedMaterials.length > 0 && `(${selectedMaterials.length})`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
