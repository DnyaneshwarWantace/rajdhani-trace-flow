import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Layers, Plus, Check, ChevronLeft, ChevronRight, AlertCircle, Grid3x3, List, Search, X, SlidersHorizontal, AlignJustify, Loader2, Settings2 } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { ProductService } from '@/services/productService';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { calculateSQM } from '@/utils/sqmCalculator';

interface Material {
  id: string;
  name: string;
  current_stock: number;
  available_stock?: number;
  in_production?: number;
  unit: string;
  count_unit?: string;
  type: 'raw_material' | 'product';
  category?: string;
  subcategory?: string;
  supplier?: string;
  material_type?: string;
  cost?: number;
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
  color?: string;
  pattern?: string;
  image_url?: string;
}

interface SelectedMaterial {
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  unit: string;
}

interface MaterialSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (materials: SelectedMaterial[]) => void;
  existingMaterials?: SelectedMaterial[];
}

export default function MaterialSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  existingMaterials = [],
}: MaterialSelectionDialogProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const [activeTab, setActiveTab] = useState<'raw_materials' | 'products'>('raw_materials');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [subcategoryFilter, setSubcategoryFilter] = useState<string[]>([]);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<string[]>([]);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [patternFilter, setPatternFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [lengthFilter, setLengthFilter] = useState<string[]>([]);
  const [widthFilter, setWidthFilter] = useState<string[]>([]);
  const [weightFilter, setWeightFilter] = useState<string[]>([]);
  const [rawMaterials, setRawMaterials] = useState<Material[]>([]);
  const [allRawMaterials, setAllRawMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Material[]>([]);
  const [allProducts, setAllProducts] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const prevIsOpenRef = useRef(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Map<string, SelectedMaterial>>(
    new Map(existingMaterials.map((m) => [m.material_id, m]))
  );

  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mobile sheet states
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileFilterTab, setMobileFilterTab] = useState<string>('category');
  const [pendingFilters, setPendingFilters] = useState<Record<string, string[]>>({});
  const [mobileSearch, setMobileSearch] = useState('');
  const mobileSearchDebounce = useRef<any>(null);

  const [rawMaterialCategories, setRawMaterialCategories] = useState<string[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  const [productSubcategories, setProductSubcategories] = useState<string[]>([]);
  const [productColors, setProductColors] = useState<string[]>([]);
  const [productPatterns, setProductPatterns] = useState<string[]>([]);
  const [productColorCodeMap, setProductColorCodeMap] = useState<Record<string, string>>({});
  const [productPatternImageMap, setProductPatternImageMap] = useState<Record<string, string>>({});
  const [productLengths, setProductLengths] = useState<string[]>([]);
  const [productWidths, setProductWidths] = useState<string[]>([]);
  const [productWeights, setProductWeights] = useState<string[]>([]);
  const [materialSuppliers, setMaterialSuppliers] = useState<string[]>([]);
  const [materialColors, setMaterialColors] = useState<string[]>([]);

  useEffect(() => {
    setSelectedMaterials(new Map(existingMaterials.map((m) => [m.material_id, m])));
  }, [existingMaterials]);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) { prevIsOpenRef.current = false; return; }
    if (rawMaterials.length > 0 && products.length > 0) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([loadRawMaterialsOnly(), loadProductsOnly()])
      .then(() => { if (!cancelled) setLoading(false); })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, mobileSearch, categoryFilter, subcategoryFilter, materialTypeFilter, colorFilter, patternFilter, supplierFilter, lengthFilter, widthFilter, weightFilter]);

  const loadRawMaterialsOnly = async (): Promise<void> => {
    try {
      const response = await MaterialService.getMaterials({ page: 1, limit: 1000, usage_type: 'per_batch' });
      const all = response.materials || [];
      const list = all.map((m: any) => ({
        id: m.id, name: m.name, current_stock: m.current_stock || 0,
        available_stock: m.available_stock, in_production: m.in_production,
        unit: m.unit || 'kg', type: 'raw_material' as const,
        category: m.category, material_type: m.type || m.material_type,
        supplier: m.supplier_name, cost: m.cost_per_unit, color: m.color,
      }));
      setAllRawMaterials(list); setRawMaterials(list);
      setRawMaterialCategories(Array.from(new Set(all.map((m: any) => m.category).filter(Boolean))).sort() as string[]);
      setMaterialTypes(Array.from(new Set(all.map((m: any) => m.type || m.material_type).filter(Boolean))).sort() as string[]);
      setMaterialColors(Array.from(new Set(all.map((m: any) => m.color).filter((c: any) => c && c !== 'N/A'))).sort() as string[]);
      setMaterialSuppliers(Array.from(new Set(all.map((m: any) => m.supplier_name).filter(Boolean))).sort() as string[]);
    } catch {}
  };

  const loadProductsOnly = async (): Promise<void> => {
    try {
      const [response, dropdownData] = await Promise.all([
        ProductService.getProducts({ page: 1, limit: 1000 }),
        ProductService.getDropdownData().catch(() => null),
      ]);
      const all = response.products || [];
      const productsWithStock = all.map((p: any) => ({
        id: p.id, name: p.name, current_stock: p.current_stock ?? 0,
        available_stock: p.individual_product_stats?.available ?? p.current_stock ?? 0,
        in_production: p.individual_product_stats?.in_production ?? 0,
        unit: p.unit || 'rolls', type: 'product' as const,
        category: p.category, subcategory: p.subcategory,
        length: p.length, width: p.width, length_unit: p.length_unit, width_unit: p.width_unit,
        weight: p.weight, weight_unit: p.weight_unit, color: p.color, pattern: p.pattern,
        image_url: p.image_url,
      }));
      setAllProducts(productsWithStock); setProducts(productsWithStock);

      // Use getDropdownData for all filter options — backend provides all unique values
      const map = (arr?: { value: string }[]) =>
        (arr || []).map((o: any) => o.value).filter((v: string) => v && v !== 'N/A' && v !== 'NA').sort();
      setProductCategories(map(dropdownData?.categories));
      setProductSubcategories(map(dropdownData?.subcategories));
      setProductColors(map(dropdownData?.colors));
      setProductPatterns(map(dropdownData?.patterns));
      setProductLengths(map(dropdownData?.lengths).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)));
      setProductWidths(map(dropdownData?.widths).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)));
      setProductWeights(map(dropdownData?.weights).sort((a: string, b: string) => parseFloat(a) - parseFloat(b)));

      const nextColorCodeMap: Record<string, string> = {};
      (dropdownData?.colors || []).forEach((item: any) => { if (item?.value && item?.color_code) nextColorCodeMap[item.value] = item.color_code; });
      setProductColorCodeMap(nextColorCodeMap);
      const nextPatternImageMap: Record<string, string> = {};
      (dropdownData?.patterns || []).forEach((item: any) => { if (item?.value && item?.image_url) nextPatternImageMap[item.value] = item.image_url; });
      setProductPatternImageMap(nextPatternImageMap);
    } catch {}
  };

  const handleSelectMaterial = (material: Material) => {
    const newSelected = new Map(selectedMaterials);
    if (newSelected.has(material.id)) { newSelected.delete(material.id); }
    else {
      newSelected.set(material.id, {
        material_id: material.id,
        material_name: material.name,
        material_type: material.type,
        quantity_per_sqm: 0,
        unit: material.unit,
      });
    }
    setSelectedMaterials(newSelected);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedMaterials.values()));
    onClose();
  };

  const getStockStatusBadge = (stock: number) => {
    if (stock === 0) return <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Out of Stock</Badge>;
    if (stock < 10) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Low Stock</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">In Stock</Badge>;
  };

  const sortedMaterials = useMemo(() => {
    const base = activeTab === 'raw_materials' ? allRawMaterials : allProducts;
    let data = base;
    const q = (searchQuery || mobileSearch).toLowerCase();
    if (q) {
      data = data.filter((m) =>
        m.name?.toLowerCase().includes(q) || m.id?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) || (m as any).material_type?.toLowerCase().includes(q) ||
        m.color?.toLowerCase().includes(q) || (m as any).supplier?.toLowerCase().includes(q)
      );
    }
    if (activeTab === 'raw_materials') {
      if (categoryFilter.length > 0) data = data.filter((m) => categoryFilter.includes(m.category || ''));
      if (materialTypeFilter.length > 0) data = data.filter((m) => materialTypeFilter.includes((m as any).material_type || ''));
      if (colorFilter.length > 0) data = data.filter((m) => colorFilter.includes(m.color || ''));
      if (supplierFilter.length > 0) data = data.filter((m) => supplierFilter.includes((m as any).supplier || ''));
    } else {
      if (categoryFilter.length > 0) data = data.filter((m) => categoryFilter.includes(m.category || ''));
      if (subcategoryFilter.length > 0) data = data.filter((m) => subcategoryFilter.includes(m.subcategory || ''));
      if (colorFilter.length > 0) data = data.filter((m) => colorFilter.includes(m.color || ''));
      if (patternFilter.length > 0) data = data.filter((m) => patternFilter.includes(m.pattern || ''));
      if (lengthFilter.length > 0) data = data.filter((m) => lengthFilter.includes(m.length?.toString() || ''));
      if (widthFilter.length > 0) data = data.filter((m) => widthFilter.includes(m.width?.toString() || ''));
      if (weightFilter.length > 0) data = data.filter((m) => weightFilter.includes(m.weight?.toString() || ''));
    }
    return [...data].sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case 'name': compareValue = (a.name || '').localeCompare(b.name || ''); break;
        case 'stock': {
          const sA = a.available_stock !== undefined ? a.available_stock : a.current_stock;
          const sB = b.available_stock !== undefined ? b.available_stock : b.current_stock;
          compareValue = sA - sB; break;
        }
        case 'category': compareValue = (a.category || '').localeCompare(b.category || ''); break;
        case 'recent': compareValue = new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime(); break;
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [activeTab, allRawMaterials, allProducts, searchQuery, mobileSearch, categoryFilter, subcategoryFilter, materialTypeFilter, colorFilter, patternFilter, supplierFilter, lengthFilter, widthFilter, weightFilter, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedMaterials.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedMaterials = sortedMaterials.slice(startIdx, startIdx + itemsPerPage);

  const totalActiveFilters = categoryFilter.length + subcategoryFilter.length + materialTypeFilter.length + colorFilter.length + patternFilter.length + supplierFilter.length + lengthFilter.length + widthFilter.length + weightFilter.length;

  // ── Mobile filter tabs config ──
  const mobileFilterTabs = activeTab === 'raw_materials'
    ? [
        { key: 'category', label: 'Category', values: categoryFilter, options: rawMaterialCategories, set: setCategoryFilter, colorMap: undefined as undefined | Record<string,string>, patternMap: undefined as undefined | Record<string,string> },
        { key: 'type', label: 'Type', values: materialTypeFilter, options: materialTypes, set: setMaterialTypeFilter, colorMap: undefined, patternMap: undefined },
        { key: 'color', label: 'Color', values: colorFilter, options: materialColors, set: setColorFilter, colorMap: undefined, patternMap: undefined },
        { key: 'supplier', label: 'Supplier', values: supplierFilter, options: materialSuppliers, set: setSupplierFilter, colorMap: undefined, patternMap: undefined },
      ]
    : [
        { key: 'category', label: 'Category', values: categoryFilter, options: productCategories, set: setCategoryFilter, colorMap: undefined as undefined | Record<string,string>, patternMap: undefined as undefined | Record<string,string> },
        { key: 'subcategory', label: 'Subcategory', values: subcategoryFilter, options: productSubcategories, set: setSubcategoryFilter, colorMap: undefined, patternMap: undefined },
        { key: 'color', label: 'Color', values: colorFilter, options: productColors, set: setColorFilter, colorMap: productColorCodeMap, patternMap: undefined },
        { key: 'pattern', label: 'Pattern', values: patternFilter, options: productPatterns, set: setPatternFilter, colorMap: undefined, patternMap: productPatternImageMap },
        { key: 'length', label: 'Length', values: lengthFilter, options: productLengths, set: setLengthFilter, colorMap: undefined, patternMap: undefined },
        { key: 'width', label: 'Width', values: widthFilter, options: productWidths, set: setWidthFilter, colorMap: undefined, patternMap: undefined },
        { key: 'weight', label: 'GSM', values: weightFilter, options: productWeights, set: setWeightFilter, colorMap: undefined, patternMap: undefined },
      ];

  const activeFilterTab = mobileFilterTabs.find(t => t.key === mobileFilterTab) || mobileFilterTabs[0];

  // ── Mobile card render ──
  const renderMobileCard = (material: Material) => {
    const isSel = selectedMaterials.has(material.id);
    const stockQty = Number(material.available_stock !== undefined ? material.available_stock : material.current_stock);
    const inProd = Number(material.in_production || 0);
    const stockColor = stockQty <= 0 ? '#EF4444' : stockQty < 10 ? '#F97316' : '#16A34A';
    const stockBg = stockQty <= 0 ? '#FEF2F2' : stockQty < 10 ? '#FFF7ED' : '#F0FDF4';
    const colorCode = material.color ? productColorCodeMap[material.color?.toLowerCase()] || productColorCodeMap[material.color] : undefined;

    const len = material.length && String(material.length).trim() ? String(material.length).trim() : '';
    const wid = material.width && String(material.width).trim() ? String(material.width).trim() : '';
    const lenStr = len ? `${len} ${material.length_unit || 'm'}` : '';
    const widStr = wid ? `${wid} ${material.width_unit || 'm'}` : '';
    const dim = (lenStr || widStr) ? `${lenStr} × ${widStr}` : null;
    const gsm = material.weight && String(material.weight).trim() ? `${material.weight} ${material.weight_unit || 'GSM'}` : null;
    const specs = dim && gsm ? `${dim} · ${gsm}` : dim || gsm;

    return (
      <button
        key={material.id}
        onClick={() => handleSelectMaterial(material)}
        className="text-left w-full rounded-xl p-2.5 transition-colors"
        style={{
          backgroundColor: isSel ? '#EFF6FF' : '#fff',
          border: `1px solid ${isSel ? '#2563EB' : '#E5E7EB'}`,
        }}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-[9px] text-gray-400 font-mono">#{String(material.id || '').substring(0, 8)}</span>
          {material.image_url && (
            <img src={material.image_url} alt="" className="w-5 h-5 rounded object-cover border border-gray-100" />
          )}
        </div>
        <p className="text-[12.5px] font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{material.name}</p>

        {material.type === 'product' ? (
          <>
            {specs && <p className="text-[9.5px] text-gray-500 mb-1 truncate">{specs}</p>}
            {material.color && material.color !== 'N/A' && (
              <div className="flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: colorCode || '#D1D5DB' }} />
                <span className="text-[9.5px] text-gray-500">{material.color}</span>
              </div>
            )}
          </>
        ) : (
          <>
            {material.category && <p className="text-[10px] text-gray-500 mb-0.5 truncate">{material.category}</p>}
            {material.supplier && <p className="text-[10px] text-gray-500 mb-0.5 truncate">Supplier: {material.supplier}</p>}
          </>
        )}

        <div className="flex flex-wrap gap-1 mt-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: stockBg, color: stockColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stockColor }} />
            Avail: {stockQty.toFixed(2)} {material.unit}
          </span>
          {inProd > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
              <Settings2 className="w-2.5 h-2.5" />
              In Prod: {inProd.toFixed(2)}
            </span>
          )}
        </div>
      </button>
    );
  };

  // ── MOBILE LAYOUT ──
  const mobileContent = isOpen ? (
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col bg-gray-50" style={{ touchAction: 'pan-y' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-3 shrink-0">
        <button onClick={onClose} className="p-1 text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <span className="flex-1 text-[15px] font-bold text-gray-900">Add Items</span>
        {selectedMaterials.size > 0 && (
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-[13px] font-bold px-3 py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {selectedMaterials.size} Selected
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 flex shrink-0">
        {(['raw_materials', 'products'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
            className="flex-1 py-3.5 text-[13px] font-bold transition-colors"
            style={{
              color: activeTab === tab ? '#2563EB' : '#9CA3AF',
              borderBottom: `2px solid ${activeTab === tab ? '#2563EB' : 'transparent'}`,
            }}
          >
            {tab === 'raw_materials' ? 'Raw Materials' : 'Products'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400"
            placeholder={`Search ${activeTab === 'raw_materials' ? 'materials' : 'products'}...`}
            value={mobileSearch}
            onChange={e => {
              const v = e.target.value;
              setMobileSearch(v);
              if (mobileSearchDebounce.current) clearTimeout(mobileSearchDebounce.current);
              mobileSearchDebounce.current = setTimeout(() => setCurrentPage(1), 300);
            }}
          />
          {mobileSearch && (
            <button onClick={() => setMobileSearch('')}><X className="w-4 h-4 text-gray-400" /></button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : sortedMaterials.length === 0 ? (
          <p className="text-center text-gray-400 text-sm mt-12">No {activeTab === 'raw_materials' ? 'materials' : 'products'} found</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5 p-2 pb-4">
              {sortedMaterials.map(m => renderMobileCard(m))}
            </div>
          </>
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
          onClick={() => { setPendingFilters({}); setMobileFilterOpen(true); }}
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
          <div className="bg-white rounded-t-2xl shadow-xl" onClick={e => e.stopPropagation()}>
            {/* Handle bar */}
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
                    {/* Radio circle */}
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
        <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
          {/* Filter header */}
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
                  className="w-full text-left px-3 py-3 text-[12px] font-semibold border-l-2 transition-colors"
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
                setCategoryFilter([]); setSubcategoryFilter([]); setMaterialTypeFilter([]);
                setColorFilter([]); setPatternFilter([]); setSupplierFilter([]);
                setLengthFilter([]); setWidthFilter([]); setWeightFilter([]);
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

  // Desktop card component
  const DesktopMaterialCard = ({ material }: { material: Material }) => {
    const isSelected = selectedMaterials.has(material.id);
    return (
      <Card
        onClick={() => handleSelectMaterial(material)}
        className={`p-4 cursor-pointer transition-all hover:shadow-md h-full ${
          isSelected ? 'bg-primary-50 border-primary-400 border-2' : 'border-gray-200 hover:border-primary-200'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-semibold text-gray-900">{material.name}</h4>
                {isSelected && (
                  <Badge className="bg-primary-600 text-white text-xs flex-shrink-0">
                    <Check className="w-3 h-3 mr-1" />Selected
                  </Badge>
                )}
              </div>
              {material.category && (
                <p className="text-xs text-gray-600 mb-1 break-words">
                  Category: {material.category}{material.subcategory && ` • ${material.subcategory}`}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div>
              <p className="text-gray-500">Stock Available</p>
              <p className="font-medium text-gray-900">
                {Number(material.available_stock !== undefined ? material.available_stock : material.current_stock).toFixed(2)} {material.unit}
              </p>
              {material.in_production && material.in_production > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  ({Number(material.in_production).toFixed(2)} {material.unit} in production)
                </p>
              )}
            </div>
            <div className="flex items-start justify-end">
              {getStockStatusBadge(material.available_stock !== undefined ? material.available_stock : material.current_stock)}
            </div>
          </div>
          {material.type === 'product' && (() => {
            const length = parseFloat(material.length || '0');
            const width = parseFloat(material.width || '0');
            const lengthUnit = material.length_unit || 'm';
            const widthUnit = material.width_unit || 'm';
            const sqm = length > 0 && width > 0 ? calculateSQM(length, width, lengthUnit, widthUnit) : 0;
            return (
              <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                {material.length && <div><p className="text-gray-500">Length</p><p className="font-medium text-gray-900 truncate">{material.length} {lengthUnit}</p></div>}
                {material.width && <div><p className="text-gray-500">Width</p><p className="font-medium text-gray-900 truncate">{material.width} {widthUnit}</p></div>}
                {sqm > 0 && <div className="col-span-2 bg-blue-50 p-2 rounded"><p className="text-gray-500">Total SQM (per product)</p><p className="font-semibold text-blue-700">{length} {lengthUnit} × {width} {widthUnit} = {sqm.toFixed(2)} SQM</p></div>}
                {material.weight && <div><p className="text-gray-500">GSM</p><p className="font-medium text-gray-900 truncate">{material.weight} {material.weight_unit || ''}</p></div>}
                {material.color && material.color !== 'N/A' && (
                  <div><p className="text-gray-500">Color</p>
                    <p className="font-medium text-gray-900 truncate inline-flex items-center gap-1">
                      {productColorCodeMap[material.color] && <span className="w-3 h-3 rounded-full border border-gray-300 inline-block" style={{ backgroundColor: productColorCodeMap[material.color] }} />}
                      {material.color}
                    </p>
                  </div>
                )}
                {material.pattern && material.pattern !== 'N/A' && (
                  <div className="col-span-2"><p className="text-gray-500">Pattern</p>
                    <p className="font-medium text-gray-900 truncate inline-flex items-center gap-1">
                      {productPatternImageMap[material.pattern] && <img src={productPatternImageMap[material.pattern]} alt={material.pattern} className="w-3 h-3 rounded object-cover border border-gray-200" />}
                      {material.pattern}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          {material.type === 'raw_material' && (
            <div className="mt-2 pt-2 border-t border-gray-200 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {material.supplier && <div><p className="text-gray-500">Supplier</p><p className="font-medium text-gray-900 truncate" title={material.supplier}>{material.supplier}</p></div>}
              {material.cost && <div><p className="text-gray-500">Cost</p><p className="font-medium text-gray-900">₹{material.cost}/{material.unit}</p></div>}
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      {/* Mobile full-screen portal */}
      {createPortal(mobileContent, document.body)}

      {/* Desktop dialog */}
      <Dialog open={isOpen && !isMobile} onOpenChange={onClose} modal={true}>
        <DialogContent customLayout className="hidden lg:flex max-w-5xl h-[90vh] max-h-[90vh] p-0 gap-0 flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Select Materials & Products</DialogTitle>
                <p className="text-sm text-gray-600 mt-1">Choose materials and products to add to your production plan</p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 pt-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }} className="flex-1">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="raw_materials" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                    <Layers className="w-4 h-4 mr-2" />Raw Materials
                  </TabsTrigger>
                  <TabsTrigger value="products" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                    <Package className="w-4 h-4 mr-2" />Products
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className={`h-8 w-8 p-0 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}`}><Grid3x3 className="w-4 h-4" /></Button>
                <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className={`h-8 w-8 p-0 ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}><List className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <DebouncedSearchInput value={searchQuery} onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }} placeholder={activeTab === 'raw_materials' ? 'Search materials...' : 'Search products...'} minCharacters={3} debounceMs={500} showCounter={true} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Sort:</span>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[200px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="recent">Recently Added</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                  <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="px-6 pt-2 pb-3 flex-shrink-0 border-b border-gray-200">
            {activeTab === 'raw_materials' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <MultiSelect options={rawMaterialCategories.map(c => ({ label: c, value: c }))} selected={categoryFilter} onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }} placeholder="All Categories" />
                  <MultiSelect options={materialTypes.filter(Boolean).map(t => ({ label: t, value: t }))} selected={materialTypeFilter} onChange={(v) => { setMaterialTypeFilter(v); setCurrentPage(1); }} placeholder="All Material Types" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MultiSelect options={materialColors.map(c => ({ label: c, value: c }))} selected={colorFilter} onChange={(v) => { setColorFilter(v); setCurrentPage(1); }} placeholder="All Colors" />
                  <MultiSelect options={materialSuppliers.map(s => ({ label: s, value: s }))} selected={supplierFilter} onChange={(v) => { setSupplierFilter(v); setCurrentPage(1); }} placeholder="All Suppliers" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <MultiSelect options={productCategories.map(c => ({ label: c, value: c }))} selected={categoryFilter} onChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }} placeholder="All Categories" />
                  <MultiSelect options={productSubcategories.map(s => ({ label: s, value: s }))} selected={subcategoryFilter} onChange={(v) => { setSubcategoryFilter(v); setCurrentPage(1); }} placeholder="All Subcategories" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <MultiSelect options={productColors.map(c => ({ label: c, value: c, colorCode: productColorCodeMap[c] }))} selected={colorFilter} onChange={(v) => { setColorFilter(v); setCurrentPage(1); }} placeholder="All Colors" />
                  <MultiSelect options={productPatterns.map(p => ({ label: p, value: p, imageUrl: productPatternImageMap[p] }))} selected={patternFilter} onChange={(v) => { setPatternFilter(v); setCurrentPage(1); }} placeholder="All Patterns" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <MultiSelect options={productLengths.map(l => ({ label: l, value: l }))} selected={lengthFilter} onChange={(v) => { setLengthFilter(v); setCurrentPage(1); }} placeholder="All Lengths" />
                  <MultiSelect options={productWidths.map(w => ({ label: w, value: w }))} selected={widthFilter} onChange={(v) => { setWidthFilter(v); setCurrentPage(1); }} placeholder="All Widths" />
                  <MultiSelect options={productWeights.map(w => ({ label: w, value: w }))} selected={weightFilter} onChange={(v) => { setWeightFilter(v); setCurrentPage(1); }} placeholder="All GSM" />
                </div>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 min-h-0 max-h-full">
            {loading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-gray-600 font-medium">Loading {activeTab === 'raw_materials' ? 'raw materials' : 'products'}...</p>
                </div>
              </div>
            ) : sortedMaterials.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No {activeTab === 'raw_materials' ? 'raw materials' : 'products'} found</p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
                {paginatedMaterials.map((material) => <DesktopMaterialCard key={material.id} material={material} />)}
              </div>
            ) : (
              <div className="py-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                        {activeTab === 'raw_materials' ? (
                          <><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th></>
                        ) : (
                          <><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dimensions</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th><th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GSM</th></>
                        )}
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Select</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {paginatedMaterials.map((material) => {
                        const isSelected = selectedMaterials.has(material.id);
                        return (
                          <tr key={material.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                            <td className="px-3 py-3"><p className="font-medium text-gray-900 truncate max-w-[200px]">{material.name}</p></td>
                            <td className="px-3 py-3"><p className="text-gray-700 truncate max-w-[150px]">{material.category || '-'}</p>{material.subcategory && <p className="text-xs text-gray-500">{material.subcategory}</p>}</td>
                            <td className="px-3 py-3"><span className="font-medium text-gray-900">{Number(material.available_stock !== undefined ? material.available_stock : material.current_stock).toFixed(2)} {material.unit}</span></td>
                            {activeTab === 'raw_materials' ? (
                              <><td className="px-3 py-3"><p className="text-gray-700 truncate max-w-[150px]">{material.supplier || '-'}</p></td><td className="px-3 py-3"><p className="text-gray-700">{material.cost ? `₹${material.cost}/${material.unit}` : '-'}</p></td></>
                            ) : (
                              <><td className="px-3 py-3"><p className="text-gray-700">{material.length && material.width ? `${material.length}${material.length_unit} × ${material.width}${material.width_unit}` : '-'}</p></td><td className="px-3 py-3"><p className="text-gray-700">{material.color || '-'}</p></td><td className="px-3 py-3"><p className="text-gray-700">{material.weight ? `${material.weight} ${material.weight_unit || ''}`.trim() : '-'}</p></td></>
                            )}
                            <td className="px-3 py-3 text-center">
                              <Button variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => handleSelectMaterial(material)} className={isSelected ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}>
                                {isSelected ? <><Check className="w-4 h-4 mr-1" />Selected</> : <><Plus className="w-4 h-4 mr-1" />Select</>}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" />Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next<ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex items-center justify-between">
            <p className="text-sm text-gray-600">{selectedMaterials.size} {selectedMaterials.size === 1 ? 'item' : 'items'} selected</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={selectedMaterials.size === 0} className="text-white">
                <Plus className="w-4 h-4 mr-2" />Add Selected ({selectedMaterials.size})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
