import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Factory, Settings, User, Clock, Plus, Calendar, AlertTriangle, Sun, Moon, Check, Loader2, X, ChevronRight } from 'lucide-react';
import { ProductionService } from '@/services/productionService';
import { AuthService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';

interface Machine {
  id: string;
  machine_name: string;
  machine_type: string;
  model_number?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'broken' | 'retired';
  location?: string;
  department?: string;
  capacity_per_hour?: number;
  current_operator?: string;
  shift?: 'day' | 'night';
}

interface MachineSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (machine: Machine | null, shift?: 'day' | 'night', scheduleDate?: string) => void;
  selectedMachineId?: string | null;
}

export default function MachineSelectionDialog({
  isOpen,
  onClose,
  onSelect,
  selectedMachineId,
}: MachineSelectionDialogProps) {
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedMachineIdState, setSelectedMachineIdState] = useState<string>('');
  const [inspectorName, setInspectorName] = useState('');
  const [selectedShift, setSelectedShift] = useState<'day' | 'night'>('day');
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineType, setNewMachineType] = useState('');
  const [newMachineModel, setNewMachineModel] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMachines();
      loadCurrentUser();
      if (selectedMachineId) setSelectedMachineIdState(selectedMachineId);
    } else {
      setSelectedMachineIdState('');
      setInspectorName('');
      setSelectedShift('day');
      setScheduleDate('');
      setShowAddMachine(false);
      setNewMachineName('');
      setNewMachineType('');
      setNewMachineModel('');
    }
  }, [isOpen, selectedMachineId]);

  const loadCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) setInspectorName(user.full_name || user.email || '');
    } catch { /* silent */ }
  };

  const loadMachines = async () => {
    setLoading(true);
    try {
      const { machines: machinesData } = await ProductionService.getMachines({ status: 'active', limit: 100 });
      setMachines(machinesData);
    } catch {
      toast({ title: 'Error', description: 'Failed to load machines', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedMachineIdState) {
      toast({ title: 'Machine Required', description: 'Please select a machine to continue', variant: 'destructive' });
      return;
    }
    const selectedMachine = machines.find((m) => m.id === selectedMachineIdState);
    if (!selectedMachine) {
      toast({ title: 'Error', description: 'Selected machine not found', variant: 'destructive' });
      return;
    }
    onSelect({ ...selectedMachine, shift: selectedShift }, selectedShift, scheduleDate || undefined);
    onClose();
  };

  const handleCreateMachine = async () => {
    if (!newMachineName.trim() || !newMachineType.trim()) {
      toast({ title: 'Missing details', description: 'Machine name and type are required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await ProductionService.createMachine({
        machine_name: newMachineName.trim(),
        machine_type: newMachineType.trim(),
        model_number: newMachineModel.trim() || undefined,
        status: 'active',
      });
      if (error || !data) {
        toast({ title: 'Error', description: error || 'Failed to create machine', variant: 'destructive' });
        return;
      }
      await loadMachines();
      setSelectedMachineIdState(data.id);
      setShowAddMachine(false);
      setNewMachineName('');
      setNewMachineType('');
      setNewMachineModel('');
      toast({ title: 'Machine added', description: `${data.machine_name} created and selected` });
    } catch {
      toast({ title: 'Error', description: 'Failed to create machine', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const selectedMachine = machines.find(m => m.id === selectedMachineIdState);
  const canConfirm = !!selectedMachineIdState && !!inspectorName.trim() && !!selectedShift;

  // ── MOBILE FULL-SCREEN ──
  const mobileContent = isOpen ? (
    <div className="lg:hidden fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200 shrink-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#EFF6FF' }}>
          <Factory className="w-[18px] h-[18px] text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-extrabold text-gray-900">Select Machine</p>
          <p className="text-[11.5px] text-gray-500">Choose machine &amp; shift for this batch</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg active:bg-gray-100">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-36">

        {/* Inspector (read-only) */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide mb-2">Inspector</p>
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold text-gray-900 truncate">{inspectorName || 'Loading...'}</p>
              <p className="text-[11px] text-gray-400">Auto-filled · current user</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-4" />

        {/* Machine Selection */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide">Machine *</p>
            <span className="text-[11px] text-gray-400">{machines.length} available</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-[13px] text-gray-500">Loading machines...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {machines.map(machine => {
                const isSelected = machine.id === selectedMachineIdState;
                return (
                  <button key={machine.id} onClick={() => setSelectedMachineIdState(machine.id)}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: isSelected ? '#2563EB' : '#E5E7EB',
                      backgroundColor: isSelected ? '#EFF6FF' : '#fff',
                    }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isSelected ? '#2563EB' : '#F3F4F6' }}>
                      <Settings className="w-4 h-4" style={{ color: isSelected ? '#fff' : '#6B7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-bold text-gray-900 truncate">{machine.machine_name}</p>
                      <p className="text-[11px] text-gray-500">{machine.machine_type}{machine.model_number ? ` · ${machine.model_number}` : ''}{machine.location ? ` · ${machine.location}` : ''}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Add new machine */}
              {!showAddMachine ? (
                <button onClick={() => setShowAddMachine(true)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 border-dashed border-gray-200 text-left">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-[13px] font-semibold text-blue-600">Add new machine</span>
                </button>
              ) : (
                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-bold text-blue-900">New Machine</p>
                    <button onClick={() => setShowAddMachine(false)} className="p-1">
                      <X className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-[11.5px] font-semibold text-gray-600 mb-1">Machine Name *</p>
                      <input
                        className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none"
                        placeholder="e.g., Loom 01"
                        value={newMachineName}
                        onChange={e => setNewMachineName(e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-[11.5px] font-semibold text-gray-600 mb-1">Machine Type *</p>
                      <input
                        className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none"
                        placeholder="e.g., Loom"
                        value={newMachineType}
                        onChange={e => setNewMachineType(e.target.value)}
                      />
                    </div>
                    <div>
                      <p className="text-[11.5px] font-semibold text-gray-600 mb-1">Model (optional)</p>
                      <input
                        className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none"
                        placeholder="e.g., Model X200"
                        value={newMachineModel}
                        onChange={e => setNewMachineModel(e.target.value)}
                      />
                    </div>
                  </div>
                  <button onClick={handleCreateMachine} disabled={creating}
                    className="w-full py-3 rounded-xl text-[13.5px] font-bold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: creating ? '#9CA3AF' : '#2563EB' }}>
                    {creating ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : 'Save & Select'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-4" />

        {/* Shift Selection */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide mb-2.5">Shift *</p>
          <div className="flex gap-3">
            {(['day', 'night'] as const).map(shift => {
              const isActive = selectedShift === shift;
              const Icon = shift === 'day' ? Sun : Moon;
              const label = shift === 'day' ? 'Day Shift' : 'Night Shift';
              const activeColor = shift === 'day' ? '#D97706' : '#4F46E5';
              const activeBg = shift === 'day' ? '#FFFBEB' : '#EEF2FF';
              const activeBorder = shift === 'day' ? '#FCD34D' : '#A5B4FC';
              return (
                <button key={shift} onClick={() => setSelectedShift(shift)}
                  className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: isActive ? activeBorder : '#E5E7EB',
                    backgroundColor: isActive ? activeBg : '#fff',
                  }}>
                  <Icon className="w-5 h-5" style={{ color: isActive ? activeColor : '#9CA3AF' }} />
                  <span className="text-[13px] font-bold" style={{ color: isActive ? activeColor : '#6B7280' }}>{label}</span>
                  {isActive && (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: activeColor }}>
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-4" />

        {/* Schedule Date */}
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <p className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wide">Start Date</p>
            <span className="text-[10px] text-gray-400 font-normal">(optional)</span>
          </div>
          <div className="flex items-center gap-3 bg-white border-2 border-gray-200 rounded-xl px-3.5 py-2.5">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="flex-1 bg-transparent text-[13.5px] text-gray-900 outline-none"
            />
          </div>
          <div className="flex items-start gap-1.5 mt-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">Past dates allowed — use this if recording machine work done earlier.</p>
          </div>
        </div>

        {/* Summary card (shown when machine selected) */}
        {selectedMachine && (
          <div className="mx-4 mb-2 rounded-xl border border-blue-200 bg-blue-50 p-3.5">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-2">Summary</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500">Machine</span>
                <span className="text-[12.5px] font-bold text-gray-900">{selectedMachine.machine_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500">Type</span>
                <span className="text-[12.5px] font-semibold text-gray-700">{selectedMachine.machine_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-500">Shift</span>
                <span className="text-[12.5px] font-bold text-gray-900 capitalize">{selectedShift} Shift</span>
              </div>
              {scheduleDate && (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-500">Start Date</span>
                  <span className="text-[12.5px] font-semibold text-gray-700">{scheduleDate}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-6 space-y-2.5 shrink-0">
        <button onClick={handleConfirm} disabled={!canConfirm}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-bold text-white transition-colors"
          style={{ backgroundColor: !canConfirm ? '#9CA3AF' : '#2563EB' }}>
          <Factory className="w-4 h-4" />
          Start with {selectedMachine ? selectedMachine.machine_name : 'Machine'}
        </button>
        <button onClick={onClose}
          className="w-full py-3 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-500">
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  // ── DESKTOP ──
  return (
    <>
      {createPortal(mobileContent, document.body)}

      <Dialog open={isOpen && !isMobile} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-blue-600" />
              Select Production Machine
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Choose the machine and shift for this production batch.</p>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Inspector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" /> Inspector Name
              </Label>
              <Input value={inspectorName || 'Current User'} readOnly disabled className="bg-gray-50 cursor-not-allowed" />
              <p className="text-xs text-gray-500">Auto-filled with current logged-in user</p>
            </div>

            {/* Machine */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Select Machine * ({machines.length} available)
              </Label>
              {loading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="text-sm">Loading machines...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {machines.map(machine => {
                    const isSelected = machine.id === selectedMachineIdState;
                    return (
                      <button key={machine.id} onClick={() => setSelectedMachineIdState(machine.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 text-left transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-gray-100'}`}>
                          <Settings className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{machine.machine_name}</p>
                          <p className="text-xs text-gray-500">{machine.machine_type}{machine.model_number ? ` · ${machine.model_number}` : ''}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={() => setShowAddMachine(v => !v)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1">
                <Plus className="w-4 h-4" />
                {showAddMachine ? 'Cancel' : 'Add new machine'}
              </button>
            </div>

            {/* Add Machine Inline Form */}
            {showAddMachine && (
              <div className="p-3 border rounded-lg bg-blue-50 border-blue-100 space-y-3">
                <p className="text-sm font-medium text-gray-800">New Machine Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Name *</Label>
                    <Input value={newMachineName} onChange={e => setNewMachineName(e.target.value)} placeholder="Loom 01" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Type *</Label>
                    <Input value={newMachineType} onChange={e => setNewMachineType(e.target.value)} placeholder="Loom" className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-gray-600">Model (optional)</Label>
                    <Input value={newMachineModel} onChange={e => setNewMachineModel(e.target.value)} placeholder="Model X200" className="h-8 text-sm" />
                  </div>
                </div>
                <Button onClick={handleCreateMachine} disabled={creating} size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {creating ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Saving...</> : 'Save & Select'}
                </Button>
              </div>
            )}

            {/* Shift */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Select Shift *
              </Label>
              <div className="flex gap-3">
                {(['day', 'night'] as const).map(shift => {
                  const isActive = selectedShift === shift;
                  const Icon = shift === 'day' ? Sun : Moon;
                  return (
                    <button key={shift} onClick={() => setSelectedShift(shift)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${isActive ? (shift === 'day' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-indigo-400 bg-indigo-50 text-indigo-700') : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Icon className="w-4 h-4" />
                      {shift === 'day' ? 'Day' : 'Night'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Start Date
                <span className="text-xs font-normal text-gray-400">(optional)</span>
              </Label>
              <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                Past dates allowed for recording work done earlier.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 pt-3 border-t">
            <Button onClick={handleConfirm} disabled={!canConfirm} className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              <Factory className="w-4 h-4 mr-2" />
              Start Production with Selected Machine
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
