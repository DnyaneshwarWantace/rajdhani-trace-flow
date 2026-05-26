import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Loader2 } from 'lucide-react';
import DropdownTabs from '@/components/dropdowns/DropdownTabs';
import ProductTab from '@/components/dropdowns/ProductTab';
import MaterialTab from '@/components/dropdowns/MaterialTab';
import ProductionTab from '@/components/dropdowns/ProductionTab';
import DeleteDropdownDialog from '@/components/dropdowns/DeleteDropdownDialog';
import ToggleDropdownDialog from '@/components/dropdowns/ToggleDropdownDialog';
import { useDropdowns } from '@/hooks/useDropdowns';
import type { DropdownOption } from '@/types/dropdown';
import type { TabType } from '@/config/dropdownConfig';

const toastFunction = ({
  title,
  description,
  variant,
}: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => {
  if (variant === 'destructive') {
    console.error(`[ERROR] ${title}: ${description}`);
    alert(`${title}: ${description}`);
  } else {
    console.log(`[SUCCESS] ${title}: ${description}`);
  }
};

export default function DropdownMaster() {
  const [activeTab, setActiveTab] = useState<TabType>('product');
  const [deletingOption, setDeletingOption] = useState<DropdownOption | null>(null);
  const [togglingOption, setTogglingOption] = useState<DropdownOption | null>(null);
  const [formData, setFormData] = useState<Record<string, { value: string; unit: string }>>({});
  const [simpleFormData, setSimpleFormData] = useState<Record<string, string>>({});

  const {
    loading,
    usageMap,
    getOptionsByCategory,
    addCombined,
    addSimple,
    deleteOption,
    toggleActive,
  } = useDropdowns(toastFunction);

  const handleAddCombined = async (valueCategory: string) => {
    const data = formData[valueCategory] || { value: '', unit: '' };
    await addCombined(valueCategory, data.value, data.unit);
    setFormData({ ...formData, [valueCategory]: { value: '', unit: '' } });
  };

  const handleAddSimple = async (category: string) => {
    const value = simpleFormData[category] || '';
    await addSimple(category, value);
    setSimpleFormData({ ...simpleFormData, [category]: '' });
  };

  const handleFormDataChange = (valueCategory: string, data: { value: string; unit: string }) => {
    setFormData({ ...formData, [valueCategory]: data });
  };

  const handleSimpleFormDataChange = (category: string, value: string) => {
    setSimpleFormData({ ...simpleFormData, [category]: value });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading dropdown options...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Dropdown Master</h1>
          <p className="text-sm text-gray-600">Manage all dropdown options, units, and data</p>
        </div>

        <DropdownTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="space-y-6">
          {activeTab === 'product' && (
            <ProductTab
              getOptionsByCategory={getOptionsByCategory}
              formData={formData}
              simpleFormData={simpleFormData}
              usageMap={usageMap}
              onDelete={(opt) => setDeletingOption(opt)}
              onToggleActive={(opt) => setTogglingOption(opt)}
              onAddCombined={handleAddCombined}
              onAddSimple={handleAddSimple}
              onFormDataChange={handleFormDataChange}
              onSimpleFormDataChange={handleSimpleFormDataChange}
            />
          )}

          {activeTab === 'material' && (
            <MaterialTab
              getOptionsByCategory={getOptionsByCategory}
              simpleFormData={simpleFormData}
              usageMap={usageMap}
              onDelete={(opt) => setDeletingOption(opt)}
              onToggleActive={(opt) => setTogglingOption(opt)}
              onAddSimple={handleAddSimple}
              onSimpleFormDataChange={handleSimpleFormDataChange}
            />
          )}

          {activeTab === 'production' && (
            <ProductionTab
              getOptionsByCategory={getOptionsByCategory}
              simpleFormData={simpleFormData}
              usageMap={usageMap}
              onDelete={(opt) => setDeletingOption(opt)}
              onToggleActive={(opt) => setTogglingOption(opt)}
              onAddSimple={handleAddSimple}
              onSimpleFormDataChange={handleSimpleFormDataChange}
            />
          )}
        </div>

        <DeleteDropdownDialog
          open={!!deletingOption}
          onOpenChange={(open: boolean) => !open && setDeletingOption(null)}
          option={deletingOption}
          onDelete={deleteOption}
        />

        <ToggleDropdownDialog
          open={!!togglingOption}
          onOpenChange={(open: boolean) => !open && setTogglingOption(null)}
          option={togglingOption}
          onConfirm={toggleActive}
        />
      </div>
    </Layout>
  );
}
