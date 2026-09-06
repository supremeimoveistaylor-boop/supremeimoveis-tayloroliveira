import { createFileRoute } from "@tanstack/react-router";
import Sobre from "@/pages/Sobre";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre a Supreme Empreendimentos Imobiliários" },
      { name: "description", content: "Conheça a Supreme Empreendimentos, imobiliária especializada em imóveis de alto padrão em Goiânia. CRECI 20.316." },
      { property: "og:title", content: "Sobre a Supreme Empreendimentos Imobiliários" },
      { property: "og:description", content: "Conheça a Supreme Empreendimentos, imobiliária especializada em imóveis de alto padrão em Goiânia. CRECI 20.316." },
    ],
  }),
  component: Sobre,
});
