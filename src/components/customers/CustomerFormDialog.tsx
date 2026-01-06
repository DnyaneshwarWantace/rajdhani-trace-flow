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
import { useState } from 'react';
import { GSTApiService } from '@/services/gstApiService';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

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
  // Phone number - preserve country code when clearing (same as SupplierFormDialog)
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

  // Handler for name fields (max 8 words, max 20 chars per word)
  const handleNameChange = (value: string, field: 'name' | 'company_name') => {
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
    if (gstValue.length === 15) {
      setFetchingGST(true);
      try {
        const { data, error } = await GSTApiService.getCustomerDetailsFromGST(gstValue);

        if (error) {
          setGstError(error);
        } else if (data) {
          // Auto-fill customer details from GST data
          onFormDataChange({
            ...formData,
            gst_number: gstValue,
            name: data.name || formData.name,
            company_name: data.companyName || formData.company_name,
            address: data.address || formData.address,
            city: data.city || formData.city,
            state: data.state || formData.state,
            pincode: data.pincode || formData.pincode,
          });
        }
      } catch (error) {
        console.error('Error fetching GST details:', error);
        setGstError('Failed to fetch GST details');
      } finally {
        setFetchingGST(false);
      }
    }
  };

  // Handler for address fields with different limits based on field type
  const handleAddressChange = (value: string, field: 'address' | 'city' | 'state'): string => {
    let inputValue = value;

    // For city and state, allow only letters and spaces
    if (field === 'city' || field === 'state') {
      inputValue = inputValue.replace(/[^a-zA-Z\s]/g, '');
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
    return inputValue;
  };

  const nameWordCount = formData.name.trim() ? formData.name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const companyWordCount = formData.company_name?.trim() ? formData.company_name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  // Future word-count validation (currently unused)
  // const addressWordCount = ...
  // const cityWordCount = ...
  // const stateWordCount = ...

  // Handler for pincode (max 10 digits) with auto-fill
  const [fetchingLocation, setFetchingLocation] = useState(false);

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
                onChange={(e) => handleNameChange(e.target.value, 'name')}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                {nameWordCount}/8 words • Max 20 characters per word
              </p>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <PhoneInput
                defaultCountry="in"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="Enter phone number"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select country and enter number
              </p>
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
          </div>

          {formData.customer_type === 'business' && (
            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company_name || ''}
                onChange={(e) => handleNameChange(e.target.value, 'company_name')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {companyWordCount}/50 words • Max 20 characters per word
              </p>
            </div>
          )}

          {/* Permanent Address */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Permanent Address</h3>

            <div>
              <Label>Address</Label>
              <Input
                value={formData.permanentAddress?.address || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleAddressChange(value, 'address');
                  onFormDataChange({
                    ...formData,
                    permanentAddress: { ...formData.permanentAddress!, address: value }
                  });
                }}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max 100 words • Max 20 characters per word
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <Label>City</Label>
                <Input
                  value={formData.permanentAddress?.city || ''}
                  onChange={(e) => {
                    const cleaned = handleAddressChange(e.target.value, 'city');
                    onFormDataChange({
                      ...formData,
                      permanentAddress: { ...formData.permanentAddress!, city: cleaned }
                    });
                  }}
                  placeholder="e.g., Mumbai"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max 3 words • Max 25 characters per word
                </p>
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={formData.permanentAddress?.state || ''}
                  onChange={(e) => {
                    const cleaned = handleAddressChange(e.target.value, 'state');
                    onFormDataChange({
                      ...formData,
                      permanentAddress: { ...formData.permanentAddress!, state: cleaned }
                    });
                  }}
                  placeholder="e.g., Maharashtra"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max 3 words • Max 25 characters per word
                </p>
              </div>
              <div>
                <Label>Pincode</Label>
                <div className="relative">
                  <Input
                    value={formData.permanentAddress?.pincode || ''}
                    onChange={async (e) => {
                      const numericValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                      onFormDataChange({
                        ...formData,
                        permanentAddress: { ...formData.permanentAddress!, pincode: numericValue }
                      });

                      if (numericValue.length === 6) {
                        setFetchingLocation(true);
                        try {
                          const response = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
                          const data = await response.json();
                          if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                            const postOffice = data[0].PostOffice[0];
                            onFormDataChange({
                              ...formData,
                              permanentAddress: {
                                ...formData.permanentAddress!,
                                pincode: numericValue,
                                city: postOffice.District || formData.permanentAddress?.city || '',
                                state: postOffice.State || formData.permanentAddress?.state || '',
                              }
                            });
                          }
                        } catch (error) {
                          console.error('Error fetching location:', error);
                        } finally {
                          setFetchingLocation(false);
                        }
                      }
                    }}
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
          </div>

          {/* Delivery Address */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Delivery Address</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sameAsPermanent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onFormDataChange({
                      ...formData,
                      sameAsPermanent: checked,
                      deliveryAddress: checked ? formData.permanentAddress : formData.deliveryAddress
                    });
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">Same as Permanent</span>
              </label>
            </div>

            {!formData.sameAsPermanent && (
              <>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.deliveryAddress?.address || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleAddressChange(value, 'address');
                      onFormDataChange({
                        ...formData,
                        deliveryAddress: { ...formData.deliveryAddress!, address: value }
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 100 words • Max 20 characters per word
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.deliveryAddress?.city || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleAddressChange(value, 'city');
                        onFormDataChange({
                          ...formData,
                          deliveryAddress: { ...formData.deliveryAddress!, city: value }
                        });
                      }}
                      placeholder="e.g., Mumbai"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 3 words • Max 25 characters per word
                    </p>
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.deliveryAddress?.state || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        handleAddressChange(value, 'state');
                        onFormDataChange({
                          ...formData,
                          deliveryAddress: { ...formData.deliveryAddress!, state: value }
                        });
                      }}
                      placeholder="e.g., Maharashtra"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 3 words • Max 25 characters per word
                    </p>
                  </div>
                  <div>
                    <Label>Pincode</Label>
                    <div className="relative">
                      <Input
                        value={formData.deliveryAddress?.pincode || ''}
                        onChange={async (e) => {
                          const numericValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                          onFormDataChange({
                            ...formData,
                            deliveryAddress: { ...formData.deliveryAddress!, pincode: numericValue }
                          });

                          if (numericValue.length === 6) {
                            setFetchingLocation(true);
                            try {
                              const response = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
                              const data = await response.json();
                              if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                                const postOffice = data[0].PostOffice[0];
                                onFormDataChange({
                                  ...formData,
                                  deliveryAddress: {
                                    ...formData.deliveryAddress!,
                                    pincode: numericValue,
                                    city: postOffice.District || formData.deliveryAddress?.city || '',
                                    state: postOffice.State || formData.deliveryAddress?.state || '',
                                  }
                                });
                              }
                            } catch (error) {
                              console.error('Error fetching location:', error);
                            } finally {
                              setFetchingLocation(false);
                            }
                          }
                        }}
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
              </>
            )}
          </div>

          {/* Notes */}
          <div className="mt-4">
            <Label>Notes</Label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary-600 hover:bg-primary-700 text-white disabled:bg-primary-400 disabled:text-white">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedCustomer ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

