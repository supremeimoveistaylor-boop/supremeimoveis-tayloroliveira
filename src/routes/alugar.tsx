import { createFileRoute } from "@tanstack/react-router";
import Alugar from "@/pages/Alugar";

export const Route = createFileRoute("/alugar")({
  head: () => ({
    meta: [
      { title: "Imóveis para Alugar em Goiânia | Supreme Empreendimentos" },
      { name: "description", content: "Aluguel de casas e apartamentos de alto padrão em Goiânia. Opções mobiliadas e em condomínios fechados." },
      { property: "og:title", content: "Imóveis para Alugar em Goiânia | Supreme Empreendimentos" },
      { property: "og:description", content: "Aluguel de casas e apartamentos de alto padrão em Goiânia. Opções mobiliadas e em condomínios fechados." },
    ],
  }),
  component: Alugar,
});
