import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Search, X, RefreshCw, ShoppingCart, ChevronRight,
  Lock, AlertTriangle, Package, Check, AlignJustify, SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ProductService } from '@/services/productService';
import { ProductionService, type CreateProductionBatchData } from '@/services/productionService';
import { OrderService, type Order } from '@/services/orderService';
import { RecipeService } from '@/services/recipeService';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Product } from '@/types/product';

// ─── constants ────────────────────────────────────────────────────────────────

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#374151', bg: '#F3F4F6' },
  { value: 'medium', label: 'Medium', color: '#92400E', bg: '#FEF3C7' },
  { value: 'high',   label: 'High',   color: '#C2410C', bg: '#FFEDD5' },
  { value: 'urgent', label: 'Urgent', color: '#991B1B', bg: '#FEE2E2' },
] as const;

const PAGE_SIZE = 50;

// ─── field label ──────────────────────────────────────────────────────────────

function FLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <p className="text-[12px] font-semibold text-gray-500 mb-[5px]">
      {children}{required && <span className="text-red-500"> *</span>}
    </p>
  );
}

// ─── product picker card ──────────────────────────────────────────────────────

function PickerCard({ product, colorCodeMap, patternImageMap, selected, onSelect }: {
  product: Product;
  colorCodeMap: Record<string, string>;
  patternImageMap: Record<string, string>;
  selected: boolean;
  onSelect: () => void;
}) {
  const stockStatus = (product as any).stock_status || product.status;
  const isOut = stockStatus === 'out-of-stock';
  const isLow = stockStatus === 'low-stock';
  const stockColor = isOut ? '#EF4444' : isLow ? '#F97316' : '#22C55E';
  const stockLabel = isOut ? 'Out' : isLow ? 'Low' : 'In Stock';
  const stockBg = isOut ? 'rgba(220,38,38,0.85)' : isLow ? 'rgba(234,88,12,0.85)' : 'rgba(22,163,74,0.85)';

  const colorCode = product.color ? colorCodeMap[product.color.toLowerCase()] : undefined;
  const patternImg = product.pattern ? patternImageMap[product.pattern.toLowerCase()] : undefined;
  const imageUri = product.image_url || patternImg;

  const len = product.length && String(product.length).trim();
  const wid = product.width && String(product.width).trim();
  const dims = (len || wid) ? `${len || '—'} ${product.length_unit || ''} × ${wid || '—'} ${product.width_unit || ''}`.trim() : null;
  const gsm = product.weight && String(product.weight).trim() && product.weight !== 'N/A'
    ? `${product.weight} ${product.weight_unit || 'GSM'}`.trim() : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="text-left flex-1 rounded-[12px] overflow-hidden border transition-colors"
      style={{
        backgroundColor: selected ? '#EFF6FF' : '#fff',
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? '#2563EB' : '#E5E7EB',
      }}
    >
      {/* Image */}
      <div className="w-full" style={{ aspectRatio: '4/3', backgroundColor: '#F4F5F7', position: 'relative' }}>
        {imageUri ? (
          <img src={imageUri} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between">
          <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ backgroundColor: stockBg }}>
            {stockLabel}
          </span>
          {selected && (
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2 pb-1.5">
        <p className="text-[12px] font-bold text-gray-900 leading-4 line-clamp-2">{product.name}</p>
        {product.category && <p className="text-[9px] text-gray-400 mt-0.5 truncate">{product.category}</p>}

        {(colorCode || product.color) && (
          <div className="flex items-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: colorCode || '#D1D5DB' }} />
            <span className="text-[9px] text-gray-500 font-semibold truncate">{product.color}</span>
            {product.pattern && <span className="text-[9px] text-gray-400"> · {product.pattern}</span>}
          </div>
        )}

        {dims && <p className="text-[9px] text-gray-400 mt-0.5 leading-3">{dims}</p>}
        {gsm && <p className="text-[9px] text-gray-400 leading-3">{gsm}</p>}

        <div className="flex items-center gap-1 mt-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stockColor }} />
          <span className="text-[9px] font-semibold" style={{ color: stockColor }}>
            {Number((product as any).current_stock || 0).toFixed(0)} {(product as any).count_unit || product.unit || 'units'}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── product picker full-screen ───────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'name_asc',   label: 'Name (A → Z)',        sortBy: 'name' as const,         sortOrder: 'asc' as const },
  { value: 'name_desc',  label: 'Name (Z → A)',         sortBy: 'name' as const,         sortOrder: 'desc' as const },
  { value: 'stock_asc',  label: 'Stock (Low → High)',   sortBy: 'current_stock' as const, sortOrder: 'asc' as const },
  { value: 'stock_desc', label: 'Stock (High → Low)',   sortBy: 'current_stock' as const, sortOrder: 'desc' as const },
  { value: 'recent',     label: 'Recently Added',       sortBy: 'created_at' as const,   sortOrder: 'desc' as const },
];
type SortValue = typeof SORT_OPTIONS[number]['value'];

type FilterState = {
  categories: string[];
  subcategories: string[];
  colors: string[];
  patterns: string[];
  lengths: string[];
  widths: string[];
  weights: string[];
};
const emptyFilters = (): FilterState => ({ categories: [], subcategories: [], colors: [], patterns: [], lengths: [], widths: [], weights: [] });

const FILTER_TABS: { key: keyof FilterState; label: string }[] = [
  { key: 'categories',    label: 'Category' },
  { key: 'subcategories', label: 'Subcategory' },
  { key: 'colors',        label: 'Color' },
  { key: 'patterns',      label: 'Pattern' },
  { key: 'lengths',       label: 'Length' },
  { key: 'widths',        label: 'Width' },
  { key: 'weights',       label: 'GSM' },
];

function ProductPickerScreen({ onClose, onSelect, selectedId }: {
  onClose: () => void;
  onSelect: (p: Product) => void;
  selectedId?: string;
}) {
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});
  const debounce = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // sort / filter state
  const [sortSheet, setSortSheet] = useState(false);
  const [filterSheet, setFilterSheet] = useState(false);
  const [sortVal, setSortVal] = useState<SortValue>('name_asc');
  const [pendingSort, setPendingSort] = useState<SortValue>('name_asc');
  const [filters, setFilters] = useState<FilterState>(emptyFilters());
  const [pending, setPending] = useState<FilterState>(emptyFilters());
  const [activeFilterTab, setActiveFilterTab] = useState<keyof FilterState>('categories');

  // dropdown options
  const [opts, setOpts] = useState<{
    categories: string[]; subcategories: string[]; colors: string[];
    patterns: string[]; lengths: string[]; widths: string[]; weights: string[];
  }>({ categories: [], subcategories: [], colors: [], patterns: [], lengths: [], widths: [], weights: [] });

  const activeFilterCount = useMemo(() =>
    Object.values(filters).reduce((n, arr) => n + arr.length, 0), [filters]);

  const fetchProducts = useCallback(async (search: string, sort: SortValue, f: FilterState) => {
    setLoading(true);
    try {
      const opt = SORT_OPTIONS.find(o => o.value === sort)!;
      const params: any = {
        limit: 500, offset: 0,
        sortBy: opt.sortBy, sortOrder: opt.sortOrder,
      };
      if (search.trim()) params.search = search.trim();
      if (f.categories.length) params.category = f.categories;
      if (f.subcategories.length) params.subcategory = f.subcategories;
      if (f.colors.length) params.color = f.colors;
      if (f.patterns.length) params.pattern = f.patterns;
      if (f.lengths.length) params.length = f.lengths.map((l: string) => l.split(' ')[0]);
      if (f.widths.length) params.width = f.widths.map((w: string) => w.split(' ')[0]);
      if (f.weights.length) params.weight = f.weights.map((w: string) => w.split(' ')[0]);
      const { products: list, total: t } = await ProductService.getProducts(params);
      setProducts(list);
      setTotal(t);
    } catch { setProducts([]); setTotal(0); } finally { setLoading(false); }
  }, []);

  // load dropdown options once
  useEffect(() => {
    fetchProducts('', 'name_asc', emptyFilters());

    // Load filter options from dropdown endpoint (same as MobileFilterSheet)
    ProductService.getDropdownData()
      .then(data => {
        const map = (arr?: { value: string }[]) =>
          (arr || []).map(o => o.value).filter(v => v && v !== 'N/A' && v !== 'NA').sort();
        setOpts({
          categories:    map(data.categories),
          subcategories: map(data.subcategories),
          colors:        map(data.colors),
          patterns:      map(data.patterns),
          lengths:       map(data.lengths),
          widths:        map(data.widths),
          weights:       map(data.weights),
        });
        // Also build colorCodeMap from the same data
        const cm: Record<string, string> = {};
        (data.colors || []).forEach((c: any) => { if (c?.value && c?.color_code) cm[c.value.toLowerCase()] = c.color_code; });
        setColorCodeMap(cm);
        const pm: Record<string, string> = {};
        (data.patterns || []).forEach((p: any) => { if (p?.value && p?.image_url) pm[p.value.toLowerCase()] = p.image_url; });
        setPatternImageMap(pm);
      })
      .catch(() => {});
  }, []);

  const onSearch = (val: string) => {
    setQ(val);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchProducts(val, sortVal, filters), 280);
  };

  const toggle = (field: keyof FilterState, val: string) =>
    setPending(prev => ({
      ...prev,
      [field]: prev[field].includes(val) ? prev[field].filter(v => v !== val) : [...prev[field], val],
    }));

  return (
    <div className="fixed inset-0 z-[80] bg-white flex flex-col" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-3 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-gray-100 shrink-0">
            <ArrowLeft className="w-[18px] h-[18px] text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-extrabold text-gray-900">Select Product</p>
            <p className="text-[11px] text-gray-400">{loading ? 'Loading…' : `${total.toLocaleString()} products`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 rounded-[10px] px-3 h-[38px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400"
            placeholder="Search products…"
            value={q}
            onChange={e => onSearch(e.target.value)}
          />
          {q && <button type="button" onClick={() => onSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
      </div>

      {/* Grid */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-1 pb-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" />
            <p className="text-[13px] text-gray-400">Loading products…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-[15px] font-bold text-gray-900 mb-1">No products found</p>
            <p className="text-[13px] text-gray-400">Try a different search or clear filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {products.map(p => (
              <PickerCard
                key={p.id}
                product={p}
                colorCodeMap={colorCodeMap}
                patternImageMap={patternImageMap}
                selected={p.id === selectedId}
                onSelect={() => { onSelect(p); onClose(); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sort / Filter bar */}
      <div className="flex border-t border-gray-100 bg-white shrink-0">
        <button type="button" onClick={() => { setPendingSort(sortVal); setSortSheet(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 border-r border-gray-100 active:bg-gray-50">
          <AlignJustify className="w-4 h-4 text-gray-700" />
          <span className="text-[13px] font-semibold text-gray-700">SORT</span>
        </button>
        <button type="button" onClick={() => { setPending({ ...filters }); setActiveFilterTab('categories'); setFilterSheet(true); }}
          className="flex-1 flex items-center justify-center gap-1.5 py-3.5 active:bg-gray-50 relative">
          <SlidersHorizontal className="w-4 h-4 text-gray-700" />
          <span className="text-[13px] font-semibold text-gray-700">FILTER</span>
          {activeFilterCount > 0 && (
            <span className="absolute top-2 right-6 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Sort Sheet */}
      {sortSheet && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-end" style={{ height: '100dvh' }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setSortSheet(false)} />
          <div className="relative bg-white rounded-t-[20px] px-4 pt-4 pb-8">
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
            <p className="text-[15px] font-extrabold text-gray-900 mb-3">Sort By</p>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setPendingSort(opt.value)}
                className="w-full flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
                <span className="text-[14px] text-gray-800">{opt.label}</span>
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: pendingSort === opt.value ? '#2563EB' : '#D1D5DB' }}>
                  {pendingSort === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                </div>
              </button>
            ))}
            <button type="button"
              onClick={() => { setSortVal(pendingSort); setSortSheet(false); fetchProducts(q, pendingSort, filters); }}
              className="w-full mt-4 h-[52px] rounded-[10px] bg-blue-600 text-white text-[15px] font-bold">
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Filter Sheet — 2-panel layout matching the app */}
      {filterSheet && (
        <div className="fixed inset-0 z-[90] bg-white flex flex-col" style={{ height: '100dvh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="text-[17px] font-extrabold text-gray-900">Filters</p>
            <button type="button" onClick={() => setFilterSheet(false)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Body: left tabs + right options */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar tabs */}
            <div className="w-[120px] bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0">
              {FILTER_TABS.map(tab => {
                const count = pending[tab.key].length;
                const isActive = activeFilterTab === tab.key;
                return (
                  <button key={tab.key} type="button"
                    onClick={() => setActiveFilterTab(tab.key)}
                    className="w-full text-left px-3 py-4 border-b border-gray-100 relative"
                    style={{ backgroundColor: isActive ? '#fff' : 'transparent' }}>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600 rounded-r" />}
                    <span className="text-[13px] font-semibold" style={{ color: isActive ? '#2563EB' : '#374151' }}>
                      {tab.label}
                    </span>
                    {count > 0 && (
                      <span className="ml-1 text-[10px] font-bold text-blue-600">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right options panel */}
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const tab = FILTER_TABS.find(t => t.key === activeFilterTab)!;
                const items: string[] = opts[activeFilterTab] || [];
                if (!items.length) return (
                  <div className="flex items-center justify-center py-20">
                    <p className="text-[13px] text-gray-400">No options available</p>
                  </div>
                );
                return items.map(item => {
                  const checked = pending[tab.key].includes(item);
                  const colorCode = activeFilterTab === 'colors' ? colorCodeMap[item.toLowerCase()] : undefined;
                  const patternImg = activeFilterTab === 'patterns' ? patternImageMap[item.toLowerCase()] : undefined;
                  return (
                    <button key={item} type="button"
                      onClick={() => toggle(tab.key, item)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 active:bg-gray-50">
                      {colorCode && (
                        <span className="w-5 h-5 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: colorCode }} />
                      )}
                      {patternImg && (
                        <img src={patternImg} alt={item} className="w-7 h-7 rounded-md object-cover shrink-0 border border-gray-200" />
                      )}
                      <span className="flex-1 text-[14px] text-gray-800 text-left">{item}</span>
                      <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
                        style={{ borderColor: checked ? '#2563EB' : '#D1D5DB', backgroundColor: checked ? '#2563EB' : '#fff' }}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-4 py-3 border-t border-gray-100 bg-white shrink-0">
            <button type="button" onClick={() => setPending(emptyFilters())}
              className="flex-1 h-[44px] rounded-[10px] border border-gray-200 text-[14px] font-semibold text-gray-700">
              Clear All
            </button>
            <button type="button"
              onClick={() => { setFilters(pending); setFilterSheet(false); fetchProducts(q, sortVal, pending); }}
              className="flex-1 h-[44px] rounded-[10px] bg-blue-600 text-white text-[14px] font-bold">
              APPLY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── selected product card ─────────────────────────────────────────────────────

function SelectedProductCard({ product, onClear, onChange }: {
  product: Product; onClear: () => void; onChange: () => void;
}) {
  const dims = [
    product.length && `${product.length} ${product.length_unit || ''}`.trim(),
    product.width && `${product.width} ${product.width_unit || ''}`.trim(),
  ].filter(Boolean).join(' × ');
  const gsm = product.weight && product.weight !== 'N/A' ? `${product.weight} ${product.weight_unit || 'GSM'}`.trim() : null;

  return (
    <div className="rounded-[14px] border-[1.5px] border-blue-600 bg-blue-50 overflow-hidden mb-[14px]">
      <div className="h-[3px] bg-blue-600" />
      <div className="p-3 flex items-center gap-2.5">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-[52px] h-[52px] rounded-[10px] object-cover bg-gray-100 shrink-0" />
        ) : (
          <div className="w-[52px] h-[52px] rounded-[10px] bg-gray-200 flex items-center justify-center shrink-0">
            <Package className="w-[22px] h-[22px] text-gray-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-extrabold text-blue-600 tracking-wider block mb-0.5">SELECTED</span>
          <p className="text-[13px] font-extrabold text-gray-900 leading-[18px] line-clamp-2">{product.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {[product.category, product.color, dims, gsm].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        <button type="button" onClick={onChange}
          className="flex-1 flex items-center justify-center gap-1 py-[7px] rounded-[8px] bg-white border border-blue-600 text-blue-600 text-[12px] font-bold">
          <RefreshCw className="w-3 h-3" /> Change
        </button>
        <button type="button" onClick={onClear}
          className="px-3.5 py-[7px] rounded-[8px] bg-white border border-gray-200 text-gray-400">
          <X className="w-[14px] h-[14px]" />
        </button>
      </div>
    </div>
  );
}

// ─── main mobile component ─────────────────────────────────────────────────────

export default function MobileProductionCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const userName = user?.full_name || user?.email || '';

  const handleBack = () => {
    const state = location.state as any;
    const from = state?.from as string | undefined;
    const productId = state?.productId as string | undefined;
    const batchId = state?.batchId as string | undefined;
    const orderId = state?.orderId as string | undefined;

    if (state?.fromOrder && orderId) {
      navigate(`/orders/${orderId}`);
    } else if (from === 'product-detail' && productId) {
      navigate(`/products/${productId}`);
    } else if (from === 'product-list') {
      navigate('/products');
    } else if (from === 'production-detail' && batchId) {
      navigate(`/production/${batchId}`);
    } else {
      navigate('/production');
    }
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [completionDate, setCompletionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);
  const [allProductBatches, setAllProductBatches] = useState<any[]>([]);
  const [loadingSiblings, setLoadingSiblings] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filteredOrderOptions, setFilteredOrderOptions] = useState<Order[]>([]);
  const [filteringOrders, setFilteringOrders] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [quantityHint, setQuantityHint] = useState('');
  const [minRequiredQty, setMinRequiredQty] = useState(0);
  const [selectedOrderDeliveryDate, setSelectedOrderDeliveryDate] = useState<string | null>(null);
  const recipeCache = useRef<Record<string, any>>({});
  const lockedOrderId = useRef<string | null>(null);

  // Pre-fill from navigation state
  useEffect(() => {
    const state = location.state as any;
    if (user) {
      const uname = user.full_name || user.email || '';
      // set operator if needed
    }
    if (state?.fromOrder || state?.fromTask) {
      const productId = state.productId as string | undefined;
      if (productId) {
        ProductService.getProductById(productId).then(p => {
          if (!p) return;
          setSelectedProduct(p);
          if (state.orderId) {
            setSelectedOrderIds([state.orderId]);
            lockedOrderId.current = state.orderId;
          }
          if (state.expected_delivery || state.expectedDelivery) {
            const d = new Date(state.expected_delivery || state.expectedDelivery);
            d.setDate(d.getDate() - 2);
            setCompletionDate(d.toISOString().split('T')[0]);
            setSelectedOrderDeliveryDate(state.expected_delivery || state.expectedDelivery);
          }
          if (state.planned_quantity) setQuantity(String(state.planned_quantity));
        }).catch(() => {});
      }
    } else if (state?.product) {
      setSelectedProduct(state.product);
    } else {
      setTimeout(() => setPickerOpen(true), 150);
    }
  }, []);

  // Load pending orders
  useEffect(() => {
    setLoadingOrders(true);
    OrderService.getOrders({ status: ['pending', 'accepted', 'in_production'], limit: 200, sortBy: 'expected_delivery', sortOrder: 'asc' } as any)
      .then(res => setPendingOrders((res as any).data || []))
      .catch(() => setPendingOrders([]))
      .finally(() => setLoadingOrders(false));
  }, []);

  // Load batches when product changes
  useEffect(() => {
    if (!selectedProduct?.id) { setAllProductBatches([]); return; }
    setDuplicateAcknowledged(false);
    setLoadingSiblings(true);
    ProductionService.getBatches({ product_id: selectedProduct.id, limit: 100 } as any)
      .then((res: any) => {
        const rows = Array.isArray(res) ? res : (res?.data?.batches ?? res?.batches ?? res?.data ?? []);
        setAllProductBatches(rows);
      })
      .catch(() => setAllProductBatches([]))
      .finally(() => setLoadingSiblings(false));
  }, [selectedProduct?.id]);

  // Filter orders by recipe linkage
  useEffect(() => {
    if (!selectedProduct?.id) { setFilteredOrderOptions([]); return; }
    let cancelled = false;
    setFilteringOrders(true);
    const targetId = selectedProduct.id;

    const requiresTarget = async (productId: string, visited = new Set<string>()): Promise<boolean> => {
      if (!productId || visited.has(productId)) return false;
      if (productId === targetId) return true;
      visited.add(productId);
      if (!recipeCache.current[productId]) {
        try { recipeCache.current[productId] = await RecipeService.getRecipeByProductId(productId); } catch { recipeCache.current[productId] = null; }
      }
      const mats = (recipeCache.current[productId]?.materials || []).filter((m: any) => m.material_type === 'product');
      for (const m of mats) {
        if (m.material_id === targetId || await requiresTarget(m.material_id, visited)) return true;
      }
      return false;
    };

    (async () => {
      try {
        const relevant: Order[] = [];
        for (const order of pendingOrders) {
          let include = false;
          for (const item of (order as any).items || []) {
            const pid = item.product_id || item.productId;
            if (pid && await requiresTarget(pid)) { include = true; break; }
          }
          if (include) relevant.push(order);
        }
        if (!cancelled) setFilteredOrderOptions(relevant);
      } catch { if (!cancelled) setFilteredOrderOptions([]); }
      finally { if (!cancelled) setFilteringOrders(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedProduct?.id, pendingOrders]);

  // Quantity hint
  useEffect(() => {
    if (!selectedProduct?.id || selectedOrderIds.length === 0) { setQuantityHint(''); setMinRequiredQty(0); return; }
    let cancelled = false;
    const planQty = parseInt(quantity, 10) || 0;
    (async () => {
      try {
        const selectedOrders = pendingOrders.filter(o => selectedOrderIds.includes(o.id));
        const mulCache: Record<string, number> = {};
        const getMul = async (finalPid?: string): Promise<number> => {
          if (!finalPid || finalPid === selectedProduct.id) return finalPid === selectedProduct.id ? 1 : 0;
          if (mulCache[finalPid] !== undefined) return mulCache[finalPid];
          try {
            const recipe = await RecipeService.getRecipeByProductId(finalPid);
            const direct = (recipe?.materials || []).find((m: any) => m.material_type === 'product' && m.material_id === selectedProduct.id);
            mulCache[finalPid] = Number(direct?.quantity_per_sqm || 0);
          } catch { mulCache[finalPid] = 0; }
          return mulCache[finalPid];
        };
        let total = 0;
        for (const order of selectedOrders) {
          for (const item of (order as any).items || []) {
            const mul = await getMul(item.product_id || item.productId);
            if (mul > 0 && Number(item.quantity) > 0) total += mul * Number(item.quantity);
          }
        }
        if (cancelled) return;
        if (total > 0) {
          const rounded = Math.ceil(total * 1000) / 1000;
          setMinRequiredQty(rounded);
          setQuantityHint(`Required from attached orders: ${rounded}. ${planQty >= rounded ? 'Current quantity is valid.' : `Increase planned quantity to at least ${rounded}.`}`);
        } else {
          setMinRequiredQty(0);
          setQuantityHint('No direct recipe linkage found for selected orders. Set quantity manually.');
        }
      } catch { if (!cancelled) { setQuantityHint(''); setMinRequiredQty(0); } }
    })();
    return () => { cancelled = true; };
  }, [selectedOrderIds, selectedProduct?.id, pendingOrders, quantity]);

  const batchPlanned   = allProductBatches.filter(b => b.status === 'planned').length;
  const batchOngoing   = allProductBatches.filter(b => b.status === 'in_progress' || b.status === 'in_production').length;
  const batchCompleted = allProductBatches.filter(b => b.status === 'completed').length;
  const batchCancelled = allProductBatches.filter(b => b.status === 'cancelled').length;
  const activeBatches  = batchPlanned + batchOngoing;
  const hasDuplicate   = !loadingSiblings && activeBatches > 0;
  const latestBatches  = [...allProductBatches]
    .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  const planQty = parseInt(quantity, 10) || 0;
  const canSubmit = !!selectedProduct && planQty > 0 && completionDate.trim().length > 0 && (!hasDuplicate || duplicateAcknowledged);

  const handleSubmit = async () => {
    if (!canSubmit || !selectedProduct) return;
    setSubmitting(true);
    try {
      const selectedOrders = pendingOrders.filter(o => selectedOrderIds.includes(o.id));
      const attachedNums = selectedOrders.map((o: any) => o.order_number || o.orderNumber || o.id).filter(Boolean).join(', ');
      const attachedIds  = selectedOrders.map(o => o.id).filter(Boolean).join(', ');
      const attachedCusts = selectedOrders.map((o: any) => `${o.order_number || o.id}:${o.customer_name || o.customerName || 'Customer'}`).join(', ');
      const baseNotes = notes.trim();
      const notesWithOrders = attachedNums
        ? `${baseNotes ? `${baseNotes} · ` : ''}Attached Orders: ${attachedNums}${attachedIds ? ` · Attached Order IDs: ${attachedIds}` : ''}${attachedCusts ? ` · Attached Customers: ${attachedCusts}` : ''}`
        : baseNotes || undefined;

      const result = await ProductionService.createBatch({
        product_id: selectedProduct.id,
        planned_quantity: planQty,
        priority,
        completion_date: completionDate.trim(),
        operator: userName || undefined,
        supervisor: userName || undefined,
        notes: notesWithOrders,
        order_id: selectedOrders[0]?.id || undefined,
      } as CreateProductionBatchData);

      if (result.error || !result.data) throw new Error(result.error || 'Failed to create batch');
      const batchData = result.data;

      if (user?.id && userName) {
        await ProductionService.updateBatch(batchData.id, {
          assigned_to: user.id,
          current_stage: 'planning',
        } as any).catch(() => {});
      }

      toast({ title: 'Batch created', description: `#${batchData.batch_number || batchData.id}` });
      navigate(`/production/${batchData.id}/planning`, { replace: true });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message || 'Failed to create batch', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredForPicker = filteredOrderOptions.filter(o => {
    const q = orderSearch.toLowerCase();
    return !q || ((o as any).order_number || o.id || '').toLowerCase().includes(q) || ((o as any).customer_name || (o as any).customerName || '').toLowerCase().includes(q);
  });

  // ── render ────────────────────────────────────────────────────────────────────
  return createPortal(
    <>
      <div className="lg:hidden fixed inset-0 z-50 bg-gray-50 flex flex-col" style={{ height: '100dvh' }}>

        {/* Header */}
        <div className="flex items-center gap-1 bg-white border-b border-gray-100 px-2 py-2.5 shrink-0">
          <button type="button" onClick={handleBack} className="w-[38px] h-[38px] flex items-center justify-center rounded-[10px]">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <p className="text-[17px] font-extrabold text-gray-900">New Production Batch</p>
            {lockedOrderId.current && (
              <p className="text-[11px] text-gray-400">Linked to order · {lockedOrderId.current}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[14px] py-[14px] pb-28">

          {/* Product */}
          <FLabel required>Product</FLabel>
          {!selectedProduct ? (
            <button type="button" onClick={() => setPickerOpen(true)}
              className="w-full flex items-center gap-2.5 h-[44px] px-3 bg-white rounded-[10px] border border-gray-200 mb-[14px]">
              <Search className="w-[15px] h-[15px] text-gray-400 shrink-0" />
              <span className="flex-1 text-[14px] text-gray-400 text-left">Search and select a product…</span>
              <ChevronRight className="w-[14px] h-[14px] text-gray-400 shrink-0" />
            </button>
          ) : (
            <SelectedProductCard product={selectedProduct} onClear={() => { setSelectedProduct(null); setAllProductBatches([]); }} onChange={() => setPickerOpen(true)} />
          )}

          <div className="h-px bg-gray-200 my-3" />

          {/* Planned Quantity */}
          <FLabel required>Planned Quantity</FLabel>
          <div className="flex items-center h-[44px] px-3 bg-white border border-gray-200 rounded-[10px] mb-[14px]">
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={e => setQuantity(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none"
            />
            {selectedProduct && (
              <span className="text-[13px] text-gray-400 font-bold uppercase shrink-0">
                {(selectedProduct as any).count_unit || selectedProduct.unit || 'units'}
              </span>
            )}
          </div>
          {quantityHint && (
            <p className={`text-[11px] mt-[-8px] mb-[14px] leading-4 ${minRequiredQty > 0 && planQty < minRequiredQty ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
              {quantityHint}
            </p>
          )}

          {/* Priority */}
          <FLabel>Priority</FLabel>
          <div className="flex gap-1.5 mb-[14px]">
            {PRIORITIES.map(p => {
              const active = priority === p.value;
              return (
                <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                  className="flex-1 h-[44px] rounded-[10px] border text-[12px] font-bold transition-colors"
                  style={{
                    backgroundColor: active ? p.bg : '#fff',
                    borderColor: active ? p.color : '#E5E7EB',
                    color: active ? p.color : '#9CA3AF',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Expected Completion */}
          <FLabel required>Expected Completion</FLabel>
          <input
            type="date"
            value={completionDate}
            onChange={e => setCompletionDate(e.target.value)}
            className="w-full h-[44px] px-3 bg-white border border-gray-200 rounded-[10px] text-[14px] text-gray-900 outline-none mb-[14px]"
          />
          {selectedOrderDeliveryDate && (
            <p className="text-[11px] text-red-600 font-medium mt-[-8px] mb-[14px]">
              Order delivery: {formatIndianDate(selectedOrderDeliveryDate)}. Suggested: complete before this date.
            </p>
          )}

          {/* Orders */}
          <FLabel>Orders (Attach to Batch)</FLabel>
          <button type="button" onClick={() => setOrderPickerOpen(true)}
            className="w-full flex items-center gap-2 h-[44px] px-3 bg-white border rounded-[10px] mb-2 transition-colors"
            style={{ borderColor: selectedOrderIds.length > 0 ? '#2563EB' : '#E5E7EB' }}
          >
            <ShoppingCart className="w-[14px] h-[14px] shrink-0" style={{ color: selectedOrderIds.length > 0 ? '#2563EB' : '#9CA3AF' }} />
            <span className="flex-1 text-[14px] text-left" style={{ color: selectedOrderIds.length > 0 ? '#2563EB' : '#9CA3AF', fontWeight: selectedOrderIds.length > 0 ? 600 : 400 }}>
              {filteringOrders ? 'Finding related orders…' : selectedOrderIds.length > 0 ? `${selectedOrderIds.length} order${selectedOrderIds.length > 1 ? 's' : ''} selected` : `Select order(s) — ${filteredOrderOptions.length} available`}
            </span>
            {filteringOrders
              ? <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              : <ChevronRight className="w-[14px] h-[14px] text-gray-400 shrink-0" />}
          </button>
          {selectedOrderIds.length > 0 && (
            <div className="space-y-2 mb-[14px]">
              {selectedOrderIds.map(oid => {
                const isLocked = lockedOrderId.current === oid;
                const o = pendingOrders.find(x => x.id === oid) as any;
                if (!o) return null;
                return (
                  <div key={oid} className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-[10px] p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-blue-700">{o.order_number || o.orderNumber || o.id} — {o.customer_name || o.customerName || 'Customer'}</p>
                      {o.items && o.items.slice(0, 2).map((item: any, i: number) => (
                        <p key={i} className="text-[11px] text-blue-600/80 mt-0.5">· {item.product_name || item.productName || item.name} (Qty {item.quantity})</p>
                      ))}
                      {(o.expected_delivery || o.expectedDelivery) && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Expected: {new Date(o.expected_delivery || o.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {o.status ? ` · ${o.status}` : ''}
                        </p>
                      )}
                    </div>
                    {isLocked ? (
                      <Lock className="w-[14px] h-[14px] text-blue-500 shrink-0 mt-0.5" />
                    ) : (
                      <button type="button" onClick={() => setSelectedOrderIds(prev => prev.filter(id => id !== oid))} className="p-1">
                        <X className="w-[15px] h-[15px] text-gray-400" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Notes */}
          <FLabel>Notes</FLabel>
          <div className="bg-white border border-gray-200 rounded-[10px] px-3 pt-2.5 pb-2.5 mb-[14px]">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={3}
              className="w-full bg-transparent text-[14px] text-gray-900 outline-none resize-none placeholder-gray-400"
              style={{ minHeight: 56 }}
            />
          </div>

          {/* Current production info / duplicate warning */}
          {selectedProduct && (
            <div
              className="rounded-[14px] border p-[14px] mb-4"
              style={{
                backgroundColor: hasDuplicate ? (batchOngoing > 0 ? '#FEF2F2' : '#FFFBEB') : '#EFF6FF',
                borderColor: hasDuplicate ? (batchOngoing > 0 ? '#FECACA' : '#FDE68A') : '#BFDBFE',
              }}
            >
              {/* Title */}
              <div className="flex items-center gap-2 mb-1.5">
                {loadingSiblings ? (
                  <div className="w-[14px] h-[14px] border-2 border-current border-t-transparent rounded-full animate-spin" style={{ color: hasDuplicate ? (batchOngoing > 0 ? '#991B1B' : '#92400E') : '#2563EB' }} />
                ) : hasDuplicate ? (
                  <AlertTriangle className="w-[14px] h-[14px] shrink-0" style={{ color: batchOngoing > 0 ? '#DC2626' : '#D97706' }} />
                ) : null}
                <p className="text-[13px] font-bold flex-1" style={{ color: hasDuplicate ? (batchOngoing > 0 ? '#991B1B' : '#92400E') : '#1D4ED8' }}>
                  {loadingSiblings
                    ? 'Checking existing productions…'
                    : hasDuplicate
                      ? `Warning: ${activeBatches} active production${activeBatches > 1 ? 's' : ''} already exist`
                      : 'Current production for this product'}
                </p>
              </div>

              {!loadingSiblings && hasDuplicate && (
                <p className="text-[11px] mb-2.5 leading-[17px]" style={{ color: hasDuplicate ? (batchOngoing > 0 ? '#991B1B' : '#92400E') : '#1D4ED8', opacity: 0.85 }}>
                  Creating another production will consume raw materials a second time. Check if one of the batches below is already being worked on before proceeding.
                </p>
              )}

              {/* Counts */}
              {!loadingSiblings && allProductBatches.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { label: 'Total', val: allProductBatches.length },
                    { label: 'Planned', val: batchPlanned },
                    { label: 'Ongoing', val: batchOngoing },
                    { label: 'Completed', val: batchCompleted },
                    { label: 'Cancelled', val: batchCancelled },
                  ].map(item => (
                    <div key={item.label} className="bg-white rounded-[8px] px-2 py-1.5">
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                      <p className="text-[13px] font-extrabold text-gray-800">{item.val}</p>
                    </div>
                  ))}
                </div>
              )}

              {!loadingSiblings && allProductBatches.length === 0 && (
                <p className="text-[12px]" style={{ color: '#1D4ED8' }}>No previous production batches found.</p>
              )}

              {/* Latest batches */}
              {!loadingSiblings && latestBatches.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold mb-1.5" style={{ color: hasDuplicate ? (batchOngoing > 0 ? '#991B1B' : '#92400E') : '#1D4ED8' }}>Latest batches:</p>
                  {latestBatches.map(sb => {
                    const isActive = ['in_progress', 'in_production', 'planned'].includes(sb.status);
                    return (
                      <div key={sb.id} className="flex items-center gap-2.5 rounded-[10px] border p-2.5 mb-1.5"
                        style={{
                          backgroundColor: isActive ? (batchOngoing > 0 ? '#FEE2E2' : '#FFFBEB') : '#fff',
                          borderColor: isActive ? (hasDuplicate ? (batchOngoing > 0 ? '#FECACA' : '#FDE68A') : '#BFDBFE') : '#E5E7EB',
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold" style={{ color: isActive ? (batchOngoing > 0 ? '#991B1B' : '#92400E') : '#111827' }}>
                            #{sb.batch_number} <span className="text-[10px] font-normal text-gray-400">{sb.status.toUpperCase()}</span>
                          </p>
                          <p className="text-[11px] text-gray-400">Qty: {sb.planned_quantity}</p>
                          {(sb.current_stage_assigned_to_name || sb.assigned_to_name) && (
                            <p className="text-[11px] text-gray-400">{sb.current_stage_assigned_to_name || sb.assigned_to_name}</p>
                          )}
                        </div>
                        {isActive && (
                          <button type="button" onClick={() => navigate(`/production/${sb.id}`)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-white text-[11px] font-bold shrink-0"
                            style={{ backgroundColor: batchOngoing > 0 ? '#991B1B' : '#92400E' }}
                          >
                            <ChevronRight className="w-3 h-3" />
                            {sb.status === 'planned' ? 'Go to Planning' : 'Go to Machine Stage'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Acknowledgment */}
              {!loadingSiblings && hasDuplicate && (
                <button type="button" onClick={() => setDuplicateAcknowledged(v => !v)}
                  className="flex items-start gap-2.5 w-full border-t pt-3 mt-1"
                  style={{ borderColor: hasDuplicate ? (batchOngoing > 0 ? '#FECACA' : '#FDE68A') : '#BFDBFE' }}
                >
                  <div className="w-5 h-5 rounded-[5px] border-[1.5px] flex items-center justify-center shrink-0 mt-0.5"
                    style={{ borderColor: duplicateAcknowledged ? '#2563EB' : '#D1D5DB', backgroundColor: duplicateAcknowledged ? '#2563EB' : '#fff' }}>
                    {duplicateAcknowledged && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <p className="text-[12px] text-left leading-[18px]" style={{ color: batchOngoing > 0 ? '#991B1B' : '#92400E' }}>
                    I have checked the existing productions above and confirm I need to create a new one. I understand raw materials will be consumed again.
                  </p>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-[14px] pb-8 pt-3 border-t border-gray-100 bg-white shrink-0">
          <button type="button" onClick={handleBack}
            className="h-[52px] px-5 rounded-[10px] border border-gray-200 bg-white text-[14px] font-bold text-gray-700">
            Cancel
          </button>
          <button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit}
            className="flex-1 h-[52px] rounded-[10px] text-[14px] font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
            style={{ backgroundColor: canSubmit ? '#2563EB' : '#D1D5DB' }}
          >
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
              : 'Create Batch'}
          </button>
        </div>
      </div>

      {/* ── Product Picker (mobile only) ── */}
      <div className="lg:hidden">
        {pickerOpen && (
          <ProductPickerScreen
            onClose={() => setPickerOpen(false)}
            onSelect={p => { setSelectedProduct(p); setPickerOpen(false); }}
            selectedId={selectedProduct?.id}
          />
        )}
      </div>

      {/* ── Order Picker (mobile only) ── */}
      {orderPickerOpen && (
        <div className="lg:hidden fixed inset-0 z-[90] bg-gray-50 flex flex-col" style={{ height: '100dvh' }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 bg-white border-b border-gray-100 px-[14px] py-3 shrink-0">
            <button type="button" onClick={() => setOrderPickerOpen(false)} className="p-1">
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <p className="text-[15px] font-bold text-gray-900">Select Order(s)</p>
              {selectedProduct && (
                <p className="text-[11px] text-gray-400">
                  {filteringOrders ? 'Filtering…' : `${filteredOrderOptions.length} order${filteredOrderOptions.length !== 1 ? 's' : ''} for this product`}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setOrderPickerOpen(false)}
              className="bg-blue-600 px-[14px] py-2 rounded-[8px]">
              <span className="text-[13px] font-bold text-white">
                {selectedOrderIds.length > 0 ? `Done (${selectedOrderIds.length})` : 'Done'}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="bg-white border-b border-gray-100 px-[14px] py-2 shrink-0">
            <div className="flex items-center gap-2 bg-gray-100 rounded-[10px] px-3 h-[38px]">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                className="flex-1 bg-transparent text-[14px] text-gray-900 outline-none placeholder-gray-400"
                placeholder="Search by order # or customer…"
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
              />
              {orderSearch && <button type="button" onClick={() => setOrderSearch('')}><X className="w-4 h-4 text-gray-400" /></button>}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {loadingOrders || filteringOrders ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                {filteringOrders && <p className="text-[12px] text-gray-400">Checking recipe links…</p>}
              </div>
            ) : filteredForPicker.length === 0 ? (
              <div className="flex flex-col items-center pt-10 px-6 text-center">
                <ShoppingCart className="w-7 h-7 text-gray-300 mb-2.5" />
                <p className="text-[13px] text-gray-400">
                  {selectedProduct ? `No pending orders require "${selectedProduct.name}"` : 'No orders found'}
                </p>
                {selectedProduct && (
                  <p className="text-[11px] text-gray-400 mt-1.5 leading-4">
                    Orders are shown when their product recipe requires this product as a material
                  </p>
                )}
              </div>
            ) : filteredForPicker.map(o => {
              const isSelected = selectedOrderIds.includes(o.id);
              const isLocked = lockedOrderId.current === o.id;
              const order = o as any;
              return (
                <button key={o.id} type="button"
                  onClick={() => {
                    if (isLocked) return;
                    setSelectedOrderIds(prev => isSelected ? prev.filter(id => id !== o.id) : [...prev, o.id]);
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-[12px] border text-left transition-colors"
                  style={{ backgroundColor: isSelected ? '#EFF6FF' : '#fff', borderColor: isSelected ? '#2563EB' : '#E5E7EB' }}
                >
                  {/* Checkbox */}
                  <div className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ borderColor: isSelected ? '#2563EB' : '#D1D5DB', backgroundColor: isSelected ? '#2563EB' : '#fff' }}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: isSelected ? '#1D4ED8' : '#111827' }}>
                      {order.order_number || order.orderNumber || order.id} — {order.customer_name || order.customerName || 'Customer'}
                    </p>
                    <span className="inline-block text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full mt-0.5">{order.status}</span>
                    {order.items && order.items.slice(0, 2).map((item: any, i: number) => (
                      <p key={i} className="text-[11px] text-blue-600/70 mt-0.5">· {item.product_name || item.productName || item.name} (Qty {item.quantity})</p>
                    ))}
                    {(order.expected_delivery || order.expectedDelivery) && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Expected: {new Date(order.expected_delivery || order.expectedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {isLocked && <p className="text-[10px] text-blue-500 mt-0.5">(Auto-selected from task)</p>}
                  </div>
                  {isLocked && <Lock className="w-[14px] h-[14px] text-blue-500 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
