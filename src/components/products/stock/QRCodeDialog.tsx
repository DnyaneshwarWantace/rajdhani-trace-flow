import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
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

          {/* QR Code Display - Placeholder for now */}
          <div className="flex justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <QrCode className="w-24 h-24 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-500">QR Code will be generated here</p>
              <p className="text-xs text-gray-400 mt-2">
                QR Code generation functionality to be implemented
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

