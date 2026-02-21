import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import { RealEstateChat } from "@/components/RealEstateChat";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Maximize, MapPin, X, Filter, TreePine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  area: number | null;
  images: string[] | null;
  property_type: string;
  purpose: string;
  featured: boolean | null;
}

const Rurais = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [purpose, setPurpose] = useState(searchParams.get("finalidade") || "");
  const [city, setCity] = useState(searchParams.get("cidade") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("preco_min") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("preco_max") || "");

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-properties', {
        body: {
          tipo: 'rural',
          finalidade: purpose || undefined,
          cidade: city || undefined,
          preco_min: minPrice ? parseInt(minPrice) : undefined,
          preco_max: maxPrice ? parseInt(maxPrice) : undefined,
          q: searchQuery || undefined
        }
      });
      
      if (fnError) throw fnError;
      
      setProperties(data?.data || []);
      setTotalResults(data?.total || 0);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('Erro ao carregar propriedades rurais. Tente novamente.');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (purpose) params.set("finalidade", purpose);
    if (city) params.set("cidade", city);
    if (minPrice) params.set("preco_min", minPrice);
    if (maxPrice) params.set("preco_max", maxPrice);
    
    setSearchParams(params);
    fetchProperties();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPurpose("");
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setSearchParams(new URLSearchParams());
    fetchProperties();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPurposeLabel = (p: string) => {
    return p === 'venda' ? 'Venda' : p === 'aluguel' ? 'Aluguel' : p;
  };

  const hasActiveFilters = purpose || city || minPrice || maxPrice || searchQuery;

  useEffect(() => {
    document.title = "Propriedades Rurais em Goiás | Fazendas, Chácaras e Sítios - Supreme";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Propriedades rurais à venda em Goiás: fazendas, chácaras e sítios com excelente localização e potencial de valorização. Supreme Negócios Imobiliários.");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="py-12 bg-gradient-to-br from-primary via-black-soft to-primary">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white-soft mb-4">
              Propriedades <span className="text-accent">Rurais em Goiás</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Fazendas, chácaras e sítios na região de Goiás
            </p>
          </div>
        </section>

        {/* Search & Results */}
        <section className="py-8 bg-white-soft">
          <div className="container mx-auto px-4">
            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, localização..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1">!</Badge>
                  )}
                </Button>
                <Button onClick={handleSearch} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger>
                      <SelectValue placeholder="Finalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venda">Comprar</SelectItem>
                      <SelectItem value="aluguel">Alugar</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cidade/Região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goiania">Goiânia</SelectItem>
                      <SelectItem value="anapolis">Anápolis</SelectItem>
                      <SelectItem value="pirenopolis">Pirenópolis</SelectItem>
                      <SelectItem value="caldas-novas">Caldas Novas</SelectItem>
                      <SelectItem value="jatai">Jataí</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    placeholder="Preço mínimo"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />

                  <Input
                    type="number"
                    placeholder="Preço máximo"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              )}

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Busca: {searchQuery}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {purpose && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Finalidade: {getPurposeLabel(purpose)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setPurpose("")} />
                    </Badge>
                  )}
                  {city && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Cidade: {city}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setCity("")} />
                    </Badge>
                  )}
                  {(minPrice || maxPrice) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Preço: {minPrice ? formatPrice(parseInt(minPrice)) : "0"} - {maxPrice ? formatPrice(parseInt(maxPrice)) : "∞"}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => { setMinPrice(""); setMaxPrice(""); }} />
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                    Limpar todos
                  </Button>
                </div>
              )}
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-muted-foreground">
                {loading ? "Buscando..." : `${totalResults} propriedade(s) encontrada(s)`}
              </p>
            </div>

            {/* Results Grid */}
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchProperties}>Tentar novamente</Button>
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-12">
                <TreePine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma propriedade rural encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Tente ajustar os filtros ou faça uma nova busca
                </p>
                <Button onClick={clearFilters}>Limpar filtros</Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <Card 
                    key={property.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/property/${property.id}`)}
                  >
                    <div className="relative h-48">
                      <img
                        src={property.images?.[0] || "/placeholder.svg"}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      {property.featured && (
                        <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                          Destaque
                        </Badge>
                      )}
                      <Badge className="absolute top-2 right-2 bg-green-700 text-white">
                        Rural
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                      </div>
                      <p className="text-accent font-bold text-xl mb-2">
                        {formatPrice(property.price)}
                      </p>
                      <div className="flex items-center text-muted-foreground text-sm mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        {property.location}
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {property.area && (
                          <div className="flex items-center gap-1">
                            <Maximize className="h-4 w-4" />
                            {property.area >= 10000 
                              ? `${(property.area / 10000).toFixed(1)} ha` 
                              : `${property.area}m²`}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {property.purpose === 'venda' ? 'Venda' : 'Aluguel'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <FloatingWhatsApp />
      <RealEstateChat 
        pageProperties={properties.map(p => ({
          id: p.id,
          title: p.title,
          price: p.price,
          location: p.location,
          property_type: p.property_type
        }))}
        pageContext="imóveis rurais"
        origin="site"
      />
    </div>
  );
};

export default Rurais;
