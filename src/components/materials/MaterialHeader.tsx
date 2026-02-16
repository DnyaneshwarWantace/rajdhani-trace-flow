import { Button } from '@/components/ui/button';
import { Upload, Plus, Download, List, Grid3x3 } from 'lucide-react';

interface MaterialHeaderProps {
  onImportCSV?: () => void;
  onExport?: () => void;
  onAddToInventory?: () => void;
  onAddMaterial?: () => void;
  viewMode?: 'grid' | 'table';
  onViewModeChange?: (mode: 'grid' | 'table') => void;
}

export default function MaterialHeader({
  onImportCSV,
  onExport,
  onAddToInventory,
  onAddMaterial,
  viewMode = 'table',
  onViewModeChange,
}: MaterialHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Raw Materials</h1>
          <p className="text-gray-600 mt-1">Manage your material inventory</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </Button>
          )}
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
          {onViewModeChange && (
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('table')}
                className={`hidden lg:inline-flex ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className={viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
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
