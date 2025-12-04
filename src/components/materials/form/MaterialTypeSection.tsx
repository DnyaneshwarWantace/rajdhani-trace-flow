import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaterialTypeSectionProps {
  type: string;
  color: string;
  types: string[];
  colors: string[];
  onTypeChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

export default function MaterialTypeSection({
  type,
  color,
  types,
  colors,
  onTypeChange,
  onColorChange,
}: MaterialTypeSectionProps) {
  return (
    <>
      <div>
        <Label htmlFor="type">Material Type *</Label>
        <Select value={type || ''} onValueChange={onTypeChange}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {types.length > 0 ? (
              types.map((typeOption) => (
                <SelectItem key={typeOption} value={typeOption}>
                  {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no_types" disabled>
                No types available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      {type === 'color' && (
        <div>
          <Label htmlFor="color">Color *</Label>
          <Select value={color || ''} onValueChange={onColorChange}>
            <SelectTrigger id="color">
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {colors.length > 0 ? (
                colors.map((colorOption) => (
                  <SelectItem key={colorOption} value={colorOption}>
                    {colorOption}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no_colors" disabled>
                  No colors available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
