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

  // Handler for address field with 20 word limit
  const handleAddressChange = (value: string) => {
    let inputValue = value;
    const maxWords = 20;
    const maxCharsPerWord = 20;

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
    setLocalAddress({ ...localAddress, address: inputValue });
  };

  // Calculate word count for display
  const addressWordCount = localAddress.address.split(/\s+/).filter(w => w.length > 0).length;

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
              onChange={e => handleAddressChange(e.target.value)}
              placeholder="Enter delivery address"
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

