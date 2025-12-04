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
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Package, Factory, CheckCircle, X, ArrowRight } from 'lucide-react';
import type { Product } from '@/types/product';
import type { RawMaterial, MaterialFilters } from '@/types/material';
import type { ProductFilters } from '@/types/product';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import ProductCard from './ProductCard';
import MaterialCard from '@/components/materials/MaterialCard';
import { calculateProductRatio } from '@/utils/productRatioCalculator';
import { calculateSQM, formatSQMWithSquareFeet } from '@/utils/sqmCalculator';

interface MaterialSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (material: {
    materialId: string;
    materialName: string;
    quantity: string;
    unit: string;
    cost?: string;
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedLength, setSelectedLength] = useState('all');
  const [selectedWidth, setSelectedWidth] = useState('all');
  const [selectedWeight, setSelectedWeight] = useState('all');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [calculatedQuantity, setCalculatedQuantity] = useState<string>('');

  // Data loading state
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);

  // Pagination state
  const [materialsPage, setMaterialsPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const itemsPerPage = 12;

  // Load materials with pagination
  const loadMaterials = async () => {
    if (chosenType !== 'material') return;
    
    try {
      setMaterialsLoading(true);
      const filters: MaterialFilters = {
        search: materialSearchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        page: materialsPage,
        limit: itemsPerPage,
      };
      const { materials, total } = await MaterialService.getMaterials(filters);
      setRawMaterials(materials);
      setMaterialsTotal(total);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setMaterialsLoading(false);
    }
  };

  // Load products with pagination
  const loadProducts = async () => {
    if (chosenType !== 'product') return;
    
    try {
      setProductsLoading(true);
      const filters: ProductFilters = {
        search: materialSearchTerm || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        page: productsPage,
        limit: itemsPerPage,
      };
      const { products: data, total } = await ProductService.getProducts(filters);
      setProducts(data);
      setProductsTotal(total);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  // Load data when filters change
  useEffect(() => {
    if (isOpen && chosenType === 'material') {
      loadMaterials();
    } else if (isOpen && chosenType === 'product') {
      loadProducts();
    }
  }, [isOpen, chosenType, materialSearchTerm, selectedCategory, materialsPage, productsPage, itemsPerPage]);

  // Get unique values for filters (from all loaded data)
  const getUniqueCategories = () => {
    if (chosenType === 'material') {
      return [...new Set(rawMaterials.map(m => m.category).filter(Boolean))];
    }
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  };

  const getUniqueSuppliers = () => {
    return [...new Set(rawMaterials.map(m => m.supplier_name).filter(Boolean))];
  };

  const getUniqueProductColors = () => {
    return [...new Set(products.map(p => p.color).filter((c): c is string => Boolean(c)))];
  };

  const getUniqueProductLengths = () => {
    return [...new Set(products.map(p => `${p.length} ${p.length_unit || ''}`).filter(Boolean))];
  };

  const getUniqueProductWidths = () => {
    return [...new Set(products.map(p => `${p.width} ${p.width_unit || ''}`).filter(Boolean))];
  };

  const getUniqueProductWeights = () => {
    return [...new Set(products.map(p => `${p.weight} ${p.weight_unit || ''}`).filter(Boolean))];
  };

  // Calculate pagination
  const currentTotal = chosenType === 'product' ? productsTotal : materialsTotal;
  const currentPage = chosenType === 'product' ? productsPage : materialsPage;
  const totalPages = Math.ceil(currentTotal / itemsPerPage);

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
    let autoCalculatedQuantity = '';

    // Only auto-calculate for PRODUCTS (not raw materials)
    if (type === 'product' && targetProduct) {
      const product = material as Product;
      // Check if both source product (material) and target product have required fields
      if (!product.length || !product.width || !product.length_unit || !product.width_unit) {
        alert(`The selected product "${product.name}" is missing length, width, or their units. Please update the product details first.`);
        return;
      }

      if (!targetProduct.length || !targetProduct.width || !targetProduct.length_unit || !targetProduct.width_unit) {
        alert(`Please fill in Length, Width, and their units for the target product first, then select the product as recipe ingredient.`);
        return;
      }

      // Both products have required fields - calculate the ratio
      const ratio = calculateProductRatio(product, targetProduct);
      if (ratio > 0 && !isNaN(ratio) && isFinite(ratio)) {
        autoCalculatedQuantity = ratio.toFixed(4);
        setCalculatedQuantity(autoCalculatedQuantity);
      } else {
        alert(`Could not calculate the ratio. Please check that both products have valid length and width values.`);
        return;
      }
    } else {
      setCalculatedQuantity('');
    }

    const materialId = (material as Product)._id || (material as RawMaterial)._id || (material as Product).id || (material as RawMaterial).id;
    const materialName = material.name;
    const unit = type === 'product' ? (material as Product).unit : (material as RawMaterial).unit;
    const cost = type === 'material' ? (material as RawMaterial).cost_per_unit?.toString() || '' : '';

    setSelectedMaterialId(materialId);
    
    // For raw materials, call onSelect immediately (no calculation needed)
    // For products, wait for user to confirm after seeing the calculation
    if (type === 'material') {
      const selected = {
        materialId,
        materialName,
        quantity: '',
        unit: unit || '',
        cost,
      };
      onSelect(selected);
    }
  };

  const handleClose = () => {
    // Reset all state
    setSelectionStep('type');
    setChosenType(null);
    setMaterialSearchTerm('');
    setSelectedCategory('all');
    setSelectedSupplier('all');
    setSelectedColor('all');
    setSelectedLength('all');
    setSelectedWidth('all');
    setSelectedWeight('all');
    setSelectedMaterialId('');
    setCalculatedQuantity('');
    setMaterialsPage(1);
    setProductsPage(1);
    setRawMaterials([]);
    setProducts([]);
    onClose();
  };

  const selectedMaterial = chosenType === 'product'
    ? products.find(p => (p._id || p.id) === selectedMaterialId)
    : rawMaterials.find(m => (m._id || m.id) === selectedMaterialId);

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
                      Available: {products.length} products
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
                      Available: {rawMaterials.length} materials
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
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectionStep('type');
                    setChosenType(null);
                    setMaterialSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedSupplier('all');
                    setSelectedColor('all');
                    setSelectedLength('all');
                    setSelectedWidth('all');
                    setSelectedWeight('all');
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUniqueCategories()
                          .filter((category) => category && category.trim() !== '')
                          .map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Supplier</Label>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Suppliers</SelectItem>
                        {getUniqueSuppliers()
                          .filter((supplier) => supplier && supplier.trim() !== '')
                          .map((supplier) => (
                            <SelectItem key={supplier} value={supplier}>
                              {supplier}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {chosenType === 'product' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Color</Label>
                    <Select value={selectedColor} onValueChange={setSelectedColor}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Colors</SelectItem>
                        {getUniqueProductColors()
                          .filter((color) => color && color.trim() !== '')
                          .map((color) => (
                            <SelectItem key={color} value={color}>
                              {color}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Length</Label>
                    <Select value={selectedLength} onValueChange={setSelectedLength}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Lengths</SelectItem>
                        {getUniqueProductLengths()
                          .filter((length) => length && length.trim() !== '')
                          .map((length) => (
                            <SelectItem key={length} value={length}>
                              {length}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Width</Label>
                    <Select value={selectedWidth} onValueChange={setSelectedWidth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Widths</SelectItem>
                        {getUniqueProductWidths()
                          .filter((width) => width && width.trim() !== '')
                          .map((width) => (
                            <SelectItem key={width} value={width}>
                              {width}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Weight</Label>
                    <Select value={selectedWeight} onValueChange={setSelectedWeight}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Weights</SelectItem>
                        {getUniqueProductWeights()
                          .filter((weight) => weight && weight.trim() !== '')
                          .map((weight) => (
                            <SelectItem key={weight} value={weight}>
                              {weight}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Selected Material Display */}
              {selectedMaterial && (
                <div className="p-4 bg-primary-50 border-2 border-primary-300 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-primary-600" />
                        <span className="font-semibold text-primary-900">
                          Selected: {selectedMaterial.name}
                        </span>
                      </div>
                      <div className="text-sm text-primary-700">
                        {chosenType === 'material' ? 'Raw Material' : 'Product'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMaterialId('')}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* SQM Calculation Display for Products */}
                  {chosenType === 'product' && selectedMaterial && 'length' in selectedMaterial && (
                    <div className="mt-3 space-y-2">
                      {selectedMaterial.length && selectedMaterial.width && (
                        <div className="p-2 bg-white rounded border border-primary-200">
                          <p className="text-xs font-medium text-primary-800 mb-1">Selected Product Area:</p>
                          <p className="text-sm font-semibold text-primary-900">
                            {formatSQMWithSquareFeet(
                              calculateSQM(
                                selectedMaterial.length,
                                selectedMaterial.width,
                                selectedMaterial.length_unit || 'feet',
                                selectedMaterial.width_unit || 'feet'
                              )
                            )}
                          </p>
                        </div>
                      )}
                      {targetProduct && targetProduct.length && targetProduct.width && (
                        <div className="p-2 bg-white rounded border border-primary-200">
                          <p className="text-xs font-medium text-primary-800 mb-1">Target Product Area:</p>
                          <p className="text-sm font-semibold text-primary-900">
                            {formatSQMWithSquareFeet(
                              calculateSQM(
                                targetProduct.length,
                                targetProduct.width,
                                targetProduct.length_unit,
                                targetProduct.width_unit
                              )
                            )}
                          </p>
                        </div>
                      )}
                      {calculatedQuantity && (
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-800 mb-1">
                            Auto-calculated Quantity (for 1 SQM of target product):
                          </p>
                          <p className="text-sm font-bold text-blue-900">
                            {calculatedQuantity} {selectedMaterial.unit || 'units'}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            This is the quantity needed per 1 SQM of the target product
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          const materialId = selectedMaterial._id || selectedMaterial.id;
                          const materialName = selectedMaterial.name;
                          const unit = (selectedMaterial as Product).unit || '';
                          const cost = '';
                          onSelect({
                            materialId,
                            materialName,
                            quantity: calculatedQuantity || '',
                            unit,
                            cost,
                          });
                          handleClose();
                        }}
                        className="w-full mt-2"
                        disabled={!calculatedQuantity}
                      >
                        Confirm Selection
                      </Button>
                    </div>
                  )}
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
                    {chosenType === 'product' && products.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => {
                          const isSelected = selectedMaterialId === (product._id || product.id);
                          return (
                            <ProductCard
                              key={product._id || product.id}
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
                          const isSelected = selectedMaterialId === (material._id || material.id);
                          return (
                            <MaterialCard
                              key={material._id || material.id}
                              material={material}
                              isSelected={isSelected}
                              onClick={() => handleMaterialSelection(material, 'material')}
                            />
                          );
                        })}
                      </div>
                    )}

                    {((chosenType === 'product' && products.length === 0) ||
                      (chosenType === 'material' && rawMaterials.length === 0)) && (
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
          <Button variant="outline" onClick={handleClose} className="border-gray-300">
            {selectedMaterialId ? 'Done' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

