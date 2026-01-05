import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, XCircle } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductionDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  batch: ProductionBatch | null;
  isDeleting: boolean;
}

export default function ProductionDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  batch,
  isDeleting,
}: ProductionDeleteDialogProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason(''); // Reset reason on close
    onClose();
  };

  const handleConfirmClick = () => {
    onConfirm(reason);
    setReason(''); // Reset reason after confirm
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Production Batch</DialogTitle>
          <DialogDescription className="break-words">
            Are you sure you want to cancel batch "
            {batch?.batch_number ? (
              <TruncatedText text={batch.batch_number} maxLength={50} as="span" className="font-semibold" />
            ) : (
              'this batch'
            )}
            "? All consumed materials will be returned to inventory.
          </DialogDescription>
        </DialogHeader>

        {/* Cancellation Reason */}
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Cancellation Reason (Optional)</Label>
          <Textarea
            id="cancel-reason"
            placeholder="E.g., Material shortage, Order cancelled, Design change..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isDeleting}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            Provide a reason to help track why this production was cancelled
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Go Back
          </Button>
          <Button
            onClick={handleConfirmClick}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Production
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


