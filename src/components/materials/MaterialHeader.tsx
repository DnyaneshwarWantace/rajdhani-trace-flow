import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Download, List, Grid3x3, PackagePlus, MoreHorizontal, X, RefreshCw } from 'lucide-react';

interface MaterialHeaderProps {
  title?: string;
  subtitle?: string;
  onImportCSV?: () => void;
  onExport?: () => void;
  onAddToInventory?: () => void;
  onAddMaterial?: () => void;
  onBulkRestock?: () => void;
  viewMode?: 'grid' | 'table';
  onViewModeChange?: (mode: 'grid' | 'table') => void;
  /** Mobile subtitle line e.g. "94 raw materials · ₹43.80L total value" */
  mobileSubtitle?: string;
}

export default function MaterialHeader({
  title = 'Materials',
  subtitle = 'Manage your material inventory',
  onImportCSV,
  onExport,
  onAddToInventory,
  onAddMaterial,
  onBulkRestock,
  viewMode = 'table',
  onViewModeChange,
  mobileSubtitle,
}: MaterialHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="mb-4 lg:mb-6">
      {/* Mobile header */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMoreOpen(true)}
              className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 active:bg-gray-50 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {onBulkRestock && (
              <button
                onClick={onBulkRestock}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 active:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Bulk
              </button>
            )}
            {onAddMaterial && (
              <button
                onClick={onAddMaterial}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0066FF] text-white active:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {mobileSubtitle && (
          <p className="text-sm text-gray-500">{mobileSubtitle}</p>
        )}
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExport && (
            <Button variant="outline" onClick={onExport} className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          {onImportCSV && (
            <Button variant="outline" onClick={onImportCSV} className="gap-2">
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
          )}
          {onViewModeChange && (
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('table')}
                className={`hidden lg:inline-flex h-10 w-10 p-0 ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className={`h-10 w-10 p-0 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}`}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          )}
          {onBulkRestock && (
            <Button variant="outline" onClick={onBulkRestock} className="gap-2">
              <PackagePlus className="w-4 h-4" />
              Bulk Restock
            </Button>
          )}
          {onAddToInventory && (
            <Button variant="outline" onClick={onAddToInventory} className="gap-2">
              <Plus className="w-4 h-4" />
              Add to Inventory
            </Button>
          )}
          {onAddMaterial && (
            <Button onClick={onAddMaterial} className="gap-2 bg-primary-600 text-white hover:bg-primary-700">
              <Plus className="w-4 h-4" />
              <span className="font-medium">Add Material</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile more-actions sheet */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-sm font-semibold text-gray-700">More Actions</span>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 pb-8 space-y-2">
              {onAddToInventory && (
                <button onClick={() => { setMoreOpen(false); onAddToInventory(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 active:bg-gray-50">
                  <Plus className="w-4 h-4 text-blue-600" /> Add to Inventory
                </button>
              )}
              {onImportCSV && (
                <button onClick={() => { setMoreOpen(false); onImportCSV(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 active:bg-gray-50">
                  <Upload className="w-4 h-4 text-purple-600" /> Import CSV
                </button>
              )}
              {onExport && (
                <button onClick={() => { setMoreOpen(false); onExport(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 active:bg-gray-50">
                  <Download className="w-4 h-4 text-gray-600" /> Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
