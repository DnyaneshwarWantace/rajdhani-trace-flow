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
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Allow ALL characters - no character restrictions
      // Only enforce: max 50 words, max 20 characters per word

      // Split by spaces to get words (preserve all spaces)
      const words = inputValue.split(/\s+/).filter(w => w.length > 0);
      
      // Limit to 50 words - if exceeded, truncate at the 50th word
      if (words.length > 50) {
        // Find position where 50th word ends
        let wordCount = 0;
        let pos = inputValue.length;
        for (let i = 0; i < inputValue.length; i++) {
          // Check if we're at the start of a word (non-space after space or start of string)
          if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
            wordCount++;
            if (wordCount === 50) {
              // Find the end of this 50th word
              let endPos = i;
              while (endPos < inputValue.length && inputValue[endPos] !== ' ') {
                endPos++;
              }
              pos = endPos;
              break;
            }
          }
        }
        inputValue = inputValue.substring(0, pos);
      }

      // Limit each word to 20 characters (preserve spaces)
      const parts = inputValue.split(/(\s+)/);
      const processedParts = parts.map(part => {
        if (/^\s+$/.test(part)) {
          // It's a space sequence, keep it as-is
          return part;
        } else if (part.trim().length > 0) {
          // It's a word, limit to 20 characters
          return part.length > 20 ? part.slice(0, 20) : part;
        }
        return part;
      });

      inputValue = processedParts.join('');

      onNameChange(inputValue);
    };

    const wordCount = name.trim() ? name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
    const words = name.trim() ? name.trim().split(/\s+/).filter(w => w.length > 0) : [];
    const hasLongWord = words.some(word => word.length > 20);
    const totalChars = name.length;

    return (
      <div>
        <Label htmlFor="materialName">Material Name *</Label>
        <Input
          ref={ref}
          id="materialName"
          value={name}
          onChange={handleChange}
          placeholder="e.g., Cotton Yarn Premium"
          required
          className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {wordCount}/50 words • Max 20 characters per word • {totalChars} total characters
          {hasLongWord && <span className="text-red-600 ml-1">(Some words exceed 20 characters)</span>}
        </p>
      </div>
    );
  }
);

MaterialBasicInfo.displayName = 'MaterialBasicInfo';

export default MaterialBasicInfo;
