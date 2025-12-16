import { Loader2 } from 'lucide-react';
import MaterialTable from './MaterialTable';
import MaterialCard from './MaterialCard';
import MaterialPagination from './MaterialPagination';
import type { RawMaterial, MaterialFilters } from '@/types/material';

interface MaterialInventoryTabProps {
  materials: RawMaterial[];
  loading: boolean;
  error: string | null;
  filters: MaterialFilters;
  viewMode: 'grid' | 'table';
  totalMaterials: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onView?: (material: RawMaterial) => void;
  onEdit?: (material: RawMaterial) => void;
  onDelete?: (material: RawMaterial) => void;
  onOrder?: (material: RawMaterial) => void;
  canDelete?: boolean;
}

export default function MaterialInventoryTab({
  materials,
  loading,
  error,
  filters,
  viewMode,
  totalMaterials,
  onSearchChange: _onSearchChange,
  onCategoryChange: _onCategoryChange,
  onStatusChange: _onStatusChange,
  onViewModeChange: _onViewModeChange,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDelete,
  onOrder,
  canDelete = false,
}: MaterialInventoryTabProps) {
  return (
    <>
      {/* Loading State - Same as products */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading materials...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Materials List */}
      {!loading && !error && (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block">
            {viewMode === 'table' ? (
              <MaterialTable
                materials={materials}
                onView={onView}
                onEdit={onEdit}
                onDelete={canDelete ? onDelete : undefined}
                onOrder={onOrder}
              />
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {materials.map((material) => (
                  <div key={material._id} className="break-inside-avoid">
                    <MaterialCard
                      material={material}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={canDelete ? onDelete : undefined}
                      onOrder={onOrder}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tablet & Mobile View - Always Masonry (2 columns on tablet, 1 on mobile) */}
          <div className="lg:hidden">
            <div className="columns-1 md:columns-2 gap-4 space-y-4">
              {materials.map((material) => (
                <div key={material._id} className="break-inside-avoid">
                  <MaterialCard
                    material={material}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={canDelete ? onDelete : undefined}
                    onOrder={onOrder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {materials.length === 0 && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Materials Found</h3>
              <p className="text-gray-600">
                {filters.search || filters.category || filters.status
                  ? 'Try adjusting your filters'
                  : 'No materials have been added yet'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {materials.length > 0 && (
            <MaterialPagination
              totalMaterials={totalMaterials}
              filters={filters}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
            />
          )}
        </>
      )}
    </>
  );
}

