import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
const supremeLogo = "/lovable-uploads/ce367a19-282b-4c2e-a287-ee81e326a182.png";

export const Header = () => {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
      {/* Top bar with contact info */}
      <div className="bg-black-soft">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <span className="text-white-soft">(62) 99991-8353</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="text-white-soft">Goiânia, GO</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="text-accent font-medium">Especialistas em Imóveis de Qualidade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={supremeLogo} 
              alt="Supreme Negócios Imobiliários" 
              className="h-12 md:h-16 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-white-soft hover:text-accent transition-colors font-medium">
              Início
            </a>
            <a href="#comprar" className="text-white-soft hover:text-accent transition-colors font-medium">
              Comprar
            </a>
            <a href="#alugar" className="text-white-soft hover:text-accent transition-colors font-medium">
              Alugar
            </a>
            <a href="#rurais" className="text-white-soft hover:text-accent transition-colors font-medium">
              Propriedades Rurais
            </a>
            <a href="#sobre" className="text-white-soft hover:text-accent transition-colors font-medium">
              Sobre Nós
            </a>
            <a href="#contato" className="text-white-soft hover:text-accent transition-colors font-medium">
              Contato
            </a>
          </nav>

          {/* CTA Button */}
          <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
            Anuncie seu Imóvel
          </Button>
        </div>
      </div>
    </header>
  );
};