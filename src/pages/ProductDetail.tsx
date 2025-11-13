import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MongoDBProductService, IndividualProductService } from "@/services";
import { MongoDBRecipeService } from "@/services/api/recipeService";
import { RawMaterialService } from "@/services/api/rawMaterialService";
import { mapMongoDBProductToFrontend, mapMongoDBIndividualProductToFrontend, type Product as FrontendProduct, type IndividualProduct as FrontendIndividualProduct } from "@/utils/typeMapping";
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
  recipeQuantity?: number; // Optional recipe quantity for reference
}

// Using imported types from typeMapping
type Product = FrontendProduct;
type IndividualProduct = FrontendIndividualProduct;

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
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SQM Calculation function
  const calculateSQM = (length: string, width: string, lengthUnit: string, widthUnit: string): number => {
    const lengthValue = parseFloat(length) || 0;
    const widthValue = parseFloat(width) || 0;

    let lengthInMeters = lengthValue;
    let widthInMeters = widthValue;

    switch (lengthUnit.toLowerCase()) {
      case 'mm': lengthInMeters = lengthValue / 1000; break;
      case 'cm': lengthInMeters = lengthValue / 100; break;
      case 'feet': lengthInMeters = lengthValue * 0.3048; break;
      case 'inches': lengthInMeters = lengthValue * 0.0254; break;
      case 'yards': lengthInMeters = lengthValue * 0.9144; break;
      case 'm': case 'meter': case 'meters': lengthInMeters = lengthValue; break;
    }

    switch (widthUnit.toLowerCase()) {
      case 'mm': widthInMeters = widthValue / 1000; break;
      case 'cm': widthInMeters = widthValue / 100; break;
      case 'feet': widthInMeters = widthValue * 0.3048; break;
      case 'inches': widthInMeters = widthValue * 0.0254; break;
      case 'yards': widthInMeters = widthValue * 0.9144; break;
      case 'm': case 'meter': case 'meters': widthInMeters = widthValue; break;
    }

    return lengthInMeters * widthInMeters;
  };

  useEffect(() => {
    const loadProductData = async () => {
      try {
        setLoading(true);
    console.log('ProductDetail - Looking for productId:', productId);
    
        // Load product from MongoDB
        const productResult = await MongoDBProductService.getProductById(productId);
        if (productResult.error) {
          console.error('Error loading product:', productResult.error);
          return;
        }
        
        console.log('ProductDetail - Found product:', productResult.data);
        
        if (productResult.data) {
          const mappedProduct = mapMongoDBProductToFrontend(productResult.data);
          setProduct(mappedProduct);
          setSelectedImage(mappedProduct.imageUrl || "");
        }

        // Load individual products for this product from MongoDB
        const individualProductsResult = await IndividualProductService.getIndividualProductsByProductId(productId);
        
        if (individualProductsResult.error) {
          console.error('Error loading individual products:', individualProductsResult.error);
          return;
        }
        
        console.log('ProductDetail - Individual products:', individualProductsResult.data);
        if (individualProductsResult.data) {
          const mappedIndividualProducts = individualProductsResult.data.map(mapMongoDBIndividualProductToFrontend);
          setIndividualProducts(mappedIndividualProducts);
        }
        
        // Load raw materials and products to get actual stock
        const [rawMaterialsResult, productsResult] = await Promise.all([
          RawMaterialService.getRawMaterials(),
          MongoDBProductService.getProducts()
        ]);
        
        const rawMaterialsData = rawMaterialsResult?.data || [];
        const productsData = (productsResult?.data || []).map((p: any) => ({
          ...p,
          individual_count: 0 // Will be computed if needed
        }));
        
        setRawMaterials(rawMaterialsData);
        setProducts(productsData);

        // Load recipe materials for this product
        if (productResult.data) {
          try {
            const recipeResult = await MongoDBRecipeService.getRecipeByProductId(productResult.data.id);
            if (recipeResult.data && recipeResult.data.materials && recipeResult.data.materials.length > 0) {
              // Map recipe materials to the expected format with actual stock (async)
              const materialsWithStock = await Promise.all(
                recipeResult.data.materials.map(async (material: any) => {
                  const materialId = material.material_id;
                  const materialType = material.material_type;
                  
                  // Find the actual material/product to get current stock
                  let currentStock = 0;
                  if (materialType === 'raw_material') {
                    const rawMaterial = rawMaterialsData.find((rm: any) => rm.id === materialId);
                    currentStock = rawMaterial?.current_stock || 0;
                  } else if (materialType === 'product') {
                    const productMaterial = productsData.find((p: any) => p.id === materialId);
                    if (productMaterial) {
                      // For products with individual stock tracking, count available individual products
                      if (productMaterial.individual_stock_tracking) {
                        try {
                          const { data: individualProducts } = await IndividualProductService.getIndividualProductsByProductId(materialId);
                          const availableCount = individualProducts?.filter((ip: any) => ip.status === 'available').length || 0;
                          currentStock = availableCount;
                        } catch (error) {
                          console.error(`Error loading individual products for ${materialId}:`, error);
                          currentStock = productMaterial?.individual_products_count || 0;
                        }
                      } else {
                        // For bulk products, use base_quantity or current_stock
                        currentStock = productMaterial?.base_quantity || productMaterial?.current_stock || 0;
                      }
                    }
                  }
                  
                  return {
                    materialName: material.material_name,
                    materialId: materialId,
                    materialType: materialType,
                    quantity: currentStock, // Actual current stock
                    unit: material.unit,
                    recipeQuantity: material.quantity_per_sqm // Recipe quantity per SQM
                  };
                })
              );
              
              setRecipeMaterials(materialsWithStock);
              console.log('ProductDetail - Loaded recipe materials with actual stock:', materialsWithStock);
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
    if (!product) return 0;

    // For products with individual stock tracking, count only available individual products
    if (product.individualStockTracking && individualProducts && individualProducts.length > 0) {
      const availableCount = individualProducts.filter((ip: any) => ip.status === 'available').length;
      return availableCount;
    }

    // For bulk products, use baseQuantity, quantity, or actual_quantity as fallback
    // Use nullish coalescing to avoid treating 0 as falsy
    const qty = product.baseQuantity ?? product.quantity ?? (product as any).actual_quantity ?? 0;
    return typeof qty === 'number' ? qty : 0;
  };

  const calculateProductStatus = () => {
    if (!product) return 'in-stock';

    if (product.individualStockTracking) {
      // For individual tracking products, check available individual products
      const availableCount = individualProducts?.filter((ip: any) => ip.status === 'available').length || 0;
      if (availableCount === 0) {
        return 'out-of-stock';
      } else if (availableCount <= (product.minStockLevel || 10)) {
        return 'low-stock';
      } else {
        return 'in-stock';
      }
    } else {
      // For bulk products, check base quantity
      const baseQty = product.baseQuantity ?? product.quantity ?? 0;
      if (baseQty === 0) {
        return 'out-of-stock';
      } else if (baseQty <= (product.minStockLevel || 10)) {
        return 'low-stock';
      } else {
        return 'in-stock';
      }
    }
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
                  <Badge className={`${statusStyles[calculateProductStatus()]} border`}>
                    {calculateProductStatus().replace("-", " ").toUpperCase()}
              </Badge>
            </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Category</span>
                  <span className="font-medium">{product.category}</span>
          </div>
              <div className="flex items-center justify-between">
                  <span className="text-slate-600">Available Products</span>
                  <span className="font-medium">{getAvailablePieces(product.id)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total SQM</span>
                  <span className="font-medium">
                    {(getAvailablePieces(product.id) * calculateSQM(
                      product.length || '0',
                      product.width || '0',
                      product.lengthUnit || 'feet',
                      product.widthUnit || 'feet'
                    )).toFixed(4)} SQM
                  </span>
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
                    View Individual Stock ({getAvailablePieces(product.id)} Products)
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
                      {product.length && product.length !== "NA" && (
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                          <Ruler className="w-6 h-6 text-slate-600" />
                    <div>
                            <p className="font-medium text-slate-900">Length</p>
                            <p className="text-slate-600">{product.length}</p>
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
                        </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-900">{material.recipeQuantity} {material.unit}</p>
                              <p className="text-slate-600 text-sm">base quantity</p>
                        </div>
                      </div>
                    ))}
                        <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="font-semibold text-slate-900">Total Materials</p>
                          <p className="font-bold text-lg text-primary">
                            {recipeMaterials.length} materials
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
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/qr-result?data=${encodeURIComponent(JSON.stringify({
                                type: 'main',
                                productId: product.id
                              }))}`)}`}
                              alt={`QR Code for ${product.name}`}
                              className="w-48 h-48"
                            />
                          </div>
                      </div>

                        <div className="font-mono text-sm bg-white p-4 rounded-lg border max-w-md mx-auto shadow-sm break-all">
                        {product.id}
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
