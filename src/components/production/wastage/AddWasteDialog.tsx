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

const API_URL = getApiUrl();

interface AddWasteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  consumedMaterials: any[];
}

export default function AddWasteDialog({
  isOpen,
  onClose,
  onSuccess,
  batchId,
  consumedMaterials,
}: AddWasteDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [wasteTypes, setWasteTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    material_id: '',
    material_name: '',
    material_type: 'raw_material' as 'raw_material' | 'product',
    waste_type: '',
    quantity: '',
    unit: '',
    waste_category: 'disposable',
    can_be_reused: false,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadWasteTypes();
      // Reset form
      setFormData({
        material_id: '',
        material_name: '',
        material_type: 'raw_material',
        waste_type: '',
        quantity: '',
        unit: '',
        waste_category: 'disposable',
        can_be_reused: false,
        notes: '',
      });
    }
  }, [isOpen]);

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
        console.log('🔍 Waste types response:', result);
        
        // Backend returns { success: true, data: [{ value: 'scrap', ... }, ...] }
        if (result.success && Array.isArray(result.data)) {
          const types = result.data
            .filter((opt: any) => opt.is_active !== false)
            .map((opt: any) => opt.value)
            .filter((val: string) => val && typeof val === 'string');
          console.log('✅ Loaded waste types:', types);
          setWasteTypes(types);
        } else {
          console.warn('⚠️ Unexpected waste types response format:', result);
          setWasteTypes([]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to load waste types:', response.status, errorText);
        setWasteTypes([]);
      }
    } catch (error) {
      console.error('❌ Error loading waste types:', error);
      setWasteTypes([]);
    }
  };

  const handleMaterialChange = (materialId: string) => {
    const material = consumedMaterials.find((m) => m.material_id === materialId);
    if (material) {
      setFormData({
        ...formData,
        material_id: material.material_id,
        material_name: material.material_name,
        material_type: material.material_type,
        unit: material.unit,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.material_id || !formData.waste_type || !formData.quantity) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const wasteData = {
        production_batch_id: batchId,
        batch_id: batchId,
        material_id: formData.material_id,
        material_name: formData.material_name,
        material_type: formData.material_type,
        waste_type: formData.waste_type,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        waste_category: formData.waste_category,
        can_be_reused: formData.can_be_reused,
        notes: formData.notes,
        status: 'generated',
      };

      const response = await fetch(`${API_URL}/production/waste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(wasteData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create waste item');
      }

      toast({
        title: 'Success',
        description: 'Waste item created successfully',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating waste:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create waste item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Waste Item (Raw Material)</DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            For products, use the "Auto-Generate" button above to automatically calculate wastage
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Select
                value={formData.material_id}
                onValueChange={handleMaterialChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {consumedMaterials
                    .filter((m) => m.material_type === 'raw_material')
                    .map((material) => (
                      <SelectItem key={material.material_id} value={material.material_id}>
                        {material.material_name} (Raw Material)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="waste_type">Waste Type *</Label>
              <Select
                value={formData.waste_type}
                onValueChange={(value) => setFormData({ ...formData, waste_type: value })}
              >
                <SelectTrigger>
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
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kg, rolls, etc."
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waste_category">Waste Category</Label>
              <Select
                value={formData.waste_category}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    waste_category: value,
                    can_be_reused: value === 'reusable',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reusable">Reusable</SelectItem>
                  <SelectItem value="disposable">Disposable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="can_be_reused">Can Be Reused</Label>
              <Select
                value={formData.can_be_reused ? 'true' : 'false'}
                onValueChange={(value) =>
                  setFormData({ ...formData, can_be_reused: value === 'true' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the waste..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Waste Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

