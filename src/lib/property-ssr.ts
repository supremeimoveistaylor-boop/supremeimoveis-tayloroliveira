import { supabase } from "@/integrations/supabase/client";

export interface SsrProperty {
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
  listing_status?: "available" | "sold" | "rented";
  whatsapp_link: string;
  youtube_link: string;
  amenities: string[];
  property_code?: string;
  latitude?: number;
  longitude?: number;
  delivery_date?: string;
}

const CANONICAL_BASE = "https://supremeempreendimentos.com";

const TYPES: Record<string, string> = {
  house: "Casa",
  apartment: "Apartamento",
  land: "Terreno",
  commercial: "Comercial",
  farm: "Fazenda",
  rural: "Rural",
};

const PURPOSES: Record<string, string> = {
  sale: "Venda",
  rent: "Aluguel",
};

export const translateType = (t?: string) => TYPES[t ?? ""] ?? "Imóvel";
export const translatePurposeLabel = (p?: string) => PURPOSES[p ?? ""] ?? "Venda";

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );

/** Reads a single public property. Runs on the server during SSR and on the client on navigation. */
export async function fetchPropertyForSsr(id: string): Promise<SsrProperty | null> {
  try {
    const { data } = await supabase
      .from("public_properties")
      .select("*")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    const row = (data as any) ?? null;
    if (!row) return null;
    return { ...row, images: Array.isArray(row.images) ? row.images : [] } as SsrProperty;
  } catch {
    return null;
  }
}

export function buildPropertyHead(property: SsrProperty | null, path: string) {
  const canonical = `${CANONICAL_BASE}${path}`;

  if (!property) {
    return {
      meta: [
        { title: "Imóvel não encontrado | Supreme Empreendimentos" },
        { name: "description", content: "O imóvel procurado não está mais disponível no catálogo da Supreme Empreendimentos." },
        { name: "robots", content: "noindex" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  }

  const type = translateType(property.property_type);
  const purpose = translatePurposeLabel(property.purpose);
  const title = `${property.title} | ${type} para ${purpose} em ${property.location} - Supreme`;
  const description = property.description
    ? property.description.slice(0, 155)
    : `${type} para ${purpose.toLowerCase()} em ${property.location}. ${property.bedrooms || 0} quartos, ${property.bathrooms || 0} banheiros, ${property.area || 0}m². ${formatBRL(property.price)}.`;
  const image = property.images?.[0];
  const unavailable =
    property.listing_status === "sold" ||
    property.listing_status === "rented" ||
    String(property.status || "").toLowerCase() === "inactive";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description || description,
    url: canonical,
    mainEntityOfPage: canonical,
    inLanguage: "pt-BR",
    ...(property.property_code ? { identifier: property.property_code, sku: property.property_code } : {}),
    ...(image ? { image: property.images } : {}),
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "BRL",
      url: canonical,
      businessFunction:
        property.purpose === "rent"
          ? "http://purl.org/goodrelations/v1#LeaseOut"
          : "http://purl.org/goodrelations/v1#Sell",
      availability: unavailable ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      seller: { "@type": "RealEstateAgent", name: "Supreme Negócios Imobiliários", url: CANONICAL_BASE },
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: property.location,
      addressRegion: "GO",
      addressCountry: "BR",
    },
    ...(property.latitude && property.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: property.latitude, longitude: property.longitude } }
      : {}),
    ...(property.bedrooms ? { numberOfRooms: property.bedrooms, numberOfBedrooms: property.bedrooms } : {}),
    ...(property.bathrooms ? { numberOfBathroomsTotal: property.bathrooms } : {}),
    ...(property.area
      ? { floorSize: { "@type": "QuantitativeValue", value: property.area, unitName: "m²", unitCode: "MTK" } }
      : {}),
    ...(property.amenities?.length
      ? {
          amenityFeature: property.amenities.map((a) => ({
            "@type": "LocationFeatureSpecification",
            name: a,
            value: true,
          })),
        }
      : {}),
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: property.title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { property: "og:site_name", content: "Supreme Negócios Imobiliários" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: property.title },
      { name: "twitter:description", content: description },
      ...(image
        ? [
            { property: "og:image", content: image },
            { property: "og:image:alt", content: property.title },
            { name: "twitter:image", content: image },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
  };
}
