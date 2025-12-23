import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tag, Ruler, Weight } from 'lucide-react';
import type { CreateProductionBatchData } from '@/services/productionService';
import type { Product } from '@/types/product';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface BatchDetailsFormProps {
  formData: CreateProductionBatchData;
  onChange: (data: CreateProductionBatchData) => void;
  selectedProduct: Product | null;
}

export default function BatchDetailsForm({ formData, onChange, selectedProduct }: BatchDetailsFormProps) {
  const handleChange = (field: keyof CreateProductionBatchData, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  const handleNotesChange = (value: string) => {
    // Split by whitespace to count words
    const words = value.trim().split(/\s+/).filter(word => word.length > 0);

    // HARD LIMIT: Stop at 15 words
    if (words.length > 15) {
      // Keep only first 15 words
      const allowed = words.slice(0, 15).join(' ');
      handleChange('notes', allowed);
      return;
    }

    // Check if any word is being typed and exceeds 15 chars - stop it
    const hasLongWord = words.some(word => word.length > 15);
    if (hasLongWord) {
      // Trim each word to max 15 chars
      const trimmedWords = words.map(word => word.slice(0, 15));
      handleChange('notes', trimmedWords.join(' '));
      return;
    }

    // All good, update
    handleChange('notes', value);
  };

  const wordsCount = (formData.notes || '').trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Product Details Section */}
      {selectedProduct && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">Product Details</Label>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-gray-600 flex-shrink-0">Product Name:</span>
              <span className="font-medium text-gray-900 min-w-0 flex-1">
                <TruncatedText text={selectedProduct.name} maxLength={60} />
              </span>
            </div>
            {(selectedProduct.category || selectedProduct.subcategory) && (
              <div className="flex items-start gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 flex-shrink-0">Category:</span>
                <span className="font-medium text-gray-900 min-w-0 flex-1">
                  <TruncatedText 
                    text={`${selectedProduct.category || ''}${selectedProduct.subcategory ? ` / ${selectedProduct.subcategory}` : ''}`}
                    maxLength={50}
                  />
                </span>
              </div>
            )}
            {(selectedProduct.length || selectedProduct.width) && (
              <div className="flex items-start gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 flex-shrink-0">Dimensions:</span>
                <span className="font-medium text-gray-900 min-w-0 flex-1">
                  <TruncatedText
                    text={`${selectedProduct.length || ''}${selectedProduct.length_unit || ''}${selectedProduct.length && selectedProduct.width ? ' × ' : ''}${selectedProduct.width || ''}${selectedProduct.width_unit || ''}`}
                    maxLength={40}
                  />
                </span>
              </div>
            )}
            {selectedProduct.weight && selectedProduct.weight !== 'N/A' && (
              <div className="flex items-start gap-1.5">
                <Weight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 flex-shrink-0">Weight:</span>
                <span className="font-medium text-gray-900 min-w-0 flex-1">
                  <TruncatedText
                    text={`${selectedProduct.weight} ${selectedProduct.weight_unit || ''}`}
                    maxLength={30}
                  />
                </span>
              </div>
            )}
            {(selectedProduct.color || selectedProduct.pattern) && (
              <div className="flex items-start gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-600 flex-shrink-0">Details:</span>
                <span className="font-medium text-gray-900 min-w-0 flex-1">
                  <TruncatedText
                    text={`${selectedProduct.color && selectedProduct.color !== 'NA' && selectedProduct.color !== 'N/A' ? selectedProduct.color : ''}${selectedProduct.color && selectedProduct.color !== 'NA' && selectedProduct.color !== 'N/A' && selectedProduct.pattern && selectedProduct.pattern !== 'NA' && selectedProduct.pattern !== 'N/A' ? ' • ' : ''}${selectedProduct.pattern && selectedProduct.pattern !== 'NA' && selectedProduct.pattern !== 'N/A' ? selectedProduct.pattern : ''}`}
                    maxLength={40}
                  />
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="planned_quantity">
          Planned Quantity <span className="text-red-500">*</span>
        </Label>
        <Input
          id="planned_quantity"
          type="number"
          min="1"
          value={formData.planned_quantity || ''}
          onChange={(e) => handleChange('planned_quantity', parseInt(e.target.value) || 0)}
          required
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
            handleChange('priority', value)
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="completion_date">Expected Completion Date</Label>
        <Input
          id="completion_date"
          type="date"
          value={formData.completion_date || ''}
          onChange={(e) => handleChange('completion_date', e.target.value)}
          className="mt-1"
          min={new Date().toISOString().split('T')[0]}
        />
        <p className="text-xs text-gray-500 mt-1">
          Target date for completing this production batch. Start date will be set automatically when production begins.
        </p>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Additional notes (max 15 words, 15 chars per word)..."
          rows={4}
          className="mt-1"
        />
        <div className="flex items-center justify-between mt-1">
          <p className={`text-xs ${wordsCount >= 15 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {wordsCount}/15 words
          </p>
        </div>
      </div>
    </div>
  );
}

