import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, Package, Search, Plus, Calendar, AlertTriangle,
  Factory, Clock, CheckCircle, Filter, X, ChevronDown, ChevronUp
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import ProductService from "@/services/api/productService";
import { ProductionService } from "@/services/api/productionService";
import { DropdownService } from "@/services/api/dropdownService";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ProductMaterial {
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  materialsUsed: ProductMaterial[];
  finalDimensions: string;
  finalWeight: string;
  finalPileHeight: string;
  qualityGrade: string;
  inspector: string;
  notes: string;
  status: "available" | "sold" | "damaged";
}

interface Product {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  subcategory?: string;
  color: string;
  size: string;
  length?: string;
  width?: string;
  pattern: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  materialsUsed: ProductMaterial[];
  totalCost: number;
  sellingPrice: number;
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired";
  location: string;
  createdAt: string;
  updatedAt: string;
  individualStocks?: IndividualProduct[];
  individualStockTracking?: boolean;
}

interface ProductionProduct {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  size: string;
  pattern: string;
  targetQuantity: number;
  priority: "normal" | "high" | "urgent";
  status: "planning";
  currentStep: 1;
  totalSteps: 3;
  steps: any[];
  expectedCompletion: string;
  createdAt: string;
  materialsRequired: any[];
  notes: string;
}

