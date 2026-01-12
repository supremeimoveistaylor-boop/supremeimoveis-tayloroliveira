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
import { Home, X } from 'lucide-react';

export const ExitPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse moves to top of viewport (exit intent)
    if (e.clientY <= 5 && !hasShown) {
      setShowPopup(true);
      setHasShown(true);
    }
  }, [hasShown]);

  useEffect(() => {
    // Check if popup was already shown this session
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

  const handleStay = () => {
    setShowPopup(false);
    sessionStorage.setItem('exitPopupShown', 'true');
  };

  const handleRedirect = () => {
    setShowPopup(false);
    sessionStorage.setItem('exitPopupShown', 'true');
    // Redirect to home/main page
    window.location.href = window.location.origin + window.location.pathname + '#/';
  };

  return (
    <AlertDialog open={showPopup} onOpenChange={setShowPopup}>
      <AlertDialogContent className="max-w-md bg-background border-2 border-primary/20">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-2xl font-bold text-foreground">
            Espere! Não vá embora ainda!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground text-base mt-2">
            Você está prestes a sair. Temos os melhores imóveis esperando por você! 
            Que tal dar mais uma olhada nas nossas opções exclusivas?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          <Button 
            onClick={handleRedirect}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
          >
            <Home className="w-4 h-4 mr-2" />
            Ver Imóveis Disponíveis
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
