import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

interface PaymentSummaryCardProps {
  subtotal: string;
  gstAmount: string;
  discountAmount?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export function PaymentSummaryCard({
  subtotal,
  gstAmount,
  discountAmount,
  totalAmount,
  paidAmount,
  outstandingAmount
}: PaymentSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="w-5 h-5" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">{formatCurrency(parseFloat(subtotal || '0'))}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">GST Amount</span>
          <span className="font-semibold text-blue-600">{formatCurrency(parseFloat(gstAmount || '0'))}</span>
        </div>
        {discountAmount && parseFloat(discountAmount) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount</span>
            <span className="font-semibold text-red-600">
              -{formatCurrency(parseFloat(discountAmount))}
            </span>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t">
          <span className="font-semibold text-lg">Total Amount</span>
          <span className="font-bold text-xl">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t">
          <span className="text-gray-600">Paid Amount</span>
          <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t">
          <span className="font-semibold text-base">Outstanding</span>
          <span className="font-bold text-lg text-red-600">
            {formatCurrency(outstandingAmount)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
