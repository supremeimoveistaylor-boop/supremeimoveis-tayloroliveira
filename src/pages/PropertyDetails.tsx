import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bed, Bath, Car, MapPin, ArrowLeft, MessageCircle, 
  Play, Share2, Home, Maximize, CheckCircle 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ImageModal } from "@/components/ImageModal";
import { RealEstateChat } from "@/components/RealEstateChat";

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
  whatsapp_link: string;
  youtube_link: string;
  amenities: string[];
  property_code?: string;
  latitude?: number;
  longitude?: number;
}

const PropertyDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProperty(id);
    }
  }, [id]);

  const fetchProperty = async (propertyId: string) => {
    try {
      console.log('Fetching property with ID:', propertyId);

      // First try edge function that bypasses RLS safely
      try {
        const { data: edgeResp, error: edgeError } = await supabase.functions.invoke('get_public_properties', {
          body: { id: propertyId },
        });
        if (edgeError) throw edgeError;
        const items = (edgeResp as any)?.data || [];
        if (items.length > 0) {
          const p = items[0] as any;
          setProperty({ ...p, images: Array.isArray(p.images) ? p.images : [] });
          return;
        }
      } catch (e) {
        console.warn('Edge function single property fetch failed:', e);
      }

      // First try the public tables that don't require authentication
      try {
        const { data: publicData, error: publicError } = await supabase
          .from('public_properties')
          .select('*')
          .eq('id', propertyId)
          .eq('status', 'active')
          .maybeSingle();

        if (publicData) {
          const p = publicData as any;
          setProperty({ ...p, images: Array.isArray(p.images) ? p.images : [] });
          return;
        }
      } catch (e) {
        console.warn('Public properties table query failed:', e);
      }

      // Then try the regular properties table
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Properties table error:', error);
        throw error;
      }
      
      if (data) {
        const p = data as any;
        setProperty({ ...p, images: Array.isArray(p.images) ? p.images : [] });
      } else {
        console.log('No property found with this ID');
        setProperty(null);
        toast({
          title: 'Imóvel não encontrado',
          description: 'Verifique se o link está correto ou se o imóvel está ativo.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching property:', error);
      toast({
        title: 'Erro ao carregar imóvel',
        description: 'Não foi possível carregar os detalhes do imóvel.',
        variant: 'destructive',
      });
      setProperty(null);
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

  const handleShare = async () => {
    if (!property?.id) return;
    const url = `${window.location.origin}/#/property/${property.id}`;
    
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
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando imóvel...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!property) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-4">Imóvel não encontrado</h2>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Home
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white-soft py-8">
        <div className="container mx-auto px-4">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {/* Images Gallery */}
          <div className="mb-8">
            {property.images && property.images.length > 0 ? (
              <>
                {/* Desktop Gallery - Grid with main image */}
                <div className="hidden md:grid md:grid-cols-2 gap-4">
                  <div 
                    className="cursor-pointer relative group"
                    onClick={() => {
                      setSelectedImageIndex(0);
                      setIsImageModalOpen(true);
                    }}
                  >
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      loading="lazy"
                      className={`w-full h-[400px] object-cover rounded-lg shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                        property.listing_status === 'sold' || property.listing_status === 'rented'
                          ? 'opacity-60'
                          : ''
                      }`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {property.images.slice(1, 5).map((image, index) => (
                      <div 
                        key={index}
                        className="cursor-pointer relative group"
                        onClick={() => {
                          setSelectedImageIndex(index + 1);
                          setIsImageModalOpen(true);
                        }}
                      >
                        <img
                          src={image}
                          alt={`${property.title} - ${index + 2}`}
                          loading="lazy"
                          className={`w-full h-[192px] object-cover rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300 ${
                            property.listing_status === 'sold' || property.listing_status === 'rented'
                              ? 'opacity-60'
                              : ''
                          }`}
                        />
                        {index === 3 && property.images.length > 5 && (
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xl font-bold">
                              +{property.images.length - 5} fotos
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Thumbnails - show ALL images */}
                {property.images.length > 1 && (
                  <div className="hidden md:block mt-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
                      {property.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedImageIndex(idx);
                            setIsImageModalOpen(true);
                          }}
                          className="flex-shrink-0 w-24 h-20 rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                          aria-label={`Abrir foto ${idx + 1}`}
                        >
                          <img
                            src={img}
                            alt={`${property.title} - miniatura ${idx + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile Gallery - Scrollable horizontal list */}
                <div className="md:hidden">
                  <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                    {property.images.map((image, index) => (
                      <div 
                        key={index}
                        className="flex-shrink-0 w-[90vw] cursor-pointer relative group snap-center"
                        onClick={() => {
                          setSelectedImageIndex(index);
                          setIsImageModalOpen(true);
                        }}
                      >
                        <img
                          src={image}
                          alt={`${property.title} - ${index + 1}`}
                          loading="lazy"
                          className={`w-full h-[60vw] object-cover rounded-lg shadow-lg ${
                            property.listing_status === 'sold' || property.listing_status === 'rented'
                              ? 'opacity-60'
                              : ''
                          }`}
                        />
                        <div className="absolute bottom-3 right-3 bg-black/80 text-white text-sm px-3 py-1.5 rounded-full font-medium">
                          {index + 1} / {property.images.length}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Deslize para ver mais fotos ou toque para ampliar
                  </p>
                </div>

                {/* Ver todas as fotos */}
                {property.images.length > 1 && (
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => setIsImageModalOpen(true)}>
                      Ver todas as {property.images.length} fotos
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">
                <span className="text-muted-foreground">Sem imagens</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant={property.purpose === "sale" ? "default" : "secondary"} className="font-semibold shadow-lg">
                      {translatePurpose(property.purpose)}
                    </Badge>
                    <Badge variant="outline">
                      {translatePropertyType(property.property_type)}
                    </Badge>
                    {property.listing_status && (
                      <Badge 
                        variant="outline"
                        className={`font-bold shadow-xl border-2 ${
                          property.listing_status === 'available' 
                            ? "bg-green-500 text-white border-green-600" 
                            : property.listing_status === 'sold'
                            ? "bg-red-600 text-white border-red-700 text-lg px-4 py-1"
                            : "bg-blue-600 text-white border-blue-700 text-lg px-4 py-1"
                        }`}
                      >
                        {property.listing_status === 'available' 
                          ? '✓ Disponível' 
                          : property.listing_status === 'sold' 
                          ? '✗ VENDIDO' 
                          : '✗ ALUGADO'}
                      </Badge>
                    )}
                    {property.property_code && (
                      <Badge variant="outline" className="font-mono bg-muted">
                        {property.property_code}
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-3xl font-bold text-primary mb-2">
                    {property.title}
                  </h1>

                  <div className="flex items-center text-muted-foreground mb-4">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span className="text-lg">{property.location}</span>
                  </div>

                  <div className="text-4xl font-bold text-accent mb-6">
                    {formatPrice(property.price, property.purpose)}
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                    {property.bedrooms > 0 && (
                      <div className="flex items-center gap-2">
                        <Bed className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Quartos</p>
                          <p className="font-bold">{property.bedrooms}</p>
                        </div>
                      </div>
                    )}
                    {property.bathrooms > 0 && (
                      <div className="flex items-center gap-2">
                        <Bath className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Banheiros</p>
                          <p className="font-bold">{property.bathrooms}</p>
                        </div>
                      </div>
                    )}
                    {property.parking_spaces > 0 && (
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Vagas</p>
                          <p className="font-bold">{property.parking_spaces}</p>
                        </div>
                      </div>
                    )}
                    {property.area > 0 && (
                      <div className="flex items-center gap-2">
                        <Maximize className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Área</p>
                          <p className="font-bold">{property.area}m²</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-primary mb-3">Descrição</h2>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {property.description || "Sem descrição disponível."}
                    </p>
                  </div>

                  {/* Amenities */}
                  {property.amenities && property.amenities.length > 0 && (
                    <div>
                      <h2 className="text-xl font-bold text-primary mb-3">Comodidades</h2>
                      <div className="grid grid-cols-2 gap-2">
                        {property.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-accent" />
                            <span className="text-muted-foreground">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-primary mb-4">Interessado?</h3>
                  
                  <div className="space-y-3">
                    {property.whatsapp_link && (
                      <Button 
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => window.open(property.whatsapp_link, '_blank')}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Entrar em Contato
                      </Button>
                    )}

                    {property.youtube_link && (
                      <Button 
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(property.youtube_link, '_blank')}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Ver Vídeo
                      </Button>
                    )}

                    <Button 
                      variant="outline"
                      className="w-full"
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
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Compartilhar
                    </Button>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-bold text-primary mb-2">Código do Imóvel</h4>
                    <p className="text-sm text-muted-foreground font-mono">
                      #{property.id.substring(0, 8).toUpperCase()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        images={property.images}
        propertyTitle={property.title}
        initialIndex={selectedImageIndex}
      />
      <RealEstateChat 
        propertyId={property.id} 
        propertyName={property.title}
        origin="Página do Imóvel"
      />
    </>
  );
};

export default PropertyDetails;
