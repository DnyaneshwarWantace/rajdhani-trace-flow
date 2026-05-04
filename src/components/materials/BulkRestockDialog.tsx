import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Package, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { RawMaterial } from '@/types/material';
import type { Supplier } from '@/services/supplierService';
import { getApiUrl } from '@/utils/apiConfig';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

interface BulkRestockItem {
  material_id: string;
  material_name: string;
  unit: string;
  quantity: string;
  cost_per_unit: string;
  current_stock: number;
}

interface BulkRestockDialogProps {
  materials: RawMaterial[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

// Inline searchable material picker
function MaterialSearchInput({
  materials,
  value,
  onChange,
  invoiceSupplier,
  alreadySelectedIds,
}: {
  materials: RawMaterial[];
  value: string;
  onChange: (id: string) => void;
  invoiceSupplier: string;
  alreadySelectedIds: string[];
}) {
  const selected = materials.find(m => m.id === value);
  const [query, setQuery] = useState(selected?.name || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(selected?.name || ''); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(selected?.name || '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected]);

  const filtered = materials.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(query.toLowerCase()) ||
    (m.type || '').toLowerCase().includes(query.toLowerCase()) ||
    (m.color || '').toLowerCase().includes(query.toLowerCase()) ||
    (m.supplier_name || '').toLowerCase().includes(query.toLowerCase())
  );

  const supplierNorm = invoiceSupplier.trim().toLowerCase();
  const fromSupplier = supplierNorm
    ? filtered.filter(m => (m.supplier_name || '').toLowerCase() === supplierNorm)
    : [];
  const others = supplierNorm
    ? filtered.filter(m => (m.supplier_name || '').toLowerCase() !== supplierNorm)
    : filtered;

  const handleSelect = (m: RawMaterial) => {
    if (alreadySelectedIds.includes(m.id)) return;
    onChange(m.id);
    setQuery(m.name);
    setOpen(false);
  };
  const handleClear = () => { onChange(''); setQuery(''); setOpen(false); };

  const selectedDifferentSupplier = selected && invoiceSupplier &&
    (selected.supplier_name || '').toLowerCase() !== invoiceSupplier.trim().toLowerCase();

  const renderRow = (m: RawMaterial) => {
    const isAlreadyAdded = alreadySelectedIds.includes(m.id);
    const details = [m.category, m.type].filter(Boolean).join(' · ');
    return (
      <button
        key={m.id}
        type="button"
        onMouseDown={e => { e.preventDefault(); handleSelect(m); }}
        disabled={isAlreadyAdded}
        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-50 last:border-0
          ${isAlreadyAdded ? 'opacity-40 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50'}
          ${m.id === value ? 'bg-primary-50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className={`font-medium ${m.id === value ? 'text-primary-700' : 'text-gray-900'}`}>{m.name}</span>
            {isAlreadyAdded && <span className="ml-2 text-xs text-gray-400">(already added)</span>}
            <div className="flex flex-wrap items-center gap-1 mt-0.5">
              {details && <span className="text-xs text-gray-400">{details}</span>}
              {m.unit && <span className="text-xs text-gray-400">· {m.unit}</span>}
              <ProductAttributePreview color={m.color} showPattern={false} compact className="inline-flex" />
            </div>
            {m.supplier_name && (
              <span className="text-xs text-gray-400">{m.supplier_name}</span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 pt-0.5">{m.current_stock} {m.unit}</span>
        </div>
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
        <Input
          className="pl-8 pr-8 bg-white"
          placeholder="Search material…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button type="button" className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600" onClick={handleClear}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {selectedDifferentSupplier && (
        <p className="text-xs text-amber-600 mt-1">
          Usually ordered from <span className="font-medium">{selected?.supplier_name}</span> — supplier will be updated to this invoice's supplier
        </p>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 px-3 py-2">No materials found</p>
          ) : (
            <>
              {fromSupplier.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-primary-600 bg-primary-50 border-b border-primary-100">
                    From {invoiceSupplier}
                  </div>
                  {fromSupplier.map(renderRow)}
                </>
              )}
              {others.length > 0 && (
                <>
                  {fromSupplier.length > 0 && (
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                      Other materials
                    </div>
                  )}
                  {others.map(renderRow)}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BulkRestockDialog({ materials, suppliers, onClose, onSuccess }: BulkRestockDialogProps) {
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BulkRestockItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function emptyItem(): BulkRestockItem {
    return { material_id: '', material_name: '', unit: '', quantity: '', cost_per_unit: '', current_stock: 0 };
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof BulkRestockItem, value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'material_id') {
        const mat = materials.find(m => m.id === value);
        return {
          ...item,
          material_id: value,
          material_name: mat?.name || '',
          unit: mat?.unit || '',
          current_stock: mat?.current_stock ?? 0,
          cost_per_unit: mat?.cost_per_unit != null && mat.cost_per_unit > 0 ? String(mat.cost_per_unit) : item.cost_per_unit,
        };
      }
      return { ...item, [field]: value };
    }));
  };

  const totalCost = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.cost_per_unit) || 0);
  }, 0);

  const materialIds = items.map(i => i.material_id).filter(Boolean);
  const hasDuplicates = new Set(materialIds).size !== materialIds.length;

  const canSubmit =
    invoiceNumber.trim() &&
    items.length > 0 &&
    items.every(item => item.material_id && parseFloat(item.quantity) > 0 && parseFloat(item.cost_per_unit) > 0);

  const handleSubmit = async () => {
    setError('');
    if (hasDuplicates) { setError('Duplicate materials found. Each material can only appear once.'); return; }
    try {
      setSubmitting(true);
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/raw-materials/bulk-restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({
          supplier_name: supplier || undefined,
          invoice_number: invoiceNumber.trim(),
          notes: notes.trim() || undefined,
          items: items.map(item => ({
            material_id: item.material_id,
            quantity: parseFloat(item.quantity),
            cost_per_unit: parseFloat(item.cost_per_unit),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Bulk restock failed');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete restock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Bulk Restock
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">One invoice — multiple materials</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Supplier + Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Select value={supplier} onValueChange={setSupplier}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Number *</Label>
              <Input placeholder="Enter invoice / bill number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">Materials *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" /> Add Material
              </Button>
            </div>

            {items.map((item, idx) => {
              const isDuplicate = item.material_id && materialIds.filter(id => id === item.material_id).length > 1;
              return (
                <div key={idx} className={`border rounded-lg p-4 space-y-3 ${isDuplicate ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Item {idx + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Searchable material picker */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Material *</Label>
                    <MaterialSearchInput
                      materials={materials}
                      value={item.material_id}
                      onChange={v => updateItem(idx, 'material_id', v)}
                      invoiceSupplier={supplier}
                      alreadySelectedIds={items
                        .filter((_, i) => i !== idx)
                        .map(i => i.material_id)
                        .filter(Boolean)}
                    />
                    {isDuplicate && <p className="text-xs text-red-600">Duplicate — already added above</p>}
                  </div>

                  {/* Qty + Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Quantity *{item.unit ? ` (${item.unit})` : ''}</Label>
                      <Input
                        type="number" min="0.01" step="0.01" placeholder="0"
                        value={item.quantity}
                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      />
                      {item.material_id && (
                        <p className="text-xs text-gray-400">Current: {item.current_stock} {item.unit}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Price per {item.unit || 'unit'} (₹) *</Label>
                      <Input
                        type="number" min="0.01" step="0.01" placeholder="0.00"
                        value={item.cost_per_unit}
                        onChange={e => updateItem(idx, 'cost_per_unit', e.target.value)}
                      />
                      {item.quantity && item.cost_per_unit && parseFloat(item.quantity) > 0 && parseFloat(item.cost_per_unit) > 0 && (
                        <p className="text-xs text-green-700 font-medium">
                          = ₹{(parseFloat(item.quantity) * parseFloat(item.cost_per_unit)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <Textarea placeholder="Any additional notes for this restock" rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="resize-none" />
          </div>

          {/* Total */}
          {totalCost > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-semibold text-green-900">Total Invoice Value: ₹{totalCost.toFixed(2)}</div>
              <div className="text-xs text-green-700 mt-0.5">{items.filter(i => i.material_id && parseFloat(i.quantity) > 0).length} material(s)</div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary-600 hover:bg-primary-700 text-white"
            disabled={!canSubmit || hasDuplicates || submitting}
          >
            {submitting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restocking...</>
              : `Restock ${items.filter(i => i.material_id).length} Material(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
