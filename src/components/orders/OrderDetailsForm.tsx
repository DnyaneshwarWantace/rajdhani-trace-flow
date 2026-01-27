import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateNumberInput, ValidationPresets } from '@/utils/numberValidation';
import { useToast } from '@/hooks/use-toast';

interface OrderDetailsFormProps {
  expectedDelivery: string;
  paidAmount: number;
  notes: string;
  remarks?: string;
  totalAmount?: number;
  onExpectedDeliveryChange: (value: string) => void;
  onPaidAmountChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  onRemarksChange?: (value: string) => void;
}

export default function OrderDetailsForm({
  expectedDelivery,
  paidAmount,
  notes,
  remarks = '',
  totalAmount,
  onExpectedDeliveryChange,
  onPaidAmountChange,
  onNotesChange,
  onRemarksChange,
}: OrderDetailsFormProps) {
  const { toast } = useToast();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Expected Delivery Date</Label>
          <Input
            type="date"
            value={expectedDelivery}
            onChange={e => onExpectedDeliveryChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-2">
          <Label>Advance Payment (Optional)</Label>
          <Input
            type="number"
            value={paidAmount > 0 ? paidAmount.toString() : ''}
            placeholder=""
            onChange={e => {
              const inputValue = e.target.value;
              
              // Allow empty string
              if (inputValue === '') {
                onPaidAmountChange(0);
                return;
              }
              
              const validation = validateNumberInput(inputValue, ValidationPresets.PRICE);
              const newPaidAmount = parseFloat(validation.value) || 0;
              
              // Validate that paid amount doesn't exceed total amount
              if (totalAmount && newPaidAmount > totalAmount) {
                toast({
                  title: 'Validation Error',
                  description: `Paid amount cannot exceed total amount of ${totalAmount.toLocaleString()}`,
                  variant: 'destructive',
                });
                return;
              }
              
              onPaidAmountChange(newPaidAmount);
            }}
            min="0"
            max={totalAmount || "9999999.99"}
            step="0.01"
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Additional notes or special instructions..."
            rows={3}
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>Remarks (for Invoice)</Label>
          <Textarea
            value={remarks || ''}
            onChange={e => onRemarksChange ? onRemarksChange(e.target.value) : undefined}
            placeholder="Remarks to display on invoice (optional)..."
            rows={3}
            disabled={!onRemarksChange}
          />
          <p className="text-xs text-gray-500">This will appear on the invoice instead of standard terms & conditions</p>
        </div>
      </CardContent>
    </Card>
  );
}


