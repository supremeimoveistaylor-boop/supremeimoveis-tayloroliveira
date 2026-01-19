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
      <DialogContent className="max-w-[100vw] md:max-w-[90vw] lg:max-w-5xl w-full p-0 bg-black/95 border-none h-[100dvh] md:h-[90vh] flex flex-col overflow-hidden">
        <div className="relative flex-1 flex flex-col min-h-0 w-full">
          {/* Close button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 md:top-4 md:right-4 z-20 bg-white/10 hover:bg-white/20 text-white rounded-full p-2"
            onClick={onClose}
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          {/* Image container - takes remaining space */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 w-full p-4 md:p-8">
            <img
              src={images[currentIndex]}
              alt={`${propertyTitle} - Foto ${currentIndex + 1}`}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{ maxHeight: 'calc(100dvh - 140px)', maxWidth: 'calc(100vw - 32px)' }}
            />
            
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 md:p-3 z-10"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 md:p-3 z-10"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Image counter and thumbnails - fixed at bottom */}
          {images.length > 1 && (
            <div className="flex-shrink-0 bg-black/80 p-3 md:p-4">
              {/* Counter */}
              <div className="text-center text-white/90 mb-2 text-sm md:text-base font-medium">
                {currentIndex + 1} de {images.length} fotos
              </div>
              
              {/* Thumbnails */}
              <div className="flex justify-start md:justify-center gap-2 overflow-x-auto max-w-full pb-1 px-2 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-14 h-10 md:w-20 md:h-14 rounded border-2 overflow-hidden transition-all ${
                      index === currentIndex ? 'border-white scale-105' : 'border-white/30 opacity-70 hover:opacity-100'
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