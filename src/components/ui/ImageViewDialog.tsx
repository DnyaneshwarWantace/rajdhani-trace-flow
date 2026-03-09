import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ImageViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
  /** Optional caption shown below the image (e.g. product name) */
  caption?: string;
}

export default function ImageViewDialog({
  isOpen,
  onClose,
  imageUrl,
  alt = 'Image',
  caption,
}: ImageViewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        customLayout
        className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border border-gray-200 bg-white shadow-xl rounded-lg"
      >
        {/* Scrollable area: image + optional caption — no cropping */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 flex flex-col items-center p-6">
          <div className="flex items-center justify-center w-full min-h-[120px]">
            <img
              src={imageUrl}
              alt={alt}
              className="max-w-full w-auto h-auto max-h-[75vh] object-contain object-center rounded-md"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          {caption && (
            <p className="mt-4 text-sm text-gray-600 text-center w-full border-t border-gray-100 pt-4">
              {caption}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
