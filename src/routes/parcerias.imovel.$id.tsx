import { createFileRoute } from "@tanstack/react-router";
import ParceriasImovel from "@/pages/ParceriasImovel";

export const Route = createFileRoute("/parcerias/imovel/$id")({
  head: () => ({
    meta: [
      { title: "Imóvel Parceria | Supreme" },
      { name: "description", content: "Detalhes completos do imóvel disponível para parceria com a Supreme Empreendimentos." },
      { property: "og:title", content: "Imóvel Parceria | Supreme" },
      { property: "og:description", content: "Detalhes completos do imóvel disponível para parceria com a Supreme Empreendimentos." },
    ],
  }),
  component: ParceriasImovel,
});
