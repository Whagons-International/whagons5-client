import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Plus, Trash2, Image, Loader2, Cake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/providers/LanguageProvider';
import { genericActions } from '@/store/genericSlices';
import { uploadFile, UploadedFile } from '@/api/assetApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface BirthdayImage {
  id: string | number;
  file_path: string;
  file_name: string;
  is_bundled: boolean;
}

interface BirthdayImagesManagerProps {
  boardId: number;
  customImages: BirthdayImage[];
  currentUserId: number;
  onImagesChange?: () => void;
}

// Bundled images list - these come with the app (served from public folder)
const BUNDLED_IMAGES: BirthdayImage[] = [
  { id: 'bundled_birthday-balloons', file_name: 'birthday-balloons.svg', file_path: '/images/birthday/birthday-balloons.svg', is_bundled: true },
  { id: 'bundled_birthday-cake', file_name: 'birthday-cake.svg', file_path: '/images/birthday/birthday-cake.svg', is_bundled: true },
  { id: 'bundled_birthday-confetti', file_name: 'birthday-confetti.svg', file_path: '/images/birthday/birthday-confetti.svg', is_bundled: true },
  { id: 'bundled_birthday-celebration', file_name: 'birthday-celebration.svg', file_path: '/images/birthday/birthday-celebration.svg', is_bundled: true },
  { id: 'bundled_birthday-party', file_name: 'birthday-party.svg', file_path: '/images/birthday/birthday-party.svg', is_bundled: true },
  { id: 'bundled_birthday-stars', file_name: 'birthday-stars.svg', file_path: '/images/birthday/birthday-stars.svg', is_bundled: true },
  { id: 'bundled_birthday-fireworks', file_name: 'birthday-fireworks.svg', file_path: '/images/birthday/birthday-fireworks.svg', is_bundled: true },
  { id: 'bundled_birthday-gift', file_name: 'birthday-gift.svg', file_path: '/images/birthday/birthday-gift.svg', is_bundled: true },
];

export function BirthdayImagesManager({
  boardId,
  customImages,
  currentUserId,
  onImagesChange,
}: BirthdayImagesManagerProps) {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<BirthdayImage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string | number>>(new Set());

  const allImages = [...BUNDLED_IMAGES, ...customImages.map(img => ({ ...img, is_bundled: false }))];

  const handleImageError = (imageId: string | number) => {
    setFailedImages(prev => new Set(prev).add(imageId));
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('boards.birthday.invalidFileType', 'Please select an image file'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('boards.birthday.fileTooLarge', 'File size must be less than 5MB'));
      return;
    }

    setIsUploading(true);
    try {
      // Upload file
      const uploadResult: UploadedFile = await uploadFile(file);
      
      // Create birthday image record
      await dispatch(genericActions.boardBirthdayImages.addAsync({
        board_id: boardId,
        file_path: uploadResult.url || uploadResult.imgproxy_url || '',
        file_name: file.name,
        uploaded_by: currentUserId,
      }) as any);

      onImagesChange?.();
    } catch (error) {
      console.error('Failed to upload birthday image:', error);
      alert(t('boards.birthday.uploadFailed', 'Failed to upload image'));
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm(t('boards.birthday.confirmDelete', 'Are you sure you want to delete this image?'))) {
      return;
    }

    setDeletingId(imageId);
    try {
      await dispatch(genericActions.boardBirthdayImages.removeAsync(imageId) as any);
      onImagesChange?.();
    } catch (error) {
      console.error('Failed to delete birthday image:', error);
      alert(t('boards.birthday.deleteFailed', 'Failed to delete image'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{t('boards.birthday.imagesTitle', 'Birthday Images')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('boards.birthday.imagesDescription', 'Images used for automatic birthday posts')}
          </p>
        </div>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button variant="outline" size="sm" disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="size-4 mr-1 animate-spin" />
            ) : (
              <Plus className="size-4 mr-1" />
            )}
            {t('boards.birthday.uploadImage', 'Upload')}
          </Button>
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-4 gap-3">
        {allImages.map((image) => (
          <div
            key={image.id}
            className={cn(
              "relative aspect-square rounded-lg border overflow-hidden cursor-pointer group",
              "hover:ring-2 hover:ring-primary/50 transition-all",
              image.is_bundled ? "border-muted" : "border-primary/30"
            )}
            onClick={() => setPreviewImage(image)}
          >
            {failedImages.has(image.id) ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50">
                <Cake className="size-8 text-muted-foreground mb-1" />
                <span className="text-[10px] text-muted-foreground text-center px-1 truncate max-w-full">
                  {image.file_name}
                </span>
              </div>
            ) : (
              <img
                src={image.file_path}
                alt={image.file_name}
                className="w-full h-full object-cover"
                onError={() => handleImageError(image.id)}
              />
            )}
            
            {/* Badge for bundled vs custom */}
            <div className={cn(
              "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
              image.is_bundled 
                ? "bg-muted text-muted-foreground" 
                : "bg-primary text-primary-foreground"
            )}>
              {image.is_bundled 
                ? t('boards.birthday.bundled', 'Bundled')
                : t('boards.birthday.custom', 'Custom')
              }
            </div>

            {/* Delete button for custom images */}
            {!image.is_bundled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImage(image.id as number);
                }}
                disabled={deletingId === image.id}
                className={cn(
                  "absolute top-1 right-1 p-1 rounded bg-destructive/80 text-destructive-foreground",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-destructive"
                )}
              >
                {deletingId === image.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Trash2 className="size-3" />
                )}
              </button>
            )}
          </div>
        ))}

        {/* Empty state */}
        {allImages.length === 0 && (
          <div className="col-span-4 py-8 text-center text-muted-foreground">
            <Image className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('boards.birthday.noImages', 'No birthday images available')}</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewImage?.file_name}</DialogTitle>
            <DialogDescription>
              {previewImage?.is_bundled 
                ? t('boards.birthday.bundledImage', 'This is a bundled image that comes with the app')
                : t('boards.birthday.customImage', 'This is a custom image uploaded by your team')
              }
            </DialogDescription>
          </DialogHeader>
          {previewImage && (
            <div className="flex justify-center">
              {failedImages.has(previewImage.id) ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-lg">
                  <Cake className="size-16 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">{previewImage.file_name}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {t('boards.birthday.imageNotAvailable', 'Image not available')}
                  </span>
                </div>
              ) : (
                <img
                  src={previewImage.file_path}
                  alt={previewImage.file_name}
                  className="max-w-full max-h-[400px] rounded-lg"
                  onError={() => handleImageError(previewImage.id)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
