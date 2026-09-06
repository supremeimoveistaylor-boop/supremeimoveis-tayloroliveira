import { createFileRoute } from "@tanstack/react-router";
import GeoLanding from "@/pages/GeoLanding";
import {
  neighborhoods,
  streets,
  pois,
  regions,
  CITY,
  CANONICAL_BASE,
  type GeoPageType,
} from "@/lib/geo-locations";

function buildGeoMeta(type: string, slug: string) {
  const pageType = type as GeoPageType;
  const neighborhood = pageType === "bairro" ? neighborhoods.find((n) => n.slug === slug) : null;
  const street = pageType === "rua" ? streets.find((s) => s.slug === slug) : null;
  const poi = pageType === "perto" ? pois.find((p) => p.slug === slug) : null;
  const region = pageType === "regiao" ? regions.find((r) => r.slug === slug) : null;

  if (neighborhood) {
    return {
      title: `Imóveis no ${neighborhood.name} em ${CITY} | Apartamentos, Casas e Terrenos`,
      description: `Encontre imóveis no ${neighborhood.name}, ${CITY}. ${neighborhood.description.slice(0, 120)}`,
      found: true,
    };
  }
  if (street) {
    return {
      title: `Imóveis na ${street.name} em ${CITY} | Supreme Negócios Imobiliários`,
      description: `Apartamentos e casas na ${street.name}, ${street.neighborhood}, ${CITY}. ${street.description.slice(0, 100)}`,
      found: true,
    };
  }
  if (poi) {
    return {
      title: `Imóveis perto do ${poi.name} em ${CITY} | Supreme Negócios Imobiliários`,
      description: `Encontre imóveis próximos ao ${poi.name} em ${CITY}. ${poi.description.slice(0, 100)}`,
      found: true,
    };
  }
  if (region) {
    return {
      title: `Imóveis na ${region.name} de ${CITY} | Supreme Negócios Imobiliários`,
      description: `Explore imóveis na ${region.name} de ${CITY}. Bairros: ${region.neighborhoods.join(", ")}.`,
      found: true,
    };
  }
  return {
    title: `Imóveis por Região em ${CITY} | Supreme`,
    description: `Imóveis à venda por bairro, rua e região em ${CITY} selecionados pela Supreme Empreendimentos.`,
    found: false,
  };
}

export const Route = createFileRoute("/imoveis/$type/$slug")({
  head: ({ params }) => {
    const { title, description, found } = buildGeoMeta(params.type, params.slug);
    const canonical = `${CANONICAL_BASE}/imoveis/${params.type}/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
        ...(found ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: GeoLanding,
});
