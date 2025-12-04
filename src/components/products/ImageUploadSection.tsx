import { X, Upload, Image } from 'lucide-react';

interface ImageUploadSectionProps {
  imagePreview: string;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
}

export default function ImageUploadSection({ imagePreview, onImageUpload, onImageRemove }: ImageUploadSectionProps) {
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
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Product Image (Optional)
      </label>
      <div className="mt-2">
        {imagePreview ? (
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={onImageRemove}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
  );
}
