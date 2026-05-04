import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CustomerService, type Customer } from '@/services/customerService';
import { GSTApiService } from '@/services/gstApiService';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { validateEmail } from '@/utils/formValidation';

interface CustomerFormProps {
  onCustomerCreated: (customer: Customer) => void;
  onCancel: () => void;
  showCard?: boolean;
}

export default function CustomerForm({ onCustomerCreated, onCancel, showCard = true }: CustomerFormProps) {
  const { toast } = useToast();
  const [isFetchingGST, setIsFetchingGST] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Track which fields have been touched for validation messages
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  
  const markFieldTouched = (fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  };

  // Reset touched fields when form is cancelled
  const handleCancel = () => {
    setTouchedFields(new Set());
    setEmailError(null);
    onCancel();
  };

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    customerType: 'individual' as 'individual' | 'business',
    gstNumber: '',
    companyName: '',
    sameAsPermanent: true,
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryPincode: '',
  });


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
    setNewCustomer({ ...newCustomer, [field]: inputValue });
  };

  // Calculate word counts for validation messages
  const addressWordCount = newCustomer.address.split(/\s+/).filter(w => w.length > 0).length;
  const cityWordCount = newCustomer.city.split(/\s+/).filter(w => w.length > 0).length;
  const stateWordCount = newCustomer.state.split(/\s+/).filter(w => w.length > 0).length;
  const deliveryAddressWordCount = newCustomer.deliveryAddress.split(/\s+/).filter(w => w.length > 0).length;

  const handleDeliveryAddressChange = (value: string, field: 'address' | 'city' | 'state') => {
    let inputValue = value;
    if (field === 'city' || field === 'state') inputValue = inputValue.replace(/\d/g, '');
    const limits = { address: { maxWords: 20, maxCharsPerWord: 20 }, city: { maxWords: 3, maxCharsPerWord: 25 }, state: { maxWords: 3, maxCharsPerWord: 25 } };
    const { maxWords, maxCharsPerWord } = limits[field];
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);
    if (words.length > maxWords) {
      let wordCount = 0, pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === maxWords) {
            let endPos = i;
            while (endPos < inputValue.length && inputValue[endPos] !== ' ') endPos++;
            pos = endPos;
            break;
          }
        }
      }
      inputValue = inputValue.substring(0, pos);
    }
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) return part;
      if (part.trim().length > 0) return part.length > maxCharsPerWord ? part.slice(0, maxCharsPerWord) : part;
      return part;
    });
    inputValue = processedParts.join('');
    if (field === 'address') setNewCustomer({ ...newCustomer, deliveryAddress: inputValue });
    else if (field === 'city') setNewCustomer({ ...newCustomer, deliveryCity: inputValue });
    else setNewCustomer({ ...newCustomer, deliveryState: inputValue });
  };

  const handleDeliveryPincodeChange = async (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setNewCustomer({ ...newCustomer, deliveryPincode: numericValue });
    if (numericValue.length === 6) {
      setFetchingLocation(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
        const data = await response.json();
        if (data?.[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          setNewCustomer(prev => ({
            ...prev,
            deliveryPincode: numericValue,
            deliveryCity: postOffice.District || prev.deliveryCity,
            deliveryState: postOffice.State || prev.deliveryState,
          }));
        }
      } catch (e) { console.error(e); }
      finally { setFetchingLocation(false); }
    }
  };

  // Handler for name validation (max 8 words, max 20 chars per word)
  const handleNameChange = (value: string) => {
    let inputValue = value;

    // Split by spaces to get words
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);

    // Limit to 8 words
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

    // Limit each word to 20 characters
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
    setNewCustomer({ ...newCustomer, name: inputValue });
  };

  const handleCompanyNameChange = (value: string) => {
    let inputValue = value;
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 8) {
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === 8) {
            let endPos = i;
            while (endPos < inputValue.length && inputValue[endPos] !== ' ') endPos++;
            pos = endPos;
            break;
          }
        }
      }
      inputValue = inputValue.substring(0, pos);
    }
    const parts = inputValue.split(/(\s+)/);
    const processedParts = parts.map(part => {
      if (/^\s+$/.test(part)) return part;
      if (part.trim().length > 0) return part.length > 20 ? part.slice(0, 20) : part;
      return part;
    });
    setNewCustomer({ ...newCustomer, companyName: processedParts.join('') });
  };

  const handleGSTNumberChange = async (value: string) => {
    // Remove any non-alphanumeric characters
    let gstValue = value.replace(/[^a-zA-Z0-9]/g, '');

    // Convert to uppercase
    gstValue = gstValue.toUpperCase();

    // Limit to 15 characters
    gstValue = gstValue.slice(0, 15);

    setNewCustomer({ ...newCustomer, gstNumber: gstValue });
    setGstAutoFilled(false);

    // Try to auto-fill from GST API if 15 characters, but don't block if it fails
    if (gstValue.length === 15) {
      setIsFetchingGST(true);
      try {
        const { data } = await GSTApiService.getCustomerDetailsFromGST(gstValue);
        // Don't show error toast - allow manual entry even if API fails
        if (data) {
          setNewCustomer({
            ...newCustomer,
            gstNumber: data.gstNumber,
            name: data.companyName || newCustomer.name,
            companyName: data.companyName || newCustomer.companyName,
            address: data.address || newCustomer.address,
            city: data.city || newCustomer.city,
            state: data.state || newCustomer.state,
            pincode: data.pincode || newCustomer.pincode,
          });
          setGstAutoFilled(true);
        }
        // Silently ignore errors - user can manually enter all details
      } catch (error) {
        // Silently ignore API errors - allow manual entry
        console.log('GST API not available or failed - allowing manual entry');
      } finally {
        setIsFetchingGST(false);
      }
    }
  };

  const handlePincodeChange = async (value: string) => {
    // Only allow digits and limit to 6 characters (Indian pincode format)
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setNewCustomer({ ...newCustomer, pincode: numericValue });

    // Auto-fetch city and state when pincode is exactly 6 digits
    if (numericValue.length === 6) {
      setFetchingLocation(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${numericValue}`);
        const data = await response.json();

        if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const postOffice = data[0].PostOffice[0];
          setNewCustomer({
            ...newCustomer,
            pincode: numericValue,
            city: postOffice.District || newCustomer.city,
            state: postOffice.State || newCustomer.state,
          });
        }
      } catch (error) {
        console.error('Error fetching location from pincode:', error);
      } finally {
        setFetchingLocation(false);
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!newCustomer.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Full name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!newCustomer.phone.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Phone number is required',
        variant: 'destructive',
      });
      return;
    }

    // Phone validation using libphonenumber-js (validates according to country code)
    if (!isValidPhoneNumber(newCustomer.phone)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid phone number for the selected country',
        variant: 'destructive',
      });
      return;
    }

    // Email validation (only if provided)
    if (newCustomer.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newCustomer.email.trim())) {
        toast({
          title: 'Validation Error',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        return;
      }
    }

    // Pincode validation (must be exactly 6 digits if provided)
    if (newCustomer.pincode.trim() && newCustomer.pincode.trim().length !== 6) {
      toast({
        title: 'Validation Error',
        description: 'Pincode must be exactly 6 digits',
        variant: 'destructive',
      });
      return;
    }

    // GST number validation (must be exactly 15 characters if provided)
    if (newCustomer.gstNumber.trim() && newCustomer.gstNumber.trim().length !== 15) {
      toast({
        title: 'Validation Error',
        description: 'GST number must be exactly 15 characters',
        variant: 'destructive',
      });
      return;
    }

    try {
      const permanentAddr = {
        address: newCustomer.address.trim() || '',
        city: newCustomer.city.trim() || '',
        state: newCustomer.state.trim() || '',
        pincode: newCustomer.pincode.trim() || '',
      };
      const deliveryAddr = newCustomer.sameAsPermanent
        ? permanentAddr
        : {
            address: newCustomer.deliveryAddress.trim() || '',
            city: newCustomer.deliveryCity.trim() || '',
            state: newCustomer.deliveryState.trim() || '',
            pincode: newCustomer.deliveryPincode.trim() || '',
          };

      const customerData = {
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim() || undefined,
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim() || undefined,
        city: newCustomer.city.trim() || undefined,
        state: newCustomer.state.trim() || undefined,
        pincode: newCustomer.pincode.trim() || undefined,
        customer_type: newCustomer.customerType,
        gst_number: newCustomer.gstNumber.trim() || undefined,
        company_name: newCustomer.companyName.trim() || undefined,
        permanent_address: JSON.stringify(permanentAddr),
        delivery_address: JSON.stringify(deliveryAddr),
      };

      const { data: newCustomerData, error } = await CustomerService.createCustomer(customerData);

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      if (newCustomerData) {
        onCustomerCreated(newCustomerData);
        setNewCustomer({
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          customerType: 'individual',
          gstNumber: '',
          companyName: '',
          sameAsPermanent: true,
          deliveryAddress: '',
          deliveryCity: '',
          deliveryState: '',
          deliveryPincode: '',
        });
        toast({
          title: 'Success',
          description: 'Customer added successfully',
        });
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: 'Error',
        description: 'Failed to create customer',
        variant: 'destructive',
      });
    }
  };

  const formContent = (
    <div className="space-y-4">
        {/* Row 1: Customer Type & Full Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Customer Type *</Label>
            <Select
              value={newCustomer.customerType}
              onValueChange={(value: 'individual' | 'business') =>
                setNewCustomer({ ...newCustomer, customerType: value })
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

          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={newCustomer.name}
              onChange={e => handleNameChange(e.target.value)}
              onBlur={() => markFieldTouched('name')}
              placeholder="Enter customer name"
              className={touchedFields.has('name') && !newCustomer.name.trim() ? 'border-red-500' : ''}
            />
            {touchedFields.has('name') && !newCustomer.name.trim() ? (
              <p className="text-xs text-red-500 mt-1">Full name is required</p>
            ) : (
              <p className="text-xs text-gray-500">Max 8 words, 20 characters per word</p>
            )}
          </div>
        </div>

        {newCustomer.customerType === 'business' && (
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input
              value={newCustomer.companyName}
              onChange={e => handleCompanyNameChange(e.target.value)}
              placeholder="Enter company name"
            />
            <p className="text-xs text-gray-500">
              {newCustomer.companyName.trim() ? newCustomer.companyName.trim().split(/\s+/).filter(w => w.length > 0).length : 0}/8 words • Max 20 characters per word
            </p>
          </div>
        )}

        {/* Row 2: Phone Number & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <div onBlur={() => markFieldTouched('phone')}>
              <PhoneInput
                defaultCountry="in"
                value={newCustomer.phone}
                onChange={(value) => setNewCustomer({ ...newCustomer, phone: value })}
                placeholder="Enter phone number"
              />
            </div>
            {touchedFields.has('phone') && (!newCustomer.phone || newCustomer.phone.trim() === '' || newCustomer.phone.trim() === '+91') && (
              <p className="text-xs text-red-500 mt-1">Phone number is required</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={newCustomer.email}
              onChange={(e) => {
                const value = e.target.value;
                setNewCustomer({ ...newCustomer, email: value });
                // Validate email on change
                const error = validateEmail(value);
                setEmailError(error);
              }}
              onBlur={() => {
                const error = validateEmail(newCustomer.email);
                setEmailError(error);
              }}
              placeholder="Enter email (optional)"
              className={emailError ? 'border-red-500' : ''}
            />
            {emailError && (
              <p className="text-xs text-red-500 mt-1">{emailError}</p>
            )}
            {!emailError && newCustomer.email && (
              <p className="text-xs text-muted-foreground mt-1">
                {newCustomer.email.length}/320 characters
              </p>
            )}
          </div>
        </div>

        {/* Row 3: GST Number */}
        <div className="space-y-2">
          <Label>GST Number</Label>
          <Input
            value={newCustomer.gstNumber}
            onChange={e => handleGSTNumberChange(e.target.value)}
            placeholder="Enter 15-character GST number"
            maxLength={15}
            className={newCustomer.gstNumber && newCustomer.gstNumber.length > 0 && newCustomer.gstNumber.length < 15 ? 'border-red-500' : ''}
          />
          {isFetchingGST && <p className="text-xs text-gray-500">Fetching GST details...</p>}
          {gstAutoFilled && <p className="text-xs text-green-600">✓ GST details auto-filled</p>}
          {newCustomer.gstNumber && newCustomer.gstNumber.length > 0 && newCustomer.gstNumber.length < 15 && (
            <p className="text-xs text-red-600">GST number must be exactly 15 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Permanent / Current Address</Label>
          <Textarea
            value={newCustomer.address}
            onChange={e => handleAddressChange(e.target.value, 'address')}
            onBlur={() => markFieldTouched('address')}
            placeholder="Enter address"
            rows={2}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {addressWordCount}/20 words • Max 20 characters per word
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={newCustomer.city}
              onChange={e => handleAddressChange(e.target.value, 'city')}
              onBlur={() => markFieldTouched('city')}
              placeholder="Enter city"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {cityWordCount}/3 words • Max 25 characters per word
            </p>
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input
              value={newCustomer.state}
              onChange={e => handleAddressChange(e.target.value, 'state')}
              onBlur={() => markFieldTouched('state')}
              placeholder="Enter state"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {stateWordCount}/3 words • Max 25 characters per word
            </p>
          </div>
          <div className="space-y-2">
            <Label>Pincode</Label>
            <div className="relative">
              <Input
                value={newCustomer.pincode}
                onChange={e => handlePincodeChange(e.target.value)}
                onBlur={() => markFieldTouched('pincode')}
                placeholder="Enter 6-digit pincode"
                maxLength={6}
                className={touchedFields.has('pincode') && newCustomer.pincode && newCustomer.pincode.length > 0 && newCustomer.pincode.length < 6 ? 'border-red-500' : ''}
              />
              {fetchingLocation && (
                <p className="text-xs text-gray-500 mt-1">Fetching location...</p>
              )}
              {touchedFields.has('pincode') && newCustomer.pincode && newCustomer.pincode.length > 0 && newCustomer.pincode.length < 6 && (
                <p className="text-xs text-red-600 mt-1">Pincode must be 6 digits</p>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Delivery Address</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCustomer.sameAsPermanent}
                onChange={(e) => setNewCustomer({ ...newCustomer, sameAsPermanent: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">Same as current address</span>
            </label>
          </div>
          {!newCustomer.sameAsPermanent && (
            <>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={newCustomer.deliveryAddress}
                  onChange={e => handleDeliveryAddressChange(e.target.value, 'address')}
                  placeholder="Enter delivery address"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {deliveryAddressWordCount}/20 words • Max 20 characters per word
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={newCustomer.deliveryCity}
                    onChange={e => handleDeliveryAddressChange(e.target.value, 'city')}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={newCustomer.deliveryState}
                    onChange={e => handleDeliveryAddressChange(e.target.value, 'state')}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    value={newCustomer.deliveryPincode}
                    onChange={e => handleDeliveryPincodeChange(e.target.value)}
                    placeholder="6-digit pincode"
                    maxLength={6}
                  />
                  {fetchingLocation && <p className="text-xs text-gray-500 mt-1">Fetching location...</p>}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={Boolean(
              !newCustomer.name.trim() ||
              !newCustomer.phone.trim() ||
              newCustomer.phone.trim() === '+91' ||
              (newCustomer.phone.trim() && !isValidPhoneNumber(newCustomer.phone))
            )}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />Save &amp; Continue
          </Button>
        </div>
    </div>
  );

  if (showCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Add New Customer</CardTitle>
        </CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    );
  }

  return formContent;
}


