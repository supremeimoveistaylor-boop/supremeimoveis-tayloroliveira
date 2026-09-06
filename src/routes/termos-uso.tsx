import { createFileRoute } from "@tanstack/react-router";
import TermosUso from "@/pages/TermosUso";

export const Route = createFileRoute("/termos-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Supreme Empreendimentos" },
      { name: "description", content: "Condições de uso do site e dos serviços da Supreme Empreendimentos Imobiliários." },
      { property: "og:title", content: "Termos de Uso | Supreme Empreendimentos" },
      { property: "og:description", content: "Condições de uso do site e dos serviços da Supreme Empreendimentos Imobiliários." },
    ],
  }),
  component: TermosUso,
});
