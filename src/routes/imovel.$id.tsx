import { createFileRoute } from "@tanstack/react-router";
import PropertyDetails from "@/pages/PropertyDetails";

export const Route = createFileRoute("/imovel/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Imóvel | Supreme Empreendimentos" },
      { name: "description", content: "Fotos, valores, localização e características completas do imóvel selecionado." },
      { property: "og:title", content: "Detalhes do Imóvel | Supreme Empreendimentos" },
      { property: "og:description", content: "Fotos, valores, localização e características completas do imóvel selecionado." },
    ],
  }),
  component: PropertyDetails,
});
