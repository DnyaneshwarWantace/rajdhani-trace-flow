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
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let inputValue = e.target.value;

    // Allow ALL characters - no character restrictions
    // Only enforce: max 100 words, max 20 characters per word

    // Split by spaces to get words (preserve all spaces)
    const words = inputValue.split(/\s+/).filter(w => w.length > 0);
    
    // Limit to 100 words - if exceeded, truncate at the 100th word
    if (words.length > 100) {
      // Find position where 100th word ends
      let wordCount = 0;
      let pos = inputValue.length;
      for (let i = 0; i < inputValue.length; i++) {
        // Check if we're at the start of a word (non-space after space or start of string)
        if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
          wordCount++;
          if (wordCount === 100) {
            // Find the end of this 100th word
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

    onFormDataChange({ notes: inputValue });
  };

  const wordCount = formData.notes?.trim() ? formData.notes.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
  const words = formData.notes?.trim() ? formData.notes.trim().split(/\s+/).filter(w => w.length > 0) : [];
  const hasLongWord = words.some(word => word.length > 20);
  const totalChars = formData.notes?.length || 0;

  return (
    <div>
      <Label htmlFor="notes">Notes/Description</Label>
      <Textarea
        id="notes"
        value={formData.notes || ''}
        onChange={handleChange}
        placeholder="Additional notes about the product..."
        className="min-h-[60px]"
      />
      <p className="text-xs text-muted-foreground mt-1">
        {wordCount}/100 words • Max 20 characters per word • {totalChars} total characters
        {hasLongWord && <span className="text-red-600 ml-1">(Some words exceed 20 characters)</span>}
      </p>
    </div>
  );
}

