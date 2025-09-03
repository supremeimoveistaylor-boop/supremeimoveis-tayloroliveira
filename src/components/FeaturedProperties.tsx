import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Car, MapPin, Heart } from "lucide-react";

const properties = [
  {
    id: 1,
    title: "Casa Residencial Premium",
    price: "R$ 850.000",
    location: "Jardins - Patos de Minas",
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    area: "320m²",
    type: "Casa",
    purpose: "Venda",
    image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 2,
    title: "Apartamento Moderno Centro",
    price: "R$ 2.800/mês",
    location: "Centro - Patos de Minas",
    bedrooms: 3,
    bathrooms: 2,
    parking: 1,
    area: "105m²",
    type: "Apartamento",
    purpose: "Aluguel",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 3,
    title: "Fazenda Produtiva",
    price: "R$ 2.200.000",
    location: "Zona Rural - Patos de Minas",
    bedrooms: 5,
    bathrooms: 4,
    parking: 4,
    area: "15 hectares",
    type: "Rural",
    purpose: "Venda",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  },
  {
    id: 4,
    title: "Casa Condomínio Fechado",
    price: "R$ 650.000",
    location: "Morada do Sol - Patos de Minas",
    bedrooms: 3,
    bathrooms: 2,
    parking: 2,
    area: "180m²",
    type: "Casa",
    purpose: "Venda",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  }
];

export const FeaturedProperties = () => {
  return (
    <section className="py-16 bg-white-soft">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Propriedades em <span className="text-accent">Destaque</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seleção especial dos melhores imóveis disponíveis em Patos de Minas e região
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {properties.map((property) => (
            <Card key={property.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-0 shadow-lg">
              <CardHeader className="p-0">
                <div className="relative overflow-hidden rounded-t-lg">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge 
                      variant={property.purpose === "Venda" ? "default" : "secondary"}
                      className={property.purpose === "Venda" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}
                    >
                      {property.purpose}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <Button size="sm" variant="outline" className="rounded-full p-2 bg-white/90 border-none">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="outline" className="bg-white/90 text-primary border-none">
                      {property.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-lg text-primary mb-1 line-clamp-1">
                    {property.title}
                  </h3>
                  <div className="flex items-center text-muted-foreground text-sm mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="line-clamp-1">{property.location}</span>
                  </div>
                  <div className="text-2xl font-bold text-accent">
                    {property.price}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 mr-1" />
                    {property.bedrooms}
                  </div>
                  <div className="flex items-center">
                    <Bath className="h-4 w-4 mr-1" />
                    {property.bathrooms}
                  </div>
                  <div className="flex items-center">
                    <Car className="h-4 w-4 mr-1" />
                    {property.parking}
                  </div>
                  <div className="font-medium text-xs">
                    {property.area}
                  </div>
                </div>

                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            Ver Todos os Imóveis
          </Button>
        </div>
      </div>
    </section>
  );
};