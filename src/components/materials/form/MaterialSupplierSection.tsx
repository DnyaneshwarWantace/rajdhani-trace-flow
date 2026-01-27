import { forwardRef } from 'react';
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
  hasError?: boolean;
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
}

const MaterialSupplierSection = forwardRef<HTMLButtonElement, MaterialSupplierSectionProps>(
  ({ supplier, suppliers, onSupplierChange, hasError = false, touchedFields = new Set(), markFieldTouched = () => {} }, ref) => {
    return (
      <div>
        <Label htmlFor="supplier">Supplier Name *</Label>
        <Select 
          value={supplier || undefined} 
          onValueChange={(value) => {
            onSupplierChange(value);
            markFieldTouched('supplier');
          }}
          onOpenChange={(open) => {
            if (!open) {
              markFieldTouched('supplier');
            }
          }}
        >
          <SelectTrigger 
            ref={ref}
            id="supplier"
            className={(hasError || (touchedFields.has('supplier') && !supplier.trim())) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          >
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
      {touchedFields.has('supplier') && !supplier.trim() && (
        <p className="text-xs text-red-500 mt-1">
          Supplier is required
        </p>
      )}
    </div>
  );
});

MaterialSupplierSection.displayName = 'MaterialSupplierSection';

export default MaterialSupplierSection;

