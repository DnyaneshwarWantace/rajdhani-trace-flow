import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EnhancedSelect from './EnhancedSelect';
import type { ProductFormData } from '@/types/product';

interface ProductFormSectionsProps {
  formData: ProductFormData;
  onChange: (data: Partial<ProductFormData>) => void;
  categories: string[];
  subcategories: string[];
  colors: string[];
  patterns: string[];
  units: string[];
  onAddNewDropdown: (category: string, value: string) => Promise<void>;
}

export default function ProductFormSections({
  formData,
  onChange,
  categories,
  subcategories,
  colors,
  patterns,
  units,
  onAddNewDropdown,
}: ProductFormSectionsProps) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
              placeholder="e.g., Traditional Persian Carpet"
            />
          </div>

          <EnhancedSelect
            label="Category"
            value={formData.category}
            onChange={(value) => onChange({ category: value })}
            options={[{ value: '', label: 'Select Category' }, ...categories.map(c => ({ value: c, label: c }))]}
            onAddNew={(value) => onAddNewDropdown('categories', value)}
            placeholder="Select Category"
            required
          />

          <EnhancedSelect
            label="Subcategory"
            value={formData.subcategory || ''}
            onChange={(value) => onChange({ subcategory: value })}
            options={[{ value: '', label: 'Select Subcategory' }, ...subcategories.map(s => ({ value: s, label: s }))]}
            onAddNew={(value) => onAddNewDropdown('subcategories', value)}
            placeholder="Select Subcategory (optional)"
          />

          <EnhancedSelect
            label="Unit"
            value={formData.unit}
            onChange={(value) => onChange({ unit: value })}
            options={units.map(u => ({ value: u, label: u.toUpperCase() }))}
            onAddNew={(value) => onAddNewDropdown('units', value)}
            placeholder="Select Unit"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Quantity</label>
            <input
              type="number"
              min="0"
              value={formData.base_quantity}
              onChange={(e) => onChange({ base_quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Dimensions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={formData.length}
                onChange={(e) => onChange({ length: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
                placeholder="e.g., 6"
              />
              <Select
                value={formData.length_unit}
                onValueChange={(value) => onChange({ length_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feet">Feet</SelectItem>
                  <SelectItem value="m">Meters</SelectItem>
                  <SelectItem value="cm">CM</SelectItem>
                  <SelectItem value="inch">Inches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Width <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={formData.width}
                onChange={(e) => onChange({ width: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
                placeholder="e.g., 9"
              />
              <Select
                value={formData.width_unit}
                onValueChange={(value) => onChange({ width_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feet">Feet</SelectItem>
                  <SelectItem value="m">Meters</SelectItem>
                  <SelectItem value="cm">CM</SelectItem>
                  <SelectItem value="inch">Inches</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => onChange({ weight: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
                placeholder="e.g., 600"
              />
              <Select
                value={formData.weight_unit || ''}
                onValueChange={(value) => onChange({ weight_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unit</SelectItem>
                  <SelectItem value="kg">KG</SelectItem>
                  <SelectItem value="g">Grams</SelectItem>
                  <SelectItem value="GSM">GSM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Specifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EnhancedSelect
            label="Color"
            value={formData.color || ''}
            onChange={(value) => onChange({ color: value })}
            options={[{ value: '', label: 'Select Color' }, ...colors.map(c => ({ value: c, label: c }))]}
            onAddNew={(value) => onAddNewDropdown('colors', value)}
            placeholder="Select Color"
          />

          <EnhancedSelect
            label="Pattern"
            value={formData.pattern || ''}
            onChange={(value) => onChange({ pattern: value })}
            options={[{ value: '', label: 'Select Pattern' }, ...patterns.map(p => ({ value: p, label: p }))]}
            onAddNew={(value) => onAddNewDropdown('patterns', value)}
            placeholder="Select Pattern"
          />
        </div>
      </div>

      {/* Stock Information */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">
          Stock Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Level</label>
            <input
              type="number"
              min="0"
              value={formData.min_stock_level}
              onChange={(e) => onChange({ min_stock_level: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock Level</label>
            <input
              type="number"
              min="0"
              value={formData.max_stock_level}
              onChange={(e) => onChange({ max_stock_level: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
            <input
              type="number"
              min="0"
              value={formData.reorder_point}
              onChange={(e) => onChange({ reorder_point: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.individual_stock_tracking}
                onChange={(e) => onChange({ individual_stock_tracking: e.target.checked })}
                className="w-4 h-4 text-[#1e40af] border-gray-300 rounded focus:ring-[#1e40af]"
              />
              <span className="text-sm font-medium text-gray-700">Enable Individual Stock Tracking</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              {formData.individual_stock_tracking
                ? 'Each piece will have a unique QR code for individual tracking'
                : 'Product will be tracked as bulk quantity without individual QR codes'}
            </p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
          placeholder="Additional notes about the product..."
        />
      </div>
    </div>
  );
}
