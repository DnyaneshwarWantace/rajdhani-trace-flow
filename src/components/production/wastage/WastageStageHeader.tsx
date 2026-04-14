import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, User, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import AssignUserModal from '@/components/production/AssignUserModal';
import type { ProductionBatch } from '@/services/productionService';

interface WastageStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onCompleteProduction: () => Promise<void>;
  onAssignAfterComplete?: (
    userId: string,
    userName: string,
    selectedTasks: Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      productId: string;
      productName: string;
      requiredQuantity: number;
    }>
  ) => Promise<void>;
  onDoneAfterComplete?: () => void;
  nextStageTasks?: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    productId: string;
    productName: string;
    requiredQuantity: number;
  }>;
  completeDisabled?: boolean;
  isCompleting?: boolean;
}

export default function WastageStageHeader({
  batch,
  onBack,
  onCompleteProduction,
  onAssignAfterComplete,
  onDoneAfterComplete,
  nextStageTasks = [],
  completeDisabled = false,
  isCompleting = false,
}: WastageStageHeaderProps) {
  const assignedName = batch.current_stage_assigned_to_name || batch.assigned_to_name;

  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<Set<string>>(new Set());

  const taskKey = (task: { orderId: string; productId: string }) => `${task.orderId}::${task.productId}`;

  const selectedTasks = nextStageTasks.filter((task) => selectedTaskKeys.has(taskKey(task)));

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onCompleteProduction();
      setSelectedTaskKeys(new Set(nextStageTasks.map((t) => taskKey(t))));
      // After completing, ask if they want to forward
      if (onAssignAfterComplete) {
        setShowForwardDialog(true);
      }
    } finally {
      setCompleting(false);
    }
  };

  const isDisabled = completeDisabled || isCompleting || completing;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Wastage Tracking</h1>
              {assignedName && (
                <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  <User className="w-3 h-3" />
                  {assignedName}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Batch: {batch.batch_number} • Product: {batch.product_name || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleComplete}
            size="lg"
            disabled={isDisabled}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50"
          >
            {isDisabled && completing ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Complete Production
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Forward to next person dialog — shown after completing */}
      <Dialog open={showForwardDialog} onOpenChange={setShowForwardDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Production Completed!
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Do you want to assign next-stage work for attached orders to another user?
          </p>
          <div className="rounded-md border border-green-100 bg-green-50 px-2.5 py-2 text-xs text-green-800">
            Current stage <span className="font-semibold">{batch.product_name || batch.product_id || 'This product'}</span> is completed.
            Select remaining next-stage items to assign.
          </div>
          {nextStageTasks.length > 0 && (
            <div className="max-h-44 overflow-y-auto border rounded-md p-2 bg-gray-50 text-xs text-gray-700 space-y-1">
              {nextStageTasks.map((task, index) => (
                <label
                  key={`${task.orderId}-${task.productId}-${index}`}
                  className="flex items-start gap-2 rounded border border-gray-200 bg-white px-2 py-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedTaskKeys.has(taskKey(task))}
                    onChange={(e) => {
                      setSelectedTaskKeys((prev) => {
                        const next = new Set(prev);
                        const key = taskKey(task);
                        if (e.target.checked) next.add(key);
                        else next.delete(key);
                        return next;
                      });
                    }}
                  />
                  <span>
                    <span className="font-medium">{task.orderNumber}</span> · {task.customerName} · {task.productName} · Qty: {task.requiredQuantity}
                  </span>
                </label>
              ))}
            </div>
          )}
          <DialogFooter className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowForwardDialog(false);
                onDoneAfterComplete?.();
              }}
            >
              No, I'm done
            </Button>
            <Button
              onClick={() => {
                setShowForwardDialog(false);
                setShowAssignModal(true);
              }}
              disabled={selectedTasks.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Yes, Forward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign modal for forwarding */}
      {onAssignAfterComplete && (
        <AssignUserModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onAssign={async (userId, userName) => {
            await onAssignAfterComplete(userId, userName, selectedTasks);
            setShowAssignModal(false);
            onDoneAfterComplete?.();
          }}
          title="Assign Next-Stage Tasks"
          description="Select user who will handle the next stage tasks for attached orders."
          confirmLabel="Assign Tasks"
          extraContent={
            nextStageTasks.length > 0 ? (
              <div className="rounded-md border border-blue-100 bg-blue-50 p-2 text-xs text-blue-900 max-h-40 overflow-y-auto space-y-1">
                {selectedTasks.map((task, index) => (
                  <div key={`${task.orderId}-${task.productId}-${index}`}>
                    {task.orderNumber} · {task.productName} · Qty {task.requiredQuantity}
                  </div>
                ))}
              </div>
            ) : undefined
          }
        />
      )}
    </>
  );
}
