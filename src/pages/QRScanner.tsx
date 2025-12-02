import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QRCodeScanner } from '@/components/qr/QRCodeScanner';
import { QRCodeService, IndividualProductQRData, MainProductQRData } from '@/lib/qrCode';
import { ArrowLeft, Package, QrCode, Eye, Download } from 'lucide-react';

export default function QRScanner() {
  const navigate = useNavigate();
  const [scannedData, setScannedData] = useState<{
    data: IndividualProductQRData | MainProductQRData;
    type: 'individual' | 'main';
  } | null>(null);

  const handleScanSuccess = (data: IndividualProductQRData | MainProductQRData, type: 'individual' | 'main') => {
    setScannedData({ data, type });
  };

  const handleViewProduct = () => {
    if (scannedData) {
      if (scannedData.type === 'main') {
        const mainProductData = scannedData.data as MainProductQRData;
        navigate(`/product/${mainProductData.product_id}`);
      } else {
        const individualProductData = scannedData.data as IndividualProductQRData;
        navigate(`/product/${individualProductData.product_id}`);
      }
    }
  };

  const handleViewIndividualStock = () => {
    if (scannedData) {
      const productData = scannedData.data as IndividualProductQRData;
      navigate(`/product-stock/${productData.product_id}`);
    }
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">

      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Scanner */}
        <QRCodeScanner
          onScanSuccess={handleScanSuccess}
          className="w-full"
        />

        {/* Scan Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Scan Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scannedData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={scannedData.type === 'individual' ? 'default' : 'secondary'}>
                    {scannedData.type === 'individual' ? 'Individual Product' : 'Main Product'}
                  </Badge>
                </div>

                {scannedData.type === 'main' ? (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{(scannedData.data as MainProductQRData).product_name}</h3>
                      <p className="text-muted-foreground">{(scannedData.data as MainProductQRData).category}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Total Quantity</p>
                        <p className="text-muted-foreground">{(scannedData.data as MainProductQRData).total_quantity} pieces</p>
                      </div>
                      <div>
                        <p className="font-medium">Available</p>
                        <p className="text-muted-foreground">{(scannedData.data as MainProductQRData).available_quantity} pieces</p>
                      </div>
                      <div>
                        <p className="font-medium">Base Price</p>
                        <p className="text-muted-foreground">₹{(scannedData.data as MainProductQRData).base_price.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="font-medium">Materials</p>
                        <p className="text-muted-foreground">{(scannedData.data as MainProductQRData).recipe.materials.length} types</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleViewProduct} className="flex-1 gap-2">
                        <Eye className="w-4 h-4" />
                        View Product Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{(scannedData.data as IndividualProductQRData).product_name}</h3>
                      <p className="text-muted-foreground">Serial: {(scannedData.data as IndividualProductQRData).serial_number}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Quality Grade</p>
                        <p className="text-muted-foreground">{(scannedData.data as IndividualProductQRData).quality_grade}</p>
                      </div>
                      <div>
                        <p className="font-medium">Status</p>
                        <p className="text-muted-foreground capitalize">{(scannedData.data as IndividualProductQRData).status}</p>
                      </div>
                      <div>
                        <p className="font-medium">Dimensions</p>
                        <p className="text-muted-foreground">
                          {(scannedData.data as IndividualProductQRData).dimensions.length}m × {(scannedData.data as IndividualProductQRData).dimensions.width}m
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Weight</p>
                        <p className="text-muted-foreground">{(scannedData.data as IndividualProductQRData).weight} kg</p>
                      </div>
                      <div>
                        <p className="font-medium">Color</p>
                        <p className="text-muted-foreground">{(scannedData.data as IndividualProductQRData).color}</p>
                      </div>
                      <div>
                        <p className="font-medium">Pattern</p>
                        <p className="text-muted-foreground">{(scannedData.data as IndividualProductQRData).pattern}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleViewProduct} className="flex-1 gap-2">
                        <Eye className="w-4 h-4" />
                        View Product
                      </Button>
                      <Button onClick={handleViewIndividualStock} variant="outline" className="flex-1 gap-2">
                        <Package className="w-4 h-4" />
                        View Stock
                      </Button>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setScannedData(null)}
                    className="w-full"
                  >
                    Scan Another QR Code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Scan a QR code to view product details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use QR Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Supported QR Codes</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Individual Product QR codes</li>
                <li>• Main Product QR codes</li>
                <li>• Production batch QR codes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What You Can Do</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• View product specifications</li>
                <li>• Check stock levels</li>
                <li>• Access production details</li>
                <li>• Navigate to product pages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
