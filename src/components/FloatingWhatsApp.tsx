import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FloatingWhatsApp = () => {
  const handleWhatsAppClick = () => {
    // Link editável do WhatsApp - substitua pelo seu link personalizado
    window.open('https://wa.me/5562999918353?text=Olá! Tenho interesse em conhecer os imóveis da Supreme Negócios Imobiliários.', '_blank');
  };

  return (
    <Button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 rounded-full p-4 bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
      size="lg"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
};