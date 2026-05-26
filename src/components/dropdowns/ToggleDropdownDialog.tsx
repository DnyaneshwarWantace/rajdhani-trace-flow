import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DropdownOption } from '@/types/dropdown';

interface ToggleDropdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: DropdownOption | null;
  onConfirm: (option: DropdownOption) => Promise<void>;
}

export default function ToggleDropdownDialog({
  open,
  onOpenChange,
  option,
  onConfirm,
}: ToggleDropdownDialogProps) {
  const isDeactivating = option?.is_active ?? true;

  const handleConfirm = async () => {
    if (!option) return;
    await onConfirm(option);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDeactivating ? 'Deactivate Option' : 'Activate Option'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeactivating
              ? `Are you sure you want to deactivate "${option?.value}"? It will be hidden from all new entry dropdowns but existing records will keep it.`
              : `Are you sure you want to activate "${option?.value}"? It will become available in all dropdowns again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={isDeactivating ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
          >
            {isDeactivating ? 'Deactivate' : 'Activate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
