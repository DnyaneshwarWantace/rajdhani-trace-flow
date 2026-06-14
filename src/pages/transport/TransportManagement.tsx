import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TransportService, type Transport } from '@/services/transportService';
import { Truck, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Phone, User, Search, Loader2, ChevronDown } from 'lucide-react';
import { getApiUrl } from '@/utils/apiConfig';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';

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

export default function TransportManagement() {
  const { toast } = useToast();
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

  // Capacity unit dropdown state
  const [capacityUnits, setCapacityUnits] = useState<string[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitValue, setNewUnitValue] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

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

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-5">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Transport / Trucks</h1>
              <p className="text-sm text-gray-500">Manage your vehicle fleet for order dispatch</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        </div>

        {/* Stats boxes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total Vehicles', value: total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Active', value: active, color: 'text-green-700', bg: 'bg-green-50' },
            { label: 'Own Fleet', value: own, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'Outside / Hired', value: outside, color: 'text-orange-700', bg: 'bg-orange-50' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} border border-gray-200 rounded-xl p-4`}>
              <p className="text-xs text-gray-500 font-medium mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{loading ? '—' : stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search vehicle no, driver name…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="own">Own</SelectItem>
              <SelectItem value="outside">Outside</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
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
              {transports.length === 0 ? 'Add your trucks so you can select them while dispatching orders.' : 'Try adjusting your search or filters.'}
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
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
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
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeBadge(t.vehicle_type)}`}>{typeLabel(t.vehicle_type)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{capacityDisplay(t)}</td>
                      <td className="px-4 py-3">
                        {t.driver_name ? (
                          <div>
                            <p className="text-gray-800 font-medium">{t.driver_name}</p>
                            {t.driver_contact && <p className="text-xs text-gray-400">{t.driver_contact}</p>}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleToggle(t)} title={t.is_active ? 'Deactivate' : 'Activate'} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            {t.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                          </button>
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
            <div className="lg:hidden space-y-3">
              {filtered.map(t => (
                <div key={t.id} className={`bg-white border border-gray-200 rounded-xl p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Truck className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{t.vehicle_no}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge(t.vehicle_type)}`}>{typeLabel(t.vehicle_type)}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {t.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                          {(t.capacity_value != null) && <span className="font-medium">{capacityDisplay(t)}</span>}
                          {t.driver_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.driver_name}</span>}
                          {t.driver_contact && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.driver_contact}</span>}
                          {t.notes && <span className="text-gray-400 italic truncate max-w-[200px]">{t.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => handleToggle(t)} className="p-2 rounded-lg hover:bg-gray-100">
                        {t.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-gray-100">
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-2 rounded-lg hover:bg-red-50">
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

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-600" />
              {editing ? 'Edit Vehicle' : 'Add New Vehicle'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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

            {/* Capacity — value + unit */}
            <div className="space-y-1.5">
              <Label>Capacity <span className="text-gray-400 text-xs font-normal">optional</span></Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-28 flex-shrink-0"
                  value={form.capacity_value ?? ''}
                  onChange={e => setForm(f => ({ ...f, capacity_value: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                />
                <div className="flex-1 min-w-0">
                  {unitsLoading ? (
                    <div className="h-10 border rounded-md flex items-center px-3 text-sm text-gray-400">Loading…</div>
                  ) : (
                    <Select
                      value={form.capacity_unit || '__placeholder__'}
                      onValueChange={v => {
                        if (v === '__add_new__') { setAddingUnit(true); }
                        else if (v !== '__placeholder__') { setForm(f => ({ ...f, capacity_unit: v })); setAddingUnit(false); }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {capacityUnits.length === 0 && (
                          <div className="px-3 py-2 text-sm text-gray-400">No units yet</div>
                        )}
                        {capacityUnits.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                        <SelectItem value="__add_new__">
                          <span className="text-primary-600 font-semibold flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add New Unit
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              {/* Inline add new unit */}
              {addingUnit && (
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="e.g. tonnes, bags, rolls"
                    value={newUnitValue}
                    onChange={e => setNewUnitValue(e.target.value)}
                    className="flex-1"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit(); } }}
                  />
                  <Button size="sm" onClick={handleAddUnit} disabled={savingUnit || !newUnitValue.trim()}
                    className="bg-primary-600 hover:bg-primary-700 text-white flex-shrink-0">
                    {savingUnit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingUnit(false); setNewUnitValue(''); }}
                    className="flex-shrink-0">Cancel</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver Name <span className="text-gray-400 text-xs font-normal">optional</span></Label>
                <Input placeholder="Driver name" value={form.driver_name}
                  onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Driver Contact <span className="text-gray-400 text-xs font-normal">optional</span></Label>
                <PhoneInput
                  defaultCountry="in"
                  value={form.driver_contact}
                  onChange={v => setForm(f => ({ ...f, driver_contact: v }))}
                  placeholder="Phone number"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 text-xs font-normal">optional</span></Label>
              <Input placeholder="Any notes" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : editing ? 'Save Changes' : 'Add Vehicle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
