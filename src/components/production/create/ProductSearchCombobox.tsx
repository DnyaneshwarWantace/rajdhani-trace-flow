import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Package, Loader2 } from 'lucide-react';
import { ProductService } from '@/services/productService';
import type { Product } from '@/types/product';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductSearchComboboxProps {
  onSelect: (product: Product) => void;
  selectedProduct: Product | null;
  onClear: () => void;
}

export default function ProductSearchCombobox({
  onSelect,
  selectedProduct,
  onClear,
}: ProductSearchComboboxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(selectedProduct.name);
    }
  }, [selectedProduct]);

  const searchProducts = async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const { products } = await ProductService.getProducts({
        search: term,
        limit: 20, // Limit results for performance
        status: 'active',
      });
      setResults(products || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    if (selectedProduct && value !== selectedProduct.name) {
      onClear();
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      setShowResults(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchProducts(value);
      }, 300);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    setSearchTerm(product.name);
    setShowResults(false);
    setResults([]);
  };

  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    onClear();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input
          type="text"
          placeholder="Search product by name, category..."
          className="pl-10 pr-10"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => {
            if (searchTerm.length >= 2 && results.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        <TruncatedText text={product.name} maxLength={50} />
                      </p>
                      {product.category && (
                        <p className="text-sm text-gray-500">
                          {product.category}
                          {product.subcategory && ` / ${product.subcategory}`}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No products found</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}


