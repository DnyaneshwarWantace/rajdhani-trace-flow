import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export default function ImageViewDialog({ isOpen, onClose, imageUrl, alt = 'Image' }: ImageViewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-none shadow-none">
        <div className="relative bg-white rounded-lg overflow-hidden">
          <div className="flex items-center justify-center p-4 min-h-[200px] bg-white">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain object-center rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

