import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface DebouncedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minCharacters?: number;
  debounceMs?: number;
  className?: string;
  showCounter?: boolean;
}

export function DebouncedSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  minCharacters = 3,
  debounceMs = 500,
  className = '',
  showCounter = true,
}: DebouncedSearchInputProps) {
  // Local state for immediate UI feedback
  const [searchValue, setSearchValue] = useState(value || '');

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update local search value when external value changes
  useEffect(() => {
    setSearchValue(value || '');
  }, [value]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle search input with debouncing
  const handleSearchChange = (inputValue: string) => {
    // Update local state immediately for UI responsiveness
    setSearchValue(inputValue);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Only trigger search if value length >= minCharacters or empty (to clear search)
    if (inputValue.length >= minCharacters || inputValue.length === 0) {
      // Set new timer to trigger actual search after debounceMs of no typing
      debounceTimerRef.current = setTimeout(() => {
        onChange(inputValue);
      }, debounceMs);
    }
  };

  const remainingChars = minCharacters - searchValue.length;
  const showCounterText = showCounter && searchValue.length > 0 && searchValue.length < minCharacters;

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchValue}
        onChange={(e) => handleSearchChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2"
      />
      {showCounterText && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">
          Type {remainingChars} more
        </span>
      )}
    </div>
  );
}
