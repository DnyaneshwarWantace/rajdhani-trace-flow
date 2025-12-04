import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DropdownSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function DropdownSearchBar({
  value,
  onChange,
  placeholder = 'Search options...',
}: DropdownSearchBarProps) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 h-full hover:bg-transparent"
        >
          <X className="w-4 h-4 text-gray-400" />
        </Button>
      )}
    </div>
  );
}

