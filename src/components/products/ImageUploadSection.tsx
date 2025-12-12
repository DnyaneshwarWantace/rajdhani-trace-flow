import { useState } from 'react';
import { X, Upload, Image, Eye } from 'lucide-react';
import ImageViewDialog from '@/components/ui/ImageViewDialog';

interface ImageUploadSectionProps {
  imagePreview: string;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
}

export default function ImageUploadSection({ imagePreview, onImageUpload, onImageRemove }: ImageUploadSectionProps) {
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      onImageUpload(file);
    }
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Product Image (Optional)
        </label>
        <div className="mt-2">
          {imagePreview ? (
            <div className="relative inline-block group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border border-gray-300 cursor-pointer"
              />
              {/* View Button - appears on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageViewOpen(true);
                }}
                className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                title="View Image"
              >
                <Eye className="w-4 h-4" />
              </button>
              {/* Delete Button */}
              <button
                type="button"
                onClick={onImageRemove}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Remove Image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#1e40af] transition-colors cursor-pointer"
              onClick={() => document.getElementById('product-image')?.click()}
            >
              <Image className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">Click to upload product image</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById('product-image')?.click();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Choose Image
              </button>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Image View Dialog */}
      {imagePreview && (
        <ImageViewDialog
          isOpen={isImageViewOpen}
          onClose={() => setIsImageViewOpen(false)}
          imageUrl={imagePreview}
          alt="Product Image"
        />
      )}
    </>
  );
}
