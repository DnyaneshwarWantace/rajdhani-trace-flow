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

interface DeleteDropdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  option: DropdownOption | null;
  onDelete: (id: string) => Promise<void>;
}

export default function DeleteDropdownDialog({
  open,
  onOpenChange,
  option,
  onDelete,
}: DeleteDropdownDialogProps) {
  const handleDelete = async () => {
    if (!option) return;
    // Prefer custom id field, fallback to _id
    const idToDelete = option.id || option._id;
    await onDelete(idToDelete);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Option</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{option?.value}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

