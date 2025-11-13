import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownService } from "@/services/api/dropdownService";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Button 
} from "@/components/ui/button";
import { 
  Input 
} from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { 
  Badge 
} from "@/components/ui/badge";
import { 
  Trash2, 
  Plus, 
  Edit, 
  X, 
  Settings,
  Package,
  Palette,
  Ruler,
  Factory,
  Layers,
  Hash,
  Shapes
} from "lucide-react";

interface DropdownOption {
  id: string;
  category: string;
  value: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


const DropdownMaster = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // State for active tab
  const [activeTab, setActiveTab] = useState<'product' | 'material' | 'production'>('product');

  // State for different dropdown categories
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([]);

  // State for adding new options
  const [newOption, setNewOption] = useState({
    category: '',
    value: '',
    display_order: 1
  });

  // State for editing options
  const [editingOption, setEditingOption] = useState<DropdownOption | null>(null);
  const [editValue, setEditValue] = useState('');

  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Load all data on component mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await loadDropdownOptions();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownOptions = async () => {
    try {
      const { data, error } = await DropdownService.getAllDropdownOptions();
      if (error) {
        console.error('Error loading dropdown options:', error);
        setDropdownOptions([]);
      } else if (data && Array.isArray(data)) {
        setDropdownOptions(data);
      } else {
        console.error('Error loading dropdown options: Invalid data format');
        setDropdownOptions([]);
      }
    } catch (error) {
      console.error('Error loading dropdown options:', error);
      setDropdownOptions([]);
    }
  };


  // Add new dropdown option
  const addDropdownOption = async (categoryOverride?: string) => {
    const categoryToUse = categoryOverride || newOption.category;
    if (!categoryToUse || !newOption.value) return;

    // Map combined categories to valid backend categories
    const categoryMap: { [key: string]: string } = {
      'weight_combined': 'weight',
      'length_combined': 'length',
      'width_combined': 'width',
    };
    
    const finalCategory = categoryMap[categoryToUse] || categoryToUse;

    // For combined categories, validate that both value and unit are present
    if (categoryToUse.includes('_combined')) {
      const parts = newOption.value.trim().split(' ');
      const value = parts[0] || '';
      const unit = parts[1] || '';
      
      if (!value || !unit) {
        alert('Please enter both value and unit before adding the option.');
        return;
      }
    }

    try {
      const result = await DropdownService.addOption(
        finalCategory,
        newOption.value,
        newOption.display_order
      );

      if (!result.success) {
        console.error('Error adding dropdown option:', result.error);
        alert('Error adding option. Please try again.');
      } else {
        console.log('✅ Added dropdown option');
        setNewOption({ category: '', value: '', display_order: 1 });
        setIsAddDialogOpen(false);
        await loadDropdownOptions();
      }
    } catch (error) {
      console.error('Error adding dropdown option:', error);
      alert('Error adding option. Please try again.');
    }
  };

  // Edit dropdown option
  const editDropdownOption = async () => {
    if (!editingOption || !editValue) return;

    try {
      const result = await DropdownService.updateOption(editingOption.id, {
        value: editValue
      });

      if (!result.success) {
        console.error('Error editing dropdown option:', result.error);
        alert('Error editing option. Please try again.');
      } else {
        console.log('✅ Edited dropdown option');
        setEditingOption(null);
        setEditValue('');
        setIsEditDialogOpen(false);
        await loadDropdownOptions();
      }
    } catch (error) {
      console.error('Error editing dropdown option:', error);
      alert('Error editing option. Please try again.');
    }
  };

  // Delete dropdown option
  const deleteDropdownOption = async (id: string) => {
    if (!confirm('Are you sure you want to delete this option?')) return;

    try {
      const result = await DropdownService.deleteOption(id);

      if (!result.success) {
        console.error('Error deleting dropdown option:', result.error);
        alert('Error deleting option. Please try again.');
      } else {
        console.log('✅ Deleted dropdown option');
        await loadDropdownOptions();
      }
    } catch (error) {
      console.error('Error deleting dropdown option:', error);
      alert('Error deleting option. Please try again.');
    }
  };

