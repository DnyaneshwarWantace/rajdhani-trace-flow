import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProductFormData } from '@/types/product';

interface ProductNotesSectionProps {
  formData: ProductFormData;
  onFormDataChange: (data: Partial<ProductFormData>) => void;
}

export default function ProductNotesSection({
  formData,
  onFormDataChange,
}: ProductNotesSectionProps) {
  return (
    <div>
      <Label htmlFor="notes">Notes/Description</Label>
      <Textarea
        id="notes"
        value={formData.notes || ''}
        onChange={(e) => onFormDataChange({ notes: e.target.value })}
        placeholder="Additional notes about the product..."
        className="min-h-[60px]"
      />
    </div>
  );
}

