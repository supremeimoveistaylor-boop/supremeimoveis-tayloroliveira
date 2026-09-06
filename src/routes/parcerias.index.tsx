import { createFileRoute } from "@tanstack/react-router";
import Parcerias from "@/pages/Parcerias";

export const Route = createFileRoute("/parcerias/")({
  head: () => ({
    meta: [
      { title: "Parcerias | Vitrine de Imóveis Supreme" },
      { name: "description", content: "Vitrine de imóveis disponível para corretores e imobiliárias parceiras da Supreme." },
      { property: "og:title", content: "Parcerias | Vitrine de Imóveis Supreme" },
      { property: "og:description", content: "Vitrine de imóveis disponível para corretores e imobiliárias parceiras da Supreme." },
    ],
  }),
  component: Parcerias,
});
