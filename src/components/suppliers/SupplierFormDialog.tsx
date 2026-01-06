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
import { useState } from 'react';
import { GSTApiService } from '@/services/gstApiService';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

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
  // Handler for name fields with different limits
  const handleNameChange = (value: string, field: 'name' | 'contact_person') => {
    let inputValue = value;

    // Different limits for different fields
    const limits = {
      name: { maxWords: 8, maxCharsPerWord: 20 },
      contact_person: { maxWords: 5, maxCharsPerWord: 25 }
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

  // Handler for GST number (exactly 15 chars, auto uppercase, with autofill)
  const [fetchingGST, setFetchingGST] = useState(false);
  const [gstError, setGstError] = useState<string | null>(null);

  const handleGSTChange = async (value: string) => {
    // Remove any non-alphanumeric characters
    let gstValue = value.replace(/[^a-zA-Z0-9]/g, '');

    // Convert to uppercase
    gstValue = gstValue.toUpperCase();

    // Limit to 15 characters
    gstValue = gstValue.slice(0, 15);

    onFormDataChange({ ...formData, gst_number: gstValue });
    setGstError(null);

    // Auto-fetch details when GST number is complete (15 characters)
    // Only validate format if it's a new entry (not editing existing)
    if (gstValue.length === 15) {
      setFetchingGST(true);
      try {
        const { data, error } = await GSTApiService.getCustomerDetailsFromGST(gstValue);

        if (error) {
          // Only show error if it's not a format validation error (allow manual entry)
          // Format errors are shown but don't block submission
          if (error.includes('Invalid GST number format')) {
            // Don't set error for format issues when editing - allow manual entry
            setGstError(null);
          } else {
            setGstError(error);
          }
        } else if (data) {
          // Auto-fill supplier details from GST data
          onFormDataChange({
            ...formData,
            gst_number: gstValue,
            name: data.companyName || formData.name,
            contact_person: data.name || formData.contact_person,
            address: data.address || formData.address,
            city: data.city || formData.city,
            state: data.state || formData.state,
            pincode: data.pincode || formData.pincode,
          });
        }
      } catch (error) {
        console.error('Error fetching GST details:', error);
        // Don't show error for API failures - allow manual entry
        setGstError(null);
      } finally {
        setFetchingGST(false);
      }
    }
  };

  // Handler for address fields with different limits based on field type
  const handleAddressChange = (value: string, field: 'address' | 'city' | 'state') => {
    let inputValue = value;

    // For city and state, reject numbers
    if (field === 'city' || field === 'state') {
      // Remove any digits from city and state
      inputValue = inputValue.replace(/\d/g, '');
    }

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

  // Phone number - same as CustomerForm on new order page
  const handlePhoneChange = (value: string) => {
    // If value is empty or just country code, preserve country code from current value
    if (!value || value.trim() === '') {
      // Extract country code from current formData.phone
      const currentPhone = formData.phone || '+91';
      const countryCodeMatch = currentPhone.match(/^(\+\d+)/);
      if (countryCodeMatch) {
        // Keep only country code
        onFormDataChange({ ...formData, phone: countryCodeMatch[1] });
        return;
      }
      // Default to India if no previous value
      onFormDataChange({ ...formData, phone: '+91' });
      return;
    }

    // Check if it's just a country code (e.g., +91, +1, +44)
    const countryCodeOnly = /^\+\d{1,4}$/.test(value);
    if (countryCodeOnly) {
      // Just country code, keep it
      onFormDataChange({ ...formData, phone: value });
      return;
    }

    // Update with full phone number
    onFormDataChange({ ...formData, phone: value });
  };

  // Handler for pincode (max 10 digits) with auto-fill
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handlePincodeChange = async (value: string) => {
    // Only allow digits and limit to 10 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    onFormDataChange({ ...formData, pincode: numericValue });

    // Auto-fetch city and state when pincode is 6 digits (Indian pincode format)
    if (numericValue.length === 6) {
      setFetchingLocation(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
        const data = await response.json();

        if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          onFormDataChange({
            ...formData,
            pincode: numericValue,
            city: postOffice.District || formData.city,
            state: postOffice.State || formData.state,
          });
        }
      } catch (error) {
        console.error('Error fetching location from pincode:', error);
      } finally {
        setFetchingLocation(false);
      }
    }
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
                placeholder="e.g., John Doe"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {contactWordCount}/5 words • Max 25 characters per word
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
              <PhoneInput
                defaultCountry="in"
                value={formData.phone || '+91'}
                onChange={handlePhoneChange}
                placeholder="Enter phone number"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select country and enter number
              </p>
            </div>
          </div>

          <div>
            <Label>GST Number</Label>
            <div className="relative">
              <Input
                value={formData.gst_number}
                onChange={(e) => handleGSTChange(e.target.value)}
                maxLength={15}
                placeholder="27AAPFU0939F1ZV"
                className="uppercase"
              />
              {fetchingGST && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              )}
            </div>
            {formData.gst_number && formData.gst_number.length !== 15 && !gstError && (
              <p className="text-xs text-red-500 mt-1">
                GST must be exactly 15 characters ({formData.gst_number.length}/15)
              </p>
            )}
            {gstError && (
              <p className="text-xs text-amber-600 mt-1">
                {gstError}
              </p>
            )}
            {formData.gst_number && formData.gst_number.length === 15 && !gstError && !fetchingGST && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Auto-filled from GST
              </p>
            )}
          </div>

          <div>
            <Label>Address</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => handleAddressChange(e.target.value, 'address')}
              placeholder="e.g., Building name, Street"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {addressWordCount}/100 words • Max 20 characters per word
            </p>
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
              <div className="relative">
                <Input
                  value={formData.pincode || ''}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="e.g., 400001"
                  maxLength={10}
                />
                {fetchingLocation && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Max 10 digits • Auto-fills city & state
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary-600 hover:bg-primary-700 text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedSupplier ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

