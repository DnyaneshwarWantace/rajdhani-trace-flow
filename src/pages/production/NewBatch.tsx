import { useState, useEffect } from "react";
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
  Factory, Clock, CheckCircle
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import { ProductService } from "@/services/ProductService";

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
  finalThickness: string;
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
  color: string;
  size: string;
  height?: string;
  width?: string;
  thickness?: string;
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
  const [targetQuantity, setTargetQuantity] = useState(1);
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [expectedCompletion, setExpectedCompletion] = useState("");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Load products from Supabase
    const loadProducts = async () => {
      try {
        const response = await ProductService.getProducts();
        const products = response.data || [];
        setProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      }
    };
    loadProducts();

    // Check if a product was pre-selected from the inventory page
    if (location.state?.selectedProduct) {
      setSelectedProduct(location.state.selectedProduct);
    }
  }, [location.state]);

  const filteredProducts = products.filter(product => {
    // Filter by search term
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Only show products that are meant for production:
    // 1. Not raw materials (category should not be "Raw Material")
    // 2. Should have individual stock tracking (products that need to be produced)
    const isProductionProduct = product.category !== "Raw Material" && 
                               product.individualStockTracking !== false;
    
    return matchesSearch && isProductionProduct;
  });

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setTargetQuantity(1);
  };

  const handleCreateProduction = () => {
    if (!selectedProduct) return;

    const productionProduct: ProductionProduct = {
      id: selectedProduct.id, // Use actual product ID instead of generating new one
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      color: selectedProduct.color,
      size: selectedProduct.size,
      pattern: selectedProduct.pattern,
      targetQuantity,
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

    // TODO: Save to production products in Supabase
    console.log('Production product to save:', productionProduct);

    // Save complete product data with individual stock details for auto-filling
    const completeProductData = {
      ...selectedProduct,
      productionId: productionProduct.id,
      addedToProductionAt: new Date().toISOString()
    };
    
    // TODO: Save complete product data to Supabase
    console.log('Complete product data to save:', completeProductData);

    // Navigate directly to production detail page for planning
    navigate(`/production-detail/${productionProduct.id}`);
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
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
              Select Product
              </CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                />
              </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id
                      ? 'border-production bg-production/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
              <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-500">
                        {product.category} • {product.color} • {product.height || 'N/A'} x {product.width || 'N/A'} x {product.thickness || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={product.quantity > 0 ? "default" : "destructive"}>
                        {product.quantity} {product.unit}
                      </Badge>
                    </div>
                  </div>
              </div>
              ))}
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
                    <div><span className="text-gray-500">Height:</span> {selectedProduct.height || 'N/A'}</div>
                    <div><span className="text-gray-500">Width:</span> {selectedProduct.width || 'N/A'}</div>
                    <div><span className="text-gray-500">Thickness:</span> {selectedProduct.thickness || 'N/A'}</div>
                    <div><span className="text-gray-500">Current Stock:</span> {selectedProduct.quantity} {selectedProduct.unit}</div>
                    <div><span className="text-gray-500">Location:</span> {selectedProduct.location}</div>
              </div>
              </div>

              
                <div className="space-y-4">
              <div>
                    <Label htmlFor="quantity">Target Quantity</Label>
                <Input
                      id="quantity"
                  type="number"
                      value={targetQuantity}
                      onChange={(e) => setTargetQuantity(Number(e.target.value))}
                      min="1"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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
