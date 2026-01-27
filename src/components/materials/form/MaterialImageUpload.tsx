import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Image, X, Eye } from 'lucide-react';
import React from 'react';
import ImageViewDialog from '@/components/ui/ImageViewDialog';
import { useToast } from '@/hooks/use-toast';

interface MaterialImageUploadProps {
  imagePreview: string;
  onImageChange: (file: File | null) => void;
  onRemove: () => void;
}

export default function MaterialImageUpload({
  imagePreview,
  onImageChange,
  onRemove,
}: MaterialImageUploadProps) {
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);
  const { toast } = useToast();

  const isValidImageFile = (file: File): boolean => {
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidType = validImageTypes.includes(file.type);
    const isValidExtension = validExtensions.includes(fileExtension);
    
    return isValidType || isValidExtension;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (!isValidImageFile(file)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select an image file (JPEG, PNG, GIF, WebP, BMP, or SVG)',
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Image size should be less than 10MB',
          variant: 'destructive',
        });
        e.target.value = '';
        return;
      }
      
      onImageChange(file);
    } else {
      onImageChange(null);
    }
  };

  return (
    <>
      <div>
        <Label>Material Image (Optional)</Label>
        <div className="mt-2">
          {imagePreview ? (
            <div className="relative group inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border cursor-pointer"
              />
              {/* View Button - appears on hover */}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 left-2 h-7 w-7 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageViewOpen(true);
                }}
                title="View Image"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {/* Delete Button */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={onRemove}
                title="Remove Image"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-2">Click to upload image</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('material-image-upload')?.click()}
              >
                <Image className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <input
                id="material-image-upload"
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
          alt="Material Image"
        />
      )}
    </>
  );
}

