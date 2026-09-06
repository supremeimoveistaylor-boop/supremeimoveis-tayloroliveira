import { createFileRoute } from "@tanstack/react-router";
import SearchResults from "@/pages/SearchResults";

export const Route = createFileRoute("/buscar")({
  head: () => ({
    meta: [
      { title: "Buscar Imóveis em Goiânia | Supreme" },
      { name: "description", content: "Encontre o imóvel ideal em Goiânia filtrando por bairro, tipo, preço e número de quartos." },
      { property: "og:title", content: "Buscar Imóveis em Goiânia | Supreme" },
      { property: "og:description", content: "Encontre o imóvel ideal em Goiânia filtrando por bairro, tipo, preço e número de quartos." },
    ],
  }),
  component: SearchResults,
});
