import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrderService, type Order } from '@/services/orderService';

interface AssignMaterialTaskModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onConfirm: (payload: { assigned_to_id?: string }) => Promise<void>;
}

export default function AssignMaterialTaskModal({ open, order, onClose, onConfirm }: AssignMaterialTaskModalProps) {
  const [users, setUsers] = useState<Array<{ id: string; full_name?: string; email?: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoadingUsers(true);
      const { data } = await OrderService.getMaterialProcurementEligibleUsers();
      setUsers(data || []);
      setLoadingUsers(false);
    };
    load();
  }, [open]);

  const firstEligible = useMemo(() => users[0]?.id || 'ALL', [users]);

  useEffect(() => {
    if (open) {
      // Default to broadcast when user does not explicitly assign anyone.
      setSelectedUserId('ALL');
    }
  }, [open, firstEligible]);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(selectedUserId && selectedUserId !== 'ALL' ? { assigned_to_id: selectedUserId } : {});
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Material Order Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Order: <span className="font-medium text-gray-900">{order?.orderNumber || order?.id}</span>
          </p>
          <div>
            <p className="text-sm font-medium mb-1">Assign to</p>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingUsers}>
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'Select user'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All eligible users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email || u.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button className="text-white" onClick={handleConfirm} disabled={submitting || loadingUsers}>
              {submitting ? 'Assigning...' : 'Assign Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

