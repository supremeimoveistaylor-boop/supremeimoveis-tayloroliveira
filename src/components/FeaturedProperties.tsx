import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Car, MapPin, Heart, Edit, MessageCircle, Play, Camera, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

import { ImageModal } from "@/components/ImageModal";

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
  listing_status?: 'available' | 'sold' | 'rented';
  user_id?: string;
  whatsapp_link: string;
  youtube_link: string;
  amenities: string[];
  property_code?: string;
  latitude?: number;
  longitude?: number;
}

export const FeaturedProperties = ({ filterPurpose }: { filterPurpose?: 'sale' | 'rent' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Rate limiting for property queries to prevent scraping

  const openImageModal = (images: string[], title: string) => {
    setSelectedImages(images);
    setSelectedPropertyTitle(title);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    try {
      console.log('🔄 Buscando imóveis...');
      
      // Try edge function first, fallback to direct query if needed
      try {
        const { data, error } = await supabase.functions.invoke('get_public_properties', {
          body: { limit: 100, include_all_statuses: true },
        });

        if (error) throw error;
        let items = ((data as any)?.data || []) as Property[];
        console.log(`📊 Edge function retornou ${items.length} imóveis`);
        if (filterPurpose) {
          items = items.filter((p) => p.purpose === filterPurpose);
        }
        // Log properties with images for debugging
        items.forEach((prop: any, index: number) => {
          if (prop.images && prop.images.length > 0) {
            console.log(`🏠 Imóvel ${index + 1} (${prop.title}): ${prop.images.length} imagem(ns)`);
            console.log(`📷 Primeira imagem: ${prop.images[0]}`);
          } else {
            console.log(`🏠 Imóvel ${index + 1} (${prop.title}): SEM IMAGENS`);
          }
        });
        setProperties(items);
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, trying direct query:', edgeFunctionError);
        
        // Fallback to direct query
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        const list = ((data || []) as Property[]).filter(p => !filterPurpose || p.purpose === filterPurpose);
        setProperties(list);
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

  const handleShare = async (propertyId: string, propertyTitle: string) => {
    const url = `${window.location.origin}/#/property/${propertyId}`;
    
    // Abrir em nova aba
    window.open(url, '_blank', 'noopener,noreferrer');
    
    try {
      // Também copiar para área de transferência
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link aberto e copiado!",
        description: "O imóvel foi aberto em nova aba e o link copiado.",
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: "Link aberto!",
        description: "O imóvel foi aberto em nova aba.",
      });
    }
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
              ? `${properties.length} imóveis disponíveis em Goiânia - Goiás`
              : "Nenhum imóvel cadastrado no momento"
            }
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">Nenhum imóvel cadastrado ainda.</p>
            {user && (
              <Button onClick={() => navigate('/add-property')}>
                Cadastrar Primeiro Imóvel
              </Button>
            )}
          </div>
        ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {properties.map((property) => (
          <Card key={property.id} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card border-0 shadow-lg flex flex-col min-h-[580px]">
                <CardHeader className="p-0 flex-shrink-0">
                  <div className="relative overflow-hidden rounded-t-lg">
                    {property.images && property.images.length > 0 ? (
                      <div 
                        className="relative cursor-pointer group w-full aspect-[4/3] overflow-hidden"
                        onClick={() => openImageModal(property.images, property.title)}
                      >
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          loading="lazy"
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                            property.listing_status === 'sold' || property.listing_status === 'rented'
                              ? 'opacity-60'
                              : ''
                          }`}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                            console.error('❌ Erro ao carregar imagem:', property.images[0]);
                          }}
                        />
                        {(property.listing_status === 'sold' || property.listing_status === 'rented') && (
                          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                        )}
                        {property.images.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
                            <Camera className="h-3 w-3" />
                            {property.images.length}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/3] bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">Sem imagem</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2 z-20">
                      <Badge 
                        variant={property.purpose === "sale" ? "default" : "secondary"}
                        className={`${property.purpose === "sale" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"} font-semibold shadow-lg`}
                      >
                        {translatePurpose(property.purpose)}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`font-bold shadow-xl border-2 ${
                          (property.listing_status === 'available' || !property.listing_status)
                            ? "bg-green-500 text-white border-green-600" 
                            : property.listing_status === 'sold'
                            ? "bg-red-600 text-white border-red-700 animate-pulse"
                            : "bg-blue-600 text-white border-blue-700 animate-pulse"
                        }`}
                      >
                        {(property.listing_status === 'available' || !property.listing_status)
                          ? '✓ Disponível' 
                          : property.listing_status === 'sold' 
                          ? '✗ VENDIDO' 
                          : '✗ ALUGADO'}
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
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full p-2 bg-blue-500 hover:bg-blue-600 text-white border-none"
                        onClick={() => {
                          const url = `${window.location.origin}/#/property/${property.id}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                          navigator.clipboard.writeText(url).then(() => {
                            toast({
                              title: "Link copiado!",
                              description: "O link foi aberto em nova aba e copiado.",
                            });
                          }).catch(() => {
                            toast({
                              title: "Link aberto!",
                              description: "O link foi aberto em nova aba.",
                            });
                          });
                        }}
                        aria-label={`Compartilhar ${property.title}`}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="outline" className="bg-white/90 text-primary border-none">
                        {translatePropertyType(property.property_type)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
            <CardContent className="p-4 flex flex-col flex-grow justify-between">
              <div className="space-y-3">
                {property.property_code && (
                  <div className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block">
                    {property.property_code}
                  </div>
                )}
                <h3 className="font-bold text-lg text-primary line-clamp-2 h-[3.5rem] flex items-start">
                  {property.title}
                </h3>
                <div className="flex items-center text-muted-foreground text-sm h-[1.5rem]">
                  <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="line-clamp-1">{property.location}</span>
                </div>
                <div className="text-2xl font-bold text-accent">
                  {formatPrice(property.price, property.purpose)}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-muted-foreground h-[3rem] border-t border-b py-2">
                {property.bedrooms ? (
                  <>
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
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground italic">Informações em breve</div>
                )}
              </div>

              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
                onClick={() => navigate(`/property/${property.id}`)}
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
              onClick={() => navigate('/dashboard')}
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
    </section>
  );
};