export default function NewBatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetQuantity, setTargetQuantity] = useState<string>("1");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [allProductsForFilters, setAllProductsForFilters] = useState<Product[]>([]); // For filter options
  const [priorityOptions, setPriorityOptions] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [selectedPattern, setSelectedPattern] = useState<string>("all");
  const [selectedLength, setSelectedLength] = useState<string>("all");
  const [selectedWidth, setSelectedWidth] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(true);

  // Load priority options (MongoDB dropdowns)
  const loadPriorityOptions = async () => {
    try {
      const prodDropdowns = await DropdownService.getProductionDropdownData();
      const options = prodDropdowns?.priorities?.filter((o: any) => o.is_active !== false).map((o: any) => o.value) || [];
      // Map backend enum to UI values: medium -> normal; low is optional
      const mapped = options.map((v: string) => (v === 'medium' ? 'normal' : v));
      const unique = Array.from(new Set(mapped));
      // Maintain UI order preference
      const order = ['normal', 'high', 'urgent', 'low'];
      const sorted = unique.sort((a, b) => order.indexOf(a) - order.indexOf(b)).filter(v => ['normal','high','urgent'].includes(v));
      if (sorted.length) {
        setPriorityOptions(sorted);
        // Ensure current priority is valid
        if (!sorted.includes(priority)) setPriority('normal');
        return;
      }
    } catch (e) {
      // ignore and fallback
    }
    // Fallback hardcoded
    setPriorityOptions(['normal', 'high', 'urgent']);
  };

  // Load all products for filter options (without pagination)
  const loadAllProductsForFilters = async () => {
    try {
      const response = await ProductService.getProducts({ 
        limit: 10000, 
        offset: 0,
        individual_stock_tracking: true 
      });
      const apiProducts = response.data || [];
      const normalized: Product[] = apiProducts.map((p: any) => ({
        id: p.id,
        qrCode: p.qr_code || '',
        name: p.name || '',
        category: p.category || '',
        subcategory: p.subcategory || '',
        color: p.color || '',
        size: p.size || '',
        length: p.length || p.dimensions?.length || '',
        width: p.width || p.dimensions?.width || '',
        pattern: p.pattern || '',
        quantity: (p.current_stock ?? p.base_quantity ?? 0),
        unit: p.unit || 'pcs',
        expiryDate: p.expiry_date || undefined,
        materialsUsed: [],
        totalCost: p.total_cost || 0,
        sellingPrice: p.selling_price || 0,
        status: p.status || 'in-stock',
        location: p.location || '',
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
        individualStocks: [],
        individualStockTracking: p.individual_stock_tracking !== false,
      }));
      setAllProductsForFilters(normalized);
    } catch (error) {
      console.error('Error loading all products for filters:', error);
      setAllProductsForFilters([]);
    }
  };

  // Load paginated products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Build filters for API call
        const filters: any = {
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
          individual_stock_tracking: true
        };
        
        if (searchTerm) filters.search = searchTerm;
        if (selectedCategory !== 'all') filters.category = selectedCategory;
        
        const response = await ProductService.getProducts(filters);
        const apiProducts = response.data || [];
        const normalized: Product[] = apiProducts.map((p: any) => ({
          id: p.id,
          qrCode: p.qr_code || '',
          name: p.name || '',
          category: p.category || '',
          subcategory: p.subcategory || '',
          color: p.color || '',
          size: p.size || '',
          length: p.length || p.dimensions?.length || '',
          width: p.width || p.dimensions?.width || '',
          pattern: p.pattern || '',
          quantity: (p.current_stock ?? p.base_quantity ?? 0),
          unit: p.unit || 'pcs',
          expiryDate: p.expiry_date || undefined,
          materialsUsed: [],
          totalCost: p.total_cost || 0,
          sellingPrice: p.selling_price || 0,
          status: p.status || 'in-stock',
          location: p.location || '',
          createdAt: p.created_at || new Date().toISOString(),
          updatedAt: p.updated_at || new Date().toISOString(),
          individualStocks: [],
          individualStockTracking: p.individual_stock_tracking !== false,
        }));
        setProducts(normalized);
        setTotalProducts(response.count || normalized.length);
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
        setTotalProducts(0);
      }
    };
    
    loadProducts();
  }, [currentPage, itemsPerPage, searchTerm, selectedCategory]);

  // Load all products for filters on initial load
  useEffect(() => {
    loadAllProductsForFilters();
    loadPriorityOptions();

    // Check if a product was pre-selected from the inventory page
    if (location.state?.selectedProduct) {
      setSelectedProduct(location.state.selectedProduct);
    }
  }, [location.state]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, selectedCategory]);

  // Get unique values for filters (use allProductsForFilters, not just current page)
  const getUniqueCategories = () => {
    const categories = new Set<string>();
    allProductsForFilters.forEach(p => {
      if (p.category && p.category !== "Raw Material" && p.individualStockTracking !== false) {
        categories.add(p.category);
      }
    });
    return Array.from(categories).sort();
  };

  const getUniqueColors = () => {
    const colors = new Set<string>();
    allProductsForFilters.forEach(p => {
      if (p.color && p.category !== "Raw Material" && p.individualStockTracking !== false) {
        colors.add(p.color);
      }
    });
    return Array.from(colors).sort();
  };

  const getUniquePatterns = () => {
    const patterns = new Set<string>();
    allProductsForFilters.forEach(p => {
      if (p.pattern && p.category !== "Raw Material" && p.individualStockTracking !== false) {
        patterns.add(p.pattern);
      }
    });
    return Array.from(patterns).sort();
  };

  const getUniqueLengths = () => {
    const lengths = new Set<string>();
    allProductsForFilters.forEach(p => {
      if (p.length && p.category !== "Raw Material" && p.individualStockTracking !== false) {
        lengths.add(p.length);
      }
    });
    return Array.from(lengths).sort();
  };

  const getUniqueWidths = () => {
    const widths = new Set<string>();
    allProductsForFilters.forEach(p => {
      if (p.width && p.category !== "Raw Material" && p.individualStockTracking !== false) {
        widths.add(p.width);
      }
    });
    return Array.from(widths).sort();
  };

  const getUniqueSubcategories = () => {
    const subcategories = new Set<string>();
    allProductsForFilters.forEach(p => {
      if (p.subcategory && p.category !== "Raw Material" && p.individualStockTracking !== false) {
        subcategories.add(p.subcategory);
      }
    });
    return Array.from(subcategories).sort();
  };


  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedSubcategory("all");
    setSelectedColor("all");
    setSelectedPattern("all");
    setSelectedLength("all");
    setSelectedWidth("all");
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCategory !== "all") count++;
    if (selectedSubcategory !== "all") count++;
    if (selectedColor !== "all") count++;
    if (selectedPattern !== "all") count++;
    if (selectedLength !== "all") count++;
    if (selectedWidth !== "all") count++;
    return count;
  };

  const filteredProducts = products.filter(product => {
    // Only show products that are meant for production:
    // 1. Not raw materials (category should not be "Raw Material")
    // 2. Should have individual stock tracking (products that need to be produced)
    const isProductionProduct = product.category !== "Raw Material" && 
                               product.individualStockTracking !== false;
    
    if (!isProductionProduct) return false;

    // Filter by search term
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.subcategory && product.subcategory.toLowerCase().includes(searchTerm.toLowerCase())) ||
      product.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.pattern.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by category
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    
    // Filter by subcategory
    const matchesSubcategory = selectedSubcategory === "all" || (product.subcategory && product.subcategory === selectedSubcategory);
    
    // Filter by color
    const matchesColor = selectedColor === "all" || product.color === selectedColor;
    
    // Filter by pattern
    const matchesPattern = selectedPattern === "all" || product.pattern === selectedPattern;
    
    // Filter by length (exact match or starts with)
    const matchesLength = selectedLength === "all" || 
      product.length === selectedLength || 
      (product.length && product.length.startsWith(selectedLength.split(' ')[0]));
    
    // Filter by width (exact match or starts with)
    const matchesWidth = selectedWidth === "all" || 
      product.width === selectedWidth || 
      (product.width && product.width.startsWith(selectedWidth.split(' ')[0]));
    
    return matchesSearch && matchesCategory && matchesSubcategory && matchesColor && matchesPattern && 
           matchesLength && matchesWidth;
  });

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setTargetQuantity("1");
  };

  const handleCreateProduction = async () => {
    if (!selectedProduct) return;

    // Validate quantity - convert string to number and check it's greater than 0
    const quantityNum = Number(targetQuantity);
    if (!targetQuantity || targetQuantity.trim() === '' || isNaN(quantityNum) || quantityNum <= 0) {
      alert('Please enter a valid quantity greater than 0');
      return;
    }

    // Generate unique production batch ID to avoid reusing completed flows
    const productionBatchId = `PRO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const productionProduct: ProductionProduct = {
      id: productionBatchId, // Use unique batch ID instead of product ID
      productId: selectedProduct.id, // Keep reference to original product
      productName: selectedProduct.name,
      category: selectedProduct.category,
      color: selectedProduct.color,
      size: selectedProduct.size,
      pattern: selectedProduct.pattern,
      targetQuantity: quantityNum,
      priority,
      status: "planning",
      currentStep: 1,
      totalSteps: 3,
      steps: [
        { id: 1, name: "Material Preparation", status: "pending" },
        { id: 2, name: "Production Process", status: "pending" },
        { id: 3, name: "Quality Inspection", status: "pending" }
      ],
      expectedCompletion,
      createdAt: new Date().toISOString(),
      materialsRequired: [],
      notes
    };

    // Create production batch in MongoDB
    const mappedPriority = priority === 'normal' ? 'medium' : priority; // map to backend enum
    const { data: createdBatch, error } = await ProductionService.createProductionBatch({
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      batch_size: quantityNum,
      unit: selectedProduct.unit || 'pieces',
      status: 'planned',
      priority: mappedPriority as any,
      planned_end_date: expectedCompletion ? new Date(expectedCompletion).toISOString() : undefined,
      notes
    });
    if (error) {
      console.error('Error creating production batch:', error);
      alert('Failed to create production batch. Please try again.');
      return;
    }

    // Save complete product data with individual stock details for auto-filling
    const completeProductData = {
      ...selectedProduct,
      productionId: productionProduct.id,
      addedToProductionAt: new Date().toISOString()
    };
    
    // Get the batch ID from created batch (use the ID returned from the API)
    const batchId = createdBatch?.id || productionBatchId;
    console.log('✅ Created production batch with ID:', batchId, 'batch_size:', quantityNum);

    // Navigate directly to production detail page for planning
    // Pass the actual product ID, batch ID, and target quantity
    navigate(`/production-detail/${selectedProduct.id}`, {
      state: { 
        targetQuantity: quantityNum,
        batchId: batchId // Pass batch ID so ProductionDetail can find the correct batch
      }
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Add Product to Production" 
        subtitle="Select products from inventory and add them to production queue"
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/production')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production
        </Button>
      </div>

      {/* Pre-selected product notification */}
      {location.state?.selectedProduct && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">Product Pre-selected</h4>
              <p className="text-sm text-blue-700">
                {location.state.selectedProduct.name} has been selected from the inventory. 
                You can modify the production details below or select a different product.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Select Product
                  {getActiveFiltersCount() > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {filteredProducts.length} of {totalProducts}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, category, color, or pattern..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">Advanced Filters</h4>
                  {getActiveFiltersCount() > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-xs h-7"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Clear All ({getActiveFiltersCount()})
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Category Filter */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-1">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {getUniqueCategories().map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategory Filter */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-1">Subcategory</Label>
                    <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Subcategories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {getUniqueSubcategories().map(subcategory => (
                          <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Color Filter */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-1">Color</Label>
                    <Select value={selectedColor} onValueChange={setSelectedColor}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Colors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Colors</SelectItem>
                        {getUniqueColors().map(color => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pattern Filter */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-1">Pattern</Label>
                    <Select value={selectedPattern} onValueChange={setSelectedPattern}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Patterns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Patterns</SelectItem>
                        {getUniquePatterns().map(pattern => (
                          <SelectItem key={pattern} value={pattern}>{pattern}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Length Filter */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-1">Length</Label>
                    <Select value={selectedLength} onValueChange={setSelectedLength}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Lengths" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Lengths</SelectItem>
                        {getUniqueLengths().map(length => (
                          <SelectItem key={length} value={length}>{length}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Width Filter */}
                  <div>
                    <Label className="text-xs text-gray-600 mb-1">Width</Label>
                    <Select value={selectedWidth} onValueChange={setSelectedWidth}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="All Widths" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Widths</SelectItem>
                        {getUniqueWidths().map(width => (
                          <SelectItem key={width} value={width}>{width}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </div>
              </div>
            )}

            {/* Products List */}
            <div className="space-y-2">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No products found</p>
                  {getActiveFiltersCount() > 0 && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearAllFilters}
                      className="mt-2"
                    >
                      Clear filters to see all products
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                            {selectedProduct?.id === product.id && (
                              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            {product.color && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">{product.color}</Badge>
                            )}
                            {product.pattern && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">{product.pattern}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                            <div>
                              <span className="font-medium">Length:</span> {product.length || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Width:</span> {product.width || 'N/A'}
                            </div>
                            <div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <Badge 
                            variant={product.quantity > 0 ? "default" : "destructive"}
                            className="text-xs font-medium"
                          >
                            {product.quantity} Products
                          </Badge>
                          {product.status && (
                            <Badge 
                              variant={
                                product.status === 'in-stock' ? 'default' :
                                product.status === 'low-stock' ? 'secondary' : 'destructive'
                              }
                              className="text-xs"
                            >
                              {product.status === 'in-stock' ? 'In Stock' :
                               product.status === 'low-stock' ? 'Low Stock' : 'Out of Stock'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pagination */}
                  {totalProducts > itemsPerPage && (
                    <div className="mt-4 pt-4 flex items-center justify-between border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalProducts)} of {totalProducts} products
                      </div>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage > 1) {
                                  setCurrentPage(currentPage - 1);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.ceil(totalProducts / itemsPerPage) }, (_, i) => i + 1)
                            .filter(page => {
                              // Show first page, last page, current page, and pages around current
                              const totalPages = Math.ceil(totalProducts / itemsPerPage);
                              if (totalPages <= 7) return true;
                              if (page === 1 || page === totalPages) return true;
                              if (Math.abs(page - currentPage) <= 1) return true;
                              return false;
                            })
                            .map((page, index, array) => {
                              // Add ellipsis if there's a gap
                              const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                              return (
                                <React.Fragment key={page}>
                                  {showEllipsisBefore && (
                                    <PaginationItem>
                                      <PaginationEllipsis />
                                    </PaginationItem>
                                  )}
                                  <PaginationItem>
                                    <PaginationLink
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentPage(page);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      isActive={currentPage === page}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                </React.Fragment>
                              );
                            })}
                          <PaginationItem>
                            <PaginationNext 
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                if (currentPage < Math.ceil(totalProducts / itemsPerPage)) {
                                  setCurrentPage(currentPage + 1);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className={currentPage >= Math.ceil(totalProducts / itemsPerPage) ? 'pointer-events-none opacity-50' : ''}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Production Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5" />
              Production Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedProduct ? (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Selected Product</h4>
                    {location.state?.selectedProduct && (
                      <Badge variant="secondary" className="text-xs">
                        From Inventory
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Name:</span> {selectedProduct.name}</div>
                    <div><span className="text-gray-500">Category:</span> {selectedProduct.category}</div>
                    <div><span className="text-gray-500">Color:</span> {selectedProduct.color}</div>
                    <div><span className="text-gray-500">Length:</span> {selectedProduct.length || 'N/A'}</div>
                    <div><span className="text-gray-500">Width:</span> {selectedProduct.width || 'N/A'}</div>
                    <div><span className="text-gray-500">Current Stock:</span> {selectedProduct.quantity} Products</div>
                    <div><span className="text-gray-500">Location:</span> {selectedProduct.location}</div>
              </div>
              </div>

              
                <div className="space-y-4">
              <div>
                    <Label htmlFor="quantity">Target Quantity</Label>
                <Input
                      id="quantity"
                  type="text"
                      value={targetQuantity}
                      onChange={(e) => {
                        // Allow only numbers, allow empty string for clearing
                        const value = e.target.value;
                        // Allow empty string or valid positive integers
                        if (value === '' || /^\d+$/.test(value)) {
                          setTargetQuantity(value);
                        }
                      }}
                      onBlur={() => {
                        // When user leaves the field, ensure it's not empty or 0
                        const numValue = Number(targetQuantity);
                        if (!targetQuantity || targetQuantity.trim() === '' || isNaN(numValue) || numValue <= 0) {
                          setTargetQuantity("1");
                        } else {
                          // Remove leading zeros (e.g., "01" becomes "1")
                          setTargetQuantity(String(numValue));
                        }
                      }}
                      placeholder="1"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                    <Label htmlFor="completion">Expected Completion</Label>
                <Input
                      id="completion"
                  type="date"
                      value={expectedCompletion}
                      onChange={(e) => setExpectedCompletion(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
              />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                      placeholder="Additional production notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                  <Button 
                    onClick={handleCreateProduction}
                    className="w-full bg-production hover:bg-production/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Production
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a product to configure production</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
