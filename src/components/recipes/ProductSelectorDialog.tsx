import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check, ChevronDown, ChevronRight, Package, X, SlidersHorizontal, AlignJustify, Loader2 } from 'lucide-react';
import { ProductService } from '@/services/productService';
import type { Product } from '@/types/product';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination-primitives';

interface ProductSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  selectedProductId?: string;
}

export default function ProductSelectorDialog({
  isOpen,
  onClose,
  onSelect,
  selectedProductId,
}: ProductSelectorDialogProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredAndSortedProducts, setFilteredAndSortedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [selectedWidths, setSelectedWidths] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});
  const [lengths, setLengths] = useState<string[]>([]);
  const [widths, setWidths] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isSelecting, setIsSelecting] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Mobile sheet states
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileFilterTab, setMobileFilterTab] = useState<string>('category');

  // Freeze scrolling when dialog is open on mobile
  useEffect(() => {
    if (isOpen && isMobile) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen, isMobile]);

  // Load full product list once when dialog opens (no filters). Filter options stay from this full list.
  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setSearchTerm('');
      setSelectedCategories([]);
      setSelectedSubcategories([]);
      setSelectedColors([]);
      setSelectedPatterns([]);
      setSelectedLengths([]);
      setSelectedWidths([]);
      setSelectedWeights([]);
      setExpandedGroups(new Set());
      setCurrentPage(1);
      setIsSelecting(false);
      setSortBy('name');
      setSortOrder('asc');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
    }
  }, [sortBy, sortOrder, isOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, selectedSubcategories, selectedColors, selectedPatterns, selectedLengths, selectedWidths, selectedWeights]);

  useEffect(() => {
    filterAndSortProducts();
  }, [allProducts, searchTerm, sortBy, sortOrder, selectedCategories, selectedSubcategories, selectedColors, selectedPatterns, selectedLengths, selectedWidths, selectedWeights]);

  useEffect(() => {
    applyPagination();
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      // Load products that have recipes from backend (server-side filter)
      // so we don't fetch unnecessary items.
      const [result, dropdownData] = await Promise.all([
        ProductService.getProducts({
          limit: 10000,
          has_recipe: true,
          sortBy: 'name',
          sortOrder: 'asc',
        }),
        ProductService.getDropdownData().catch(() => null),
      ]);
      const loadedProducts = result.products || [];
      const productsWithRecipes = loadedProducts.filter((p) => p.has_recipe);

      setAllProducts(productsWithRecipes);

      // Filter options from FULL list so category/color etc. always show all options
      const uniqueCategories = Array.from(
        new Set(productsWithRecipes.map((p) => p.category).filter((c): c is string => typeof c === 'string' && c !== ''))
      ).sort();
      const uniqueSubcategories = Array.from(
        new Set(productsWithRecipes.map((p) => p.subcategory).filter((s): s is string => typeof s === 'string' && s !== ''))
      ).sort();
      const uniqueColors = Array.from(
        new Set(
          productsWithRecipes
            .map((p) => p.color)
            .filter((c): c is string => typeof c === 'string' && c.trim() !== '' && c.toLowerCase() !== 'n/a')
        )
      ).sort();
      const uniquePatterns = Array.from(
        new Set(
          productsWithRecipes
            .map((p) => p.pattern)
            .filter((p): p is string => typeof p === 'string' && p.trim() !== '' && p.toLowerCase() !== 'n/a')
        )
      ).sort();
      const uniqueLengths = Array.from(
        new Set(productsWithRecipes.map((p) => p.length).filter((l): l is string => typeof l === 'string' && l !== ''))
      ).sort();
      const uniqueWidths = Array.from(
        new Set(productsWithRecipes.map((p) => p.width).filter((w): w is string => typeof w === 'string' && w !== ''))
      ).sort();
      const uniqueWeights = Array.from(
        new Set(productsWithRecipes.map((p) => p.weight).filter((w): w is string => typeof w === 'string' && w !== ''))
      ).sort();

      setCategories(uniqueCategories);
      setSubcategories(uniqueSubcategories);
      setColors(uniqueColors);
      setPatterns(uniquePatterns);
      const nextColorCodeMap: Record<string, string> = {};
      (dropdownData?.colors || []).forEach((item: any) => {
        if (item?.value && item?.color_code) nextColorCodeMap[item.value] = item.color_code;
      });
      setColorCodeMap(nextColorCodeMap);

      const nextPatternImageMap: Record<string, string> = {};
      (dropdownData?.patterns || []).forEach((item: any) => {
        if (item?.value && item?.image_url) nextPatternImageMap[item.value] = item.image_url;
      });
      setPatternImageMap(nextPatternImageMap);
      setLengths(uniqueLengths);
      setWidths(uniqueWidths);
      setWeights(uniqueWeights);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProducts = () => {
    // Filter by search term
    let filtered = searchTerm.trim()
      ? allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allProducts;

    // Apply category/color/etc. filters client-side (options always from full list)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p) => p.category && selectedCategories.includes(p.category));
    }
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter((p) => p.subcategory && selectedSubcategories.includes(p.subcategory));
    }
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) => p.color && selectedColors.includes(p.color));
    }
    if (selectedPatterns.length > 0) {
      filtered = filtered.filter((p) => p.pattern && selectedPatterns.includes(p.pattern));
    }
    if (selectedLengths.length > 0) {
      filtered = filtered.filter((p) => p.length && selectedLengths.includes(p.length));
    }
    if (selectedWidths.length > 0) {
      filtered = filtered.filter((p) => p.width && selectedWidths.includes(p.width));
    }
    if (selectedWeights.length > 0) {
      filtered = filtered.filter((p) => p.weight && selectedWeights.includes(p.weight));
    }

    // Apply sorting to filtered products
    const sorted = [...filtered].sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = (a.name || '').localeCompare(b.name || '');
          break;
        case 'stock':
          compareValue = (a.current_stock || 0) - (b.current_stock || 0);
          break;
        case 'category':
          compareValue = (a.category || '').localeCompare(b.category || '');
          break;
        case 'recent':
          compareValue = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredAndSortedProducts(sorted);
  };

  const applyPagination = () => {
    // Apply pagination to already filtered and sorted products
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filteredAndSortedProducts.slice(startIndex, endIndex);

    setProducts(paginatedProducts);
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const handleSelect = (product: Product, event?: React.MouseEvent) => {
    // Prevent any default behavior
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!product || !product.id) {
      console.error('Invalid product selected:', product);
      return;
    }
    
    console.log('Selecting product:', product.id, product.name);
    
    // Set selecting flag to prevent dialog from closing prematurely
    setIsSelecting(true);
    
    try {
      // Call onSelect to update parent state first - this must complete before closing
      console.log('Calling onSelect callback');
      onSelect(product);
      console.log('onSelect callback completed');
      
      // Close the dialog after ensuring state update completes
      // Use a small timeout to ensure React has processed the state update
      setTimeout(() => {
        console.log('Closing dialog');
        setIsSelecting(false);
        onClose();
      }, 100);
    } catch (error) {
      console.error('Error in handleSelect:', error);
      setIsSelecting(false);
      // Don't close dialog if there's an error
    }
  };


  // Use paginated products for grouping (already sorted and paginated)
  const sortedProducts = products;
  const totalFiltered = filteredAndSortedProducts.length;
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Group products by name while preserving sort order
  const groupedProducts = sortedProducts.reduce((acc, product) => {
    const key = product.name.trim().toLowerCase();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Get group keys in the order they appear in sortedProducts (preserving user's sort order)
  const seenKeys = new Set<string>();
  const sortedGroupKeys: string[] = [];
  
  // First, add groups in the order they appear in sortedProducts
  for (const product of sortedProducts) {
    const key = product.name.trim().toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      sortedGroupKeys.push(key);
    }
  }
  
  // Then add any remaining groups (shouldn't happen, but just in case)
  for (const key of Object.keys(groupedProducts)) {
    if (!seenKeys.has(key)) {
      sortedGroupKeys.push(key);
    }
  }

  const handleDialogClose = (open: boolean) => {
    // Prevent closing if we're in the middle of selecting
    if (isSelecting) {
      return;
    }
    // Only close if explicitly requested
    if (!open) {
      onClose();
    }
  };

  const renderMobileCard = (product: Product) => {
    const isSel = selectedProductId === product.id;
    const stockQty = product.current_stock || 0;
    const inProd = product.individual_product_stats?.in_production || 0;
    const stockColor = stockQty <= 0 ? '#EF4444' : stockQty < 10 ? '#F97316' : '#16A34A';
    const stockBg = stockQty <= 0 ? '#FEF2F2' : stockQty < 10 ? '#FFF7ED' : '#F0FDF4';
    const colorCode = product.color ? colorCodeMap[product.color?.toLowerCase()] || colorCodeMap[product.color] : undefined;

    const len = product.length && String(product.length).trim() ? String(product.length).trim() : '';
    const wid = product.width && String(product.width).trim() ? String(product.width).trim() : '';
    const lenStr = len ? `${len}${product.length_unit || 'm'}` : '';
    const widStr = wid ? `${wid}${product.width_unit || 'm'}` : '';
    const dim = (lenStr || widStr) ? `${lenStr} × ${widStr}` : null;
    const gsm = product.weight && String(product.weight).trim() ? `${product.weight}${product.weight_unit || 'GSM'}` : null;
    const specs = dim && gsm ? `${dim} · ${gsm}` : dim || gsm;

    return (
      <button
        key={product.id}
        onClick={(e) => handleSelect(product, e)}
        className="text-left w-full rounded-xl p-2.5 transition-colors relative"
        style={{
          backgroundColor: isSel ? '#EFF6FF' : '#fff',
          border: `1px solid ${isSel ? '#2563EB' : '#E5E7EB'}`,
        }}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] text-gray-400 font-mono">#{String(product.id || '').substring(0, 12)}</span>
          {product.image_url && (
            <img src={product.image_url} alt="" className="w-5 h-5 rounded object-cover border border-gray-100" />
          )}
        </div>
        <p className="text-[12.5px] font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{product.name}</p>

        {specs && <p className="text-[9.5px] text-gray-500 mb-1 truncate">{specs}</p>}
        {product.color && product.color !== 'N/A' && (
          <div className="flex items-center gap-1 mb-1">
            <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: colorCode || '#D1D5DB' }} />
            <span className="text-[9.5px] text-gray-500">{product.color}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: stockBg, color: stockColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stockColor }} />
            Stock: {stockQty} {product.count_unit || product.unit || 'pcs'}
          </span>
          {inProd > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              In Prod: {inProd}
            </span>
          )}
        </div>
        {isSel && (
          <div className="absolute top-1.5 right-1.5 bg-blue-600 rounded-full p-0.5 animate-in scale-in duration-200">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </button>
    );
  };

  const totalActiveFilters = selectedCategories.length + selectedSubcategories.length + selectedColors.length + selectedPatterns.length + selectedLengths.length + selectedWidths.length + selectedWeights.length;

  const mobileFilterTabs = [
    { key: 'category', label: 'Category', values: selectedCategories, options: categories, set: setSelectedCategories, colorMap: undefined as undefined | Record<string, string>, patternMap: undefined as undefined | Record<string, string> },
    { key: 'subcategory', label: 'Subcategory', values: selectedSubcategories, options: subcategories, set: setSelectedSubcategories, colorMap: undefined, patternMap: undefined },
    { key: 'color', label: 'Color', values: selectedColors, options: colors, set: setSelectedColors, colorMap: colorCodeMap, patternMap: undefined },
    { key: 'pattern', label: 'Pattern', values: selectedPatterns, options: patterns, set: setSelectedPatterns, colorMap: undefined, patternMap: patternImageMap },
    { key: 'length', label: 'Length', values: selectedLengths, options: lengths, set: setSelectedLengths, colorMap: undefined, patternMap: undefined },
    { key: 'width', label: 'Width', values: selectedWidths, options: widths, set: setSelectedWidths, colorMap: undefined, patternMap: undefined },
    { key: 'weight', label: 'GSM', values: selectedWeights, options: weights, set: setSelectedWeights, colorMap: undefined, patternMap: undefined },
  ];

  const activeFilterTab = mobileFilterTabs.find(t => t.key === mobileFilterTab) || mobileFilterTabs[0];

  const mobileContent = isOpen ? (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col bg-gray-50 animate-in fade-in duration-200" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3 shrink-0">
        <button onClick={onClose} className="p-1 text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <span className="flex-1 text-[15px] font-bold text-gray-900">Select Product</span>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400"
            placeholder="Search by name, ID, category..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}><X className="w-4 h-4 text-gray-400" /></button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredAndSortedProducts.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No products found</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-2 pb-4">
            {filteredAndSortedProducts.map(p => renderMobileCard(p))}
          </div>
        )}
      </div>

      {/* Sort/Filter footer */}
      <div className="bg-white border-t border-gray-200 flex shrink-0">
        <button
          onClick={() => setMobileSortOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 border-r border-gray-200 text-[13.5px] font-semibold text-gray-800"
        >
          <AlignJustify className="w-4 h-4" />
          SORT
        </button>
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 text-[13.5px] font-semibold"
          style={{ color: totalActiveFilters > 0 ? '#2563EB' : '#1F2937' }}
        >
          <SlidersHorizontal className="w-4 h-4" />
          FILTER{totalActiveFilters > 0 ? ` (${totalActiveFilters})` : ''}
        </button>
      </div>

      {/* Sort sheet */}
      {mobileSortOpen && (
        <div className="fixed inset-0 z-[10000] flex flex-col justify-end bg-black/40" onClick={() => setMobileSortOpen(false)}>
          <div className="bg-white rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-900 text-[15px]">Sort By</span>
              <button onClick={() => setMobileSortOpen(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-4 py-2 pb-8">
              {[
                { val: 'name', label: 'Name (A–Z)' },
                { val: 'stock', label: 'Stock (Low → High)' },
                { val: 'category', label: 'Category (A–Z)' },
                { val: 'recent', label: 'Recently Added' },
              ].map(opt => {
                const isActive = sortBy === opt.val;
                return (
                  <button key={opt.val}
                    onClick={() => {
                      if (isActive) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                      else { setSortBy(opt.val as any); setSortOrder('asc'); }
                      setMobileSortOpen(false);
                    }}
                    className="w-full flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: isActive ? '#2563EB' : '#D1D5DB' }}>
                      {isActive && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                    </span>
                    <span className="flex-1 text-[14px] text-left" style={{ color: isActive ? '#2563EB' : '#1F2937', fontWeight: isActive ? 700 : 400 }}>
                      {opt.label}
                    </span>
                    {isActive && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                        {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="font-bold text-gray-900 text-[15px]">Filter</span>
            <button onClick={() => setMobileFilterOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
          </div>
          <div className="flex flex-1 min-h-0">
            {/* Left sidebar tabs */}
            <div className="w-28 bg-gray-50 border-r border-gray-200 overflow-y-auto shrink-0">
              {mobileFilterTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setMobileFilterTab(tab.key)}
                  className="w-full text-left px-3 py-3 text-[12px] font-semibold border-l-2 transition-colors relative"
                  style={{
                    borderLeftColor: mobileFilterTab === tab.key ? '#2563EB' : 'transparent',
                    color: mobileFilterTab === tab.key ? '#2563EB' : '#4B5563',
                    backgroundColor: mobileFilterTab === tab.key ? '#EFF6FF' : 'transparent',
                  }}
                >
                  {tab.label}
                  {tab.values.length > 0 && (
                    <span className="ml-1 text-[10px] bg-blue-600 text-white rounded-full px-1">{tab.values.length}</span>
                  )}
                </button>
              ))}
            </div>
            {/* Right checkbox panel */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeFilterTab?.options.length === 0 ? (
                <p className="text-gray-400 text-[12px] text-center mt-8">No options</p>
              ) : (
                activeFilterTab?.options.map(opt => {
                  const checked = activeFilterTab.values.includes(opt);
                  const colorCode = activeFilterTab.colorMap?.[opt] || activeFilterTab.colorMap?.[opt.toLowerCase()];
                  const patternImg = activeFilterTab.patternMap?.[opt] || activeFilterTab.patternMap?.[opt.toLowerCase()];
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        const next = checked
                          ? activeFilterTab.values.filter(v => v !== opt)
                          : [...activeFilterTab.values, opt];
                        activeFilterTab.set(next);
                      }}
                      className="w-full flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0"
                    >
                      <span className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: checked ? '#2563EB' : '#D1D5DB', backgroundColor: checked ? '#2563EB' : '#fff' }}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      {colorCode && (
                        <span className="w-5 h-5 rounded-full border border-gray-200 shrink-0"
                          style={{ backgroundColor: colorCode }} />
                      )}
                      {patternImg && (
                        <img src={patternImg} alt={opt} className="w-6 h-6 rounded object-cover border border-gray-200 shrink-0" />
                      )}
                      <span className="text-[13px] text-gray-800 text-left flex-1">{opt}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          {/* Footer */}
          <div className="flex gap-3 px-4 py-3 border-t border-gray-200 bg-white">
            <button
              onClick={() => {
                setSelectedCategories([]); setSelectedSubcategories([]);
                setSelectedColors([]); setSelectedPatterns([]);
                setSelectedLengths([]); setSelectedWidths([]); setSelectedWeights([]);
              }}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-700"
            >
              Clear All
            </button>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      {/* Mobile view */}
      {createPortal(mobileContent, document.body)}

      {/* Desktop view */}
      <Dialog open={isOpen && !isMobile} onOpenChange={handleDialogClose} modal={true}>
        <DialogContent className="hidden lg:flex max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4 min-h-0 px-6 pt-4">
            {/* Search and Filters */}
            <div className="space-y-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, ID, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">Sort:</span>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
                  <MultiSelect
                    options={categories.map((cat) => ({ label: cat, value: cat }))}
                    selected={selectedCategories}
                    onChange={setSelectedCategories}
                    placeholder="All Categories"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Subcategory</label>
                  <MultiSelect
                    options={subcategories.map((sub) => ({ label: sub, value: sub }))}
                    selected={selectedSubcategories}
                    onChange={setSelectedSubcategories}
                    placeholder="All Subcategories"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
                  <MultiSelect
                    options={colors.map((color) => ({ label: color, value: color, colorCode: colorCodeMap[color] }))}
                    selected={selectedColors}
                    onChange={setSelectedColors}
                    placeholder="All Colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Pattern</label>
                  <MultiSelect
                    options={patterns.map((pattern) => ({ label: pattern, value: pattern, imageUrl: patternImageMap[pattern] }))}
                    selected={selectedPatterns}
                    onChange={setSelectedPatterns}
                    placeholder="All Patterns"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Length</label>
                  <MultiSelect
                    options={lengths.map((length) => ({ label: `${length}m`, value: length }))}
                    selected={selectedLengths}
                    onChange={setSelectedLengths}
                    placeholder="All Lengths"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Width</label>
                  <MultiSelect
                    options={widths.map((width) => ({ label: `${width}m`, value: width }))}
                    selected={selectedWidths}
                    onChange={setSelectedWidths}
                    placeholder="All Widths"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">GSM</label>
                  <MultiSelect
                    options={weights.map((weight) => ({ label: weight, value: weight }))}
                    selected={selectedWeights}
                    onChange={setSelectedWeights}
                    placeholder="All GSM"
                  />
                </div>
              </div>
            </div>

            {/* Products List - Grouped Table */}
            <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading products...</p>
                  </div>
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-400" />
                    <p className="text-sm text-gray-600">No products found</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category / Details</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedGroupKeys.map((groupKey) => {
                      const groupProducts = groupedProducts[groupKey];
                      const isExpanded = expandedGroups.has(groupKey);
                      const firstProduct = groupProducts[0];

                      return (
                        <React.Fragment key={groupKey}>
                          {/* Group Header Row */}
                          <tr
                            className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => toggleGroup(groupKey)}
                          >
                            <td colSpan={5} className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate" title={firstProduct.name}>
                                    {firstProduct.name.split(' ').slice(0, 10).join(' ')}
                                    {firstProduct.name.split(' ').length > 10 && '...'}
                                  </p>
                                  <p className="text-sm text-blue-600 font-medium mt-1">
                                    ({groupProducts.length} Variant{groupProducts.length !== 1 ? 's' : ''})
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Variant Rows */}
                          {isExpanded &&
                            groupProducts.map((product) => (
                              <tr
                                key={product.id}
                                className={`bg-white hover:bg-gray-50 transition-colors ${
                                  selectedProductId === product.id ? 'bg-blue-50' : ''
                                }`}
                                onClick={(e) => {
                                  // Prevent row click from interfering with button clicks
                                  e.stopPropagation();
                                }}
                              >
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-sm">↳</span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm text-gray-500 truncate font-mono">{product.id}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="min-w-0 max-w-[180px] space-y-0.5">
                                    <p className="text-sm font-medium text-gray-900 line-clamp-1 break-words">
                                      {product.category}
                                    </p>
                                    {product.subcategory && (
                                      <p className="text-xs text-gray-500 line-clamp-1 break-words">
                                        {product.subcategory}
                                      </p>
                                    )}
                                    {product.color &&
                                      product.color.trim() !== '' &&
                                      product.color.toLowerCase() !== 'n/a' && (
                                        <p className="text-xs text-gray-500 line-clamp-1 break-words">
                                          Color: {product.color}
                                        </p>
                                      )}
                                    {product.pattern &&
                                      product.pattern.trim() !== '' &&
                                      product.pattern.toLowerCase() !== 'n/a' && (
                                        <p className="text-xs text-gray-500 line-clamp-1 break-words">
                                          Pattern: {product.pattern}
                                        </p>
                                      )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-900">
                                      {product.length && product.width
                                        ? `${product.length}${product.length_unit || 'm'} × ${product.width}${
                                            product.width_unit || 'm'
                                          }`
                                        : '-'}
                                    </p>
                                    {product.length && product.width && (
                                      <p className="text-xs text-gray-500">
                                        SQM: {(parseFloat(product.length) * parseFloat(product.width)).toFixed(2)}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <p className="text-sm font-medium text-gray-900">
                                    {product.current_stock || 0} {product.count_unit || product.unit || 'pcs'}
                                  </p>
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={selectedProductId === product.id ? 'default' : 'outline'}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      e.nativeEvent.stopImmediatePropagation();
                                      handleSelect(product, e);
                                    }}
                                    className="h-8"
                                  >
                                    {selectedProductId === product.id ? (
                                      <>
                                        <Check className="w-3 h-3 mr-1" />
                                        Selected
                                      </>
                                    ) : (
                                      'Select'
                                    )}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && sortedProducts.length > 0 && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFiltered)} of {totalFiltered} products
                </div>
                
                <div className="flex items-center gap-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {/* Page Numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-gray-600">Per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 px-6 py-4 border-t mt-auto flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
