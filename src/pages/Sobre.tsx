import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Award, TrendingUp } from "lucide-react";

const Sobre = () => {
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary via-black-soft to-primary">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Content */}
              <div className="text-center lg:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-white-soft mb-6">
                  Conheça <span className="text-accent">Taylor Oliveira</span>
                </h1>
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  Taylor Oliveira, especialista em imóveis de médio e alto padrão, atuando por 13 anos em coordenação 
                  de lançamentos em construtoras de Goiânia e Anápolis. Hoje sendo um dos sócios da Supreme 
                  Empreendimentos Imobiliários, atuando diretamente na captação e venda de imóveis de terceiros, 
                  casas em condomínio fechado e imóveis de construtoras, lançamentos e imóveis prontos.
                </p>
                <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                  Um consultor que faz a diferença no mercado imobiliário, agindo com responsabilidade e confiança. 
                  Para morar ou investir você tem uma pessoa altamente capacitada para te ajudar.
                </p>
                
                <div className="mb-8">
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

                <Button 
                  size="lg" 
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  onClick={() => window.open('https://wa.me/5562999918353', '_blank')}
                >
                  Fale com Taylor
                </Button>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8 lg:mt-0">
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
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-white-soft">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-primary mb-6">
                Nossa <span className="text-accent">Missão</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Conectar pessoas aos seus sonhos imobiliários com excelência, transparência e segurança. 
                Oferecemos um atendimento personalizado que vai além da simples transação comercial, 
                construindo relacionamentos duradouros baseados na confiança e resultados.
              </p>
              
              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <div className="text-4xl font-bold text-accent mb-2">500+</div>
                  <div className="text-muted-foreground">Imóveis Vendidos</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-accent mb-2">13+</div>
                  <div className="text-muted-foreground">Anos de Experiência</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-accent mb-2">100%</div>
                  <div className="text-muted-foreground">Satisfação</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      
    </div>
  );
};

export default Sobre;
