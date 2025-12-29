import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Edit, Check, X } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

interface PaymentHistory {
  amount: number;
  previous_paid_amount: number;
  new_paid_amount: number;
  changed_by: string;
  changed_by_email: string;
  changed_at: string;
  notes?: string;
}

interface EditablePaymentCardProps {
  subtotal: string | number;
  gstAmount: string | number;
  discountAmount?: string | number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentHistory?: PaymentHistory[];
  onUpdatePayment: (paidAmount: number) => Promise<void>;
}

export function EditablePaymentCard({
  subtotal,
  gstAmount,
  discountAmount,
  totalAmount,
  paidAmount,
  outstandingAmount,
  paymentHistory,
  onUpdatePayment,
}: EditablePaymentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPaidAmount, setEditedPaidAmount] = useState(paidAmount);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdatePayment(editedPaidAmount);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating payment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPaidAmount(paidAmount);
    setIsEditing(false);
  };

  const calculatedOutstanding = totalAmount - editedPaidAmount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-5 h-5" />
            Payment Summary
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">{formatCurrency(parseFloat(subtotal.toString()))}</span>
        </div>

        {gstAmount && parseFloat(gstAmount.toString()) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST</span>
            <span className="font-semibold">{formatCurrency(parseFloat(gstAmount.toString()))}</span>
          </div>
        )}

        {discountAmount && parseFloat(discountAmount.toString()) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount</span>
            <span className="font-semibold text-red-600">-{formatCurrency(parseFloat(discountAmount.toString()))}</span>
          </div>
        )}

        <div className="flex justify-between pt-3 border-t">
          <span className="font-semibold">Total Amount</span>
          <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
        </div>

        {isEditing ? (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <Label>Paid Amount</Label>
              <Input
                type="number"
                value={editedPaidAmount}
                onChange={(e) => setEditedPaidAmount(parseFloat(e.target.value) || 0)}
                min="0"
                max={totalAmount}
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Outstanding</span>
              <span className={`font-semibold ${calculatedOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(calculatedOutstanding)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid</span>
              <span className="font-semibold text-green-600">{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Outstanding</span>
              <span className={`font-semibold ${outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(outstandingAmount)}
              </span>
            </div>
          </>
        )}

        {/* Payment History */}
        {paymentHistory && paymentHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {paymentHistory.map((history, index) => (
                <div key={index} className="text-xs bg-gray-50 p-3 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{history.changed_by}</span>
                    <span className={`font-semibold ${history.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {history.amount >= 0 ? '+' : ''}{formatCurrency(history.amount)}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    {formatCurrency(history.previous_paid_amount)} → {formatCurrency(history.new_paid_amount)}
                  </div>
                  <div className="text-gray-500 mt-1">
                    {new Date(history.changed_at).toLocaleString()}
                  </div>
                  {history.notes && (
                    <div className="text-gray-600 mt-1 italic">{history.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
