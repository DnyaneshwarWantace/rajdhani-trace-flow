import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMachines();
    } else {
      // Reset state when dialog closes
      setSearchTerm('');
      setStatusFilter('active');
      setSelectedMachine(null);
    }
  }, [isOpen, statusFilter]);

  useEffect(() => {
    // Set selected machine when dialog opens
    if (isOpen && selectedMachineId && machines.length > 0) {
      const machine = machines.find((m) => m.id === selectedMachineId);
      if (machine) {
        setSelectedMachine(machine);
      }
    }
  }, [isOpen, selectedMachineId, machines]);

  const loadMachines = async () => {
    setLoading(true);
    try {
      const { machines: machinesData } = await ProductionService.getMachines({
        status: statusFilter !== 'all' ? statusFilter : undefined,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'maintenance':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Maintenance
          </Badge>
        );
      case 'inactive':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            Inactive
          </Badge>
        );
      case 'broken':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            Broken
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch =
      machine.machine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.machine_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.location?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine);
  };

  const handleConfirm = () => {
    if (!selectedMachine) {
      return; // Button is disabled, but just in case
    }
    onSelect(selectedMachine);
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Production Machine</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="broken">Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Machine List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading machines...</p>
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No machines found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
              {filteredMachines.map((machine) => {
                const isSelected = selectedMachine?.id === machine.id;
                return (
                  <div
                    key={machine.id}
                    onClick={() => handleSelectMachine(machine)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-300'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{machine.machine_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{machine.machine_type}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(machine.status)}
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      {machine.model_number && (
                        <div className="flex justify-between">
                          <span>Model:</span>
                          <span className="font-medium">{machine.model_number}</span>
                        </div>
                      )}
                      {machine.location && (
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span className="font-medium">{machine.location}</span>
                        </div>
                      )}
                      {machine.capacity_per_hour && (
                        <div className="flex justify-between">
                          <span>Capacity:</span>
                          <span className="font-medium">
                            {machine.capacity_per_hour} units/hour
                          </span>
                        </div>
                      )}
                      {machine.current_operator && (
                        <div className="flex justify-between">
                          <span>Operator:</span>
                          <span className="font-medium">{machine.current_operator}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedMachine}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {selectedMachine ? `Continue with ${selectedMachine.machine_name}` : 'Please Select a Machine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

