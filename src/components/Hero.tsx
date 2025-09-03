import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, Home, Building2, TreePine } from "lucide-react";
import heroProperty from "@/assets/hero-property.jpg";

export const Hero = () => {
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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white-soft mb-6 leading-tight">
              Encontre o <span className="text-accent">Imóvel dos Seus Sonhos</span> em Patos de Minas
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl">
              Especialistas em propriedades de qualidade na região de Patos de Minas. 
              Mais de 15 anos conectando pessoas aos seus lares ideais.
            </p>
            
            {/* Stats */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-8 mb-8">
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

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8">
                Ver Propriedades
              </Button>
              <Button size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                Falar com Especialista
              </Button>
            </div>
          </div>

          {/* Search Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="p-6 w-full max-w-md bg-white-soft/95 backdrop-blur-sm shadow-2xl">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-primary mb-2">Busque seu Imóvel</h3>
                <p className="text-muted-foreground">Encontre a propriedade perfeita</p>
              </div>

              <div className="space-y-4">
                {/* Property Type */}
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="flex flex-col items-center p-3 h-auto hover:border-accent hover:text-accent">
                    <Home className="h-5 w-5 mb-1" />
                    <span className="text-xs">Casas</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex flex-col items-center p-3 h-auto hover:border-accent hover:text-accent">
                    <Building2 className="h-5 w-5 mb-1" />
                    <span className="text-xs">Apartamentos</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex flex-col items-center p-3 h-auto hover:border-accent hover:text-accent">
                    <TreePine className="h-5 w-5 mb-1" />
                    <span className="text-xs">Rurais</span>
                  </Button>
                </div>

                {/* Purpose */}
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Finalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprar">Comprar</SelectItem>
                    <SelectItem value="alugar">Alugar</SelectItem>
                  </SelectContent>
                </Select>

                {/* Location */}
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Bairro" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centro">Centro</SelectItem>
                    <SelectItem value="jardins">Jardins</SelectItem>
                    <SelectItem value="morada-do-sol">Morada do Sol</SelectItem>
                    <SelectItem value="caicaras">Caiçaras</SelectItem>
                  </SelectContent>
                </Select>

                {/* Price Range */}
                <div className="grid grid-cols-2 gap-2">
                  <Input type="text" placeholder="Preço mín." />
                  <Input type="text" placeholder="Preço máx." />
                </div>

                {/* Search Button */}
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
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