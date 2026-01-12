import { useState, useEffect, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Home, X, ChevronLeft, ChevronRight, Bed, Bath, Maximize } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  images: string[] | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
}

export const ExitPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  const fetchLatestProperties = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get_public_properties', {
        body: { limit: 5 }
      });
      
      if (error) throw error;
      if (data) {
        setProperties(data);
      }
    } catch (error) {
      console.error('Error fetching properties for popup:', error);
    }
  };

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 5 && !hasShown) {
      setShowPopup(true);
      setHasShown(true);
      fetchLatestProperties();
    }
  }, [hasShown]);

  useEffect(() => {
    const popupShown = sessionStorage.getItem('exitPopupShown');
    if (popupShown) {
      setHasShown(true);
      return;
    }

    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseLeave]);

  // Auto-rotate properties every 3 seconds
  useEffect(() => {
    if (!showPopup || properties.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % properties.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [showPopup, properties.length]);

  const handleStay = () => {
    setShowPopup(false);
    sessionStorage.setItem('exitPopupShown', 'true');
  };

  const handleViewProperty = () => {
    if (properties[currentIndex]) {
      setShowPopup(false);
      sessionStorage.setItem('exitPopupShown', 'true');
      navigate(`/property/${properties[currentIndex].id}`);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + properties.length) % properties.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % properties.length);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const currentProperty = properties[currentIndex];

  return (
    <AlertDialog open={showPopup} onOpenChange={setShowPopup}>
      <AlertDialogContent className="max-w-lg bg-background border-2 border-primary/20 p-0 overflow-hidden">
        <AlertDialogHeader className="text-center p-4 pb-2">
          <AlertDialogTitle className="text-xl font-bold text-foreground">
            Espere! Confira nossos imóveis em destaque!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-sm">
            Veja os últimos imóveis adicionados à nossa plataforma
          </AlertDialogDescription>
        </AlertDialogHeader>

        {currentProperty && (
          <div className="relative px-4">
            {/* Property Card */}
            <div className="relative rounded-lg overflow-hidden bg-muted">
              <div className="aspect-video relative">
                <img
                  src={currentProperty.images?.[0] || '/placeholder.svg'}
                  alt={currentProperty.title}
                  className="w-full h-full object-cover"
                />
                {/* Navigation arrows */}
                {properties.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
                {/* Price badge */}
                <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground px-3 py-1 rounded-md font-bold text-lg">
                  {formatPrice(currentProperty.price)}
                </div>
              </div>
              
              <div className="p-3">
                <h3 className="font-semibold text-foreground truncate">{currentProperty.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{currentProperty.location}</p>
                
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  {currentProperty.bedrooms && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-4 h-4" /> {currentProperty.bedrooms}
                    </span>
                  )}
                  {currentProperty.bathrooms && (
                    <span className="flex items-center gap-1">
                      <Bath className="w-4 h-4" /> {currentProperty.bathrooms}
                    </span>
                  )}
                  {currentProperty.area && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" /> {currentProperty.area}m²
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dots indicator */}
            {properties.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {properties.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col p-4 pt-3">
          <Button 
            onClick={handleViewProperty}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
          >
            <Home className="w-4 h-4 mr-2" />
            Ver Este Imóvel
          </Button>
          <Button 
            variant="outline" 
            onClick={handleStay}
            className="w-full border-muted-foreground/30 text-muted-foreground hover:bg-muted"
          >
            <X className="w-4 h-4 mr-2" />
            Continuar navegando
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
