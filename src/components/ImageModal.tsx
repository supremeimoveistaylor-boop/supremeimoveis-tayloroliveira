import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  propertyTitle: string;
  initialIndex?: number;
}

export const ImageModal = ({ 
  isOpen, 
  onClose, 
  images, 
  propertyTitle,
  initialIndex = 0 
}: ImageModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-4xl w-full p-0 bg-black/95 border-none h-[90vh] md:h-auto">
        <div className="relative h-full flex flex-col">
          {/* Close button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 md:top-4 md:right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image container */}
          <div className="relative flex-1 flex items-center justify-center min-h-0">
            <img
              src={images[currentIndex]}
              alt={`${propertyTitle} - Foto ${currentIndex + 1}`}
              className="w-full h-full max-h-[70vh] md:max-h-[75vh] object-contain"
            />
            
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Image counter and thumbnails */}
          {images.length > 1 && (
            <div className="p-2 md:p-4 flex-shrink-0">
              {/* Counter */}
              <div className="text-center text-white/80 mb-2 md:mb-4 text-sm md:text-base">
                {currentIndex + 1} de {images.length} fotos
              </div>
              
              {/* Thumbnails */}
              <div className="flex justify-center gap-1 md:gap-2 overflow-x-auto max-w-full pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-12 h-9 md:w-16 md:h-12 rounded border-2 overflow-hidden transition-all ${
                      index === currentIndex ? 'border-white scale-105' : 'border-white/30'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};