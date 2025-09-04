import { Button } from "@/components/ui/button";
import { Phone, MapPin } from "lucide-react";
const supremeLogo = "/lovable-uploads/8ab96aad-518c-449a-982a-50d7595470f9.png";

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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={supremeLogo} 
              alt="Supreme Negócios Imobiliários" 
              className="h-10 md:h-12 lg:h-16 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            <a href="#inicio" className="text-white-soft hover:text-accent transition-colors font-medium text-sm xl:text-base">
              Início
            </a>
            <a href="#comprar" className="text-white-soft hover:text-accent transition-colors font-medium text-sm xl:text-base">
              Comprar
            </a>
            <a href="#alugar" className="text-white-soft hover:text-accent transition-colors font-medium text-sm xl:text-base">
              Alugar
            </a>
            <a href="#rurais" className="text-white-soft hover:text-accent transition-colors font-medium text-sm xl:text-base">
              Propriedades Rurais
            </a>
            <a href="#sobre" className="text-white-soft hover:text-accent transition-colors font-medium text-sm xl:text-base">
              Sobre Nós
            </a>
            <a href="#contato" className="text-white-soft hover:text-accent transition-colors font-medium text-sm xl:text-base">
              Contato
            </a>
          </nav>

          {/* CTA Button */}
          <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold text-sm md:text-base px-4 md:px-6">
            Anuncie seu Imóvel
          </Button>
        </div>
      </div>
    </header>
  );
};