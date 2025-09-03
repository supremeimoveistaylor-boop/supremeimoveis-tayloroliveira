import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Award, TrendingUp } from "lucide-react";

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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white-soft mb-6">
              Por que escolher a <span className="text-accent">Supreme Imóveis</span>?
            </h2>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Há mais de 15 anos no mercado imobiliário de Patos de Minas, a Supreme Negócios Imobiliários 
              se consolidou como referência em qualidade, confiança e resultados. Nossa missão é conectar 
              pessoas aos seus lares ideais, oferecendo o melhor atendimento e as melhores oportunidades 
              do mercado regional.
            </p>
            
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-accent mb-4">Nossa Especialidade</h3>
              <ul className="text-gray-300 space-y-2">
                <li>• Propriedades residenciais de alto padrão</li>
                <li>• Apartamentos modernos no centro da cidade</li>
                <li>• Fazendas e propriedades rurais produtivas</li>
                <li>• Terrenos para investimento e construção</li>
              </ul>
            </div>

            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              Conheça Nossa História
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid sm:grid-cols-2 gap-6">
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
  );
};