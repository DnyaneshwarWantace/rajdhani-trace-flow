import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Supplier {
  id: string;
  name: string;
}

interface MaterialSupplierSectionProps {
  supplier: string;
  suppliers: Supplier[];
  onSupplierChange: (value: string) => void;
}

export default function MaterialSupplierSection({
  supplier,
  suppliers,
  onSupplierChange,
}: MaterialSupplierSectionProps) {
  return (
    <div>
      <Label htmlFor="supplier">Supplier Name *</Label>
      <Select value={supplier || undefined} onValueChange={onSupplierChange}>
        <SelectTrigger id="supplier">
          <SelectValue placeholder="Select supplier" />
        </SelectTrigger>
        <SelectContent>
          {suppliers.length > 0 ? (
            suppliers.map((supplierOption) => (
              <SelectItem key={supplierOption.id} value={supplierOption.name}>
                {supplierOption.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no_suppliers" disabled>
              No suppliers available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

