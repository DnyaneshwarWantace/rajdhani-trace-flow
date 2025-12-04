import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Customer, CreateCustomerData } from '@/services/customerService';

interface CustomerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: CreateCustomerData;
  onFormDataChange: (data: CreateCustomerData) => void;
  selectedCustomer: Customer | null;
  submitting: boolean;
}

export default function CustomerFormDialog({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  selectedCustomer,
  submitting,
}: CustomerFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {selectedCustomer ? 'Update customer information' : 'Enter customer details'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div>
            <Label>Customer Type *</Label>
            <Select
              value={formData.customer_type}
              onValueChange={(v: 'individual' | 'business') =>
                onFormDataChange({ ...formData, customer_type: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>GST Number</Label>
              <Input
                value={formData.gst_number}
                onChange={(e) => onFormDataChange({ ...formData, gst_number: e.target.value })}
                maxLength={15}
              />
            </div>
          </div>

          {formData.customer_type === 'business' && (
            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company_name}
                onChange={(e) => onFormDataChange({ ...formData, company_name: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.city}
                onChange={(e) => onFormDataChange({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={formData.state}
                onChange={(e) => onFormDataChange({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <Label>Pincode</Label>
              <Input
                value={formData.pincode}
                onChange={(e) => onFormDataChange({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <Label>Credit Limit (₹)</Label>
            <Input
              type="text"
              value={formData.credit_limit}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                  onFormDataChange({ ...formData, credit_limit: v });
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedCustomer ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

