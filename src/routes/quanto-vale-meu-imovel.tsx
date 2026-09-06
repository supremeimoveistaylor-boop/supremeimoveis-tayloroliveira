import { createFileRoute } from "@tanstack/react-router";
import AvaliarImovel from "@/pages/AvaliarImovel";

export const Route = createFileRoute("/quanto-vale-meu-imovel")({
  head: () => ({
    meta: [
      { title: "Quanto Vale Meu Imóvel? Avaliação Grátis em Goiânia" },
      { name: "description", content: "Descubra em minutos o valor estimado do seu imóvel em Goiânia com a Supreme Empreendimentos." },
      { property: "og:title", content: "Quanto Vale Meu Imóvel? Avaliação Grátis em Goiânia" },
      { property: "og:description", content: "Descubra em minutos o valor estimado do seu imóvel em Goiânia com a Supreme Empreendimentos." },
    ],
  }),
  component: AvaliarImovel,
});
