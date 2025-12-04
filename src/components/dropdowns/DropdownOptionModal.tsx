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
import type { DropdownOption, DropdownFormData } from '@/types/dropdown';

interface DropdownOptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: DropdownOption | null;
  category: string;
  categoryLabel: string;
  formData: DropdownFormData;
  onFormDataChange: (data: Partial<DropdownFormData>) => void;
  onSave: () => void;
  loading?: boolean;
}

export default function DropdownOptionModal({
  open,
  onOpenChange,
  option,
  category: _category,
  categoryLabel,
  formData,
  onFormDataChange,
  onSave,
  loading = false,
}: DropdownOptionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{option ? 'Edit Option' : 'Add New Option'}</DialogTitle>
          <DialogDescription>
            {option
              ? `Update the ${categoryLabel.toLowerCase()} option`
              : `Add a new ${categoryLabel.toLowerCase()} option`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              placeholder="Enter option value"
              value={formData.value}
              onChange={(e) => onFormDataChange({ value: e.target.value })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              placeholder="0"
              value={formData.display_order || 0}
              onChange={(e) =>
                onFormDataChange({ display_order: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-gray-500">
              Lower numbers appear first in dropdowns
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={loading || !formData.value.trim()}>
            {loading ? 'Saving...' : option ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

