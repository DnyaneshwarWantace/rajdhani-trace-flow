import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductService } from "@/services/ProductService";
import { ProductRecipeService } from "@/services/productRecipeService";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Package, QrCode, Calendar, 
  Edit, Hash, Image, Star, Truck,
  CheckCircle, Clock, MapPin, Scale, Ruler, Layers,
  Eye, Download, Share2, Heart
} from "lucide-react";

interface ProductMaterial {
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
  recipeQuantity?: number; // Optional recipe quantity for reference
}

interface Product {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  color: string;
  pattern: string;
  quantity: number;
  unit: string;
  manufacturingDate: string;
  expiryDate?: string;
  materialsUsed: ProductMaterial[];
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired";
  notes: string;
  imageUrl?: string;
  weight: string;
  thickness: string;
  width: string;
  height: string;
  individualStockTracking?: boolean;
}

interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  manufacturingDate: string;
  materialsUsed: ProductMaterial[];
  finalWeight: string;
  finalThickness: string;
  finalWidth: string;
  finalHeight: string;
  qualityGrade: string;
  inspector: string;
  notes: string;
  status: "available" | "sold" | "damaged";
}

const statusStyles = {
  "in-stock": "bg-green-100 text-green-800 border-green-200",
  "low-stock": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "out-of-stock": "bg-red-100 text-red-800 border-red-200",
  "expired": "bg-red-100 text-red-800 border-red-200"
};

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [recipeMaterials, setRecipeMaterials] = useState<ProductMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProductData = async () => {
      try {
        setLoading(true);
    console.log('ProductDetail - Looking for productId:', productId);
    
        // Load product from Supabase
        const { data: productData, error: productError } = await ProductService.getProductById(productId);
        if (productError) {
          console.error('Error loading product:', productError);
          return;
        }
        
        console.log('ProductDetail - Found product:', productData);
        
        if (productData) {
          setProduct(productData);
          setSelectedImage(productData.imageUrl || "");
        }

        // Load individual products for this product from Supabase
        const { data: individualProductsData, error: individualError } = await ProductService.getIndividualProducts({
          product_id: productId
        });
        
        if (individualError) {
          console.error('Error loading individual products:', individualError);
          return;
        }
        
        console.log('ProductDetail - Individual products:', individualProductsData);
        setIndividualProducts(individualProductsData || []);
        
        // Load recipe materials for this product
        if (productData) {
          try {
            const recipeResult = await ProductRecipeService.getRecipeByProductId(productData.id);
            if (recipeResult.data && recipeResult.data.recipe_materials && recipeResult.data.recipe_materials.length > 0) {
              // Fetch actual stock quantities for each material
              const materialsWithStock = await Promise.all(
                recipeResult.data.recipe_materials.map(async (material: any) => {
                  try {
                    // Fetch the actual material from raw_materials table to get current stock
                    const { data: rawMaterial } = await supabase
                      .from('raw_materials')
                      .select('current_stock, cost_per_unit')
                      .eq('id', material.material_id)
                      .single();
                    
        return {
                      materialName: material.material_name,
                      quantity: rawMaterial?.current_stock || 0, // Show actual stock quantity
          unit: material.unit,
                      cost: rawMaterial?.cost_per_unit || material.cost_per_unit || 0,
                      recipeQuantity: material.quantity // Keep recipe quantity for reference
        };
                  } catch (error) {
                    console.error(`Error fetching stock for material ${material.material_name}:`, error);
        return {
                      materialName: material.material_name,
                      quantity: 0, // Default to 0 if can't fetch
          unit: material.unit,
                      cost: material.cost_per_unit || 0,
                      recipeQuantity: material.quantity
                    };
                  }
                })
              );
              
              setRecipeMaterials(materialsWithStock);
              console.log('ProductDetail - Loaded recipe materials with stock:', materialsWithStock);
            } else {
              setRecipeMaterials([]);
              console.log('ProductDetail - No recipe found for product');
            }
          } catch (recipeError) {
            console.error('Error loading recipe:', recipeError);
            setRecipeMaterials([]);
          }
        }
      } catch (error) {
        console.error('Error in loadProductData:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId]);

  const getAvailablePieces = (productId: string) => {
    // Use the same simple logic as Products page - just return product.quantity
    return product?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <Header title="Product Details" />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/products')} className="shadow-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-muted-foreground mt-1">Product Information & Specifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Product Image & Basic Info */}
          <div className="xl:col-span-1 space-y-6">
            {/* Product Image */}
            <Card className="overflow-hidden shadow-lg">
              <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200">
            {selectedImage ? (
              <img 
                src={selectedImage} 
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Image className="w-16 h-16 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">No image available</p>
          </div>
                          </div>
                        )}
                      </div>
            </Card>

            {/* Quick Info Card */}
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Quick Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Status</span>
                  <Badge className={`${statusStyles[product.status]} border`}>
                    {product.status.replace("-", " ").toUpperCase()}
              </Badge>
            </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Category</span>
                  <span className="font-medium">{product.category}</span>
          </div>
              <div className="flex items-center justify-between">
                  <span className="text-slate-600">Available</span>
                  <span className="font-medium">{getAvailablePieces(product.id)} {product.unit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Color</span>
                  <span className="font-medium">{product.color}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Pattern</span>
                  <span className="font-medium">{product.pattern}</span>
              </div>
            </CardContent>
          </Card>

            {/* Stock Management */}
            {product.individualStockTracking !== false && (
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Stock Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
            <Button 
                    className="w-full" 
              size="lg"
              onClick={() => navigate(`/product-stock/${product.id}`)}
            >
                    <Eye className="w-5 h-5 mr-2" />
                    View Individual Stock ({getAvailablePieces(product.id)} {product.unit})
            </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Detailed Information */}
          <div className="xl:col-span-2 space-y-6">
            {/* Product Title & Description */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-slate-900 mb-2">{product.name}</CardTitle>
                    <p className="text-slate-600 text-lg">{product.pattern}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">Price on Request</p>
                    <p className="text-slate-500 text-sm">Contact for pricing</p>
                  </div>
                </div>
              </CardHeader>
              {product.notes && (
                <CardContent className="pt-0">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-2">Description</h4>
                    <p className="text-slate-600">{product.notes}</p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Detailed Information Tabs */}
            <Tabs defaultValue="specifications" className="w-full">
              <TabsList className="grid w-full grid-cols-3 shadow-sm">
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="materials">Materials</TabsTrigger>
              <TabsTrigger value="tracking">Tracking</TabsTrigger>
            </TabsList>

              <TabsContent value="specifications" className="space-y-6">
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ruler className="w-5 h-5" />
                      Technical Specifications
                    </CardTitle>
                </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {product.weight && product.weight !== "NA" && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Scale className="w-6 h-6 text-slate-600" />
                      <div>
                            <p className="font-medium text-slate-900">Weight</p>
                            <p className="text-slate-600">{product.weight}</p>
                      </div>
                    </div>
                    )}
                      {product.width && product.width !== "NA" && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Ruler className="w-6 h-6 text-slate-600" />
                      <div>
                            <p className="font-medium text-slate-900">Width</p>
                            <p className="text-slate-600">{product.width}</p>
                      </div>
                    </div>
                    )}
                      {product.height && product.height !== "NA" && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Ruler className="w-6 h-6 text-slate-600" />
                    <div>
                            <p className="font-medium text-slate-900">Height</p>
                            <p className="text-slate-600">{product.height}</p>
                    </div>
                      </div>
                      )}
                      {product.thickness && product.thickness !== "NA" && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Layers className="w-6 h-6 text-slate-600" />
                      <div>
                            <p className="font-medium text-slate-900">Thickness</p>
                            <p className="text-slate-600">{product.thickness}</p>
                      </div>
                      </div>
                      )}
                      {product.unit && product.unit !== "NA" && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Package className="w-6 h-6 text-slate-600" />
                      <div>
                            <p className="font-medium text-slate-900">Unit</p>
                            <p className="text-slate-600">{product.unit}</p>
                      </div>
                      </div>
                      )}
                      {product.manufacturingDate && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Calendar className="w-6 h-6 text-slate-600" />
                      <div>
                            <p className="font-medium text-slate-900">Manufacturing Date</p>
                            <p className="text-slate-600">{new Date(product.manufacturingDate).toLocaleDateString()}</p>
                      </div>
                      </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

              <TabsContent value="materials" className="space-y-6">
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Material Stock Status
                    </CardTitle>
                    <p className="text-slate-600 text-sm">Current stock levels of materials used in this product</p>
                </CardHeader>
                <CardContent>
                    {recipeMaterials && recipeMaterials.length > 0 ? (
                      <div className="space-y-4">
                        {recipeMaterials.map((material, index) => (
                          <div key={index} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border">
                        <div>
                              <p className="font-medium text-slate-900">{material.materialName}</p>
                              <p className="text-slate-600 text-sm">
                            Current Stock: <span className="font-medium">{material.quantity} {material.unit}</span>
                          </p>
                              {material.recipeQuantity && (
                                <p className="text-slate-500 text-xs">
                                  Recipe requires: {material.recipeQuantity} {material.unit}
                                </p>
                              )}
                        </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-900">₹{material.cost.toLocaleString()}</p>
                              <p className="text-slate-600 text-sm">per unit</p>
                        </div>
                      </div>
                    ))}
                        <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="font-semibold text-slate-900">Total Stock Value</p>
                          <p className="font-bold text-lg text-primary">
                            ₹{recipeMaterials.reduce((sum, m) => sum + (m.quantity * m.cost), 0).toLocaleString()}
                          </p>
                    </div>
                  </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-500">No recipe defined for this product</p>
                        <p className="text-slate-500 text-sm mt-2">Recipe can be added when creating or editing the product</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

              <TabsContent value="tracking" className="space-y-6">
                <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="w-5 h-5" />
                      QR Code & Tracking
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                      {/* QR Code */}
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 text-center">
                        <div className="flex items-center justify-center gap-2 mb-6">
                          <QrCode className="w-6 h-6 text-primary" />
                          <h4 className="font-semibold text-slate-900">Product QR Code</h4>
                        </div>
                        
                        <div className="flex justify-center mb-6">
                          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-slate-200">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(product.qrCode)}`}
                              alt={`QR Code for ${product.name}`}
                              className="w-48 h-48"
                            />
                          </div>
                      </div>
                        
                        <div className="font-mono text-sm bg-white p-4 rounded-lg border max-w-md mx-auto shadow-sm">
                        {product.qrCode}
                      </div>
                        
                        <p className="text-slate-600 mt-4">
                          Scan this QR code to access detailed product information
                      </p>
                    </div>

                      {/* Quality Assurance */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                      <div>
                            <p className="font-semibold text-green-900">Quality Assured</p>
                            <p className="text-green-700 text-sm">All pieces individually inspected</p>
                      </div>
                    </div>
                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <Truck className="w-8 h-8 text-blue-600" />
                      <div>
                            <p className="font-semibold text-blue-900">Fully Traceable</p>
                            <p className="text-blue-700 text-sm">Complete manufacturing history</p>
                          </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
