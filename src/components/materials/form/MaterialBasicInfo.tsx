import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaterialBasicInfoProps {
  name: string;
  onNameChange: (value: string) => void;
  hasError?: boolean;
}

const MaterialBasicInfo = forwardRef<HTMLInputElement, MaterialBasicInfoProps>(
  ({ name, onNameChange, hasError = false }, ref) => {
    return (
      <div>
        <Label htmlFor="materialName">Material Name *</Label>
        <Input
          ref={ref}
          id="materialName"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g., Cotton Yarn (Premium)"
          required
          className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
      </div>
    );
  }
);

MaterialBasicInfo.displayName = 'MaterialBasicInfo';

export default MaterialBasicInfo;
