import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EnhancedSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  onAddNew?: (newValue: string) => Promise<void>;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
}

export default function EnhancedSelect({
  label,
  value,
  onChange,
  options,
  onAddNew,
  placeholder = 'Select...',
  required = false,
  searchable: _searchable = false,
}: EnhancedSelectProps) {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddNew = async () => {
    if (!newValue.trim() || !onAddNew) return;

    setIsAdding(true);
    try {
      await onAddNew(newValue.trim());
      onChange(newValue.trim());
      setNewValue('');
      setShowAddNew(false);
    } catch (error) {
      console.error('Failed to add new option:', error);
      alert('Failed to add new option');
    } finally {
      setIsAdding(false);
    }
  };

  const enhancedOptions = onAddNew
    ? [...options, { value: '__add_new__', label: '+ Add New' }]
    : options;

  if (showAddNew) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={`Enter new ${label.toLowerCase()}`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNew();
              }
            }}
          />
          <button
            type="button"
            onClick={handleAddNew}
            disabled={!newValue.trim() || isAdding}
            className="px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isAdding ? 'Adding...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddNew(false);
              setNewValue('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <Select
        value={value}
        onValueChange={(val) => {
          if (val === '__add_new__') {
            setShowAddNew(true);
          } else {
            onChange(val);
          }
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {enhancedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
