import { useState } from 'react';
import { Plus, X, AlertTriangle, Search } from 'lucide-react';
import type { RawMaterial } from '@/types/material';
import type { Product } from '@/types/product';

export interface RecipeMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
}

interface RecipeSectionProps {
  materials: RecipeMaterial[];
  onAddMaterial: (material: RecipeMaterial) => void;
  onRemoveMaterial: (index: number) => void;
  availableMaterials?: RawMaterial[];
  availableProducts?: Product[];
}

export default function RecipeSection({
  materials,
  onAddMaterial,
  onRemoveMaterial,
  availableMaterials = [],
  availableProducts = [],
}: RecipeSectionProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const allItems = [
    ...availableMaterials.map(m => ({ id: m._id, name: m.name, unit: m.unit, type: 'material' as const })),
    ...availableProducts.map(p => ({ id: p._id, name: p.name, unit: p.unit, type: 'product' as const }))
  ];

  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (item: typeof allItems[0]) => {
    setSelectedId(item.id);
    setSelectedName(item.name);
    setUnit(item.unit);
    setShowSelector(false);
    setSearchTerm('');
  };

  const handleAdd = () => {
    if (!selectedId || !quantity || !unit) {
      alert('Please fill in all fields');
      return;
    }

    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    onAddMaterial({
      materialId: selectedId,
      materialName: selectedName,
      quantity: parsedQuantity,
      unit: unit,
    });

    // Reset form
    setSelectedId('');
    setSelectedName('');
    setQuantity('');
    setUnit('');
  };

  const handleReset = () => {
    setSelectedId('');
    setSelectedName('');
    setQuantity('');
    setUnit('');
  };

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Recipe / Materials Used</h3>
        <div className="text-xs text-gray-500 bg-blue-50 px-3 py-1 rounded-lg">
          Materials for 1 SQM of this product
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        You can add materials to create the recipe now, or add it later when editing the product
      </p>

      {/* Add Material Form */}
      <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Material or Product
          </label>
          {selectedId ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-blue-900">{selectedName}</div>
                <div className="text-sm text-gray-600">
                  {allItems.find(i => i.id === selectedId)?.type === 'material' ? 'Raw Material' : 'Product'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#1e40af] hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Click to search and select material or product
            </button>
          )}

          {/* Material Selector Dropdown */}
          {showSelector && (
            <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg max-h-64 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-600">
                        {item.type === 'material' ? 'Raw Material' : 'Product'} • Unit: {item.unit}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No materials or products found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setQuantity(value);
                }
              }}
              placeholder="e.g., 0.5, 2.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., kg, meters"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e40af] focus:border-[#1e40af] outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedId || !quantity || !unit}
          className="w-full px-4 py-2 bg-[#1e40af] text-white rounded-lg hover:bg-[#1e3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Material to Recipe
        </button>
      </div>

      {/* Added Materials List */}
      {materials.length > 0 ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Recipe Materials:</label>
          {materials.map((material, index) => (
            <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{material.materialName}</div>
                <div className="text-sm text-gray-600">
                  {material.quantity} {material.unit}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemoveMaterial(index)}
                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800 font-medium">No Recipe Added</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            You can create the product without a recipe and add it later when editing the product.
          </p>
        </div>
      )}
    </div>
  );
}
