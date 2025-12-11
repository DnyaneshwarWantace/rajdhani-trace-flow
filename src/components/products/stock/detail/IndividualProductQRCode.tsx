import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductQRCodeProps {
  individualProduct: IndividualProduct;
  productId?: string;
}

export default function IndividualProductQRCode({ individualProduct, productId }: IndividualProductQRCodeProps) {
  // Generate QR code URL for individual product
  const qrCodeData = JSON.stringify({
    type: 'individual',
    individualProductId: individualProduct.id,
    productId: productId || individualProduct.product_id,
  });

  const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    `${window.location.origin}/qr-result?data=${encodeURIComponent(qrCodeData)}`
  )}`;

  const handleDownload = async () => {
    try {
      // Fetch the QR code image
      const response = await fetch(qrCodeURL);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename from QR code
      const qrCode = individualProduct.qr_code || individualProduct.id;
      const filename = `product_${qrCode}_qr_code.png`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code. Please try again.');
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary-600" />
          QR Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8">
          {individualProduct.qr_code || individualProduct.id ? (
            <>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
                  <img
                    src={qrCodeURL}
                    alt={`QR Code for ${individualProduct.qr_code || individualProduct.id}`}
                    className="w-64 h-64"
                  />
                </div>
              </div>
              
              <div className="font-mono text-sm bg-gray-50 p-4 rounded-lg border max-w-md mx-auto shadow-sm break-all mb-4">
                {individualProduct.qr_code || individualProduct.id}
              </div>
              
              <p className="text-sm text-gray-600 text-center mb-4">
                Scan this QR code to access detailed individual product information
              </p>
              
              <Button onClick={handleDownload} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white">
                <Download className="w-4 h-4" />
                Download QR Code
              </Button>
            </>
          ) : (
            <div className="w-64 h-64 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-sm text-gray-500">No QR Code Available</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


