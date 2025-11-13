import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Package, AlertTriangle, QrCode, Calendar, 
  Edit, Eye, Hash, Image, Search, Filter, Download,
  CheckCircle, Clock, MapPin, Scale, Ruler, Layers,
  User, Star, Truck, FileText, CheckSquare, Square
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateUniqueId } from "@/lib/storageUtils";
import { QRCodeService, IndividualProductQRData, MainProductQRData } from "@/lib/qrCode";
import { QRCodeDisplay } from "@/components/qr/QRCodeDisplay";
import { MongoDBProductService, IndividualProductService } from "@/services";
import { mapMongoDBProductToFrontend, mapMongoDBIndividualProductToFrontend, type Product as FrontendProduct, type IndividualProduct as FrontendIndividualProduct } from "@/utils/typeMapping";
import { useToast } from "@/hooks/use-toast";

interface ProductMaterial {
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
}

// Using imported types from typeMapping
type Product = FrontendProduct;
type IndividualProduct = FrontendIndividualProduct;




export default function ProductStock() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<IndividualProduct | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IndividualProduct | null>(null);
  const [editForm, setEditForm] = useState({
    finalWeight: '',
    finalWidth: '',
    finalLength: '',
    qualityGrade: '',
    inspector: '',
    location: '',
    notes: '',
    status: 'available' as 'available' | 'sold' | 'damaged' | 'returned' | 'in-production' | 'completed'
  });
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRIndividualProduct, setSelectedQRIndividualProduct] = useState<IndividualProduct | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    const loadData = async () => {
      if (productId) {
        try {
          // Load product from MongoDB
          const productResult = await MongoDBProductService.getProductById(productId);
          if (productResult.data) {
            const mappedProduct = mapMongoDBProductToFrontend(productResult.data);
            setProduct(mappedProduct);
            
            // Load individual products from MongoDB
            const individualProductsResult = await IndividualProductService.getIndividualProductsByProductId(productId);
            if (individualProductsResult.data) {
              const mappedIndividualProducts = individualProductsResult.data.map(mapMongoDBIndividualProductToFrontend);
              setIndividualProducts(mappedIndividualProducts);
            }
          }
        } catch (error) {
          console.error('Error loading data:', error);
          // Set empty states on error
          setProduct(null);
          setIndividualProducts([]);
        }
      }
    };

    loadData();
  }, [productId]);

  const getIndividualProducts = (productId: string) => {
    return individualProducts.filter(ind => ind.productId === productId);
  };


  // Generate QR data for individual product
  const generateIndividualProductQRData = (individualProduct: IndividualProduct): IndividualProductQRData => {
    return {
      id: individualProduct.id,
      product_id: individualProduct.productId,
      product_name: individualProduct.productName || product?.name || 'Unknown Product',
      batch_id: individualProduct.id, // Using individual product ID as batch ID
      serial_number: individualProduct.qrCode,
      production_date: individualProduct.productionDate || new Date().toISOString().split('T')[0],
      quality_grade: individualProduct.qualityGrade || 'A',
      dimensions: {
        length: parseFloat(individualProduct.width?.replace(/[^\d.]/g, '') || '0'),
        width: parseFloat(individualProduct.length?.replace(/[^\d.]/g, '') || '0'),
      },
      weight: parseFloat(individualProduct.weight?.replace(/[^\d.]/g, '') || '0'),
      color: individualProduct.color || 'N/A',
      pattern: individualProduct.pattern || 'N/A',
      material_composition: (individualProduct.materialsUsed || []).map(m => m.materialName),
      production_steps: [
        {
          step_name: 'Production',
          completed_at: individualProduct.completionDate || new Date().toISOString(),
          operator: individualProduct.inspector || 'System',
          quality_check: true
        }
      ],
      machine_used: ['Production Line'], // Default value
      inspector: individualProduct.inspector || 'System',
      location: individualProduct.location || 'Not specified',
      status: individualProduct.status as 'active' | 'sold' | 'damaged' | 'returned',
      created_at: individualProduct.createdAt || new Date().toISOString()
    };
  };


  const handleEditItem = (item: IndividualProduct) => {
    setEditingItem(item);
    setEditForm({
      finalWeight: item.finalWeight,
      finalWidth: item.finalWidth,
      finalLength: item.finalLength,
      qualityGrade: item.qualityGrade,
      inspector: item.inspector,
      location: item.location || '',
      notes: item.notes,
      status: item.status
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      // Update the individual product in MongoDB
      const updateData = {
        final_weight: editForm.finalWeight,
        final_width: editForm.finalWidth,
        final_length: editForm.finalLength,
        quality_grade: editForm.qualityGrade,
        inspector: editForm.inspector,
        location: editForm.location,
        notes: editForm.notes,
        status: editForm.status === 'completed' ? 'available' : editForm.status
      };
      
      const { data, error } = await IndividualProductService.updateIndividualProduct(editingItem.id, updateData);
      
      if (error) {
        console.error('Error updating individual product:', error);
        return;
      }
    
    // Update local state
    const updatedItem = { ...editingItem, ...editForm };
    setSelectedItem(updatedItem);
    
    // Update the individualProducts state
      setIndividualProducts(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));
    
    setIsEditDialogOpen(false);
    setEditingItem(null);
    } catch (error) {
      console.error('Error updating individual product:', error);
    }
  };

  const filteredItems = getIndividualProducts(productId || "").filter(item => {
    const matchesSearch = item.qrCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.inspector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesQuality = qualityFilter === "all" || item.qualityGrade === qualityFilter;
    
    return matchesSearch && matchesStatus && matchesQuality;
  });

  const getStatusCount = (status: string) => {
    // If product doesn't have individual stock tracking, return appropriate values
    if (product && product.individualStockTracking === false) {
      if (status === "available") {
        return product.quantity || 0;
      } else {
        return 0; // For bulk products, sold/damaged are tracked differently
      }
    }
    
    // For products with individual stock tracking, count individual products
    return getIndividualProducts(productId || "").filter(item => item.status === status).length;
  };

  const getQualityCount = (grade: string) => {
    return getIndividualProducts(productId || "").filter(item => item.qualityGrade === grade).length;
  };

  // Handle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAllProducts = () => {
    const allIds = filteredItems.map(item => item.id);
    setSelectedProducts(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  // Create QR code image with product name and ID text below
  const createQRCodeWithText = async (
    qrCodeDataURL: string,
    productName: string,
    productId: string
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const qrImage = new window.Image();
      qrImage.onload = () => {
        // Set canvas dimensions
        const qrSize = 256; // QR code size
        const padding = 20;
        const textHeight = 60; // Space for text below QR code
        const lineHeight = 20;
        
        canvas.width = qrSize + (padding * 2);
        canvas.height = qrSize + textHeight + (padding * 2);

        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(qrImage, padding, padding, qrSize, qrSize);

        // Draw text below QR code
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Draw product name (truncate if too long)
        const maxWidth = qrSize;
        const productNameText = productName.length > 30 
          ? productName.substring(0, 27) + '...' 
          : productName;
        ctx.fillText(productNameText, canvas.width / 2, qrSize + padding + 10, maxWidth);

        // Draw product ID
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666666';
        ctx.fillText(`ID: ${productId}`, canvas.width / 2, qrSize + padding + 10 + lineHeight, maxWidth);

        // Convert to data URL
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };

      qrImage.onerror = () => {
        reject(new Error('Failed to load QR code image'));
      };

      qrImage.src = qrCodeDataURL;
    });
  };

  // Download QR codes
  const downloadQRCodes = async (productIds: string[]) => {
    setIsExporting(true);
    try {
      // Generate QR codes for all selected products
      const qrPromises = productIds.map(async (id) => {
        const item = individualProducts.find(ip => ip.id === id);
        if (!item) return null;
        
        const qrData = generateIndividualProductQRData(item);
        const qrCodeDataURL = await QRCodeService.generateIndividualProductQR(qrData);
        
        // Create QR code with text
        const qrWithText = await createQRCodeWithText(
          qrCodeDataURL,
          item.productName || product?.name || 'Unknown Product',
          item.id
        );
        
        return {
          id: item.id,
          qrCode: item.qrCode,
          dataURL: qrWithText,
          productName: item.productName || product?.name || 'Unknown'
        };
      });

      const qrCodes = (await Promise.all(qrPromises)).filter(Boolean) as Array<{
        id: string;
        qrCode: string;
        dataURL: string;
        productName: string;
      }>;

      // Download each QR code
      for (const qr of qrCodes) {
        const filename = `${qr.qrCode || qr.id}`;
        QRCodeService.downloadQRCode(qr.dataURL, filename);
        // Add a small delay between downloads to avoid browser blocking
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Show success toast
      toast({
        title: "QR Codes Downloaded",
        description: `Successfully downloaded ${qrCodes.length} QR code(s) with product details.`,
        variant: "default",
      });
      
      setShowExportDialog(false);
      clearSelection();
    } catch (error) {
      console.error('Error downloading QR codes:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download QR codes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = () => {
    const allIds = filteredItems.map(item => item.id);
    downloadQRCodes(allIds);
  };

  const handleExportSelected = () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one product to export.",
        variant: "destructive",
      });
      return;
    }
    downloadQRCodes(Array.from(selectedProducts));
  };

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
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Individual Stock Management</h1>
            <p className="text-muted-foreground">Manage individual pieces for {product.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/product/${product.id}`)}>
            <Eye className="w-4 h-4 mr-2" />
            View Product Details
          </Button>
          <Button onClick={() => setShowExportDialog(true)}>
            <QrCode className="w-4 h-4 mr-2" />
            Export QR Codes
          </Button>
        </div>
      </div>

      {/* Product Specifications Reference Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Package className="w-5 h-5" />
            Product Specifications Reference
          </CardTitle>
          <p className="text-blue-600 text-sm">
            Use these specifications as reference when filling individual product details
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Product Name</p>
              <p className="text-sm text-blue-700">{product.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Category</p>
              <p className="text-sm text-blue-700">{product.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Color</p>
              <p className="text-sm text-blue-700">{product.color}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Pattern</p>
              <p className="text-sm text-blue-700">{product.pattern}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Weight</p>
              <p className="text-sm text-blue-700">{product.weight}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Width</p>
              <p className="text-sm text-blue-700">{product.width}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Length</p>
              <p className="text-sm text-blue-700">{product.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{product.name}</h3>
              <p className="text-muted-foreground">{product.color} • {product.width}x{product.length} • {product.pattern}</p>
                             <div className="flex items-center gap-4 mt-2">
                 <div className="flex items-center gap-2">
                   <Hash className="w-4 h-4 text-muted-foreground" />
                   <span className="text-sm font-medium">Total Stock: {individualProducts.length} Products</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <CheckCircle className="w-4 h-4 text-success" />
                   <span className="text-sm text-success">Available: {getStatusCount("available")} Products</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <span className="text-sm font-medium">Total SQM: {(individualProducts.length * calculateSQM(
                     product.length || '0',
                     product.width || '0',
                     product.lengthUnit || 'feet',
                     product.widthUnit || 'feet'
                   )).toFixed(4)} SQM</span>
                 </div>
               </div>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-success">{getStatusCount("available")}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warning">{getStatusCount("sold")}</p>
                  <p className="text-xs text-muted-foreground">Sold</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-destructive">{getStatusCount("damaged")}</p>
                  <p className="text-xs text-muted-foreground">Damaged</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="Search by ID, QR code, or inspector..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={qualityFilter} onValueChange={setQualityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quality</SelectItem>
                <SelectItem value="A+">A+ Grade</SelectItem>
                <SelectItem value="A">A Grade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quality Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">A+ Grade</p>
                <p className="text-2xl font-bold text-success">{getQualityCount("A+")}</p>
              </div>
              <Star className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">A Grade</p>
                <p className="text-2xl font-bold text-warning">{getQualityCount("A")}</p>
              </div>
              <Star className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pieces</p>
                <p className="text-2xl font-bold">{filteredItems.length}</p>
              </div>
              <Package className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Pieces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedProducts.size === filteredItems.length) {
                          clearSelection();
                        } else {
                          selectAllProducts();
                        }
                      }}
                      title="Select All"
                    >
                      {selectedProducts.size === filteredItems.length && filteredItems.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </Button>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">QR Code</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Manufacturing Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Final Width</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Final Length</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Quality Grade</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Inspector</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductSelection(item.id)}
                        title="Select"
                      >
                        {selectedProducts.has(item.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{item.id}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        {item.qrCode ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedQRIndividualProduct(item);
                              setShowQRCode(true);
                            }}
                            title={`QR Code: ${item.qrCode}`}
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No QR Code</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">
                      {(item.productionDate) && item.productionDate !== 'null' ? new Date(item.productionDate).toLocaleDateString() : (item.completionDate) && item.completionDate !== 'null' ? new Date(item.completionDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3 text-sm">
                      {item.finalWidth ? (
                        // Check if the value already contains a unit
                        item.finalWidth.includes(' ') ? item.finalWidth : 
                        // If not, combine with product unit
                        `${item.finalWidth} ${product.widthUnit || 'feet'}`
                      ) : 'N/A'}
                    </td>
                    <td className="p-3 text-sm">
                      {item.finalLength ? (
                        // Check if the value already contains a unit
                        item.finalLength.includes(' ') ? item.finalLength : 
                        // If not, combine with product unit
                        `${item.finalLength} ${product.lengthUnit || 'feet'}`
                      ) : 'N/A'}
                    </td>
                    <td className="p-3">
                      <Badge variant={item.qualityGrade === "A+" ? "default" : "secondary"}>
                        {item.qualityGrade}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm hidden lg:table-cell">{item.inspector}</td>
                    <td className="p-3">
                      <Badge 
                        variant={item.status === "available" ? "default" : 
                                item.status === "sold" ? "secondary" : "destructive"}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Individual Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Individual Piece Details</h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                  ✕
                </Button>
            </div>
            
            <div className="space-y-6">
              {/* QR Code Section */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  <h4 className="font-medium">QR Code</h4>
                </div>
                {selectedItem.qrCode ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedQRIndividualProduct(selectedItem);
                      setShowQRCode(true);
                    }}
                    className="w-full justify-center p-3 h-auto"
                    title={`QR Code: ${selectedItem.qrCode}`}
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    View QR Code
                  </Button>
                ) : (
                  <div className="font-mono text-lg bg-background p-3 rounded border text-muted-foreground">
                    No QR Code Available
                </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Manufacturing Date</Label>
                  <p className="text-sm">{(selectedItem.productionDate) && selectedItem.productionDate !== 'null' ? new Date(selectedItem.productionDate).toLocaleDateString() : (selectedItem.completionDate) && selectedItem.completionDate !== 'null' ? new Date(selectedItem.completionDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Quality Grade</Label>
                  <Badge variant={selectedItem.qualityGrade === "A+" ? "default" : "secondary"}>
                    {selectedItem.qualityGrade}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Inspector</Label>
                  <p className="text-sm">{selectedItem.inspector}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <p className="text-sm">{selectedItem.location || 'Not specified'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge 
                    variant={selectedItem.status === "available" ? "default" : 
                            selectedItem.status === "sold" ? "secondary" : "destructive"}
                  >
                    {selectedItem.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Weight</Label>
                  <p className="text-sm">
                    {selectedItem.finalWeight ? (
                      /[a-zA-Z]/.test(selectedItem.finalWeight) ? selectedItem.finalWeight :
                      `${selectedItem.finalWeight} ${product.weightUnit || 'kg'}`
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Width</Label>
                  <p className="text-sm">
                    {selectedItem.finalWidth ? (
                      /[a-zA-Z]/.test(selectedItem.finalWidth) ? selectedItem.finalWidth :
                      `${selectedItem.finalWidth} ${product.widthUnit || 'feet'}`
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Length</Label>
                  <p className="text-sm">
                    {selectedItem.finalLength ? (
                      /[a-zA-Z]/.test(selectedItem.finalLength) ? selectedItem.finalLength :
                      `${selectedItem.finalLength} ${product.lengthUnit || 'feet'}`
                    ) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Materials Used */}
              <div>
                <Label className="text-sm font-medium">Materials Used</Label>
                <div className="mt-2 space-y-2">
                  {selectedItem.materialsUsed.map((material, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                      <div>
                        <p className="text-sm font-medium">{material.materialName}</p>
                        <p className="text-xs text-muted-foreground">
                          {material.quantity} {material.unit}
                        </p>
                      </div>
                      <p className="text-sm font-medium">₹{material.cost.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedItem.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm mt-1">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Individual Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Individual Product Details</DialogTitle>
            <DialogDescription>
              Update the details for this individual product piece.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            
            <div className="space-y-2">
              <Label htmlFor="finalWeight">Final Weight</Label>
              <Input
                id="finalWeight"
                value={editForm.finalWeight}
                onChange={(e) => setEditForm({...editForm, finalWeight: e.target.value})}
                placeholder="e.g., 15 kg"
              />
            </div>
            
            
            <div className="space-y-2">
              <Label htmlFor="finalWidth">Final Width</Label>
              <Input
                id="finalWidth"
                value={editForm.finalWidth}
                onChange={(e) => setEditForm({...editForm, finalWidth: e.target.value})}
                placeholder="e.g., 1.83m"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="finalLength">Final Length</Label>
              <Input
                id="finalLength"
                value={editForm.finalLength}
                onChange={(e) => setEditForm({...editForm, finalLength: e.target.value})}
                placeholder="e.g., 2.74m"
              />
            </div>
            
            
            <div className="space-y-2">
              <Label htmlFor="qualityGrade">Quality Grade</Label>
              <Select value={editForm.qualityGrade} onValueChange={(value) => setEditForm({...editForm, qualityGrade: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select quality grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+ (Premium)</SelectItem>
                  <SelectItem value="A">A (High)</SelectItem>
                  <SelectItem value="B">B (Good)</SelectItem>
                  <SelectItem value="C">C (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="inspector">Inspector</Label>
              <Input
                id="inspector"
                value={editForm.inspector}
                onChange={(e) => setEditForm({...editForm, inspector: e.target.value})}
                placeholder="Inspector name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={editForm.location}
                onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                placeholder="e.g., Warehouse A, Shelf 3"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={editForm.status} onValueChange={(value: 'available' | 'sold' | 'damaged') => setEditForm({...editForm, status: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="Additional notes about this product piece..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Display Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Individual Product QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view individual product details and specifications
            </DialogDescription>
          </DialogHeader>
          
          {selectedQRIndividualProduct && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>Product:</strong> {selectedQRIndividualProduct.productName || product?.name}</p>
                <p><strong>QR Code:</strong> {selectedQRIndividualProduct.qrCode}</p>
                <p><strong>Status:</strong> {selectedQRIndividualProduct.status}</p>
                <p><strong>Quality Grade:</strong> {selectedQRIndividualProduct.qualityGrade}</p>
                <p><strong>Manufacturing Date:</strong> {(selectedQRIndividualProduct.productionDate) && selectedQRIndividualProduct.productionDate !== 'null' ? new Date(selectedQRIndividualProduct.productionDate).toLocaleDateString() : (selectedQRIndividualProduct.completionDate) && selectedQRIndividualProduct.completionDate !== 'null' ? new Date(selectedQRIndividualProduct.completionDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Inspector:</strong> {selectedQRIndividualProduct.inspector}</p>
                <p><strong>Location:</strong> {selectedQRIndividualProduct.location || 'Not specified'}</p>
              </div>
              
              <QRCodeDisplay
                data={generateIndividualProductQRData(selectedQRIndividualProduct)}
                type="individual"
                title={`${selectedQRIndividualProduct.productName || product?.name} - Individual Product`}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQRCode(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export QR Codes Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export QR Codes</DialogTitle>
            <DialogDescription>
              Choose how you want to export QR codes for individual products
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedProducts.size > 0 
                  ? `${selectedProducts.size} product(s) selected`
                  : 'No products selected'}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleExportAll}
                disabled={isExporting || filteredItems.length === 0}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : `Export All (${filteredItems.length} products)`}
              </Button>
              
              <Button
                onClick={handleExportSelected}
                disabled={isExporting || selectedProducts.size === 0}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exporting...' : `Export Selected (${selectedProducts.size} products)`}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>💡 Tip: Select products using the checkboxes in the table, then click "Export Selected"</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}