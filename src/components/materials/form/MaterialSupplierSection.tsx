import { forwardRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MobileOptionSheet, MobileSelectTrigger } from '@/components/ui/MobileOptionSheet';

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
    const [sheetOpen, setSheetOpen] = useState(false);
    const hasFieldError = hasError || (touchedFields.has('supplier') && !supplier.trim());

    return (
      <div>
        <Label htmlFor="supplier">Supplier Name *</Label>

        {/* Mobile: bottom sheet */}
        <div className="lg:hidden mt-1">
          <MobileSelectTrigger
            value={supplier}
            placeholder="Select supplier"
            hasError={hasFieldError}
            onClick={() => setSheetOpen(true)}
          />
          <MobileOptionSheet
            open={sheetOpen}
            onClose={() => { setSheetOpen(false); markFieldTouched('supplier'); }}
            title="Supplier"
            options={suppliers.map(s => ({ value: s.name, label: s.name }))}
            selected={supplier}
            onSelect={(val) => { onSupplierChange(val); markFieldTouched('supplier'); }}
          />
        </div>

        {/* Desktop: Radix Select */}
        <div className="hidden lg:block">
          <Select
            value={supplier || undefined}
            onValueChange={(value) => { onSupplierChange(value); markFieldTouched('supplier'); }}
            onOpenChange={(open) => { if (!open) markFieldTouched('supplier'); }}
          >
            <SelectTrigger ref={ref} id="supplier" className={hasFieldError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.length > 0 ? (
                suppliers.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)
              ) : (
                <SelectItem value="no_suppliers" disabled>No suppliers available</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {touchedFields.has('supplier') && !supplier.trim() && (
          <p className="text-xs text-red-500 mt-1">Supplier is required</p>
        )}
      </div>
    );
  });

MaterialSupplierSection.displayName = 'MaterialSupplierSection';

export default MaterialSupplierSection;

