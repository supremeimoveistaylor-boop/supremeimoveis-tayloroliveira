import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FeaturedProperties } from '@/components/FeaturedProperties';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, ArrowRight, Star, Phone } from 'lucide-react';
import { neighborhoods, streets, pois, regions, CITY, CANONICAL_BASE, getRelatedLocations, type GeoPageType } from '@/lib/geo-locations';
import { GeoInternalLinks } from '@/components/geo/GeoInternalLinks';
import { GeoCTA } from '@/components/geo/GeoCTA';

const GeoLanding = () => {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  const navigate = useNavigate();

  const pageType = type as GeoPageType;

  // Find location data
  const neighborhood = pageType === 'bairro' ? neighborhoods.find(n => n.slug === slug) : null;
  const street = pageType === 'rua' ? streets.find(s => s.slug === slug) : null;
  const poi = pageType === 'perto' ? pois.find(p => p.slug === slug) : null;
  const region = pageType === 'regiao' ? regions.find(r => r.slug === slug) : null;

  const locationData = neighborhood || street || poi || region;

  useEffect(() => {
    if (!locationData) return;

    let title = '';
    let description = '';

    if (neighborhood) {
      title = `Imóveis no ${neighborhood.name} em ${CITY} | Apartamentos, Casas e Terrenos`;
      description = `Encontre imóveis no ${neighborhood.name}, ${CITY}. ${neighborhood.description.slice(0, 120)}`;
    } else if (street) {
      title = `Imóveis na ${street.name} em ${CITY} | Supreme Negócios Imobiliários`;
      description = `Apartamentos e casas na ${street.name}, ${street.neighborhood}, ${CITY}. ${street.description.slice(0, 100)}`;
    } else if (poi) {
      title = `Imóveis perto do ${poi.name} em ${CITY} | Supreme Negócios Imobiliários`;
      description = `Encontre imóveis próximos ao ${poi.name} em ${CITY}. ${poi.description.slice(0, 100)}`;
    } else if (region) {
      title = `Imóveis na ${region.name} de ${CITY} | Supreme Negócios Imobiliários`;
      description = `Explore imóveis na ${region.name} de ${CITY}. Bairros: ${region.neighborhoods.join(', ')}.`;
    }

    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);

    window.scrollTo(0, 0);
  }, [locationData, slug]);

  if (!locationData) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Localização não encontrada</h1>
          <Button onClick={() => navigate('/busca-mapa')}>Ver Mapa de Imóveis</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const locationName = 'name' in locationData ? locationData.name : '';
  const locationDesc = 'description' in locationData ? locationData.description : '';
  const relatedLinks = getRelatedLocations(slug || '', 8);

  // Build JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "Supreme Negócios Imobiliários",
    "url": `${CANONICAL_BASE}/#/imoveis/${type}/${slug}`,
    "areaServed": {
      "@type": "Place",
      "name": `${locationName}, ${CITY}, GO`,
    },
    "description": locationDesc,
  };

  const faqItems = [
    {
      q: `Quanto custa um imóvel no ${locationName}?`,
      a: `Os preços de imóveis no ${locationName} em ${CITY} variam conforme o tipo e metragem. Apartamentos podem partir de R$ 250.000 e casas de R$ 400.000. Consulte nosso catálogo atualizado.`,
    },
    {
      q: `O ${locationName} é um bom lugar para morar?`,
      a: `${locationDesc} É uma excelente escolha para quem busca qualidade de vida em ${CITY}.`,
    },
    {
      q: `Como encontrar imóveis à venda no ${locationName}?`,
      a: `Utilize nosso mapa interativo ou entre em contato com nossos corretores especializados na região do ${locationName}.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-accent">Início</Link>
            <span className="mx-2">/</span>
            <Link to="/busca-mapa" className="hover:text-accent">Mapa</Link>
            <span className="mx-2">/</span>
            <span className="text-accent">{locationName}</span>
          </nav>

          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-accent text-accent-foreground">
              <MapPin className="h-3 w-3 mr-1" />
              {pageType === 'bairro' ? 'Bairro' : pageType === 'rua' ? 'Rua' : pageType === 'perto' ? 'Ponto de Interesse' : 'Região'}
            </Badge>
            {neighborhood && <Badge variant="outline" className="border-accent text-accent">{neighborhood.region}</Badge>}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Imóveis {pageType === 'perto' ? 'perto do' : pageType === 'rua' ? 'na' : 'no'}{' '}
            <span className="text-accent">{locationName}</span>
            <span className="block text-xl md:text-2xl mt-2 font-normal text-muted-foreground">em {CITY}, GO</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">{locationDesc}</p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/busca-mapa">
                <MapPin className="h-4 w-4 mr-2" />
                Ver no Mapa
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10">
              <Link to="/contato">
                <Phone className="h-4 w-4 mr-2" />
                Falar com Corretor
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Properties */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">
            <Home className="inline h-6 w-6 text-accent mr-2" />
            Imóveis Disponíveis {pageType === 'perto' ? `perto do ${locationName}` : `no ${locationName}`}
          </h2>
          <FeaturedProperties />
        </div>
      </section>

      {/* CTA Captação */}
      <GeoCTA locationName={locationName} />

      {/* FAQ */}
      <section className="py-12 bg-secondary">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Perguntas Frequentes sobre {locationName}</h2>
          <div className="space-y-4">
            {faqItems.map((faq, i) => (
              <details key={i} className="bg-card rounded-lg border border-border p-4 group">
                <summary className="font-semibold cursor-pointer flex items-center justify-between">
                  {faq.q}
                  <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related Locations */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Explore Outras Localizações em {CITY}</h2>
          <GeoInternalLinks variant="compact" exclude={slug} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default GeoLanding;
