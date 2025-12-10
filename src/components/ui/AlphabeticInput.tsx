import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface AlphabeticInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

/**
 * AlphabeticInput Component
 * 
 * Input field that only allows:
 * - Single word (no spaces)
 * - Alphabetic characters only (a-z, A-Z)
 * - Maximum length (default: 20)
 * 
 * Automatically filters out invalid characters as user types.
 */
export function AlphabeticInput({
  label,
  value,
  onChange,
  error,
  helperText,
  maxLength = 20,
  showCharCount = true,
  className,
  required,
  ...props
}: AlphabeticInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Remove spaces (single word only)
    inputValue = inputValue.replace(/\s/g, '');

    // Remove non-alphabetic characters
    inputValue = inputValue.replace(/[^a-zA-Z]/g, '');

    // Limit to maxLength
    if (inputValue.length > maxLength) {
      inputValue = inputValue.slice(0, maxLength);
    }

    onChange(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent space key
    if (e.key === ' ') {
      e.preventDefault();
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <Label htmlFor={props.id} className={error ? 'text-destructive' : ''}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          {...props}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          required={required}
          className={cn(
            error && 'border-destructive focus-visible:ring-destructive',
            'uppercase', // Auto-uppercase for better visibility
            className
          )}
        />
        {error && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="w-4 h-4 text-destructive" />
          </div>
        )}
      </div>
      {showCharCount && (
        <div className={cn(
          'text-xs flex justify-between',
          value.length > maxLength ? 'text-destructive' : 'text-muted-foreground'
        )}>
          <span>{value.length} / {maxLength} characters</span>
          {value.length > 0 && value.length < maxLength && (
            <span>{maxLength - value.length} remaining</span>
          )}
        </div>
      )}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

