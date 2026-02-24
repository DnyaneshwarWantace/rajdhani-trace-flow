import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
import { MaterialService } from '@/services/materialService';
import { type PeriodicDueMaterial, toPeriodicDueMaterial } from '@/types/material';
import { useToast } from '@/hooks/use-toast';

interface RecordPeriodicUsageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  materials: PeriodicDueMaterial[];
  preselectedMaterial?: PeriodicDueMaterial | null;
}

export default function RecordPeriodicUsageDialog({
  isOpen,
  onClose,
  onSuccess,
  materials,
  preselectedMaterial = null,
}: RecordPeriodicUsageDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [materialId, setMaterialId] = useState('');
  const [quantityUsed, setQuantityUsed] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [allPeriodic, setAllPeriodic] = useState<PeriodicDueMaterial[]>([]);

  const options = materials.length > 0 ? materials : allPeriodic;
  const selectedMaterial = options.find((m) => (m.id || m._id) === materialId) || preselectedMaterial;

  useEffect(() => {
    if (isOpen && materials.length === 0) {
      MaterialService.getMaterials({ usage_type: 'periodic', limit: 500 })
        .then(({ materials: list }) => setAllPeriodic((list || []).map(toPeriodicDueMaterial)))
        .catch(() => setAllPeriodic([]));
    } else {
      setAllPeriodic([]);
    }
  }, [isOpen, materials.length]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedMaterial) {
        const id = preselectedMaterial.id || preselectedMaterial._id;
        setMaterialId(id || '');
      } else {
        const list = materials.length > 0 ? materials : allPeriodic;
        setMaterialId(list[0] ? (list[0].id || list[0]._id) || '' : '');
      }
      setQuantityUsed('');
      setPeriodEndDate(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
  }, [isOpen, preselectedMaterial, materials, allPeriodic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(quantityUsed);
    if (!materialId || Number.isNaN(qty) || qty <= 0) {
      toast({ title: 'Invalid input', description: 'Select a material and enter a valid quantity.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await MaterialService.recordPeriodicConsumption({
        material_id: materialId,
        quantity_used: qty,
        period_end_date: periodEndDate || undefined,
        notes: notes || undefined,
      });
      toast({ title: 'Recorded', description: 'Periodic usage recorded and stock updated.' });
      onSuccess();
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to record periodic usage',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectOptions = options.length > 0 ? options : (preselectedMaterial ? [preselectedMaterial] : []);
  const todayLabel = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record periodic usage</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Period ending <strong>{todayLabel}</strong> (today). Select material and enter quantity used.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Material</Label>
            <Select value={materialId} onValueChange={setMaterialId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((m) => {
                  const id = m.id || m._id;
                  return (
                    <SelectItem key={id} value={id!}>
                      {m.name} ({m.unit}) — stock: {m.current_stock ?? 0}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantityUsed">Quantity used *</Label>
            <Input
              id="quantityUsed"
              type="number"
              min={0}
              step="any"
              value={quantityUsed}
              onChange={(e) => setQuantityUsed(e.target.value)}
              placeholder="e.g. 5"
              required
            />
            {selectedMaterial && (
              <p className="text-xs text-gray-500 mt-1">Unit: {selectedMaterial.unit}</p>
            )}
          </div>
          <div>
            <Label htmlFor="periodEndDate">Period end date (optional)</Label>
            <Input
              id="periodEndDate"
              type="date"
              value={periodEndDate}
              onChange={(e) => setPeriodEndDate(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Date for this record (defaults to today). Change if recording for a different day.
            </p>
          </div>
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Monthly ink usage"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="text-white">
              {submitting ? 'Recording…' : 'Record usage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
