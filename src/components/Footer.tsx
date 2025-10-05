import { Facebook, Instagram, Linkedin, Phone, Mail, MapPin } from "lucide-react";
const supremeLogo = "/lovable-uploads/04663de4-8269-49df-b13d-565420c29dd2.png";

export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <img 
              src={supremeLogo} 
              alt="Supreme Negócios Imobiliários" 
              className="h-12 w-auto"
            />
            <p className="text-gray-300 text-sm leading-relaxed">
              Há mais de 15 anos conectando pessoas aos seus lares ideais em Goiânia - Goiás e região. 
              Especialistas em propriedades de qualidade.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-accent transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/taylorimoveis/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-accent transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-300 hover:text-accent transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-white-soft mb-4">Nossos Serviços</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Compra e Venda</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Locação</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Propriedades Rurais</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Avaliação Gratuita</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Consultoria Jurídica</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Financiamento</a></li>
            </ul>
          </div>

          {/* Property Types */}
          <div>
            <h4 className="font-semibold text-white-soft mb-4">Tipos de Imóveis</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Casas</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Apartamentos</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Fazendas</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Chácaras</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Terrenos</a></li>
              <li><a href="#" className="text-gray-300 hover:text-accent transition-colors">Comerciais</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white-soft mb-4">Contato</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-accent" />
                <a href="https://wa.me/5562999918353" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-accent transition-colors">(62) 99991-8353</a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-accent" />
                <span className="text-gray-300">supremeimoveis.taylor@gmail.com</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <span className="text-gray-300">
                  Av T-2 número 816 Sala 06<br />
                  Setor Bueno<br />
                  CEP: 74210-010 - Goiânia - Goiás
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white-soft/20 mt-8 pt-8 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-300 text-sm">
              © 2024 Supreme Negócios Imobiliários. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-300 hover:text-accent transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="text-gray-300 hover:text-accent transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-gray-300 hover:text-accent transition-colors">
                Creci 20.316
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};