import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Factory, Settings, User, Clock, Plus } from 'lucide-react';
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
  onSelect: (machine: Machine | null, shift?: 'day' | 'night') => void;
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

  useEffect(() => {
    if (isOpen) {
      loadMachines();
      loadCurrentUser();
      // Set selected machine if provided
      if (selectedMachineId) {
        setSelectedMachineIdState(selectedMachineId);
      }
    } else {
      // Reset state when dialog closes
      setSelectedMachineIdState('');
      setInspectorName('');
      setSelectedShift('day');
      setShowAddMachine(false);
      setNewMachineName('');
      setNewMachineType('');
      setNewMachineModel('');
    }
  }, [isOpen, selectedMachineId]);

  const loadCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setInspectorName(user.full_name || user.email || '');
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadMachines = async () => {
    setLoading(true);
    try {
      const { machines: machinesData } = await ProductionService.getMachines({
        status: 'active', // Only load active machines by default
        limit: 100,
      });
      setMachines(machinesData);
    } catch (error) {
      console.error('Error loading machines:', error);
      toast({
        title: 'Error',
        description: 'Failed to load machines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedMachineIdState) {
      toast({
        title: 'Machine Required',
        description: 'Please select a machine to continue',
        variant: 'destructive',
      });
      return;
    }

    const selectedMachine = machines.find((m) => m.id === selectedMachineIdState);
    if (!selectedMachine) {
      toast({
        title: 'Error',
        description: 'Selected machine not found',
        variant: 'destructive',
      });
      return;
    }

    // Add shift to machine object
    const machineWithShift = { ...selectedMachine, shift: selectedShift };
    onSelect(machineWithShift, selectedShift);
    onClose();
  };

  const handleCreateMachine = async () => {
    if (!newMachineName.trim() || !newMachineType.trim()) {
      toast({
        title: 'Missing details',
        description: 'Machine name and type are required',
        variant: 'destructive',
      });
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
        toast({
          title: 'Error',
          description: error || 'Failed to create machine',
          variant: 'destructive',
        });
        return;
      }

      await loadMachines();
      setSelectedMachineIdState(data.id);
      setShowAddMachine(false);
      setNewMachineName('');
      setNewMachineType('');
      setNewMachineModel('');

      toast({
        title: 'Machine added',
        description: `${data.machine_name} created and selected`,
      });
    } catch (error) {
      console.error('Error creating machine:', error);
      toast({
        title: 'Error',
        description: 'Failed to create machine',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            Select Production Machine
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Choose the machine for this production batch. This machine will be used for the entire production process.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Inspector Name */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Inspector Name *
            </Label>
            <Input
              value={inspectorName || 'Current User'}
              readOnly
              disabled
              className="w-full bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">Auto-filled with current logged-in user</p>
          </div>
          
          {/* Machine Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Select Machine * ({machines.length} available)
            </Label>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading machines...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Select 
                  value={selectedMachineIdState} 
                  onValueChange={setSelectedMachineIdState}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a machine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.machine_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 w-full justify-start"
                  onClick={() => setShowAddMachine(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add new machine
                </Button>
              </div>
            )}
          </div>

          {/* Add Machine Inline Form */}
          {showAddMachine && (
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-800">Add New Machine</Label>
                <Button variant="ghost" size="sm" onClick={() => setShowAddMachine(false)} className="text-gray-500">
                  Cancel
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Machine Name *</Label>
                  <Input
                    value={newMachineName}
                    onChange={(e) => setNewMachineName(e.target.value)}
                    placeholder="e.g., Loom 01"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Machine Type *</Label>
                  <Input
                    value={newMachineType}
                    onChange={(e) => setNewMachineType(e.target.value)}
                    placeholder="e.g., Loom"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Model (optional)</Label>
                  <Input
                    value={newMachineModel}
                    onChange={(e) => setNewMachineModel(e.target.value)}
                    placeholder="e.g., Model X200"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={handleCreateMachine}
                disabled={creating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {creating ? 'Saving...' : 'Save and Select'}
              </Button>
            </div>
          )}

          {/* Shift Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Select Shift *
            </Label>
            <Select 
              value={selectedShift} 
              onValueChange={(value) => setSelectedShift(value as 'day' | 'night')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose shift..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">Select the shift for this machine operation</p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col gap-2 pt-4 border-t border-gray-100">
          <Button
            onClick={handleConfirm}
            disabled={!selectedMachineIdState || !inspectorName.trim() || !selectedShift}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            <Factory className="w-4 h-4 mr-2" />
            Start Production with Selected Machine
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

