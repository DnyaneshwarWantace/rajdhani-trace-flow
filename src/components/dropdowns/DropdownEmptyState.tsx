import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DropdownEmptyStateProps {
  categoryLabel: string;
  hasSearch: boolean;
  onAdd: () => void;
}

export default function DropdownEmptyState({
  categoryLabel,
  hasSearch,
  onAdd,
}: DropdownEmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {hasSearch ? (
          <Search className="w-8 h-8 text-gray-400" />
        ) : (
          <Plus className="w-8 h-8 text-gray-400" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {hasSearch ? 'No options found' : `No ${categoryLabel.toLowerCase()} options yet`}
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        {hasSearch
          ? 'Try adjusting your search terms'
          : `Get started by adding your first ${categoryLabel.toLowerCase()} option`}
      </p>
      {!hasSearch && (
        <Button onClick={onAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          Add First Option
        </Button>
      )}
    </div>
  );
}

