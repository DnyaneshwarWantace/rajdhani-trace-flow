import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TransportService, type Transport } from '@/services/transportService';
import { Truck, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Phone, User } from 'lucide-react';

const EMPTY: Omit<Transport, 'id' | 'is_active'> = {
  vehicle_no: '', vehicle_type: 'own', capacity_kg: 0, driver_name: '', driver_contact: '', notes: '',
};

export default function TransportManagement() {
  const { toast } = useToast();
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Transport | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTransports(await TransportService.getAll());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowDialog(true); };
  const openEdit = (t: Transport) => {
    setEditing(t);
    setForm({ vehicle_no: t.vehicle_no, vehicle_type: t.vehicle_type, capacity_kg: t.capacity_kg, driver_name: t.driver_name || '', driver_contact: t.driver_contact || '', notes: t.notes || '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.vehicle_no.trim()) { toast({ title: 'Error', description: 'Vehicle number is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editing) {
        await TransportService.update(editing.id, form);
        toast({ title: 'Updated', description: `${form.vehicle_no} updated.` });
      } else {
        await TransportService.create(form);
        toast({ title: 'Added', description: `${form.vehicle_no} added.` });
      }
      setShowDialog(false);
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: Transport) => {
    try {
      await TransportService.update(t.id, { is_active: !t.is_active });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await TransportService.delete(id);
      toast({ title: 'Deleted' });
      load();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const typeLabel = (v: string) => v === 'own' ? 'Own' : v === 'outside' ? 'Outside' : 'Hired';
  const typeBadge = (v: string) => v === 'own' ? 'bg-blue-100 text-blue-700' : v === 'outside' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Transport / Trucks</h1>
              <p className="text-sm text-gray-500">Manage your vehicle fleet for order dispatch</p>
            </div>
          </div>
          <Button onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Vehicle
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : transports.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No vehicles added yet</p>
            <p className="text-gray-400 text-sm mt-1">Add your trucks so you can select them while dispatching orders.</p>
            <Button onClick={openCreate} className="mt-4" variant="outline"><Plus className="w-4 h-4 mr-2" />Add First Vehicle</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {transports.map(t => (
              <div key={t.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${!t.is_active ? 'opacity-60' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{t.vehicle_no}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge(t.vehicle_type)}`}>{typeLabel(t.vehicle_type)}</span>
                    {!t.is_active && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    {t.capacity_kg > 0 && <span>Capacity: <strong>{t.capacity_kg} kg</strong></span>}
                    {t.driver_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.driver_name}</span>}
                    {t.driver_contact && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{t.driver_contact}</span>}
                    {t.notes && <span className="text-gray-400 italic truncate max-w-[200px]">{t.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(t)} title={t.is_active ? 'Deactivate' : 'Activate'} className="p-2 rounded-lg hover:bg-gray-100">
                    {t.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                  </button>
                  <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-gray-100">
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-2 rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Vehicle Number *</Label>
              <Input placeholder="e.g. MH12AB1234" value={form.vehicle_no} onChange={e => setForm(f => ({ ...f, vehicle_no: e.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>Capacity (kg) <span className="text-gray-400 text-xs">optional</span></Label>
              <Input type="number" min="0" placeholder="0" value={form.capacity_kg || ''} onChange={e => setForm(f => ({ ...f, capacity_kg: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Driver Name <span className="text-gray-400 text-xs">optional</span></Label>
                <Input placeholder="Driver name" value={form.driver_name} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Driver Contact <span className="text-gray-400 text-xs">optional</span></Label>
                <Input placeholder="Phone number" value={form.driver_contact} onChange={e => setForm(f => ({ ...f, driver_contact: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes <span className="text-gray-400 text-xs">optional</span></Label>
              <Input placeholder="Any notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Vehicle'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
