import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';

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
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center p-4 bg-gray-900/50">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
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

