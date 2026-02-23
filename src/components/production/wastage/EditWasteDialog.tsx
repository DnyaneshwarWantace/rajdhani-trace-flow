import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getApiUrl } from '@/utils/apiConfig';
import { WasteService, type WasteItem } from '@/services/wasteService';

const API_URL = getApiUrl();

interface EditWasteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  waste: WasteItem | null;
}

export default function EditWasteDialog({
  isOpen,
  onClose,
  onSuccess,
  waste,
}: EditWasteDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [wasteTypes, setWasteTypes] = useState<string[]>([]);
  const [wasteType, setWasteType] = useState('');
  const [wasteCategory, setWasteCategory] = useState<'disposable' | 'reusable'>('disposable');
  const [canBeReused, setCanBeReused] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && waste) {
      setWasteType(waste.waste_type || '');
      setWasteCategory((waste.waste_category as 'disposable' | 'reusable') || 'disposable');
      setCanBeReused(waste.can_be_reused ?? false);
      setNotes(waste.notes || '');
      loadWasteTypes();
    }
  }, [isOpen, waste]);

  const loadWasteTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/dropdowns/category/waste_type`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          const types = result.data
            .filter((opt: any) => opt.is_active !== false)
            .map((opt: any) => opt.value)
            .filter((val: string) => val && typeof val === 'string');
          setWasteTypes(types);
        }
      }
    } catch (error) {
      console.error('Error loading waste types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waste?.id) return;
    try {
      setLoading(true);
      await WasteService.updateWaste(waste.id, {
        waste_type: wasteType,
        waste_category: wasteCategory,
        can_be_reused: canBeReused,
        notes: notes || undefined,
      });
      toast({
        title: 'Success',
        description: 'Waste item updated successfully.',
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating waste:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update waste item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!waste) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md pt-6">
        <DialogHeader className="pt-2">
          <DialogTitle>Edit Waste</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{waste.material_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {Number(waste.quantity).toFixed(4)} {waste.unit}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-waste_type">Waste Type</Label>
            <Select value={wasteType} onValueChange={setWasteType}>
              <SelectTrigger id="edit-waste_type">
                <SelectValue placeholder="Select waste type" />
              </SelectTrigger>
              <SelectContent>
                {wasteTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-waste_category">Category</Label>
            <Select
              value={wasteCategory}
              onValueChange={(v) => {
                setWasteCategory(v as 'disposable' | 'reusable');
                setCanBeReused(v === 'reusable');
              }}
            >
              <SelectTrigger id="edit-waste_category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reusable">Reusable</SelectItem>
                <SelectItem value="disposable">Disposable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !wasteType}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
