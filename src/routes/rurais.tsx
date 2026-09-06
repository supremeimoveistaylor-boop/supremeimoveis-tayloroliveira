import { createFileRoute } from "@tanstack/react-router";
import Rurais from "@/pages/Rurais";

export const Route = createFileRoute("/rurais")({
  head: () => ({
    meta: [
      { title: "Fazendas e Chácaras à Venda em Goiás | Supreme" },
      { name: "description", content: "Propriedades rurais, fazendas e chácaras à venda em Goiás com assessoria completa da Supreme." },
      { property: "og:title", content: "Fazendas e Chácaras à Venda em Goiás | Supreme" },
      { property: "og:description", content: "Propriedades rurais, fazendas e chácaras à venda em Goiás com assessoria completa da Supreme." },
    ],
  }),
  component: Rurais,
});
