import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import { ProductService } from '@/services/productService';
import type { Product } from '@/types/product';
import ProductFilters from './ProductFilters';
import ProductList from './ProductList';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
  const [subcategory, setSubcategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Reset page when filters change
    setPage(1);
    loadProducts(1);
  }, [searchTerm, category, subcategory, limit]);

  const loadInitialData = async () => {
    try {
      // Load initial products
      await loadProducts(1);
      
      // Load categories and subcategories for filters
      const { products: allProducts } = await ProductService.getProducts({ limit: 1000 });
      const uniqueCategories = Array.from(
        new Set(allProducts.map((p) => p.category).filter(Boolean))
      ) as string[];
      const uniqueSubcategories = Array.from(
        new Set(allProducts.map((p) => p.subcategory).filter(Boolean))
      ) as string[];
      
      setCategories(uniqueCategories.sort());
      setSubcategories(uniqueSubcategories.sort());
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadProducts = async (pageNum: number) => {
    try {
      setLoading(true);
      const filters: any = {
        page: pageNum,
        limit,
        status: 'active',
      };

      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      if (category) {
        filters.category = category;
      }
      if (subcategory) {
        filters.subcategory = subcategory;
      }

      const { products: newProducts, total: totalCount } = await ProductService.getProducts(filters);
      
      // Filter by subcategory client-side if needed (since API doesn't support it)
      let filteredProducts = newProducts || [];
      if (subcategory) {
        filteredProducts = filteredProducts.filter((p) => p.subcategory === subcategory);
        // Adjust total for client-side filtering
        const allProducts = await ProductService.getProducts({ ...filters, limit: 1000 });
        const filteredTotal = allProducts.products.filter((p) => p.subcategory === subcategory).length;
        setTotal(filteredTotal);
      } else {
        setTotal(totalCount || 0);
      }
      
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      loadProducts(1);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadProducts(newPage);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(1);
    loadProducts(1);
  };

  const totalPages = Math.ceil(total / limit);
  const pages: (number | 'ellipsis')[] = [];
  
  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);
    
    if (page > 3) {
      pages.push('ellipsis');
    }
    
    // Show pages around current page
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }
    
    if (page < totalPages - 2) {
      pages.push('ellipsis');
    }
    
    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Select Product</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search products by name..."
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <ProductFilters
          category={category}
          subcategory={subcategory}
          onCategoryChange={(value) => {
            setCategory(value);
            setSubcategory(''); // Reset subcategory when category changes
          }}
          onSubcategoryChange={setSubcategory}
          categories={categories}
          subcategories={subcategories}
        />

        {/* Product List */}
        <ProductList
          products={products}
          selectedProductId={selectedProductId}
          onSelect={onSelect}
          loading={loading}
        />

        {/* Pagination */}
        {total > 0 && (
          <div className="mt-4">
            <Pagination className="w-full">
              <PaginationContent className="w-full justify-center flex-wrap gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (page > 1) {
                        handlePageChange(page - 1);
                      }
                    }}
                    className={`${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                  />
                </PaginationItem>

                {/* Page Numbers */}
                {pages.map((pageNum, index) => (
                  <PaginationItem key={index} className={pageNum === 'ellipsis' ? 'hidden sm:block' : ''}>
                    {pageNum === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        isActive={pageNum === page}
                        onClick={() => handlePageChange(pageNum as number)}
                        className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                          Math.abs((pageNum as number) - page) > 1 && (pageNum as number) !== 1 && (pageNum as number) !== totalPages
                            ? 'hidden sm:flex'
                            : ''
                        }`}
                      >
                        {pageNum}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      if (page < totalPages) {
                        handlePageChange(page + 1);
                      }
                    }}
                    className={`${page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            {/* Pagination Info and Limit Selector */}
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {(page - 1) * limit + 1} to{' '}
                {Math.min(page * limit, total)} of {total} products
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => handleLimitChange(parseInt(value))}
                >
                  <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

