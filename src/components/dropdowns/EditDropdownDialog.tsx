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
import type { DropdownOption } from '@/types/dropdown';

interface EditDropdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: DropdownOption | null;
  onSave: (id: string, value: string, displayOrder: number) => Promise<void>;
  saving: boolean;
}

export default function EditDropdownDialog({
  open,
  onOpenChange,
  option,
  onSave,
  saving,
}: EditDropdownDialogProps) {
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (option) {
      setEditValue(option.value);
    }
  }, [option]);

  const handleSave = async () => {
    if (!option) return;
    await onSave(option._id, editValue, option.display_order);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Option</DialogTitle>
          <DialogDescription>Update the option value</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Value</label>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Enter option value"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !editValue.trim()}>
            {saving ? 'Saving...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

