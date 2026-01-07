import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface OrderDetailsFormProps {
  expectedDelivery: string;
  paidAmount: number;
  notes: string;
  remarks?: string;
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
  onExpectedDeliveryChange,
  onPaidAmountChange,
  onNotesChange,
  onRemarksChange,
}: OrderDetailsFormProps) {
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
            value={paidAmount || ''}
            onChange={e => onPaidAmountChange(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            placeholder="Enter advance payment"
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


