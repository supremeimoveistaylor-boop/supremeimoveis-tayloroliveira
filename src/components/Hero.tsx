import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Home, Building2, TreePine } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroProperty from "@/assets/hero-property.jpg";

export const Hero = () => {
  const navigate = useNavigate();
  
  // Search form state
  const [propertyType, setPropertyType] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [neighborhood, setNeighborhood] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const goToSearch = (params?: URLSearchParams) => {
    const query = params?.toString();
    const hashPath = query ? `/buscar?${query}` : "/buscar";

    // Force hash-based navigation to avoid 404 on hosts without SPA rewrites
    window.location.hash = hashPath;

    // Also update router state (no-op if hash navigation already handled)
    try {
      navigate(hashPath);
    } catch {
      // ignore
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (propertyType) params.set("tipo", propertyType);
    if (purpose) params.set("finalidade", purpose);
    if (neighborhood) params.set("bairro", neighborhood);
    if (minPrice) params.set("preco_min", minPrice);
    if (maxPrice) params.set("preco_max", maxPrice);

    console.log("[Hero] Navigating to search (hash):", `#/buscar?${params.toString()}`);
    goToSearch(params);
  };

  const handlePropertyTypeClick = (type: string) => {
    // Navigate directly to search with the selected type
    const params = new URLSearchParams();
    params.set("tipo", type);
    goToSearch(params);
  };

  return (
    <section id="inicio" className="relative min-h-[80vh] flex items-center bg-gradient-to-br from-black-soft to-primary">
      {/* Background image with overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroProperty})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Hero Content */}
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white-soft mb-6 leading-tight">
              Encontre o <span className="text-accent">Imóvel dos Seus Sonhos</span> em Goiânia - Goiás
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto text-center">
              Especialistas em propriedades de qualidade na região de Goiânia - Goiás. 
              Mais de 15 anos conectando pessoas aos seus lares ideais.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">500+</div>
                <div className="text-sm text-gray-300">Imóveis Vendidos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">15+</div>
                <div className="text-sm text-gray-300">Anos de Experiência</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">100%</div>
                <div className="text-sm text-gray-300">Satisfação</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8"
                onClick={() => goToSearch()}
              >
                Ver Propriedades
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                onClick={() => { if (typeof window.gtag === 'function') window.gtag('event', 'whatsapp_click', { event_category: 'engagement', event_label: 'hero' }); window.open('https://wa.me/5562999918353', '_blank'); }}
              >
                Falar com Especialista
              </Button>
            </div>
          </div>

          {/* Search Card */}
          <div className="flex justify-center mt-12 lg:mt-0">
            <Card className="p-6 w-full max-w-md bg-white-soft/95 backdrop-blur-sm shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">Busque seu Imóvel</h3>
                <p className="text-muted-foreground">Encontre a propriedade perfeita</p>
              </div>

              <div className="space-y-4">
                {/* Property Type */}
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex flex-col items-center p-3 h-auto ${
                      propertyType === "casa" 
                        ? "border-accent bg-accent/10 text-accent" 
                        : "hover:border-accent hover:text-accent"
                    }`}
                    onClick={() => handlePropertyTypeClick("casa")}
                  >
                    <Home className="h-5 w-5 mb-1" />
                    <span className="text-xs">Casas</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex flex-col items-center p-3 h-auto ${
                      propertyType === "apartamento" 
                        ? "border-accent bg-accent/10 text-accent" 
                        : "hover:border-accent hover:text-accent"
                    }`}
                    onClick={() => handlePropertyTypeClick("apartamento")}
                  >
                    <Building2 className="h-5 w-5 mb-1" />
                    <span className="text-xs">Apartamentos</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`flex flex-col items-center p-3 h-auto ${
                      propertyType === "rural" 
                        ? "border-accent bg-accent/10 text-accent" 
                        : "hover:border-accent hover:text-accent"
                    }`}
                    onClick={() => handlePropertyTypeClick("rural")}
                  >
                    <TreePine className="h-5 w-5 mb-1" />
                    <span className="text-xs">Rurais</span>
                  </Button>
                </div>

                {/* Purpose */}
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger>
                    <SelectValue placeholder="Finalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprar">Comprar</SelectItem>
                    <SelectItem value="alugar">Alugar</SelectItem>
                  </SelectContent>
                </Select>

                {/* Location */}
                <Select value={neighborhood} onValueChange={setNeighborhood}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bairro" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="centro">Centro</SelectItem>
                      <SelectItem value="setor-bueno">Setor Bueno</SelectItem>
                      <SelectItem value="setor-oeste">Setor Oeste</SelectItem>
                      <SelectItem value="jardim-goias">Jardim Goiás</SelectItem>
                      <SelectItem value="alphaville">Alphaville</SelectItem>
                    </SelectContent>
                </Select>

                {/* Price Range */}
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    type="number" 
                    placeholder="Preço mín." 
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <Input 
                    type="number" 
                    placeholder="Preço máx." 
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>

                {/* Search Button */}
                <Button 
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                  onClick={handleSearch}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Imóveis
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};