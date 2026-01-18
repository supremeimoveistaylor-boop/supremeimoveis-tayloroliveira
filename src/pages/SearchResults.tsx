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
import { MapPin, Bed, Bath, Car, Maximize, Search, Filter, Home, Building2, TreePine, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  area: number;
  images: string[];
  purpose: string;
  property_type: string;
  status: string;
}

interface SearchFilters {
  q: string;
  finalidade: string;
  tipo: string;
  bairro: string;
  preco_min: string;
  preco_max: string;
}

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize filters from URL params
  const [filters, setFilters] = useState<SearchFilters>(() => {
    const initial = {
      q: searchParams.get("q") || "",
      finalidade: searchParams.get("finalidade") || "",
      tipo: searchParams.get("tipo") || "",
      bairro: searchParams.get("bairro") || "",
      preco_min: searchParams.get("preco_min") || "",
      preco_max: searchParams.get("preco_max") || "",
    };
    console.log("[SearchResults] Initial filters from URL:", initial);
    return initial;
  });

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const searchBody: Record<string, unknown> = {};
      
      if (filters.q.trim()) searchBody.q = filters.q.trim();
      if (filters.finalidade) searchBody.finalidade = filters.finalidade;
      if (filters.tipo) searchBody.tipo = filters.tipo;
      if (filters.bairro.trim()) searchBody.bairro = filters.bairro.trim();
      if (filters.preco_min) searchBody.preco_min = Number(filters.preco_min);
      if (filters.preco_max) searchBody.preco_max = Number(filters.preco_max);

      console.log("[SearchResults] Calling search-properties with:", JSON.stringify(searchBody));

      const { data, error: apiError } = await supabase.functions.invoke("search-properties", {
        body: searchBody,
      });

      console.log("[SearchResults] Response received:", { data, error: apiError });

      if (apiError) {
        console.error("[SearchResults] API error:", apiError);
        throw new Error(apiError.message || "Erro ao buscar imóveis");
      }

      // Handle both response formats
      const properties = data?.data || [];
      const total = data?.total ?? properties.length;
      
      console.log(`[SearchResults] Found ${properties.length} properties out of ${total} total`);
      
      setProperties(properties);
      setTotal(total);
    } catch (err) {
      console.error("[SearchResults] Error fetching properties:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar imóveis");
      setProperties([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleSearch = () => {
    // Update URL params
    const newParams = new URLSearchParams();
    if (filters.q.trim()) newParams.set("q", filters.q.trim());
    if (filters.finalidade) newParams.set("finalidade", filters.finalidade);
    if (filters.tipo) newParams.set("tipo", filters.tipo);
    if (filters.bairro.trim()) newParams.set("bairro", filters.bairro.trim());
    if (filters.preco_min) newParams.set("preco_min", filters.preco_min);
    if (filters.preco_max) newParams.set("preco_max", filters.preco_max);
    
    setSearchParams(newParams);
    fetchProperties();
  };

  const clearFilters = () => {
    setFilters({
      q: "",
      finalidade: "",
      tipo: "",
      bairro: "",
      preco_min: "",
      preco_max: "",
    });
    setSearchParams(new URLSearchParams());
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      house: "Casa",
      apartment: "Apartamento",
      rural: "Rural",
      land: "Terreno",
      commercial: "Comercial",
    };
    return labels[type] || type;
  };

  const getPurposeLabel = (purpose: string) => {
    return purpose === "rent" ? "Alugar" : "Comprar";
  };

  const hasActiveFilters = filters.q || filters.finalidade || filters.tipo || filters.bairro || filters.preco_min || filters.preco_max;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            Buscar <span className="text-accent">Imóveis</span>
          </h1>
          <p className="text-muted-foreground">
            {loading ? "Buscando..." : `${total} imóveis encontrados`}
          </p>
        </div>

        {/* Search Bar and Filters */}
        <Card className="mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Main Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, descrição..."
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch} className="bg-accent hover:bg-accent/90">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
              </div>

              {/* Expandable Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t">
                  {/* Property Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        variant={filters.tipo === "casa" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, tipo: filters.tipo === "casa" ? "" : "casa" })}
                        className="flex flex-col items-center p-2 h-auto"
                      >
                        <Home className="h-4 w-4" />
                        <span className="text-xs">Casa</span>
                      </Button>
                      <Button
                        variant={filters.tipo === "apartamento" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, tipo: filters.tipo === "apartamento" ? "" : "apartamento" })}
                        className="flex flex-col items-center p-2 h-auto"
                      >
                        <Building2 className="h-4 w-4" />
                        <span className="text-xs">Apto</span>
                      </Button>
                      <Button
                        variant={filters.tipo === "rural" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilters({ ...filters, tipo: filters.tipo === "rural" ? "" : "rural" })}
                        className="flex flex-col items-center p-2 h-auto"
                      >
                        <TreePine className="h-4 w-4" />
                        <span className="text-xs">Rural</span>
                      </Button>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Finalidade</label>
                    <Select
                      value={filters.finalidade}
                      onValueChange={(value) => setFilters({ ...filters, finalidade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comprar">Comprar</SelectItem>
                        <SelectItem value="alugar">Alugar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Neighborhood */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bairro</label>
                    <Select
                      value={filters.bairro}
                      onValueChange={(value) => setFilters({ ...filters, bairro: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="centro">Centro</SelectItem>
                        <SelectItem value="setor-bueno">Setor Bueno</SelectItem>
                        <SelectItem value="setor-oeste">Setor Oeste</SelectItem>
                        <SelectItem value="jardim-goias">Jardim Goiás</SelectItem>
                        <SelectItem value="alphaville">Alphaville</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Min Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preço mín.</label>
                    <Input
                      type="number"
                      placeholder="R$ 0"
                      value={filters.preco_min}
                      onChange={(e) => setFilters({ ...filters, preco_min: e.target.value })}
                    />
                  </div>

                  {/* Max Price */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preço máx.</label>
                    <Input
                      type="number"
                      placeholder="Sem limite"
                      value={filters.preco_max}
                      onChange={(e) => setFilters({ ...filters, preco_max: e.target.value })}
                    />
                  </div>

                  {/* Clear Filters */}
                  <div className="space-y-2 flex items-end">
                    {hasActiveFilters && (
                      <Button variant="ghost" onClick={clearFilters} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Active Filter Tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {filters.q && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Busca: {filters.q}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, q: "" })} />
                    </Badge>
                  )}
                  {filters.finalidade && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {filters.finalidade === "comprar" ? "Comprar" : "Alugar"}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, finalidade: "" })} />
                    </Badge>
                  )}
                  {filters.tipo && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getPropertyTypeLabel(filters.tipo)}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, tipo: "" })} />
                    </Badge>
                  )}
                  {filters.bairro && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {filters.bairro}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, bairro: "" })} />
                    </Badge>
                  )}
                  {filters.preco_min && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Mín: {formatPrice(Number(filters.preco_min))}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, preco_min: "" })} />
                    </Badge>
                  )}
                  {filters.preco_max && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Máx: {formatPrice(Number(filters.preco_max))}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setFilters({ ...filters, preco_max: "" })} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchProperties}>Tentar novamente</Button>
          </Card>
        ) : properties.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum imóvel encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Tente ajustar os filtros ou fazer uma busca diferente.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card
                key={property.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/property/${property.id}`)}
              >
                <div className="relative h-48">
                  <img
                    src={property.images?.[0] || "/placeholder.svg"}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-2">
                    <Badge className="bg-accent text-accent-foreground">
                      {getPurposeLabel(property.purpose)}
                    </Badge>
                    <Badge variant="secondary">
                      {getPropertyTypeLabel(property.property_type)}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                    {property.bedrooms > 0 && (
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>{property.bedrooms}</span>
                      </div>
                    )}
                    {property.bathrooms > 0 && (
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>{property.bathrooms}</span>
                      </div>
                    )}
                    {property.parking_spaces > 0 && (
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        <span>{property.parking_spaces}</span>
                      </div>
                    )}
                    {property.area > 0 && (
                      <div className="flex items-center gap-1">
                        <Maximize className="h-4 w-4" />
                        <span>{property.area}m²</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-accent">
                      {formatPrice(property.price)}
                    </span>
                    <Button size="sm" variant="outline">
                      Ver detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
        pageContext={filters.tipo ? `resultados de busca (${filters.tipo})` : "resultados de busca"}
        origin="site"
      />
    </div>
  );
};

export default SearchResults;
