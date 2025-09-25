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
  User, Star, Truck, FileText
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
import { ProductService } from "@/services/ProductService";

interface ProductMaterial {
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface Product {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  color: string;
  size: string;
  pattern: string;
  quantity: number;
  unit: string;
  manufacturingDate: string;
  imageUrl?: string;
  location: string;
  weight?: string;
  thickness?: string;
  width?: string;
  height?: string;
  individualStockTracking?: boolean;
}

interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  productName?: string;
  manufacturingDate: string;
  productionDate?: string;
  addedDate?: string;
  completionDate?: string;
  materialsUsed: ProductMaterial[];
  finalWeight: string;
  finalThickness: string;
  finalWidth: string;
  finalHeight: string;
  width?: string;
  height?: string;
  thickness?: string;
  weight?: string;
  color?: string;
  pattern?: string;
  qualityGrade: string;
  inspector: string;
  notes: string;
  status: "available" | "sold" | "damaged";
  location?: string;
  // Production steps data (kept in background, not displayed in UI)
  productionSteps?: Array<{
    stepName: string;
    machineUsed: string;
    completedAt: string;
    inspector: string;
    qualityNotes?: string;
  }>;
}




export default function ProductStock() {
  const { productId } = useParams();
  const navigate = useNavigate();
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
    finalThickness: '',
    finalWidth: '',
    finalHeight: '',
    qualityGrade: '',
    inspector: '',
    location: '',
    notes: '',
    status: 'available' as 'available' | 'sold' | 'damaged'
  });
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRIndividualProduct, setSelectedQRIndividualProduct] = useState<IndividualProduct | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (productId) {
        try {
          // Load product from Supabase
          const productResult = await ProductService.getProducts();
          const foundProduct = productResult.data?.find((p: any) => p.id === productId);
          if (foundProduct) {
            setProduct(foundProduct);
            // Use individual products from the main product data
            setIndividualProducts(foundProduct.individual_products || []);
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
      production_date: individualProduct.productionDate || individualProduct.addedDate || new Date().toISOString().split('T')[0],
      quality_grade: individualProduct.qualityGrade || 'A',
      dimensions: {
        length: parseFloat(individualProduct.width?.replace(/[^\d.]/g, '') || '0'),
        width: parseFloat(individualProduct.height?.replace(/[^\d.]/g, '') || '0'),
        thickness: parseFloat(individualProduct.thickness?.replace(/[^\d.]/g, '') || '0')
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
      created_at: individualProduct.addedDate || new Date().toISOString()
    };
  };


  const handleEditItem = (item: IndividualProduct) => {
    setEditingItem(item);
    setEditForm({
      finalWeight: item.finalWeight,
      finalThickness: item.finalThickness,
      finalWidth: item.finalWidth,
      finalHeight: item.finalHeight,
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
      // Update the individual product in Supabase using ProductService
      const { data, error } = await ProductService.updateIndividualProduct(editingItem.id, editForm);
      
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
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Stock Report
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
              <p className="text-sm font-medium text-blue-800">Thickness</p>
              <p className="text-sm text-blue-700">{product.thickness}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Width</p>
              <p className="text-sm text-blue-700">{product.width}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-800">Height</p>
              <p className="text-sm text-blue-700">{product.height}</p>
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
              <p className="text-muted-foreground">{product.color} • {product.width}x{product.height} • {product.pattern}</p>
                             <div className="flex items-center gap-4 mt-2">
                 <div className="flex items-center gap-2">
                   <Hash className="w-4 h-4 text-muted-foreground" />
                   <span className="text-sm font-medium">Total Stock: {product.quantity} {product.unit || 'pieces'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <CheckCircle className="w-4 h-4 text-success" />
                   <span className="text-sm text-success">Available: {getStatusCount("available")} {product.unit || 'pieces'}</span>
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
                  <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">QR Code</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Manufacturing Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Final Width</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Final Height</th>
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
                      {(item.manufacturingDate) && item.manufacturingDate !== 'null' ? new Date(item.manufacturingDate).toLocaleDateString() : (item.productionDate) && item.productionDate !== 'null' ? new Date(item.productionDate).toLocaleDateString() : (item.completionDate) && item.completionDate !== 'null' ? new Date(item.completionDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-3 text-sm">{item.finalWidth}</td>
                    <td className="p-3 text-sm">{item.finalHeight}</td>
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
                  <p className="text-sm">{new Date(selectedItem.manufacturingDate).toLocaleDateString()}</p>
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
                  <p className="text-sm">{selectedItem.finalWeight}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Thickness</Label>
                  <p className="text-sm">{selectedItem.finalThickness}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Width</Label>
                  <p className="text-sm">{selectedItem.finalWidth}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Final Height</Label>
                  <p className="text-sm">{selectedItem.finalHeight}</p>
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
              <Label htmlFor="finalThickness">Final Thickness</Label>
              <Input
                id="finalThickness"
                value={editForm.finalThickness}
                onChange={(e) => setEditForm({...editForm, finalThickness: e.target.value})}
                placeholder="e.g., 2.5 cm"
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
              <Label htmlFor="finalHeight">Final Height</Label>
              <Input
                id="finalHeight"
                value={editForm.finalHeight}
                onChange={(e) => setEditForm({...editForm, finalHeight: e.target.value})}
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
                <p><strong>Manufacturing Date:</strong> {(selectedQRIndividualProduct.manufacturingDate) && selectedQRIndividualProduct.manufacturingDate !== 'null' ? new Date(selectedQRIndividualProduct.manufacturingDate).toLocaleDateString() : (selectedQRIndividualProduct.productionDate) && selectedQRIndividualProduct.productionDate !== 'null' ? new Date(selectedQRIndividualProduct.productionDate).toLocaleDateString() : (selectedQRIndividualProduct.completionDate) && selectedQRIndividualProduct.completionDate !== 'null' ? new Date(selectedQRIndividualProduct.completionDate).toLocaleDateString() : 'N/A'}</p>
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
    </div>
  );
}