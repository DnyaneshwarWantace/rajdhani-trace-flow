import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IndividualProduct, IndividualProductFormData } from '@/types/product';

interface EditIndividualProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProduct: IndividualProduct | null;
  onSave: (id: string, data: Partial<IndividualProductFormData>) => Promise<void>;
}

export default function EditIndividualProductDialog({
  open,
  onOpenChange,
  individualProduct,
  onSave,
}: EditIndividualProductDialogProps) {
  const [formData, setFormData] = useState({
    final_weight: '',
    final_width: '',
    final_length: '',
    inspector: '',
    location: '',
    notes: '',
    status: 'available' as 'available' | 'sold' | 'damaged' | 'in_production' | 'reserved' | 'used',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (individualProduct) {
      setFormData({
        final_weight: individualProduct.final_weight || '',
        final_width: individualProduct.final_width || '',
        final_length: individualProduct.final_length || '',
        inspector: individualProduct.inspector || '',
        location: individualProduct.location || '',
        notes: individualProduct.notes || '',
        status: (individualProduct.status || 'available') as 'available' | 'sold' | 'damaged' | 'in_production' | 'reserved' | 'used',
      });
    }
  }, [individualProduct, open]);

  const [locationError, setLocationError] = useState('');

  const handleSave = async () => {
    if (!individualProduct) return;

    const locationTrimmed = (formData.location || '').trim();
    if (!locationTrimmed) {
      setLocationError('Location is required');
      return;
    }
    setLocationError('');

    try {
      setSaving(true);
      await onSave(individualProduct.id, { ...formData, location: locationTrimmed });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving individual product:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!individualProduct) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Individual Product Details</DialogTitle>
          <DialogDescription>
            Update the details for this individual product piece.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="finalWeight">Final Weight</Label>
            <Input
              id="finalWeight"
              value={formData.final_weight}
              onChange={(e) => setFormData({ ...formData, final_weight: e.target.value })}
              placeholder="e.g., 15 kg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finalWidth">Final Width</Label>
            <Input
              id="finalWidth"
              value={formData.final_width}
              onChange={(e) => setFormData({ ...formData, final_width: e.target.value })}
              placeholder="e.g., 1.83m"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="finalLength">Final Length</Label>
            <Input
              id="finalLength"
              value={formData.final_length}
              onChange={(e) => setFormData({ ...formData, final_length: e.target.value })}
              placeholder="e.g., 2.74m"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inspector">Inspector</Label>
            <Input
              id="inspector"
              value={formData.inspector}
              readOnly
              disabled
              placeholder="Inspector name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => {
                setFormData({ ...formData, location: e.target.value });
                setLocationError('');
              }}
              placeholder="e.g., Warehouse A, Shelf 3"
              className={locationError ? 'border-red-500' : ''}
            />
            {locationError && <p className="text-xs text-red-600">{locationError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'available' | 'sold' | 'damaged' | 'in_production' | 'reserved' | 'used') =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="used">Used</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this product piece..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

