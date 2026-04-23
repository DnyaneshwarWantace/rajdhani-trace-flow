import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';
import { getApiUrl } from '@/utils/apiConfig';

interface PurchaseRecord {
  id: string;
  material_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  previous_stock: number;
  new_stock: number;
  cost_per_unit: number;
  total_cost: number;
  supplier_name?: string;
  invoice_number?: string;
  notes?: string;
  createdAt: string;
}

export default function ManageStock() {
  const { toast } = useToast();
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const loadHistory = async () => {
    try {
      setLoading(true);
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/raw-materials/purchase-history?limit=${limit}&offset=${(page - 1) * limit}&search=${encodeURIComponent(search)}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setRecords(data.data || []);
      setTotal(data.count || 0);
    } catch (error) {
      console.error('Error loading purchase history:', error);
      toast({ title: 'Error', description: 'Failed to load purchase history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, search]);

  useLiveSyncRefresh({
    modules: ['materials', 'manage_stock'],
    onRefresh: () => loadHistory(),
    pollingMs: 10000,
  });

  const totalPages = Math.ceil(total / limit);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const filtered = records.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.material_name?.toLowerCase().includes(s) ||
      r.supplier_name?.toLowerCase().includes(s) ||
      r.invoice_number?.toLowerCase().includes(s)
    );
  });

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase History</h1>
          <p className="text-gray-600 mt-1">All direct restock records — supplier, quantity, price, and invoice</p>
        </div>

        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search material, supplier, invoice..."
              className="pl-9"
            />
          </div>
          <div className="text-sm text-gray-500">
            {total} record{total !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No purchase records found</p>
            <p className="text-gray-400 text-sm mt-1">Restock materials from the Materials page to see history here</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Material</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Supplier</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-700">Invoice No.</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Price/Unit</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-700">Stock After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.material_name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.supplier_name || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.invoice_number || <span className="text-gray-400 italic">—</span>}</td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">+{r.quantity} {r.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-600">₹{r.cost_per_unit?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">₹{r.total_cost?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">{r.new_stock} {r.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filtered.map((r) => (
                <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-gray-900">{r.material_name}</div>
                    <div className="text-xs text-gray-500">{formatDate(r.createdAt)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-gray-500">Supplier</div>
                    <div className="text-gray-900">{r.supplier_name || '—'}</div>
                    <div className="text-gray-500">Invoice</div>
                    <div className="text-gray-900 font-mono text-xs">{r.invoice_number || '—'}</div>
                    <div className="text-gray-500">Quantity</div>
                    <div className="text-green-700 font-medium">+{r.quantity} {r.unit}</div>
                    <div className="text-gray-500">Price/Unit</div>
                    <div className="text-gray-900">₹{r.cost_per_unit?.toFixed(2) ?? '—'}</div>
                    <div className="text-gray-500">Total</div>
                    <div className="font-semibold text-gray-900">₹{r.total_cost?.toFixed(2) ?? '—'}</div>
                    <div className="text-gray-500">Stock After</div>
                    <div className="text-gray-900">{r.new_stock} {r.unit}</div>
                  </div>
                  {r.notes && (
                    <div className="mt-2 text-xs text-gray-500 border-t pt-2">{r.notes}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
