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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Package, Loader2, Check, Filter } from 'lucide-react';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';

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
        const { materials: rawMats } = await MaterialService.getMaterials({ limit: 1000 });
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
          m.batch_number?.toLowerCase().includes(searchLower) ||
          m.quality_grade?.toLowerCase().includes(searchLower);
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
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
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
            variant={materialType === 'raw_material' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onMaterialTypeChange && onMaterialTypeChange('raw_material')}
            className={materialType === 'raw_material' ? 'text-white' : ''}
          >
            <Package className="w-4 h-4 mr-2" />
            Raw Materials
          </Button>
          <Button
            variant={materialType === 'product' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onMaterialTypeChange && onMaterialTypeChange('product')}
            className={materialType === 'product' ? 'text-white' : ''}
          >
            <Package className="w-4 h-4 mr-2" />
            Products
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${materialType === 'product' ? 'products' : 'materials'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                                {pattern}
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
                className="h-8 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Material List */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredMaterials.length === 0 ? (
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
                                  <div className="truncate">
                                    <span className="font-medium">Color:</span> {material.color}
                                  </div>
                                )}
                                {material.pattern && material.pattern !== 'N/A' && (
                                  <div className="truncate">
                                    <span className="font-medium">Pattern:</span> {material.pattern}
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
                                    <span className="font-medium">Weight:</span> {material.weight} {material.weight_unit}
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
          <div className="flex items-center justify-center gap-2 py-2 border-t">
            <Button
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

        <DialogFooter className="flex items-center justify-between border-t pt-4">
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
              className="text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Add {selectedMaterials.length > 0 && `(${selectedMaterials.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
