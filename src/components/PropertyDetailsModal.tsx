import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Car, MapPin, MessageCircle, Play, Camera, X } from "lucide-react";
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
  whatsapp_link: string;
  youtube_link: string;
  amenities: string[];
}

interface PropertyDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyDetailsModal = ({ property, isOpen, onClose }: PropertyDetailsModalProps) => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedPropertyTitle, setSelectedPropertyTitle] = useState<string>("");
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!property) return null;

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

  const openImageModal = (images: string[], title: string) => {
    setSelectedImages(images);
    setSelectedPropertyTitle(title);
    setIsImageModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary">
              {property.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Price and Type */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-3xl font-bold text-accent">
                {formatPrice(property.price, property.purpose)}
              </div>
              <div className="flex gap-2">
                <Badge 
                  variant={property.purpose === "sale" ? "default" : "secondary"}
                  className={property.purpose === "sale" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}
                >
                  {translatePurpose(property.purpose)}
                </Badge>
                <Badge variant="outline">
                  {translatePropertyType(property.property_type)}
                </Badge>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-5 w-5 mr-2" />
              <span className="text-lg">{property.location}</span>
            </div>

            {/* Images */}
            {property.images && property.images.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Fotos do Imóvel</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  {property.images.slice(0, 6).map((image, index) => (
                    <div 
                      key={index}
                      className="relative cursor-pointer group rounded-lg overflow-hidden aspect-[4/3]"
                      onClick={() => openImageModal(property.images, property.title)}
                    >
                      <img
                        src={image}
                        alt={`${property.title} - Foto ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {index === 5 && property.images.length > 6 && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-semibold">
                          <Camera className="h-6 w-6 mr-2" />
                          +{property.images.length - 6} fotos
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {property.images.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => openImageModal(property.images, property.title)}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Ver todas as {property.images.length} fotos
                  </Button>
                )}
              </div>
            )}

            {/* Property Details */}
            {(property.bedrooms || property.bathrooms || property.parking_spaces || property.area) && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Características</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {property.bedrooms > 0 && (
                    <div className="flex items-center p-3 bg-muted rounded-lg">
                      <Bed className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="font-semibold">{property.bedrooms}</div>
                        <div className="text-sm text-muted-foreground">Quartos</div>
                      </div>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="flex items-center p-3 bg-muted rounded-lg">
                      <Bath className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="font-semibold">{property.bathrooms}</div>
                        <div className="text-sm text-muted-foreground">Banheiros</div>
                      </div>
                    </div>
                  )}
                  {property.parking_spaces > 0 && (
                    <div className="flex items-center p-3 bg-muted rounded-lg">
                      <Car className="h-5 w-5 mr-2 text-primary" />
                      <div>
                        <div className="font-semibold">{property.parking_spaces}</div>
                        <div className="text-sm text-muted-foreground">Vagas</div>
                      </div>
                    </div>
                  )}
                  {property.area > 0 && (
                    <div className="flex items-center p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-semibold">
                          {property.area.toLocaleString('pt-BR', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          })}m²
                        </div>
                        <div className="text-sm text-muted-foreground">Área</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Comodidades</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity, index) => (
                    <Badge key={index} variant="secondary">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Descrição</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {property.description}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              {property.whatsapp_link && (
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  onClick={() => window.open(property.whatsapp_link, '_blank')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Entrar em Contato
                </Button>
              )}
              {property.youtube_link && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(property.youtube_link, '_blank')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Ver Vídeo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        images={selectedImages}
        propertyTitle={selectedPropertyTitle}
      />
    </>
  );
};