  // Toggle active status
  const toggleActiveStatus = async (option: DropdownOption) => {
    try {
      const result = await DropdownService.toggleActiveStatus(option.id);

      if (!result.success) {
        console.error('Error toggling active status:', result.error);
        alert('Error updating option. Please try again.');
      } else {
        console.log('✅ Toggled active status');
        await loadDropdownOptions();
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Error updating option. Please try again.');
    }
  };

  // Get options by category
  const getOptionsByCategory = (category: string) => {
    return dropdownOptions.filter(option => option.category === category);
  };

  // Get category display name
  const getCategoryDisplayName = (category: string) => {
    const categoryNames: { [key: string]: string } = {
      'weight': 'Weight Options',
      'length': 'Length Options',
      'width': 'Width Options',
      'weight_units': 'Weight Units',
      'length_units': 'Length Units',
      'width_units': 'Width Units',
      'category': 'Product Categories',
      'subcategory': 'Product Subcategories',
      'color': 'Colors',
      'pattern': 'Patterns',
      'unit': 'Product Units',
      'material_category': 'Raw Material Categories',
      'material_unit': 'Raw Material Units'
    };
    return categoryNames[category] || category;
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    if (category.includes('weight')) return <Hash className="w-4 h-4" />;
    if (category.includes('length') || category.includes('width')) return <Ruler className="w-4 h-4" />;
    if (category === 'color') return <Palette className="w-4 h-4" />;
    if (category === 'category') return <Layers className="w-4 h-4" />;
    if (category === 'subcategory') return <Shapes className="w-4 h-4" />;
    if (category === 'pattern') return <Package className="w-4 h-4" />;
    if (category === 'unit') return <Settings className="w-4 h-4" />;
    if (category.includes('material')) return <Factory className="w-4 h-4" />;
    return <Settings className="w-4 h-4" />;
  };

  // Get all unique categories
  const getAllCategories = () => {
    const categories = [...new Set(dropdownOptions.map(option => option.category))];
    return categories.sort();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dropdown options...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dropdown Master</h1>
        <p className="text-gray-600">Manage all dropdown options, units, and data</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex gap-4 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('product')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all ${
            activeTab === 'product'
              ? 'text-blue-600 border-b-4 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <Package className="w-5 h-5" />
          Product Dropdowns
        </button>
        <button
          onClick={() => setActiveTab('material')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all ${
            activeTab === 'material'
              ? 'text-green-600 border-b-4 border-green-600 bg-green-50'
              : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
          }`}
        >
          <Factory className="w-5 h-5" />
          Material Dropdowns
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all ${
            activeTab === 'production'
              ? 'text-orange-600 border-b-4 border-orange-600 bg-orange-50'
              : 'text-gray-600 hover:text-orange-600 hover:bg-gray-50'
          }`}
        >
          <Settings className="w-5 h-5" />
          Production Dropdowns
        </button>
      </div>

      {/* PRODUCT DROPDOWNS SECTION */}
      {activeTab === 'product' && (
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-blue-600 mb-2 flex items-center gap-2">
            <Package className="w-6 h-6" />
            Product Dropdowns
          </h2>
          <p className="text-gray-600">Configure product attributes, measurements, and categories</p>
        </div>

        <div className="space-y-6">
          {/* Weight Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Weight Options
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('weight').length} values, {getOptionsByCategory('weight_units').length} units
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weight Options */}
              <div>
                <h4 className="text-sm font-medium mb-2">Weight Options (e.g., 400 GSM, 500 GSM, 2 kg, 5 kg)</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getOptionsByCategory('weight').map(option => (
                    <div key={option.id} className="flex items-center gap-1 bg-blue-100 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">{option.value}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-blue-200">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Weight Option */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-semibold mb-3 text-blue-800 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Weight Option
                  </h5>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Value</label>
                      <Input 
                        placeholder="800" 
                        value={newOption.category === 'weight_combined' ? newOption.value.split(' ')[0] : ''} 
                        onChange={(e) => {
                          const inputValue = e.target.value.trim();
                          const currentUnit = newOption.category === 'weight_combined' ? (newOption.value.split(' ')[1] || '').trim() : '';
                          // Only combine if unit is selected, otherwise just the value
                          const newValue = (inputValue && currentUnit) ? `${inputValue} ${currentUnit}` : inputValue;
                          setNewOption({ category: 'weight_combined', value: newValue, display_order: 1 });
                        }} 
                        className="w-full text-center font-medium" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Unit</label>
                      <div className="relative">
                        <select 
                          value={newOption.category === 'weight_combined' ? (newOption.value.split(' ')[1] || '') : ''} 
                          onChange={(e) => {
                            const currentValue = newOption.category === 'weight_combined' ? (newOption.value.split(' ')[0] || '').trim() : '';
                            const selectedUnit = e.target.value.trim();
                            // Only combine if there's a value, otherwise just keep the unit separate
                            if (currentValue && selectedUnit) {
                              setNewOption({ category: 'weight_combined', value: `${currentValue} ${selectedUnit}`, display_order: 1 });
                            } else if (selectedUnit) {
                              // If no value yet, don't set anything - user needs to enter value first
                              // Just keep the unit selection for when they enter the value
                              setNewOption({ category: 'weight_combined', value: ` ${selectedUnit}`, display_order: 1 });
                            } else {
                              // Unit cleared
                              setNewOption({ category: 'weight_combined', value: currentValue || '', display_order: 1 });
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 border rounded-md text-sm bg-white font-medium text-center appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select unit</option>
                          {getOptionsByCategory('weight_units').map(unit => (
                            <option key={unit.id} value={unit.value}>{unit.value}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="pt-5">
                      <Button 
                        size="sm" 
                        onClick={() => { 
                          if (newOption.category === 'weight_combined' && newOption.value.trim()) { 
                            addDropdownOption('weight'); 
                          } 
                        }} 
                        disabled={(() => {
                          if (newOption.category !== 'weight_combined') return true;
                          const parts = newOption.value.trim().split(' ');
                          const hasValue = parts[0] && parts[0].trim() !== '';
                          const hasUnit = parts[1] && parts[1].trim() !== '';
                          return !hasValue || !hasUnit;
                        })()}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 h-9"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Weight
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Weight Units */}
              <div>
                <h4 className="text-sm font-medium mb-2">Available Weight Units</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getOptionsByCategory('weight_units').map(option => (
                    <div key={option.id} className="flex items-center gap-1 bg-green-100 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">{option.value}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-green-200">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Weight Unit */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                  <h5 className="text-xs font-semibold mb-2 text-green-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Add New Length Unit
                  </h5>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="ton, mg, etc." 
                      value={newOption.category === 'weight_units' ? newOption.value : ''} 
                      onChange={(e) => setNewOption({ category: 'weight_units', value: e.target.value, display_order: 1 })} 
                      className="flex-1 text-sm" 
                    />
                    <Button 
                      size="sm" 
                      onClick={() => { if (newOption.category === 'weight_units' && newOption.value.trim()) addDropdownOption(); }} 
                      disabled={newOption.category !== 'weight_units' || !newOption.value.trim()}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 h-8 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Length Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Length Options
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('length').length} values, {getOptionsByCategory('length_units').length} units
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Length Options */}
              <div>
                <h4 className="text-sm font-medium mb-2">Length Options (e.g., 5 feet, 10 feet, 15 feet, 2.5 m, 3 m)</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getOptionsByCategory('length').map(option => (
                    <div key={option.id} className="flex items-center gap-1 bg-blue-100 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">{option.value}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-blue-200">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Length Option */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-semibold mb-3 text-blue-800 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Length Option
                  </h5>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Value</label>
                      <Input 
                        placeholder="20" 
                        value={newOption.category === 'length_combined' ? newOption.value.split(' ')[0] : ''} 
                        onChange={(e) => {
                          const inputValue = e.target.value.trim();
                          const currentUnit = newOption.category === 'length_combined' ? (newOption.value.split(' ')[1] || '').trim() : '';
                          // Only combine if unit is selected, otherwise just the value
                          const newValue = (inputValue && currentUnit) ? `${inputValue} ${currentUnit}` : inputValue;
                          setNewOption({ category: 'length_combined', value: newValue, display_order: 1 });
                        }} 
                        className="w-full text-center font-medium" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Unit</label>
                      <div className="relative">
                        <select 
                          value={newOption.category === 'length_combined' ? (newOption.value.split(' ')[1] || '') : ''} 
                          onChange={(e) => {
                            const currentValue = newOption.category === 'length_combined' ? (newOption.value.split(' ')[0] || '').trim() : '';
                            const selectedUnit = e.target.value.trim();
                            // Only combine if there's a value, otherwise just keep the unit separate
                            if (currentValue && selectedUnit) {
                              setNewOption({ category: 'length_combined', value: `${currentValue} ${selectedUnit}`, display_order: 1 });
                            } else if (selectedUnit) {
                              // If no value yet, don't set anything - user needs to enter value first
                              // Just keep the unit selection for when they enter the value
                              setNewOption({ category: 'length_combined', value: ` ${selectedUnit}`, display_order: 1 });
                            } else {
                              // Unit cleared
                              setNewOption({ category: 'length_combined', value: currentValue || '', display_order: 1 });
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 border rounded-md text-sm bg-white font-medium text-center appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select unit</option>
                          {getOptionsByCategory('length_units').map(unit => (
                            <option key={unit.id} value={unit.value}>{unit.value}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="pt-5">
                      <Button 
                        size="sm" 
                        onClick={() => { 
                          if (newOption.category === 'length_combined' && newOption.value.trim()) { 
                            addDropdownOption('length'); 
                          } 
                        }} 
                        disabled={(() => {
                          if (newOption.category !== 'length_combined') return true;
                          const parts = newOption.value.trim().split(' ');
                          const hasValue = parts[0] && parts[0].trim() !== '';
                          const hasUnit = parts[1] && parts[1].trim() !== '';
                          return !hasValue || !hasUnit;
                        })()}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 h-9"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Length
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Length Units */}
              <div>
                <h4 className="text-sm font-medium mb-2">Available Length Units</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getOptionsByCategory('length_units').map(option => (
                    <div key={option.id} className="flex items-center gap-1 bg-green-100 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">{option.value}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-green-200">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Length Unit */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                  <h5 className="text-xs font-semibold mb-2 text-green-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Add New Length Unit
                  </h5>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="yard, ft, m, etc." 
                      value={newOption.category === 'length_units' ? newOption.value : ''} 
                      onChange={(e) => setNewOption({ category: 'length_units', value: e.target.value, display_order: 1 })} 
                      className="flex-1 text-sm" 
                    />
                    <Button 
                      size="sm" 
                      onClick={() => { if (newOption.category === 'length_units' && newOption.value.trim()) addDropdownOption(); }} 
                      disabled={newOption.category !== 'length_units' || !newOption.value.trim()}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 h-8 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Length Unit
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Width Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Width Options
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('width').length} values, {getOptionsByCategory('width_units').length} units
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Width Options */}
              <div>
                <h4 className="text-sm font-medium mb-2">Width Options (e.g., 5 feet, 10 feet, 15 feet, 1.5 m, 2 m)</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getOptionsByCategory('width').map(option => (
                    <div key={option.id} className="flex items-center gap-1 bg-blue-100 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">{option.value}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-blue-200">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Width Option */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-semibold mb-3 text-blue-800 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Width Option
                  </h5>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Value</label>
                      <Input 
                        placeholder="25" 
                        value={newOption.category === 'width_combined' ? newOption.value.split(' ')[0] : ''} 
                        onChange={(e) => {
                          const inputValue = e.target.value.trim();
                          const currentUnit = newOption.category === 'width_combined' ? (newOption.value.split(' ')[1] || '').trim() : '';
                          // Only combine if unit is selected, otherwise just the value
                          const newValue = (inputValue && currentUnit) ? `${inputValue} ${currentUnit}` : inputValue;
                          setNewOption({ category: 'width_combined', value: newValue, display_order: 1 });
                        }}
                        className="w-full text-center font-medium" 
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Unit</label>
                      <div className="relative">
                        <select 
                          value={newOption.category === 'width_combined' ? (newOption.value.split(' ')[1] || '') : ''} 
                          onChange={(e) => {
                            const currentValue = newOption.category === 'width_combined' ? (newOption.value.split(' ')[0] || '').trim() : '';
                            const selectedUnit = e.target.value.trim();
                            // Only combine if there's a value, otherwise just keep the unit separate
                            if (currentValue && selectedUnit) {
                              setNewOption({ category: 'width_combined', value: `${currentValue} ${selectedUnit}`, display_order: 1 });
                            } else if (selectedUnit) {
                              // If no value yet, don't set anything - user needs to enter value first
                              // Just keep the unit selection for when they enter the value
                              setNewOption({ category: 'width_combined', value: ` ${selectedUnit}`, display_order: 1 });
                            } else {
                              // Unit cleared
                              setNewOption({ category: 'width_combined', value: currentValue || '', display_order: 1 });
                            }
                          }}
                          className="w-full px-3 py-2 pr-8 border rounded-md text-sm bg-white font-medium text-center appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select unit</option>
                          {getOptionsByCategory('width_units').map(unit => (
                            <option key={unit.id} value={unit.value}>{unit.value}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="pt-5">
                      <Button 
                        size="sm" 
                        onClick={() => { 
                          if (newOption.category === 'width_combined' && newOption.value.trim()) { 
                            addDropdownOption('width'); 
                          } 
                        }} 
                        disabled={(() => {
                          if (newOption.category !== 'width_combined') return true;
                          const parts = newOption.value.trim().split(' ');
                          const hasValue = parts[0] && parts[0].trim() !== '';
                          const hasUnit = parts[1] && parts[1].trim() !== '';
                          return !hasValue || !hasUnit;
                        })()}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 h-9"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Width
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Width Units */}
              <div>
                <h4 className="text-sm font-medium mb-2">Available Width Units</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getOptionsByCategory('width_units').map(option => (
                    <div key={option.id} className="flex items-center gap-1 bg-green-100 rounded-lg px-3 py-1">
                      <span className="text-sm font-medium">{option.value}</span>
                      <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-green-200">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                        {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {/* Add New Width Unit */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                  <h5 className="text-xs font-semibold mb-2 text-green-700 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Add New Length Unit
                  </h5>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="yard, ft, m, etc." 
                      value={newOption.category === 'width_units' ? newOption.value : ''} 
                      onChange={(e) => setNewOption({ category: 'width_units', value: e.target.value, display_order: 1 })} 
                      className="flex-1 text-sm" 
                    />
                    <Button 
                      size="sm" 
                      onClick={() => { if (newOption.category === 'width_units' && newOption.value.trim()) addDropdownOption(); }} 
                      disabled={newOption.category !== 'width_units' || !newOption.value.trim()}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 h-8 text-xs"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Categories
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('category').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('category').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-blue-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-blue-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new product category (e.g., Carpet, Rug, Mat)" 
                  value={newOption.category === 'category' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'category', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'category' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'category' || !newOption.value.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Category
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Subcategories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shapes className="w-5 h-5" />
                Product Subcategories
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('subcategory').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('subcategory').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-indigo-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-indigo-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new product subcategory (e.g., Traditional, Modern, Premium)" 
                  value={newOption.category === 'subcategory' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'subcategory', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'subcategory' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'subcategory' || !newOption.value.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Subcategory
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Product Colors
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('color').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('color').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-purple-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-purple-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new product color (e.g., Red, Blue, Green)" 
                  value={newOption.category === 'color' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'color', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'color' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'color' || !newOption.value.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Color
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shapes className="w-5 h-5" />
                Product Patterns
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('pattern').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('pattern').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-orange-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-orange-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new product pattern (e.g., Plain, Floral, Geometric)" 
                  value={newOption.category === 'pattern' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'pattern', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'pattern' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'pattern' || !newOption.value.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Pattern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product Units */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Product Units
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('unit').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('unit').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-teal-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-teal-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new product unit (e.g., roll, piece, set)" 
                  value={newOption.category === 'unit' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'unit', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'unit' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'unit' || !newOption.value.trim()}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Unit
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      )}

      {/* MATERIAL DROPDOWNS SECTION */}
      {activeTab === 'material' && (
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-green-600 mb-2 flex items-center gap-2">
            <Factory className="w-6 h-6" />
            Material Dropdowns
          </h2>
          <p className="text-gray-600">Configure raw material categories and units</p>
        </div>

        <div className="space-y-6">

          {/* Material Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Material Categories
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('material_category').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('material_category').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-green-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-green-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new material category (e.g., Yarn, Dye, Chemical)" 
                  value={newOption.category === 'material_category' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'material_category', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'material_category' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'material_category' || !newOption.value.trim()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Category
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Material Units */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Material Units
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('material_unit').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('material_unit').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-emerald-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-emerald-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new material unit (e.g., rolls, liters, kg, sqm)" 
                  value={newOption.category === 'material_unit' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'material_unit', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'material_unit' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'material_unit' || !newOption.value.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Unit
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      )}

      {/* PRODUCTION DROPDOWNS SECTION */}
      {activeTab === 'production' && (
      <div className="mb-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-orange-600 mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Production Dropdowns
          </h2>
          <p className="text-gray-600">Configure production priorities and quality ratings</p>
        </div>

        <div className="space-y-6">

          {/* Priority Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Priority Options
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('priority').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('priority').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-orange-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-orange-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new priority (e.g., low, critical)" 
                  value={newOption.category === 'priority' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'priority', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'priority' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'priority' || !newOption.value.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Priority
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quality Ratings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Quality Ratings
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('quality_rating').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('quality_rating').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-yellow-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-yellow-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new quality rating (e.g., A++, S)" 
                  value={newOption.category === 'quality_rating' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'quality_rating', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'quality_rating' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'quality_rating' || !newOption.value.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Rating
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Waste Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Waste Types
                <Badge variant="secondary" className="ml-auto">
                  {getOptionsByCategory('waste_type').length} options
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {getOptionsByCategory('waste_type').map(option => (
                  <div key={option.id} className="flex items-center gap-1 bg-red-100 rounded-lg px-3 py-1">
                    <span className="text-sm font-medium">{option.value}</span>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOption(option); setEditValue(option.value); setIsEditDialogOpen(true); }} className="h-4 w-4 p-0 hover:bg-red-200">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(option)} className={`h-4 w-4 p-0 ${option.is_active ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-200'}`}>
                      {option.is_active ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteDropdownOption(option.id)} className="h-4 w-4 p-0 text-red-600 hover:bg-red-100">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Add new waste type (e.g., contaminated, expired)" 
                  value={newOption.category === 'waste_type' ? newOption.value : ''} 
                  onChange={(e) => setNewOption({ category: 'waste_type', value: e.target.value, display_order: 1 })} 
                  className="flex-1" 
                />
                <Button 
                  size="sm" 
                  onClick={() => { if (newOption.category === 'waste_type' && newOption.value.trim()) addDropdownOption(); }} 
                  disabled={newOption.category !== 'waste_type' || !newOption.value.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Waste Type
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Option</DialogTitle>
            <DialogDescription>
              Edit the value of this dropdown option
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Enter new value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editDropdownOption} disabled={!editValue}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DropdownMaster;
