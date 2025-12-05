import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Download } from 'lucide-react';
import type { IndividualProduct, Product } from '@/types/product';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProduct: IndividualProduct | null;
  product: Product | null;
}

export default function QRCodeDialog({
  open,
  onOpenChange,
  individualProduct,
  product,
}: QRCodeDialogProps) {
  if (!individualProduct) return null;

  // Generate QR code URL for individual product
  const qrCodeData = JSON.stringify({
    type: 'individual',
    individualProductId: individualProduct.id,
    productId: individualProduct.product_id,
  });

  const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
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
      
      // Generate filename from product name and QR code
      const productName = (individualProduct.product_name || product?.name || 'product').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const qrCode = individualProduct.qr_code || individualProduct.id;
      const filename = `${productName}_${qrCode}_qr_code.png`;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Individual Product QR Code
          </DialogTitle>
          <DialogDescription>
            Scan this QR code to view individual product details and specifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Product:</strong> {individualProduct.product_name || product?.name}
            </p>
            <p>
              <strong>QR Code:</strong> {individualProduct.qr_code}
            </p>
            <p>
              <strong>Status:</strong> {individualProduct.status}
            </p>
            <p>
              <strong>Quality Grade:</strong> {individualProduct.quality_grade}
            </p>
            <p>
              <strong>Production Date:</strong>{' '}
              {individualProduct.production_date &&
              individualProduct.production_date !== 'null'
                ? new Date(individualProduct.production_date).toLocaleDateString()
                : individualProduct.completion_date &&
                  individualProduct.completion_date !== 'null'
                ? new Date(individualProduct.completion_date).toLocaleDateString()
                : 'N/A'}
            </p>
            <p>
              <strong>Inspector:</strong> {individualProduct.inspector || 'N/A'}
            </p>
            <p>
              <strong>Location:</strong> {individualProduct.location || 'Not specified'}
            </p>
          </div>

          {/* QR Code Display */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <QrCode className="w-6 h-6 text-primary-600" />
              <h4 className="font-semibold text-gray-900">Individual Product QR Code</h4>
            </div>

            <div className="flex justify-center mb-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
                <img
                  src={qrCodeURL}
                  alt={`QR Code for ${individualProduct.product_name || product?.name || 'Product'}`}
                  className="w-48 h-48"
                />
              </div>
            </div>

            <div className="font-mono text-sm bg-white p-4 rounded-lg border max-w-md mx-auto shadow-sm break-all">
              {individualProduct.qr_code || individualProduct.id}
            </div>

            <p className="text-gray-600 mt-4">
              Scan this QR code to access detailed individual product information
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download QR Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

