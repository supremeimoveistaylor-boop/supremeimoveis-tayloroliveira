import { Button } from "@/components/ui/button";
import { Phone, MapPin, User, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import supremeLogo from "@/assets/supreme-logo-new.png";

export const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/", label: "Início" },
    { to: "/comprar", label: "Comprar" },
    { to: "/alugar", label: "Alugar" },
    { to: "/rurais", label: "Propriedades Rurais" },
    { to: "/sobre", label: "Sobre Nós" },
    { to: "/contato", label: "Contato" },
  ];

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
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={supremeLogo} 
              alt="Supreme Empreendimentos Imobiliários" 
              className="h-auto w-auto max-h-24 md:max-h-32 lg:max-h-40"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navLinks.map((link) => (
              <Link 
                key={link.to}
                to={link.to} 
                className={`transition-colors font-medium text-sm xl:text-base ${
                  isActive(link.to) 
                    ? "text-accent" 
                    : "text-white-soft hover:text-accent"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex gap-3 items-center">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white-soft hover:text-accent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>

            {user ? (
              <Button 
                variant="outline" 
                className="hidden sm:flex border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                onClick={() => navigate('/dashboard')}
              >
                <User className="mr-2 h-4 w-4" />
                Painel
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="hidden sm:flex border-accent text-accent hover:bg-accent hover:text-accent-foreground"
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
              <span className="hidden sm:inline">Falar com Especialista</span>
              <span className="sm:hidden">WhatsApp</span>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-white-soft/20 pt-4">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link 
                  key={link.to}
                  to={link.to} 
                  className={`py-2 px-4 rounded transition-colors font-medium ${
                    isActive(link.to) 
                      ? "bg-accent text-accent-foreground" 
                      : "text-white-soft hover:bg-white-soft/10"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <Button 
                  variant="outline" 
                  className="mt-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    navigate('/dashboard');
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Painel
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="mt-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    navigate('/auth');
                    setMobileMenuOpen(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  Entrar
                </Button>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};
