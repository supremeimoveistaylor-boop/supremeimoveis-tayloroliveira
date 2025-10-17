import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, GripVertical } from 'lucide-react';

interface DraggableImageGalleryProps {
  images: Array<File | string>;
  onImagesChange: (images: Array<File | string>) => void;
  onImageUpload: (files: File[]) => void;
  maxImages?: number;
  existingLabel?: string;
  newLabel?: string;
}

export const DraggableImageGallery = ({
  images,
  onImagesChange,
  onImageUpload,
  maxImages = 20,
  existingLabel = "Fotos do Imóvel",
  newLabel = "Adicionar fotos"
}: DraggableImageGalleryProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    
    // Remove from old position
    newImages.splice(draggedIndex, 1);
    // Insert at new position
    newImages.splice(dropIndex, 0, draggedItem);
    
    onImagesChange(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('Files selected in gallery:', files.length);
    
    // Limit selection to prevent overwhelming the browser
    const remainingSlots = maxImages - images.length;
    if (files.length > remainingSlots) {
      console.warn(`Limiting selection to ${remainingSlots} files`);
    }
    
    const filesToUpload = files.slice(0, remainingSlots);
    
    if (filesToUpload.length > 0) {
      onImageUpload(filesToUpload);
    }
    // Reset input to allow selecting the same files again
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const getImageUrl = (image: File | string): string => {
    if (typeof image === 'string') {
      return image;
    }
    try {
      return URL.createObjectURL(image);
    } catch (error) {
      console.error('Error creating object URL:', error);
      return '';
    }
  };

  return (
    <div className="space-y-4">
      <Label>{existingLabel}</Label>
      
      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Arraste as fotos para reordenar. A primeira foto será a capa do anúncio.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group cursor-move transition-all
                  ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                  ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-primary' : ''}
                `}
              >
                {/* Drag Handle */}
                <div className="absolute top-2 left-2 z-10 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>
                
                {/* Image Number Badge */}
                <div className="absolute top-2 right-10 z-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                  {index + 1}
                </div>
                
                {/* First Image Badge */}
                {index === 0 && (
                  <div className="absolute bottom-2 left-2 z-10 bg-accent text-accent-foreground text-xs px-2 py-1 rounded font-medium">
                    Capa
                  </div>
                )}
                
                {/* Image */}
                <img
                  src={getImageUrl(image)}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md"
                />
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Section */}
      {images.length < maxImages && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-sm text-muted-foreground mb-2">
              {images.length === 0 
                ? `Clique para selecionar ou arraste as imagens aqui (máximo ${maxImages} fotos)`
                : `Adicionar mais fotos (${images.length}/${maxImages})`
              }
            </div>
            <div className="text-xs text-muted-foreground mb-4">
              A primeira foto será usada como capa do anúncio
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload">
              <Button type="button" variant="outline" asChild>
                <span>{newLabel}</span>
              </Button>
            </label>
          </div>
        </div>
      )}

      {images.length >= maxImages && (
        <p className="text-sm text-muted-foreground text-center">
          Limite máximo de {maxImages} fotos atingido
        </p>
      )}
    </div>
  );
};