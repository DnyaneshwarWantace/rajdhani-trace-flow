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
import { Loader2, Trash2, XCircle } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductionDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  batch: ProductionBatch | null;
  isDeleting: boolean;
  /** 'cancel' = planning-stage soft cancel; 'delete' = full revert at any stage */
  mode?: 'cancel' | 'delete';
}

export default function ProductionDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  batch,
  isDeleting,
  mode = 'cancel',
}: ProductionDeleteDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState('');

  // Validation function
  const validateReason = (text: string): string => {
    if (!text.trim()) return ''; // Empty is allowed (optional field)

    const words = text.trim().split(/\s+/);

    // Check word count (max 20 words)
    if (words.length > 20) {
      return `Maximum 20 words allowed (currently ${words.length} words)`;
    }

    // Check each word length (max 15 characters)
    const longWords = words.filter(word => word.length > 15);
    if (longWords.length > 0) {
      return `Each word must be 15 characters or less (found: "${longWords[0]}" with ${longWords[0].length} characters)`;
    }

    return ''; // Valid
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newReason = e.target.value;
    setReason(newReason);
    setValidationError(validateReason(newReason));
  };

  const handleClose = () => {
    setReason(''); // Reset reason on close
    setValidationError('');
    onClose();
  };

  const handleConfirmClick = () => {
    const error = validateReason(reason);
    if (error) {
      setValidationError(error);
      return;
    }
    onConfirm(reason);
    setReason(''); // Reset reason after confirm
    setValidationError('');
  };

  const wordCount = reason.trim() ? reason.trim().split(/\s+/).length : 0;

  const isDelete = mode === 'delete';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={isDelete ? 'text-red-700' : undefined}>
            {isDelete ? 'Delete Production Batch' : 'Cancel Production Batch'}
          </DialogTitle>
          <DialogDescription className="break-words">
            {isDelete ? (
              <>
                You are about to <strong>delete</strong> batch "
                {batch?.batch_number ? (
                  <TruncatedText text={batch.batch_number} maxLength={50} as="span" className="font-semibold" />
                ) : 'this batch'}
                " which is currently in <strong>{batch?.status}</strong> stage.
                <br /><br />
                This will:
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-sm">
                  <li>Return all reserved and consumed raw materials back to stock</li>
                  <li>Delete any individual products created for this batch</li>
                  <li>Update product stock counts accordingly</li>
                </ul>
                <br />
                The batch record will remain visible to admin for audit. This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to cancel batch "
                {batch?.batch_number ? (
                  <TruncatedText text={batch.batch_number} maxLength={50} as="span" className="font-semibold" />
                ) : 'this batch'}
                "? Allocated materials will be returned to inventory.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{isDelete ? 'Delete' : 'Cancellation'} Reason (Optional)</Label>
          <Textarea
            id="cancel-reason"
            placeholder="E.g., Material shortage, Order cancelled, Mistake..."
            value={reason}
            onChange={handleReasonChange}
            disabled={isDeleting}
            rows={3}
            className={`resize-none ${validationError ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {validationError && (
            <p className="text-xs text-red-600 font-medium">{validationError}</p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Max 20 words, each word max 15 characters</p>
            <p className={`text-xs font-medium ${wordCount > 20 ? 'text-red-600' : 'text-gray-600'}`}>
              {wordCount}/20 words
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Go Back
          </Button>
          <Button
            onClick={handleConfirmClick}
            disabled={isDeleting || !!validationError}
            className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isDelete ? 'Deleting...' : 'Cancelling...'}
              </>
            ) : isDelete ? (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete & Revert
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


