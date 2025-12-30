import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatHelpers';

interface OrderSummaryProps {
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting?: boolean;
}

export default function OrderSummary({
  subtotal,
  gstAmount,
  totalAmount,
  paidAmount,
  onCancel,
  onSubmit,
  canSubmit,
  isSubmitting = false,
}: OrderSummaryProps) {
  const outstandingAmount = totalAmount - paidAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST:</span>
            <span>{formatCurrency(gstAmount)}</span>
          </div>
          <div className="flex justify-between font-medium text-lg border-t pt-2">
            <span>Total Amount:</span>
            <span className="text-primary">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid Amount:</span>
            <span className="text-green-600">{formatCurrency(paidAmount)}</span>
          </div>
          <div className="flex justify-between font-medium text-lg border-t pt-2">
            <span>Outstanding Amount:</span>
            <span className="text-orange-600">{formatCurrency(outstandingAmount)}</span>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} className="flex-1" disabled={!canSubmit || isSubmitting}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Creating Order...' : 'Create Order'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


