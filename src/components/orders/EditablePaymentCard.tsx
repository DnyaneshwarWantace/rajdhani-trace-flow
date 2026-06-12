import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Edit, Check, X } from 'lucide-react';
import { formatCurrency, formatIndianDateTime } from '@/utils/formatHelpers';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';
import { useToast } from '@/hooks/use-toast';

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
  readOnly?: boolean;
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
  readOnly = false,
}: EditablePaymentCardProps) {
  const { toast } = useToast();
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [amountToAdd, setAmountToAdd] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [amountToAddInput, setAmountToAddInput] = useState('');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  useEffect(() => {
    if (readOnly) setIsAddingPayment(false);
  }, [readOnly]);

  const handleSave = async () => {
    if (amountToAdd <= 0) {
      toast({ title: 'Validation Error', description: 'Enter a valid payment amount', variant: 'destructive' });
      return;
    }
    if (amountToAdd > outstandingAmount) {
      toast({ title: 'Validation Error', description: `Payment cannot exceed balance due of ${formatCurrency(outstandingAmount, { full: true })}`, variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await onUpdatePayment(paidAmount + amountToAdd);
      setIsAddingPayment(false);
      setAmountToAdd(0);
      setAmountToAddInput('');
    } catch (error: any) {
      toast({ title: 'Error', description: error?.message || 'Failed to add payment', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAmountToAdd(0);
    setAmountToAddInput('');
    setIsAddingPayment(false);
  };

  const newOutstanding = Math.max(0, outstandingAmount - amountToAdd);

  // ── Mobile UI ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-base font-bold text-gray-900">Payment Summary</span>
            </div>
            {!readOnly && !isAddingPayment && outstandingAmount > 0 && (
              <button
                onClick={() => { setIsAddingPayment(true); setAmountToAddInput(''); setAmountToAdd(0); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Rows */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(subtotal.toString()), { full: true })}</span>
            </div>

            {gstAmount && parseFloat(gstAmount.toString()) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">GST</span>
                <span className="font-semibold text-gray-900">{formatCurrency(parseFloat(gstAmount.toString()), { full: true })}</span>
              </div>
            )}

            {discountAmount && parseFloat(discountAmount.toString()) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-semibold text-red-600">-{formatCurrency(parseFloat(discountAmount.toString()), { full: true })}</span>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-lg text-gray-900">{formatCurrency(totalAmount, { full: true })}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paid</span>
              <span className="font-bold text-green-600">{formatCurrency(paidAmount, { full: true })}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Balance Due</span>
              <span className={`font-bold ${outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(outstandingAmount, { full: true })}
              </span>
            </div>
          </div>

          {/* Payment history */}
          {paymentHistory && paymentHistory.length > 0 && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment History</p>
              <div className="space-y-2">
                {paymentHistory.map((h, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-semibold text-gray-900">{h.changed_by}</span>
                      <span className={`text-sm font-bold ${h.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {h.amount >= 0 ? '+' : ''}{formatCurrency(h.amount, { full: true })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatIndianDateTime(h.changed_at)}</p>
                    {h.notes && <p className="text-xs text-gray-500 italic mt-0.5">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Payment bottom sheet */}
        {isAddingPayment && (
          <>
            <div className="fixed inset-0 z-[70] bg-black/40" onClick={handleCancel} />
            <div className="fixed bottom-0 left-0 right-0 z-[71] bg-white rounded-t-3xl shadow-2xl">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="px-5 pt-2 pb-4 flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">Add Payment</p>
                <button onClick={handleCancel} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="px-5 pb-8 space-y-4">
                <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance Due</span>
                    <span className="font-bold text-red-600">{formatCurrency(outstandingAmount, { full: true })}</span>
                  </div>
                  {amountToAdd > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">New Balance</span>
                      <span className={`font-bold ${newOutstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {formatCurrency(newOutstanding, { full: true })}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Amount to Add</Label>
                  <Input
                    type="number"
                    value={amountToAddInput}
                    placeholder={`Max ₹${outstandingAmount}`}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') { setAmountToAddInput(''); setAmountToAdd(0); return; }
                      const validation = validateNumberInput(v, ValidationPresets.PRICE);
                      const n = parseFloat(validation.value) || 0;
                      if (n > outstandingAmount) {
                        setAmountToAddInput(outstandingAmount.toString());
                        setAmountToAdd(outstandingAmount);
                        return;
                      }
                      setAmountToAddInput(validation.value);
                      setAmountToAdd(n);
                    }}
                    onKeyDown={preventInvalidNumberKeys}
                    className="h-12 text-base rounded-xl"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving || amountToAdd <= 0}
                  className="w-full h-14 rounded-2xl bg-blue-600 text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  {isSaving ? 'Saving...' : 'Add Payment'}
                </button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  // ── Desktop UI (unchanged) ────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="w-5 h-5" />
            Payment Summary
          </CardTitle>
          {!readOnly && !isAddingPayment && outstandingAmount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setIsAddingPayment(true); setAmountToAddInput(''); setAmountToAdd(0); }}>
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">{formatCurrency(parseFloat(subtotal.toString()), { full: true })}</span>
        </div>
        {gstAmount && parseFloat(gstAmount.toString()) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">GST</span>
            <span className="font-semibold">{formatCurrency(parseFloat(gstAmount.toString()), { full: true })}</span>
          </div>
        )}
        {discountAmount && parseFloat(discountAmount.toString()) > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Discount</span>
            <span className="font-semibold text-red-600">-{formatCurrency(parseFloat(discountAmount.toString()), { full: true })}</span>
          </div>
        )}
        <div className="flex justify-between pt-3 border-t">
          <span className="font-semibold">Total Amount</span>
          <span className="font-bold text-lg">{formatCurrency(totalAmount, { full: true })}</span>
        </div>
        {isAddingPayment && !readOnly ? (
          <div className="space-y-3 pt-3 border-t">
            <div className="space-y-2">
              <Label>Payment Amount to Add</Label>
              <Input
                type="number"
                value={amountToAddInput}
                placeholder={`Max: ${outstandingAmount}`}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') { setAmountToAddInput(''); setAmountToAdd(0); return; }
                  const validation = validateNumberInput(v, ValidationPresets.PRICE);
                  const n = parseFloat(validation.value) || 0;
                  if (n > outstandingAmount) {
                    setAmountToAddInput(outstandingAmount.toString());
                    setAmountToAdd(outstandingAmount);
                    return;
                  }
                  setAmountToAddInput(validation.value);
                  setAmountToAdd(n);
                }}
                onKeyDown={preventInvalidNumberKeys}
                min="0" max={outstandingAmount} step="0.01" autoFocus
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Balance Due</span>
              <span className={`font-semibold ${newOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(newOutstanding, { full: true })}
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                <Check className="w-4 h-4 mr-2" />Add
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving} className="flex-1">
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid</span>
              <span className="font-semibold text-green-600">{formatCurrency(paidAmount, { full: true })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Balance Due</span>
              <span className={`font-semibold ${outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(outstandingAmount, { full: true })}
              </span>
            </div>
          </>
        )}
        {paymentHistory && paymentHistory.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {paymentHistory.map((h, i) => (
                <div key={i} className="text-xs bg-gray-50 p-3 rounded">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900">{h.changed_by}</span>
                    <span className={`font-semibold ${h.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {h.amount >= 0 ? '+' : ''}{formatCurrency(h.amount, { full: true })}
                    </span>
                  </div>
                  <div className="text-gray-600">{formatCurrency(h.previous_paid_amount, { full: true })} → {formatCurrency(h.new_paid_amount, { full: true })}</div>
                  <div className="text-gray-500 mt-1">{formatIndianDateTime(h.changed_at)}</div>
                  {h.notes && <div className="text-gray-600 mt-1 italic">{h.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
