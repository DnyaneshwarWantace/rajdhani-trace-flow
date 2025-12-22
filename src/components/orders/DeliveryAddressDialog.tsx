import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface DeliveryAddressDialogProps {
  isOpen: boolean;
  onClose: () => void;
  address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  onSave: (address: { address: string; city: string; state: string; pincode: string }) => void;
}

export default function DeliveryAddressDialog({
  isOpen,
  onClose,
  address,
  onSave,
}: DeliveryAddressDialogProps) {
  const { toast } = useToast();
  const [localAddress, setLocalAddress] = useState(
    address || { address: '', city: '', state: '', pincode: '' }
  );

  useEffect(() => {
    if (address) {
      setLocalAddress(address);
    } else {
      setLocalAddress({ address: '', city: '', state: '', pincode: '' });
    }
  }, [address, isOpen]);

  const handleSave = () => {
    if (!localAddress.address || !localAddress.city || !localAddress.state || !localAddress.pincode) {
      toast({
        title: 'Error',
        description: 'Please fill all address fields',
        variant: 'destructive',
      });
      return;
    }
    onSave(localAddress);
    onClose();
    toast({
      title: 'Success',
      description: 'Delivery address saved',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Delivery Address</DialogTitle>
          <DialogDescription>Set the delivery address for this order</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={localAddress.address}
              onChange={e => setLocalAddress({ ...localAddress, address: e.target.value })}
              placeholder="Enter delivery address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={localAddress.city}
                onChange={e => setLocalAddress({ ...localAddress, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={localAddress.state}
                onChange={e => setLocalAddress({ ...localAddress, state: e.target.value })}
                placeholder="Enter state"
              />
            </div>
            <div className="space-y-2">
              <Label>Pincode</Label>
              <Input
                value={localAddress.pincode}
                onChange={e => setLocalAddress({ ...localAddress, pincode: e.target.value })}
                placeholder="Enter pincode"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !localAddress.address || !localAddress.city || !localAddress.state || !localAddress.pincode
            }
          >
            <Save className="w-4 h-4 mr-2" />
            Save Address
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

