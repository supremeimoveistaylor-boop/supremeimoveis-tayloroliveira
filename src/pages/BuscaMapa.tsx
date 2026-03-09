import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Home, Filter, X, Search } from 'lucide-react';
import { neighborhoods, pois, CITY } from '@/lib/geo-locations';
import { GeoInternalLinks } from '@/components/geo/GeoInternalLinks';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Property {
  id: string;
  title: string;
  location: string;
  latitude?: number;
  longitude?: number;
  price: number;
  purpose: string;
  property_type: string;
  bedrooms?: number;
  area?: number;
  images?: string[];
}

const BuscaMapa = () => {
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [properties, setProperties] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [purpose, setPurpose] = useState<string>('all');
  const [propertyType, setPropertyType] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<number[]>([0, 5000000]);
  const [minBedrooms, setMinBedrooms] = useState<string>('0');

  useEffect(() => {
    document.title = `Busca por Mapa - Imóveis em ${CITY} | Supreme Negócios Imobiliários`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', `Encontre imóveis em ${CITY} usando nosso mapa interativo. Filtre por preço, quartos, tipo e localização.`);
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get_public_properties', {
        body: { limit: 500, include_all_statuses: true },
      });
      if (error) throw error;
      const items = ((data as any)?.data || []) as Property[];
      setProperties(items);
      setFiltered(items);
    } catch (e) {
      console.error('Error fetching properties:', e);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let result = [...properties];
    if (purpose !== 'all') result = result.filter(p => p.purpose === purpose);
    if (propertyType !== 'all') result = result.filter(p => p.property_type === propertyType);
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (minBedrooms !== '0') result = result.filter(p => (p.bedrooms || 0) >= parseInt(minBedrooms));
    setFiltered(result);
  }, [purpose, propertyType, priceRange, minBedrooms, properties]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapRef.current = L.map(mapContainerRef.current).setView([-16.6869, -49.2648], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filtered.forEach(property => {
      if (property.latitude && property.longitude && mapRef.current) {
        const formatPrice = (price: number, purpose: string) => {
          const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
          return purpose === 'rent' ? `${formatted}/mês` : formatted;
        };

        const marker = L.marker([property.latitude, property.longitude]).addTo(mapRef.current!);
        const popup = `
          <div class="min-w-[220px]">
            <h3 class="font-bold text-sm mb-1">${property.title}</h3>
            <p class="text-xs text-gray-600 mb-1">${property.location}</p>
            <p class="font-bold text-sm mb-1" style="color: hsl(45, 100%, 40%)">${formatPrice(property.price, property.purpose)}</p>
            ${property.bedrooms ? `<span class="text-xs text-gray-500">${property.bedrooms} quartos</span>` : ''}
            ${property.area ? `<span class="text-xs text-gray-500 ml-2">${property.area}m²</span>` : ''}
            <br/>
            <button onclick="window.dispatchEvent(new CustomEvent('mapPropertyClick', { detail: '${property.id}' }))" class="text-xs mt-2 px-3 py-1 rounded text-white" style="background: hsl(0,0%,0%)">Ver Detalhes</button>
          </div>
        `;
        marker.bindPopup(popup);
        markersRef.current.push(marker);
      }
    });
  }, [filtered]);

  useEffect(() => {
    const handler = (e: any) => navigate(`/property/${e.detail}`);
    window.addEventListener('mapPropertyClick', handler);
    return () => window.removeEventListener('mapPropertyClick', handler);
  }, [navigate]);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-10">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <MapPin className="inline h-8 w-8 text-accent mr-2" />
              Encontre Imóveis no <span className="text-accent">Mapa</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore imóveis em {CITY} de forma visual. Clique nos marcadores para ver detalhes.
            </p>
          </div>
        </section>

        {/* Filters Bar */}
        <div className="bg-card border-b border-border sticky top-[72px] z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  <Home className="h-3 w-3 mr-1" />
                  {filtered.length} imóveis
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? <X className="h-4 w-4 mr-1" /> : <Filter className="h-4 w-4 mr-1" />}
                Filtros
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pb-2">
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger><SelectValue placeholder="Finalidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="sale">Comprar</SelectItem>
                    <SelectItem value="rent">Alugar</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="apartment">Apartamento</SelectItem>
                    <SelectItem value="house">Casa</SelectItem>
                    <SelectItem value="land">Terreno</SelectItem>
                    <SelectItem value="commercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={minBedrooms} onValueChange={setMinBedrooms}>
                  <SelectTrigger><SelectValue placeholder="Quartos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Qualquer</SelectItem>
                    <SelectItem value="1">1+ quartos</SelectItem>
                    <SelectItem value="2">2+ quartos</SelectItem>
                    <SelectItem value="3">3+ quartos</SelectItem>
                    <SelectItem value="4">4+ quartos</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Preço: {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}</p>
                  <Slider
                    min={0}
                    max={5000000}
                    step={50000}
                    value={priceRange}
                    onValueChange={setPriceRange}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={mapContainerRef} className="w-full h-[calc(100vh-300px)] min-h-[500px]" style={{ zIndex: 0 }} />

        {/* Geo Links */}
        <section className="py-12 bg-secondary">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Explore por Localização em {CITY}</h2>
            <GeoInternalLinks variant="full" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BuscaMapa;
