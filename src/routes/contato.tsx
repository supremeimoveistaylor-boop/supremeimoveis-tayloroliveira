import { createFileRoute } from "@tanstack/react-router";
import Contato from "@/pages/Contato";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Fale com a Supreme | Contato e Atendimento" },
      { name: "description", content: "Entre em contato com a Supreme Empreendimentos e fale com um consultor especialista em imóveis de alto padrão em Goiânia." },
      { property: "og:title", content: "Fale com a Supreme | Contato e Atendimento" },
      { property: "og:description", content: "Entre em contato com a Supreme Empreendimentos e fale com um consultor especialista em imóveis de alto padrão em Goiânia." },
    ],
  }),
  component: Contato,
});
