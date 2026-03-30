import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Home, Building2, TreePine, Bed, Bath, Car, Maximize, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PropertyDetail {
  id: string;
  title: string;
  description: string | null;
  price: number;
  location: string;
  property_type: string;
  purpose: string;
  images: string[] | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  amenities: string[] | null;
}

const TYPE_LABELS: Record<string, string> = {
  house: "Casa", apartment: "Apartamento", commercial: "Comercial", land: "Terreno",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export default function ParceriasImovel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get_public_properties", {
          body: { id, is_public: true },
        });
        if (!error && data?.data?.[0]) {
          setProperty(data.data[0]);
        }
      } catch (e) {
        console.error("Error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  // SEO
  useEffect(() => {
    if (!property) return;
    document.title = `${property.title} - Parcerias | Supreme Empreendimentos`;
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc = `${TYPE_LABELS[property.property_type] || property.property_type} em ${property.location} por ${formatCurrency(property.price)}. Disponível para parcerias.`;
    if (metaDesc) metaDesc.setAttribute("content", desc);
  }, [property]);

  const handleInterest = () => {
    const msg = encodeURIComponent(`Olá! Tenho interesse no imóvel: ${property?.title} (${formatCurrency(property?.price || 0)}) - ${property?.location}`);
    window.open(`https://wa.me/5562993541825?text=${msg}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-[400px] w-full rounded-lg mb-4" />
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Imóvel não encontrado ou não disponível para parcerias.</p>
          <Button onClick={() => navigate("/parcerias")}>Voltar à Vitrine</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/parcerias")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à Vitrine
        </Button>

        {/* Images */}
        {property.images && property.images.length > 0 && (
          <div className="mb-6">
            <div className="rounded-lg overflow-hidden h-[300px] md:h-[420px] bg-muted">
              <img
                src={property.images[selectedImage]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
            {property.images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {property.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${i === selectedImage ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Badge variant="secondary" className="mb-2">
                {TYPE_LABELS[property.property_type] || property.property_type}
              </Badge>
              <h1 className="text-2xl font-bold text-foreground">{property.title}</h1>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <MapPin className="h-4 w-4" />
                <span>{property.location}</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-primary">{formatCurrency(property.price)}</p>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-4 py-3 border-y">
            {property.bedrooms != null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Bed className="h-4 w-4" /> {property.bedrooms} Quarto(s)
              </div>
            )}
            {property.bathrooms != null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Bath className="h-4 w-4" /> {property.bathrooms} Banheiro(s)
              </div>
            )}
            {property.parking_spaces != null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Car className="h-4 w-4" /> {property.parking_spaces} Vaga(s)
              </div>
            )}
            {property.area != null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Maximize className="h-4 w-4" /> {property.area}m²
              </div>
            )}
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h2 className="font-semibold text-foreground mb-2">Descrição</h2>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{property.description}</p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div>
              <h2 className="font-semibold text-foreground mb-2">Comodidades</h2>
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pt-4">
            <Button onClick={handleInterest} size="lg" className="w-full sm:w-auto">
              <MessageCircle className="h-5 w-5 mr-2" /> Tenho Interesse
            </Button>
          </div>
        </div>
      </div>

      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Supreme Empreendimentos · Vitrine de Parcerias</p>
      </footer>
    </div>
  );
}
