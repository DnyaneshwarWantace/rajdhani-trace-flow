import { MapPin, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@/services/customerService';
import DeliveryAddressDialog from './DeliveryAddressDialog';

interface DeliveryAddressProps {
  customer: Customer | null;
  deliveryAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  onUseCustomerAddress: () => void;
  onEditAddress: () => void;
  showDialog: boolean;
  onDialogChange: (open: boolean) => void;
  onAddressChange: (address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  }) => void;
}

export default function DeliveryAddress({
  customer,
  deliveryAddress,
  onUseCustomerAddress,
  onEditAddress,
  showDialog,
  onDialogChange,
  onAddressChange,
}: DeliveryAddressProps) {
  if (!customer) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveryAddress ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-800">Delivery Address Set</h4>
                  <p className="text-sm text-green-600">
                    {deliveryAddress.address}, {deliveryAddress.city}, {deliveryAddress.state} -{' '}
                    {deliveryAddress.pincode}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={onEditAddress}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Set Delivery Address</h4>
                <div className="flex gap-2">
                  <Button size="sm" onClick={onUseCustomerAddress}>
                    Use Customer's Address
                  </Button>
                  <Button variant="outline" size="sm" onClick={onEditAddress}>
                    Set Custom Address
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DeliveryAddressDialog
        isOpen={showDialog}
        onClose={() => onDialogChange(false)}
        address={deliveryAddress}
        onSave={onAddressChange}
      />
    </>
  );
}


