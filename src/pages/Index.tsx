import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { FeaturedProperties } from "@/components/FeaturedProperties";
import { PropertyMap } from "@/components/PropertyMap";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FinancingSection } from "@/components/financing";
import { RealEstateChat } from "@/components/RealEstateChat";
import { GeoInternalLinks } from "@/components/geo/GeoInternalLinks";
import { GeoCTA } from "@/components/geo/GeoCTA";

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
interface Property {
  id: string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  price: number;
  purpose: string;
  property_type: string;
}

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [purposeFilter, setPurposeFilter] = useState<"sale" | "rent" | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const propertyId = params.get('property');
      if (propertyId) {
        navigate(`/property/${propertyId}`, { replace: true });
        return;
      }
    } catch {}

    // Handle route-based shortcuts: /comprar, /alugar, /rurais
    if (location.pathname === '/comprar') {
      setPurposeFilter('sale');
      setTimeout(() => document.getElementById('imoveis')?.scrollIntoView({ behavior: 'smooth' }), 0);
    } else if (location.pathname === '/alugar') {
      setPurposeFilter('rent');
      setTimeout(() => document.getElementById('imoveis')?.scrollIntoView({ behavior: 'smooth' }), 0);
    } else if (location.pathname === '/rurais') {
      setPurposeFilter(null);
      setTimeout(() => document.getElementById('imoveis')?.scrollIntoView({ behavior: 'smooth' }), 0);
    }

    // Fetch properties for map
    fetchProperties();
  }, [navigate, location.pathname]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get_public_properties', {
        body: { limit: 500, include_all_statuses: true },
      });

      if (error) throw error;
      const items = ((data as any)?.data || []) as Property[];
      setProperties(items);
    } catch (error) {
      console.error('Error fetching properties for map:', error);
    }
  };

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/property/${propertyId}`);
  };

  return (
    <div className="min-h-screen">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": "Supreme Negócios Imobiliários",
        "url": "https://supremeempreendimentos.com",
        "logo": "https://supremeempreendimentos.com/favicon-512x512.png",
        "description": "Imobiliária especializada em casas de alto padrão e imóveis de luxo em Goiânia. Condomínios fechados exclusivos nos melhores bairros.",
        "telephone": "+55-62-99991-8353",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Goiânia",
          "addressRegion": "GO",
          "addressCountry": "BR"
        },
        "areaServed": {
          "@type": "City",
          "name": "Goiânia"
        },
        "priceRange": "$$$$",
        "sameAs": ["https://wa.me/5562999918353"]
      })}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Quanto custa uma casa de alto padrão em Goiânia?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Casas de alto padrão em Goiânia variam de R$ 1,5 milhão a R$ 15 milhões, dependendo da localização, tamanho e acabamentos. Condomínios como Aldeia do Vale e Alphaville Flamboyant possuem opções a partir de R$ 2 milhões."
            }
          },
          {
            "@type": "Question",
            "name": "Quais os melhores condomínios fechados em Goiânia?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Os condomínios fechados mais valorizados em Goiânia são Aldeia do Vale, Alphaville Flamboyant, Portal do Sol Green, Jardins Atenas e Jardins Paris. Oferecem segurança 24h, áreas de lazer completas e localização privilegiada."
            }
          },
          {
            "@type": "Question",
            "name": "Vale a pena investir em imóveis de luxo em Goiânia?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sim. Goiânia apresenta valorização imobiliária acima da média nacional, especialmente nos bairros nobres como Setor Marista, Jardim Goiás e Setor Bueno. Imóveis de alto padrão têm liquidez alta e excelente retorno sobre investimento."
            }
          }
        ]
      })}} />
      <Header />
      <Hero />
      <div id="imoveis">
        <FeaturedProperties filterPurpose={purposeFilter || undefined} />
      </div>
      
      {/* Map Section */}
      {properties.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
           <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                Encontre <span className="text-accent">Imóveis de Luxo</span> em Goiânia no Mapa
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Casas de alto padrão e condomínios fechados nos bairros mais nobres de Goiânia
              </p>
            </div>
            <PropertyMap 
              properties={properties} 
              onPropertyClick={handlePropertyClick}
            />
          </div>
        </section>
      )}
      
      {/* Financing Simulator Section */}
      <FinancingSection />

      {/* Geo CTA */}
      <GeoCTA locationName="Goiânia" />

      {/* Geo SEO Links */}
      <section className="py-12 bg-secondary">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Casas de Alto Padrão por Bairro em Goiânia</h2>
          <GeoInternalLinks variant="full" />
        </div>
      </section>

      {/* FAQ Section for SEO */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-10">
            Perguntas Frequentes sobre Imóveis de Luxo em Goiânia
          </h2>
          <div className="space-y-6">
            <details className="border rounded-lg p-6 group" open>
              <summary className="font-semibold text-lg text-foreground cursor-pointer list-none flex justify-between items-center">
                Quanto custa uma casa de alto padrão em Goiânia?
                <span className="text-accent text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Casas de alto padrão em Goiânia variam de R$ 1,5 milhão a R$ 15 milhões, dependendo da localização, tamanho e acabamentos. Condomínios como Aldeia do Vale e Alphaville Flamboyant possuem opções a partir de R$ 2 milhões, enquanto imóveis no Setor Marista e Jardim Goiás podem superar R$ 10 milhões. A Supreme Empreendimentos oferece consultoria personalizada para encontrar o imóvel ideal dentro do seu orçamento.
              </p>
            </details>
            <details className="border rounded-lg p-6 group">
              <summary className="font-semibold text-lg text-foreground cursor-pointer list-none flex justify-between items-center">
                Quais os melhores condomínios fechados em Goiânia?
                <span className="text-accent text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Os condomínios fechados mais valorizados em Goiânia são Aldeia do Vale, Alphaville Flamboyant, Portal do Sol Green, Jardins Atenas e Jardins Paris. Oferecem segurança 24h, áreas de lazer completas com piscinas, quadras esportivas e academias, além de localização privilegiada próxima a shoppings e escolas internacionais.
              </p>
            </details>
            <details className="border rounded-lg p-6 group">
              <summary className="font-semibold text-lg text-foreground cursor-pointer list-none flex justify-between items-center">
                Vale a pena investir em imóveis de luxo em Goiânia?
                <span className="text-accent text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Sim. Goiânia apresenta valorização imobiliária acima da média nacional, especialmente nos bairros nobres como Setor Marista, Jardim Goiás e Setor Bueno. Imóveis de alto padrão têm alta liquidez, retorno sobre investimento superior a 8% ao ano e demanda crescente por parte de empresários e executivos que se mudam para a capital goiana.
              </p>
            </details>
          </div>
        </div>
      </section>

      <About />
      <Contact />
      <Footer />
      <RealEstateChat origin="home" pageContext="Página inicial - casa alto padrão goiânia" />
    </div>
  );
};

export default Index;