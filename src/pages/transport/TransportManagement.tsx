import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TransportService, type Transport } from '@/services/transportService';
import { Truck, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Phone, User, Search, Loader2, X, ChevronDown } from 'lucide-react';
import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

async function authHeaders(): Promise<Record<string, string>> {
  const token = localStorage.getItem('auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function fetchCapacityUnits(): Promise<string[]> {
  const res = await fetch(`${API_URL}/dropdowns/category/capacity_unit`, { headers: await authHeaders() });
  const data = await res.json();
  return data.success ? data.data.map((d: any) => d.value) : [];
}

async function addCapacityUnit(value: string): Promise<void> {
  const res = await fetch(`${API_URL}/dropdowns`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ category: 'capacity_unit', value: value.trim() }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to add unit');
}

const EMPTY: Omit<Transport, 'id' | 'is_active'> = {
  vehicle_no: '', vehicle_type: 'own', capacity_value: null, capacity_unit: '',
  driver_name: '', driver_contact: '', notes: '',
};

const typeLabel = (v: string) => v === 'own' ? 'Own' : v === 'outside' ? 'Outside' : 'Hired';
const typeBadge = (v: string) =>
  v === 'own' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
  v === 'outside' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
  'bg-purple-100 text-purple-700 border border-purple-200';

function capacityDisplay(t: Transport) {
  if (t.capacity_value != null && t.capacity_unit) return `${t.capacity_value} ${t.capacity_unit}`;
  if (t.capacity_value != null) return String(t.capacity_value);
  return '—';
}

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const h = (e: MediaQueryListEvent) => setM(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return m;
}

export default function TransportManagement() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Transport | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [capacityUnits, setCapacityUnits] = useState<string[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitValue, setNewUnitValue] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  const [filterSheet, setFilterSheet] = useState<'type' | 'status' | null>(null);

  const load = async () => {
    setLoading(true);
    try { setTransports(await TransportService.getAll()); }
    finally { setLoading(false); }
  };

  const loadUnits = async () => {
    setUnitsLoading(true);
    try { setCapacityUnits(await fetchCapacityUnits()); }
    finally { setUnitsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null); setForm(EMPTY);
    setAddingUnit(false); setNewUnitValue('');
    loadUnits();
    setShowDialog(true);
  };
  const openEdit = (t: Transport) => {
    setEditing(t);
    setForm({
      vehicle_no: t.vehicle_no, vehicle_type: t.vehicle_type,
      capacity_value: t.capacity_value, capacity_unit: t.capacity_unit || '',
      driver_name: t.driver_name || '', driver_contact: t.driver_contact || '', notes: t.notes || '',
    });
    setAddingUnit(false); setNewUnitValue('');
    loadUnits();
    setShowDialog(true);
  };

  const handleAddUnit = async () => {
    if (!newUnitValue.trim()) return;
    setSavingUnit(true);
    try {
      await addCapacityUnit(newUnitValue.trim());
      const updated = await fetchCapacityUnits();
      setCapacityUnits(updated);
      setForm(f => ({ ...f, capacity_unit: newUnitValue.trim() }));
      setNewUnitValue('');
      setAddingUnit(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingUnit(false); }
  };

  const handleSave = async () => {
    if (!form.vehicle_no.trim()) { toast({ title: 'Error', description: 'Vehicle number is required', variant: 'destructive' }); return; }
    setSaving(true);
    const cleanedForm = {
      ...form,
      driver_contact: /^\+\d{1,4}$/.test((form.driver_contact ?? '').trim()) ? '' : (form.driver_contact ?? '').trim(),
    };
    try {
      if (editing) {
        await TransportService.update(editing.id, cleanedForm);
        toast({ title: 'Updated', description: `${form.vehicle_no} updated.` });
      } else {
        await TransportService.create(cleanedForm);
        toast({ title: 'Added', description: `${form.vehicle_no} added.` });
      }
      setShowDialog(false);
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleToggle = async (t: Transport) => {
    try { await TransportService.update(t.id, { is_active: !t.is_active }); load(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await TransportService.delete(id); toast({ title: 'Deleted' }); load(); }
    catch (e: any) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setDeletingId(null); }
  };

  const filtered = transports.filter(t => {
    const matchSearch = !search || t.vehicle_no.toLowerCase().includes(search.toLowerCase()) || (t.driver_name || '').toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.vehicle_type === filterType;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? t.is_active : !t.is_active);
    return matchSearch && matchType && matchStatus;
  });

  const total = transports.length;
  const active = transports.filter(t => t.is_active).length;
  const own = transports.filter(t => t.vehicle_type === 'own').length;
  const outside = transports.filter(t => t.vehicle_type === 'outside' || t.vehicle_type === 'hired').length;

  // ── Shared form fields ──────────────────────────────────────────────────────
  const FormFields = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Vehicle Number *</Label>
        <Input placeholder="e.g. MH12AB1234" value={form.vehicle_no}
          onChange={e => setForm(f => ({ ...f, vehicle_no: e.target.value.toUpperCase() }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={form.vehicle_type} onValueChange={v => setForm(f => ({ ...f, vehicle_type: v as any }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="own">Own Transport</SelectItem>
            <SelectItem value="outside">Outside Transport</SelectItem>
            <SelectItem value="hired">Hired Transport</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Capacity <span className="text-gray-400 text-xs font-normal">optional</span></Label>
        <div className="flex gap-2">
          <Input type="number" min="0" placeholder="0" className="w-28 flex-shrink-0"
            value={form.capacity_value ?? ''}
            onChange={e => setForm(f => ({ ...f, capacity_value: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
          <div className="flex-1 min-w-0">
            {unitsLoading ? (
              <div className="h-10 border rounded-md flex items-center px-3 text-sm text-gray-400">Loading…</div>
            ) : (
              <Select value={form.capacity_unit || '__placeholder__'}
                onValueChange={v => {
                  if (v === '__add_new__') setAddingUnit(true);
                  else if (v !== '__placeholder__') { setForm(f => ({ ...f, capacity_unit: v })); setAddingUnit(false); }
                }}>
                <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {capacityUnits.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No units yet</div>}
                  {capacityUnits.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  <SelectItem value="__add_new__">
                    <span className="text-primary-600 font-semibold flex items-center gap-1"><Plus className="w-3 h-3" /> Add New Unit</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        {addingUnit && (
          <div className="flex gap-2 mt-1">
            <Input placeholder="e.g. tonnes, bags, rolls" value={newUnitValue}
              onChange={e => setNewUnitValue(e.target.value)} className="flex-1"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit(); } }} />
            <Button size="sm" onClick={handleAddUnit} disabled={savingUnit || !newUnitValue.trim()}
              className="bg-primary-600 hover:bg-primary-700 text-white flex-shrink-0">
              {savingUnit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingUnit(false); setNewUnitValue(''); }} className="flex-shrink-0">Cancel</Button>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label>Driver Name <span className="text-gray-400 text-xs font-normal">optional</span></Label>
        <Input placeholder="Driver name" value={form.driver_name}
          onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Driver Contact <span className="text-gray-400 text-xs font-normal">optional</span></Label>
        <Input type="tel" placeholder="+91 Phone number" value={form.driver_contact}
          onChange={e => setForm(f => ({ ...f, driver_contact: e.target.value }))} />
      </div>
      <div className="space-y-1.5">
        <Label>Notes <span className="text-gray-400 text-xs font-normal">optional</span></Label>
        <Input placeholder="Any notes" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </div>
  );

  const formTitle = editing ? 'Edit Vehicle' : 'Add New Vehicle';

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-4">

        {/* ── MOBILE header ── */}
        <div className="lg:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Transport</h1>
          <button onClick={openCreate}
            className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm active:bg-blue-700">
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ── DESKTOP header ── */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Transport / Trucks</h1>
              <p className="text-sm text-gray-500">Manage your vehicle fleet for order dispatch</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-primary-600 hover:bg-primary-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </div>

        {/* ── Stats ── */}
        {/* Mobile: single compact strip */}
        <div className="lg:hidden flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
          {[
            { label: 'Total', value: total, color: 'text-gray-900' },
            { label: 'Active', value: active, color: 'text-green-600' },
            { label: 'Own', value: own, color: 'text-blue-600' },
            { label: 'Outside', value: outside, color: 'text-orange-600' },
          ].map((s, i) => (
            <div key={s.label} className={`flex-1 flex flex-col items-center py-2.5 ${i > 0 ? 'border-l border-gray-200' : ''}`}>
              <span className={`text-sm font-extrabold ${s.color}`}>{loading ? <span className="inline-block w-5 h-4 bg-gray-200 animate-pulse rounded" /> : s.value}</span>
              <span className="text-[9px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">{s.label}</span>
            </div>
          ))}
        </div>
        {/* Desktop: 4-col grid */}
        <div className="hidden lg:grid grid-cols-4 gap-3">
          {[
            { label: 'Total Vehicles', value: total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Active', value: active, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Own Fleet', value: own, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Outside / Hired', value: outside, color: 'text-orange-700', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl p-4`}>
              <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Search + Filters ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search vehicle, driver…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Mobile filter chips */}
        <div className="lg:hidden flex gap-2">
          <button onClick={() => setFilterSheet('type')}
            className={`flex-1 h-10 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 ${filterType !== 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
            {filterType === 'all' ? 'All Types' : typeLabel(filterType)}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
          <button onClick={() => setFilterSheet('status')}
            className={`flex-1 h-10 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 ${filterStatus !== 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>
            {filterStatus === 'all' ? 'All Status' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>

        {/* Desktop selects */}
        <div className="hidden lg:flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="own">Own</SelectItem>
              <SelectItem value="outside">Outside</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-700 font-semibold text-base mb-1">
              {transports.length === 0 ? 'No vehicles added yet' : 'No vehicles match your filters'}
            </p>
            <p className="text-gray-400 text-sm mb-5">
              {transports.length === 0 ? 'Add your trucks to select them while dispatching orders.' : 'Try adjusting your search or filters.'}
            </p>
            {transports.length === 0 && (
              <Button onClick={openCreate} className="bg-primary-600 hover:bg-primary-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add First Vehicle
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Vehicle', 'Type', 'Capacity', 'Driver', 'Status', ''].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(t => (
                    <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${!t.is_active ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{t.vehicle_no}</p>
                            {t.notes && <p className="text-xs text-gray-400 truncate max-w-[180px]">{t.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge(t.vehicle_type)}`}>{typeLabel(t.vehicle_type)}</span></td>
                      <td className="px-4 py-3 text-gray-600">{capacityDisplay(t)}</td>
                      <td className="px-4 py-3">
                        {t.driver_name ? <div><p className="text-gray-800 font-medium">{t.driver_name}</p>{t.driver_contact && <p className="text-xs text-gray-400">{t.driver_contact}</p>}</div> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleToggle(t)} className="p-1.5 rounded-lg hover:bg-gray-100">
                            {t.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                          </button>
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                          <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-1.5 rounded-lg hover:bg-red-50">
                            {deletingId === t.id ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden space-y-3 pb-6">
              {filtered.map(t => (
                <div key={t.id} className={`bg-white border border-gray-200 rounded-xl p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{t.vehicle_no}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge(t.vehicle_type)}`}>{typeLabel(t.vehicle_type)}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {t.capacity_value != null && <span className="font-medium">{capacityDisplay(t)}</span>}
                          {t.driver_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.driver_name}</span>}
                          {t.driver_contact && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.driver_contact}</span>}
                          {t.notes && <span className="text-gray-400 italic truncate max-w-[200px]">{t.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => handleToggle(t)} className="p-2 rounded-lg active:bg-gray-100">
                        {t.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button onClick={() => openEdit(t)} className="p-2 rounded-lg active:bg-gray-100"><Edit2 className="w-4 h-4 text-gray-500" /></button>
                      <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-2 rounded-lg active:bg-red-50">
                        {deletingId === t.id ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-right">Showing {filtered.length} of {total} vehicles</p>
          </>
        )}
      </div>

      {/* ── MOBILE: bottom sheet form ── */}
      {isMobile && showDialog && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDialog(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary-600" />
                <h2 className="text-base font-bold text-gray-900">{formTitle}</h2>
              </div>
              <button onClick={() => setShowDialog(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {/* Scrollable form */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <FormFields />
            </div>
            {/* Footer */}
            <div className="px-4 py-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowDialog(false)} disabled={saving}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 bg-white active:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleSave} disabled={saving || !form.vehicle_no.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{editing ? 'Saving…' : 'Adding…'}</> : editing ? 'Save Changes' : 'Add Vehicle'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MOBILE: filter bottom sheets ── */}
      {filterSheet && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setFilterSheet(null)} />
          <div className="relative bg-white rounded-t-2xl shadow-xl">
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <p className="text-sm font-bold text-gray-900 px-4 pb-3">
              {filterSheet === 'type' ? 'Filter by Type' : 'Filter by Status'}
            </p>
            <div className="px-4 pb-6 space-y-2">
              {filterSheet === 'type'
                ? [
                    { value: 'all', label: 'All Types' },
                    { value: 'own', label: 'Own Transport' },
                    { value: 'outside', label: 'Outside Transport' },
                    { value: 'hired', label: 'Hired Transport' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => { setFilterType(opt.value); setFilterSheet(null); }}
                      className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-left flex items-center justify-between ${filterType === opt.value ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                      {opt.label}
                      {filterType === opt.value && <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-white" /></span>}
                    </button>
                  ))
                : [
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => { setFilterStatus(opt.value); setFilterSheet(null); }}
                      className={`w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-left flex items-center justify-between ${filterStatus === opt.value ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-700 border border-gray-100'}`}>
                      {opt.label}
                      {filterStatus === opt.value && <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center"><span className="w-2 h-2 rounded-full bg-white" /></span>}
                    </button>
                  ))
              }
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── DESKTOP: centered dialog ── */}
      {!isMobile && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary-600" />
                {formTitle}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2"><FormFields /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editing ? 'Save Changes' : 'Add Vehicle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
