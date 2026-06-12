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
import { Loader2, X } from 'lucide-react';
import type { Customer, CreateCustomerData } from '@/services/customerService';
import { useState, useEffect } from 'react';
import { GSTApiService } from '@/services/gstApiService';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { validateEmail } from '@/utils/formValidation';

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
  // Track which fields have been touched
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const markFieldTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  // Reset touched fields when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTouchedFields(new Set());
      setEmailError(null);
    }
  }, [isOpen]);

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
          // Only show error if it's not a format validation error (allow manual entry)
          // Format errors are shown but don't block submission
          if (error.includes('Invalid GST number format')) {
            // Don't set error for format issues - allow manual entry
            setGstError(null);
          } else {
            setGstError(error);
          }
        } else if (data) {
          // Auto-fill customer details from GST data
          onFormDataChange({
            ...formData,
            gst_number: gstValue,
            name: data.name || formData.name,
            company_name: data.companyName || formData.company_name,
            permanentAddress: {
              address: data.address || formData.permanentAddress?.address || '',
              city: data.city || formData.permanentAddress?.city || '',
              state: data.state || formData.permanentAddress?.state || '',
              pincode: data.pincode || formData.permanentAddress?.pincode || '',
            },
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
  const handleAddressChange = (value: string, field: 'address' | 'city' | 'state'): string => {
    let inputValue = value;

    // For city and state, allow only letters and spaces
    if (field === 'city' || field === 'state') {
      inputValue = inputValue.replace(/[^a-zA-Z\s]/g, '');
    }

    // Different limits for different fields
    const limits = {
      address: { maxWords: 20, maxCharsPerWord: 20 },
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
    return inputValue;
  };

  // Handler specifically for permanent address
  const handlePermanentAddressChange = (value: string, field: 'address' | 'city' | 'state') => {
    const processedValue = handleAddressChange(value, field);
    onFormDataChange({
      ...formData,
      permanentAddress: { ...formData.permanentAddress!, [field]: processedValue }
    });
  };

  // Handler specifically for delivery address
  const handleDeliveryAddressChange = (value: string, field: 'address' | 'city' | 'state') => {
    const processedValue = handleAddressChange(value, field);
    onFormDataChange({
      ...formData,
      deliveryAddress: { ...formData.deliveryAddress!, [field]: processedValue }
    });
  };

  const nameWordCount = formData.name.trim() ? formData.name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const companyWordCount = formData.company_name?.trim() ? formData.company_name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const addressWordCount = formData.permanentAddress?.address?.trim() ? formData.permanentAddress.address.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const deliveryAddressWordCount = formData.deliveryAddress?.address?.trim() ? formData.deliveryAddress.address.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  // Handler for pincode (max 10 digits) with auto-fill
  const [fetchingLocation, setFetchingLocation] = useState(false);

  if (!isOpen) return null;

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 pt-5 pb-3 border-b border-gray-150 shrink-0 bg-white shadow-sm">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">
              {selectedCustomer ? 'Edit Customer' : 'Add Customer'}
            </h2>
            <p className="text-xs text-gray-400">
              {selectedCustomer ? 'Update customer information' : 'Enter customer details'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 shrink-0 active:bg-gray-200 ml-auto"
            disabled={submitting}
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const phoneEmpty = !formData.phone || formData.phone.trim() === '' || formData.phone.trim() === '+91' || /^\+\d{1,4}$/.test(formData.phone.trim());
            if (!formData.name.trim() || phoneEmpty) {
              markFieldTouched('name');
              markFieldTouched('phone');
              return;
            }
            onSubmit();
          }}
          className="flex-1 overflow-y-auto p-4 space-y-4 pb-28"
        >
          {/* Card 1: Customer Type & Name */}
          <div className="bg-white rounded-2xl p-4 border border-gray-150 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Customer Type *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { value: 'individual', label: 'Individual' },
                  { value: 'business', label: 'Business' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onFormDataChange({ ...formData, customer_type: opt.value as any })}
                    className={`h-11 rounded-xl text-sm font-semibold border transition-all ${
                      formData.customer_type === opt.value
                        ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-250'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Name *</Label>
              <Input
                className="h-11 rounded-xl border-gray-250 mt-1.5"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value, 'name')}
                onBlur={() => markFieldTouched('name')}
                placeholder="Customer full name"
              />
              {touchedFields.has('name') && !formData.name.trim() ? (
                <p className="text-xs text-red-500 mt-1">Customer name is required</p>
              ) : (
                <p className="text-[10px] text-gray-400 mt-1">
                  {nameWordCount}/8 words • Max 20 characters per word
                </p>
              )}
            </div>

            {formData.customer_type === 'business' && (
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Company Name</Label>
                <Input
                  className="h-11 rounded-xl border-gray-250 mt-1.5"
                  value={formData.company_name || ''}
                  onChange={(e) => handleNameChange(e.target.value, 'company_name')}
                  placeholder="e.g. Acme Corp"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {companyWordCount}/8 words • Max 20 characters per word
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Contact Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-150 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone *</Label>
              <div className="mt-1.5" onBlur={() => markFieldTouched('phone')}>
                <PhoneInput
                  defaultCountry="in"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter phone number"
                />
              </div>
              {(() => {
                const isJustCountryCode = /^\+\d{1,4}$/.test(formData.phone?.trim() || '');
                const showError = touchedFields.has('phone') && isJustCountryCode;
                if (showError) {
                  return <p className="text-xs text-red-500 mt-1">Please enter a complete phone number</p>;
                }
                return <p className="text-[10px] text-gray-400 mt-1">Select country and enter number</p>;
              })()}
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</Label>
              <Input
                type="email"
                className={`h-11 rounded-xl border-gray-250 mt-1.5 ${emailError ? 'border-red-500' : ''}`}
                value={formData.email || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  onFormDataChange({ ...formData, email: value });
                  setEmailError(validateEmail(value));
                }}
                onBlur={() => {
                  setEmailError(validateEmail(formData.email));
                  markFieldTouched('email');
                }}
                placeholder="email@example.com"
              />
              {emailError ? (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              ) : formData.email ? (
                <p className="text-[10px] text-gray-400 mt-1">{formData.email.length}/320 characters</p>
              ) : null}
            </div>
          </div>

          {/* Card 3: Tax Details */}
          <div className="bg-white rounded-2xl p-4 border border-gray-150 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">GST Number</Label>
              <div className="relative mt-1.5">
                <Input
                  className="h-11 rounded-xl border-gray-250 uppercase pr-10"
                  value={formData.gst_number}
                  onChange={(e) => handleGSTChange(e.target.value)}
                  maxLength={15}
                  placeholder="27AAPFU0939F1ZV"
                />
                {fetchingGST && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                )}
              </div>
              {formData.gst_number && formData.gst_number.length !== 15 && !gstError && (
                <p className="text-xs text-red-500 mt-1">GST must be exactly 15 characters ({formData.gst_number.length}/15)</p>
              )}
              {gstError && <p className="text-xs text-amber-600 mt-1">{gstError}</p>}
              {formData.gst_number && formData.gst_number.length === 15 && !gstError && !fetchingGST && (
                <p className="text-xs text-green-600 mt-1">✓ Auto-filled from GST</p>
              )}
            </div>
          </div>

          {/* Card 4: Permanent Address */}
          <div className="bg-white rounded-2xl p-4 border border-gray-150 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wider">Permanent Address</h3>
            
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Address</Label>
              <Input
                className="h-11 rounded-xl border-gray-250 mt-1.5"
                value={formData.permanentAddress?.address || ''}
                onChange={(e) => handlePermanentAddressChange(e.target.value, 'address')}
                placeholder="Street address, building name"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {addressWordCount}/20 words • Max 20 characters per word
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pincode</Label>
                <div className="relative mt-1.5">
                  <Input
                    className="h-11 rounded-xl border-gray-250 pr-10"
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
                          const res = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
                          const data = await res.json();
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
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setFetchingLocation(false);
                        }
                      }
                    }}
                    placeholder="e.g. 400001"
                    maxLength={10}
                  />
                  {fetchingLocation && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">City</Label>
                <Input
                  className="h-11 rounded-xl border-gray-250 mt-1.5"
                  value={formData.permanentAddress?.city || ''}
                  onChange={(e) => handlePermanentAddressChange(e.target.value, 'city')}
                  placeholder="e.g. Mumbai"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">State</Label>
              <Input
                className="h-11 rounded-xl border-gray-250 mt-1.5"
                value={formData.permanentAddress?.state || ''}
                onChange={(e) => handlePermanentAddressChange(e.target.value, 'state')}
                placeholder="e.g. Maharashtra"
              />
            </div>
          </div>

          {/* Card 5: Delivery Address */}
          <div className="bg-white rounded-2xl p-4 border border-gray-150 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Delivery Address</h3>
              <label className="flex items-center gap-2 cursor-pointer select-none">
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
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-xs text-gray-500 font-semibold">Same as Permanent</span>
              </label>
            </div>

            {!formData.sameAsPermanent && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Address</Label>
                  <Input
                    className="h-11 rounded-xl border-gray-250 mt-1.5"
                    value={formData.deliveryAddress?.address || ''}
                    onChange={(e) => handleDeliveryAddressChange(e.target.value, 'address')}
                    placeholder="Street address, building name"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {deliveryAddressWordCount}/20 words • Max 20 characters per word
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pincode</Label>
                    <div className="relative mt-1.5">
                      <Input
                        className="h-11 rounded-xl border-gray-250 pr-10"
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
                              const res = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
                              const data = await res.json();
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
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setFetchingLocation(false);
                            }
                          }
                        }}
                        placeholder="e.g. 400001"
                        maxLength={10}
                      />
                      {fetchingLocation && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">City</Label>
                    <Input
                      className="h-11 rounded-xl border-gray-250 mt-1.5"
                      value={formData.deliveryAddress?.city || ''}
                      onChange={(e) => handleDeliveryAddressChange(e.target.value, 'city')}
                      placeholder="e.g. Mumbai"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">State</Label>
                  <Input
                    className="h-11 rounded-xl border-gray-250 mt-1.5"
                    value={formData.deliveryAddress?.state || ''}
                    onChange={(e) => handleDeliveryAddressChange(e.target.value, 'state')}
                    placeholder="e.g. Maharashtra"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 6: Notes */}
          <div className="bg-white rounded-2xl p-4 border border-gray-150 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <div>
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Notes</Label>
              <Input
                className="h-11 rounded-xl border-gray-250 mt-1.5"
                value={formData.notes || ''}
                onChange={(e) => onFormDataChange({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          {/* Footer Action buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-150 bg-white flex gap-3 z-50 shadow-lg">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-12 rounded-xl text-sm font-bold border-gray-350 bg-white text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {selectedCustomer ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {selectedCustomer ? 'Edit Customer' : 'Add Customer'}
          </DialogTitle>
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
                onBlur={() => markFieldTouched('name')}
              />
              {touchedFields.has('name') && !formData.name.trim() ? (
                <p className="text-xs text-red-500 mt-1">
                  Customer name is required
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {nameWordCount}/8 words • Max 20 characters per word
                </p>
              )}
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  onFormDataChange({ ...formData, email: value });
                  // Validate email on change
                  const error = validateEmail(value);
                  setEmailError(error);
                }}
                onBlur={() => {
                  const error = validateEmail(formData.email);
                  setEmailError(error);
                  markFieldTouched('email');
                }}
                className={emailError ? 'border-red-500' : ''}
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
              {!emailError && formData.email && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.email.length}/320 characters
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <div onBlur={() => markFieldTouched('phone')}>
                <PhoneInput
                  defaultCountry="in"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="Enter phone number"
                />
              </div>
              {(() => {
                const isJustCountryCode = /^\+\d{1,4}$/.test(formData.phone?.trim() || '');
                const showError = touchedFields.has('phone') && isJustCountryCode;
                if (showError) {
                  return (
                    <p className="text-xs text-red-500 mt-1">
                      Please enter a complete phone number
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    Select country and enter number
                  </p>
                );
              })()}
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
                {companyWordCount}/8 words • Max 20 characters per word
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
                onChange={(e) => handlePermanentAddressChange(e.target.value, 'address')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {addressWordCount}/20 words • Max 20 characters per word
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <Label>City</Label>
                <Input
                  value={formData.permanentAddress?.city || ''}
                  onChange={(e) => handlePermanentAddressChange(e.target.value, 'city')}
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
                  onChange={(e) => handlePermanentAddressChange(e.target.value, 'state')}
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
                <span className="text-sm text-gray-650">Same as Permanent</span>
              </label>
            </div>

            {!formData.sameAsPermanent && (
              <>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.deliveryAddress?.address || ''}
                    onChange={(e) => handleDeliveryAddressChange(e.target.value, 'address')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {deliveryAddressWordCount}/20 words • Max 20 characters per word
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.deliveryAddress?.city || ''}
                      onChange={(e) => handleDeliveryAddressChange(e.target.value, 'city')}
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
                      onChange={(e) => handleDeliveryAddressChange(e.target.value, 'state')}
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
            <Button
              type="submit"
              disabled={submitting}
              className="bg-primary-600 hover:bg-primary-700 text-white disabled:bg-primary-400 disabled:text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedCustomer ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

