import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductionDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Production Batch</DialogTitle>
          <DialogDescription className="break-words">
            Are you sure you want to delete batch "
            {batch?.batch_number ? (
              <TruncatedText text={batch.batch_number} maxLength={50} as="span" className="font-semibold" />
            ) : (
              'this batch'
            )}
            "? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


