import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductService } from '@/services/productService';
import type { Product } from '@/types/product';
import ProductFilters from './ProductFilters';
import ProductList from './ProductList';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductSearchSectionProps {
  onSelect: (product: Product) => void;
  selectedProductId: string | null;
}

export default function ProductSearchSection({
  onSelect,
  selectedProductId,
}: ProductSearchSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [selectedWidths, setSelectedWidths] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [widths, setWidths] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  useEffect(() => {
    setPage(1);
    loadProducts();
  }, [searchTerm, category, selectedSubcategories, selectedColors, selectedPatterns, selectedLengths, selectedWidths, selectedWeights, limit]);

  useEffect(() => {
    loadProducts();
  }, [page]);

  const loadCategories = async () => {
    try {
      const { products: allProducts } = await ProductService.getProducts({
        limit: 10000
      });

      const uniqueCategories = Array.from(
        new Set(allProducts.map((p) => p.category).filter(Boolean))
      ).sort() as string[];

      const uniqueSubcategories = Array.from(
        new Set(allProducts.map((p) => p.subcategory).filter(Boolean))
      ).sort() as string[];

      // Extract unique colors
      const uniqueColors = Array.from(
        new Set(allProducts.map((p) => p.color).filter((c) => c && c !== 'N/A' && c !== 'NA'))
      ).sort() as string[];

      // Extract unique patterns
      const uniquePatterns = Array.from(
        new Set(allProducts.map((p) => p.pattern).filter((p) => p && p !== 'N/A' && p !== 'NA'))
      ).sort() as string[];

      // Extract unique lengths with units
      const lengthsWithUnits = allProducts
        .map((p) => {
          if (!p.length || p.length === 'N/A' || p.length === 'NA') return null;
          const unit = p.length_unit || '';
          return `${p.length} ${unit}`.trim();
        })
        .filter((v): v is string => Boolean(v));
      const uniqueLengths = Array.from(new Set(lengthsWithUnits))
        .sort((a, b) => parseFloat(a) - parseFloat(b));

      // Extract unique widths with units
      const widthsWithUnits = allProducts
        .map((p) => {
          if (!p.width || p.width === 'N/A' || p.width === 'NA') return null;
          const unit = p.width_unit || '';
          return `${p.width} ${unit}`.trim();
        })
        .filter((v): v is string => Boolean(v));
      const uniqueWidths = Array.from(new Set(widthsWithUnits))
        .sort((a, b) => parseFloat(a) - parseFloat(b));

      // Extract unique weights with units
      const weightsWithUnits = allProducts
        .map((p) => {
          if (!p.weight || p.weight === 'N/A' || p.weight === 'NA') return null;
          const unit = p.weight_unit || '';
          return `${p.weight} ${unit}`.trim();
        })
        .filter((v): v is string => Boolean(v));
      const uniqueWeights = Array.from(new Set(weightsWithUnits))
        .sort((a, b) => parseFloat(a) - parseFloat(b));

      setCategories(uniqueCategories);
      setSubcategories(uniqueSubcategories);
      setColors(uniqueColors);
      setPatterns(uniquePatterns);
      setLengths(uniqueLengths);
      setWidths(uniqueWidths);
      setWeights(uniqueWeights);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);

      const filters: any = {
        page,
        limit,
        // Don't filter by status - show all products
      };

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }

      if (category) {
        filters.category = category;
      }

      if (selectedSubcategories.length > 0) {
        filters.subcategory = selectedSubcategories;
      }

      if (selectedColors.length > 0) {
        filters.color = selectedColors;
      }

      if (selectedPatterns.length > 0) {
        filters.pattern = selectedPatterns;
      }

      if (selectedLengths.length > 0) {
        // Extract numeric values from lengths (e.g., "50 m" -> "50")
        filters.length = selectedLengths.map(l => l.split(' ')[0]);
      }

      if (selectedWidths.length > 0) {
        // Extract numeric values from widths
        filters.width = selectedWidths.map(w => w.split(' ')[0]);
      }

      if (selectedWeights.length > 0) {
        // Extract numeric values from weights
        filters.weight = selectedWeights.map(w => w.split(' ')[0]);
      }

      const { products: fetchedProducts, total: totalCount } = await ProductService.getProducts(filters);

      console.log('Loaded products:', fetchedProducts.length, 'Total:', totalCount);
      setProducts(fetchedProducts || []);
      setTotal(totalCount || 0);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const totalPages = Math.ceil(total / limit);
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-3 py-3">
        <CardTitle className="text-base font-semibold">Select Product</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 flex-1 flex flex-col px-3 py-0 pb-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search products..."
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <ProductFilters
          category={category}
          subcategoriesSelected={selectedSubcategories}
          colorsSelected={selectedColors}
          patternsSelected={selectedPatterns}
          lengthsSelected={selectedLengths}
          widthsSelected={selectedWidths}
          weightsSelected={selectedWeights}
          onCategoryChange={(value) => {
            setCategory(value);
            setSelectedSubcategories([]);
          }}
          onSubcategoriesChange={setSelectedSubcategories}
          onColorsChange={setSelectedColors}
          onPatternsChange={setSelectedPatterns}
          onLengthsChange={setSelectedLengths}
          onWidthsChange={setSelectedWidths}
          onWeightsChange={setSelectedWeights}
          categories={categories}
          subcategories={subcategories}
          colors={colors}
          patterns={patterns}
          lengths={lengths}
          widths={widths}
          weights={weights}
        />

        {/* Product List */}
        <div className="flex-1 min-h-0">
          <ProductList
            products={products}
            selectedProductId={selectedProductId}
            onSelect={onSelect}
            loading={loading}
          />
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="space-y-3 pt-3 border-t">
            {/* Pagination Info */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing <span className="font-medium">{startItem}</span> to{' '}
                <span className="font-medium">{endItem}</span> of{' '}
                <span className="font-medium">{total}</span> products
              </span>

              {/* Items per page */}
              <div className="flex items-center gap-2">
                <span className="text-xs whitespace-nowrap">Per page:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <Button
                      key={i}
                      variant={page === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Page Info */}
            <div className="text-center text-xs text-gray-500">
              Page {page} of {totalPages}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
