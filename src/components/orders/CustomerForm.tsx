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

interface CustomerFormProps {
  onCustomerCreated: (customer: Customer) => void;
  onCancel: () => void;
}

export default function CustomerForm({ onCustomerCreated, onCancel }: CustomerFormProps) {
  const { toast } = useToast();
  const [isFetchingGST, setIsFetchingGST] = useState(false);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);
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
  });

  const handleGSTNumberChange = async (gstNumber: string) => {
    setNewCustomer({ ...newCustomer, gstNumber });
    setGstAutoFilled(false);

    if (gstNumber.length === 15) {
      setIsFetchingGST(true);
      try {
        const { data, error } = await GSTApiService.getCustomerDetailsFromGST(gstNumber);
        if (error) {
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
        } else if (data) {
          setNewCustomer({
            ...newCustomer,
            gstNumber: data.gstNumber,
            name: data.companyName,
            companyName: data.companyName,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
          });
          setGstAutoFilled(true);
        }
      } catch (error) {
        console.error('Error fetching GST details:', error);
      } finally {
        setIsFetchingGST(false);
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

    if (newCustomer.name.trim().length < 3) {
      toast({
        title: 'Validation Error',
        description: 'Full name must be at least 3 characters',
        variant: 'destructive',
      });
      return;
    }

    if (newCustomer.name.trim().length > 100) {
      toast({
        title: 'Validation Error',
        description: 'Full name must not exceed 100 characters',
        variant: 'destructive',
      });
      return;
    }

    // Check if name has at least one word (no single character names)
    if (newCustomer.name.trim().split(/\s+/).some(word => word.length < 2)) {
      toast({
        title: 'Validation Error',
        description: 'Each word in the name must be at least 2 characters',
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

    // Phone validation - must be at least 10 digits
    if (newCustomer.phone.replace(/\D/g, '').length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!newCustomer.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Email is required',
        variant: 'destructive',
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomer.email.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      const customerData = {
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim() || undefined,
        city: newCustomer.city.trim() || undefined,
        state: newCustomer.state.trim() || undefined,
        pincode: newCustomer.pincode.trim() || undefined,
        customer_type: newCustomer.customerType,
        gst_number: newCustomer.gstNumber.trim() || undefined,
        company_name: newCustomer.companyName.trim() || undefined,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
              onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
              placeholder="Enter customer name"
            />
          </div>
        </div>

        {/* Row 2: Phone Number & Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone Number *</Label>
            <PhoneInput
              defaultCountry="in"
              value={newCustomer.phone}
              onChange={(value) => setNewCustomer({ ...newCustomer, phone: value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label>Email Address *</Label>
            <Input
              type="email"
              value={newCustomer.email}
              onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })}
              placeholder="Enter email"
            />
          </div>
        </div>

        {/* Row 3: GST Number */}
        <div className="space-y-2">
          <Label>GST Number</Label>
          <Input
            value={newCustomer.gstNumber}
            onChange={e => handleGSTNumberChange(e.target.value)}
            placeholder="Enter GST number"
            maxLength={15}
          />
          {isFetchingGST && <p className="text-xs text-gray-500">Fetching GST details...</p>}
          {gstAutoFilled && <p className="text-xs text-green-600">✓ GST details auto-filled</p>}
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Textarea
            value={newCustomer.address}
            onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
            placeholder="Enter address"
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={newCustomer.city}
              onChange={e => setNewCustomer({ ...newCustomer, city: e.target.value })}
              placeholder="Enter city"
            />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input
              value={newCustomer.state}
              onChange={e => setNewCustomer({ ...newCustomer, state: e.target.value })}
              placeholder="Enter state"
            />
          </div>
          <div className="space-y-2">
            <Label>Pincode</Label>
            <Input
              value={newCustomer.pincode}
              onChange={e => setNewCustomer({ ...newCustomer, pincode: e.target.value })}
              placeholder="Enter pincode"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newCustomer.name.trim() || !newCustomer.email.trim() || !newCustomer.phone.trim()}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


