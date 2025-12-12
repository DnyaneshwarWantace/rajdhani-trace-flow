import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Supplier, CreateSupplierData } from '@/services/supplierService';

interface SupplierFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: CreateSupplierData;
  onFormDataChange: (data: CreateSupplierData) => void;
  selectedSupplier: Supplier | null;
  submitting: boolean;
}

export default function SupplierFormDialog({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormDataChange,
  selectedSupplier,
  submitting,
}: SupplierFormDialogProps) {
  // Handler for name fields (max 8 words, max 20 chars per word)
  const handleNameChange = (value: string, field: 'name' | 'contact_person') => {
    let inputValue = value;

    // Split by spaces to get words (preserve all spaces)
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to 8 words - if exceeded, truncate at the 8th word
    if (words.length > 8) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === 8) {
            let endPos = i;
            while (endPos < inputValue.length && inputValue[endPos] !== ' ') {
              endPos++;
            }
            pos = endPos;
            break;
          }
        }
      }
      inputValue = inputValue.substring(0, pos);
    }

    // Limit each word to 20 characters (preserve spaces)
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim().length > 0) {
        return part.length > 20 ? part.slice(0, 20) : part;
      }
      return part;
    });

    inputValue = processedParts.join('');
    onFormDataChange({ ...formData, [field]: inputValue });
  };

  // Handler for GST number (exactly 15 chars, auto uppercase)
  const handleGSTChange = (value: string) => {
    // Remove any non-alphanumeric characters
    let gstValue = value.replace(/[^a-zA-Z0-9]/g, '');

    // Convert to uppercase
    gstValue = gstValue.toUpperCase();

    // Limit to 15 characters
    gstValue = gstValue.slice(0, 15);

    onFormDataChange({ ...formData, gst_number: gstValue });
  };

  // Handler for address fields with different limits based on field type
  const handleAddressChange = (value: string, field: 'address' | 'city' | 'state') => {
    let inputValue = value;

    // Different limits for different fields
    const limits = {
      address: { maxWords: 100, maxCharsPerWord: 20 },
      city: { maxWords: 3, maxCharsPerWord: 25 },
      state: { maxWords: 3, maxCharsPerWord: 25 }
    };

    const { maxWords, maxCharsPerWord } = limits[field];

    // Split by spaces to get words (preserve all spaces)
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to max words
    if (words.length > maxWords) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === maxWords) {
            let endPos = i;
            while (endPos < inputValue.length && inputValue[endPos] !== ' ') {
              endPos++;
            }
            pos = endPos;
            break;
          }
        }
      }
      inputValue = inputValue.substring(0, pos);
    }

    // Limit each word to max characters (preserve spaces)
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) {
        return part;
      } else if (part.trim().length > 0) {
        return part.length > maxCharsPerWord ? part.slice(0, maxCharsPerWord) : part;
      }
      return part;
    });

    inputValue = processedParts.join('');
    onFormDataChange({ ...formData, [field]: inputValue });
  };

  const nameWordCount = formData.name.trim() ? formData.name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const contactWordCount = formData.contact_person?.trim() ? formData.contact_person.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const addressWordCount = formData.address?.trim() ? formData.address.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const cityWordCount = formData.city?.trim() ? formData.city.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const stateWordCount = formData.state?.trim() ? formData.state.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  // Handler for pincode (max 10 digits)
  const handlePincodeChange = (value: string) => {
    // Only allow digits and limit to 10 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    onFormDataChange({ ...formData, pincode: numericValue });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogDescription>
            {selectedSupplier ? 'Update supplier information' : 'Enter supplier details'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value, 'name')}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {nameWordCount}/8 words • Max 20 characters per word
              </p>
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={formData.contact_person || ''}
                onChange={(e) => handleNameChange(e.target.value, 'contact_person')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {contactWordCount}/50 words • Max 20 characters per word
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>GST Number</Label>
            <Input
              value={formData.gst_number}
              onChange={(e) => handleGSTChange(e.target.value)}
              maxLength={15}
              placeholder="27AAPFU0939F1ZV"
              className="uppercase"
            />
            {formData.gst_number && formData.gst_number.length !== 15 && (
              <p className="text-xs text-red-500 mt-1">
                GST must be exactly 15 characters ({formData.gst_number.length}/15)
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>City</Label>
              <Input
                value={formData.city || ''}
                onChange={(e) => handleAddressChange(e.target.value, 'city')}
                placeholder="e.g., Mumbai"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {cityWordCount}/3 words • Max 25 characters per word
              </p>
            </div>
            <div>
              <Label>State</Label>
              <Input
                value={formData.state || ''}
                onChange={(e) => handleAddressChange(e.target.value, 'state')}
                placeholder="e.g., Maharashtra"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {stateWordCount}/3 words • Max 25 characters per word
              </p>
            </div>
            <div>
              <Label>Pincode</Label>
              <Input
                value={formData.pincode || ''}
                onChange={(e) => handlePincodeChange(e.target.value)}
                placeholder="e.g., 400001"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max 10 digits
              </p>
            </div>
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleAddressChange(e.target.value, 'address')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {addressWordCount}/100 words • Max 20 characters per word
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedSupplier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

