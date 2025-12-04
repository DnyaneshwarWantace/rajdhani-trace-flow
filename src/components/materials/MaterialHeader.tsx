import { Button } from '@/components/ui/button';
import { Upload, Plus } from 'lucide-react';

interface MaterialHeaderProps {
  onImportCSV?: () => void;
  onAddToInventory?: () => void;
  onAddMaterial?: () => void;
}

export default function MaterialHeader({
  onImportCSV,
  onAddToInventory,
  onAddMaterial,
}: MaterialHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Raw Materials</h1>
          <p className="text-gray-600 mt-1">Manage your material inventory</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onImportCSV && (
            <Button
              variant="outline"
              onClick={onImportCSV}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import CSV</span>
              <span className="sm:hidden">Import</span>
            </Button>
          )}
          {onAddToInventory && (
            <Button
              variant="outline"
              onClick={onAddToInventory}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add to Inventory</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
          {onAddMaterial && (
            <Button
              onClick={onAddMaterial}
              className="gap-2 bg-primary-600 text-white hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add Material</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

