import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, MapPin, Truck, Edit2, StickyNote, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerService, type Customer } from '@/services/customerService';
import { OrderService } from '@/services/orderService';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { usePricingCalculator, type ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import { type ProductDimensions } from '@/utils/unitConverter';
import { formatCurrency, formatErrorMessage, formatIndianDate } from '@/utils/formatHelpers';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';
import CustomerSelection from '@/components/orders/CustomerSelection';
import CustomerForm from '@/components/orders/CustomerForm';
import OrderItemsList from '@/components/orders/OrderItemsList';
import MobileOrderItemForm from '@/components/orders/MobileOrderItemForm';
import ProductMaterialSelectionDialog from '@/components/orders/ProductMaterialSelectionDialog';
import DeliveryAddressDialog from '@/components/orders/DeliveryAddressDialog';
import { TransportService, type Transport } from '@/services/transportService';
import { getApiUrl } from '@/utils/apiConfig';

async function _authHeaders(): Promise<Record<string, string>> {
  const token = localStorage.getItem('auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function fetchCapacityUnits(): Promise<string[]> {
  const res = await fetch(`${getApiUrl()}/dropdowns/capacity_unit`, { headers: await _authHeaders() });
  const data = await res.json();
  return data.success ? data.data.map((d: any) => d.value) : [];
}
async function addCapacityUnit(value: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/dropdowns`, {
    method: 'POST', headers: await _authHeaders(),
    body: JSON.stringify({ category: 'capacity_unit', value: value.trim() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to add unit');
}

const DRAFT_KEY = 'newOrderDraft';

function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Custom step icons (carpet/textile product themed) ──
const StepIconCustomer = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="3.2" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
);
const StepIconItems = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="M7 6v12M11 6v12" opacity=".5" />
    <ellipse cx="17" cy="12" rx="4" ry="6" />
    <path d="M17 8c1.5 0 2 1.6 2 4s-.5 4-2 4" />
  </svg>
);
const StepIconDetails = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="17" rx="2" />
    <path d="M9 4h6v3H9z" fill={color} stroke="none" opacity=".25" />
    <path d="M9 4h6v3H9z" />
    <path d="M8 12h6M8 16h4" />
  </svg>
);
const StepIconReview = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v5h5" />
    <path d="M9 14l2.5 2.5L16 12" />
  </svg>
);
const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const STEPS = [
  { label: 'Customer', Icon: StepIconCustomer },
  { label: 'Items', Icon: StepIconItems },
  { label: 'Details', Icon: StepIconDetails },
  { label: 'Review', Icon: StepIconReview },
];

function StepperBars({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, idx) => {
        const done = idx < current;
        const active = idx === current;
        const pending = !done && !active;
        return (
          <div key={idx} className="flex items-center gap-1">
            <div
              className="flex items-center gap-1.5 px-3 h-9 rounded-lg transition-all duration-200 whitespace-nowrap"
              style={{
                background: done ? '#16a34a' : active ? '#2563eb' : 'transparent',
                color: done || active ? '#fff' : '#94a3b8',
                border: pending ? '1px solid #e2e8f0' : 'none',
              }}
            >
              <span className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                {done ? <CheckIcon size={12} /> : <s.Icon size={14} color={done || active ? '#fff' : '#94a3b8'} />}
              </span>
              <span className="text-[13px] font-semibold tracking-tight">{s.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DraftBanner({ step, onDismiss }: { step: number; onDismiss: () => void }) {
  const labels = ['Customer', 'Items', 'Details', 'Review'];
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span className="text-amber-800 font-medium text-xs">
          Draft restored — you left off at <span className="font-bold">{labels[step] ?? 'last step'}</span>. Your customer, items and details are all saved.
        </span>
      </div>
      <button onClick={onDismiss} className="text-amber-600 hover:text-amber-800 text-xs font-medium ml-4 flex-shrink-0">✕ Dismiss</button>
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  hint,
}: {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex items-center gap-3">
      <button
        onClick={onBack}
        className="h-10 px-5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {hint && <span className="text-xs text-slate-400 italic flex-1 text-center">{hint}</span>}
      {onNext && (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="ml-auto h-10 px-6 rounded-lg text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity bg-primary-600 hover:bg-primary-700"
        >
          {nextLabel} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricingCalculator = usePricingCalculator();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const draftRestoredRef = useRef(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  const [orderItems, setOrderItems] = useState<ExtendedOrderItem[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  const [customerSearchQ, setCustomerSearchQ] = useState('');
  const [mobileExpandedItemId, setMobileExpandedItemId] = useState<string | null>(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [currentOrderItem, setCurrentOrderItem] = useState<ExtendedOrderItem | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productColorFilter, setProductColorFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const [productItemsPerPage] = useState(20);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialItemsPerPage] = useState(20);
  const [productSortBy, setProductSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [productSortOrder, setProductSortOrder] = useState<'asc' | 'desc'>('asc');
  const [materialSortBy, setMaterialSortBy] = useState<'name' | 'stock' | 'category' | 'recent'>('name');
  const [materialSortOrder, setMaterialSortOrder] = useState<'asc' | 'desc'>('asc');

  const [orderDetails, setOrderDetails] = useState({ expectedDelivery: '', notes: '', remarks: '', paidAmount: 0, piNumber: '' });
  const [transportType, setTransportType] = useState<'own' | 'outside' | 'hired' | ''>('');
  const [transportVehicleNo, setTransportVehicleNo] = useState('');
  const [transportRemark, setTransportRemark] = useState('');
  const [savedTransports, setSavedTransports] = useState<Transport[]>([]);
  const [selectedTransportId, setSelectedTransportId] = useState('');
  const [addingNewTruck, setAddingNewTruck] = useState(false);
  const [newTruckNo, setNewTruckNo] = useState('');
  const [newTruckType, setNewTruckType] = useState<'own' | 'outside' | 'hired'>('own');
  const [newTruckDriverName, setNewTruckDriverName] = useState('');
  const [newTruckDriverContact, setNewTruckDriverContact] = useState('');
  const [newTruckCapacityValue, setNewTruckCapacityValue] = useState('');
  const [newTruckCapacityUnit, setNewTruckCapacityUnit] = useState('');
  const [capacityUnits, setCapacityUnits] = useState<string[]>([]);
  const [addingCapacityUnit, setAddingCapacityUnit] = useState(false);
  const [newCapacityUnitValue, setNewCapacityUnitValue] = useState('');
  const [savingCapacityUnit, setSavingCapacityUnit] = useState(false);
  const [savingNewTruck, setSavingNewTruck] = useState(false);
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState<{ address: string; city: string; state: string; pincode: string } | null>(null);
  const [showAddressEditor, setShowAddressEditor] = useState(false);

  const selectTruck = (t: Transport) => {
    setSelectedTransportId(t.id);
    setTransportVehicleNo(t.vehicle_no);
    setTransportType(t.vehicle_type);
    setAddingNewTruck(false);
  };

  const handleSaveNewTruck = async () => {
    if (!newTruckNo.trim()) return;
    setSavingNewTruck(true);
    try {
      const created = await TransportService.create({
        vehicle_no: newTruckNo.trim().toUpperCase(),
        vehicle_type: newTruckType,
        capacity_value: newTruckCapacityValue.trim() !== '' ? parseFloat(newTruckCapacityValue) : null,
        capacity_unit: newTruckCapacityUnit,
        driver_name: newTruckDriverName.trim(),
        driver_contact: newTruckDriverContact.trim(),
        notes: '',
      });
      setSavedTransports(prev => [...prev, created]);
      selectTruck(created);
      setNewTruckNo(''); setNewTruckDriverName(''); setNewTruckDriverContact('');
      setNewTruckCapacityValue(''); setNewTruckCapacityUnit('');
      setAddingCapacityUnit(false); setNewCapacityUnitValue('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingNewTruck(false); }
  };

  const handleAddCapacityUnit = async () => {
    if (!newCapacityUnitValue.trim()) return;
    setSavingCapacityUnit(true);
    try {
      await addCapacityUnit(newCapacityUnitValue.trim());
      const updated = await fetchCapacityUnits();
      setCapacityUnits(updated);
      setNewTruckCapacityUnit(newCapacityUnitValue.trim());
      setNewCapacityUnitValue('');
      setAddingCapacityUnit(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingCapacityUnit(false); }
  };

  const customerFormSubmitRef = useRef<(() => void) | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(() => {
    if (!draftRestoredRef.current) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
          step, selectedCustomer, orderItems, orderDetails,
          transportType, transportVehicleNo, transportRemark, orderDeliveryAddress,
        }));
        setDraftSavedAt(new Date());
      } catch { }
    }, 800);
  }, [step, selectedCustomer, orderItems, orderDetails, transportType, transportVehicleNo, transportRemark, orderDeliveryAddress]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const hasMeaningfulData = d.selectedCustomer || d.orderItems?.length;
        if (hasMeaningfulData) {
          if (d.selectedCustomer) setSelectedCustomer(d.selectedCustomer);
          if (d.orderItems?.length) setOrderItems(d.orderItems);
          if (d.orderDetails) setOrderDetails(d.orderDetails);
          if (d.transportType) setTransportType(d.transportType);
          if (d.transportVehicleNo) setTransportVehicleNo(d.transportVehicleNo);
          if (d.transportRemark) setTransportRemark(d.transportRemark);
          if (d.orderDeliveryAddress) setOrderDeliveryAddress(d.orderDeliveryAddress);
          if (typeof d.step === 'number') setStep(d.step);
          setShowDraftBanner(true);
        }
      }
    } catch { }
    // Allow saveDraft to run only after restore is complete
    draftRestoredRef.current = true;
  }, []);

  const clearDraft = () => { sessionStorage.removeItem(DRAFT_KEY); };

  useEffect(() => {
    TransportService.getAll(true).then(setSavedTransports).catch(() => {});
    fetchCapacityUnits().then(setCapacityUnits).catch(() => {});
    loadCustomers();
    loadProductsWithFilters();
    loadRawMaterialsWithFilters();
  }, []);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const isMaterial = currentOrderItem?.product_type === 'raw_material';
    if (isMaterial) {
      searchTimerRef.current = setTimeout(() => { setMaterialPage(1); loadRawMaterialsWithFilters(productSearchTerm); }, productSearchTerm ? 350 : 0);
    } else {
      searchTimerRef.current = setTimeout(() => { setProductPage(1); loadProductsWithFilters(); }, productSearchTerm ? 350 : 0);
    }
  }, [productSearchTerm, productCategoryFilter, productColorFilter, productSortBy, productSortOrder, currentOrderItem?.product_type]);
  useEffect(() => { loadRawMaterialsWithFilters(); }, [materialSortBy, materialSortOrder]);

  const loadCustomers = async () => {
    setCustomersLoading(true);
    try {
      const { data } = await CustomerService.getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  };

  const loadProductsWithFilters = async () => {
    try {
      const baseFilters: any = { limit: 100, sortBy: productSortBy === 'recent' ? 'created_at' : productSortBy, sortOrder: productSortOrder };
      if (productSearchTerm) baseFilters.search = productSearchTerm;
      if (productCategoryFilter !== 'all') baseFilters.category = [productCategoryFilter];
      if (productColorFilter !== 'all') baseFilters.color = [productColorFilter];

      const mapProduct = (p: any) => ({
        id: p.id || p._id, name: p.name, price: p.price || 0,
        current_stock: p.current_stock || p.base_quantity || 0, stock: p.current_stock || p.base_quantity || 0,
        category: p.category, subcategory: p.subcategory || '', color: p.color, pattern: p.pattern,
        width: p.width, length: p.length, weight: p.weight,
        width_unit: p.width_unit, length_unit: p.length_unit, weight_unit: p.weight_unit,
        gsm: parseFloat(String(p.weight || '0').replace(/[^\d.-]/g, '')) || 0,
        unit: p.unit || 'units', count_unit: p.count_unit || 'rolls',
        individual_stock_tracking: p.individual_stock_tracking !== false,
        individualStockTracking: p.individual_stock_tracking !== false,
        imageUrl: p.image_url || '',
      });

      const first = await ProductService.getProducts({ ...baseFilters, page: 1 });
      const all = [...(first.products || [])];
      const total = first.total || 0;
      const pages = Math.ceil(total / 100);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          ProductService.getProducts({ ...baseFilters, page: i + 2 })
        )
      );
      rest.forEach(r => all.push(...(r.products || [])));
      setRealProducts(all.map(mapProduct));
    } catch (e) { console.error(e); }
  };

  const loadRawMaterialsWithFilters = async (searchTerm = '') => {
    try {
      const baseFilters: any = { limit: 100, sortBy: materialSortBy === 'recent' ? 'created_at' : materialSortBy, sortOrder: materialSortOrder };
      if (searchTerm) baseFilters.search = searchTerm;

      const mapMaterial = (m: any) => ({
        id: m.id || m._id, name: m.name, price: m.cost_per_unit || 0,
        current_stock: m.current_stock || 0, stock: m.current_stock || 0,
        available_stock: m.available_stock, reserved: m.reserved, in_production: m.in_production,
        sold: m.sold, used: m.used, category: m.category, type: m.type, color: m.color,
        brand: m.supplier_name || 'Unknown', unit: m.unit,
        supplier: m.supplier_name || 'Unknown', supplier_name: m.supplier_name || 'Unknown',
        batch_number: m.batch_number, status: m.status || 'in-stock', location: 'Warehouse',
      });

      const first = await MaterialService.getMaterials({ ...baseFilters, page: 1 });
      const all = [...(first.materials || [])];
      const total = first.total || 0;
      const pages = Math.ceil(total / 100);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          MaterialService.getMaterials({ ...baseFilters, page: i + 2 })
        )
      );
      rest.forEach(r => all.push(...(r.materials || [])));
      setRawMaterials(all.map(mapMaterial));
    } catch (e) { console.error(e); }
  };

  const addOrderItem = () => {
    const newId = generateUniqueId('ORDITEM');
    setOrderItems(prev => [...prev, {
      id: newId, product_id: '', product_name: '', product_type: 'product',
      quantity: 1, unit: '', unit_price: 0, gst_rate: 5, gst_included: true,
      subtotal: 0, gst_amount: 0, total_price: 0, pricing_unit: 'sqm',
      product_dimensions: { productType: 'carpet' }, isEditing: true, isValid: false,
    }]);
    setMobileExpandedItemId(newId);
  };

  const updateOrderItem = (id: string, field: keyof ExtendedOrderItem, value: any) => {
    setOrderItems(items => items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'product_type' && item.product_type !== value) {
        updated.product_id = ''; updated.product_name = ''; updated.unit_price = 0;
        updated.unit = ''; updated.pricing_unit = 'unit';
        updated.product_dimensions = { productType: value === 'raw_material' ? 'raw_material' : 'carpet' };
        updated.subtotal = 0; updated.gst_amount = 0; updated.total_price = 0;
        updated.unit_value = 0; updated.isValid = false; updated.errorMessage = undefined;
        (updated as any).length_unit = undefined; (updated as any).width_unit = undefined; (updated as any).weight_unit = undefined;
      }
      if (field === 'product_id') {
        const product = updated.product_type === 'raw_material' ? rawMaterials.find(p => p.id === value) : realProducts.find(p => p.id === value);
        if (product) {
          updated.product_name = product.name; updated.unit_price = product.price || 0;
          updated.unit = updated.product_type === 'raw_material' ? (product.unit || 'units') : (product.count_unit || 'rolls');
          const productDimensions: ProductDimensions = { productType: updated.product_type === 'raw_material' ? 'raw_material' : 'carpet', width: product.width, length: product.length, weight: product.weight, gsm: product.gsm, length_unit: product.length_unit, width_unit: product.width_unit } as any;
          (updated as any).length_unit = product.length_unit; (updated as any).width_unit = product.width_unit; (updated as any).weight_unit = product.weight_unit;
          (updated as any).color = product.color; (updated as any).pattern = product.pattern;
          (updated as any).count_unit = product.count_unit; (updated as any).individual_stock_tracking = product.individual_stock_tracking;
          (updated as any).available_stock = product.available_stock ?? product.current_stock ?? 0;
          updated.product_dimensions = productDimensions; updated.pricing_unit = 'unit';
          const calc = pricingCalculator.calculateItemPrice(updated);
          updated.subtotal = calc.subtotal; updated.gst_amount = calc.gstAmount; updated.total_price = calc.totalPrice; updated.unit_value = calc.unitValue; updated.isValid = calc.isValid; updated.errorMessage = calc.errorMessage;
        }
      }
      if (['quantity', 'unit_price', 'pricing_unit', 'product_dimensions', 'gst_rate', 'gst_included'].includes(field)) {
        if (field === 'gst_included' && value === false) updated.gst_rate = 0;
        else if (field === 'gst_included' && value === true && (!updated.gst_rate || updated.gst_rate === 0)) updated.gst_rate = 5;
        else if (field === 'gst_rate') { if (value === 0) updated.gst_included = false; else if (value > 0 && !updated.gst_included) updated.gst_included = true; }
        const calc = pricingCalculator.calculateItemPrice(updated);
        updated.subtotal = calc.subtotal; updated.gst_amount = calc.gstAmount; updated.total_price = calc.totalPrice; updated.unit_value = calc.unitValue; updated.isValid = calc.isValid; updated.errorMessage = calc.errorMessage;
      }
      return updated;
    }));
  };

  const removeOrderItem = (id: string) => setOrderItems(items => items.filter(i => i.id !== id));

  const calculateOrderBreakdown = () => {
    const subtotal = orderItems.reduce((s, i) => s + (i.subtotal || 0), 0);
    const gstAmount = orderItems.reduce((s, i) => s + (i.gst_amount || 0), 0);
    const rawTotal = orderItems.reduce((s, i) => s + (i.total_price || 0), 0);
    return { subtotal, gstAmount, total: Math.round(rawTotal) };
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (orderItems.length === 0 || orderItems.some(i => !i.product_id)) {
      toast({ title: 'No product selected', description: 'Please select at least one product or raw material.', variant: 'destructive' });
      return;
    }
    if (!orderDetails.expectedDelivery) {
      toast({ title: 'Missing delivery date', description: 'Please set an expected delivery date in step 3.', variant: 'destructive' });
      return;
    }
    const { total } = calculateOrderBreakdown();
    if ((orderDetails.paidAmount || 0) > total) {
      toast({ title: 'Validation error', description: `Paid amount cannot exceed ${formatCurrency(total, { full: true })}`, variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await OrderService.createOrder({
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || '',
        customer_email: selectedCustomer?.email || '',
        customer_phone: selectedCustomer?.phone || '',
        expected_delivery: orderDetails.expectedDelivery,
        items: orderItems.map(item => ({
          product_id: item.product_id, raw_material_id: item.raw_material_id,
          product_name: item.product_name, product_type: item.product_type,
          quantity: item.quantity, unit: item.unit, unit_price: item.unit_price,
          gst_rate: (item.gst_included === false || item.gst_rate === 0) ? 0 : (item.gst_rate || 5),
          gst_included: item.gst_included === true,
          subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : (item.subtotal || 0),
          gst_amount: typeof item.gst_amount === 'string' ? parseFloat(item.gst_amount) : (item.gst_amount || 0),
          total_price: typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price,
          pricing_unit: item.pricing_unit, unit_value: item.unit_value,
          product_dimensions: item.product_dimensions, specifications: item.specifications || '',
          selected_individual_products: item.selectedIndividualProducts?.map((p: any) => p.id) || [],
        })),
        discount_amount: 0, paid_amount: orderDetails.paidAmount || 0,
        priority: 'medium' as const,
        pi_number: orderDetails.piNumber || undefined,
        special_instructions: orderDetails.notes || undefined,
        delivery_address: orderDeliveryAddress || undefined,
        transport_type: transportType || undefined,
        transport_vehicle_no: transportVehicleNo || undefined,
        transport_remark: transportRemark || undefined,
      } as any);
      if (error) { toast({ title: 'Error', description: error, variant: 'destructive' }); setIsSubmitting(false); return; }
      clearDraft();
      toast({ title: 'Order created', description: `Total: ${formatCurrency(total, { full: true })}` });
      setTimeout(() => navigate('/orders'), 1200);
    } catch (err) {
      toast({ title: 'Error', description: formatErrorMessage(err instanceof Error ? err.message : 'Failed to create order'), variant: 'destructive' });
      setIsSubmitting(false);
    }
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
    setSelectedCustomer(customer);
    setShowNewCustomerForm(false);
    setStep(1);
  };

  const handleCustomerSelected = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep(1);
  };

  const handleUseCustomerAddress = () => {
    if (!selectedCustomer) return;
    if (selectedCustomer.delivery_address) {
      try { setOrderDeliveryAddress(JSON.parse(selectedCustomer.delivery_address)); } catch { }
    } else {
      setOrderDeliveryAddress({ address: selectedCustomer.address || '', city: selectedCustomer.city || '', state: selectedCustomer.state || '', pincode: selectedCustomer.pincode || '' });
    }
  };

  const handleBack = () => {
    if (step === 0) { clearDraft(); navigate('/orders'); }
    else setStep(s => s - 1);
  };

  const { subtotal, gstAmount, total } = calculateOrderBreakdown();
  const canGoNextFromItems = orderItems.length > 0 && orderItems.every(i => i.isValid && !!i.product_id);

  return (
    <Layout>
      {/* ════════════════════════════════════════════════════════════
          MOBILE WIZARD — full screen, app-style
      ════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed inset-0 z-20 bg-gray-50 flex flex-col" style={{ top: 64 }}>

        {/* Mobile: white header with back + title + step circles */}
        <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={handleBack} className="flex items-center gap-1 text-gray-500">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{step === 0 ? 'Orders' : 'Back'}</span>
            </button>
            <span className="text-base font-bold text-gray-900 flex-1">New Order</span>
            {draftSavedAt && <span className="text-[10px] text-gray-400">Saved</span>}
          </div>
          {/* Step bar — circles + lines like the RN app */}
          <div className="flex items-center">
            {['Customer','Items','Details','Review'].map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${done ? 'bg-green-500 border-green-500' : active ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-300'}`}>
                      {done
                        ? <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                        : <span className={`text-[11px] font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{i+1}</span>
                      }
                    </div>
                    <span className={`text-[9px] mt-1 font-${active ? '700' : '500'} ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {i < 3 && <div className={`h-0.5 flex-1 mb-4 mx-1 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {showDraftBanner && <DraftBanner step={step} onDismiss={() => setShowDraftBanner(false)} />}

        {/* MOBILE STEP CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {/* Step 0 — Customer */}
          {step === 0 && (
            <div className="flex flex-col min-h-full">
              {!showNewCustomerForm && (
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Select Customer</p>
                  <button
                    onClick={() => setShowNewCustomerForm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    <span className="text-base leading-none">+</span> New Customer
                  </button>
                </div>
              )}
              {!showNewCustomerForm ? (
                <>
                  <div className="px-4 pb-2">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <input
                        className="w-full pl-9 pr-4 h-[46px] rounded-[10px] border border-gray-200 bg-white text-[15px] outline-none focus:border-blue-400 shadow-sm"
                        placeholder="Search by name, phone, email…"
                        value={customerSearchQ}
                        onChange={e => setCustomerSearchQ(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex-1 px-4 pb-44 space-y-2 pt-1">
                    {customersLoading ? (
                      <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
                    ) : customers.filter(c => {
                      const q = customerSearchQ.toLowerCase();
                      return !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
                    }).length === 0 ? (
                      <div className="flex flex-col items-center py-12 text-center">
                        <div className="text-4xl mb-3">👥</div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">No customers found</p>
                        <button onClick={() => setShowNewCustomerForm(true)} className="mt-3 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold">Add New Customer</button>
                      </div>
                    ) : customers.filter(c => {
                      const q = customerSearchQ.toLowerCase();
                      return !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
                    }).map(c => {
                      const active = selectedCustomer?.id === c.id;
                      return (
                        <button key={c.id} onClick={() => handleCustomerSelected(c)}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white shadow-sm'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-600' : 'bg-gray-200'}`}>
                            <span className={`text-base font-extrabold ${active ? 'text-white' : 'text-gray-500'}`}>{c.name?.[0]?.toUpperCase() || '?'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{c.name}</p>
                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                            {(c.city || c.state) && <p className="text-xs text-gray-400 truncate">{[c.address, c.city, c.state].filter(Boolean).join(', ')}</p>}
                            {c.gst_number && <p className="text-xs text-gray-400 font-mono">GST: {c.gst_number}</p>}
                          </div>
                          {active && <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="px-4 pt-4 pb-44">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">New Customer</p>
                  <CustomerForm
                    onCustomerCreated={handleCustomerCreated}
                    onCancel={() => setShowNewCustomerForm(false)}
                    showCard={false}
                    hideActions={true}
                    onSubmitRef={customerFormSubmitRef}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 1 — Items (mobile) */}
          {step === 1 && (
            <div className="px-4 pt-4 pb-44">
              {/* Section header */}
              <div className="mb-3">
                <p className="text-sm font-extrabold text-gray-900">Order Items</p>
                <p className="text-[12.5px] text-gray-500 mt-0.5">Add products or materials. Tap an item to expand and edit.</p>
              </div>

              {/* Item cards */}
              {orderItems.map((item) => (
                <MobileOrderItemForm
                  key={item.id}
                  item={item}
                  index={orderItems.indexOf(item)}
                  isExpanded={mobileExpandedItemId === item.id}
                  onToggle={() => setMobileExpandedItemId(prev => prev === item.id ? null : item.id)}
                  onUpdate={updateOrderItem}
                  onRemove={(id) => { removeOrderItem(id); if (mobileExpandedItemId === id) setMobileExpandedItemId(null); }}
                  onSelectProduct={(item) => { setCurrentOrderItem(item); setShowProductSearch(true); }}
                  products={realProducts}
                  rawMaterials={rawMaterials}
                />
              ))}

              {/* Add Item button */}
              <button
                onClick={addOrderItem}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-[1.5px] border-dashed border-blue-500 bg-blue-50 mb-4"
              >
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-sm font-bold text-blue-600">Add Item</span>
              </button>

              {/* Order summary */}
              {orderItems.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <p className="text-sm font-extrabold text-gray-900 mb-3">Order Summary</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-[13px] text-gray-500">Subtotal</span>
                      <span className="text-[13px] font-semibold text-gray-900">{formatCurrency(orderItems.reduce((s, i) => s + (i.subtotal || 0), 0), { full: true })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[13px] text-gray-500">GST</span>
                      <span className="text-[13px] font-semibold text-gray-900">{formatCurrency(orderItems.reduce((s, i) => s + (i.gst_amount || 0), 0), { full: true })}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-2 mt-2">
                      <span className="text-sm font-bold text-gray-900">Total</span>
                      <span className="text-[15px] font-extrabold text-blue-600">{formatCurrency(orderItems.reduce((s, i) => s + (i.total_price || 0), 0), { full: true })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div className="px-4 pt-4 pb-44 space-y-4">

              {/* Order Details card */}
              <div>
                <p className="text-sm font-extrabold text-gray-900 mb-2.5">Order Details</p>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                  {/* Delivery Date */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-900 mb-1.5 block">Expected Delivery Date <span className="text-red-500">*</span></label>
                    <input type="date" value={orderDetails.expectedDelivery} min={new Date().toISOString().split('T')[0]}
                      onChange={e => setOrderDetails(p => ({ ...p, expectedDelivery: e.target.value }))}
                      className="w-full h-[46px] px-[13px] rounded-[10px] border border-gray-200 bg-gray-50 text-[15px] text-gray-900 outline-none focus:border-blue-400" />
                  </div>
                  {/* Advance Paid */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-900 mb-1.5 block">
                      Advance Paid (₹) <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="flex items-center h-[46px] px-[13px] rounded-[10px] border border-gray-200 bg-gray-50 gap-1">
                      <span className="text-gray-400 text-[15px]">₹</span>
                      <input type="number" placeholder="0.00"
                        value={orderDetails.paidAmount > 0 ? orderDetails.paidAmount : ''}
                        onChange={e => setOrderDetails(p => ({ ...p, paidAmount: parseFloat(e.target.value) || 0 }))}
                        className="flex-1 bg-transparent text-[15px] text-gray-900 outline-none" />
                    </div>
                  </div>
                  {/* PI Number */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-900 mb-1.5 block">
                      PI Number <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input type="text" placeholder="PI-001" value={orderDetails.piNumber}
                      onChange={e => setOrderDetails(p => ({ ...p, piNumber: e.target.value }))}
                      className="w-full h-[46px] px-[13px] rounded-[10px] border border-gray-200 bg-gray-50 text-[15px] outline-none focus:border-blue-400" />
                  </div>
                  {/* Notes */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-900 mb-1.5 block">
                      Notes <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea rows={3} placeholder="Special instructions or notes…" value={orderDetails.notes}
                      onChange={e => setOrderDetails(p => ({ ...p, notes: e.target.value }))}
                      className="w-full px-[13px] pt-2.5 rounded-[10px] border border-gray-200 bg-gray-50 text-[15px] outline-none focus:border-blue-400 resize-none" />
                  </div>
                </div>
              </div>

              {/* Delivery Address card */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-extrabold text-gray-900">Delivery Address</p>
                  {!orderDeliveryAddress && selectedCustomer && (
                    <button onClick={handleUseCustomerAddress} className="text-xs font-bold text-blue-600">Use customer's</button>
                  )}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  {orderDeliveryAddress ? (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-900 flex-1">{[orderDeliveryAddress.address, orderDeliveryAddress.city, orderDeliveryAddress.state, orderDeliveryAddress.pincode].filter(Boolean).join(', ')}</p>
                      <button onClick={() => setShowAddressEditor(true)} className="flex-shrink-0 p-1">
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddressEditor(true)}
                      className="w-full h-11 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4" /> Set delivery address
                    </button>
                  )}
                </div>
              </div>

              {/* Transport card */}
              <div>
                <p className="text-sm font-extrabold text-gray-900 mb-2.5">Transport</p>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                  {/* Truck picker */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-900 mb-1.5 block">Select Vehicle <span className="text-gray-400 font-normal">(optional)</span></label>
                    <Select value={selectedTransportId} onValueChange={v => {
                      if (v === '__new__') { setAddingNewTruck(true); setSelectedTransportId(''); }
                      else { const t = savedTransports.find(x => x.id === v); if (t) selectTruck(t); }
                    }}>
                      <SelectTrigger className="h-[46px] text-[14px] rounded-[10px] border-gray-200 bg-gray-50">
                        <SelectValue placeholder="Choose a saved vehicle…" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTransports.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="font-semibold">{t.vehicle_no}</span>
                            {t.driver_name && <span className="text-gray-400 ml-1">— {t.driver_name}</span>}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__"><span className="text-primary-600 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Add New Vehicle</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Inline add new truck */}
                  {addingNewTruck && (
                    <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-orange-700">New Vehicle</p>
                      <input type="text" placeholder="Vehicle No e.g. MH12AB1234" value={newTruckNo}
                        onChange={e => setNewTruckNo(e.target.value.toUpperCase())}
                        className="w-full h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm outline-none focus:border-orange-400" />
                      <div className="flex gap-2">
                        {(['own', 'outside', 'hired'] as const).map(t => (
                          <button key={t} onClick={() => setNewTruckType(t)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${newTruckType === t ? 'border-orange-500 bg-orange-100 text-orange-700' : 'border-gray-200 text-gray-500'}`}>
                            {t === 'own' ? 'Own' : t === 'outside' ? 'Outside' : 'Hired'}
                          </button>
                        ))}
                      </div>
                      {/* Capacity */}
                      <div className="flex gap-2">
                        <input type="number" min="0" placeholder="Capacity" value={newTruckCapacityValue}
                          onChange={e => setNewTruckCapacityValue(e.target.value)}
                          className="w-24 h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm outline-none focus:border-orange-400" />
                        <Select value={newTruckCapacityUnit || '__placeholder__'} onValueChange={v => {
                          if (v === '__add_new__') setAddingCapacityUnit(true);
                          else if (v !== '__placeholder__') { setNewTruckCapacityUnit(v); setAddingCapacityUnit(false); }
                        }}>
                          <SelectTrigger className="flex-1 h-10 text-sm bg-white border-orange-200">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {capacityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            <SelectItem value="__add_new__"><span className="text-primary-600 font-semibold">+ Add Unit</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {addingCapacityUnit && (
                        <div className="flex gap-2">
                          <input placeholder="e.g. tonnes, bags" value={newCapacityUnitValue}
                            onChange={e => setNewCapacityUnitValue(e.target.value)}
                            className="flex-1 h-9 px-3 rounded-lg border border-orange-200 bg-white text-sm outline-none" />
                          <button onClick={handleAddCapacityUnit} disabled={savingCapacityUnit || !newCapacityUnitValue.trim()}
                            className="px-3 h-9 rounded-lg bg-primary-600 text-white text-xs font-bold disabled:opacity-50">
                            {savingCapacityUnit ? '…' : 'Add'}
                          </button>
                          <button onClick={() => { setAddingCapacityUnit(false); setNewCapacityUnitValue(''); }}
                            className="px-2 h-9 rounded-lg text-gray-500 text-xs">×</button>
                        </div>
                      )}
                      {/* Driver */}
                      <div className="flex gap-2">
                        <input placeholder="Driver name" value={newTruckDriverName}
                          onChange={e => setNewTruckDriverName(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm outline-none focus:border-orange-400" />
                        <input placeholder="Phone" value={newTruckDriverContact}
                          onChange={e => setNewTruckDriverContact(e.target.value)}
                          className="flex-1 h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm outline-none focus:border-orange-400" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setAddingNewTruck(false); setNewTruckNo(''); setNewTruckDriverName(''); setNewTruckDriverContact(''); setNewTruckCapacityValue(''); setNewTruckCapacityUnit(''); setAddingCapacityUnit(false); }}
                          className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-500">Cancel</button>
                        <button onClick={handleSaveNewTruck} disabled={savingNewTruck || !newTruckNo.trim()}
                          className="flex-[2] py-2 rounded-lg bg-orange-500 text-white text-sm font-bold disabled:opacity-50">
                          {savingNewTruck ? 'Saving…' : 'Save & Select'}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Selected truck info */}
                  {selectedTransportId && !addingNewTruck && (() => {
                    const t = savedTransports.find(x => x.id === selectedTransportId);
                    if (!t) return null;
                    return (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between"><span>Type</span><span className="font-semibold text-gray-700">{t.vehicle_type === 'own' ? 'Own' : t.vehicle_type === 'outside' ? 'Outside' : 'Hired'} Transport</span></div>
                        {t.driver_name && <div className="flex justify-between"><span>Driver</span><span className="font-semibold text-gray-700">{t.driver_name}{t.driver_contact ? ` · ${t.driver_contact}` : ''}</span></div>}
                        {t.capacity_value != null && <div className="flex justify-between"><span>Capacity</span><span className="font-semibold text-gray-700">{t.capacity_value}{t.capacity_unit ? ` ${t.capacity_unit}` : ''}</span></div>}
                      </div>
                    );
                  })()}
                  {/* Remark */}
                  <div>
                    <label className="text-[13px] font-semibold text-gray-900 mb-1.5 block">
                      Remark <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input type="text" placeholder="Any notes about transport…" value={transportRemark}
                      onChange={e => setTransportRemark(e.target.value)}
                      className="w-full h-[46px] px-[13px] rounded-[10px] border border-gray-200 bg-gray-50 text-[15px] outline-none focus:border-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="px-4 pt-4 pb-44 space-y-3">
              <p className="text-sm font-extrabold text-gray-900 mb-1">Review Order</p>

              {/* Customer */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11.5px] font-bold text-gray-400 uppercase tracking-widest">Customer</span>
                  <button onClick={() => setStep(0)} className="text-xs font-bold text-blue-600">Change</button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-extrabold text-base">{selectedCustomer?.name?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedCustomer?.name || '—'}</p>
                    {selectedCustomer?.phone && <p className="text-xs text-gray-500 mt-0.5">{selectedCustomer.phone}</p>}
                    {selectedCustomer?.city && <p className="text-[11px] text-gray-400">{[selectedCustomer.city, selectedCustomer.state].filter(Boolean).join(', ')}</p>}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11.5px] font-bold text-gray-400 uppercase tracking-widest">Items ({orderItems.length})</span>
                  <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-600">Edit</button>
                </div>
                <div className="space-y-0">
                  {orderItems.map((item, idx) => {
                    const pricingLbl = item.pricing_unit === 'unit' ? (item.unit || 'unit') : (item.pricing_unit || 'unit');
                    return (
                      <div key={item.id} className={`py-2.5 ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                        <div className="flex justify-between gap-2">
                          <p className="text-[13.5px] font-bold text-gray-900 truncate flex-1">{item.product_name || '—'}</p>
                          <p className="text-[13.5px] font-extrabold text-gray-900 flex-shrink-0">{formatCurrency(item.total_price || 0, { full: true })}</p>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {item.quantity} {item.unit} · {pricingLbl} @ {formatCurrency(item.unit_price || 0, { full: true })}
                          {item.gst_included && item.gst_rate ? ` + GST ${item.gst_rate}%` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11.5px] font-bold text-gray-400 uppercase tracking-widest">Details</span>
                  <button onClick={() => setStep(2)} className="text-xs font-bold text-blue-600">Edit</button>
                </div>
                <div className="space-y-1.5">
                  {orderDetails.expectedDelivery && (
                    <div className="flex justify-between">
                      <span className="text-[12.5px] text-gray-500">Delivery Date</span>
                      <span className="text-[12.5px] font-semibold text-gray-900">{formatIndianDate(orderDetails.expectedDelivery)}</span>
                    </div>
                  )}
                  {transportType && (
                    <div className="flex justify-between">
                      <span className="text-[12.5px] text-gray-500">Transport</span>
                      <span className="text-[12.5px] font-semibold text-gray-900 capitalize">{transportType}</span>
                    </div>
                  )}
                  {transportVehicleNo && (
                    <div className="flex justify-between">
                      <span className="text-[12.5px] text-gray-500">Vehicle No</span>
                      <span className="text-[12.5px] font-semibold text-gray-900">{transportVehicleNo}</span>
                    </div>
                  )}
                  {orderDeliveryAddress?.city && (
                    <div className="flex justify-between">
                      <span className="text-[12.5px] text-gray-500">Ship to</span>
                      <span className="text-[12.5px] font-semibold text-gray-900">{[orderDeliveryAddress.city, orderDeliveryAddress.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {orderDetails.piNumber && (
                    <div className="flex justify-between">
                      <span className="text-[12.5px] text-gray-500">PI Number</span>
                      <span className="text-[12.5px] font-semibold text-gray-900">{orderDetails.piNumber}</span>
                    </div>
                  )}
                  {orderDetails.notes && (
                    <div>
                      <p className="text-[12.5px] text-gray-500 mb-0.5">Notes</p>
                      <p className="text-[12.5px] text-gray-900">{orderDetails.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Total — green card like RN app */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-[11.5px] font-bold text-gray-400 uppercase tracking-widest mb-3">Order Total</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[13px] text-gray-500">Subtotal</span>
                    <span className="text-[13px] font-semibold text-gray-900">{formatCurrency(subtotal, { full: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-gray-500">GST</span>
                    <span className="text-[13px] font-semibold text-gray-900">{formatCurrency(gstAmount, { full: true })}</span>
                  </div>
                  {(orderDetails.paidAmount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[13px] text-green-700">Advance Paid</span>
                      <span className="text-[13px] font-semibold text-green-700">-{formatCurrency(orderDetails.paidAmount || 0, { full: true })}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-green-200 pt-2 mt-1">
                    <span className="text-[15px] font-extrabold text-green-800">Total</span>
                    <span className="text-base font-extrabold text-green-800">{formatCurrency(total, { full: true })}</span>
                  </div>
                  {(orderDetails.paidAmount || 0) > 0 && (
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[13px] text-amber-600">Balance Due</span>
                      <span className="text-[13px] font-bold text-amber-600">{formatCurrency(Math.max(0, total - (orderDetails.paidAmount || 0)), { full: true })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile fixed footer nav */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 z-30 lg:hidden">
          {step === 0 && showNewCustomerForm ? (
            <>
              <button onClick={() => setShowNewCustomerForm(false)}
                className="h-[52px] px-5 rounded-[10px] border border-gray-200 bg-white text-[15px] font-semibold text-gray-700">
                Cancel
              </button>
              <button onClick={() => customerFormSubmitRef.current?.()}
                className="flex-1 h-[52px] rounded-[10px] bg-blue-600 text-white text-[15px] font-semibold flex items-center justify-center gap-2">
                Save Customer
              </button>
            </>
          ) : (
            <>
              {step > 0 && (
                <button onClick={handleBack}
                  className="h-[52px] px-5 rounded-[10px] border border-gray-200 bg-white text-[15px] font-semibold text-gray-700 flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => {
                    if (step === 0 && selectedCustomer) setStep(1);
                    else if (step === 1 && canGoNextFromItems) setStep(2);
                    else if (step === 2 && orderDetails.expectedDelivery) setStep(3);
                  }}
                  disabled={
                    (step === 0 && !selectedCustomer) ||
                    (step === 1 && !canGoNextFromItems) ||
                    (step === 2 && !orderDetails.expectedDelivery)
                  }
                  className="flex-1 h-[52px] rounded-[10px] bg-blue-600 text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {step === 0 ? 'Continue' : step === 1 ? 'Next: Details' : 'Review Order'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="flex-1 h-[52px] rounded-[10px] bg-green-600 text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Placing Order…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Place Order</>
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Mobile dialogs */}
        <ProductMaterialSelectionDialog
          isOpen={showProductSearch}
          onClose={() => { setShowProductSearch(false); setProductSearchTerm(''); setProductPage(1); setMaterialPage(1); }}
          currentItem={currentOrderItem}
          products={realProducts}
          materials={rawMaterials}
          productSearchTerm={productSearchTerm}
          onSearchChange={setProductSearchTerm}
          onSelectProduct={(productId) => {
            if (currentOrderItem) { updateOrderItem(currentOrderItem.id, 'product_id', productId); setShowProductSearch(false); setProductSearchTerm(''); }
          }}
          productPage={productPage}
          materialPage={materialPage}
          productItemsPerPage={productItemsPerPage}
          materialItemsPerPage={materialItemsPerPage}
          onProductPageChange={setProductPage}
          onMaterialPageChange={setMaterialPage}
          productSortBy={productSortBy}
          productSortOrder={productSortOrder}
          materialSortBy={materialSortBy}
          materialSortOrder={materialSortOrder}
          onProductSortChange={(s, o) => { setProductSortBy(s); setProductSortOrder(o); setProductPage(1); }}
          onMaterialSortChange={(s, o) => { setMaterialSortBy(s); setMaterialSortOrder(o); setMaterialPage(1); }}
        />
        <DeliveryAddressDialog isOpen={showAddressEditor} onClose={() => setShowAddressEditor(false)} address={orderDeliveryAddress}
          onSave={addr => { setOrderDeliveryAddress(addr); setShowAddressEditor(false); }} />
      </div>

      {/* ════════════════════════════════════════════════════════════
          DESKTOP WIZARD — unchanged
      ════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-5xl mx-auto" style={{ height: 'calc(100dvh - 100px)' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {step === 0 ? 'Orders' : 'Back'}
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">New Order</h1>
          </div>

          <StepperBars current={step} />

          <div className="flex items-center gap-2 justify-end">
            {draftSavedAt && (
              <div className="flex items-center gap-1 text-[10.5px] text-slate-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Draft saved
              </div>
            )}
            {selectedCustomer ? (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="truncate max-w-[130px]">{selectedCustomer.name}</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">No customer</span>
            )}
          </div>
        </div>

        {/* Draft banner */}
        {showDraftBanner && <DraftBanner step={step} onDismiss={() => setShowDraftBanner(false)} />}

        {/* ══════════════════════════════════════════
            STEP 0 — Customer
        ══════════════════════════════════════════ */}
        {step === 0 && (
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
            {/* Tab toggle + search inline */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setShowNewCustomerForm(false)}
                  className="px-3 h-8 rounded-md text-[12px] font-semibold transition-all"
                  style={!showNewCustomerForm
                    ? { background: '#fff', color: '#1d4ed8', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }
                    : { color: '#64748b' }}
                >
                  Existing customer
                </button>
                <button
                  onClick={() => setShowNewCustomerForm(true)}
                  className="px-3 h-8 rounded-md text-[12px] font-semibold transition-all"
                  style={showNewCustomerForm
                    ? { background: '#fff', color: '#1d4ed8', boxShadow: '0 1px 2px rgba(0,0,0,.06)' }
                    : { color: '#64748b' }}
                >
                  New customer
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {!showNewCustomerForm ? (
                <CustomerSelection
                  customers={customers}
                  customersLoading={customersLoading}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={handleCustomerSelected}
                  showToggleButtons={false}
                />
              ) : (
                <CustomerForm
                  onCustomerCreated={handleCustomerCreated}
                  onCancel={() => setShowNewCustomerForm(false)}
                  showCard={false}
                />
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 1 — Items
        ══════════════════════════════════════════ */}
        {step === 1 && (
          <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <OrderItemsList
                items={orderItems}
                onAddItem={addOrderItem}
                onUpdateItem={updateOrderItem}
                onRemoveItem={removeOrderItem}
                onSelectProduct={(item) => { setCurrentOrderItem(item); setShowProductSearch(true); }}
                products={realProducts}
                rawMaterials={rawMaterials}
              />
            </div>
            <FooterNav
              onBack={handleBack}
              onNext={() => setStep(2)}
              nextLabel="Next: Details"
              nextDisabled={!canGoNextFromItems}
              hint={!canGoNextFromItems ? (orderItems.length === 0 ? 'Add at least one item to continue' : 'Complete all item details to continue') : undefined}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 2 — Details + Address + Transport
        ══════════════════════════════════════════ */}
        {step === 2 && (
          <div className="flex-1 min-h-0 flex flex-col">

            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {/* 2-column layout: left = order details + address, right = transport */}
              <div className="grid grid-cols-2 gap-4 h-full min-h-0">

                {/* LEFT column */}
                <div className="flex flex-col gap-4">
                  {/* Order details card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 pb-1 border-b border-slate-100">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="16" y1="3" x2="16" y2="7" /></svg>
                      <span className="text-sm font-semibold text-slate-700">Order details</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Delivery date <span className="text-red-500">*</span></Label>
                        <Input
                          type="date"
                          value={orderDetails.expectedDelivery}
                          onChange={e => setOrderDetails(p => ({ ...p, expectedDelivery: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                          className="h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Advance paid (₹)</Label>
                        <Input
                          type="number"
                          value={orderDetails.paidAmount > 0 ? orderDetails.paidAmount : ''}
                          placeholder="0"
                          onChange={e => {
                            const v = validateNumberInput(e.target.value, ValidationPresets.PRICE);
                            const n = parseFloat(v.value) || 0;
                            if (total && n > total) { toast({ title: 'Invalid amount', description: `Cannot exceed ${formatCurrency(total, { full: true })}`, variant: 'destructive' }); return; }
                            setOrderDetails(p => ({ ...p, paidAmount: n }));
                          }}
                          onKeyDown={preventInvalidNumberKeys}
                          min="0" step="0.01"
                          className="h-10 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">PI Number</Label>
                      <Input
                        value={orderDetails.piNumber}
                        onChange={e => setOrderDetails(p => ({ ...p, piNumber: e.target.value }))}
                        placeholder="Proforma Invoice number (e.g. PI-2024-001)"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-gray-400" /> Notes
                      </Label>
                      <Textarea
                        value={orderDetails.notes}
                        onChange={e => setOrderDetails(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Special instructions, notes for delivery…"
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Invoice remarks</Label>
                      <Textarea
                        value={orderDetails.remarks}
                        onChange={e => setOrderDetails(p => ({ ...p, remarks: e.target.value }))}
                        placeholder="Will appear on the invoice…"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>

                  {/* Delivery address card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-sm font-semibold text-slate-700">Delivery address</span>
                      </div>
                      {!orderDeliveryAddress && selectedCustomer && (
                        <button onClick={handleUseCustomerAddress} className="text-sm font-medium text-primary-600 hover:underline">
                          Use customer's address
                        </button>
                      )}
                    </div>
                    {orderDeliveryAddress ? (
                      <div className="flex items-start justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 leading-relaxed">
                          {[orderDeliveryAddress.address, orderDeliveryAddress.city, orderDeliveryAddress.state, orderDeliveryAddress.pincode].filter(Boolean).join(', ')}
                        </p>
                        <button onClick={() => setShowAddressEditor(true)} className="flex-shrink-0 text-green-700 hover:text-green-900 mt-0.5">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddressEditor(true)}
                        className="w-full h-10 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Set custom delivery address
                      </button>
                    )}
                  </div>
                </div>

                {/* RIGHT column — Transport */}
                <div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 pb-1 border-b border-slate-100">
                      <Truck className="w-3.5 h-3.5" />
                      <span className="text-sm font-semibold text-slate-700">Transport info</span>
                    </div>
                    {/* Truck picker */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Select Vehicle</Label>
                      <Select value={selectedTransportId} onValueChange={v => {
                        if (v === '__new__') { setAddingNewTruck(true); setSelectedTransportId(''); }
                        else { const t = savedTransports.find(x => x.id === v); if (t) selectTruck(t); }
                      }}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Choose a saved vehicle…" />
                        </SelectTrigger>
                        <SelectContent>
                          {savedTransports.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="font-semibold">{t.vehicle_no}</span>
                              {t.driver_name && <span className="text-gray-400 ml-1">— {t.driver_name}</span>}
                              {t.capacity_value != null && <span className="text-gray-400 ml-1">({t.capacity_value}{t.capacity_unit ? ` ${t.capacity_unit}` : ''})</span>}
                            </SelectItem>
                          ))}
                          <SelectItem value="__new__">
                            <span className="text-primary-600 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Add New Vehicle</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Inline add new truck */}
                    {addingNewTruck && (
                      <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2.5">
                        <p className="text-xs font-bold text-orange-700">New Vehicle</p>
                        <Input placeholder="Vehicle No e.g. MH12AB1234" value={newTruckNo}
                          onChange={e => setNewTruckNo(e.target.value.toUpperCase())} className="h-9 text-sm bg-white border-orange-200" />
                        <div className="flex gap-2">
                          {(['own', 'outside', 'hired'] as const).map(t => (
                            <button key={t} onClick={() => setNewTruckType(t)}
                              className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${newTruckType === t ? 'border-orange-500 bg-orange-100 text-orange-700' : 'border-gray-200 text-gray-500 bg-white'}`}>
                              {t === 'own' ? 'Own' : t === 'outside' ? 'Outside' : 'Hired'}
                            </button>
                          ))}
                        </div>
                        {/* Capacity */}
                        <div className="flex gap-2">
                          <Input type="number" min="0" placeholder="Capacity" value={newTruckCapacityValue}
                            onChange={e => setNewTruckCapacityValue(e.target.value)}
                            className="w-28 h-9 text-sm bg-white border-orange-200" />
                          <Select value={newTruckCapacityUnit || '__placeholder__'} onValueChange={v => {
                            if (v === '__add_new__') setAddingCapacityUnit(true);
                            else if (v !== '__placeholder__') { setNewTruckCapacityUnit(v); setAddingCapacityUnit(false); }
                          }}>
                            <SelectTrigger className="flex-1 h-9 text-sm bg-white border-orange-200">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {capacityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              <SelectItem value="__add_new__"><span className="text-primary-600 font-semibold">+ Add Unit</span></SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {addingCapacityUnit && (
                          <div className="flex gap-2">
                            <Input placeholder="e.g. tonnes, bags" value={newCapacityUnitValue}
                              onChange={e => setNewCapacityUnitValue(e.target.value)}
                              className="flex-1 h-8 text-sm bg-white" />
                            <button onClick={handleAddCapacityUnit} disabled={savingCapacityUnit || !newCapacityUnitValue.trim()}
                              className="px-3 h-8 rounded-lg bg-primary-600 text-white text-xs font-bold disabled:opacity-50">
                              {savingCapacityUnit ? '…' : 'Add'}
                            </button>
                            <button onClick={() => { setAddingCapacityUnit(false); setNewCapacityUnitValue(''); }}
                              className="px-2 h-8 text-gray-400 text-sm">×</button>
                          </div>
                        )}
                        {/* Driver */}
                        <div className="flex gap-2">
                          <Input placeholder="Driver name" value={newTruckDriverName}
                            onChange={e => setNewTruckDriverName(e.target.value)}
                            className="flex-1 h-9 text-sm bg-white border-orange-200" />
                          <Input placeholder="Phone" value={newTruckDriverContact}
                            onChange={e => setNewTruckDriverContact(e.target.value)}
                            className="flex-1 h-9 text-sm bg-white border-orange-200" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setAddingNewTruck(false); setNewTruckNo(''); setNewTruckDriverName(''); setNewTruckDriverContact(''); setNewTruckCapacityValue(''); setNewTruckCapacityUnit(''); setAddingCapacityUnit(false); }}
                            className="flex-1 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-500 bg-white">Cancel</button>
                          <button onClick={handleSaveNewTruck} disabled={savingNewTruck || !newTruckNo.trim()}
                            className="flex-[2] py-1.5 rounded-lg bg-orange-500 text-white text-sm font-bold disabled:opacity-50">
                            {savingNewTruck ? 'Saving…' : 'Save & Select'}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Selected truck info */}
                    {selectedTransportId && !addingNewTruck && (() => {
                      const t = savedTransports.find(x => x.id === selectedTransportId);
                      if (!t) return null;
                      return (
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                          <div className="flex justify-between"><span>Type</span><span className="font-semibold text-gray-700">{t.vehicle_type === 'own' ? 'Own' : t.vehicle_type === 'outside' ? 'Outside' : 'Hired'} Transport</span></div>
                          {t.driver_name && <div className="flex justify-between"><span>Driver</span><span className="font-semibold text-gray-700">{t.driver_name}{t.driver_contact ? ` · ${t.driver_contact}` : ''}</span></div>}
                          {t.capacity_value != null && <div className="flex justify-between"><span>Capacity</span><span className="font-semibold text-gray-700">{t.capacity_value}{t.capacity_unit ? ` ${t.capacity_unit}` : ''}</span></div>}
                        </div>
                      );
                    })()}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium text-gray-700">Remark <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
                      <Input placeholder="Optional note about transport" value={transportRemark} onChange={e => setTransportRemark(e.target.value)} className="h-10 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <FooterNav
              onBack={handleBack}
              onNext={() => setStep(3)}
              nextLabel="Review order"
              nextDisabled={!orderDetails.expectedDelivery}
              hint={!orderDetails.expectedDelivery ? 'Set delivery date to continue' : undefined}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════
            STEP 3 — Review & Submit
        ══════════════════════════════════════════ */}
        {step === 3 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">

              {/* ── Customer row ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</span>
                  <button onClick={() => setStep(0)} className="text-xs font-medium text-primary-600 hover:underline">Change</button>
                </div>
                <div className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr] gap-3 px-3 h-8 items-center bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">City</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_1fr] gap-3 px-3 py-2.5 items-center">
                  <span className="text-sm font-semibold text-slate-900 truncate">{selectedCustomer?.name || '—'}</span>
                  <span className="text-sm text-slate-700 tabular-nums">{selectedCustomer?.phone || '—'}</span>
                  <span className="text-sm text-slate-600 font-mono truncate">{selectedCustomer?.gst_number || '—'}</span>
                  <span className="text-sm text-slate-700 truncate">{[selectedCustomer?.city, selectedCustomer?.state].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>

              {/* ── Items table ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{orderItems.length} item{orderItems.length !== 1 ? 's' : ''}</span>
                  <button onClick={() => setStep(1)} className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                </div>
                <div className="grid grid-cols-[24px_minmax(0,1fr)_80px_96px_90px] gap-3 items-center px-3 h-8 border-b border-slate-200">
                  <span />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Qty</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Rate</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</span>
                </div>
                {orderItems.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)_80px_96px_90px] gap-3 items-center px-3 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs font-bold text-slate-500 w-5 h-5 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <span className="text-sm font-medium text-slate-800 truncate">{item.product_name || '—'}</span>
                    <span className="text-sm text-slate-700 text-right tabular-nums">{item.quantity} {item.unit}</span>
                    <span className="text-sm text-slate-700 text-right tabular-nums">{formatCurrency(item.unit_price || 0, { full: true })}</span>
                    <span className="text-sm font-semibold text-primary-600 text-right tabular-nums">{formatCurrency(item.total_price || 0, { full: true })}</span>
                  </div>
                ))}
              </div>

              {/* ── Order details row ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 h-8 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Order details</span>
                  <button onClick={() => setStep(2)} className="text-xs font-medium text-primary-600 hover:underline">Edit</button>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-100">
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Delivery date</p>
                    <p className="text-sm text-slate-800 font-medium">{orderDetails.expectedDelivery ? formatIndianDate(orderDetails.expectedDelivery) : '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Transport</p>
                    <p className="text-sm text-slate-800 font-medium capitalize">{transportType ? `${transportType}${transportVehicleNo ? ` · ${transportVehicleNo}` : ''}` : '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Ship to</p>
                    <p className="text-sm text-slate-800 font-medium truncate">{orderDeliveryAddress?.city ? `${orderDeliveryAddress.city}, ${orderDeliveryAddress.state}` : '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PI Number</p>
                    <p className="text-sm text-slate-800 font-medium truncate">{orderDetails.piNumber || '—'}</p>
                  </div>
                </div>
              </div>

              {/* ── Totals + Paid ── */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr] divide-x divide-slate-100 border-b border-slate-100">
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subtotal</p>
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(subtotal, { full: true })}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">GST</p>
                    <p className="text-sm font-semibold text-slate-800 tabular-nums">{formatCurrency(gstAmount, { full: true })}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Advance paid</p>
                    <p className="text-sm font-semibold text-emerald-700 tabular-nums">{formatCurrency(orderDetails.paidAmount || 0, { full: true })}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Balance due</p>
                    <p className="text-sm font-semibold text-amber-700 tabular-nums">{formatCurrency(Math.max(0, total - (orderDetails.paidAmount || 0)), { full: true })}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-primary-50">
                  <span className="text-sm font-semibold text-primary-700 uppercase tracking-wide">Order Total</span>
                  <span className="text-xl font-bold text-primary-700 tabular-nums">{formatCurrency(total, { full: true })}</span>
                </div>
              </div>

            </div>

            <FooterNav
              onBack={handleBack}
              onNext={handleSubmit}
              nextLabel={isSubmitting ? 'Placing order…' : 'Place order'}
              nextDisabled={isSubmitting || !canGoNextFromItems}
            />
          </div>
        )}

        {/* Dialogs */}
        <ProductMaterialSelectionDialog
          isOpen={showProductSearch}
          onClose={() => { setShowProductSearch(false); setProductSearchTerm(''); setProductPage(1); setMaterialPage(1); }}
          currentItem={currentOrderItem}
          products={realProducts}
          materials={rawMaterials}
          productSearchTerm={productSearchTerm}
          onSearchChange={setProductSearchTerm}
          onSelectProduct={(productId) => {
            if (currentOrderItem) {
              updateOrderItem(currentOrderItem.id, 'product_id', productId);
              setShowProductSearch(false); setProductSearchTerm(''); setProductCategoryFilter('all'); setProductColorFilter('all');
            }
          }}
          productPage={productPage}
          materialPage={materialPage}
          productItemsPerPage={productItemsPerPage}
          materialItemsPerPage={materialItemsPerPage}
          onProductPageChange={setProductPage}
          onMaterialPageChange={setMaterialPage}
          productSortBy={productSortBy}
          productSortOrder={productSortOrder}
          materialSortBy={materialSortBy}
          materialSortOrder={materialSortOrder}
          onProductSortChange={(s, o) => { setProductSortBy(s); setProductSortOrder(o); setProductPage(1); }}
          onMaterialSortChange={(s, o) => { setMaterialSortBy(s); setMaterialSortOrder(o); setMaterialPage(1); }}
        />

        <DeliveryAddressDialog
          isOpen={showAddressEditor}
          onClose={() => setShowAddressEditor(false)}
          address={orderDeliveryAddress}
          onSave={addr => { setOrderDeliveryAddress(addr); setShowAddressEditor(false); }}
        />
      </div>
    </Layout>
  );
}
