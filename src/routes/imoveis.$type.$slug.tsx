import { createFileRoute } from "@tanstack/react-router";
import GeoLanding from "@/pages/GeoLanding";

export const Route = createFileRoute("/imoveis/$type/$slug")({
  head: () => ({
    meta: [
      { title: "Imóveis por Região em Goiânia | Supreme" },
      { name: "description", content: "Imóveis à venda por bairro, rua e região em Goiânia selecionados pela Supreme Empreendimentos." },
      { property: "og:title", content: "Imóveis por Região em Goiânia | Supreme" },
      { property: "og:description", content: "Imóveis à venda por bairro, rua e região em Goiânia selecionados pela Supreme Empreendimentos." },
    ],
  }),
  component: GeoLanding,
});
