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
import { Calendar, AlertCircle } from 'lucide-react';

interface PlanningDetailsFormProps {
  formData: {
    planned_quantity: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    completion_date: string;
    notes: string;
  };
  onChange: (data: {
    planned_quantity: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    completion_date: string;
    notes: string;
  }) => void;
}

export default function PlanningDetailsForm({ formData, onChange }: PlanningDetailsFormProps) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="planned_quantity" className="flex items-center gap-2">
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
          placeholder="Enter quantity to produce"
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority Level</Label>
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
        <Label htmlFor="completion_date" className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Expected Completion Date
        </Label>
        <Input
          id="completion_date"
          type="date"
          value={formData.completion_date || ''}
          onChange={(e) => handleChange('completion_date', e.target.value)}
          className="mt-1"
          min={new Date().toISOString().split('T')[0]}
        />
        <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Target date for completing this production batch. Start date will be set automatically when production begins.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Planning Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Add any special instructions, requirements, or notes for this production batch..."
          rows={4}
          className="mt-1"
        />
      </div>
    </div>
  );
}

