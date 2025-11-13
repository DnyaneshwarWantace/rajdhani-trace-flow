import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QRCodeDisplay } from '@/components/qr/QRCodeDisplay';
import { ProductService } from '@/services/ProductService';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Package, QrCode, Download, Printer } from 'lucide-react';
import { IndividualProductQRData, MainProductQRData } from '@/lib/qrCode';

interface ProductionCompletionQRProps {
  batchId: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  onCompletion: (completedProducts: any[]) => void;
  className?: string;
}

interface ProductEntry {
  dimensions: string;
  weight: string;
  qualityGrade: 'A+' | 'A' | 'B' | 'C';
  inspector: string;
  notes: string;
}

export function ProductionCompletionQR({
  batchId,
  productId,
  productName,
  plannedQuantity,
  onCompletion,
  className
}: ProductionCompletionQRProps) {
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [createdProducts, setCreatedProducts] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const [mainProductQR, setMainProductQR] = useState<MainProductQRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [completionStep, setCompletionStep] = useState<'input' | 'generating' | 'completed'>('input');
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with planned quantity
    const initialProducts = Array.from({ length: plannedQuantity }, () => ({
      dimensions: '',
      weight: '',
      qualityGrade: 'A' as const,
      inspector: '',
      notes: ''
    }));
    setProducts(initialProducts);
  }, [plannedQuantity]);

  const updateProduct = (index: number, field: keyof ProductEntry, value: string) => {
    const updatedProducts = [...products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    setProducts(updatedProducts);
  };

  const validateProduct = (product: ProductEntry): boolean => {
    return !!(
      product.dimensions.trim() &&
      product.weight.trim() &&
      product.qualityGrade &&
      product.inspector.trim()
    );
  };

  const completeProduction = async () => {
    try {
      setLoading(true);
      setCompletionStep('generating');

      // Validate all products
      const validProducts = products.filter(validateProduct);
      if (validProducts.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please fill in at least one complete product entry",
          variant: "destructive"
        });
        setCompletionStep('input');
        return;
      }

      const newProducts = [];
      const newQrCodes: { [key: string]: string } = {};

      // Create individual products in database
      for (let i = 0; i < validProducts.length; i++) {
        const product = validProducts[i];

        const { data: individualProduct, error } = await ProductService.createIndividualProduct({
          product_id: productId,
          batch_number: batchId,
          production_date: new Date().toISOString().split('T')[0],
          final_weight: product.weight,
          quality_grade: product.qualityGrade,
          inspector: product.inspector,
          production_notes: product.notes
        });

        if (error || !individualProduct) {
          console.error('Error creating individual product:', error);
          toast({
            title: "Error",
            description: `Failed to create product ${i + 1}: ${error}`,
            variant: "destructive"
          });
          continue;
        }

        newProducts.push(individualProduct);

        // Generate QR code for this individual product
        const { qrCodeURL, error: qrError } = await ProductService.generateIndividualProductQRCode(individualProduct.id);
        if (qrCodeURL && !qrError) {
          newQrCodes[individualProduct.id] = qrCodeURL;
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Generate main product QR code
      const { qrCodeURL: mainQRURL, error: mainQRError } = await ProductService.generateMainProductQRCode(productId);
      if (mainQRURL && !mainQRError) {
        // Get main product data for QR display
        const { data: productData } = await ProductService.getProductById(productId);
        if (productData) {
          const mainQRData: MainProductQRData = {
            product_id: productData.id,
            product_name: productData.name,
            description: `${productData.category} carpet - ${productData.color || 'Various colors'}`,
            category: productData.category,
            base_price: productData.selling_price,
            total_quantity: productData.total_produced || 0,
            available_quantity: productData.actual_quantity || 0,
            recipe: {
              materials: [],
              production_time: 0,
              difficulty_level: 'Medium'
            },
            machines_required: ['Loom Machine', 'Cutting Machine'],
            production_steps: ['Warping', 'Weaving', 'Cutting', 'Quality Check'],
            quality_standards: {
              min_weight: 2.0,
              max_weight: 15.0,
              dimensions_tolerance: 0.05,
              quality_criteria: ['Color consistency', 'Pattern alignment']
            },
            created_at: productData.created_at,
            updated_at: productData.updated_at
          };
          setMainProductQR(mainQRData);
        }
      }

      setCreatedProducts(newProducts);
      setQrCodes(newQrCodes);
      setCompletionStep('completed');

      toast({
        title: "Production Completed",
        description: `Successfully created ${newProducts.length} individual products with QR codes`,
      });

      onCompletion(newProducts);

    } catch (error) {
      console.error('Error completing production:', error);
      toast({
        title: "Error",
        description: "Failed to complete production",
        variant: "destructive"
      });
      setCompletionStep('input');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllQRCodes = () => {
    Object.entries(qrCodes).forEach(([productId, qrCodeURL], index) => {
      const product = createdProducts.find(p => p.id === productId);
      const filename = `individual_product_${product?.qr_code || index + 1}_qr`;

      const link = document.createElement('a');
      link.href = qrCodeURL;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    toast({
      title: "Success",
      description: `Downloaded ${Object.keys(qrCodes).length} QR codes`,
    });
  };

  if (completionStep === 'completed') {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Production Completed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Created {createdProducts.length} individual products with QR codes
                </p>
                <p className="font-medium">{productName}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadAllQRCodes} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download All QR Codes
                </Button>
              </div>
            </div>

            <Separator />

            {/* Main Product QR Code */}
            {mainProductQR && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Main Product QR Code
                </h3>
                <QRCodeDisplay
                  data={mainProductQR}
                  type="main"
                  title="Main Product QR Code"
                  className="max-w-md"
                />
              </div>
            )}

            <Separator />

            {/* Individual Product QR Codes */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Individual Product QR Codes ({createdProducts.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {createdProducts.map((product, index) => {
                  const qrData: IndividualProductQRData = {
                    id: product.id,
                    product_id: product.product_id,
                    product_name: productName,
                    batch_id: batchId,
                    serial_number: product.qr_code,
                    production_date: product.production_date,
                    quality_grade: product.quality_grade,
                    dimensions: {
                      length: parseFloat(product.final_width || '0'),
                      width: parseFloat(product.final_length || '0'),
                    },
                    weight: parseFloat(product.final_weight || '0'),
                    color: '',
                    pattern: '',
                    material_composition: [],
                    production_steps: [],
                    machine_used: ['Loom Machine'],
                    inspector: product.inspector,
                    status: 'active',
                    created_at: product.created_at
                  };

                  return (
                    <QRCodeDisplay
                      key={product.id}
                      data={qrData}
                      type="individual"
                      title={`Product #${index + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completionStep === 'generating') {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle>Generating QR Codes...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Creating individual products and generating QR codes...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Complete Production & Generate QR Codes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Fill in details for each individual product. QR codes will be generated automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">{productName}</h3>
              <p className="text-sm text-muted-foreground">Batch: {batchId}</p>
            </div>
            <Badge variant="outline">
              {products.filter(validateProduct).length} / {plannedQuantity} Products Ready
            </Badge>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {products.map((product, index) => (
              <Card key={index} className="border-dashed">
                <CardHeader className="pb-3">
                  <h4 className="text-sm font-medium">Product #{index + 1}</h4>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label htmlFor={`dimensions-${index}`}>Dimensions (L x W)</Label>
                    <Input
                      id={`dimensions-${index}`}
                      placeholder="e.g., 6x4"
                      value={product.dimensions}
                      onChange={(e) => updateProduct(index, 'dimensions', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`weight-${index}`}>Weight (kg)</Label>
                    <Input
                      id={`weight-${index}`}
                      placeholder="e.g., 8.5"
                      value={product.weight}
                      onChange={(e) => updateProduct(index, 'weight', e.target.value)}
                    />
                  </div>



                  <div>
                    <Label htmlFor={`quality-${index}`}>Quality Grade</Label>
                    <Select
                      value={product.qualityGrade}
                      onValueChange={(value) => updateProduct(index, 'qualityGrade', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+ (Premium)</SelectItem>
                        <SelectItem value="A">A (Standard)</SelectItem>
                        <SelectItem value="B">B (Good)</SelectItem>
                        <SelectItem value="C">C (Basic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor={`inspector-${index}`}>Inspector</Label>
                    <Input
                      id={`inspector-${index}`}
                      placeholder="Inspector name"
                      value={product.inspector}
                      onChange={(e) => updateProduct(index, 'inspector', e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <Label htmlFor={`notes-${index}`}>Production Notes</Label>
                    <Textarea
                      id={`notes-${index}`}
                      placeholder="Any additional notes..."
                      value={product.notes}
                      onChange={(e) => updateProduct(index, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={completeProduction}
              disabled={loading || products.filter(validateProduct).length === 0}
              size="lg"
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              Complete Production & Generate QR Codes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}