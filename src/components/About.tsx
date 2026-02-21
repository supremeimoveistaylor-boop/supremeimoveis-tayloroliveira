import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Award, TrendingUp } from "lucide-react";
import taylorPhoto from "@/assets/taylor-photo.png";

export const About = () => {
  const features = [
    {
      icon: Shield,
      title: "Confiança e Segurança",
      description: "Transações 100% seguras com acompanhamento jurídico completo"
    },
    {
      icon: Users,
      title: "Atendimento Personalizado",
      description: "Equipe especializada dedicada a encontrar o imóvel ideal para você"
    },
    {
      icon: Award,
      title: "Excelência Reconhecida",
      description: "Prêmios e reconhecimentos pela qualidade dos nossos serviços"
    },
    {
      icon: TrendingUp,
      title: "Conhecimento do Mercado",
      description: "Análises precisas de mercado para as melhores oportunidades"
    }
  ];

  return (
    <section id="sobre" className="py-16 bg-gradient-to-br from-primary via-black-soft to-primary">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            {/* Foto do Taylor - Mobile */}
            <div className="lg:hidden flex justify-center mb-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-accent/30 shadow-xl">
                  <img 
                    src={taylorPhoto} 
                    alt="Taylor Oliveira" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <Award className="w-4 h-4 text-accent-foreground" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white-soft mb-6 text-center lg:text-left">
              Conheça <span className="text-accent">Taylor Oliveira</span>
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed text-center lg:text-left">
              Taylor Oliveira, especialista em imóveis de médio e alto padrão, atuando por 13 anos em coordenação 
              de lançamentos em construtoras de Goiânia e Anápolis. Hoje sendo um dos sócios da Supreme 
              Empreendimentos Imobiliários, atuando diretamente na captação e venda de imóveis de terceiros, 
              casas em condomínio fechado e imóveis de construtoras, lançamentos e imóveis prontos.
            </p>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed text-center lg:text-left">
              Um consultor que faz a diferença no mercado imobiliário, agindo com responsabilidade e confiança. 
              Para morar ou investir você tem uma pessoa altamente capacitada para te ajudar.
            </p>
            
            <div className="mb-8 text-center lg:text-left">
              <h3 className="text-xl font-semibold text-accent mb-4">Especialidades</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Imóveis de médio e alto padrão</li>
                <li>• Coordenação de lançamentos imobiliários</li>
                <li>• Captação e venda de imóveis de terceiros</li>
                <li>• Casas em condomínios fechados</li>
                <li>• Imóveis de construtoras e lançamentos</li>
                <li>• Imóveis prontos para morar</li>
              </ul>
            </div>

            <div className="text-center lg:text-left">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                onClick={() => { if (typeof window.gtag === 'function') window.gtag('event', 'whatsapp_click', { event_category: 'engagement', event_label: 'about' }); window.open('https://wa.me/5562999918353', '_blank'); }}
              >
                Fale com Taylor
              </Button>
            </div>
          </div>

          {/* Right Column - Photo + Features */}
          <div className="space-y-8 mt-8 lg:mt-0">
            {/* Foto do Taylor - Desktop */}
            <div className="hidden lg:flex justify-center">
              <div className="relative">
                <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-accent/30 shadow-2xl">
                  <img 
                    src={taylorPhoto} 
                    alt="Taylor Oliveira" 
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-accent rounded-full flex items-center justify-center shadow-lg">
                  <Award className="w-6 h-6 text-accent-foreground" />
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white-soft/10 backdrop-blur-sm border-white-soft/20 hover:bg-white-soft/20 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-accent rounded-lg mb-4">
                    <feature.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold text-white-soft mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};