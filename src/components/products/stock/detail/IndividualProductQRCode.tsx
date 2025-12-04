import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductQRCodeProps {
  individualProduct: IndividualProduct;
}

export default function IndividualProductQRCode({ individualProduct }: IndividualProductQRCodeProps) {
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
          {individualProduct.qr_code ? (
            <>
              <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <QrCode className="w-24 h-24 mx-auto text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 font-mono break-all px-4">
                    {individualProduct.qr_code}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Scan this QR code to view product details
              </p>
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

