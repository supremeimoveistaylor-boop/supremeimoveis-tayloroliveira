import { Button } from "@/components/ui/button";
import { Phone, MapPin, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import supremeLogo from "@/assets/supreme-logo-new.png";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
      {/* Top bar with contact info */}
      <div className="bg-black-soft">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" />
                <a href="https://wa.me/5562999918353" target="_blank" rel="noopener noreferrer" className="text-white-soft hover:text-accent transition-colors">(62) 99991-8353</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                <span className="text-white-soft">Goiânia, GO</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="text-accent font-medium">Especialista em Imóveis de Qualidade e Com Segurança</span>
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
              alt="Supreme Empreendimentos Imobiliários" 
              className="h-auto w-auto max-h-32 md:max-h-40 lg:max-h-48"
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

          {/* CTA Buttons */}
          <div className="flex gap-3 items-center">
            {user ? (
              <Button 
                variant="outline" 
                className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                onClick={() => navigate('/dashboard')}
              >
                <User className="mr-2 h-4 w-4" />
                Painel
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                onClick={() => navigate('/auth')}
              >
                <User className="mr-2 h-4 w-4" />
                Entrar
              </Button>
            )}
            <Button 
              variant="default" 
              className="bg-green-600 hover:bg-green-700 text-white font-semibold text-sm md:text-base px-4 md:px-6"
              onClick={() => window.open('https://wa.me/5562999918353', '_blank')}
            >
              Falar com Especialista
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};