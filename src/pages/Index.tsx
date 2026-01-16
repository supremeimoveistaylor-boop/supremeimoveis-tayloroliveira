import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { FeaturedProperties } from "@/components/FeaturedProperties";
import { PropertyMap } from "@/components/PropertyMap";
import { About } from "@/components/About";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { RealEstateChat } from "@/components/RealEstateChat";
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
                Encontre <span className="text-accent">Seu Imóvel</span> no Mapa
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Visualize a localização dos imóveis disponíveis em Goiânia
              </p>
            </div>
            <PropertyMap 
              properties={properties} 
              onPropertyClick={handlePropertyClick}
            />
          </div>
        </section>
      )}
      
      <About />
      <Contact />
      <Footer />
      <FloatingWhatsApp />
      <RealEstateChat origin="Landing Page" />
    </div>
  );
};

export default Index;