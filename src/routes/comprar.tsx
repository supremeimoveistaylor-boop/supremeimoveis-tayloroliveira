import { createFileRoute } from "@tanstack/react-router";
import Comprar from "@/pages/Comprar";

export const Route = createFileRoute("/comprar")({
  head: () => ({
    meta: [
      { title: "Imóveis à Venda em Goiânia | Supreme Empreendimentos" },
      { name: "description", content: "Casas, apartamentos e coberturas à venda em Goiânia com curadoria Supreme. Veja fotos, valores e agende sua visita." },
      { property: "og:title", content: "Imóveis à Venda em Goiânia | Supreme Empreendimentos" },
      { property: "og:description", content: "Casas, apartamentos e coberturas à venda em Goiânia com curadoria Supreme. Veja fotos, valores e agende sua visita." },
    ],
  }),
  component: Comprar,
});
