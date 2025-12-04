import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaterialBasicInfoProps {
  name: string;
  onNameChange: (value: string) => void;
}

export default function MaterialBasicInfo({ name, onNameChange }: MaterialBasicInfoProps) {
  return (
    <div>
      <Label htmlFor="materialName">Material Name *</Label>
      <Input
        id="materialName"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="e.g., Cotton Yarn (Premium)"
        required
      />
    </div>
  );
}
