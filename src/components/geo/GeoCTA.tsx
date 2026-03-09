import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, TrendingUp } from 'lucide-react';

interface GeoCTAProps {
  locationName: string;
}

export const GeoCTA = ({ locationName }: GeoCTAProps) => (
  <section className="py-16 bg-primary text-primary-foreground">
    <div className="container mx-auto px-4 text-center">
      <TrendingUp className="h-12 w-12 text-accent mx-auto mb-4" />
      <h2 className="text-2xl md:text-3xl font-bold mb-3">
        Tem um imóvel no <span className="text-accent">{locationName}</span>?
      </h2>
      <p className="text-lg text-muted-foreground mb-6 max-w-xl mx-auto">
        Descubra quanto vale seu imóvel com nossa avaliação gratuita. Milhares de proprietários já utilizaram nosso simulador.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/avaliar-imovel">
            <Home className="h-5 w-5 mr-2" />
            Avaliar Meu Imóvel Grátis
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-accent text-accent hover:bg-accent/10">
          <Link to="/contato">Falar com Especialista</Link>
        </Button>
      </div>
    </div>
  </section>
);
