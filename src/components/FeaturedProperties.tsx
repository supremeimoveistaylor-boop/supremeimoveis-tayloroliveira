import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Car, MapPin, Heart, Edit, MessageCircle, Play, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

import { ImageModal } from "@/components/ImageModal";
import { PropertyDetailsModal } from "@/components/PropertyDetailsModal";

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  purpose: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  area: number;
  images: string[];
  status: string;
  user_id?: string;
  whatsapp_link: string;
  youtube_link: string;
  amenities: string[];
}

export const FeaturedProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const openImageModal = (images: string[], title: string) => {
    setSelectedImages(images);
    setSelectedPropertyTitle(title);
    setIsModalOpen(true);
  };

  const openDetailsModal = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailsModalOpen(true);
  };

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    try {
      // Try edge function first, fallback to direct query if needed
      try {
        const { data, error } = await supabase.functions.invoke('get_public_properties', {
          body: { limit: 50 },
        });

        if (error) throw error;
        const items = (data as any)?.data || [];
        setProperties(items);
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, trying direct query:', edgeFunctionError);
        
        // Fallback to direct query
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setProperties(data || []);
      }
    } catch (error: any) {
      console.error('Property fetch error:', error);
      toast({
        title: "Erro ao carregar imóveis",
        description: "Não foi possível carregar os imóveis. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number, purpose: string) => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
    
    return purpose === 'rent' ? `${formatted}/mês` : formatted;
  };

  const translatePropertyType = (type: string) => {
    const types = {
      house: 'Casa',
      apartment: 'Apartamento', 
      commercial: 'Comercial',
      land: 'Terreno'
    };
    return types[type as keyof typeof types] || type;
  };

  const translatePurpose = (purpose: string) => {
    return purpose === 'sale' ? 'Venda' : 'Aluguel';
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-white-soft">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando imóveis...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white-soft">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Imóveis <span className="text-accent">Disponíveis</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {properties.length > 0 
              ? `${properties.length} imóveis disponíveis em Patos de Minas e região`
              : "Nenhum imóvel cadastrado no momento"
            }
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">Nenhum imóvel cadastrado ainda.</p>
            {user && (
              <Button onClick={() => window.location.href = '/add-property'}>
                Cadastrar Primeiro Imóvel
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-0 shadow-lg">
                <CardHeader className="p-0">
                  <div className="relative overflow-hidden rounded-t-lg">
                    {property.images && property.images.length > 0 ? (
                      <div 
                        className="relative cursor-pointer group"
                        onClick={() => openImageModal(property.images, property.title)}
                      >
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {property.images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            {property.images.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge 
                        variant={property.purpose === "sale" ? "default" : "secondary"}
                        className={property.purpose === "sale" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}
                      >
                        {translatePurpose(property.purpose)}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      {property.whatsapp_link && (
                        <Button
                          size="sm"
                          className="rounded-full p-2 bg-green-500 hover:bg-green-600 text-white border-none"
                          onClick={() => window.open(property.whatsapp_link, '_blank')}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {property.youtube_link && (
                        <Button
                          size="sm"
                          className="rounded-full p-2 bg-red-500 hover:bg-red-600 text-white border-none"
                          onClick={() => window.open(property.youtube_link, '_blank')}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {user && user.id === property.user_id && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full p-2 bg-white/90 border-none"
                          onClick={() => window.location.href = `/edit-property/${property.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="rounded-full p-2 bg-white/90 border-none">
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="outline" className="bg-white/90 text-primary border-none">
                        {translatePropertyType(property.property_type)}
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
                      {formatPrice(property.price, property.purpose)}
                    </div>
                  </div>

                  {property.bedrooms && (
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
                        {property.parking_spaces}
                      </div>
                      {property.area && (
                        <div className="font-medium text-xs">
                          {property.area.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}m²
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => openDetailsModal(property)}
                  >
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {user && (
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => window.location.href = '/dashboard'}
            >
              Gerenciar Meus Imóveis
            </Button>
          </div>
        )}
      </div>

      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        images={selectedImages}
        propertyTitle={selectedPropertyTitle}
      />

      <PropertyDetailsModal
        property={selectedProperty}
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
      />
    </section>
  );
};