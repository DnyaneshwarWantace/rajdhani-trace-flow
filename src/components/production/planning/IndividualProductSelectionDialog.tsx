import { formatIndianDate } from '@/utils/formatHelpers';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, CheckCircle, AlertCircle, X, Check, Loader2 } from 'lucide-react';
import { IndividualProductService } from '@/services/individualProductService';
import type { IndividualProduct } from '@/types/product';

interface IndividualProductSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
  requiredQuantity: number;
  preSelectedProductIds?: string[];
  onSelect: (selectedProducts: IndividualProduct[]) => void;
}

export default function IndividualProductSelectionDialog({
  isOpen,
  onClose,
  materialId,
  materialName,
  requiredQuantity,
  preSelectedProductIds = [],
  onSelect,
}: IndividualProductSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<IndividualProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isOpen && materialId) {
      loadIndividualProducts();
      setSelectedProducts(new Set(preSelectedProductIds));
    }
  }, [isOpen, materialId]);

  const loadIndividualProducts = async () => {
    try {
      setLoading(true);
      const { products: fetched } = await IndividualProductService.getIndividualProductsByProductId(
        materialId, { status: 'available', limit: 1000 }
      );
      setProducts(fetched || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const requiredCount = Math.ceil(requiredQuantity);

  const handleToggle = (id: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); }
      else if (next.size < requiredCount) { next.add(id); }
      return next;
    });
  };

  const handleSelectAll = () => {
    const filtered = getFiltered();
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.slice(0, requiredCount).map(p => p.id)));
    }
  };

  const handleConfirm = () => {
    onSelect(products.filter(p => selectedProducts.has(p.id)));
    onClose();
  };

  const getFiltered = () => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(p =>
      p.id.toLowerCase().includes(q) ||
      p.qr_code?.toLowerCase().includes(q) ||
      p.serial_number?.toLowerCase().includes(q) ||
      p.roll_number?.toLowerCase().includes(q) ||
      p.batch_number?.toLowerCase().includes(q)
    );
  };

  const filtered = getFiltered();
  const selectedCount = selectedProducts.size;

  // ── MOBILE FULL-SCREEN ──
  const mobileContent = isOpen ? (
    <div className="lg:hidden fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-gray-900">Select Rolls</p>
          <p className="text-[12px] text-gray-500 truncate">{materialName} · Need {requiredCount}</p>
        </div>
        <button onClick={onClose} className="ml-3 p-1">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Selection count bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0"
        style={{ backgroundColor: selectedCount > 0 ? '#EFF6FF' : '#F9FAFB' }}>
        <span className="text-[13px] font-semibold" style={{ color: selectedCount > 0 ? '#2563EB' : '#6B7280' }}>
          {selectedCount} selected{requiredCount > 0 ? ` / ${requiredCount} needed` : ''}
        </span>
        {selectedCount > 0 && (
          <button onClick={() => setSelectedProducts(new Set())}
            className="text-[12px] font-semibold text-red-500">
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-10">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 bg-transparent text-[13px] text-gray-900 outline-none placeholder-gray-400"
            placeholder="Search roll / batch / QR…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')}><X className="w-3.5 h-3.5 text-gray-400" /></button>}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-[13px] text-gray-400">No available rolls found</p>
          </div>
        ) : (
          <div className="pb-36">
            {filtered.map(p => {
              const isSelected = selectedProducts.has(p.id);
              return (
                <button key={p.id} onClick={() => handleToggle(p.id)}
                  className="w-full flex items-center px-4 py-3 border-b border-gray-100 text-left active:bg-gray-50">
                  {/* Checkbox */}
                  <div className="w-[22px] h-[22px] rounded-[5px] border-2 flex items-center justify-center mr-3 shrink-0"
                    style={{ borderColor: isSelected ? '#2563EB' : '#9CA3AF', backgroundColor: isSelected ? '#2563EB' : '#fff' }}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-gray-900 truncate">
                      {p.roll_number || p.qr_code || p.id.slice(-8)}
                    </p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {p.batch_number && <span className="text-[11px] text-gray-500">Batch: {p.batch_number}</span>}
                      {p.final_length && <span className="text-[11px] text-gray-500">{p.final_length}m</span>}
                      {p.final_width && <span className="text-[11px] text-gray-500">{p.final_width}m wide</span>}
                      {(p as any).final_weight && <span className="text-[11px] text-gray-500">{(p as any).final_weight}g</span>}
                      {p.serial_number && <span className="text-[11px] text-gray-500">SN: {p.serial_number}</span>}
                    </div>
                  </div>
                  {/* Available badge */}
                  <span className="ml-2 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0"
                    style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                    Available
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-6 space-y-2.5 shrink-0">
        <button onClick={handleConfirm} disabled={selectedCount === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold text-white transition-colors"
          style={{ backgroundColor: selectedCount === 0 ? '#9CA3AF' : '#2563EB' }}>
          <CheckCircle className="w-4 h-4" />
          Save Selection ({selectedCount})
        </button>
        <button onClick={onClose}
          className="w-full py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-500">
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {createPortal(mobileContent, document.body)}

      {/* Desktop Dialog */}
      <Dialog open={isOpen && !isMobile} onOpenChange={onClose}>
        <DialogContent customLayout className="max-w-4xl h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="flex-shrink-0 px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Select Individual Products
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Product: <span className="font-medium">{materialName}</span>
              </p>
            </DialogHeader>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div><p className="text-xs text-gray-600">Required</p><p className="text-lg font-bold text-gray-900">{requiredCount} rolls</p></div>
                  <div><p className="text-xs text-gray-600">Selected</p><p className={`text-lg font-bold ${selectedCount >= requiredCount ? 'text-green-600' : 'text-orange-600'}`}>{selectedCount} rolls</p></div>
                  <div><p className="text-xs text-gray-600">Available</p><p className="text-lg font-bold text-gray-900">{products.length} rolls</p></div>
                </div>
                {selectedCount >= requiredCount ? (
                  <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Sufficient</Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300"><AlertCircle className="w-3 h-3 mr-1" />Need {requiredCount - selectedCount} more</Badge>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="text" placeholder="Search by roll no, ID, QR code, serial number, or batch..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            {/* Select all */}
            <div className="flex items-center justify-between py-2 border-b mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filtered.length > 0 && selectedProducts.size === filtered.length} onCheckedChange={handleSelectAll} />
                <span className="text-sm font-medium">Select All ({filtered.length} products)</span>
              </label>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No available products found</p>
                {searchTerm && <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(product => {
                  const isSelected = selectedProducts.has(product.id);
                  return (
                    <div key={product.id} onClick={() => handleToggle(product.id)}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox checked={isSelected} onCheckedChange={() => handleToggle(product.id)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{product.id}</p>
                              {product.roll_number && <p className="text-sm text-gray-700">Roll No: <span className="font-mono">{product.roll_number}</span></p>}
                              {product.serial_number && <p className="text-sm text-gray-600">SN: {product.serial_number}</p>}
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 flex-shrink-0">Available</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
                            {product.qr_code && <div><span className="text-gray-500">QR Code:</span><span className="ml-1 font-medium">{product.qr_code}</span></div>}
                            {product.batch_number && <div><span className="text-gray-500">Batch:</span><span className="ml-1 font-medium">{product.batch_number}</span></div>}
                            {product.roll_number && <div><span className="text-gray-500">Roll No:</span><span className="ml-1 font-medium font-mono">{product.roll_number}</span></div>}
                            {product.location && <div><span className="text-gray-500">Location:</span><span className="ml-1 font-medium">{product.location}</span></div>}
                            {product.production_date && <div><span className="text-gray-500">Production:</span><span className="ml-1 font-medium">{formatIndianDate(product.production_date)}</span></div>}
                            {product.final_length && product.final_width && <div><span className="text-gray-500">Size:</span><span className="ml-1 font-medium">{product.final_length} × {product.final_width}</span></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t bg-white">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={selectedCount === 0} className="bg-primary-600 hover:bg-primary-700">
              Confirm Selection ({selectedCount} products)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
