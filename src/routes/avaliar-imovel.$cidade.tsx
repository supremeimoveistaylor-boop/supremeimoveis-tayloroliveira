import { createFileRoute } from "@tanstack/react-router";
import AvaliarImovel from "@/pages/AvaliarImovel";

export const Route = createFileRoute("/avaliar-imovel/$cidade")({
  head: () => ({
    meta: [
      { title: "Avaliação de Imóvel Gratuita | Supreme" },
      { name: "description", content: "Avalie gratuitamente o seu imóvel e receba uma estimativa de valor de mercado atualizada." },
      { property: "og:title", content: "Avaliação de Imóvel Gratuita | Supreme" },
      { property: "og:description", content: "Avalie gratuitamente o seu imóvel e receba uma estimativa de valor de mercado atualizada." },
    ],
  }),
  component: AvaliarImovel,
});
