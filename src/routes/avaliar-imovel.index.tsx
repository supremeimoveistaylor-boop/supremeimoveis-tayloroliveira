import { createFileRoute } from "@tanstack/react-router";
import AvaliarImovel from "@/pages/AvaliarImovel";

export const Route = createFileRoute("/avaliar-imovel/")({
  head: () => ({
    meta: [
      { title: "Quanto Vale Meu Imóvel? Avaliação Grátis em Goiânia" },
      { name: "description", content: "Descubra o valor de mercado do seu imóvel em Goiânia com a avaliação gratuita da Supreme Empreendimentos." },
      { property: "og:title", content: "Quanto Vale Meu Imóvel? Avaliação Grátis em Goiânia" },
      { property: "og:description", content: "Descubra o valor de mercado do seu imóvel em Goiânia com a avaliação gratuita da Supreme Empreendimentos." },
    ],
  }),
  component: AvaliarImovel,
});
