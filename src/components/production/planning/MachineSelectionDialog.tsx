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
import { Factory, Settings, User } from 'lucide-react';
import { ProductionService } from '@/services/productionService';
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
}

interface MachineSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (machine: Machine | null) => void;
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
  const [selectedMachineIdState, setSelectedMachineIdState] = useState<string>('');
  const [inspectorName, setInspectorName] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMachines();
      // Set selected machine if provided
      if (selectedMachineId) {
        setSelectedMachineIdState(selectedMachineId);
      }
    } else {
      // Reset state when dialog closes
      setSelectedMachineIdState('');
      setInspectorName('');
    }
  }, [isOpen, selectedMachineId]);

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

    onSelect(selectedMachine);
    onClose();
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
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="Enter inspector name"
              className="w-full"
            />
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
            )}
          </div>
        </div>
        
        <DialogFooter className="space-y-2 pt-4 border-t border-gray-100">
          <Button 
            onClick={handleConfirm}
            disabled={!selectedMachineIdState || !inspectorName.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Factory className="w-4 h-4 mr-2" />
            Start Production with Selected Machine
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            size="sm"
            className="w-full"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

